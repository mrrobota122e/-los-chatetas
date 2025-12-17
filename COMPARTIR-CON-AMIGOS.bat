@echo off
title LOS CHATETAS - SERVIDOR ONLINE
color 0A

echo.
echo  ============================================
echo       LOS CHATETAS - FUTBOL EDITION
echo  ============================================
echo.
echo  Limpiando procesos...
echo.

:: FORZAR CIERRE DE TODOS LOS PROCESOS
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM ngrok.exe >nul 2>&1

echo  Esperando 5 segundos...
timeout /t 5 /nobreak >nul

cls
echo.
echo  ============================================
echo       LOS CHATETAS - FUTBOL EDITION
echo  ============================================
echo.

:: Iniciar Backend PRIMERO y esperar
echo [1/3] Iniciando Backend (esperando 10 seg)...
cd /d D:\IMPOSTORV2\los-chatetas\server
start "BACKEND" cmd /k "npm run dev"
timeout /t 10 /nobreak >nul

:: Iniciar Frontend
echo [2/3] Iniciando Frontend (esperando 15 seg)...
cd /d D:\IMPOSTORV2\los-chatetas\client
start "FRONTEND" cmd /k "npm run dev"
timeout /t 15 /nobreak >nul

:: Iniciar ngrok
echo [3/3] Iniciando ngrok...
cd /d D:\DESCARGAS\ngrok-v3-stable-windows-amd64
start "NGROK - LINK PARA AMIGOS" cmd /k "ngrok.exe http 5173"
timeout /t 5 /nobreak >nul

cls
echo.
echo  ============================================
echo       SERVIDOR LISTO!
echo  ============================================
echo.
echo  VENTANAS ABIERTAS:
echo  - BACKEND: Debe decir "listening on port 3001"
echo  - FRONTEND: Debe decir "Local: http://localhost:5173"
echo  - NGROK: Copia el link Forwarding
echo.
echo  ============================================
echo.
echo  SI EL BACKEND TIENE ERROR:
echo  1. Cierra todas las ventanas
echo  2. Abre CMD como administrador
echo  3. Ejecuta: taskkill /F /IM node.exe
echo  4. Espera 10 segundos
echo  5. Ejecuta este BAT de nuevo
echo.
echo  ============================================
echo.
echo  LINK PARA TUS AMIGOS: Mira ventana NGROK
echo  PARA TI: http://localhost:5173
echo  NOMBRE: AARONLAMARAVILLA
echo.
echo  ============================================
echo.

start http://localhost:5173

echo  NO CIERRES NINGUNA VENTANA.
pause
