# services/embedding.py
from typing import List
from openai import OpenAI
from config import OPENAI_API_KEY, EMBEDDING_MODEL
client = OpenAI(api_key=OPENAI_API_KEY)
from sentence_transformers import SentenceTransformer
_model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
def embed(text: str):
    if not text:
        text = " "
    return _model.encode(text, convert_to_numpy=True).tolist()

# def embed(text: str) -> List[float]:
#     """
#     텍스트를 임베딩 벡터로 변환.
#     모델은 config. EMBEDDING_MODEL에서 관리.
#     """
#     if not text:
#         text = " "  # 빈 문자열 방지

#     response = client.embeddings.create(
#         model=EMBEDDING_MODEL,
#         input=text,
#     )
#     return response.data[0].embedding
