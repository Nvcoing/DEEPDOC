# main.py
import os
from vectordb_utils import QdrantFileUploader
from search_utils import DOCSearcher
from result_accessor import SearchResultAccessor   # 👈 THÊM

vectordb = QdrantFileUploader()

def main():
    file_path = "../test3.pdf"

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

    # ===== 4. KHỞI TẠO SEARCHER =====
    searcher = DOCSearcher(
        collection=collection_name,
        chunk_topk=10,
        page_topk=3,
        related_topk=2
    )

    # ===== 5. SEARCH =====
    query = "7. Quy định chuyển tiếp có thông tin chi tiết là gì"
    results = searcher.search(query)

    # ===== 6. WRAP ACCESSOR =====
    acc = SearchResultAccessor(results)

    # ===== 7. HIỂN THỊ THEO RANK =====
    print("\n" + "#" * 60)
    print("HIỂN THỊ KẾT QUẢ THEO RANK")

    for page_rank in range(1, len(results) + 1):
        page = acc.get_page(page_rank)
        if not page:
            continue

        print("\n" + "=" * 60)
        print(f"[PAGE RANK {page['rank']}] Page {page['page']} | Score: {page['score']}")
        print(page["highlighted_text"])

        related_pages = page.get("related_pages", [])
        if not related_pages:
            print("\n(No related pages)")
            continue

        print("\nRelated Pages:")
        for rel in related_pages:
            print(
                f"  [RELATED RANK {rel['rank']}] "
                f"Page {rel['page']} | Score: {rel['score']}"
            )

            preview = (
                rel["highlighted_text"][:200] + "..."
                if len(rel["highlighted_text"]) > 200
                else rel["highlighted_text"]
            )
            print(f"    {preview}")

    # ===== 8. TEST GỌI RIÊNG LẺ (QUAN TRỌNG) =====
    print("\n" + "#" * 60)
    print("TEST GỌI RIÊNG THEO RANK")

    print("\n→ highlighted_text của PAGE RANK 1:")
    print(acc.get_page_field(1, "highlighted_text"))

    print("\n→ score của PAGE RANK 2:")
    print(acc.get_page_field(2, "score"))

    print("\n→ highlighted_text của RELATED RANK 1 (PAGE RANK 1):")
    print(acc.get_related_field(1, 1, "highlighted_text"))

    print("\n→ score của RELATED RANK 2 (PAGE RANK 1):")
    print(acc.get_related_field(1, 2, "score"))


if __name__ == "__main__":
    main()
