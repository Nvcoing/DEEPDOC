import torch
from config import embed_model

PAGE_EMB_CACHE = {}


def embed_texts(texts):
    with torch.no_grad():
        return embed_model.encode(texts).tolist()


def get_page_embedding(pid, pages):
    if pid not in PAGE_EMB_CACHE:
        with torch.no_grad():
            PAGE_EMB_CACHE[pid] = embed_model.encode(
                pages[pid],
                normalize_embeddings=True
            )
    return PAGE_EMB_CACHE[pid]
