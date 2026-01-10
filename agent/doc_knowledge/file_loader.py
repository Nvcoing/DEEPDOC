from typing import List, Tuple
from pypdf import PdfReader
from docx import Document
from pptx import Presentation


def load_file_pages(path: str) -> List[str]:
    ext = path.split('.')[-1].lower()

    if ext == "pdf":
        reader = PdfReader(path)
        return [p.extract_text() or "" for p in reader.pages]

    if ext == "docx":
        doc = Document(path)
        pages, buf, cnt = [], [], 0
        for para in doc.paragraphs:
            if para.text.strip():
                buf.append(para.text.strip())
                cnt += 1
            if cnt >= 20:
                pages.append("\n".join(buf))
                buf, cnt = [], 0
        if buf:
            pages.append("\n".join(buf))
        return pages

    if ext == "pptx":
        pres = Presentation(path)
        pages = []
        for slide in pres.slides:
            texts = [shape.text for shape in slide.shapes if hasattr(shape, "text")]
            pages.append("\n".join(texts))
        return pages

    raise ValueError("Unsupported file")


def chunk_pages_smart(
    pages: List[str],
    chunk_size: int = 300,
    overlap: int = 50
) -> List[Tuple[str, List[int]]]:
    """
    Chunk theo word-level, có overlap và page-aware

    Returns:
        List[(chunk_text, [page_ids])]
    """
    all_chunks = []

    for page_id, page_text in enumerate(pages):
        if not page_text.strip():
            continue

        words = page_text.split()
        total = len(words)
        start = 0

        while start < total:
            end = min(start + chunk_size, total)
            chunk_words = words[start:end]

            if not chunk_words:
                break

            chunk_text = " ".join(chunk_words)
            pages_involved = [page_id]

            # ===== OVERLAP SANG PAGE TIẾP THEO =====
            if end == total and page_id + 1 < len(pages):
                next_words = pages[page_id + 1].split()
                extra = min(overlap, len(next_words))

                if extra > 0:
                    chunk_text += " " + " ".join(next_words[:extra])
                    pages_involved.append(page_id + 1)

            all_chunks.append((chunk_text.strip(), pages_involved))

            start += chunk_size - overlap
            if start <= 0:
                start = end

    return all_chunks
