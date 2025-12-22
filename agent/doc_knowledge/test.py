# main.py
import os
from vectordb_utils import QdrantFileUploader
from search_utils import DOCSearcher

vectordb = QdrantFileUploader()

def main():
    file_path = "../test2.docx"  # Đường dẫn file test

    # ===== 1. TẠO COLLECTION NAME =====
    file_name = os.path.basename(file_path)
    collection_name = f"doc_{file_name}"

    # ===== 2. LOAD HOẶC UPLOAD COLLECTION =====
    loaded = vectordb.load_collection(collection_name)

    if loaded:
        print(f"Đã tải collection có sẵn: {collection_name}")
    else:
        print("Collection chưa tồn tại, đang upload file mới...")
        collection_name = vectordb.upload_file(file_path)

    # ===== 3. LIỆT KÊ COLLECTION =====
    cols = vectordb.list_collections()
    print("Current collections:", cols)

    # ===== 4. KHỞI TẠO SEARCHER (CLASS) =====
    searcher = DOCSearcher(
        collection=collection_name,   # 🔧 FIX CHỖ NÀY
        chunk_topk=10,
        page_topk=3,
        related_topk=2
    )

    # ===== 5. SEARCH =====
    query = "7. Quy định chuyển tiếp có thông tin chi tiết là gì"
    results = searcher.search(query)

    # ===== 6. HIỂN THỊ KẾT QUẢ =====
    for page_data in results:
        print("\n" + "=" * 50)
        print(f"Page {page_data['page']} | Score: {page_data['score']}")
        print(page_data["highlighted_text"])

        print("\nRelated Pages:")
        for rel in page_data["related_pages"]:
            print(f"  - Page {rel['page']} | Score: {rel['score']}")
            preview = (
                rel["highlighted_text"][:200] + "..."
                if len(rel["highlighted_text"]) > 200
                else rel["highlighted_text"]
            )
            print(f"    {preview}")


if __name__ == "__main__":
    main()
