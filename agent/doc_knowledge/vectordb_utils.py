import os
import uuid
import torch
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct

from doc_knowledge.config import CLIENT, embed_model
from doc_knowledge.file_loader import load_file_pages, chunk_page_by_thirds


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

        # ================= PAGE LEVEL (LƯU PAGE GỐC) =================
        print(f"Đang embed {len(pages)} pages...")
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
        print(f"Đã lưu {len(page_points)} pages vào vector DB")

        # ================= CHUNK LEVEL (CHIA 1/3 PAGE) =================
        chunk_points = []
        total_chunks = 0
        
        for pid, page_text in enumerate(pages):
            # Chia page thành 3 chunks
            chunks = chunk_page_by_thirds(page_text)
            
            # Chỉ embed các chunks không rỗng
            non_empty_chunks = [(i, c) for i, c in enumerate(chunks) if c.strip()]
            
            if not non_empty_chunks:
                continue
            
            # Embed tất cả chunks của page này
            chunk_texts = [c for _, c in non_empty_chunks]
            with torch.no_grad():
                chunk_embs = self.embed_model.encode(
                    chunk_texts,
                    normalize_embeddings=True
                ).tolist()

            # Tạo points cho từng chunk
            for (chunk_idx, chunk_text), chunk_emb in zip(non_empty_chunks, chunk_embs):
                chunk_points.append(
                    PointStruct(
                        id=str(uuid.uuid4()),
                        vector=chunk_emb,
                        payload={
                            "text": chunk_text,
                            "type": "chunk",
                            "page": pid,
                            "chunk_id": chunk_idx,  # 0, 1, hoặc 2 (1/3 đầu, giữa, cuối)
                            "total_chunks": 3
                        }
                    )
                )
                total_chunks += 1

        if chunk_points:
            self.client.upsert(
                collection_name=collection_name,
                points=chunk_points
            )
            print(f"Đã lưu {total_chunks} chunks (3 chunks/page) vào vector DB")
        
        print(f"✓ Upload file '{file_name}' thành công!")
        print(f"  - Pages: {len(pages)}")
        print(f"  - Chunks: {total_chunks}")
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
            print(f"Load collection: {collection_name}")
            return collection_name
        except:
            print(f"Collection '{collection_name}' does not exist.")
            return None

    def check_file_uploaded(self, file_name: str):
        collection_name = f"doc_{file_name}"
        return self.load_collection(collection_name)
    
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