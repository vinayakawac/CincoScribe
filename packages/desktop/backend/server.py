"""
server.py — CincoScribe FastAPI sidecar.

Listens on 127.0.0.1:3901 (loopback only — never binds 0.0.0.0).
Spawned by Electron main.js at startup via: uv run server.py
Killed by Electron on quit via SIGTERM.

Endpoints:
  GET  /health          → { "status": "ok" }
  POST /tts             → WAV bytes (audio/wav)
  POST /asr             → { "text": "...", "segments": [...] }

No license checks. No telemetry. No external calls.
"""

from __future__ import annotations

import logging
import os
import sys
import tempfile
from pathlib import Path

import uvicorn
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import Response
from pydantic import BaseModel, Field

# Local imports (same directory)
sys.path.insert(0, str(Path(__file__).parent))
from base import TTSRequest as TTSReq, ASRRequest as ASRReq
from tts_sherpa import SherpaOnnxTTSAdapter
from asr_faster_whisper import FasterWhisperASRAdapter

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("cincoscribe.sidecar")

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="CincoScribe Sidecar",
    description="Local TTS and ASR API — loopback only",
    version="2.0.0",
    docs_url=None,  # Disable Swagger UI in production builds
    redoc_url=None,
)

# Single shared adapter instances (lazy-init internally)
_tts = SherpaOnnxTTSAdapter(provider="cpu")
_asr = FasterWhisperASRAdapter(device="cpu", compute_type="int8")


# ── Request/Response schemas ──────────────────────────────────────────────────

class TTSPayload(BaseModel):
    text: str = Field(..., max_length=2000)
    voice: str = Field("default")
    speed: float = Field(1.0, ge=0.5, le=2.0)


class ASRPayload(BaseModel):
    audio_path: str
    language: str = "auto"
    model_size: str = "base"


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/health")
def health() -> dict:
    return {"status": "ok", "tts_ready": _tts.is_ready(), "asr_ready": _asr.is_ready()}


@app.post("/tts")
async def tts(payload: TTSPayload) -> Response:
    """
    Synthesise text to speech.
    Returns raw WAV bytes (Content-Type: audio/wav).

    GATE 6 test:
      curl http://localhost:3901/tts \\
        -d '{"text":"CincoScribe test","voice":"default"}' \\
        --output test.wav
    """
    req = TTSReq(text=payload.text, voice=payload.voice, speed=payload.speed)
    try:
        result = _tts.generate(req)
    except RuntimeError as exc:
        # Loud failure — VRAM exhaustion or model missing
        logger.error("TTS RuntimeError: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))

    if not result.success or not result.audio_bytes:
        raise HTTPException(status_code=500, detail=result.error or "TTS generation failed")

    return Response(
        content=result.audio_bytes,
        media_type="audio/wav",
        headers={
            "X-Duration": str(result.duration or ""),
            "X-Word-Count": str(result.word_count),
        },
    )


@app.post("/asr")
async def asr(payload: ASRPayload) -> dict:
    """
    Transcribe an audio file.
    Caller provides absolute path to file on disk.
    """
    if not Path(payload.audio_path).exists():
        raise HTTPException(status_code=400, detail=f"File not found: {payload.audio_path}")

    req = ASRReq(
        audio_path=payload.audio_path,
        language=payload.language,
        model_size=payload.model_size,
    )
    try:
        result = _asr.transcribe(req)
    except RuntimeError as exc:
        logger.error("ASR RuntimeError: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))

    if not result.success:
        raise HTTPException(status_code=500, detail=result.error or "ASR failed")

    return {
        "text": result.text,
        "segments": [
            {"start": s.start, "end": s.end, "text": s.text}
            for s in result.segments
        ],
    }


# ── Entry point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    port = int(os.environ.get("SIDECAR_PORT", "3901"))
    logger.info("CincoScribe sidecar starting on 127.0.0.1:%d", port)
    uvicorn.run(
        app,
        host="127.0.0.1",   # loopback only — never 0.0.0.0
        port=port,
        log_level="info",
        access_log=False,    # reduce noise in Electron logs
    )
