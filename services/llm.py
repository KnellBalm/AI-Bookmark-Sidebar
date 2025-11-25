# services/llm.py
from openai import OpenAI

from config import OPENAI_API_KEY, LLM_MODEL

client = OpenAI(api_key=OPENAI_API_KEY)


def summarize_text(text: str, max_tokens: int = 512) -> str:
    """
    긴 텍스트를 요약. 모델은 config에서 관리.
    """
    # 너무 긴 텍스트는 잘라서 보냄 (MVP에서는 매우 단순하게 처리)
    if len(text) > 8000:
        text = text[:8000]

    completion = client.chat.completions.create(
        model=LLM_MODEL,
        messages=[
            {
                "role": "system",
                "content": "다음 텍스트의 핵심 내용을 한국어로 간결하게 요약해 주세요.",
            },
            {"role": "user", "content": text},
        ],
        max_tokens=max_tokens,
    )
    return completion.choices[0].message.content.strip()
