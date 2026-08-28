@echo off
cd /d "%~dp0"
echo.
echo  ==================================================
echo    GitHub Auto-Push Bot - Noir Audio
echo  ==================================================
echo.

REM Check if already authenticated
git ls-remote --heads https://github.com/lunostore/youtube.git >nul 2>&1
if %errorlevel% neq 0 (
    echo  [!] GitHub not authenticated. Opening login...
    echo.
    echo  Please login to GitHub account: lunostore
    echo.
    start https://github.com/login
    echo  After login, press any key to continue...
    pause >nul
)

node auto_git_bot.js
pause
