@echo off
chcp 65001 >nul
echo ========================================
echo   SUBIR LOS CHATETAS A GITHUB + RAILWAY
echo ========================================
echo.

REM Ir a la carpeta del proyecto
cd /d "d:\IMPOSTORV2\los-chatetas"

REM Configurar Git
echo [1/6] Configurando Git...
git config --global user.email "mrrobota122e@users.noreply.github.com"
git config --global user.name "mrrobota122e"

REM Limpiar git anterior si existe
echo [2/6] Limpiando configuracion anterior...
if exist ".git" rmdir /s /q ".git"

REM Inicializar git
echo [3/6] Inicializando Git...
git init

REM Agregar solo los archivos del proyecto (NO node_modules)
echo [4/6] Agregando archivos (esto tarda un poco)...
git add package.json
git add client/src
git add client/public
git add client/package.json
git add client/tsconfig.json
git add client/vite.config.ts
git add client/index.html
git add server/src
git add server/package.json  
git add server/tsconfig.json
git add shared
git add prisma
git add .gitignore 2>nul

REM Commit
echo [5/6] Creando commit...
git commit -m "Los Chatetas - Juego Multiplayer"

REM Conectar a GitHub
echo [6/6] Conectando a GitHub...
git branch -M main
git remote add origin https://github.com/mrrobota122e/los-chatetas.git

echo.
echo ========================================
echo   LISTO! Ahora sigue estos pasos:
echo ========================================
echo.
echo PASO 1: Crea el repositorio en GitHub
echo    - Ve a: https://github.com/new
echo    - Nombre: los-chatetas
echo    - Dejalo PUBLICO y vacio (sin README)
echo    - Click "Create repository"
echo.
echo PASO 2: Ejecuta este comando:
echo    git push -u origin main
echo.
echo PASO 3: Ve a https://railway.app
echo    - Login con GitHub
echo    - New Project
echo    - Deploy from GitHub repo
echo    - Selecciona "los-chatetas"
echo.
pause
