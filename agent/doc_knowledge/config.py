import os
import torch
from sentence_transformers import SentenceTransformer, CrossEncoder
from transformers import pipeline
from qdrant_client import QdrantClient
from doc_knowledge.vectordb_utils import QdrantFileUploader

VECTORDB = QdrantFileUploader()

COLLECTIONS = "./collections/"
# Cấu hình Qdrant
QDRANT_PATH = "./knowledge"
os.makedirs(QDRANT_PATH, exist_ok=True)
CLIENT = QdrantClient(path=QDRANT_PATH)
device = "cuda" if torch.cuda.is_available() else "cpu"

embed_model = SentenceTransformer(
    "Qwen/Qwen3-Embedding-0.6B",
    device=device
)

rank_model = CrossEncoder(
    "Qwen/Qwen3-Reranker-0.6B",
    device=device
)

rank_model.tokenizer.pad_token = rank_model.tokenizer.eos_token
rank_model.model.config.pad_token_id = rank_model.tokenizer.eos_token_id

ner_multi = pipeline(
    "ner",
    model="Davlan/xlm-roberta-base-ner-hrl",
    grouped_entities=True,
    device=0 if device == "cuda" else -1
)
