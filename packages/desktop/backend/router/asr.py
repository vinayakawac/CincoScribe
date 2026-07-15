import os
import shutil
import tempfile
from fastapi import APIRouter, HTTPException, File, Form, UploadFile
from engines.faster_whisper import FasterWhisperASR
from engines.base_asr import EngineError

router = APIRouter()

MODELS_DIR = os.path.join(os.path.dirname(__file__), "..", "models")
asr_engine = FasterWhisperASR(MODELS_DIR)

@router.get("/engines/asr")
def get_asr_engines():
    return {"engines": ["faster-whisper"]}

from pydantic import BaseModel

class ASRPayload(BaseModel):
    audio_path: str
    language: str = "auto"
    model_size: str = "base"

@router.post("/transcribe")
async def asr_transcribe(payload: ASRPayload):
    if not os.path.exists(payload.audio_path):
        raise HTTPException(status_code=400, detail="File not found")
        
    try:
        result = asr_engine.transcribe(payload.audio_path, payload.language)
        return result
    except EngineError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ASR failed: {e}")
