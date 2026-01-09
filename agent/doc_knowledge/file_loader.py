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

def chunk_page_by_thirds(text: str) -> List[str]:
    """
    Chia page thành 3 chunks bằng nhau dựa trên số từ.
    Trả về list 3 chunks (có thể có chunk rỗng nếu text quá ngắn).
    """
    words = text.split()
    total_words = len(words)
    
    if total_words == 0:
        return ["", "", ""]
    
    # Tính số từ mỗi chunk (chia đều)
    chunk_size = total_words // 3
    remainder = total_words % 3
    
    chunks = []
    start_idx = 0
    
    for i in range(3):
        # Phân bổ từ dư cho các chunk đầu
        size = chunk_size + (1 if i < remainder else 0)
        end_idx = start_idx + size
        
        chunk_text = " ".join(words[start_idx:end_idx])
        chunks.append(chunk_text)
        
        start_idx = end_idx
    
    return chunks

# Giữ lại hàm cũ để backward compatibility
def chunk_page(text, size=200, overlap=50):
    words = text.split()
    chunks, i = [], 0
    while i < len(words):
        chunks.append(" ".join(words[i:i + size]))
        i += size - overlap
    return chunks