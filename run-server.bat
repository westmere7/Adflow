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

REM Prefer Node: gives live reload + no-cache (see dev-server.js).
where node >nul 2>&1
if !errorlevel! equ 0 (
  echo   Rebuilding local assets and startup registry templates...
  node scripts/build-asset-manifest.js
  node scripts/build-startup-registry.js
  echo   Starting Node dev server (live reload enabled)...
  node dev-server.js %PORT%
  exit /b
)

REM Fallbacks below have NO live reload (manual refresh + ?v= bumps needed).
where python >nul 2>&1
if !errorlevel! equ 0 (
  echo   Node not found - falling back to Python (no live reload).
  python -m http.server %PORT%
  exit /b
)

where py >nul 2>&1
if !errorlevel! equ 0 (
  echo   Node not found - falling back to Python (no live reload).
  py -m http.server %PORT%
  exit /b
)

echo Could not find Node or Python.
echo Install Node from https://nodejs.org/ (recommended) or Python from https://www.python.org/ and re-run.
pause
