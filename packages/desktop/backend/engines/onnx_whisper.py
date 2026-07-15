import logging
from engines.base_asr import ASRBackend, EngineError

logger = logging.getLogger(__name__)

class ONNXWhisperASR(ASRBackend):
    """
    Existing ONNX Whisper adapter (migrated from js/whisper.js IPC into Python)
    """
    def __init__(self, models_dir: str):
        self.models_dir = models_dir

    def transcribe(self, audio_path: str, language: str = None) -> dict:
        raise NotImplementedError("ONNX Whisper Python adapter not fully implemented yet.")
