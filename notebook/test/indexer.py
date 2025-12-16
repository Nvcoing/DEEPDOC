import os
import torch
import chromadb
from chromadb.config import Settings

from chunking import build_chunks
from embedding import embed_texts
from config import device


# =====================================================
# CHROMA PERSISTENT CLIENT (AUTO SAVE)
# =====================================================

CHROMA_DIR = "./collections"
os.makedirs(CHROMA_DIR, exist_ok=True)

chroma = chromadb.Client(
    Settings(
        persist_directory=CHROMA_DIR,
        anonymized_telemetry=False
    )
)


# =====================================================
# INDEX FILE → 1 COLLECTION
# =====================================================

def index_file(path, batch_size=8):
    chunks, ids, metas, pages = build_chunks(path)

    collection_name = os.path.basename(path)

    collection = chroma.get_or_create_collection(
        name=collection_name,
        metadata={"hnsw:space": "cosine"}
    )

    # ============================
    # 1. LƯU PAGE (1 PAGE = 1 DOC)
    # ============================

    page_ids = [f"page_{i}" for i in range(len(pages))]
    page_metas = [{"type": "page", "page": i} for i in range(len(pages))]
    page_embs = embed_texts(pages)

    collection.add(
        ids=page_ids,
        documents=pages,
        metadatas=page_metas,
        embeddings=page_embs
    )

    # ============================
    # 2. LƯU CHUNKS
    # ============================

    for i in range(0, len(chunks), batch_size):
        emb = embed_texts(chunks[i:i + batch_size])

        collection.add(
            ids=ids[i:i + batch_size],
            documents=chunks[i:i + batch_size],
            metadatas=metas[i:i + batch_size],
            embeddings=emb
        )

        if device == "cuda":
            torch.cuda.empty_cache()

    return collection
# =====================================================
# LOAD COLLECTION (KHÔNG INDEX LẠI)
# =====================================================

def load_collection(file_name):
    return chroma.get_collection(name=file_name)
