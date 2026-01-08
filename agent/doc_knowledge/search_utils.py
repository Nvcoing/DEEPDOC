import torch
import gc
import json
from typing import List
from qdrant_client.models import Filter, FieldCondition, MatchValue

from doc_knowledge.entities import highlight_markdown
from doc_knowledge.config import embed_model, rank_model, device, CLIENT


class DOCSearcher:
    def __init__(self, collections: List[str], chunk_topk=10, similarity_threshold: float = 0.7):
        self.collections = collections
        self.chunk_topk = chunk_topk

        self.page_limit = 10
        self.pre_topk = 30
        self.chunk_sim_thres = similarity_threshold
        self.dedup_thres = 0.92

    def search(self, query: str):
        with torch.no_grad():
            q_emb = embed_model.encode(
                [query],
                normalize_embeddings=True
            )[0]

        chunks = []

        # ===== PAGE SEARCH =====
        for col in self.collections:
            pages = CLIENT.search(
                collection_name=col,
                query_vector=q_emb.tolist(),
                query_filter=Filter(
                    must=[FieldCondition(key="type", match=MatchValue(value="page"))]
                ),
                limit=self.page_limit,
                with_payload=True
            )

            for p in pages:
                meta = {
                    "collection": col,
                    "page": p.payload["page"] + 1,
                    "page_id": p.payload["page"]
                }

                for c in p.payload.get("chunks", []):
                    if not c.get("text") or "embedding" not in c:
                        continue

                    sim = embed_model.similarity(q_emb, c["embedding"])
                    if sim >= self.chunk_sim_thres:
                        chunks.append((c, meta, sim))

        if not chunks:
            return []

        # ===== FAST RANK BY EMBEDDING =====
        chunks = sorted(chunks, key=lambda x: x[2], reverse=True)[:self.pre_topk]

        # ===== DEDUP BY EMBEDDING =====
        merged = []
        seen_embs = []

        for c, meta, _ in chunks:
            idx = None
            for i, e in enumerate(seen_embs):
                if embed_model.similarity(e, c["embedding"]) >= self.dedup_thres:
                    idx = i
                    break

            if idx is None:
                merged.append((c, [meta]))
                seen_embs.append(c["embedding"])
            else:
                pages = merged[idx][1]
                if (meta["collection"], meta["page"]) not in [
                    (p["collection"], p["page"]) for p in pages
                ]:
                    pages.append(meta)

        # ===== RERANK (CROSS ENCODER) =====
        pairs = [(query, m[0]["text"]) for m in merged]
        scores = rank_model.predict(pairs, batch_size=30)

        ranked = sorted(
            zip(merged, scores),
            key=lambda x: x[1],
            reverse=True
        )[:self.chunk_topk]

        # ===== FORMAT OUTPUT =====
        results = []
        for i, ((chunk, pages), score) in enumerate(ranked, 1):
            results.append({
                "rank": i,
                "score": round(float(score), 4),
                "text": chunk["text"],
                "highlighted_text": highlight_markdown(
                    chunk["text"], chunk.get("entities", [])
                ),
                "entities": chunk.get("entities", []),
                "pages": [
                    {
                        "collection": p["collection"],
                        "page": p["page"],
                        "chunk_id": chunk.get("chunk_id", 0)
                    } for p in pages
                ],
                "is_merged": len(pages) > 1
            })

        gc.collect()
        if device == "cuda":
            torch.cuda.empty_cache()

        return results