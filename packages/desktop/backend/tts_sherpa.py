"""
tts_sherpa.py — sherpa-onnx TTS adapter.

Absorbs the logic from tts_generate.py (which used KittenTTS) and replaces it
with sherpa-onnx, which is CPU-safe, Windows-compatible, and ships as a wheel.

Voice model: vits-ljs (English, open weights, ~57 MB)
Download once to: backend/models/tts/ (auto-downloaded on first use if missing)

RTX 3050 policy (4 GB VRAM):
  - TTS runs on CPU always (provider="cpu").
  - If the caller explicitly requests GPU and VRAM is exhausted, we raise
    RuntimeError with a clear message — we never silently degrade.
"""

from __future__ import annotations

import io
import os
import struct
import wave
import logging
from pathlib import Path
from typing import Optional

import numpy as np

from base import TTSBackend, TTSRequest, TTSResponse

logger = logging.getLogger(__name__)

# Default model paths relative to this file's directory.
_HERE = Path(__file__).parent
_MODELS_DIR = _HERE / "models" / "tts" / "vits-ljs"

# Map logical voice names (matching existing UI voice list) to sherpa-onnx
# speaker IDs for the kokoro model. Extend as more voices are added.
_VOICE_TO_SPEAKER_ID: dict[str, int] = {
    "default": 0,
    "bella":   0,
    "jasper":  1,
    "luna":    2,
    "bruno":   3,
    "rosie":   4,
    "hugo":    5,
    "kiki":    6,
    "leo":     7,
}


def _pcm_to_wav_bytes(samples: np.ndarray, sample_rate: int) -> bytes:
    """Convert float32 PCM samples [-1, 1] to 16-bit WAV bytes."""
    pcm16 = (samples * 32767).clip(-32768, 32767).astype(np.int16)
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)  # 16-bit
        wf.setframerate(sample_rate)
        wf.writeframes(pcm16.tobytes())
    return buf.getvalue()


class SherpaOnnxTTSAdapter(TTSBackend):
    """
    sherpa-onnx TTS adapter — CPU-safe, Windows-compatible.

    Lazy-initialises on first generate() call so Electron startup is fast.
    """

    def __init__(
        self,
        model_dir: Optional[Path] = None,
        provider: str = "cpu",
    ) -> None:
        self._model_dir = model_dir or _MODELS_DIR
        self._provider = provider
        self._tts = None   # lazy init

    def _init_tts(self) -> None:
        """Lazy-load the sherpa-onnx TTS engine."""
        try:
            import sherpa_onnx
        except ImportError as exc:
            raise RuntimeError(
                "sherpa-onnx is not installed. Run: uv pip install sherpa-onnx"
            ) from exc

        model_dir = self._model_dir
        # vits-ljs uses .onnx
        onnx_files = list(model_dir.glob("*.onnx"))
        if not onnx_files:
            raise RuntimeError(
                f"sherpa-onnx TTS model not found in {model_dir}.\n"
                "Expected vits-ljs/ with an .onnx file.\n"
                "Run the model download script or place files manually."
            )
        vits_model = onnx_files[0]
        tokens    = model_dir / "tokens.txt"
        lexicon   = model_dir / "lexicon.txt"

        tts_config = sherpa_onnx.OfflineTtsConfig(
            model=sherpa_onnx.OfflineTtsModelConfig(
                vits=sherpa_onnx.OfflineTtsVitsModelConfig(
                    model=str(vits_model),
                    lexicon=str(lexicon) if lexicon.exists() else "",
                    tokens=str(tokens),
                    data_dir="",
                    dict_dir="",
                ),
                provider=self._provider,
                num_threads=2,
                debug=False,
            ),
            rule_fsts="",
            max_num_sentences=1,
        )

        if not tts_config.validate():
            raise RuntimeError("Invalid sherpa-onnx TTS configuration.")

        self._tts = sherpa_onnx.OfflineTts(tts_config)
        logger.info("[sherpa-onnx TTS] Engine initialised (provider=%s)", self._provider)

    def is_ready(self) -> bool:
        return self._tts is not None

    def generate(self, request: TTSRequest) -> TTSResponse:
        """
        Synthesise *request.text* to WAV bytes.

        RTX 3050 policy: always CPU. If provider is changed to 'cuda' and
        VRAM is exhausted, sherpa-onnx raises — we re-raise with context.
        """
        if not request.text.strip():
            return TTSResponse(success=False, error="No text provided")

        if self._tts is None:
            try:
                self._init_tts()
            except RuntimeError as exc:
                return TTSResponse(success=False, error=str(exc))

        voice_lower = request.voice.lower().strip()
        speaker_id = _VOICE_TO_SPEAKER_ID.get(voice_lower, 0)

        try:
            audio = self._tts.generate(
                request.text,
                sid=speaker_id,
                speed=request.speed,
            )
        except Exception as exc:
            msg = str(exc)
            # Fail loudly on VRAM exhaustion — never silently degrade
            if "cuda" in msg.lower() or "out of memory" in msg.lower():
                raise RuntimeError(
                    f"[VRAM exhausted] TTS generation failed: {msg}"
                ) from exc
            return TTSResponse(success=False, error=msg)

        samples = np.array(audio.samples, dtype=np.float32)
        wav_bytes = _pcm_to_wav_bytes(samples, audio.sample_rate)
        duration = len(samples) / audio.sample_rate

        return TTSResponse(
            success=True,
            audio_bytes=wav_bytes,
            duration=duration,
            word_count=len(request.text.split()),
        )
