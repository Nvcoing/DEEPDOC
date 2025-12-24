import os
import uuid
import torch
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct

from doc_knowledge.config import CLIENT, embed_model
from doc_knowledge.file_loader import load_file_pages, chunk_page


class QdrantFileUploader:
    def __init__(self, client: QdrantClient = CLIENT, embed_model=embed_model):
        self.client = client
        self.embed_model = embed_model

    def upload_file(self, file_path: str) -> str:
        file_name = os.path.basename(file_path)
        collection_name = f"doc_{file_name}"

        pages = load_file_pages(file_path)

        # Nếu collection tồn tại → xóa để tạo mới
        try:
            self.client.get_collection(collection_name)
            self.client.delete_collection(collection_name)
            print(f"Collection '{collection_name}' đã tồn tại, xóa và tạo mới...")
        except:
            pass

        # Tạo collection
        self.client.create_collection(
            collection_name=collection_name,
            vectors_config=VectorParams(
                size=1024,
                distance=Distance.COSINE
            )
        )

        # ================= PAGE LEVEL =================
        with torch.no_grad():
            page_embs = self.embed_model.encode(
                pages,
                normalize_embeddings=True
            ).tolist()

        page_points = []
        for i, (text, emb) in enumerate(zip(pages, page_embs)):
            page_points.append(
                PointStruct(
                    id=str(uuid.uuid4()),
                    vector=emb,
                    payload={
                        "text": text,
                        "type": "page",
                        "page": i,
                        "original_index": i
                    }
                )
            )

        self.client.upsert(
            collection_name=collection_name,
            points=page_points
        )

        # ================= CHUNK LEVEL =================
        chunk_points = []
        for pid, text in enumerate(pages):
            chunks = chunk_page(text)
            if not chunks:
                continue

            with torch.no_grad():
                embs = self.embed_model.encode(chunks).tolist()

            for chunk_id, (chunk_text, chunk_emb) in enumerate(zip(chunks, embs)):
                chunk_points.append(
                    PointStruct(
                        id=str(uuid.uuid4()),
                        vector=chunk_emb,
                        payload={
                            "text": chunk_text,
                            "type": "chunk",
                            "page": pid,
                            "chunk_id": chunk_id
                        }
                    )
                )
        if chunk_points:
            self.client.upsert(
                collection_name=collection_name,
                points=chunk_points
            )
        print(f"Đã upload file '{file_name}' thành công")
        return collection_name

    def list_collections(self):
        try:
            collections = self.client.get_collections().collections
            return [c.name for c in collections]
        except Exception as e:
            print(f"Error listing collections: {e}")
            return []

    def load_collection(self, collection_name: str):
        try:
            self.client.get_collection(collection_name)
            print(f"Đã tải collection: {collection_name}")
            return collection_name
        except:
            print(f"Collection '{collection_name}' không tồn tại")
            return None

    def check_file_uploaded(self, file_name: str):
        collection_name = f"doc_{file_name}"
        return self.load_collection(collection_name)
