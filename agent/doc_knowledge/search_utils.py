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
        top_chunk: int = 3,
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
        # ======================================================
        # 0️⃣ EMBED QUERY
        # ======================================================
        with torch.no_grad():
            q_emb = embed_model.encode(
                [query], normalize_embeddings=True
            ).tolist()[0]

        # ======================================================
        # 1️⃣ SEARCH PAGE (ALL COLLECTIONS)
        # ======================================================
        page_candidates = []

        for col in self.collections:
            res = CLIENT.search(
                collection_name=col,
                query_vector=q_emb,
                query_filter=Filter(
                    must=[FieldCondition(key="type", match=MatchValue(value="page"))]
                ),
                limit=self.top_page * 3,  # recall rộng
                with_payload=True
            )
            for p in res:
                page_candidates.append((col, p))

        if not page_candidates:
            return []

        # ======================================================
        # 2️⃣ DEDUP PAGE (collection + page_id)
        # ======================================================
        seen_pages = set()
        unique_pages = []

        for col, p in page_candidates:
            pid = p.payload.get("page")
            if pid is None:
                continue
            key = f"{col}:{pid}"
            if key in seen_pages:
                continue
            seen_pages.add(key)
            unique_pages.append((col, p))

        if not unique_pages:
            return []

        # ======================================================
        # 3️⃣ RERANK PAGE + PAGE THRESHOLD
        # ======================================================
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
            return []

        # ======================================================
        # 4️⃣ RERANK CHUNK TRONG PAGE + CHUNK THRESHOLD
        # ======================================================
        outputs = []

        for rank, (col, page_point, page_score) in enumerate(
            ranked_pages, start=1
        ):
            pid = page_point.payload["page"]
            page_text = page_point.payload.get("text", "")
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

            ranked_chunks = []

            if chunk_texts:
                chunk_pairs = [(query, t) for t in chunk_texts]
                chunk_scores = rank_model.predict(chunk_pairs, batch_size=4)

                ranked_chunks = [
                    (t, s)
                    for t, s in sorted(
                        zip(chunk_texts, chunk_scores),
                        key=lambda x: x[1],
                        reverse=True
                    )
                    if float(s) >= self.chunk_score_threshold
                ][:self.top_chunk]

            outputs.append({
                "rank": rank,
                "collection": col,
                "page": pid + 1,
                "page_score": round(float(page_score), 4),
                "page_text": highlight_markdown(
                    page_text,
                    extract_entities(page_text)
                ),
                "chunks": [
                    {
                        "rank": i + 1,
                        "score": round(float(s), 4),
                        "text": t,
                        "highlighted_text": highlight_markdown(
                            t, extract_entities(t)
                        )
                    }
                    for i, (t, s) in enumerate(ranked_chunks)
                ]
            })

        gc.collect()
        if device == "cuda":
            torch.cuda.empty_cache()

        return outputs
