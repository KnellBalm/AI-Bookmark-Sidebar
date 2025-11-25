# tools/ingest.py
from services.crawler import fetch_text
from services.embedding import embed
from services.db import upsert_document


def ingest_url(url: str):
    """
    URL을 크롤링하여 본문 텍스트 → 임베딩 → Qdrant에 저장.
    요약은 수행하지 않음 (사용자 요청 시에만 summarize).
    """
    text, title = fetch_text(url)
    vec = embed(text or title or url)

    doc = {
        "url": url,
        "title": title,
        "text": text,
        "embedding": vec,
    }

    doc_id = upsert_document(doc)
    return {
        "id": doc_id,
        "title": title,
        "url": url,
    }
