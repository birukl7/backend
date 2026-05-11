#!/bin/bash
# start.sh – Bootstrap and start the AI Job-Résumé Matching Service
set -euo pipefail

cd "$(dirname "$0")"

echo "============================================"
echo " AI Job-Resume Matching Service"
echo "============================================"

# ── Virtual environment ───────────────────────
if [ ! -d "venv" ]; then
    echo "[1/3] Creating virtual environment..."
    python3 -m venv venv
    echo "      Virtual environment created."
else
    echo "[1/3] Virtual environment already exists."
fi

# ── Activate ──────────────────────────────────
# shellcheck disable=SC1091
source venv/bin/activate

# ── Dependencies ──────────────────────────────
echo "[2/3] Installing / upgrading dependencies..."
pip install --upgrade pip --quiet
pip install -r requirements.txt

# ── Start service ─────────────────────────────
echo "[3/3] Starting AI Matching Service on port 8001..."
echo "      Press Ctrl+C to stop."
echo ""
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
