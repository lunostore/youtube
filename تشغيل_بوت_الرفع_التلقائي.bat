@echo off
title GitHub Auto Push Bot
cd /d "D:\شغل\يوتيوب"

echo.
echo ===================================
echo   GitHub Auto Push Bot - RUNNING
echo ===================================
echo   Repo: github.com/lunostore/youtube
echo ===================================
echo.

:loop
echo Checking for changes...
git add -A

REM Check if there's something to commit
git diff --cached --quiet
if %errorlevel% equ 0 (
    echo No changes found. Waiting 10 seconds...
    timeout /t 10 /nobreak >nul
    goto loop
)

REM There are changes - commit and push
for /f "tokens=*" %%i in ('powershell -command "Get-Date -Format \"yyyy-MM-dd HH:mm\""') do set TIMESTAMP=%%i
git commit -m "Auto update - %TIMESTAMP%"

echo Pushing to GitHub...
git push origin main --force

if %errorlevel% equ 0 (
    echo SUCCESS: Pushed to GitHub!
) else (
    echo ERROR: Push failed! Check credentials.
    echo Opening GitHub login...
    start https://github.com/login
)

echo.
echo Waiting 10 seconds before next check...
timeout /t 10 /nobreak >nul
goto loop
