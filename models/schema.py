# models/schema.py
from typing import List, Optional
from pydantic import BaseModel


class IngestRequest(BaseModel):
    url: str


class IngestResponse(BaseModel):
    id: str
    title: str
    url: str


class SearchRequest(BaseModel):
    query: str
    limit: int = 5


class Document(BaseModel):
    id: str
    url: str
    title: str
    text: Optional[str] = None
    score: Optional[float] = None


class SearchResponse(BaseModel):
    results: List[Document]


class SummarizeRequest(BaseModel):
    id: str


class SummarizeResponse(BaseModel):
    id: str
    summary: str


class RelatedRequest(BaseModel):
    id: str
    limit: int = 5


class RelatedResponse(BaseModel):
    results: List[Document]
