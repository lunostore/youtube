@echo off
cd /d "%~dp0"
title GitHub Auto-Push Bot
echo.
echo  ================================================
echo    GitHub Auto-Push Bot - Starting...
echo  ================================================
echo.
node auto_git_bot.js
pause
