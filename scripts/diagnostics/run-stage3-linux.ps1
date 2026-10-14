param(
  [int]$Port = 39123,
  [int]$SoakSeconds = 1800,
  [int]$ThinkMilliseconds = 5000,
  [switch]$MatrixOnly
)
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$evidence = Join-Path $root 'docs/audits/evidence/2026-10-13/stage3'
New-Item -ItemType Directory -Force -Path $evidence | Out-Null
$network = "cloudacademy-stage3-$PID"
$server = "$network-api"
$token = ([guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N'))
$secret = ([guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N'))
$image = 'cloudacademy-stage3:local'

function Invoke-Docker([string[]]$Arguments) {
  & docker @Arguments
  if ($LASTEXITCODE -ne 0) { throw "docker failed ($LASTEXITCODE): $($Arguments -join ' ')" }
}

try {
  Invoke-Docker @('build', '-f', 'scripts/diagnostics/Dockerfile.stage3', '-t', $image, '.')
  Invoke-Docker @('network', 'create', $network)
  Invoke-Docker @('run', '-d', '--init', '--name', $server, '--network', $network, '--network-alias', 'api', '--cpus', '2', '--memory', '4g', '--memory-swap', '4g', '--publish', "127.0.0.1:${Port}:3001", '--env', 'NODE_ENV=test', '--env', 'DB_ENGINE=pglite', '--env', 'DB_DATA_DIR=/tmp/cloudacademy-stage3-pglite', '--env', 'PORT=3001', '--env', "AUTH_SESSION_SECRET=$secret", '--env', 'ALLOW_DEV_EMAIL_LOGIN=true', '--env', 'CLOUDACADEMY_PERF_DIAGNOSTICS=1', '--env', "CLOUDACADEMY_PERF_DIAGNOSTICS_TOKEN=$token", $image) | Out-Null
  $ready = $false
  for ($i = 0; $i -lt 180; $i++) {
    try {
      $response = Invoke-RestMethod -Uri "http://127.0.0.1:${Port}/api/ready" -TimeoutSec 2
      if ($response.ready) { $ready = $true; break }
    } catch { Start-Sleep -Seconds 1 }
  }
  if (-not $ready) { throw 'Synthetic API did not become ready within 180 seconds.' }

  foreach ($users in @(10, 30, 50, 150)) {
    $name = "matrix-$users"
    $stats = Join-Path $evidence "$name-docker-stats.jsonl"
    $container = "$network-$name"
    Invoke-Docker @('run', '-d', '--init', '--name', $container, '--network', $network, '--cpus', '1', '--memory', '768m', '--memory-swap', '768m', '--env', 'TARGET_URL=http://api:3001', '--env', "USERS=$users", '--env', "CLOUDACADEMY_PERF_DIAGNOSTICS_TOKEN=$token", $image, 'node', 'scripts/diagnostics/stage3-http-load.mjs') | Out-Null
    while ((docker inspect --format '{{.State.Running}}' $container) -eq 'true') {
      $sample = & docker stats --no-stream --format '{{json .}}' $server $container
      [pscustomobject]@{ sampledAt = (Get-Date).ToUniversalTime().ToString('o'); containers = @($sample | ForEach-Object { $_ | ConvertFrom-Json }) } | ConvertTo-Json -Depth 5 -Compress | Add-Content -LiteralPath $stats
      Start-Sleep -Seconds 2
    }
    $clientLogs = & docker logs $container 2>&1
    $clientLogs | Set-Content -LiteralPath (Join-Path $evidence "$name.json")
    if ($LASTEXITCODE -ne 0) { throw "Scenario $users failed; inspect $name.json" }
    $exitCode = docker inspect --format '{{.State.ExitCode}}' $container
    if ($exitCode -ne '0') { throw "Scenario $users exited with code $exitCode" }
    Invoke-Docker @('rm', $container) | Out-Null
  }

  if (-not $MatrixOnly) {
  $soakContainer = "$network-soak30m"
  Invoke-Docker @('run', '-d', '--init', '--name', $soakContainer, '--network', $network, '--cpus', '1', '--memory', '768m', '--memory-swap', '768m', '--env', 'TARGET_URL=http://api:3001', '--env', 'USERS=30', "--env=DURATION_SECONDS=$SoakSeconds", "--env=THINK_MS=$ThinkMilliseconds", '--env', "CLOUDACADEMY_PERF_DIAGNOSTICS_TOKEN=$token", $image, 'node', 'scripts/diagnostics/stage3-http-load.mjs') | Out-Null
  $soakStats = Join-Path $evidence 'soak-30m-docker-stats.jsonl'
  while ((docker inspect --format '{{.State.Running}}' $soakContainer) -eq 'true') {
    $sample = & docker stats --no-stream --format '{{json .}}' $server $soakContainer
    [pscustomobject]@{ sampledAt = (Get-Date).ToUniversalTime().ToString('o'); containers = @($sample | ForEach-Object { $_ | ConvertFrom-Json }) } | ConvertTo-Json -Depth 5 -Compress | Add-Content -LiteralPath $soakStats
    Start-Sleep -Seconds 5
  }
  & docker logs $soakContainer 2>&1 | Set-Content -LiteralPath (Join-Path $evidence 'soak-30m.json')
  $soakExit = docker inspect --format '{{.State.ExitCode}}' $soakContainer
  if ($soakExit -ne '0') { throw "Sustained test exited with code $soakExit" }
  Invoke-Docker @('rm', $soakContainer) | Out-Null
  }
  & docker logs $server 2>&1 | Set-Content -LiteralPath (Join-Path $evidence 'server.log')
  Write-Output "Stage 3 Linux evidence: $evidence"
} finally {
  & docker rm -f $server 2>$null | Out-Null
  & docker network rm $network 2>$null | Out-Null
}
