import os
import uuid
import torch
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct

from doc_knowledge.config import CLIENT, embed_model
from doc_knowledge.file_loader import load_file_pages, chunk_page
from doc_knowledge.entities import extract_entities


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

        # ================= PAGE + CHUNK METADATA =================
        page_points = []
        
        for pid, page_text in enumerate(pages):
            # Bỏ qua pages rỗng
            if not page_text or not page_text.strip():
                print(f"Warning: Page {pid} rỗng, bỏ qua")
                continue
            
            # Tạo chunks cho page
            chunks = chunk_page(page_text)
            
            # Nếu không có chunks hoặc chunks rỗng, dùng toàn bộ page_text
            if not chunks:
                chunks = [page_text]
            
            # Lọc chunks rỗng
            chunks = [c for c in chunks if c and c.strip()]
            
            if not chunks:
                print(f"Warning: Page {pid} không tạo được chunks hợp lệ")
                continue
            
            # Embed chunks
            with torch.no_grad():
                chunk_embs = self.embed_model.encode(
                    chunks,
                    normalize_embeddings=True
                ).tolist()
            
            # Trích xuất entities cho mỗi chunk
            chunks_metadata = []
            for chunk_id, (chunk_text, chunk_emb) in enumerate(zip(chunks, chunk_embs)):
                entities = extract_entities(chunk_text)
                
                chunks_metadata.append({
                    "chunk_id": chunk_id,
                    "text": chunk_text,
                    "embedding": chunk_emb,
                    "entities": entities
                })
            
            # Embed page (dùng page_text gốc)
            with torch.no_grad():
                page_emb = self.embed_model.encode(
                    [page_text],
                    normalize_embeddings=True
                ).tolist()[0]
            
            # Lưu page với chunks metadata
            page_points.append(
                PointStruct(
                    id=str(uuid.uuid4()),
                    vector=page_emb,
                    payload={
                        "text": page_text,
                        "type": "page",
                        "page": pid,
                        "original_index": pid,
                        "chunks": chunks_metadata  # Lưu sẵn chunks với entities
                    }
                )
            )

        # Upsert tất cả pages
        self.client.upsert(
            collection_name=collection_name,
            points=page_points
        )
        
        print(f"Đã upload file '{file_name}' với {len(page_points)} pages")
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