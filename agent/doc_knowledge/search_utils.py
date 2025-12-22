import torch, gc
from collections import defaultdict
from qdrant_client.models import Filter, FieldCondition, MatchValue
from entities import extract_entities, highlight_markdown
from config import embed_model, rank_model, device, CLIENT


class DOCSearcher:
    def __init__(self, collection, chunk_topk=10, page_topk=3, related_topk=2):
        self.collection = collection
        self.chunk_topk = chunk_topk
        self.page_topk = page_topk
        self.related_topk = related_topk

    # ---------- COMMON UTILS ----------
    def _scroll_page(self, pid):
        res = CLIENT.scroll(
            collection_name=self.collection,
            scroll_filter=Filter(must=[
                FieldCondition(key="type", match=MatchValue(value="page")),
                FieldCondition(key="page", match=MatchValue(value=pid))
            ]),
            with_payload=True
        )
        return res[0][0].payload.get("text", "") if res[0] else ""

    def _rerank(self, query, items: dict, topk: int):
        if not items:
            return []
        pairs = [(query, t) for t in items.values()]
        scores = rank_model.predict(pairs, batch_size=4)
        ranked = sorted(zip(items.keys(), scores), key=lambda x: x[1], reverse=True)
        return ranked[:topk]

    # ---------- MAIN SEARCH ----------
    def search(self, query: str):
        with torch.no_grad():
            q_emb = embed_model.encode([query]).tolist()[0]

        # 1. SEARCH CHUNK
        chunks = CLIENT.search(
            collection_name=self.collection,
            query_vector=q_emb,
            query_filter=Filter(
                must=[FieldCondition(key="type", match=MatchValue(value="chunk"))]
            ),
            limit=self.chunk_topk,
            with_payload=True
        )

        # 2. GROUP → PAGE
        page_ids = {p.payload["page"] for p in chunks if p.payload.get("text")}
        page_texts = {pid: self._scroll_page(pid) for pid in page_ids}

        # 3. RERANK PAGE
        ranked_pages = self._rerank(query, page_texts, self.page_topk)

        outputs = []

        for pid, page_score in ranked_pages:
            text = page_texts[pid]
            highlight = highlight_markdown(text, extract_entities(text))

            # 4. RELATED PAGE (RECALL)
            candidates = CLIENT.search(
                collection_name=self.collection,
                query_vector=q_emb,
                query_filter=Filter(
                    must=[FieldCondition(key="type", match=MatchValue(value="page"))]
                ),
                limit=10,
                with_payload=True
            )

            related = {
                p.payload["page"]: p.payload.get("text", "")
                for p in candidates
                if p.payload["page"] != pid
            }

            ranked_related = self._rerank(query, related, self.related_topk)

            outputs.append({
                "page": pid + 1,
                "score": round(float(page_score), 4),
                "highlighted_text": highlight,
                "related_pages": [
                    {
                        "page": r_pid + 1,
                        "score": round(float(r_score), 4),
                        "highlighted_text": highlight_markdown(
                            related[r_pid],
                            extract_entities(related[r_pid])
                        )
                    }
                    for r_pid, r_score in ranked_related
                ]
            })

        gc.collect()
        if device == "cuda":
            torch.cuda.empty_cache()

        return outputs
