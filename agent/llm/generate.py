import torch
import threading
from transformers import (
    AutoTokenizer,
    AutoModelForCausalLM,
    TextIteratorStreamer
)

from llm.config import ModelConfig, GenerationConfig

# =========================
# LOAD MODEL (ONCE)
# =========================
_model_cfg = ModelConfig()

tokenizer = AutoTokenizer.from_pretrained(
    _model_cfg.model_name,
    use_fast=_model_cfg.use_fast_tokenizer,
    trust_remote_code=_model_cfg.trust_remote_code
)

model = AutoModelForCausalLM.from_pretrained(
    _model_cfg.model_name,
    torch_dtype=_model_cfg.torch_dtype,
    trust_remote_code=_model_cfg.trust_remote_code,
    load_in_8bit=_model_cfg.load_in_8bit,
    load_in_4bit=_model_cfg.load_in_4bit,
    low_cpu_mem_usage=_model_cfg.low_cpu_mem_usage
)

model.config.use_cache = _model_cfg.use_cache
model.to(_model_cfg.device_map)
model.eval()
# =========================
# NORMAL GENERATION (NO STREAM)
# =========================
def generate_text(
    prompt: str,
    gen_config: GenerationConfig = GenerationConfig()
) -> str:
    inputs = tokenizer(prompt, return_tensors="pt").to(_model_cfg.device_map)

    gen_kwargs = dict(
        **inputs,
        max_new_tokens=gen_config.max_new_tokens,
        temperature=gen_config.temperature,
        top_p=gen_config.top_p,
        top_k=gen_config.top_k,
        do_sample=gen_config.do_sample,
        repetition_penalty=gen_config.repetition_penalty,
        num_beams=gen_config.num_beams,
        pad_token_id=tokenizer.eos_token_id,
        eos_token_id=gen_config.stop_token_id or tokenizer.eos_token_id,
        use_cache=True
    )

    with torch.no_grad():
        outputs = model.generate(**gen_kwargs)

    text = tokenizer.decode(outputs[0], skip_special_tokens=True)
    return text[len(prompt):].strip()

# =========================
# STREAM GENERATION
# =========================
def generate_stream(
    prompt: str,
    gen_config: GenerationConfig = GenerationConfig()
):
    inputs = tokenizer(prompt, return_tensors="pt").to(_model_cfg.device_map)

    gen_kwargs = dict(
        **inputs,
        max_new_tokens=gen_config.max_new_tokens,
        temperature=gen_config.temperature,
        top_p=gen_config.top_p,
        top_k=gen_config.top_k,
        do_sample=gen_config.do_sample,
        repetition_penalty=gen_config.repetition_penalty,
        num_beams=gen_config.num_beams,
        pad_token_id=tokenizer.eos_token_id,
        eos_token_id=gen_config.stop_token_id or tokenizer.eos_token_id,
        use_cache=True
    )

    streamer = TextIteratorStreamer(
        tokenizer,
        skip_prompt=True,
        skip_special_tokens=True
    )
    gen_kwargs["streamer"] = streamer

    def _run():
        model.generate(**gen_kwargs)

    threading.Thread(target=_run, daemon=True).start()

    for token in streamer:
        yield token
