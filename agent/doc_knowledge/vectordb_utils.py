import os
import uuid
import torch
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct

from doc_knowledge.config import CLIENT, embed_model
from doc_knowledge.file_loader import load_file_pages, chunk_pages_smart
from doc_knowledge.entities import extract_entities


class QdrantFileUploader:
    def __init__(self, client: QdrantClient = CLIENT, embed_model=embed_model):
        self.client = client
        self.embed_model = embed_model

    def upload_file(self, file_path: str) -> str:
        """
        Upload file và tạo collection với chunks thông minh:
        - Mỗi page chia 3 chunks
        - Chunk cuối tràn sang page tiếp theo
        """
        file_name = os.path.basename(file_path)
        collection_name = f"doc_{file_name}"

        # Load pages
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

        # Chunk pages thông minh
        chunks_with_pages = chunk_pages_smart(pages)
        print(f"Tổng số chunks: {len(chunks_with_pages)}")
        
        # Tạo page points
        page_dict = {}  # {page_id: {"text": ..., "chunks": [...]}}
        
        # Khởi tạo page_dict
        for page_id, page_text in enumerate(pages):
            if page_text.strip():
                page_dict[page_id] = {
                    "text": page_text,
                    "chunks": []
                }
        
        # Gán chunks vào pages
        for chunk_id, (chunk_text, pages_involved) in enumerate(chunks_with_pages):
            # Extract entities
            entities = extract_entities(chunk_text)
            
            # Embed chunk
            with torch.no_grad():
                chunk_emb = self.embed_model.encode(
                    [chunk_text],
                    normalize_embeddings=True
                ).tolist()[0]
            
            chunk_data = {
                "chunk_id": chunk_id,
                "text": chunk_text,
                "embedding": chunk_emb,
                "entities": entities,
                "pages": pages_involved  # Danh sách pages liên quan
            }
            
            # Gán chunk vào page đầu tiên
            main_page = pages_involved[0]
            if main_page in page_dict:
                page_dict[main_page]["chunks"].append(chunk_data)
        
        # Tạo page points
        page_points = []
        for page_id, page_info in page_dict.items():
            if not page_info["chunks"]:
                continue
            
            # Embed page
            with torch.no_grad():
                page_emb = self.embed_model.encode(
                    [page_info["text"]],
                    normalize_embeddings=True
                ).tolist()[0]
            
            page_points.append(
                PointStruct(
                    id=str(uuid.uuid4()),
                    vector=page_emb,
                    payload={
                        "text": page_info["text"],
                        "type": "page",
                        "page": page_id,
                        "chunks": page_info["chunks"]
                    }
                )
            )

        # Upsert
        if page_points:
            self.client.upsert(
                collection_name=collection_name,
                points=page_points
            )
            print(f"Đã upload '{file_name}' với {len(page_points)} pages, {len(chunks_with_pages)} chunks")
        else:
            print("Không có page nào được upload")
        
        return collection_name

    def list_collections(self):
        """Liệt kê tất cả collections"""
        try:
            collections = self.client.get_collections().collections
            return [c.name for c in collections]
        except Exception as e:
            print(f"Error listing collections: {e}")
            return []

    def load_collection(self, collection_name: str):
        """Load collection có sẵn"""
        try:
            self.client.get_collection(collection_name)
            print(f"Load collection: {collection_name}")
            return collection_name
        except:
            print(f"Collection '{collection_name}' does not exist.")
            return None

    def delete_collection(self, name: str) -> bool:
        """Xóa collection"""
        collection_name = name if name.startswith("doc_") else f"doc_{name}"
        try:
            self.client.get_collection(collection_name)
            self.client.delete_collection(collection_name)
            print(f"Deleted collection: {collection_name}")
            return True
        except Exception as e:
            print(f"Failed to delete collection {collection_name}: {e}")
            return False