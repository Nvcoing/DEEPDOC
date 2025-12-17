# main.py
from vectordb_utils import upload_file, list_collections
from search_utils import search

def main():
    # ===== 1. Upload file =====
    file_path = "../test2.docx"  # Thay bằng đường dẫn file PDF/DOCX/PPTX của bạn
    collection_name = upload_file(file_path)
    print(f"Uploaded file to collection: {collection_name}")

    # ===== 2. Liệt kê collection =====
    cols = list_collections()
    print("Current collections:", cols)

    # ===== 3. Search =====
    query = "Điều 10 trong file có những thông tin chi tiết là gì"  # Thay bằng câu query của bạn
    results = search(collection_name, query)

    # ===== 4. Hiển thị kết quả =====
    for page_data in results:
        print("\n" + "="*50)
        print(f"Page {page_data['page']}:")
        print(page_data["highlighted_text"])
        print("\nRelated Pages:")
        for rel in page_data["related_pages"]:
            print(f"  - Page {rel['page']} | Score: {rel['score']}")
            print(f"    {rel['highlighted_text']}") 

if __name__ == "__main__":
    main()
