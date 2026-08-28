@echo off
cd /d "%~dp0"
title GitHub Auto-Push Bot

echo.
echo  ================================================
echo    GitHub Auto-Push Bot
echo  ================================================
echo.

echo [1] Checking Node.js...
node --version
if %errorlevel% neq 0 (
    echo.
    echo  ERROR: Node.js غير موجود!
    echo  حمّل Node.js من: https://nodejs.org
    pause
    exit
)

echo [2] Checking Git...
git --version
if %errorlevel% neq 0 (
    echo.
    echo  ERROR: Git غير موجود!
    pause
    exit
)

echo [3] Starting bot...
echo.
node auto_git_bot.js

echo.
echo  Bot stopped.
pause
