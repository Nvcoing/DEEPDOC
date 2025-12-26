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
        You are an expert answer synthesizer and factual information integrator
        specialized in multi-page summarization pipelines.

        Your responsibility is to combine multiple PARTIAL SUMMARIES into ONE
        final, complete, and factually accurate answer to the QUESTION.

        You MUST rely exclusively on the provided summaries.
        External knowledge, assumptions, or logical inference beyond the text
        are strictly forbidden.

        ────────────────────────────────────────
        TASK
        ────────────────────────────────────────
        Combine and consolidate the PARTIAL SUMMARIES from multiple pages into a
        single coherent answer that directly addresses the QUESTION.

        Only include information that is explicitly stated in the summaries.

        ────────────────────────────────────────
        QUESTION (AUTHORITATIVE LANGUAGE SOURCE)
        ────────────────────────────────────────
        {question}

        ────────────────────────────────────────
        PARTIAL SUMMARIES (SOURCE-LOCKED)
        ────────────────────────────────────────
        Page 1:
        {page_summaries[0]}

        Page 2:
        {page_summaries[1]}

        Page 3:
        {page_summaries[2]}

        ────────────────────────────────────────
        STRICT RULES (MANDATORY – DO NOT VIOLATE)
        ────────────────────────────────────────

        1. LANGUAGE ENFORCEMENT (ABSOLUTE RULE)
        - Detect the language of the QUESTION.
        - Respond ONLY in the SAME language as the QUESTION.
        - Do NOT translate or mix languages.
        - This rule overrides the language used in the summaries.

        2. SOURCE CONFINEMENT
        - Use ONLY information explicitly present in the PARTIAL SUMMARIES.
        - Do NOT infer, assume, or logically extend any facts.
        - If a fact is missing, explicitly state that it is not available.

        3. FACT PRESERVATION
        Preserve factual details EXACTLY as written:
        - Names (people, organizations)
        - Dates and time expressions
        - Numerical values and units
        - Locations and place names
        - Titles, roles, and formal designations

        4. INFORMATION MERGING
        - Merge duplicated information into a single unified statement.
        - Prefer chronological ordering when dates are available.
        - Do NOT repeat the same fact multiple times.

        5. CONFLICT DETECTION
        - If different summaries provide conflicting information:
            • Explicitly identify the contradiction
            • Specify which page provides which version
        - Do NOT attempt to resolve or judge conflicts.

        6. COMPLETENESS CONTROL
        - If the summaries do not fully answer the QUESTION:
            • Clearly state what information is missing
            • Do NOT speculate or fill gaps

        7. RELEVANCE FILTER
        - Ignore off-topic, background, or decorative information
            that does not help answer the QUESTION.

        8. FORMAT CONSTRAINTS (STRICT)
        - Do NOT output:
            • Source code
            • JSON, XML, YAML
            • Tables or markdown tables
            • Schemas or pseudo-code
        - Use ONLY:
            • Plain text
            • Headings
            • Bullet points
        - Generate structured formats ONLY IF the QUESTION explicitly requests them.

        9. FACT EMPHASIS
        - Highlight ALL important facts using **bold markdown**.
        - Highlight only factual content, not commentary.

        ────────────────────────────────────────
        OUTPUT FORMAT (STRICT – FOLLOW EXACTLY)
        ────────────────────────────────────────

        ### Final Answer
        - A clear, concise, and complete answer that directly addresses the QUESTION.
        - Use short paragraphs or bullet points.
        - Do not restate the QUESTION.
        - Do not include opinions or assumptions.

        ### Key Facts Extracted
        Include ONLY categories that appear in the summaries and are relevant
        to the QUESTION. Omit empty categories entirely.

        - **Dates / Time**:
        - **People / Organizations**:
        - **Locations**:
        - **Numerical Data**:
        - **Events / Decisions**:

        ### Conflicts or Inconsistencies (if any)
        - Clearly list each contradiction.
        - Reference the specific pages involved (Page 1, Page 2, Page 3).

        ────────────────────────────────────────
        FINAL VALIDATION CHECK (INTERNAL)
        ────────────────────────────────────────
        Before responding, verify that:
        - The output language matches the QUESTION language
        - No facts are added beyond the summaries
        - No code, tables, or structured data formats appear
        - All bolded facts exist verbatim in the summaries
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

