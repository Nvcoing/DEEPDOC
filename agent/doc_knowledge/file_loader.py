from typing import List, Dict, Tuple
from pypdf import PdfReader
from docx import Document
from pptx import Presentation


# ================= LOAD FILE =================

def load_file_pages(path: str) -> List[Dict]:
    """
    Output:
    [
        {
            "page_id": int,
            "text": str
        }
    ]
    """
    ext = path.split(".")[-1].lower()
    pages: List[Dict] = []

    # ---------- PDF ----------
    if ext == "pdf":
        reader = PdfReader(path)

        for i, page in enumerate(reader.pages):
            text = (page.extract_text() or "").strip()
            if text:
                pages.append({
                    "page_id": i,
                    "text": text
                })
        return pages

    # ---------- DOCX ----------
    if ext == "docx":
        doc = Document(path)
        buf = []
        page_id = 0

        for para in doc.paragraphs:
            if para.text.strip():
                buf.append(para.text.strip())

            if len(buf) >= 20:
                pages.append({
                    "page_id": page_id,
                    "text": "\n".join(buf)
                })
                buf = []
                page_id += 1

        if buf:
            pages.append({
                "page_id": page_id,
                "text": "\n".join(buf)
            })

        return pages

    # ---------- PPTX ----------
    if ext == "pptx":
        pres = Presentation(path)

        for i, slide in enumerate(pres.slides):
            texts = [
                s.text.strip()
                for s in slide.shapes
                if hasattr(s, "text") and s.text.strip()
            ]
            if texts:
                pages.append({
                    "page_id": i,
                    "text": "\n".join(texts)
                })
        return pages

    raise ValueError(f"Unsupported file format: {ext}")


# ================= CHUNKING =================

def chunk_pages_smart(
    pages: List[Dict],
    min_words: int = 40
) -> List[Dict]:
    """
    Output chunk format:
    {
        "chunk_text": str,
        "page_ids": [int]
    }
    """
    chunks: List[Dict] = []

    for page in pages:
        page_id = page["page_id"]
        text = page["text"].strip()

        words = text.split()
        if len(words) < min_words:
            continue

        chunk_size = max(len(words) // 3, min_words)

        for i in range(3):
            start = i * chunk_size
            end = len(words) if i == 2 else start + chunk_size
            part = words[start:end]

            if len(part) < min_words:
                continue

            chunks.append({
                "chunk_text": " ".join(part),
                "page_ids": [page_id]
            })

    return chunks
