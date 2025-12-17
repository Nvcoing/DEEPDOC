import chromadb
from chromadb.config import Settings
import torch
from config import CHROMA_PATH, embed_model
from file_loader import load_file_pages, chunk_page

chroma = chromadb.PersistentClient(
    path=CHROMA_PATH,
    settings=Settings(anonymized_telemetry=False)
)

def upload_file(file_path: str):
    name = f"doc_{file_path.split('/')[-1]}"
    pages = load_file_pages(file_path)

    col = chroma.get_or_create_collection(
        name=name,
        metadata={"hnsw:space": "cosine"}
    )

    # PAGE LEVEL
    with torch.no_grad():
        page_embs = embed_model.encode(pages, normalize_embeddings=True).tolist()

    col.add(
        ids=[f"page_{i}" for i in range(len(pages))],
        documents=pages,
        embeddings=page_embs,
        metadatas=[{"type": "page", "page": i} for i in range(len(pages))]
    )

    # CHUNK LEVEL
    for pid, text in enumerate(pages):
        chunks = chunk_page(text)
        if not chunks:
            continue
        with torch.no_grad():
            embs = embed_model.encode(chunks).tolist()
        col.add(
            ids=[f"chunk_{pid}_{i}" for i in range(len(chunks))],
            documents=chunks,
            embeddings=embs,
            metadatas=[{"type": "chunk", "page": pid} for _ in chunks]
        )

    return name

def list_collections():
    return [c.name for c in chroma.list_collections()]

def get_collection(name):
    return chroma.get_collection(name)
