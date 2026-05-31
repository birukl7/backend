@echo off
REM Local dev helper – starts the Telegram notification service
REM Copy .env.example to .env and fill in your values first.

if not exist ".env" (
    echo [WARN] .env not found. Copying from .env.example...
    copy .env.example .env
)

pip install -r requirements.txt --quiet
python main.py
