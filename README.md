# AI Bookmarker (Chrome Extension Only)

> 북마크를 AI로 요약·그룹화하고, GA4와 BigQuery로 사용자 여정을 분석하는 크롬 확장 프로그램

## 기능 개요

1. **크롬 익스텐션만 배포**
   - 별도 서버 없이 동작
   - 사용자가 직접 **OpenAI 또는 Google (Gemini)** API Key를 설정

2. **AI 기반 북마크 관리**
   - 사이드패널에서 크롬 북마크 트리를 조회
   - 여러 북마크를 선택하여 AI로 **요약** 또는 **그룹화** 요청
   - 사이드패널에서 직접 **AI 모델 선택** 및 **작업(Action)** 선택 가능
   - AI가 제안한 그룹을 실제 북마크 폴더로 생성하는 기능
   - 요약/그룹화 결과를 Markdown 형식으로 클립보드에 복사

3. **GA4 + BigQuery 기반 사용자 여정 분석**
   - GA4 Measurement Protocol로 이벤트 전송
   - `app_opened`, `settings_saved`, `summary_requested`, `grouping_succeeded`, `folders_created_from_group` 등 핵심 사용자 행동 이벤트 기록
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
│   ├── sidepanel.html
│   ├── sidepanel.js
│   ├── options.html
│   ├── options.js
│   ├── styles.css
│   └── libs/
│       ├── analytics.js
│       └── ai_client.js
├── docker/
│   └── build-extension.Dockerfile
├── .gitignore
└── README.md
