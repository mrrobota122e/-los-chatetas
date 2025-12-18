@echo off
echo ==========================================
echo      v2.2.0 IMPOSTOR GAME COMPLETE
echo ==========================================
echo.
echo Adding all files...
git add -A

echo.
echo Committing v2.2.0...
git commit -m "v2.2.0: Complete Impostor Game - Dual Chats + Animations"

echo.
echo Pushing to GitHub...
git push

echo.
echo ==========================================
echo      DEPLOY COMPLETE
echo ==========================================
echo.
echo Wait 2 minutes, then:
echo 1. Press Ctrl+Shift+R (hard refresh)
echo 2. Check tab title says "v2.2.0"
echo.
pause
