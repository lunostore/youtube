@echo off
cd /d "%~dp0"
echo Pushing to GitHub...
git add -A
git commit -m "Manual update"
git push origin main
echo.
echo Done!
pause
