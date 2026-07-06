import os
import tempfile
import shutil
from pathlib import Path

from fastapi import FastAPI, File, Form, UploadFile, HTTPException
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from app import tts_engine, pdf_parser

app = FastAPI(title="textToVoice")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path(tempfile.mkdtemp(prefix="texttovoice_"))


@app.on_event("shutdown")
def _cleanup():
    shutil.rmtree(UPLOAD_DIR, ignore_errors=True)


# ── API routes ────────────────────────────────────────────────


@app.get("/voices")
def get_voices(lang: str | None = None):
    """List available voices, optionally filtered by language."""
    return tts_engine.list_voices(lang)


@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    """Upload a PDF and return extracted text."""
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    # Save uploaded file
    pdf_path = UPLOAD_DIR / file.filename
    with open(pdf_path, "wb") as f:
        f.write(await file.read())

    try:
        pages = pdf_parser.extract_pages(str(pdf_path))
        full_text = "\n\n".join(p["text"] for p in pages)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to extract text: {e}")
    finally:
        pdf_path.unlink(missing_ok=True)

    return {
        "filename": file.filename,
        "page_count": len(pages),
        "word_count": len(full_text.split()),
        "pages": pages,
        "text": full_text,
    }


@app.post("/synthesize")
async def synthesize(
    text: str = Form(...),
    voice: str = Form("af_heart"),
    speed: float = Form(1.0),
):
    """Synthesize text to speech. Returns a WAV file."""
    if not text.strip():
        raise HTTPException(status_code=400, detail="Text must not be empty.")
    try:
        wav_bytes = tts_engine.synthesize(text, voice_id=voice, speed=speed)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Synthesis failed: {e}")

    return Response(
        content=wav_bytes,
        media_type="audio/wav",
        headers={"Content-Disposition": "attachment; filename=speech.wav"},
    )


# ── Static frontend (must be last) ───────────────────────────

STATIC_DIR = Path(__file__).parent / "static"
app.mount("/", StaticFiles(directory=str(STATIC_DIR), html=True), name="static")
