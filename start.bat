@echo off
title Grace Flow — Church Countdown & Service Deck
cd /d "%~dp0"
echo ========================================================
echo   Starting Grace Flow Church Countdown & Service Deck...
echo ========================================================
echo.
start "" http://localhost:3000
node server.js
pause
