class SearchResultAccessor:
    def __init__(self, results):
        self.results = results

    def get_page(self, rank):
        for item in self.results:
            if item["rank"] == rank:
                return item
        return None

    def get_page_field(self, rank, field):
        page = self.get_page(rank)
        if page and field in page:
            return page[field]
        return None

    def get_related(self, page_rank, related_rank):
        page = self.get_page(page_rank)
        if not page:
            return None
        for rel in page.get("related_pages", []):
            if rel["rank"] == related_rank:
                return rel
        return None

    def get_related_field(self, page_rank, related_rank, field):
        rel = self.get_related(page_rank, related_rank)
        if rel and field in rel:
            return rel[field]
        return None
