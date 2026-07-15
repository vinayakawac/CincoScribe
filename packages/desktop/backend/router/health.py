from fastapi import APIRouter

router = APIRouter()

@router.get("/health")
def health():
    return {"status": "ok", "tts_engine": "sherpa-onnx", "asr_engine": "faster-whisper"}
