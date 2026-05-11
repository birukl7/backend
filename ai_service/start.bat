@echo off
setlocal enabledelayedexpansion

cd /d "%~dp0"

echo ============================================
echo  AI Job-Resume Matching Service
echo ============================================

REM ── Virtual environment ──────────────────────
if not exist venv (
    echo [1/3] Creating virtual environment...
    python -m venv venv
    if errorlevel 1 (
        echo ERROR: Failed to create virtual environment.
        echo        Make sure Python 3.10+ is installed and on PATH.
        pause
        exit /b 1
    )
    echo       Virtual environment created.
) else (
    echo [1/3] Virtual environment already exists.
)

REM ── Activate ─────────────────────────────────
call venv\Scripts\activate
if errorlevel 1 (
    echo ERROR: Could not activate virtual environment.
    pause
    exit /b 1
)

REM ── Dependencies ─────────────────────────────
echo [2/3] Installing / upgrading dependencies...
pip install --upgrade pip --quiet
pip install -r requirements.txt
if errorlevel 1 (
    echo ERROR: pip install failed.  Check your internet connection and requirements.txt.
    pause
    exit /b 1
)

REM ── Start service ────────────────────────────
echo [3/3] Starting AI Matching Service on port 8001...
echo       Press Ctrl+C to stop.
echo.
uvicorn main:app --host 0.0.0.0 --port 8001 --reload

endlocal
