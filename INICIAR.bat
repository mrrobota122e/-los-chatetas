@echo off
chcp 65001 >nul
cls
echo.
echo ========================================
echo  AARON STUD10S - LOS CHATETAS
echo  FUTBOL EDITION
echo ========================================
echo.
echo Iniciando juego multijugador...
echo.

REM Verificar Node.js
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js no esta instalado
    echo.
    echo Descargalo desde: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js instalado
node --version
echo.

REM Verificar si ya se instalaron las dependencias
if not exist "node_modules\" (
    echo Instalando dependencias...
    echo Esto puede tardar unos minutos...
    echo.
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo ERROR al instalar dependencias
        pause
        exit /b 1
    )
    echo.
    echo [OK] Dependencias instaladas
    echo.
)

REM Crear archivos .env si no existen
if not exist "server\.env" (
    echo Creando server\.env...
    (
        echo NODE_ENV=development
        echo PORT=3000
        echo CLIENT_URL=http://localhost:5173
        echo ALLOWED_ORIGINS=http://localhost:5173
        echo DATABASE_URL="file:./dev.db"
        echo SESSION_SECRET=dev-secret-change-in-production
    ) > server\.env
    echo [OK] Configuracion del servidor creada
)

if not exist "client\.env" (
    echo Creando client\.env...
    (
        echo VITE_API_URL=http://localhost:3000
        echo VITE_SOCKET_URL=http://localhost:3000
    ) > client\.env
    echo [OK] Configuracion del cliente creada
)

REM Inicializar Prisma si es necesario
if not exist "server\node_modules\.prisma\" (
    echo Inicializando base de datos...
    cd server
    call npx prisma generate
    call npx prisma migrate dev --name init
    cd ..
    echo [OK] Base de datos inicializada
)

echo.
echo ========================================
echo INICIANDO SERVICIOS
echo ========================================
echo.
echo Backend:  http://localhost:3000
echo Frontend: http://localhost:5173
echo.
echo Las ventanas se abriran en 2 segundos...
timeout /t 2 >nul

REM Iniciar backend
start "Backend - LOS CHATETAS" cmd /k "cd /d %~dp0server && npm run dev"

REM Esperar 3 segundos
timeout /t 3 >nul

REM Iniciar frontend
start "Frontend - LOS CHATETAS" cmd /k "cd /d %~dp0client && npm run dev"

echo.
echo [OK] Servicios iniciados
echo.
echo INSTRUCCIONES:
echo 1. Espera a que ambas ventanas terminen de cargar
echo 2. Abre tu navegador en: http://localhost:5173
echo 3. Para probar multijugador, abre otra pestana
echo.
echo Presiona cualquier tecla para cerrar esta ventana...
pause >nul
