"""
base.py — Abstract base classes for TTS and ASR backends.

All adapters must implement these interfaces.
No platform-specific assumptions live here.
"""

from __future__ import annotations

import abc
from dataclasses import dataclass, field
from typing import Optional


# ── TTS ───────────────────────────────────────────────────────────────────────

@dataclass
class TTSRequest:
    text: str
    voice: str = "default"
    speed: float = 1.0


@dataclass
class TTSResponse:
    success: bool
    audio_bytes: Optional[bytes] = None   # WAV bytes when success=True
    error: Optional[str] = None
    duration: Optional[float] = None
    word_count: int = 0


class TTSBackend(abc.ABC):
    """Abstract Text-to-Speech backend."""

    @abc.abstractmethod
    def generate(self, request: TTSRequest) -> TTSResponse:
        """
        Synthesise speech from *request.text*.
        Returns TTSResponse with WAV bytes on success.

        IMPORTANT (RTX 3050 constraint):
          - Default to CPU inference.
          - If VRAM is requested and exhausted, raise RuntimeError loudly —
            never silently fall back to degraded output.
        """
        ...

    @abc.abstractmethod
    def is_ready(self) -> bool:
        """Return True if the backend is initialised and ready to generate."""
        ...


# ── ASR ───────────────────────────────────────────────────────────────────────

@dataclass
class ASRSegment:
    start: float
    end: float
    text: str


@dataclass
class ASRRequest:
    audio_path: str          # Absolute path to audio file on disk
    language: str = "auto"
    model_size: str = "base"


@dataclass
class ASRResult:
    success: bool
    text: str = ""
    segments: list[ASRSegment] = field(default_factory=list)
    error: Optional[str] = None


class ASRBackend(abc.ABC):
    """Abstract Automatic Speech Recognition backend."""

    @abc.abstractmethod
    def transcribe(self, request: ASRRequest) -> ASRResult:
        """
        Transcribe audio at *request.audio_path*.
        Returns ASRResult with full text and timestamped segments.
        """
        ...

    @abc.abstractmethod
    def is_ready(self) -> bool:
        """Return True if the backend model is loaded and ready."""
        ...
