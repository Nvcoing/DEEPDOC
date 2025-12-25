import threading
from typing import List
from llm.generate import generate
from handler.prompt import answer


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

        prompt = answer(
            query=query,
            main_page_text=main_page_text,
            related_pages=related_pages
        )

        results[idx] = generate(prompt, stream=False)

    threads = []

    for i, page_idx in enumerate(page_indices):
        t = threading.Thread(target=worker, args=(i, page_idx))
        t.start()
        threads.append(t)
    for t in threads:
        t.join()

    return results
