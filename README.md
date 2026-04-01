# Mediblog 🏥

환자들에게 다가가는 병원 소통 플랫폼

## 개요

Mediblog는 한국의 치과 및 병원을 위한 AI 기반 블로그 생성 플랫폼입니다. 병원 활동 사진을 업로드하면 Google Gemini AI가 사진을 분석하여 환자에게 다가가는 따뜻한 블로그 글을 자동으로 생성합니다.

### 핵심 기능

- 📸 **사진 업로드**: 최대 5장 활동 사진 (드래그 앤 드롭, 순서 변경)
- 🤖 **AI 블로그 생성**: Google Gemini 기반 자동 글 작성
- 😊 **얼굴 모자이크**: 환자 개인정보 보호를 위한 자동 얼굴 처리
- 📋 **네이버 블로그 복사**: 원클릭 HTML 복사
- 🎨 **글쓰기 스타일**: 5가지 스타일, 3가지 길이 옵션

## 기술 스택

| 영역 | 기술 |
|------|------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Backend | Convex (serverless) |
| Auth | Clerk |
| AI | Google Gemini API |
| UI | shadcn/ui + Radix UI |
| Face Detection | face-api.js |

## 시작하기

### 사전 요구사항

- Node.js 18+
- npm 또는 yarn

### 설치 방법

```bash
# 저장소 클론
git clone <YOUR_GIT_URL>
cd mediblog

# 의존성 설치
npm install

# 환경 변수 설정 (.env 파일 생성)
cp .env.example .env
```

### 실행 방법

```bash
# Convex 개발 서버 시작 (터미널 1)
npx convex dev

# 프론트엔드 개발 서버 시작 (터미널 2)
npm run dev
```

개발 서버는 http://localhost:8080에서 실행됩니다.

## 환경 변수

### `.env` (프로젝트 루트)

```bash
VITE_CONVEX_URL=your_convex_deployment_url
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
```

### Convex 대시보드 환경 변수

- `GOOGLE_API_KEY`: Google Gemini API 키

## 주요 명령어

```bash
npm run dev       # 개발 서버 실행
npm run build     # 프로덕션 빌드
npm run lint      # 린트 검사
npm run preview   # 빌드 미리보기
```

## 프로젝트 구조

```
mediblog/
├── src/
│   ├── components/    # React 컴포넌트
│   ├── hooks/         # 커스텀 훅
│   ├── lib/           # 유틸리티
│   ├── pages/         # 페이지 컴포넌트
│   └── types/         # TypeScript 타입
├── convex/            # Convex 백엔드 함수
└── docs/              # 프로젝트 문서
```

## 문서

- [AGENTS.md](./AGENTS.md) - 개발 환경 및 코딩 가이드
- [PROJECT_ANALYSIS.md](./PROJECT_ANALYSIS.md) - 아키텍처 및 비즈니스 로직
- [DOCS_INDEX.md](./DOCS_INDEX.md) - 전체 문서 인덱스

## 라이선스

비공개 프로젝트
