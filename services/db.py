# services/db.py
import logging
import uuid
from typing import List, Optional, Dict, Any

from qdrant_client import QdrantClient
from qdrant_client.http.models import (
    Distance,
    VectorParams,
    PointStruct,
    Filter,
)

from config import QDRANT_URL, QDRANT_COLLECTION

logger = logging.getLogger(__name__)
client = QdrantClient(url=QDRANT_URL)


def ensure_collection(vector_size: int):
    existing = [c.name for c in client.get_collections().collections]
    if QDRANT_COLLECTION in existing:
        return
    client.create_collection(
        collection_name=QDRANT_COLLECTION,
        vectors_config=VectorParams(size=vector_size, distance=Distance.COSINE),
    )


def upsert_document(doc: Dict[str, Any]) -> str:
    embedding = doc["embedding"]
    vector_size = len(embedding)
    ensure_collection(vector_size)

    point_id = str(uuid.uuid4())
    payload = {
        "url": doc["url"],
        "title": doc.get("title", ""),
        "text": doc.get("text", ""),
    }

    client.upsert(
        collection_name=QDRANT_COLLECTION,
        points=[
            PointStruct(
                id=point_id,
                vector=embedding,
                payload=payload,
            )
        ],
    )
    return point_id


def search_by_vector(vector: List[float], limit: int = 5) -> List[Dict[str, Any]]:
    """
    Qdrant 벡터 기반 검색
    """
    ensure_collection(len(vector))
    result = client.search(
        collection_name=QDRANT_COLLECTION,
        query_vector=vector,
        limit=limit,
        with_payload=True,
    )

    docs = []
    for r in result:
        payload = r.payload or {}
        docs.append({
            "id": str(r.id),
            "title": payload.get("title", ""),
            "url": payload.get("url", ""),
            "text": payload.get("text", ""),
            "score": float(r.score),
        })
    return docs


def get_document(doc_id: str) -> Optional[Dict[str, Any]]:
    try:
        records = client.retrieve(
            collection_name=QDRANT_COLLECTION,
            ids=[doc_id],
            with_payload=True,
        )
    except Exception as e:
        logger.error(f"Failed to retrieve doc_id={doc_id}: {e}")
        return None

    if not records:
        return None

    rec = records[0]
    payload = rec.payload or {}
    payload["id"] = str(rec.id)
    return payload

def search_similar_to_id(doc_id: str, limit: int = 5):
    doc = get_document(doc_id)
    if not doc:
        return []

    text = doc.get("text") or doc.get("title") or doc.get("url")
    vector = embed(text)
    docs = search_by_vector(vector, limit=limit + 1)
    return [d for d in docs if d.get("id") != doc_id][:limit]