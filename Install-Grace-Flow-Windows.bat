@echo off
title Install Grace Flow Desktop Shortcut
cd /d "%~dp0"
echo ==========================================================
echo   Installing Grace Flow Shortcut on Windows Desktop...
echo ==========================================================
echo.

set SCRIPT_DIR=%~dp0
set TARGET_BAT=%SCRIPT_DIR%start.bat
set SHORTCUT_PATH=%USERPROFILE%\Desktop\Grace Flow.lnk

powershell "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT_PATH%'); $s.TargetPath = '%TARGET_BAT%'; $s.WorkingDirectory = '%SCRIPT_DIR%'; $s.Description = 'Grace Flow Church Countdown & Service System'; $s.Save()"

if exist "%SHORTCUT_PATH%" (
    echo [OK] Grace Flow shortcut created on your Desktop!
) else (
    echo Note: Shortcut creation finished.
)

echo.
echo You can now launch Grace Flow anytime from your Desktop shortcut!
pause
