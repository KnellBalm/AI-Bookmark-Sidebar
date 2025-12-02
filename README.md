# AI Bookmarker (Chrome Extension Only)

> 북마크를 AI로 정리하고, GA4 + BigQuery로 사용자 여정을 분석하기 위한 실험용 크롬 확장 프로그램

## 기능 개요

1. **크롬 익스텐션만 배포**
   - 별도 서버 없이 동작
   - 사용자가 직접 OpenAI API Key를 설정 (옵션 페이지)

2. **북마크 트리 조회 + 선택 요약**
   - 사이드패널에서 크롬 북마크 트리를 조회
   - 여러 북마크를 선택해 OpenAI로 요약 요청
   - 요약 결과를 Markdown 형식으로 표시 (복사 후 Notion/블로그에 활용)

3. **GA4 + BigQuery 기반 사용자 여정 분석**
   - GA4 Measurement Protocol로 이벤트 전송
   - `summary_requested`, `summary_succeeded`, `summary_failed` 등 이벤트 기록
   - GA4 → BigQuery Export 연동 시, SQL 기반 사용자 분석 가능

4. **Docker 기반 빌드**
   - `docker/build-extension.Dockerfile` 로 익스텐션 zip 자동 생성
   - 수동으로 zip 압축하지 않고, Docker 실행만으로 배포 아티팩트 생성

---

## 디렉토리 구조

```bash
ai-bookmarker/
├── extension/
│   ├── manifest.json
│   ├── background.js
│   ├── content.js
│   ├── sidepanel.html
│   ├── sidepanel.js
│   ├── options.html
│   ├── options.js
│   ├── styles.css
│   └── libs/
│       ├── analytics.js
│       └── gpt_client.js
├── docker/
│   └── build-extension.Dockerfile
├── .gitignore
└── README.md
