import os
from doc_knowledge.search_utils import DOCSearcher
from doc_knowledge.result_accessor import SearchResultAccessor   # 👈 THÊM
from handler.retrieval import query_document
from doc_knowledge.config import COLLECTIONS

def summarize(query: str, file_name: str) -> str:
    acc = query_document(
    file_path=COLLECTIONS + file_name,
    query=query,
    chunk_topk=10,
    page_topk=3,
    related_topk=2
)
    return f"""
        You are an expert summarizer and information extractor.

        TASK:
        Summarize information to answer the given QUESTION, using the provided RELATED PAGES.

        INPUT:
        - QUESTION: {query}
        - MAIN RETRIEVED PAGES (3 pages):
        - Page 1: {acc.get_page_field(1, "highlighted_text")}
        - Page 2: {acc.get_page_field(2, "highlighted_text")}
        - Page 3: {acc.get_page_field(3, "highlighted_text")}

        - SUB-RELATED PAGES (2 pages for each main page):
        - Page 1 related:
            - Page {acc.get_related_field(1, 1, "page")}: {acc.get_related_field(1, 1, "highlighted_text")}
            - Page {acc.get_related_field(1, 2, "page")}: {acc.get_related_field(1, 2, "highlighted_text")}
        - Page 2 related:
            - Page {acc.get_related_field(2, 1, "page")}: {acc.get_related_field(2, 1, "highlighted_text")}
            - Page {acc.get_related_field(2, 2, "page")}: {acc.get_related_field(2, 2, "highlighted_text")}
        - Page 3 related:
            - Page {acc.get_related_field(3, 1, "page")}: {acc.get_related_field(3, 1, "highlighted_text")}
            - Page {acc.get_related_field(3, 2, "page")}: {acc.get_related_field(3, 2, "highlighted_text")}

        INSTRUCTIONS:
        1. Automatically detect the language of the input text and produce the summary in the SAME language.
        2. Focus on answering the QUESTION directly, using evidence from ALL relevant pages.
        3. Preserve ALL:
        - Person names
        - Titles / roles
        - Numerical figures
        - Dates, times
        - Phone numbers
        - Email addresses
        - Locations / addresses
        4. Highlight ALL important facts and entities using **bold markdown**.
        5. Do NOT hallucinate or add information not present in the provided pages.
        6. If information is duplicated across pages, merge it logically but keep all important details.
        7. If pages contain conflicting information, clearly note the discrepancy and its source.

        OUTPUT FORMAT:
        Provide a STRUCTURED SUMMARY with clear sections:

        - **Question Overview**
        - **Key Entities (People / Organizations / Systems)**
        - **Important Facts & Findings**
        - **Numbers / Dates / Metrics**
        - **Locations / Contacts (if any)**
        - **Cross-page Insights & Relationships**
        - **Final Answer to the Question**

        Use bullet points or short paragraphs.
        Remain concise but DO NOT omit critical factual details.
"""
