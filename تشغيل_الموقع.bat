@echo off
if exist "%SystemRoot%\System32\chcp.com" "%SystemRoot%\System32\chcp.com" 65001 >nul 2>&1
title تشغيل NOIR AUDIO
echo ======================================================
echo    🎵 جاري تشغيل موقع NOIR AUDIO...
echo ======================================================
echo.
start "" "index.html"
exit
