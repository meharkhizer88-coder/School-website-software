@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"

echo ==============================================
echo School Website Software - One Click Startup
echo ==============================================

where py >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Python launcher 'py' not found. Install Python 3.10+ and add it to PATH.
  pause
  exit /b 1
)

if not exist ".venv\Scripts\python.exe" (
  echo [INFO] Creating virtual environment...
  py -3 -m venv .venv
  if errorlevel 1 (
    echo [ERROR] Failed to create virtual environment.
    pause
    exit /b 1
  )
)

echo [INFO] Installing/updating backend dependencies...
call ".venv\Scripts\python.exe" -m pip install --upgrade pip
if errorlevel 1 (
  echo [ERROR] Failed to upgrade pip.
  pause
  exit /b 1
)

call ".venv\Scripts\python.exe" -m pip install -r backend\requirements.txt
if errorlevel 1 (
  echo [ERROR] Failed to install requirements.
  pause
  exit /b 1
)

echo [INFO] Starting backend on http://127.0.0.1:8000 ...
start "School Backend" cmd /k "cd /d "%~dp0" && .venv\Scripts\python.exe -m uvicorn backend.main:app --host 0.0.0.0 --port 8000"

timeout /t 2 /nobreak >nul

echo [INFO] Starting frontend on http://127.0.0.1:5173 ...
start "School Frontend" cmd /k "cd /d "%~dp0" && py -3 -m http.server 5173 -d frontend"

timeout /t 2 /nobreak >nul

echo [INFO] Opening application in browser...
start "" "http://127.0.0.1:5173"

echo [DONE] App startup commands launched.
echo Keep both opened terminal windows running.
exit /b 0
