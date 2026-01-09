import json
import torch
from typing import Dict
from doc_knowledge.config import embed_model


def cosine_similarity(a: torch.Tensor, b: torch.Tensor) -> float:
    return torch.nn.functional.cosine_similarity(a, b, dim=0).item()


class QueryRouter:
    def __init__(self, routes_path: str):
        with open(routes_path, "r", encoding="utf-8") as f:
            self.classes = json.load(f)["classes"]

        self.class_embeddings = {
            cls["label"]: self._embed(cls["description"])
            for cls in self.classes
        }

    def _embed(self, text: str) -> torch.Tensor:
        with torch.no_grad():
            return embed_model.encode(
                text,
                convert_to_tensor=True,
                normalize_embeddings=True
            )

    def route(self, question: str) -> Dict:
        q_emb = self._embed(question)

        scores = {
            label: cosine_similarity(q_emb, cls_emb)
            for label, cls_emb in self.class_embeddings.items()
        }

        best_label = max(scores, key=scores.get)

        return {
            "label": best_label,
            "score": round(scores[best_label], 4)
        }
