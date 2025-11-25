import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from services.embedding import embed
from services.db import search_by_vector
from tools.ingest import ingest_url
from tools.related import related_documents
from tools.summarize import summarize_document
from models.schema import (
    IngestRequest,
    IngestResponse,
    SearchRequest,
    SearchResponse,
    SummarizeRequest,
    SummarizeResponse,
    RelatedRequest,
    RelatedResponse,
    Document,
)
from config import SERVER_PORT

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("mcp-server")

app = FastAPI(
    title="Bookmark MCP Server",
    description="북마크 · 웹페이지 벡터 검색 및 요약 시스템",
)

# ──────────────────────────────────────────────────────────────
# CORS (Chrome Extension 연동을 위한 전체 허용 — MVP라서 이렇게)
# ──────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ──────────────────────────────────────────────────────────────
# Health Check
# ──────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok"}

# ──────────────────────────────────────────────────────────────
# Ingest (URL → 크롤링 → 임베딩 → Qdrant 저장)
# ──────────────────────────────────────────────────────────────
@app.post("/ingest", response_model=IngestResponse)
def ingest(req: IngestRequest):
    try:
        result = ingest_url(req.url)
        return IngestResponse(id=result["id"], title=result["title"], url=result["url"])
    except Exception as e:
        logger.error(f"Ingest error for url={req.url}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ──────────────────────────────────────────────────────────────
# Search (텍스트 → 임베딩 → 벡터 검색)
# ──────────────────────────────────────────────────────────────
@app.post("/search", response_model=SearchResponse)
async def search(req: SearchRequest):
    try:
        vector = embed(req.query)                 # 동기 함수이므로 await 불필요
        docs = search_by_vector(vector, limit=req.limit)

        results = [
            Document(
                id=d.get("id"),
                url=d.get("url"),
                title=d.get("title"),
                text=d.get("text"),
                score=d.get("score"),
            )
            for d in docs
        ]
        return SearchResponse(results=results)
    # except Exception as e:
    #     logger.error(f"Search error for query={req.query}: {e}")
    #     raise HTTPException(status_code=500, detail=str(e))
    except Exception:
        import traceback
        traceback.print_exc()
        raise

# ──────────────────────────────────────────────────────────────
# Related (문서 ID 기반 유사 문서 추천)
# ──────────────────────────────────────────────────────────────
@app.post("/related", response_model=RelatedResponse)
def related(req: RelatedRequest):
    try:
        docs = related_documents(req.id, limit=req.limit)
        results = [
            Document(
                id=d.get("id"),
                url=d.get("url"),
                title=d.get("title"),
                text=d.get("text"),
                score=d.get("score"),
            )
            for d in docs
        ]
        return RelatedResponse(results=results)
    except Exception as e:
        logger.error(f"Related error for id={req.id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ──────────────────────────────────────────────────────────────
# Summarize (LLM 요약 — 요청 시에만 수행)
# ──────────────────────────────────────────────────────────────
@app.post("/summarize", response_model=SummarizeResponse)
def summarize(req: SummarizeRequest):
    try:
        summary = summarize_document(req.id)
        return SummarizeResponse(id=req.id, summary=summary)
    except Exception as e:
        logger.error(f"Summarize error for id={req.id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ──────────────────────────────────────────────────────────────
# Run Server (python server.py 로 실행 가능)
# ──────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=SERVER_PORT, reload=True)
