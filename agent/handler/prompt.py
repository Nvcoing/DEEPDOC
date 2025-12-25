from handler.retrieval import query_document
from doc_knowledge.config import COLLECTIONS
from typing import List

def answer(query: str, file_names: List[str]) -> str:
    file_paths = [COLLECTIONS + name for name in file_names]

    acc = query_document(
        file_paths=file_paths,
        query=query,
        chunk_topk=10,
        page_topk=3,
        related_topk=2
    )

    page_summaries = run_parallel_pages(query, acc)

    final_prompt = f"""
        You are an expert summarizer and information extractor.

        QUESTION:
        {query}

        PARTIAL SUMMARIES:
        - Page 1 summary:
        {page_summaries[0]}

        - Page 2 summary:
        {page_summaries[1]}

        - Page 3 summary:
        {page_summaries[2]}

        INSTRUCTIONS:
        - Detect language automatically and respond in the SAME language
        - Merge information logically
        - Preserve all factual details
        - Highlight important facts using **bold**
        - Clearly note conflicts if any

        OUTPUT:
        Structured final answer to the QUESTION.
    """
    print(final_prompt)
    return final_prompt

def summary(
    query: str,
    main_page_text: str,
    related_pages: List[str]
) -> str:
    return f"""
    You are an expert summarizer.

    TASK:
    Summarize information relevant to the QUESTION using ONE main page and its related pages.

    QUESTION:
    {query}

    MAIN PAGE:
    {main_page_text}

    RELATED PAGES:
    - {related_pages[0]}
    - {related_pages[1]}

    INSTRUCTIONS:
    - Automatically detect the language and respond in the SAME language
    - Preserve all names, numbers, dates, locations, contacts
    - Highlight important facts using **bold**
    - Do NOT hallucinate or add new information

    OUTPUT:
    Concise factual summary focused on answering the QUESTION.
"""


