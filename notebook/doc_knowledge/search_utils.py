import torch
from collections import Counter
import gc
from vectordb_utils import get_collection
from config import embed_model, device
from entities import extract_entities, highlight_markdown

def find_related_pages(collection, target_page, top_k=2):
    target = collection.get(
        where={
            "$and": [{"type": "page"}, {"page": target_page}]
        },
        include=["embeddings"]
    )["embeddings"][0]

    pages = collection.get(where={"type": "page"}, include=["embeddings", "metadatas"])

    scores = []
    for emb, meta in zip(pages["embeddings"], pages["metadatas"]):
        pid = meta["page"]
        if pid == target_page:
            continue
        sim = float(torch.dot(torch.tensor(target), torch.tensor(emb)))
        scores.append((pid, sim))

    scores.sort(key=lambda x: x[1], reverse=True)
    return scores[:top_k]

def search(collection_name, query, chunk_topk=10, page_topk=3):
    col = get_collection(collection_name)

    with torch.no_grad():
        q_emb = embed_model.encode([query]).tolist()

    res = col.query(
        query_embeddings=q_emb,
        n_results=chunk_topk,
        where={"type": "chunk"},
        include=["metadatas"]
    )

    page_counter = Counter(m["page"] for m in res["metadatas"][0])
    top_pages = [pid for pid, _ in page_counter.most_common(page_topk)]

    outputs = []
    for pid in top_pages:
        page_text = col.get(
            where={"$and": [{"type": "page"}, {"page": pid}]},
            include=["documents"]
        )["documents"][0]

        ents = extract_entities(page_text)
        highlight = highlight_markdown(page_text, ents)

        related_pages = []
        for r_pid, score in find_related_pages(col, pid):
            r_text = col.get(
                where={"$and": [{"type": "page"}, {"page": r_pid}]},
                include=["documents"]
            )["documents"][0]
            r_ents = extract_entities(r_text)
            r_high = highlight_markdown(r_text, r_ents)
            related_pages.append({"page": r_pid + 1, "score": round(score, 4), "highlighted_text": r_high})

        outputs.append({"page": pid + 1, "highlighted_text": highlight, "related_pages": related_pages})

    gc.collect()
    if device == "cuda":
        torch.cuda.empty_cache()

    return outputs
