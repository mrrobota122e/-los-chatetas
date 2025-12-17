@echo off
title SETUP - LOS CHATETAS
cls
echo ========================================
echo  AARON STUD10S - LOS CHATETAS  
echo  SETUP INICIAL
echo ========================================
echo.

REM Ir al directorio del proyecto
cd /d "%~dp0"

REM Crear archivos .env desde ejemplos
echo Creando archivos de configuracion...

copy /Y "server\.env.example" "server\.env" >nul 2>&1
copy /Y "client\.env.example" "client\.env" >nul 2>&1

echo [OK] Archivos .env creados
echo.

REM Instalar dependencias si no existen
if not exist "node_modules\" (
    echo Instalando dependencias del proyecto...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Fallo la instalacion
        pause
        exit /b 1
    )
    echo [OK] Dependencias instaladas
)

REM Inicializar Prisma
if not exist "server\node_modules\.prisma\" (
    echo Inicializando base de datos...
    cd server
    call npx prisma generate
    call npx prisma migrate dev --name init
    cd ..
    echo [OK] Base de datos lista
)

echo.
echo ========================================
echo  SETUP COMPLETADO
echo ========================================
echo.
echo Ahora ejecuta:
echo 1. Doble click en: server\INICIAR-BACKEND.bat
echo 2. Doble click en: client\INICIAR-FRONTEND.bat
echo 3. Abre http://localhost:5173
echo.
pause
