@echo off
title MATAR PROCESOS - LOS CHATETAS
echo Matando procesos en puertos 3000 y 5173...
echo.

REM Matar proceso en puerto 3000 (backend)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000') do (
    echo Matando proceso en puerto 3000 (PID: %%a)
    taskkill /F /PID %%a >nul 2>&1
)

REM Matar proceso en puerto 5173 (frontend)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173') do (
    echo Matando proceso en puerto 5173 (PID: %%a)  
    taskkill /F /PID %%a >nul 2>&1
)

echo.
echo [OK] Puertos liberados
echo.
echo Ahora puedes ejecutar:
echo 1. server\INICIAR-BACKEND.bat
echo 2. client\INICIAR-FRONTEND.bat
echo.
pause
