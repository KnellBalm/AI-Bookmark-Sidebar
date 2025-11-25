# tools/related.py
from typing import List, Dict, Any

from services.db import search_similar_to_id


def related_documents(doc_id: str, limit: int = 5) -> List[Dict[str, Any]]:
    """
    특정 문서와 유사한 문서 목록 반환
    """
    docs = search_similar_to_id(doc_id, limit=limit)
    return docs
