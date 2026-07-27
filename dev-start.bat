@echo off
setlocal EnableDelayedExpansion

:: ============================================================
:: dev-start.bat — Simulador AWS - Ambiente Local
:: Inicia API + Frontend e popula o banco de dados
:: ============================================================

title Simulador AWS - Dev Environment
color 1F

cls
echo.
echo   =================================================
echo      Simulador AWS - Ambiente de Desenvolvimento
echo   =================================================
echo.

:: ============================================================
:: 1. Verificar Node.js
:: ============================================================

echo [1/5] Verificando Node.js...
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo   ERRO: Node.js nao encontrado.
    echo         Instale em: https://nodejs.org
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('node --version') do set NODE_VER=%%v
echo   OK - Node.js %NODE_VER% encontrado.
echo.

:: ============================================================
:: 2. Verificar node_modules
:: ============================================================

echo [2/5] Verificando dependencias...
if not exist "node_modules\" (
    echo   Instalando dependencias com npm install...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo   ERRO: Falha ao instalar dependencias.
        pause
        exit /b 1
    )
    echo   OK - Dependencias instaladas.
) else (
    echo   OK - node_modules encontrado.
)
echo.

:: ============================================================
:: 3. Verificar .env
:: ============================================================

echo [3/5] Verificando arquivo .env...
if not exist ".env" (
    echo   .env nao encontrado. Criando a partir de .env.example...
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo   OK - .env criado. Edite as chaves de API se necessario.
    ) else (
        echo   AVISO: .env.example nao encontrado. Crie o .env manualmente.
    )
) else (
    echo   OK - .env encontrado.
)
echo.

:: ============================================================
:: 4. Build do frontend
:: ============================================================

echo [4/5] Gerando build do frontend...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo   ERRO: Build falhou. Veja os detalhes acima.
    pause
    exit /b 1
)
echo   OK - Build concluido.
echo.

:: ============================================================
:: 5. Iniciar servicos em terminais separados
:: ============================================================

echo [5/5] Iniciando servicos em terminais separados...
echo.

:: --- API Express (porta 3001)
echo   Abrindo: API Express na porta 3001...
start "API - Simulador AWS :3001" cmd /k "color 1E && title API - Simulador AWS :3001 && echo. && echo  [API] Iniciando servidor Express em http://localhost:3001 && echo. && node backend/api/server.js"
timeout /t 4 /nobreak >nul

:: --- Seed de Questoes
echo   Populando banco de questoes (seed-pglite)...
start "Seed Questoes - Simulador AWS" cmd /k "color 2E && title Seed Questoes - Simulador AWS && echo. && echo  [SEED] Importando questoes dos arquivos JSON... && echo. && node scripts/seed/seed-pglite.mjs && echo. && echo  [SEED] Concluido! Pode fechar esta janela. && pause"
timeout /t 2 /nobreak >nul

:: --- Seed de Cases
echo   Populando banco de cases de arquitetura (seed-cases)...
start "Seed Cases - Simulador AWS" cmd /k "color 3E && title Seed Cases - Simulador AWS && echo. && echo  [CASES] Importando servicos AWS e cases de arquitetura... && echo. && node scripts/seed/seed-cases.mjs && echo. && echo  [CASES] Concluido! Pode fechar esta janela. && pause"
timeout /t 5 /nobreak >nul

:: --- Frontend (live-server porta 8080)
echo   Abrindo: Frontend na porta 8080...
start "Frontend - Simulador AWS :8080" cmd /k "color 5E && title Frontend - Simulador AWS :8080 && echo. && echo  [FRONTEND] Iniciando live-server em public/ na porta 8080... && echo. && npx live-server public --port=8080 --no-browser"
timeout /t 3 /nobreak >nul

:: ============================================================
:: Resumo Final
:: ============================================================

cls
color 1F
echo.
echo   =================================================
echo      Simulador AWS - Ambiente Local Ativo!
echo   =================================================
echo.
echo   Servicos disponiveis:
echo.
echo   [*] Simulador Principal  --  http://localhost:8080
echo   [*] Cases de Arquitetura --  http://localhost:8080/cases.html
echo   [*] API Health Check     --  http://localhost:3001/api/health
echo   [*] API Cases            --  http://localhost:3001/api/cases
echo   [*] API Servicos AWS     --  http://localhost:3001/api/services
echo.
echo   Terminais abertos:
echo   - "API - Simulador AWS :3001"
echo   - "Seed Questoes - Simulador AWS"
echo   - "Seed Cases - Simulador AWS"
echo   - "Frontend - Simulador AWS :8080"
echo.
echo   Para encerrar: feche os 4 terminais acima.
echo.
echo   Abrindo o navegador...

timeout /t 2 /nobreak >nul
start "" "http://localhost:8080"

echo.
echo   Pressione qualquer tecla para fechar esta janela...
pause >nul
