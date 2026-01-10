from handler.retrieval import query_document
from doc_knowledge.config import COLLECTIONS
from handler.router import QueryRouter
from typing import List

router = QueryRouter("./handler/routes.json")


def answer(question: str, file_names: List[str]) -> str:
    route_result = router.route(question)

    # ===== OUT OF SCOPE =====
    if route_result["label"] != "naval_warship":
        final_prompt = f"""
            <|begin_of_text|><|start_header_id|>user<|end_header_id|>
            You are a professional document reading assistant.

            UPLOADED_DOCUMENT:
            <<<BEGIN_DOCUMENT>>>
            Câu hỏi không liên quan đến truy xuất tài liệu
            <<<END_DOCUMENT>>>

            QUESTION:
            <<<BEGIN_QUESTION>>>
            {question}
            <<<END_QUESTION>>>

            INSTRUCTIONS:
            - If the question is related to the document, answer using only information from the document.
            - If the question is unrelated or outside the scope of the document, respond exactly with the content in the UPLOADED_DOCUMENT section above.
            - Do not guess or invent information not present in the document.

            <|eot_id|><|start_header_id|>assistant<|end_header_id|>
            """
        return final_prompt.strip()

    # ===== IN SCOPE =====
    file_paths = [COLLECTIONS + name for name in file_names]

    acc = query_document(
        file_paths=file_paths,
        query=question,
        top_chunk=3,
        top_page=5,
        chunk_score_threshold=0.7,
        page_score_threshold=0.5,
    )

    # ===== BUILD DOCUMENT CONTEXT =====
    context_blocks = []

    if acc.is_no_result():
        context_blocks.append("Khong tim thay thong tin lien quan trong tai lieu.")
    else:
        for chunk in acc.get_all_chunks():
            rank = chunk["rank"]
            context_blocks.append(
                f"[CHUNK {rank}]\n{chunk['highlighted_text']}"
            )

    context_text = "\n\n".join(context_blocks)
    # ===== FINAL PROMPT =====
    final_prompt = f"""
        You are a professional document reading assistant.

        TASK:
        1. Carefully read the entire content of the provided document.
        2. Answer the question **based entirely on the content of the document**.
        3. If the information is not present in the document, respond: "The information is not found in the document."
        4. When possible, quote the exact sentence or passage from the document to support your answer.
        5. Respond in the **same language as the document**, do not use any other language.

        DOCUMENT:
        <<<BEGIN_DOCUMENT>>>
        {context_text}
        <<<END_DOCUMENT>>>

        QUESTION:
        <<<BEGIN_QUESTION>>>
        {question}
        <<<END_QUESTION>>>

        ANSWER GUIDELINES:
        - Provide a complete, detailed, and accurate answer.
        - Always rely on information from the document.
        - Do not add any external knowledge.
        - Cite specific parts of the document whenever possible.
        """

    print(final_prompt)
    return final_prompt.strip()
