class SearchResultAccessor:
    """
    Helper class để truy cập kết quả search dễ dàng hơn.
    Kết quả là danh sách các chunks được reranked.
    """
    def __init__(self, results):
        self.results = results

    def get_chunk(self, rank):
        """Lấy chunk theo rank (1-indexed)"""
        for item in self.results:
            if item["rank"] == rank:
                return item
        return None

    def get_chunk_field(self, rank, field):
        """Lấy field cụ thể của chunk theo rank"""
        chunk = self.get_chunk(rank)
        if chunk and field in chunk:
            return chunk[field]
        return None

    def get_chunk_highlighted(self, rank):
        """Lấy highlighted text của chunk theo rank"""
        return self.get_chunk_field(rank, 'highlighted_chunk')

    def get_all_chunks(self):
        """Lấy tất cả chunks"""
        return self.results

    def get_chunks_from_page(self, page_num):
        """Lấy tất cả chunks từ một page cụ thể"""
        return [
            chunk for chunk in self.results 
            if chunk.get("page") == page_num
        ]

    def get_top_n(self, n):
        """Lấy top N chunks có score cao nhất"""
        return self.results[:n]

    # Backward compatibility (giữ tên cũ)
    def get_page(self, rank):
        """Alias cho get_chunk() để backward compatibility"""
        return self.get_chunk(rank)

    def get_page_field(self, rank, field):
        """Alias cho get_chunk_field() để backward compatibility"""
        return self.get_chunk_field(rank, field)