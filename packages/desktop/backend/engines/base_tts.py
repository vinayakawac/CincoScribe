import logging
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)

class EngineError(Exception):
    pass

class TTSBackend(ABC):
    @property
    @abstractmethod
    def requires_clone(self) -> bool:
        pass

    def gpu_preflight(self, asr_active: bool = False, requested_device: str = "cpu") -> str:
        """
        Enforce VRAM constraints. Raises EngineError on violation.
        Never silently falls back to CPU.
        """
        if requested_device == "cpu":
            return "cpu"
            
        try:
            import torch
        except ImportError:
            raise EngineError("PyTorch is required for GPU execution.")

        if not torch.cuda.is_available():
            raise EngineError("GPU requested but CUDA is not available. Cannot run on GPU.")
            
        vram_gb = torch.cuda.get_device_properties(0).total_memory / 1e9
        
        if vram_gb <= 4.0:
            if asr_active:
                logger.info("VRAM budget: offloading TTS to CPU")
                return "cpu"
            raise EngineError(f"Insufficient VRAM ({vram_gb:.1f}GB). GPU TTS requires > 4GB VRAM.")
                
        return "cuda"

    @abstractmethod
    def generate(self, text: str, voice: str) -> bytes:
        pass
