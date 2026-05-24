@echo off
setlocal EnableDelayedExpansion
set PORT=8080
set URL=http://localhost:%PORT%/

echo.
echo   RMIT Adflow - local dev server
echo   %URL%
echo   Press Ctrl+C in this window to stop.
echo.

REM Open the default browser after a short delay so the server is bound first.
start "" cmd /c "timeout /t 1 /nobreak >nul & start """" %URL%"

REM Prefer Python, then Windows Python launcher, then npx as last resort.
where python >nul 2>&1
if !errorlevel! equ 0 (
  python -m http.server %PORT%
  exit /b
)

where py >nul 2>&1
if !errorlevel! equ 0 (
  py -m http.server %PORT%
  exit /b
)

where npx >nul 2>&1
if !errorlevel! equ 0 (
  npx serve . -l %PORT%
  exit /b
)

echo Could not find Python or Node.
echo Install Python from https://www.python.org/ or Node from https://nodejs.org/ and re-run.
pause
