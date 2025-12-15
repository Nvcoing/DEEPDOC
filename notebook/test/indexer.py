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

    for i in range(0, len(chunks), batch_size):
        batch_chunks = chunks[i:i + batch_size]
        batch_ids = ids[i:i + batch_size]
        batch_metas = metas[i:i + batch_size]

        emb = embed_texts(batch_chunks)

        collection.add(
            ids=batch_ids,
            documents=batch_chunks,
            metadatas=batch_metas,
            embeddings=emb
        )

        if device == "cuda":
            torch.cuda.empty_cache()

    # ❌ KHÔNG CẦN persist()
    return collection, pages


# =====================================================
# LOAD COLLECTION (KHÔNG INDEX LẠI)
# =====================================================

def load_collection(file_name):
    return chroma.get_collection(name=file_name)
