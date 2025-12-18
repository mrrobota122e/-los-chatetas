@echo off
echo ==========================================
echo      AARON STUD10S - MANUAL DEPLOY
echo ==========================================
echo.
echo 1. Adding files...
git add -A

echo.
echo 2. Committing changes (v2.1.3)...
git commit -m "v2.1.3: Manual Deploy via Batch Script"

echo.
echo 3. Pushing to GitHub...
git push

echo.
echo ==========================================
echo      DEPLOY COMPLETE (Check for errors)
echo ==========================================
pause
