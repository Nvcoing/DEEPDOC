import torch
from collections import Counter
import gc
from config import embed_model, device, CLIENT
from entities import extract_entities, highlight_markdown
from qdrant_client.models import Filter, FieldCondition, MatchValue

def find_related_pages(collection_name, target_page, top_k=2):
    # Tìm embedding của target page
    target_result = CLIENT.scroll(
        collection_name=collection_name,
        scroll_filter=Filter(
            must=[
                FieldCondition(key="type", match=MatchValue(value="page")),
                FieldCondition(key="page", match=MatchValue(value=target_page))
            ]
        ),
        with_vectors=True
    )
    
    if not target_result[0]:
        return []
    
    target_vector = target_result[0][0].vector
    
    # Tìm tất cả các page khác
    all_pages = CLIENT.scroll(
        collection_name=collection_name,
        scroll_filter=Filter(
            must=[FieldCondition(key="type", match=MatchValue(value="page"))]
        ),
        with_vectors=True,
        with_payload=True
    )
    
    scores = []
    for point in all_pages[0]:
        pid = point.payload.get("page")
        if pid == target_page:
            continue
        
        # Tính cosine similarity
        sim = float(torch.dot(torch.tensor(target_vector), torch.tensor(point.vector)))
        scores.append((pid, sim))
    
    scores.sort(key=lambda x: x[1], reverse=True)
    return scores[:top_k]

def search(collection_name, query, chunk_topk=10, page_topk=3):
    with torch.no_grad():
        q_emb = embed_model.encode([query]).tolist()[0]
    
    # Tìm kiếm chunks với filter đúng syntax
    chunk_results = CLIENT.search(
        collection_name=collection_name,
        query_vector=q_emb,
        query_filter=Filter(
            must=[FieldCondition(key="type", match=MatchValue(value="chunk"))]
        ),
        limit=chunk_topk,
        with_payload=True
    )
    
    # Đếm số lần xuất hiện của mỗi page
    page_counter = Counter(point.payload.get("page") for point in chunk_results)
    top_pages = [pid for pid, _ in page_counter.most_common(page_topk)]
    
    outputs = []
    for pid in top_pages:
        # Lấy nội dung page
        page_results = CLIENT.scroll(
            collection_name=collection_name,
            scroll_filter=Filter(
                must=[
                    FieldCondition(key="type", match=MatchValue(value="page")),
                    FieldCondition(key="page", match=MatchValue(value=pid))
                ]
            ),
            with_payload=True
        )
        
        if not page_results[0]:
            continue
            
        page_text = page_results[0][0].payload.get("text", "")
        
        # Trích xuất và highlight entities
        ents = extract_entities(page_text)
        highlight = highlight_markdown(page_text, ents)
        
        # Tìm các page liên quan
        related_pages = []
        for r_pid, score in find_related_pages(collection_name, pid):
            r_page_results = CLIENT.scroll(
                collection_name=collection_name,
                scroll_filter=Filter(
                    must=[
                        FieldCondition(key="type", match=MatchValue(value="page")),
                        FieldCondition(key="page", match=MatchValue(value=r_pid))
                    ]
                ),
                with_payload=True
            )
            
            if r_page_results[0]:
                r_text = r_page_results[0][0].payload.get("text", "")
                r_ents = extract_entities(r_text)
                r_high = highlight_markdown(r_text, r_ents)
                related_pages.append({"page": r_pid + 1, "score": round(score, 4), "highlighted_text": r_high})
        
        outputs.append({"page": pid + 1, "highlighted_text": highlight, "related_pages": related_pages})
    
    # Clean up
    gc.collect()
    if device == "cuda":
        torch.cuda.empty_cache()
    
    return outputs