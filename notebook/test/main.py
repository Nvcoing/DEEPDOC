from indexer import index_file, load_collection
from search import search

# Index lần đầu
collection, pages = index_file("../test3.pdf")

# Lần sau chỉ load
# collection = load_collection("test3.pdf")

results = search(
    collection=collection,
    query="Quy định chuyển tiếp",
    pages=pages
)
print(results)
