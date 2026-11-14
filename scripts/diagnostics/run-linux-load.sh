
#!/usr/bin/env bash
set -euo pipefail

if [[ "$(uname -s)" != "Linux" ]]; then
  echo "This audit must run on Linux." >&2
  exit 2
fi
if ! command -v systemd-run >/dev/null 2>&1; then
  echo "systemd-run is required to cap this process tree at 2 CPUs and 4 GiB." >&2
  exit 2
fi
if [[ ! -f package-lock.json ]]; then
  echo "Run from the repository root with package-lock.json present." >&2
  exit 2
fi

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
output="${AUDIT_OUTPUT_PATH:-$root/resources-linux-$(date -u +%Y%m%dT%H%M%SZ).json}"
mkdir -p "$(dirname "$output")"

echo "Synthetic loopback-only load; output=$output"
systemd-run --scope --wait --pipe \
  --property=CPUQuota=200% \
  --property=MemoryMax=4G \
  --property=MemorySwapMax=0 \
  --setenv="AUDIT_OUTPUT_PATH=$output" \
  --working-directory="$root" \
  "$(command -v node)" scripts/diagnostics/deploy-resource-audit.mjs
