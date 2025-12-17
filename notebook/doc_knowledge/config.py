import os
import torch
from sentence_transformers import SentenceTransformer
from transformers import pipeline

CHROMA_PATH = "./collections"
os.makedirs(CHROMA_PATH, exist_ok=True)

device = "cuda" if torch.cuda.is_available() else "cpu"

embed_model = SentenceTransformer(
    "Qwen/Qwen3-Embedding-0.6B",
    device=device
)

ner_multi = pipeline(
    "ner",
    model="Babelscape/wikineural-multilingual-ner",
    grouped_entities=True,
    device=0 if device == "cuda" else -1
)

email_regex = r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"
phone_regex = r"\+?\d[\d\- ]{7,}\d"
