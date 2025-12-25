import torch, gc
from typing import List
from qdrant_client.models import Filter, FieldCondition, MatchValue
from doc_knowledge.entities import extract_entities, highlight_markdown
from doc_knowledge.config import embed_model, rank_model, device, CLIENT

class DOCSearcher:
    def __init__(
        self,
        collections: List[str],
        chunk_topk=10,
        page_topk=3,
        related_topk=2
    ):
        self.collections = collections
        self.chunk_topk = chunk_topk
        self.page_topk = page_topk
        self.related_topk = related_topk

    def _scroll_page(self, collection, pid):
        res = CLIENT.scroll(
            collection_name=collection,
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
        ranked = sorted(
            zip(items.keys(), scores),
            key=lambda x: x[1],
            reverse=True
        )
        return ranked[:topk]

    def search(self, query: str):
        # ===== 1. Embed query 1 lần =====
        with torch.no_grad():
            q_emb = embed_model.encode(
                [query],
                normalize_embeddings=True
            ).tolist()[0]

        global_pages = {}   # (collection, page_id) -> text

        # ===== 2. Search CHUNK trên từng collection =====
        for col in self.collections:
            try:
                chunks = CLIENT.search(
                    collection_name=col,
                    query_vector=q_emb,
                    query_filter=Filter(
                        must=[FieldCondition(key="type", match=MatchValue(value="chunk"))]
                    ),
                    limit=self.chunk_topk,
                    with_payload=True
                )

                page_ids = {
                    p.payload["page"]
                    for p in chunks
                    if p.payload.get("text")
                }

                for pid in page_ids:
                    text = self._scroll_page(col, pid)
                    if text:
                        global_pages[(col, pid)] = text

            except Exception as e:
                print(f"Search error in {col}: {e}")

        # ===== 3. Rerank PAGE TOÀN CỤC =====
        ranked_pages = self._rerank(query, global_pages, self.page_topk)

        outputs = []

        for rank, ((col, pid), score) in enumerate(ranked_pages, start=1):
            text = global_pages[(col, pid)]
            highlight = highlight_markdown(text, extract_entities(text))

            # ===== related pages cùng collection =====
            candidates = CLIENT.search(
                collection_name=col,
                query_vector=q_emb,
                query_filter=Filter(
                    must=[FieldCondition(key="type", match=MatchValue(value="page"))]
                ),
                limit=10,
                with_payload=True
            )

            related = {
                (col, p.payload["page"]): p.payload.get("text", "")
                for p in candidates
                if p.payload["page"] != pid
            }

            ranked_related = self._rerank(query, related, self.related_topk)

            outputs.append({
                "rank": rank,
                "collection": col,
                "page": pid + 1,
                "score": round(float(score), 4),
                "highlighted_text": highlight,
                "related_pages": [
                    {
                        "rank": r_rank,
                        "collection": r_col,
                        "page": r_pid + 1,
                        "score": round(float(r_score), 4),
                        "highlighted_text": highlight_markdown(
                            related[(r_col, r_pid)],
                            extract_entities(related[(r_col, r_pid)])
                        )
                    }
                    for r_rank, ((r_col, r_pid), r_score)
                    in enumerate(ranked_related, start=1)
                ]
            })

        gc.collect()
        if device == "cuda":
            torch.cuda.empty_cache()

        return outputs
