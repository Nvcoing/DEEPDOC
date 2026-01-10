import os
import uuid
import torch
from typing import Dict, List, Any, Optional
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct

from doc_knowledge.config import CLIENT, embed_model
from doc_knowledge.file_loader import load_file_pages, chunk_pages_smart
from doc_knowledge.entities import extract_entities

# Lưu trữ tạm thời các chunk đã được embedding (chưa lưu vào vectorDB)
_temp_chunk_storage: Dict[str, List[Dict[str, Any]]] = {}


class QdrantFileUploader:
    def __init__(self, client: QdrantClient = CLIENT, embed_model=embed_model):
        self.client = client
        self.embed_model = embed_model

    def process_chunk_batch(self, file_name: str, chunk_batch: List[Dict[str, Any]]) -> None:
        """
        Xử lý một batch chunk: embedding và lưu tạm thời (chưa lưu vào vectorDB)
        
        Args:
            file_name: Tên file
            chunk_batch: List các chunk với format:
                [{
                    "chunk_id": int,
                    "text": str,
                    "pages": List[int]
                }, ...]
        """
        collection_name = f"doc_{file_name}"
        
        # Khởi tạo storage nếu chưa có
        if collection_name not in _temp_chunk_storage:
            _temp_chunk_storage[collection_name] = []
        
        processed_chunks = []
        
        for chunk_data in chunk_batch:
            chunk_text = chunk_data["text"]
            chunk_id = chunk_data["chunk_id"]
            pages_involved = chunk_data["pages"]
            
            # Extract entities
            entities = extract_entities(chunk_text)
            
            # Embedding
            with torch.no_grad():
                chunk_emb = self.embed_model.encode(
                    [chunk_text],
                    normalize_embeddings=True
                ).tolist()[0]
            
            processed_chunk = {
                "chunk_id": chunk_id,
                "text": chunk_text,
                "embedding": chunk_emb,
                "entities": entities,
                "pages": pages_involved
            }
            
            processed_chunks.append(processed_chunk)
        
        # Lưu vào storage tạm thời
        _temp_chunk_storage[collection_name].extend(processed_chunks)
        print(f"Đã xử lý batch {len(chunk_batch)} chunks cho {file_name}. Tổng chunks tạm thời: {len(_temp_chunk_storage[collection_name])}")
    
    def finalize_upload(self, file_name: str, pages: List[str]) -> str:
        """
        Hoàn tất upload: tổng hợp tất cả chunks đã embedding và lưu vào vectorDB
        
        Args:
            file_name: Tên file
            pages: List các page text để tạo page embeddings
            
        Returns:
            collection_name: Tên collection đã tạo
        """
        collection_name = f"doc_{file_name}"
        
        # Kiểm tra xem có chunks tạm thời không
        if collection_name not in _temp_chunk_storage or not _temp_chunk_storage[collection_name]:
            raise ValueError(f"Không có chunks tạm thời cho file {file_name}")
        
        temp_chunks = _temp_chunk_storage[collection_name]
        
        # Sắp xếp chunks theo chunk_id để đảm bảo thứ tự đúng
        temp_chunks = sorted(temp_chunks, key=lambda x: x["chunk_id"])
        
        # Tạo collection nếu chưa có
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
        
        # Tổ chức chunks theo page
        page_dict = {}
        for page_id, page_text in enumerate(pages):
            if page_text.strip():
                page_dict[page_id] = {
                    "text": page_text,
                    "chunks": []
                }
        
        # Phân bổ chunks vào pages (đã được sắp xếp theo chunk_id)
        for chunk in temp_chunks:
            main_page = chunk["pages"][0] if chunk["pages"] else 0
            if main_page in page_dict:
                page_dict[main_page]["chunks"].append(chunk)
        
        # Tạo page points
        page_points = []
        for page_id, page_info in page_dict.items():
            if not page_info["chunks"]:
                continue
            
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
                        "type": "page",
                        "page": page_id,
                        "text": page_info["text"],
                        "chunks": page_info["chunks"]
                    }
                )
            )
        
        # Upsert vào vectorDB
        if page_points:
            self.client.upsert(
                collection_name=collection_name,
                points=page_points
            )
            print(
                f"Đã upload '{file_name}' với "
                f"{len(page_points)} pages, {len(temp_chunks)} chunks"
            )
        else:
            print("Không có page nào được upload")
        
        # Xóa storage tạm thời
        del _temp_chunk_storage[collection_name]
        
        return collection_name

    def upload_file(self, file_path: str) -> str:
        file_name = os.path.basename(file_path)
        collection_name = f"doc_{file_name}"

        pages = load_file_pages(file_path)

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

        chunks_with_pages = chunk_pages_smart(
            pages,
            chunk_size=2000,
            overlap=500
        )

        print(f"\nTổng số chunks: {len(chunks_with_pages)}")

        page_dict = {}

        for page_id, page_text in enumerate(pages):
            if page_text.strip():
                page_dict[page_id] = {
                    "text": page_text,
                    "chunks": []
                }

        for chunk_id, (chunk_text, pages_involved) in enumerate(chunks_with_pages):
            entities = extract_entities(chunk_text)

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
                "pages": pages_involved
            }

            main_page = pages_involved[0]
            if main_page in page_dict:
                page_dict[main_page]["chunks"].append(chunk_data)

        # =======================
        # DEBUG – IN DỮ LIỆU
        # =======================
        print("\n================= DATA BEFORE UPSERT =================\n")

        for page_id, page_info in page_dict.items():
            if not page_info["chunks"]:
                continue

            print(f"\n---------- PAGE {page_id} ----------")
            print(f"Page text length: {len(page_info['text'])}")
            print(f"Page preview:\n{page_info['text'][:300]}")

            for chunk in page_info["chunks"]:
                print("\n  >>> CHUNK")
                print(f"  Chunk ID: {chunk['chunk_id']}")
                print(f"  Pages involved: {chunk['pages']}")
                print(f"  Chunk text length: {len(chunk['text'])}")
                print(f"  Chunk preview:\n  {chunk['text'][:300]}")
                print(f"  Entities: {chunk['entities']}")
                print(
                    f"  Embedding dim: {len(chunk['embedding'])}, "
                    f"sample: {chunk['embedding'][:5]}"
                )

        print("\n================= END DEBUG =================\n")

        # =======================
        # TẠO PAGE POINTS
        # =======================
        page_points = []

        for page_id, page_info in page_dict.items():
            if not page_info["chunks"]:
                continue

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
                        "type": "page",
                        "page": page_id,
                        "text": page_info["text"],
                        "chunks": page_info["chunks"]
                    }
                )
            )

        if page_points:
            self.client.upsert(
                collection_name=collection_name,
                points=page_points
            )
            print(
                f"Đã upload '{file_name}' với "
                f"{len(page_points)} pages, {len(chunks_with_pages)} chunks"
            )
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
