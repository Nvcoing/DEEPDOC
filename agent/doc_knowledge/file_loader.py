from typing import List, Tuple
from pypdf import PdfReader
from docx import Document
from pptx import Presentation

def load_file_pages(path: str) -> List[str]:
    """Load file và trả về list các pages"""
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


def chunk_pages_smart(pages: List[str]) -> List[Tuple[str, List[int]]]:
    """
    Chia pages thành chunks với quy tắc:
    - Mỗi page chia thành 3 chunks (1/3 size)
    - Nếu chunk overlap sang page khác -> gộp cả 2 pages vào metadata
    
    Returns:
        List[(chunk_text, [page_ids])]
    """
    all_chunks = []
    
    for page_id, page_text in enumerate(pages):
        if not page_text.strip():
            continue
            
        words = page_text.split()
        total_words = len(words)
        
        if total_words == 0:
            continue
        
        # Chia page thành 3 phần
        chunk_size = max(total_words // 3, 1)
        
        for i in range(3):
            start_idx = i * chunk_size
            
            # Chunk cuối lấy hết phần còn lại
            if i == 2:
                end_idx = total_words
            else:
                end_idx = start_idx + chunk_size
            
            chunk_words = words[start_idx:end_idx]
            
            if not chunk_words:
                continue
            
            chunk_text = " ".join(chunk_words)
            
            # Kiểm tra xem chunk có tràn sang page tiếp theo không
            pages_involved = [page_id]
            
            # Nếu là chunk cuối của page và có page tiếp theo
            if i == 2 and page_id + 1 < len(pages):
                next_page = pages[page_id + 1]
                next_words = next_page.split()
                
                # Lấy thêm 20% từ đầu page tiếp theo (tràn overlap)
                overlap_size = max(len(next_words) // 5, 10)
                overlap_words = next_words[:overlap_size]
                
                if overlap_words:
                    chunk_text += " " + " ".join(overlap_words)
                    pages_involved.append(page_id + 1)
            
            all_chunks.append((chunk_text.strip(), pages_involved))
    
    return all_chunks