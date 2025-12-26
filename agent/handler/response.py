from handler.retrieval import query_document
from doc_knowledge.config import COLLECTIONS
from llm.generate import generate_text
from handler.summary import summary
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
        You are an expert answer synthesizer and factual information integrator.

        TASK:
        Combine the PARTIAL SUMMARIES from multiple pages into ONE final, complete, and accurate answer to the QUESTION.
        Only use information explicitly stated in the summaries.

        QUESTION:
        {question}

        PARTIAL SUMMARIES:
        - Page 1:
        {page_summaries[0]}

        - Page 2:
        {page_summaries[1]}

        - Page 3:
        {page_summaries[2]}

        INSTRUCTIONS:
        1. Automatically detect the language of the summaries and respond in the SAME language.
        2. Merge information logically and chronologically when possible.
        3. Do NOT hallucinate, infer, or add any new information.
        4. Preserve all factual details exactly as written:
        - Names
        - Dates
        - Numbers
        - Locations
        - Organizations
        5. Highlight all important facts using **bold markdown**.
        6. If information is repeated across pages, consolidate it once.
        7. If information is incomplete, clearly state what is missing.
        8. If there are conflicts or contradictions between pages:
        - Explicitly point them out
        - Clearly indicate which pages provide which differing facts
        9. Ignore irrelevant or off-topic content.

        OUTPUT FORMAT:

        ### Final Answer
        - Clear, concise, and complete answer directly addressing the QUESTION.
        - Use short paragraphs or bullet points for clarity.

        ### Key Facts Extracted
        - **Dates / Time**:
        - **People / Organizations**:
        - **Locations**:
        - **Numerical Data**:
        - **Events / Decisions**:

        ### Conflicts or Inconsistencies (if any)
        - Clearly list contradictions with page references.
    """
    print(final_prompt)
    return final_prompt

def run_parallel_pages(
    query: str,
    acc,
    page_indices: List[int] = [1, 2, 3]
) -> List[str]:
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

