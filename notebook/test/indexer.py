import os, torch, chromadb
from chunking import build_chunks
from embedding import embed_texts
from config import device


chroma = chromadb.Client()


def index_file(path, batch_size=8):
    chunks, ids, metas, pages = build_chunks(path)

    collection_name = os.path.basename(path)
    collection = chroma.get_or_create_collection(
        name=collection_name,
        metadata={"hnsw:space": "cosine"}
    )

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

    return collection, pages
