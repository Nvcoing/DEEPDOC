import re, torch
from sentence_transformers import SentenceTransformer
from transformers import pipeline

device = "cuda" if torch.cuda.is_available() else "cpu"

EMBED_MODEL_NAME = "Qwen/Qwen3-Embedding-0.6B"
NER_MODEL_NAME = "Babelscape/wikineural-multilingual-ner"

embed_model = SentenceTransformer(
    EMBED_MODEL_NAME,
    device=device
)

ner_multi = pipeline(
    "ner",
    model=NER_MODEL_NAME,
    grouped_entities=True,
    device=0 if device == "cuda" else -1
)

EMAIL_REGEX = r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"
PHONE_REGEX = r"\+?\d[\d\- ]{7,}\d"
