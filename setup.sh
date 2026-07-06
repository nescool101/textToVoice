#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== textToVoice Setup ==="

# Create virtual environment
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
else
    echo "Virtual environment already exists."
fi

# Activate venv
source venv/bin/activate

# Install dependencies
echo "Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Kokoro downloads voice models automatically on first use.
# Trigger a minimal import so models are cached before the user runs the app.
echo "Downloading Kokoro voice models (English + Spanish)..."
python3 -c "
from kokoro import KPipeline
print('  Loading English pipeline...')
KPipeline(lang_code='a')
print('  Loading Spanish pipeline...')
KPipeline(lang_code='e')
print('  Models ready.')
"

echo ""
echo "=== Setup complete ==="
echo "To run the app:"
echo "  source venv/bin/activate"
echo "  python -m uvicorn app.main:app --reload"
echo "Then open http://localhost:8000 in your browser."
