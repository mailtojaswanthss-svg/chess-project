@echo off
set "PROJECT=%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PROJECT%start-chesswise.ps1"
if errorlevel 1 (
  echo.
  echo Chesswise could not start. Read the error above.
  pause
)
