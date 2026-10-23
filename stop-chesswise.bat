@echo off
set "PROJECT=%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PROJECT%stop-chesswise.ps1"
pause
