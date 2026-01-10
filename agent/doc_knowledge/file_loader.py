from typing import List, Dict
import fitz  # PyMuPDF


# =========================================================
# LOAD PDF → PAGE TEXT (NO OCR)
# =========================================================

def load_file_pages(pdf_path: str) -> List[Dict]:
    """
    Load PDF text layer only.
    - Không OCR
    - Không Poppler
    - Không phụ thuộc native lib
    - PDF scan (ảnh) → bỏ qua page
    """
    pages: List[Dict] = []

    doc = fitz.open(pdf_path)
    total_pages = len(doc)

    print(f"[INFO] Total pages: {total_pages}")

    for page_index in range(total_pages):
        page = doc[page_index]
        text = page.get_text("text").strip()

        if not text:
            print(f"[WARN] Page {page_index + 1} has NO text layer → skipped")
            continue

        print(f"[DEBUG] Page {page_index + 1} text length: {len(text)}")

        pages.append({
            "page_id": page_index + 1,
            "text": text
        })

    doc.close()

    if not pages:
        print("❌ Không có page hợp lệ để upload")

    return pages


# =========================================================
# CHUNKING
# =========================================================

def chunk_pages_smart(
    pages: List[Dict],
    chunk_size: int = 300,
    overlap: int = 50
) -> List[Dict]:
    """
    Chunk text theo sliding window
    - Không sinh chunk rỗng
    - Có overlap để giữ context
    """
    chunks: List[Dict] = []

    for page in pages:
        words = page["text"].split()
        if not words:
            continue

        start = 0
        while start < len(words):
            end = start + chunk_size
            chunk_words = words[start:end]

            if len(chunk_words) < 20:
                break

            chunk_text = " ".join(chunk_words)

            chunks.append({
                "page_id": page["page_id"],
                "text": chunk_text
            })

            start = end - overlap

    print(f"[INFO] Total chunks created: {len(chunks)}")
    return chunks