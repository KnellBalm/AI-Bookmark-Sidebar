# 📘 AI Bookmark Sidebar

크롬 북마크를 선택하여 **AI가 요약·정리하고**, 서버에 **벡터 기반 검색**으로 저장하는 확장 프로그램


```
──────────────────────────────────────────────────────────
                  CLIENT (Chrome Extension)
──────────────────────────────────────────────────────────
  - 북마크 트리 / 선택 UI
  - 요약 카드 뷰
  - Keep/Delete 체크
  - 삭제 후보 숨기기
  - Markdown export
  - 이벤트 트래킹 (내부 + GA4)
  - 모든 서버 호출: /ingest /summary /export_markdown /event
──────────────────────────────────────────────────────────
                  API SERVER (FastAPI)
──────────────────────────────────────────────────────────
  - /ingest (크롤링 + 임베딩 생성)
  - /summarize (OpenAI + fallback local)
  - /bulk_summarize
  - /classify_bookmarks (AI 기반 삭제권장)
  - /export_markdown
  - /event (트래킹 데이터 수집)
  - OpenAI client lazy init
  - Rodem: MCP 엔드포인트 제공 (/tools)
──────────────────────────────────────────────────────────
                  VECTOR DB (Qdrant)
──────────────────────────────────────────────────────────
  - 북마크 문서 저장
  - 벡터 검색
──────────────────────────────────────────────────────────
                  ANALYTICS
──────────────────────────────────────────────────────────
  • Client: Google Analytics 4 (GA4)
  • Server: 내부 Tracking DB (DuckDB/SQLite → Clickhouse 확장)
──────────────────────────────────────────────────────────
                  CHATGPT + MCP
──────────────────────────────────────────────────────────
  - ChatGPT에서 북마크 검색/요약/분류 가능
  - “북마크 세션 자동 정리”
  - “블로그 초안 자동 생성”

```


---

## 📌 개요

**AI Bookmark Sidebar**는 크롬 북마크를 불러와
선택한 북마크만 AI 서버로 보내어 다음 작업을 수행하는 도구입니다.

* 북마크 선택
* 선택된 북마크 내용 AI 요약
* 서버(Qdrant)에 벡터 형태로 저장
* 개인 지식베이스 구축 가능

서버는 **FastAPI + Qdrant + SentenceTransformer**,
클라이언트는 **Chrome Extension(사이드패널 UI)** 로 구성됩니다.

---

## ✨ 주요 기능

### ✔ 북마크 트리 자동 로드

Chrome의 `chrome.bookmarks` API를 사용합니다.

### ✔ 북마크 선택 UI

* 체크박스 기반 선택
* 선택된 북마크는 상단 태그로 표시

### ✔ /ingest 로 저장

선택된 URL을 서버에 보내어
크롤링 → 텍스트 추출 → 임베딩 → Qdrant 저장

### ✔ 선택된 북마크 요약

* AI로 각 URL 요약
* 필요시 여러 문서 요약 합치기(Super-summary)

### ✔ FastAPI 검색 API

SentenceTransformer 임베딩 기반 벡터 검색

---

## 🏛 시스템 아키텍처

```
[Chrome Extension]
   - 사이드바 UI
   - 북마크 읽기
   - /ingest 호출
   - /summarize 호출

            ↓

[FastAPI Server]
   - /ingest
   - /search
   - /summarize
   - SentenceTransformer
   - Qdrant(Local)

            ↓

[Qdrant Vector DB]
   - 임베딩 저장
   - 벡터 기반 검색
```

---

## 📁 프로젝트 구조

```
bookmark-extension/
  ├── manifest.json
  ├── background.js
  ├── sidepanel.html
  └── sidepanel.js

mcp-server/
  ├── server.py
  ├── services/
  │    ├── db.py
  │    ├── embedding.py
  │    └── crawler.py
  ├── tools/
  │    ├── ingest.py
  │    ├── search.py
  │    ├── summarize.py
  │    └── related.py
  ├── models/
  │    └── schema.py
  └── config.py
```

---

## 💻 Chrome 확장 설치

### 1) 폴더 준비

아래 네 파일을 `bookmark-extension/` 에 배치:

```
manifest.json  
background.js  
sidepanel.html  
sidepanel.js
```

### 2) Chrome 설정

1. Chrome → `chrome://extensions/`
2. 우측 상단 **개발자 모드 ON**
3. **압축해제된 확장 프로그램 로드**
4. `bookmark-extension` 폴더 선택

### 3) 확장 아이콘 클릭 → 사이드패널 열기

---

## 🖼 사이드패널 UI 기능

* 북마크 트리 폴더/URL 표시
* 체크박스로 선택 가능
* 선택된 URL은 상단 태그로 표시
* **AI에 저장(Ingest)** 버튼
* **요약하기** 버튼
* 요약 결과를 하단에 표시

---

## 🔌 FastAPI 서버 실행 방법

### 1) 패키지 설치

```
pip install fastapi uvicorn qdrant-client sentence-transformers requests beautifulsoup4 httpx
```

### 2) Qdrant 실행

```
docker run -p 6333:6333 qdrant/qdrant
```

### 3) config.py 예시

```
SERVER_PORT = 18182
QDRANT_URL = "http://localhost:6333"
QDRANT_COLLECTION = "bookmarks"
```

### 4) 서버 실행

```
uvicorn server:app --host 0.0.0.0 --port 18182 --reload
```

---

## 🔥 API 엔드포인트

### 📌 1) Ingest

```
POST /ingest
{
  "url": "https://example.com"
}
```

### 📌 2) Search

```
POST /search
{
  "query": "deep learning",
  "limit": 5
}
```

### 📌 3) Summarize

```
POST /summarize
{
  "id": "문서ID"
}
```

---

## 🧠 기술 스택

| 분야         | 기술                             |
| ---------- | ------------------------------ |
| Browser UI | Chrome Extension (Manifest V3) |
| UI         | HTML + JS                      |
| 서버         | FastAPI                        |
| 임베딩        | SentenceTransformer            |
| 벡터 DB      | Qdrant                         |
| 크롤링        | BeautifulSoup                  |
| AI         | 요약 모델                          |

---

## 🚀 향후 개발 가능 기능

* 북마크 자동 클러스터링 추천
* 요약 히스토리 저장 기능
* 사이드패널에서 검색 지원
* 태그 자동 생성
* 다크 모드 / 반응형 UI
* 자동 Ingest 스케줄링

---

## 🏁 마무리

**AI Bookmark Sidebar**는
단순한 북마크 관리가 아니라
**개인 지식 관리(PKM)** 시스템을 구축하기 위한 프로젝트입니다.

추가 기능, UI 개선 등 요청 주시면 계속 확장해 드립니다.
