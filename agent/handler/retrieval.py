import os
from typing import List
from doc_knowledge.search_utils import DOCSearcher
from doc_knowledge.result_accessor import SearchResultAccessor
from doc_knowledge.vectordb_utils import QdrantFileUploader


def query_document(
    file_paths: List[str],
    query: str,
    page_topk: int = 5,
    chunk_topk: int = 3,
) -> SearchResultAccessor:

    collections = []

    # ===== 1. Load hoặc upload tất cả file =====
    for file_path in file_paths:
        file_name = os.path.basename(file_path)
        collection_name = f"doc_{file_name}"

        loaded = QdrantFileUploader().load_collection(collection_name)
        if not loaded:
            collection_name = QdrantFileUploader().upload_file(file_path)

        collections.append(collection_name)

    # ===== 2. Search multi-collection =====
    searcher = DOCSearcher(
        collections=collections,
        page_topk=page_topk,
        chunk_topk=chunk_topk,
    )

    results = searcher.search(query)
    print(results)

    # ===== 3. Wrap accessor =====
    return SearchResultAccessor(results)
