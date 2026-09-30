@echo off
cd /d "%~dp0"
(
echo api/config.php
echo .env
echo *.log
echo Thumbs.db
) > .gitignore
git init
git add .
git commit -m "Initial commit: AI interview practice app"
git branch -M main
set /p URL=Paste your GitHub repo URL and press Enter: 
git remote add origin %URL%
git push -u origin main
pause