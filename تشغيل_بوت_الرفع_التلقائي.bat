@echo off
chcp 65001 > nul
title 🤖 بوت رفع GitHub التلقائي
cd /d "%~dp0"
echo.
echo  ====================================================
echo   بوت رفع GitHub التلقائي - Noir Audio
echo  ====================================================
echo.
node auto_git_bot.js
pause
