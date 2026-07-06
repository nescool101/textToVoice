# textToVoice

A local PDF-to-speech app. Upload a PDF and listen to it read aloud in English or Spanish using [Kokoro TTS](https://github.com/hexgrad/kokoro).

## Quick Start

```bash
# 1. Clone and enter the repo
git clone <your-repo-url>
cd textToVoice

# 2. Run setup (creates venv, installs deps, downloads voice models)
./setup.sh

# 3. Start the server
source venv/bin/activate
python -m uvicorn app.main:app --reload

# 4. Open http://localhost:8000 in your browser
```

## How It Works

1. Upload a PDF file
2. Choose a language, voice, and reading speed
3. Click **Read PDF** — the app extracts text and synthesizes speech
4. Listen in the browser or download the WAV file

## Available Voices

| Language | Voice ID     | Name            | Gender |
|----------|-------------|-----------------|--------|
| English  | af_heart    | Heart           | Female |
| English  | af_nicole   | Nicole          | Female |
| English  | am_adam     | Adam            | Male   |
| English  | am_michael  | Michael         | Male   |
| English  | bf_emma     | Emma (British)  | Female |
| English  | bm_george   | George (British)| Male   |
| Spanish  | ef_dora     | Dora            | Female |
| Spanish  | em_alex     | Alex            | Male   |

## Tech Stack

- **TTS Engine:** Kokoro (82M params, Apache 2.0)
- **PDF Parsing:** PyMuPDF
- **Backend:** Python + FastAPI
- **Frontend:** Vanilla HTML/CSS/JS

## Requirements

- Python 3.10+
- ~500 MB disk space for voice models
