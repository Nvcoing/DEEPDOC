import re, gc, torch
from collections import Counter
from config import ner_multi, EMAIL_REGEX, PHONE_REGEX, device
from embedding import get_page_embedding
from config import embed_model

def get_page_text(collection, page_id):
    res = collection.get(
        where={"type": "page", "page": page_id},
        include=["documents"]
    )
    return res["documents"][0]

def extract_entities(text, max_len=1200):
    text = text[:max_len]
    ents = set()

    for e in ner_multi(text):
        ents.add(e["word"])

    ents.update(re.findall(EMAIL_REGEX, text))
    ents.update(re.findall(PHONE_REGEX, text))

    return sorted(ents, key=len, reverse=True)


def highlight(text, entities):
    for e in entities:
        text = re.sub(
            rf"(?<!\*)({re.escape(e)})(?!\*)",
            r"**\1**",
            text
        )
    return text


def find_related_pages(pid, pages, top_k=2):
    base = get_page_embedding(pid, pages)
    scores = []

    for i in range(len(pages)):
        if i == pid:
            continue
        emb = get_page_embedding(i, pages)
        sim = float(torch.dot(
            torch.tensor(base),
            torch.tensor(emb)
        ))
        scores.append((i, sim))

    scores.sort(key=lambda x: x[1], reverse=True)
    return scores[:top_k]


def search(collection, query, chunk_topk=10, page_topk=3):
    q_emb = embed_model.encode([query]).tolist()

    result = collection.query(
        query_embeddings=q_emb,
        n_results=chunk_topk,
        where={"type": "chunk"},
        include=["metadatas"]
    )

    counter = Counter(m["page"] for m in result["metadatas"][0])
    pages_top = [p for p, _ in counter.most_common(page_topk)]

    outputs = []

    for pid in pages_top:
        text = get_page_text(collection, pid)
        ents = extract_entities(text)

        outputs.append({
            "page": pid + 1,
            "highlighted_text": highlight(text, ents),
        })

    gc.collect()
    if device == "cuda":
        torch.cuda.empty_cache()

    return outputs

