import torch
import gc
from typing import List
from qdrant_client.models import Filter, FieldCondition, MatchValue
from doc_knowledge.entities import highlight_markdown
from doc_knowledge.config import embed_model, rank_model, device, CLIENT


class DOCSearcher:
    def __init__(self, collections: List[str], top_k=10):
        """
        Args:
            collections: Danh sách tên collections
            top_k: Số lượng chunks top trả về
        """
        self.collections = collections
        self.top_k = top_k

    def search(self, query: str):
        """
        Search và trả về top_k chunks có độ chính xác cao nhất
        """
        # Embed query
        with torch.no_grad():
            q_emb = embed_model.encode(
                [query],
                normalize_embeddings=True
            ).tolist()[0]

        all_chunks = []  # [(chunk_text, entities, page_info), ...]

        # Thu thập chunks từ tất cả collections
        for col in self.collections:
            try:
                # Search pages trong collection
                pages = CLIENT.search(
                    collection_name=col,
                    query_vector=q_emb,
                    query_filter=Filter(
                        must=[FieldCondition(key="type", match=MatchValue(value="page"))]
                    ),
                    limit=20,  # Lấy nhiều pages để có đủ chunks
                    with_payload=True
                )

                # Lấy chunks từ mỗi page
                for page_result in pages:
                    page_payload = page_result.payload
                    chunks = page_payload.get("chunks", [])
                    
                    for chunk in chunks:
                        chunk_text = chunk.get("text", "").strip()
                        if not chunk_text:
                            continue
                        
                        entities = chunk.get("entities", [])
                        pages_involved = chunk.get("pages", [page_payload["page"]])
                        
                        all_chunks.append({
                            "text": chunk_text,
                            "entities": entities,
                            "collection": col,
                            "pages": pages_involved,
                            "chunk_id": chunk.get("chunk_id", 0)
                        })

            except Exception as e:
                print(f"Search error in {col}: {e}")

        if not all_chunks:
            print("Không tìm thấy chunks nào")
            return []

        print(f"Tổng chunks thu thập: {len(all_chunks)}")

        # Rerank bằng CrossEncoder
        pairs = [(query, chunk["text"]) for chunk in all_chunks]
        scores = rank_model.predict(pairs, batch_size=32)
        
        # Gắn score vào chunks
        for chunk, score in zip(all_chunks, scores):
            chunk["score"] = float(score)
        
        # Sắp xếp theo score giảm dần
        all_chunks.sort(key=lambda x: x["score"], reverse=True)
        
        # Lấy top_k
        top_chunks = all_chunks[:self.top_k]

        # Format kết quả
        results = []
        for rank, chunk in enumerate(top_chunks, start=1):
            highlighted = highlight_markdown(chunk["text"], chunk["entities"])
            
            # Tạo thông tin pages
            pages_info = []
            for page_num in chunk["pages"]:
                pages_info.append({
                    "collection": chunk["collection"],
                    "page": page_num + 1,  # Convert to 1-indexed
                    "chunk_id": chunk["chunk_id"]
                })
            
            results.append({
                "rank": rank,
                "score": round(chunk["score"], 4),
                "text": chunk["text"],
                "highlighted_text": highlighted,
                "entities": chunk["entities"],
                "pages": pages_info,
                "is_merged": len(chunk["pages"]) > 1
            })

        # Cleanup
        gc.collect()
        if device == "cuda":
            torch.cuda.empty_cache()

        return results