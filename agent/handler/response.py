from handler.retrieval import query_document
from doc_knowledge.config import COLLECTIONS
from handler.router import QueryRouter
from typing import List

router = QueryRouter("routes.json")


def answer(question: str, file_names: List[str]) -> str:
    route_result = router.route(question)

    # ===== CASE 1: OUT OF SCOPE =====
    if route_result["route"] == "out_of_scope":
        final_prompt = f"""
    <|begin_of_text|><|start_header_id|>user<|end_header_id|>
    You are a professional document reading assistant.

    TASK:
    Carefully read the uploaded document text and answer the question.

    UPLOADED_DOCUMENT:
    <<<BEGIN_DOCUMENT>>>
    Khong co thong tin
    <<<END_DOCUMENT>>>

    QUESTION:
    <<<BEGIN_QUESTION>>>
    {question}
    <<<END_QUESTION>>>
    <|eot_id|><|start_header_id|>assistant<|end_header_id|>
    """
        return final_prompt.strip()

    # ===== CASE 2: NAVAL WARSHIP (IN SCOPE) =====
    file_paths = [COLLECTIONS + name for name in file_names]

    acc = query_document(
        file_paths=file_paths,
        query=question,
        top_chunk=3,
        top_page=5,
        score_threshold=0.7
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
    - Be clear, direct, and well-structured
    - Do NOT mention the document or your reasoning process

    UPLOADED_DOCUMENT:
    <<<BEGIN_DOCUMENT>>>
    {acc.get_chunk_highlighted(1)}

    {acc.get_chunk_highlighted(2)}

    {acc.get_chunk_highlighted(3)}
    <<<END_DOCUMENT>>>

    QUESTION:
    <<<BEGIN_QUESTION>>>
    {question}
    <<<END_QUESTION>>>
    <|eot_id|><|start_header_id|>assistant<|end_header_id|>
    """
    return final_prompt.strip()
