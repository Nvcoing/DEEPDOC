import torch, gc, hashlib
from typing import List
from qdrant_client.models import Filter, FieldCondition, MatchValue
from doc_knowledge.entities import extract_entities, highlight_markdown
from doc_knowledge.config import embed_model, rank_model, device, CLIENT

def fingerprint(text: str) -> str:
    return hashlib.md5(text.strip().encode("utf-8")).hexdigest()

class DOCSearcher:
    def __init__(
        self,
        collections: List[str],
        top_chunk: int = 5,
        top_page: int = 5,
        page_score_threshold: float = 0.5,
        chunk_score_threshold: float = 0.7,
    ):
        self.collections = collections
        self.top_chunk = top_chunk
        self.top_page = top_page
        self.page_score_threshold = page_score_threshold
        self.chunk_score_threshold = chunk_score_threshold

    def search(self, query: str):
        # 0️⃣ Embed query
        with torch.no_grad():
            q_emb = embed_model.encode([query], normalize_embeddings=True).tolist()[0]

        # 1️⃣ Search page
        page_candidates = []
        for col in self.collections:
            res = CLIENT.search(
                collection_name=col,
                query_vector=q_emb,
                query_filter=Filter(
                    must=[FieldCondition(key="type", match=MatchValue(value="page"))]
                ),
                limit=self.top_page * 3,
                with_payload=True
            )
            for p in res:
                page_candidates.append((col, p))

        if not page_candidates:
            return [{"no_result": True}]

        # 2️⃣ Dedup page
        seen = set()
        unique_pages = []
        for col, p in page_candidates:
            pid = p.payload.get("page")
            key = f"{col}:{pid}"
            if key in seen:
                continue
            seen.add(key)
            unique_pages.append((col, p))

        # 3️⃣ Rerank page
        page_texts = [p.payload.get("text", "") for _, p in unique_pages]
        page_pairs = [(query, t) for t in page_texts]
        page_scores = rank_model.predict(page_pairs, batch_size=4)

        ranked_pages = sorted(
            zip(unique_pages, page_scores),
            key=lambda x: x[1],
            reverse=True
        )

        ranked_pages = [
            (col, p, s)
            for (col, p), s in ranked_pages
            if float(s) >= self.page_score_threshold
        ][:self.top_page]

        if not ranked_pages:
            return [{"no_result": True}]

        # 4️⃣ Rerank chunk trong page
        flat_chunks = []

        for col, page_point, page_score in ranked_pages:
            pid = page_point.payload["page"]
            chunks = page_point.payload.get("chunks", [])

            seen_chunk = set()
            chunk_texts = []

            for c in chunks:
                text = c.get("text", "").strip()
                if not text:
                    continue
                fp = fingerprint(text)
                if fp in seen_chunk:
                    continue
                seen_chunk.add(fp)
                chunk_texts.append(text)

            if not chunk_texts:
                continue

            chunk_pairs = [(query, t) for t in chunk_texts]
            chunk_scores = rank_model.predict(chunk_pairs, batch_size=4)

            ranked_chunks = sorted(
                zip(chunk_texts, chunk_scores),
                key=lambda x: x[1],
                reverse=True
            )

            # Add to flat_chunks (không break, flatten tất cả)
            for t, s in ranked_chunks:
                if float(s) >= self.chunk_score_threshold:
                    flat_chunks.append({
                        "rank": len(flat_chunks) + 1,
                        "score": round(float(s), 4),
                        "text": t,
                        "highlighted_text": highlight_markdown(t, extract_entities(t)),
                        "entities": extract_entities(t),
                        "pages": [{"collection": col, "page": pid + 1}],
                        "is_merged": False
                    })

        # 5️⃣ Giữ đúng top_chunk
        flat_chunks = flat_chunks[:self.top_chunk]

        # 6️⃣ DEBUG: In ra chunk khi search
        print("\n========== DEBUG SEARCH CHUNKS ==========")
        for c in flat_chunks:
            print(f"[CHUNK {c['rank']}] Score: {c['score']}")
            print(c["highlighted_text"][:300])
        print("=========================================\n")

        # 7️⃣ Clear memory
        gc.collect()
        if device == "cuda":
            torch.cuda.empty_cache()

        return flat_chunks if flat_chunks else [{"no_result": True}]
