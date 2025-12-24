from dataclasses import dataclass
from typing import Optional
import torch

# =========================
# MODEL LOAD CONFIG
# =========================
@dataclass
class ModelConfig:
    model_name: str = "meta-llama/Llama-3.2-1B-Instruct"
    device_map: str = "cuda"
    torch_dtype: torch.dtype = torch.float16
    trust_remote_code: bool = False
    low_cpu_mem_usage: bool = True

    # Quantization
    load_in_8bit: bool = False
    load_in_4bit: bool = False

    # Tokenizer
    use_fast_tokenizer: bool = True
    use_cache: bool = True


# =========================
# GENERATION CONFIG
# =========================
@dataclass
class GenerationConfig:
    max_new_tokens: int = 128000
    temperature: float = 0.2
    top_p: float = 0.9
    top_k: int = 50
    do_sample: bool = True
    repetition_penalty: float = 1.2
    num_beams: int = 1
    stop_token_id: Optional[int] = None
