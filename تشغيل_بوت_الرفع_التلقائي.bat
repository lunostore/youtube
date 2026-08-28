@echo off
chcp 65001 >nul 2>&1
echo ===================================================
echo   NOIR AUDIO - PUSHING TO GITHUB (AUTOMATED SCRIPT)
echo ===================================================
echo.

:: Ensure we are in the correct directory
cd /d "D:\شغل\يوتيوب"

:: Initialize Git if not already done
if not exist .git (
    echo [1/5] Initializing Git repository...
    git init
) else (
    echo [1/5] Git repository already initialized.
)

:: Add all files
echo [2/5] Adding all files to Git...
git add .

:: Commit
echo [3/5] Creating commit...
git commit -m "update: Noir Audio YouTube Player"

:: Set branch to main
echo [4/5] Setting main branch...
git branch -M main

:: Remove remote if it exists and add the correct remote
git remote remove origin >nul 2>&1
echo [5/5] Linking to GitHub repository...
git remote add origin https://github.com/lunostore/youtube.git

:: Push
echo.
echo ===================================================
echo   PUSHING TO GITHUB...
echo ===================================================
git push -u origin main --force

echo.
echo ===================================================
echo   Done! Check: https://github.com/lunostore/youtube
echo ===================================================
pause
