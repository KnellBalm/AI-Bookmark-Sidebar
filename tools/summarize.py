# tools/summarize.py
from services.db import get_document
from services.llm import summarize_text


def summarize_document(doc_id: str) -> str:
    doc = get_document(doc_id)
    if not doc:
        raise ValueError(f"Document not found: {doc_id}")

    text = doc.get("text") or doc.get("title") or doc.get("url")
    summary = summarize_text(text)
    return summary
