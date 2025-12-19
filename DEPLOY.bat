@echo off
echo ==========================================
echo      v3.0.0 IMPOSTOR V2 COMPLETE
echo ==========================================
echo.
echo Adding all files...
git add -A

echo.
echo Committing v3.0.0...
git commit -m "v3.0.0: Impostor V2 Complete Rebuild - FSM + Lobby + 3D Avatars"

echo.
echo Pushing to GitHub...
git push

echo.
echo ==========================================
echo      DEPLOY COMPLETE
echo ==========================================
echo.
echo Wait 2-3 minutes for Render/Vercel to deploy, then:
echo 1. Open your website
echo 2. Press Ctrl+Shift+R (hard refresh)
echo 3. Check if footer says "v3.0.0"
echo 4. Click "EL IMPOSTOR" - should see new design
echo.
pause
