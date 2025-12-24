# doc_service.py
import os
from doc_knowledge.search_utils import DOCSearcher
from doc_knowledge.result_accessor import SearchResultAccessor
from doc_knowledge.config import VECTORDB

def query_document(
    file_path: str,
    query: str,
    chunk_topk: int = 10,
    page_topk: int = 3,
    related_topk: int = 2
) -> SearchResultAccessor:
    """
    One-shot Document QA function:
    - Load or upload document to Qdrant
    - Search by query
    - Return SearchResultAccessor for rank-based access
    """

    # 1. Tạo collection name
    file_name = os.path.basename(file_path)
    collection_name = f"doc_{file_name}"

    # 2. Load hoặc upload
    loaded = VECTORDB.load_collection(collection_name)
    if not loaded:
        collection_name = VECTORDB.upload_file(file_path)

    # 3. Search
    searcher = DOCSearcher(
        collection=collection_name,
        chunk_topk=chunk_topk,
        page_topk=page_topk,
        related_topk=related_topk
    )

    results = searcher.search(query)

    # 4. Wrap accessor
    return SearchResultAccessor(results)
