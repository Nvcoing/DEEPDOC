from indexer import index_file, load_collection
from search import search

# Chạy 1 lần duy nhất
collection = index_file("../test3.pdf")

# Các lần sau
# collection = load_collection("test3.pdf")

results = search(
    collection=collection,
    query="Quy định chuyển tiếp"
)

print(results)
