import os
import uuid
import torch
from typing import List
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct

from doc_knowledge.config import CLIENT, embed_model
from doc_knowledge.file_loader import load_file_pages, chunk_pages_smart
from doc_knowledge.entities import extract_entities


def batch_iter(items: List, batch_size: int):
    for i in range(0, len(items), batch_size):
        yield items[i:i + batch_size]


class QdrantFileUploader:
    def __init__(
        self,
        client: QdrantClient = CLIENT,
        embed_model=embed_model,
        embed_batch_size: int = 32,
        upsert_batch_size: int = 64
    ):
        self.client = client
        self.embed_model = embed_model
        self.embed_batch_size = embed_batch_size
        self.upsert_batch_size = upsert_batch_size

    def upload_file(self, file_path: str) -> str:
        file_name = os.path.basename(file_path)
        collection_name = f"doc_{file_name}"

        # 1. Load pages
        pages = load_file_pages(file_path)

        # 2. Reset collection if exists
        try:
            self.client.get_collection(collection_name)
            self.client.delete_collection(collection_name)
            print(f"Collection '{collection_name}' đã tồn tại, xóa và tạo mới...")
        except:
            pass

        # 3. Create collection
        self.client.create_collection(
            collection_name=collection_name,
            vectors_config=VectorParams(
                size=1024,
                distance=Distance.COSINE
            )
        )

        # 4. Chunk pages
        chunks_with_pages = chunk_pages_smart(pages)
        print(f"Tổng số chunks: {len(chunks_with_pages)}")

        # 5. Init page dict
        page_dict = {
            page_id: {"text": text, "chunks": []}
            for page_id, text in enumerate(pages)
            if text.strip()
        }

        # 6. Prepare chunk texts
        chunk_texts = []
        chunk_metas = []

        for chunk_id, (chunk_text, pages_involved) in enumerate(chunks_with_pages):
            chunk_texts.append(chunk_text)
            chunk_metas.append((chunk_id, pages_involved))

        # 7. Batch embed chunks
        print("Embedding chunks (batch)...")
        chunk_embeddings = []

        with torch.no_grad():
            for text_batch in batch_iter(chunk_texts, self.embed_batch_size):
                embs = self.embed_model.encode(
                    text_batch,
                    normalize_embeddings=True,
                    show_progress_bar=False
                )
                chunk_embeddings.extend(embs)

        # 8. Assign chunks to pages
        for emb, chunk_text, (chunk_id, pages_involved) in zip(
            chunk_embeddings, chunk_texts, chunk_metas
        ):
            entities = extract_entities(chunk_text)

            chunk_data = {
                "chunk_id": chunk_id,
                "text": chunk_text,
                "embedding": emb.tolist(),
                "entities": entities,
                "pages": pages_involved
            }

            main_page = pages_involved[0]
            if main_page in page_dict:
                page_dict[main_page]["chunks"].append(chunk_data)

        del chunk_embeddings
        torch.cuda.empty_cache()

        # 9. Create page points
        page_points = []

        print("Embedding pages...")
        for page_id, page_info in page_dict.items():
            if not page_info["chunks"]:
                continue

            with torch.no_grad():
                page_emb = self.embed_model.encode(
                    [page_info["text"]],
                    normalize_embeddings=True
                )[0]

            page_points.append(
                PointStruct(
                    id=str(uuid.uuid4()),
                    vector=page_emb.tolist(),
                    payload={
                        "type": "page",
                        "page": page_id,
                        "text": page_info["text"],
                        "chunks": page_info["chunks"]
                    }
                )
            )

        # 10. Batch upsert pages
        print("Upserting to Qdrant...")
        for pts in batch_iter(page_points, self.upsert_batch_size):
            self.client.upsert(
                collection_name=collection_name,
                points=pts
            )

        print(
            f"Đã upload '{file_name}' | "
            f"Pages: {len(page_points)} | "
            f"Chunks: {len(chunks_with_pages)}"
        )

        return collection_name

    def list_collections(self):
        try:
            return [c.name for c in self.client.get_collections().collections]
        except Exception as e:
            print(f"Error listing collections: {e}")
            return []

    def load_collection(self, collection_name: str):
        try:
            self.client.get_collection(collection_name)
            print(f"Load collection: {collection_name}")
            return collection_name
        except:
            print(f"Collection '{collection_name}' does not exist.")
            return None

    def delete_collection(self, name: str) -> bool:
        collection_name = name if name.startswith("doc_") else f"doc_{name}"
        try:
            self.client.get_collection(collection_name)
            self.client.delete_collection(collection_name)
            print(f"Deleted collection: {collection_name}")
            return True
        except Exception as e:
            print(f"Failed to delete collection {collection_name}: {e}")
            return False
