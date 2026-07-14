"""
asr_faster_whisper.py — Faster-Whisper ASR adapter.

Uses CTranslate2-accelerated Whisper. Downloads model on first use to
~/.cache/huggingface/hub (standard HF cache, same as before).

RTX 3050 policy:
  - Default device="cpu" so TTS and ASR can run simultaneously without
    competing for VRAM.
  - Caller may set device="cuda" — if VRAM is exhausted, RuntimeError is
    raised loudly; we never silently degrade to CPU.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Optional

from base import ASRBackend, ASRRequest, ASRResult, ASRSegment

logger = logging.getLogger(__name__)


class FasterWhisperASRAdapter(ASRBackend):
    """
    Faster-Whisper ASR adapter.

    Lazy-loads the model on first transcribe() call.
    """

    def __init__(
        self,
        model_size: str = "base",
        device: str = "cpu",
        compute_type: str = "int8",
    ) -> None:
        self._model_size = model_size
        self._device = device
        self._compute_type = compute_type
        self._model = None  # lazy init

    def _init_model(self, model_size: str) -> None:
        try:
            from faster_whisper import WhisperModel
        except ImportError as exc:
            raise RuntimeError(
                "faster-whisper is not installed. Run: uv pip install faster-whisper"
            ) from exc

        logger.info(
            "[faster-whisper] Loading model=%s device=%s compute_type=%s",
            model_size,
            self._device,
            self._compute_type,
        )
        try:
            self._model = WhisperModel(
                model_size,
                device=self._device,
                compute_type=self._compute_type,
            )
        except Exception as exc:
            msg = str(exc)
            if "out of memory" in msg.lower() or "cuda" in msg.lower():
                raise RuntimeError(
                    f"[VRAM exhausted] Failed to load Whisper on {self._device}: {msg}"
                ) from exc
            raise
        logger.info("[faster-whisper] Model loaded: %s", model_size)

    def is_ready(self) -> bool:
        return self._model is not None

    def transcribe(self, request: ASRRequest) -> ASRResult:
        model_size = request.model_size or self._model_size

        # Re-init if model size changed
        if self._model is None:
            try:
                self._init_model(model_size)
            except RuntimeError as exc:
                return ASRResult(success=False, error=str(exc))

        lang = None if request.language in ("auto", "", None) else request.language

        try:
            segments_gen, info = self._model.transcribe(
                request.audio_path,
                language=lang,
                beam_size=5,
                word_timestamps=False,
            )
        except Exception as exc:
            msg = str(exc)
            if "out of memory" in msg.lower():
                raise RuntimeError(
                    f"[VRAM exhausted] Transcription OOM on {self._device}: {msg}"
                ) from exc
            return ASRResult(success=False, error=msg)

        segments: list[ASRSegment] = []
        full_text_parts: list[str] = []

        for seg in segments_gen:
            segments.append(ASRSegment(start=seg.start, end=seg.end, text=seg.text.strip()))
            full_text_parts.append(seg.text.strip())

        return ASRResult(
            success=True,
            text=" ".join(full_text_parts),
            segments=segments,
        )
