from abc import ABC, abstractmethod

class EngineError(Exception):
    pass

class ASRBackend(ABC):
    @abstractmethod
    def transcribe(self, audio_path: str, language: str = None) -> dict:
        pass
