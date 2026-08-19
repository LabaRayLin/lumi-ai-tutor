@echo off
title Lumi AI Tutor Standalone Offline Server
cd /d "%~dp0"
echo =========================================================
echo    Lumi AI Tutor Standalone Offline Web App
echo =========================================================
echo.

REM Automatically launch the default web browser to the index page
echo Opening browser: http://127.0.0.1:8080/index.html ...
start "" "http://127.0.0.1:8080/index.html"

REM Start local web server
echo Starting local web server on http://127.0.0.1:8080/index.html ...
powershell -ExecutionPolicy Bypass -File "%~dp0server.ps1" -Port 8080

pause
