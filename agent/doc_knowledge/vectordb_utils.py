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

        print("=" * 80)
        print(f"📄 Upload file: {file_name}")

        # ---------- Load pages ----------
        pages_raw = load_file_pages(file_path)
        print(f"🔹 Pages raw: {len(pages_raw)}")

        pages = []
        for i, p in enumerate(pages_raw):
            if p and p.strip():
                pages.append(p.strip())
                print(f"\n--- PAGE {i} (len={len(p.strip())}) ---")
                print(p.strip()[:500])
            else:
                print(f"\n--- PAGE {i} EMPTY ---")

        if not pages:
            print("❌ Không có page nào sau khi load")
            return collection_name

        # ---------- Reset collection ----------
        try:
            self.client.get_collection(collection_name)
            self.client.delete_collection(collection_name)
            print(f"⚠️ Collection '{collection_name}' đã tồn tại, xóa và tạo mới")
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
        chunks_with_pages = chunk_pages_smart(
            pages,
            chunk_size=300,
            overlap=50
        )

        print("\n" + "=" * 80)
        print(f"🧩 Tổng chunks raw: {len(chunks_with_pages)}")

        # ---------- Page dict ----------
        page_dict = {}
        for page_id, page_text in enumerate(pages):
            if len(page_text) >= MIN_PAGE_CHARS:
                page_dict[page_id] = {
                    "text": page_text,
                    "chunks": []
                }
            else:
                print(f"⚠️ Page {page_id} bị loại (len={len(page_text)})")

        # ---------- Chunk processing ----------
        valid_chunk_count = 0

        for chunk_id, (chunk_text, pages_involved) in enumerate(chunks_with_pages):
            if not chunk_text or len(chunk_text.strip()) < MIN_CHUNK_CHARS:
                print(f"⚠️ Chunk {chunk_id} bị loại (len nhỏ)")
                continue

            print(f"\n--- CHUNK {chunk_id} ---")
            print(f"Pages involved: {pages_involved}")
            print(chunk_text[:500])

            entities = extract_entities(chunk_text)

            emb = self._safe_embed([chunk_text])
            if emb is None:
                print("❌ Embed chunk fail")
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
            else:
                print(f"⚠️ Chunk {chunk_id} map tới page không hợp lệ")

        print("\n" + "=" * 80)
        print(f"✅ Valid chunks: {valid_chunk_count}")

        # ---------- Page embedding ----------
        page_points = []

        for page_id, page_info in page_dict.items():
            if not page_info["chunks"]:
                print(f"⚠️ Page {page_id} không có chunk hợp lệ")
                continue

            print(f"\n=== PAGE {page_id} FINAL ===")
            print(page_info["text"][:500])
            print(f"Chunks: {len(page_info['chunks'])}")

            page_emb = self._safe_embed([page_info["text"]])
            if page_emb is None:
                print("❌ Embed page fail")
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
        print("\n" + "=" * 80)
        if page_points:
            self.client.upsert(
                collection_name=collection_name,
                points=page_points
            )
            print(
                f"🎉 Upload xong '{file_name}': "
                f"{len(page_points)} pages, "
                f"{valid_chunk_count} chunks"
            )
        else:
            print("❌ Không có page hợp lệ để upload")

        return collection_name
