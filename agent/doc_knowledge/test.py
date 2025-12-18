# main.py
from vectordb_utils import QdrantFileUploader
from search_utils import search
import os
vectordb = QdrantFileUploader()
def main():
    file_path = "../test2.docx"  # Thay bằng đường dẫn file của bạn
    
    # ===== CÁCH 1: Tự động tải theo tên file =====
    file_name = os.path.basename(file_path)
    collection_name = f"doc_{file_name}"
    
    # Thử tải collection có sẵn
    loaded = vectordb.load_collection(collection_name)
    
    if loaded:
        print(f"Đã tải collection có sẵn: {collection_name}")
    else:
        print(f"Collection chưa tồn tại, đang upload file mới...")
        collection_name = vectordb.upload_file(file_path)
    
    # ===== 2. Liệt kê collection =====
    cols = vectordb.list_collections()
    print("Current collections:", cols)
    
    # ===== 3. Search =====
    query = "7. Quy định chuyển tiếp có thông tin chi tiết là gì"
    results = search(collection_name, query)
    
    # ===== 4. Hiển thị kết quả =====
    for page_data in results:
        print("\n" + "="*50)
        print(f"Page {page_data['page']}:")
        print(page_data["highlighted_text"])
        print("\nRelated Pages:")
        for rel in page_data["related_pages"]:
            print(f"  - Page {rel['page']} | Score: {rel['score']}")
            preview = rel['highlighted_text'][:200] + "..." if len(rel['highlighted_text']) > 200 else rel['highlighted_text']
            print(f"    {preview}")

if __name__ == "__main__":
    main()