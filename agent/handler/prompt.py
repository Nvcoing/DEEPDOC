from handler.retrieval import query_document
from doc_knowledge.config import COLLECTIONS
from llm.generate import generate_text
import threading
from typing import List

def answer(question: str, file_names: List[str]) -> str:
    file_paths = [COLLECTIONS + name for name in file_names]

    acc = query_document(
        file_paths=file_paths,
        query=question,
        chunk_topk=10,
        page_topk=3,
        related_topk=2
    )

    page_summaries = run_parallel_pages(question, acc)

    final_prompt = f"""
        You are an expert summarizer and information extractor.

        QUESTION:
        {question}

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
def run_parallel_pages(
    query: str,
    acc,
    page_indices: List[int] = [1, 2, 3]
) -> List[str]:
    """
    Run LLM summarization for each main page in parallel.
    Each page includes 1 main page + 2 related pages.
    """

    results = [None] * len(page_indices)

    def worker(idx: int, page_idx: int):
        main_page_text = acc.get_page_field(page_idx, "highlighted_text")

        related_pages = [
            acc.get_related_field(page_idx, 1, "highlighted_text"),
            acc.get_related_field(page_idx, 2, "highlighted_text"),
        ]

        prompt = summary(
            query=query,
            main_page_text=main_page_text,
            related_pages=related_pages
        )

        results[idx] = generate_text(prompt)

    threads = []

    for i, page_idx in enumerate(page_indices):
        t = threading.Thread(target=worker, args=(i, page_idx))
        t.start()
        threads.append(t)
    for t in threads:
        t.join()

    return results

