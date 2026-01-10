from typing import List
from pypdf import PdfReader
from docx import Document
from pptx import Presentation
from typing import List, Tuple
import pytesseract
from pdf2image import convert_from_path
from PIL import Image
import os


OCR_LANGS = "vie+eng+chi_sim+chi_tra+jpn+kor"


def ocr_image(image: Image.Image) -> str:
    text = pytesseract.image_to_string(image, lang=OCR_LANGS)
    return text.strip()


def load_file_pages(path: str) -> List[str]:
    ext = path.split('.')[-1].lower()
    pages = []

    # -------- PDF --------
    if ext == "pdf":
        reader = PdfReader(path)

        for page_id, page in enumerate(reader.pages):
            text = (page.extract_text() or "").strip()

            # Nếu page không có text → OCR
            if not text:
                images = convert_from_path(path, first_page=page_id+1, last_page=page_id+1)
                if images:
                    ocr_text = ocr_image(images[0])
                    text = ocr_text

            if text:
                pages.append(text)

        return pages

    # -------- DOCX --------
    if ext == "docx":
        doc = Document(path)
        buf, cnt = [], 0

        for para in doc.paragraphs:
            if para.text.strip():
                buf.append(para.text.strip())
                cnt += 1

            if cnt >= 20:
                page = "\n".join(buf).strip()
                if page:
                    pages.append(page)
                buf, cnt = [], 0

        if buf:
            page = "\n".join(buf).strip()
            if page:
                pages.append(page)

        return pages

    # -------- PPTX --------
    if ext == "pptx":
        pres = Presentation(path)

        for slide in pres.slides:
            texts = [s.text.strip() for s in slide.shapes if hasattr(s, "text") and s.text.strip()]
            page = "\n".join(texts).strip()
            if page:
                pages.append(page)

        return pages

    raise ValueError("Unsupported file format")

def chunk_pages_smart(pages: List[str]) -> List[Tuple[str, List[int]]]:
    """
    - Không sinh chunk rỗng
    - Không sinh chunk quá ngắn
    - Nối OCR text + text gốc mượt
    """
    all_chunks = []

    for page_id, page_text in enumerate(pages):
        if not page_text or not page_text.strip():
            continue

        words = page_text.split()
        total_words = len(words)

        if total_words < 20:
            continue

        chunk_size = max(total_words // 3, 20)

        for i in range(3):
            start = i * chunk_size
            end = total_words if i == 2 else start + chunk_size

            chunk_words = words[start:end]
            if len(chunk_words) < 20:
                continue

            chunk_text = " ".join(chunk_words)
            pages_involved = [page_id]

            # Overlap sang page sau
            if i == 2 and page_id + 1 < len(pages):
                next_page = pages[page_id + 1]
                if next_page.strip():
                    next_words = next_page.split()
                    overlap_size = max(len(next_words) // 5, 20)
                    overlap_words = next_words[:overlap_size]

                    if overlap_words:
                        chunk_text += " " + " ".join(overlap_words)
                        pages_involved.append(page_id + 1)

            chunk_text = chunk_text.strip()
            if chunk_text:
                all_chunks.append((chunk_text, pages_involved))

    return all_chunks
