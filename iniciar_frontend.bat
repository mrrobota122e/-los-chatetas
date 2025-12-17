@echo off
echo ================================================
echo   INICIANDO LOS CHATETAS - Frontend + Backend
echo ================================================
echo.

echo [1/3] Instalando dependencias del cliente...
cd client
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Fall\u00f3 la instalaci\u00f3n del cliente
    pause
    exit /b 1
)

echo.
echo [2/3] Instalando dependencias del servidor...
cd ..\server
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Fall\u00f3 la instalaci\u00f3n del servidor
    pause
    exit /b 1
)

echo.
echo [3/3] Iniciando servidores...
cd ..

REM Iniciar frontend y backend en ventanas separadas (modo dev)
start "Frontend - Vite Dev Server" cmd /k "cd client && npm run dev"
timeout /t 2 /nobreak >nul
start "Backend - Node Server DEV" cmd /k "cd server && npm run dev"

echo.
echo \u00e2\u009c\u0085 Instalaci\u00f3n completa!
echo \u00e2\u009c\u0085 Frontend corriendo en: http://localhost:3000
echo \u00e2\u009c\u0085 Backend corriendo en: http://localhost:3001
echo.
echo Las ventanas de los servidores se abrieron por separado.
echo Presiona cualquier tecla para cerrar esta ventana...
pause >nul
