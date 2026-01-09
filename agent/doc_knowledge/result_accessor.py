class SearchResultAccessor:
    """Accessor để truy xuất kết quả search một cách dễ dàng"""
    
    def __init__(self, results):
        self.chunks = results

    def is_no_result(self):
        """Kiểm tra xem có kết quả hay không"""
        if not self.chunks:
            return True
        return self.chunks[0].get("no_result", False)

    def get_chunk(self, rank):
        """Lấy chunk theo rank (1-indexed)"""
        for chunk in self.chunks:
            if chunk["rank"] == rank:
                return chunk
        return None

    def get_chunk_field(self, rank, field):
        """Lấy field cụ thể của chunk"""
        chunk = self.get_chunk(rank)
        return chunk.get(field) if chunk else None

    def get_chunk_text(self, rank):
        """Lấy text gốc của chunk"""
        return self.get_chunk_field(rank, "text") or ""

    def get_chunk_highlighted(self, rank):
        """Lấy text đã highlight entities"""
        return self.get_chunk_field(rank, "highlighted_text") or ""

    def get_chunk_score(self, rank):
        """Lấy score của chunk"""
        return self.get_chunk_field(rank, "score")

    def get_chunk_entities(self, rank):
        """Lấy entities của chunk"""
        return self.get_chunk_field(rank, "entities") or []

    def get_chunk_pages(self, rank):
        """Lấy danh sách pages của chunk"""
        return self.get_chunk_field(rank, "pages") or []

    def is_chunk_merged(self, rank):
        """Kiểm tra chunk có tràn sang nhiều pages không"""
        return self.get_chunk_field(rank, "is_merged") or False

    def get_all_chunks(self):
        """Lấy tất cả chunks"""
        return self.chunks

    def get_all_entities(self):
        """Lấy tất cả entities từ tất cả chunks"""
        all_entities = set()
        for chunk in self.chunks:
            all_entities.update(chunk.get("entities", []))
        return sorted(all_entities)

    def filter_by_score(self, min_score):
        """Lọc chunks theo score tối thiểu"""
        return [c for c in self.chunks if c["score"] >= min_score]

    def filter_by_entity(self, entity_keyword):
        """Tìm chunks chứa entity cụ thể"""
        result = []
        for chunk in self.chunks:
            for entity in chunk.get("entities", []):
                if entity_keyword.lower() in entity.lower():
                    result.append(chunk)
                    break
        return result

    def print_summary(self):
        """In tóm tắt kết quả"""
        print(f"\n{'='*70}")
        
        # Kiểm tra nếu không có kết quả
        if self.is_no_result():
            print("⚠️  KHÔNG TÌM THẤY THÔNG TIN PHÙ HỢP")
            print(f"{'='*70}")
            return
        
        print(f"Tổng số chunks: {len(self.chunks)}")
        merged = sum(1 for c in self.chunks if c.get("is_merged"))
        print(f"Chunks tràn nhiều pages: {merged}")
        print(f"{'='*70}")
        
        for chunk in self.chunks:
            pages = chunk.get("pages", [])
            entities = chunk.get("entities", [])
            entities_str = ', '.join(entities[:3]) if entities else "None"
            
            print(f"\n[Rank {chunk['rank']}] Score: {chunk['score']}")
            
            if chunk.get("is_merged"):
                print(f"  ⚠️  Tràn sang {len(pages)} pages:")
                for p in pages:
                    print(f"      - {p.get('collection')} - Trang {p.get('page')}")
            else:
                p = pages[0] if pages else {}
                print(f"  Page: {p.get('collection')} - Trang {p.get('page')}")
            
            print(f"  Entities: {entities_str}")
            print(f"  Text: {chunk['text'][:100]}...")

    def print_chunk_detail(self, rank):
        """In chi tiết chunk với highlight"""
        chunk = self.get_chunk(rank)
        
        if not chunk:
            print(f"\n⚠️  Không tìm thấy chunk rank {rank}")
            return
        
        pages = chunk.get("pages", [])
        
        print(f"\n{'='*70}")
        print(f"CHUNK RANK {rank} (Score: {chunk['score']})")
        print(f"{'='*70}")
        
        if chunk.get("is_merged"):
            print(f"⚠️  CHUNK TRÀN QUA {len(pages)} PAGES:")
            for p in pages:
                print(f"   - 📄 {p.get('collection')} - Trang {p.get('page')}")
        else:
            p = pages[0] if pages else {}
            print(f"📄 Nguồn: {p.get('collection')} - Trang {p.get('page')}")
        
        entities = chunk.get('entities', [])
        if entities:
            print(f"\n📌 Entities: {', '.join(entities)}")
        
        print(f"\n{chunk['highlighted_text']}")
        print(f"{'='*70}")

    def to_markdown(self):
        """Export kết quả dạng markdown"""
        md_parts = ["# Kết quả tìm kiếm\n"]
        
        for chunk in self.chunks:
            pages = chunk.get("pages", [])
            md_parts.append(f"## Chunk {chunk['rank']} (Score: {chunk['score']})")
            
            if chunk.get("is_merged"):
                md_parts.append(f"**⚠️ Tràn qua {len(pages)} pages:**")
                for p in pages:
                    md_parts.append(f"- {p.get('collection')} - Trang {p.get('page')}")
            else:
                p = pages[0] if pages else {}
                md_parts.append(f"**Nguồn:** {p.get('collection')} - Trang {p.get('page')}")
            
            md_parts.append("")
            
            if chunk.get('entities'):
                md_parts.append(f"**Entities:** {', '.join(chunk['entities'])}\n")
            
            md_parts.append(chunk['highlighted_text'])
            md_parts.append("\n---\n")
        
        return "\n".join(md_parts)