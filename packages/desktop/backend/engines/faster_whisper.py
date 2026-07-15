import os
import logging
from pathlib import Path
from engines.base_asr import ASRBackend, EngineError

logger = logging.getLogger(__name__)

class FasterWhisperASR(ASRBackend):
    def __init__(self, models_dir: str):
        self.models_dir = Path(models_dir)
        self._model = None
        
    def _ensure_model(self):
        if self._model is not None:
            return
            
        try:
            from faster_whisper import WhisperModel
        except ImportError as exc:
            raise EngineError("faster-whisper is not installed.") from exc

        logger.info("Loading Faster-Whisper base model (CPU)...")
        try:
            # This auto-downloads to the HF cache by default
            self._model = WhisperModel(
                "base",
                device="cpu",
                compute_type="int8",
                download_root=str(self.models_dir / "faster-whisper")
            )
        except Exception as exc:
            raise EngineError(f"Failed to load Whisper model: {exc}")

    def transcribe(self, audio_path: str, language: str = None) -> dict:
        self._ensure_model()
        
        lang_arg = None if not language or language == "auto" else language
        try:
            segments_gen, info = self._model.transcribe(
                audio_path,
                language=lang_arg,
                beam_size=5,
                word_timestamps=False,
            )
        except Exception as exc:
            raise EngineError(f"Transcription failed: {exc}")
            
        segments = []
        texts = []
        for seg in segments_gen:
            segments.append({"start": seg.start, "end": seg.end, "text": seg.text.strip()})
            texts.append(seg.text.strip())
            
        return {
            "text": " ".join(texts),
            "segments": segments
        }
