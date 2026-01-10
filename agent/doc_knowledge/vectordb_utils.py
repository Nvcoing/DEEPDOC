import os
import uuid
import torch
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct

from doc_knowledge.config import CLIENT, embed_model
from doc_knowledge.file_loader import load_file_pages, chunk_pages_smart
from doc_knowledge.entities import extract_entities


MIN_PAGE_CHARS = 50
MIN_CHUNK_CHARS = 40


class QdrantFileUploader:
    def __init__(self, client: QdrantClient = CLIENT, embed_model=embed_model):
        self.client = client
        self.embed_model = embed_model

    def _safe_embed(self, texts):
        """Embed an toàn – không cho text rỗng lọt qua"""
        clean = [t.strip() for t in texts if t and t.strip()]
        if not clean:
            return None

        with torch.no_grad():
            vectors = self.embed_model.encode(
                clean,
                normalize_embeddings=True
            )

        if vectors is None or len(vectors) == 0:
            return None

        return vectors.tolist()

    def upload_file(self, file_path: str) -> str:
        file_name = os.path.basename(file_path)
        collection_name = f"doc_{file_name}"

        # ---------- Load pages (đã OCR-safe ở bước trước) ----------
        pages = [p.strip() for p in load_file_pages(file_path) if p and p.strip()]

        # ---------- Reset collection ----------
        try:
            self.client.get_collection(collection_name)
            self.client.delete_collection(collection_name)
            print(f"Collection '{collection_name}' đã tồn tại, xóa và tạo mới...")
        except:
            pass

        self.client.create_collection(
            collection_name=collection_name,
            vectors_config=VectorParams(
                size=1024,
                distance=Distance.COSINE
            )
        )

        # ---------- Chunk ----------
        chunks_with_pages = chunk_pages_smart(pages, chunk_size=300, overlap=50)
        print(f"Tổng số chunks raw: {len(chunks_with_pages)}")

        # ---------- Page dict ----------
        page_dict = {}
        for page_id, page_text in enumerate(pages):
            if len(page_text) >= MIN_PAGE_CHARS:
                page_dict[page_id] = {
                    "text": page_text,
                    "chunks": []
                }

        # ---------- Chunk processing ----------
        valid_chunk_count = 0

        for chunk_id, (chunk_text, pages_involved) in enumerate(chunks_with_pages):
            if not chunk_text or len(chunk_text.strip()) < MIN_CHUNK_CHARS:
                continue

            entities = extract_entities(chunk_text)

            emb = self._safe_embed([chunk_text])
            if emb is None:
                continue

            chunk_data = {
                "chunk_id": chunk_id,
                "text": chunk_text.strip(),
                "embedding": emb[0],
                "entities": entities,
                "pages": pages_involved
            }

            main_page = pages_involved[0]
            if main_page in page_dict:
                page_dict[main_page]["chunks"].append(chunk_data)
                valid_chunk_count += 1

        # ---------- Page embedding ----------
        page_points = []

        for page_id, page_info in page_dict.items():
            if not page_info["chunks"]:
                continue

            page_emb = self._safe_embed([page_info["text"]])
            if page_emb is None:
                continue

            page_points.append(
                PointStruct(
                    id=str(uuid.uuid4()),
                    vector=page_emb[0],
                    payload={
                        "type": "page",
                        "page": page_id,
                        "text": page_info["text"],
                        "chunks": page_info["chunks"],
                        "chunk_count": len(page_info["chunks"])
                    }
                )
            )

        # ---------- Upsert ----------
        if page_points:
            self.client.upsert(
                collection_name=collection_name,
                points=page_points
            )
            print(
                f"Upload xong '{file_name}': "
                f"{len(page_points)} pages, "
                f"{valid_chunk_count} valid chunks"
            )
        else:
            print("❌ Không có page hợp lệ để upload")

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
