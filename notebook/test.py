from doc_knowledge.vectordb_utils import QdrantFileUploader
from doc_knowledge.search_utils import DOCSearcher
from doc_knowledge.result_accessor import SearchResultAccessor

# Upload và search
uploader = QdrantFileUploader()
collection = uploader.upload_file("./thân tàu/giao_trinh_ly_thuyet_-_ket_cau_va_thiet_bi_tau_thuy.pdf")

searcher = DOCSearcher(
    collections=[collection],
    chunk_topk=10,
    similarity_threshold=0.7  # 70% giống = trùng
)

results = searcher.search("Cách tạo thân tàu thủy bằng thép")
print("Kết quả tìm kiếm:", results)
accessor = SearchResultAccessor(results)

# Lấy chunk bất kỳ từ 1->10
for rank in range(1, 11):
    text = accessor.get_chunk_highlighted(rank)
    print(f"Chunk {rank}: {text}")