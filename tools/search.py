import logging
from fastapi import HTTPException
from services.db import search_by_vector
from services.embedding import embed

logger = logging.getLogger("mcp-server")

MAX_SNIPPET_LENGTH = 300   # 검색 응답에 보여줄 최대 글자 수


def search_query(query: str, limit: int = 5):
    try:
        # 쿼리 → 벡터 변환
        vector = embed(query)

        # DB 검색 (동기 함수)
        docs = search_by_vector(vector, limit)

        results = []
        for d in docs:
            text = d.get("text", "") or ""
            snippet = text.replace("\n", " ").strip()

            if len(snippet) > MAX_SNIPPET_LENGTH:
                snippet = snippet[:MAX_SNIPPET_LENGTH] + "..."

            results.append({
                "id": d.get("id"),
                "title": d.get("title", "(제목 없음)"),
                "url": d.get("url"),
                "snippet": snippet,
                "score": round(float(d.get("score", 0)), 4)
            })

        return {"results": results}

    except Exception as e:
        logger.error(f"Search error for query={query}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
