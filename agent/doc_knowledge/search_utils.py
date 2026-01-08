import torch
import gc
import json
from typing import List, Set
from difflib import SequenceMatcher
from qdrant_client.models import Filter, FieldCondition, MatchValue
from doc_knowledge.entities import highlight_markdown
from doc_knowledge.config import embed_model, rank_model, device, CLIENT


class DOCSearcher:
    def __init__(
        self,
        collections: List[str],
        chunk_topk=10,
        similarity_threshold=0.7  # Ngưỡng để phát hiện trùng lặp
    ):
        self.collections = collections
        self.chunk_topk = chunk_topk
        self.similarity_threshold = similarity_threshold

    def _text_similarity(self, text1: str, text2: str) -> float:
        """Tính độ tương đồng giữa 2 đoạn text"""
        return SequenceMatcher(None, text1.lower(), text2.lower()).ratio()

    def _is_duplicate(self, text: str, existing_texts: List[str]) -> bool:
        """Kiểm tra text có trùng với bất kỳ text nào đã có không"""
        for existing in existing_texts:
            if self._text_similarity(text, existing) >= self.similarity_threshold:
                return True
        return False

    def _merge_overlapping_chunks(self, chunks_with_meta: list):
        """
        Gộp các chunks có nội dung trùng lặp
        Nếu chunk overlap giữa 2 page khác nhau -> gộp metadata của cả 2 page
        """
        merged = []
        seen_texts = []
        
        for chunk_data, page_meta in chunks_with_meta:
            text = chunk_data.get("text", "").strip()
            
            if not text:
                continue
            
            # Kiểm tra xem text này đã tồn tại chưa
            duplicate_idx = None
            for idx, existing_text in enumerate(seen_texts):
                if self._text_similarity(text, existing_text) >= self.similarity_threshold:
                    duplicate_idx = idx
                    break
            
            if duplicate_idx is not None:
                # Trùng lặp -> gộp page metadata
                existing_item = merged[duplicate_idx]
                existing_pages = existing_item[1]
                
                # Thêm page mới vào metadata nếu chưa có
                page_key = (page_meta["collection"], page_meta["page"])
                if page_key not in [(p["collection"], p["page"]) for p in existing_pages]:
                    existing_pages.append(page_meta)
                
            else:
                # Chunk mới -> thêm vào
                merged.append((chunk_data, [page_meta]))
                seen_texts.append(text)
        
        return merged

    def _rerank_chunks(self, query, chunks_with_meta: list, topk: int):
        """
        Rerank chunks đã được deduplicate
        chunks_with_meta: [(chunk_data, [page_metadata_list]), ...]
        """
        if not chunks_with_meta:
            return []
        
        # Tạo pairs cho reranking
        pairs = [(query, item[0]["text"]) for item in chunks_with_meta]
        scores = rank_model.predict(pairs, batch_size=32)
        
        # Rank theo score
        ranked = sorted(
            zip(chunks_with_meta, scores),
            key=lambda x: x[1],
            reverse=True
        )
        
        return ranked[:topk]

    def search(self, query: str):
        """
        Search và trả về chunks KHÔNG TRÙNG LẶP:
        - Loại bỏ chunks giống nhau
        - Nếu chunk xuất hiện ở nhiều pages -> gộp metadata
        """
        with torch.no_grad():
            q_emb = embed_model.encode(
                [query],
                normalize_embeddings=True
            ).tolist()[0]

        all_chunks_with_meta = []  # [(chunk_data, page_metadata), ...]

        # ===== Thu thập TẤT CẢ chunks từ tất cả collections =====
        for col in self.collections:
            try:
                pages = CLIENT.search(
                    collection_name=col,
                    query_vector=q_emb,
                    query_filter=Filter(
                        must=[FieldCondition(key="type", match=MatchValue(value="page"))]
                    ),
                    limit=10,
                    with_payload=True
                )

                for p in pages:
                    page_metadata = {
                        "collection": col,
                        "page": p.payload["page"] + 1,
                        "page_id": p.payload["page"]
                    }
                    
                    chunks = p.payload.get("chunks", [])
                    
                    for chunk in chunks:
                        if chunk.get("text", "").strip():
                            all_chunks_with_meta.append((chunk, page_metadata))

            except Exception as e:
                print(f"Search error in {col}: {e}")

        if not all_chunks_with_meta:
            print("Không tìm thấy chunks nào")
            return []

        # ===== Gộp chunks trùng lặp =====
        print(f"Tổng chunks ban đầu: {len(all_chunks_with_meta)}")
        merged_chunks = self._merge_overlapping_chunks(all_chunks_with_meta)
        print(f"Sau khi gộp trùng lặp: {len(merged_chunks)}")

        # ===== Rerank chunks đã deduplicate =====
        ranked_chunks = self._rerank_chunks(
            query,
            merged_chunks,
            self.chunk_topk
        )

        # ===== Format output =====
        results = []
        for rank, ((chunk_data, page_metas), score) in enumerate(ranked_chunks, start=1):
            chunk_text = chunk_data.get("text", "").strip()
            entities = chunk_data.get("entities", [])
            highlighted = highlight_markdown(chunk_text, entities)
            
            # Tạo thông tin pages (có thể có nhiều pages)
            pages_info = []
            for page_meta in page_metas:
                pages_info.append({
                    "collection": page_meta["collection"],
                    "page": page_meta["page"],
                    "chunk_id": chunk_data.get("chunk_id", 0)
                })
            
            results.append({
                "rank": rank,
                "score": round(float(score), 4),
                "text": chunk_text,
                "highlighted_text": highlighted,
                "entities": entities,
                "pages": pages_info,  # Danh sách các pages chứa chunk này
                "is_merged": len(pages_info) > 1  # True nếu chunk xuất hiện ở nhiều pages
            })

        gc.collect()
        if device == "cuda":
            torch.cuda.empty_cache()

        return results

    def search_and_save(self, query: str, output_file: str = "search_results.json"):
        """
        Search và lưu kết quả ra file JSON
        """
        results = self.search(query)
        
        # Thống kê
        merged_count = sum(1 for r in results if r["is_merged"])
        
        output = {
            "query": query,
            "total_chunks": len(results),
            "merged_chunks": merged_count,
            "unique_chunks": len(results) - merged_count,
            "chunks": results
        }
        
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(output, f, ensure_ascii=False, indent=2)
        
        print(f"✅ Đã lưu {len(results)} chunks vào {output_file}")
        print(f"   - Chunks độc nhất: {len(results) - merged_count}")
        print(f"   - Chunks gộp từ nhiều pages: {merged_count}")
        
        return output