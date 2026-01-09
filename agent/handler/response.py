from handler.retrieval import query_document
from doc_knowledge.config import COLLECTIONS
from llm.generate import generate_text
from typing import List

def answer(question: str, file_names: List[str]) -> str:
    file_paths = [COLLECTIONS + name for name in file_names]

    acc = query_document(
        file_paths=file_paths,
        query=question,
        page_topk=5,
        chunk_topk=3,
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
    print(repr(final_prompt))
    return repr(final_prompt)
