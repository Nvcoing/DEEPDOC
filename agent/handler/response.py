# from handler.retrieval import query_document
# from doc_knowledge.config import COLLECTIONS
# from llm.generate import generate_text
# from handler.summary import summary
# import threading
# from typing import List

# def answer(question: str, file_names: List[str]) -> str:
#     file_paths = [COLLECTIONS + name for name in file_names]

#     acc = query_document(
#         file_paths=file_paths,
#         query=question,
#         chunk_topk=10,
#         page_topk=3,
#         related_topk=2
#     )

#     page_summaries = run_parallel_pages(question, acc)

#     final_prompt = f"""
#         You are an expert answer synthesizer and factual information integrator specialized in multi-page summarization pipelines. Your responsibility is to combine multiple PARTIAL SUMMARIES into ONE final, complete, and factually accurate answer to the QUESTION. You MUST rely exclusively on the provided summaries; external knowledge, assumptions, inference, or logical extension beyond the text are strictly forbidden. TASK: Combine and consolidate the PARTIAL SUMMARIES from multiple pages into a single coherent answer that directly addresses the QUESTION, including ONLY information explicitly stated in the summaries. QUESTION (authoritative language source): {question}. PARTIAL SUMMARIES (source-locked): Page 1: {page_summaries[0]}. Page 2: {page_summaries[1]}. Page 3: {page_summaries[2]}. STRICT RULES: (1) Language enforcement: detect the language of the QUESTION and respond ONLY in the same language; do not translate or mix languages; this overrides the summaries’ language. (2) Source confinement: use ONLY information explicitly present in the PARTIAL SUMMARIES; do not infer, assume, or extend facts; if information is missing, explicitly state it is not available. (3) Fact preservation: preserve factual details EXACTLY as written for names (people, organizations), dates and time expressions, numerical values and units, locations/place names, titles, roles, and formal designations. (4) Information merging: merge duplicated facts into a single unified statement; prefer chronological ordering when dates exist; do NOT repeat the same fact. (5) Conflict detection: if summaries conflict, explicitly identify the contradiction and specify which page provides which version; do NOT resolve or judge conflicts. (6) Completeness control: if summaries do not fully answer the QUESTION, clearly state what information is missing; do NOT speculate. (7) Relevance filter: ignore off-topic, background, or decorative content not needed to answer the QUESTION. (8) Format constraints: do NOT output source code, JSON, XML, YAML, tables, schemas, or pseudo-code; use plain text only with headings and bullet points; generate structured formats ONLY if the QUESTION explicitly requests them. (9) Fact emphasis: highlight ALL important facts using **bold markdown** and highlight factual content only. OUTPUT FORMAT (MANDATORY): Final Answer – a clear, concise, complete answer addressing the QUESTION using short paragraphs or bullet points, without restating the question or adding opinions. Key Facts Extracted – include ONLY relevant categories appearing in the summaries and omit empty ones: Dates / Time; People / Organizations; Locations; Numerical Data; Events / Decisions. Conflicts or Inconsistencies (if any) – list each contradiction and reference the specific pages involved (Page 1, Page 2, Page 3). FINAL VALIDATION: ensure output language matches the QUESTION, no facts beyond the summaries are added, no code/tables/structured data appear, and all bolded facts exist verbatim in the summaries.
#     """
#     print(final_prompt)
#     return final_prompt

# def run_parallel_pages(
#     query: str,
#     acc,
#     page_indices: List[int] = [1, 2, 3]
# ) -> List[str]:
#     results = [None] * len(page_indices)

#     def worker(idx: int, page_idx: int):
#         main_page_text = acc.get_page_field(page_idx, "highlighted_text")

#         related_pages = [
#             acc.get_related_field(page_idx, 1, "highlighted_text"),
#             acc.get_related_field(page_idx, 2, "highlighted_text"),
#         ]

#         prompt = summary(
#             query=query,
#             main_page_text=main_page_text,
#             related_pages=related_pages
#         )

#         results[idx] = generate_text(prompt)

#     threads = []

#     for i, page_idx in enumerate(page_indices):
#         t = threading.Thread(target=worker, args=(i, page_idx))
#         t.start()
#         threads.append(t)
#     for t in threads:
#         t.join()

#     return results

from handler.retrieval import query_document
from doc_knowledge.config import COLLECTIONS
from llm.generate import generate_text
from typing import List

def answer(question: str, file_names: List[str]) -> str:
    file_paths = [COLLECTIONS + name for name in file_names]

    acc = query_document(
        file_paths=file_paths,
        query=question,
        chunk_topk=10,
        similarity_threshold=0.7
    )

    final_prompt = f"""
    <|begin_of_text|><|start_header_id|>user<|end_header_id|>
    You are a professional document reading assistant.

    TASK:
    Carefully read the uploaded document text and answer the question with detailed, complete, and accurate information.

    INSTRUCTIONS:
    - Answer in the SAME language as the question
    - Use information from the uploaded document as the PRIMARY source
    - Extract all relevant details (facts, definitions, numbers, conditions, steps, examples if present)
    - If needed, add minimal general knowledge only to clarify, not to override the document
    - Be clear, direct, and well-structured
    - Do NOT mention the document or your reasoning process

    UPLOADED_DOCUMENT:
    <<<BEGIN_DOCUMENT>>>
    {acc.get_chunk_highlighted(1, "highlighted_text")}

    {acc.get_chunk_highlighted(2, "highlighted_text")}

    {acc.get_chunk_highlighted(3, "highlighted_text")}

    {acc.get_chunk_highlighted(4, "highlighted_text")}

    {acc.get_chunk_highlighted(5, "highlighted_text")}
    <<<END_DOCUMENT>>>

    QUESTION:
    <<<BEGIN_QUESTION>>>
    {question}
    <<<END_QUESTION>>>
    <|eot_id|><|start_header_id|>assistant<|end_header_id|>
    """
    print(repr(final_prompt))
    return repr(final_prompt)
