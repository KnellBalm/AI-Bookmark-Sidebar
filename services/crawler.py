# services/crawler.py
import logging
from typing import Tuple

import requests
import trafilatura

logger = logging.getLogger(__name__)


def fetch_text(url: str) -> Tuple[str, str]:
    """
    주어진 URL에서 HTML을 가져와 trafilatura로 본문 텍스트와 제목을 추출.
    로그인/인증이 필요한 페이지는 실패할 수 있음.
    """
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
        }
        resp = requests.get(url, headers=headers, timeout=10)
        resp.raise_for_status()
    except Exception as e:
        logger.error(f"Failed to fetch url={url}: {e}")
        raise

    downloaded = trafilatura.fetch_url(url)
    if downloaded is None:
        # fallback: 직접 HTML 사용
        downloaded = resp.text

    text = trafilatura.extract(downloaded, include_comments=False, include_tables=False)
    if not text:
        text = ""

    # 메타데이터에서 제목 추출 시도
    meta = trafilatura.extract_metadata(downloaded)
    title = meta.title if meta and meta.title else url

    return text, title
