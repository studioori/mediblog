# 📚 Mediblog 문서 인덱스

프로젝트 내 모든 문서 파일의 빠른 탐색을 위한 인덱스

---

## 문서 목록

### [`docs/face-blur-implementation.md`](docs/face-blur-implementation.md)

**얼굴 모자이크 기능 구현 가이드**

- **기술 스택**: face-api.js (`@vladmandic/face-api`) SSD MobileNet V1, Canvas API
- **주요 기능**: 얼굴 감지, 모자이크/이모티콘 처리, 원본 유지 옵션
- **적용 기능**: 처리된 이미지(base64)를 File로 변환하여 업로드 목록에 반영
- **성능**: 1024px 이미지 기준 ~100ms 처리 (감지 80ms + 처리 20ms)
- **감지 성능**: 정면 95%+, 측면 85%+, 마스크 70%+, 작은 얼굴 80%+
- **설정 가이드**: minConfidence(0.2 권장), maxResults(100) 조정 방법 포함
- **모델 전환 이력**: MediaPipe → face-api.js 전환 사유 및 장점 정리

| 관련 기능 | 관련 파일 |
|----------|----------|
| 얼굴 인식, 이미지 처리, 모자이크 | `src/hooks/useFaceDetection.ts`, `src/lib/faceBlur.ts`, `src/components/FaceBlurModal.tsx`, `src/components/PhotoUploader.tsx` |

---

### [`SCREEN_MAPPING.md`](SCREEN_MAPPING.md)

**프로젝트 화면 구성 및 코드 매핑**

- **라우트 구조**: `/` (Index), `/auth` (Auth), `/admin` (Admin), `*` (NotFound)
- **페이지별 상세 분석**: 각 페이지의 화면 구성, 사용 컴포넌트, Hooks 정리
- **컴포넌트 분류**:
  - UI 프리미티브 (shadcn/ui 50+개)
  - 페이지 전용 컴포넌트 (Index용 10개, Admin용 6개)
  - 공유 컴포넌트 (Header, ThemeToggle, NavLink)
- **컴포넌트 계층 구조**: 전체 컴포넌트 트리 다이어그램 (FaceBlurModal 포함)
- **상태 관리 아키텍처**: Provider Stack 구조 (QueryClient, Theme, Auth, Convex)
- **데이터 흐름**: 블로그 생성 플로우, 인증 플로우 시각화
- **Hooks**: usePhotoBlog, useAuth, useToast, useFaceDetection

| 관련 기능 | 관련 파일 |
|----------|----------|
| 라우팅, UI 구조, 컴포넌트 계층, 상태 관리, 얼굴 모자이크 | `src/pages/`, `src/components/`, `src/contexts/AuthContext.tsx` |

---

### [`PROJECT_ANALYSIS.md`](PROJECT_ANALYSIS.md)

**전체 프로젝트 분석 문서**

- **프로젝트 개요**: AI 기반 블로그 생성 플랫폼, 핵심 기능 6가지 (얼굴 모자이크 포함)
- **기술 스택**: React 18, TypeScript, Vite, Convex, Google Gemini API, Clerk, face-api.js
- **프로젝트 구조**: 디렉토리 구조 및 각 폴더 역할 (docs/, hooks/useFaceDetection.ts, lib/faceBlur.ts 포함)
- **데이터베이스 스키마**: profiles (department 필드 제거), user_roles, generated_posts, activity_logs, coupons 테이블 상세
- **핵심 기능 플로우**: 사진 업로드/블로그 생성, 인증, 데모 모드 흐름도
- **AI 블로그 생성 가이드라인**:
  - 의료법 준수 (금지어, 표현 제한)
  - SEO 최적화 가이드
  - 4단계 글쓰기 프레임워크
  - 5가지 글쓰기 스타일, 3가지 글 길이 설정
- **데모 모드 상세 분석**: 구현 방식, 배포 시 제거 파일 목록
- **Convex 함수 구조**: Queries, Mutations, Actions, Internal Mutations 전체 목록
- **보안/성능 고려사항**: 의료법 준수, API 키 보호, 이미지 압축 등

| 관련 기능 | 관련 파일 |
|----------|----------|
| 전체 시스템, 인증, AI 생성, 관리자, DB 스키마, 얼굴 인식 | 전체 프로젝트 |

---

### [`AGENTS.md`](AGENTS.md)

**AI 어시스턴트(WARP)용 프로젝트 가이드**

- **프로젝트 개요**: Mediblog 브랜딩, 타겟 사용자
- **기술 스택**: Frontend/Backend/UI/State Management/Routing, face-api.js
- **공통 명령어**: npm install, dev, build, lint, preview, convex dev
- **환경 변수**: VITE_CONVEX_URL, VITE_CLERK_PUBLISHABLE_KEY, GOOGLE_API_KEY
- **아키텍처**:
  - 디렉토리 구조 (docs/, hooks/useFaceDetection.ts, lib/faceBlur.ts 포함)
  - Convex 함수 패턴 (Queries, Mutations, Actions)
  - 인증 플로우 (Clerk + Convex)
  - 블로그 생성 플로우
- **DB 테이블**: profiles, user_roles, activity_logs, generated_posts, coupons
- **Path Alias**: `@/` → `src/`
- **UI 컴포넌트**: shadcn/ui CLI 사용법
- **한국어 컨텍스트**: 병원명, 지역, 치과, 의원 등 용어
- **브랜딩**: Mediblog 🏥, 서울치과의원 예시, 태그라인
- **마이그레이션 이력**: Supabase→Convex, Lovable→Gemini, 요양원→치과

| 관련 기능 | 관련 파일 |
|----------|----------|
| 개발 환경, 코딩 패턴, 브랜딩, 얼굴 인식 | 전체 프로젝트 |

---

### [`README.md`](README.md)

**Lovable 플랫폼 기본 프로젝트 설명**

- **프로젝트 정보**: Lovable 프로젝트 URL
- **코드 수정 방법**:
  - Lovable 웹 에디터 사용
  - 로컬 IDE 사용 (clone → npm i → npm run dev)
  - GitHub 직접 수정
  - GitHub Codespaces 사용
- **기술 스택**: Vite, TypeScript, React, shadcn-ui, Tailwind CSS
- **배포 방법**: Lovable → Share → Publish
- **커스텀 도메인**: Project > Settings > Domains에서 연결

| 관련 기능 | 관련 파일 |
|----------|----------|
| 프로젝트 배포, 환경 설정 | `package.json`, `.env` |

---

### [`CHANGELOG.md`](CHANGELOG.md)

**버전별 변경 이력 추적**

- **형식**: Keep a Changelog 기반, Semantic Versioning 준수
- **변경 유형**: Added, Changed, Deprecated, Removed, Fixed, Security
- **현재 버전**: 1.0.0 (2026-03-04)
- **주요 변경사항**:
  - 얼굴 모자이크 기능 추가 (face-api.js)
  - DOCS_INDEX.md 문서 관리 체계 도입
  - department 필드 제거
  - Supabase → Convex 마이그레이션

| 관련 기능 | 관련 파일 |
|----------|----------|
| 버전 관리, 변경 이력 | 전체 프로젝트 |

---

## 기능별 문서 매핑

### 🎨 프론트엔드
| 기능 | 추천 문서 |
|------|----------|
| 화면/컴포넌트 구조 | `SCREEN_MAPPING.md` |
| 프로젝트 구조/패턴 | `AGENTS.md`, `PROJECT_ANALYSIS.md` |
| UI 컴포넌트 사용 | `AGENTS.md` |

### 🔧 백엔드/DB
| 기능 | 추천 문서 |
|------|----------|
| DB 스키마 | `PROJECT_ANALYSIS.md` |
| Convex 함수 | `PROJECT_ANALYSIS.md`, `AGENTS.md` |
| 인증 플로우 | `PROJECT_ANALYSIS.md`, `AGENTS.md` |

### 🤖 AI/이미지 처리
| 기능 | 추천 문서 |
|------|----------|
| 얼굴 인식/모자이크 | `docs/face-blur-implementation.md` |
| AI 블로그 생성 가이드라인 | `PROJECT_ANALYSIS.md` |

### 🚀 배포/환경
| 기능 | 추천 문서 |
|------|----------|
| 배포 방법 | `README.md` |
| 환경 변수 설정 | `AGENTS.md`, `PROJECT_ANALYSIS.md` |
| 개발 명령어 | `AGENTS.md` |

### 📋 기획/비즈니스
| 기능 | 추천 문서 |
|------|----------|
| 서비스 개요 | `PROJECT_ANALYSIS.md`, `AGENTS.md` |
| 데모 모드 | `PROJECT_ANALYSIS.md` |
| 브랜딩 | `AGENTS.md` |

### 📝 버전 관리
| 기능 | 추천 문서 |
|------|----------|
| 변경 이력 | `CHANGELOG.md` |

### 📝 버전 관리
| 기능 | 추천 문서 |
|------|----------|
| 변경 이력 | `CHANGELOG.md` |
| 릴리즈 노트 | `CHANGELOG.md` |

### 📝 버전 관리
| 기능 | 추천 문서 |
|------|----------|
| 변경 이력 | `CHANGELOG.md` |

---

## 문서 업데이트 이력

| 날짜 | 문서 | 변경 내용 |
|------|------|----------|
| 2026-03-04 | `SCREEN_MAPPING.md` | FaceBlurModal 컴포넌트, useFaceDetection 훅, 컴포넌트 계층 구조 업데이트 |
| 2026-03-04 | `PROJECT_ANALYSIS.md` | 얼굴 인식 기능 추가, department 필드 제거, 기술 스택(face-api.js) 업데이트 |
| 2026-03-04 | `AGENTS.md` | 얼굴 인식 관련 파일 구조, docs/ 폴더 추가 |
| 2026-03-04 | `docs/face-blur-implementation.md` | 적용 기능 섹션 추가 (onApply prop, base64ToFile) |
| 2026-03-04 | `DOCS_INDEX.md` | CHANGELOG.md 섹션 추가, 버전 관리 매핑 추가 |
| 2026-03-03 | `SCREEN_MAPPING.md` | 최초 작성 |
| 2026-03-03 | `PROJECT_ANALYSIS.md` | 최초 작성 |
