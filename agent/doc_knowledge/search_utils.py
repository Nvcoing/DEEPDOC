import torch
import gc
from typing import List, Dict, Set
from qdrant_client.models import Filter, FieldCondition, MatchValue
from doc_knowledge.entities import extract_entities, highlight_markdown
from doc_knowledge.config import embed_model, rank_model, device, CLIENT

class DOCSearcher:
    def __init__(
        self,
        collections: List[str],
        page_topk=10,          # Số page để search
        chunk_topk=5           # Số chunk tốt nhất sau rerank
    ):
        self.collections = collections
        self.page_topk = page_topk
        self.chunk_topk = chunk_topk

    def _scroll_page(self, collection: str, pid: int) -> str:
        """Lấy full text của page từ vector DB"""
        res = CLIENT.scroll(
            collection_name=collection,
            scroll_filter=Filter(must=[
                FieldCondition(key="type", match=MatchValue(value="page")),
                FieldCondition(key="page", match=MatchValue(value=pid))
            ]),
            with_payload=True
        )
        return res[0][0].payload.get("text", "") if res[0] else ""

    def _get_chunks_for_pages(
        self, 
        collection: str, 
        page_ids: Set[int]
    ) -> Dict[tuple, str]:
        """
        Lấy tất cả chunks của các pages đã chọn.
        Return: {(collection, page_id, chunk_id): chunk_text}
        """
        chunks = {}
        
        for pid in page_ids:
            res = CLIENT.scroll(
                collection_name=collection,
                scroll_filter=Filter(must=[
                    FieldCondition(key="type", match=MatchValue(value="chunk")),
                    FieldCondition(key="page", match=MatchValue(value=pid))
                ]),
                with_payload=True,
                limit=100  # Mỗi page tối đa 3 chunks
            )
            
            for point in res[0]:
                payload = point.payload
                chunk_id = payload.get("chunk_id", 0)
                chunk_text = payload.get("text", "")
                if chunk_text:
                    chunks[(collection, pid, chunk_id)] = chunk_text
        
        return chunks

    def _rerank(self, query: str, items: dict, topk: int) -> list:
        """Rerank các items bằng cross-encoder"""
        if not items:
            return []
        
        pairs = [(query, text) for text in items.values()]
        scores = rank_model.predict(pairs, batch_size=8)
        
        ranked = sorted(
            zip(items.keys(), scores),
            key=lambda x: x[1],
            reverse=True
        )
        return ranked[:topk]

    def search(self, query: str):
        # ===== 1. EMBED QUERY 1 LẦN =====
        with torch.no_grad():
            q_emb = embed_model.encode(
                [query],
                normalize_embeddings=True
            ).tolist()[0]

        global_pages = {}  # {(collection, page_id): page_text}
        
        # ===== 2. SEARCH TOP PAGES (10 PAGES) =====
        print(f"\n🔍 Đang search top {self.page_topk} pages...")
        
        for col in self.collections:
            try:
                page_results = CLIENT.search(
                    collection_name=col,
                    query_vector=q_emb,
                    query_filter=Filter(
                        must=[FieldCondition(key="type", match=MatchValue(value="page"))]
                    ),
                    limit=self.page_topk,
                    with_payload=True
                )

                for p in page_results:
                    pid = p.payload["page"]
                    page_text = p.payload.get("text", "")
                    if page_text:
                        global_pages[(col, pid)] = page_text
                        
            except Exception as e:
                print(f"⚠️  Search error in {col}: {e}")

        print(f"✓ Tìm thấy {len(global_pages)} pages từ {len(self.collections)} collections")

        if not global_pages:
            print("❌ Không tìm thấy pages nào!")
            return []

        # ===== 3. LẤY TẤT CẢ CHUNKS CỦA CÁC PAGES ĐÃ CHỌN =====
        print(f"\n📦 Đang lấy chunks của {len(global_pages)} pages...")
        
        all_chunks = {}  # {(collection, page_id, chunk_id): chunk_text}
        
        for col in self.collections:
            # Lấy page_ids thuộc collection này
            page_ids = {pid for (c, pid) in global_pages.keys() if c == col}
            
            if page_ids:
                chunks = self._get_chunks_for_pages(col, page_ids)
                all_chunks.update(chunks)
        
        print(f"✓ Thu thập được {len(all_chunks)} chunks")

        # ===== 4. RERANK CHUNKS =====
        print(f"\n🎯 Đang rerank {len(all_chunks)} chunks...")
        
        ranked_chunks = self._rerank(query, all_chunks, self.chunk_topk)
        
        print(f"✓ Chọn top {len(ranked_chunks)} chunks có điểm cao nhất")

        # ===== 5. TẠO OUTPUT THEO CHUNKS (KHÔNG THEO PAGES) =====
        outputs = []
        
        for rank, ((col, pid, chunk_id), score) in enumerate(ranked_chunks, start=1):
            chunk_text = all_chunks[(col, pid, chunk_id)]
            page_text = global_pages[(col, pid)]
            
            # Highlight entities trong chunk
            highlighted_chunk = highlight_markdown(
                chunk_text, 
                extract_entities(chunk_text)
            )
            
            outputs.append({
                "rank": rank,
                "collection": col,
                "page": pid + 1,  # Hiển thị page number (1-indexed)
                "chunk_id": chunk_id + 1,  # 1, 2, hoặc 3 (phần đầu/giữa/cuối)
                "score": round(float(score), 4),
                "chunk_text": chunk_text,
                "highlighted_chunk": highlighted_chunk,
                "full_page_text": page_text  # Có thể dùng để context
            })

        # ===== 6. CLEANUP MEMORY =====
        gc.collect()
        if device == "cuda":
            torch.cuda.empty_cache()

        print(f"\n✅ Hoàn thành! Trả về {len(outputs)} kết quả tốt nhất")
        return outputs