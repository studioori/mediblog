# Mediblog 화면 구성 및 코드 매핑

## 목차
- [라우트 구조](#라우트-구조)
- [페이지별 상세 분석](#페이지별-상세-분석)
- [컴포넌트 분류](#컴포넌트-분류)
- [컴포넌트 계층 구조](#컴포넌트-계층-구조)

---

## 라우트 구조

| 라우트 | 페이지 컴포넌트 | 목적 |
|--------|----------------|------|
| `/` | `src/pages/Index.tsx` | 메인 홈페이지 - AI 블로그 생성 |
| `/auth` | `src/pages/Auth.tsx` | 로그인, 회원가입, 데모 모드 |
| `/admin` | `src/pages/Admin.tsx` | 관리자 대시보드 |
| `*` | `src/pages/NotFound.tsx` | 404 에러 페이지 |

---

## 페이지별 상세 분석

### 1. 메인 페이지 (`/`) - Index.tsx

**파일**: `src/pages/Index.tsx`

**목적**: 사진 업로드 → AI 블로그 생성

**화면 구성**:

```
┌─────────────────────────────────────────┐
│ Header (네비게이션, 사용자 메뉴)         │
├─────────────────────────────────────────┤
│ [데모 모드 배너] (데모 활성 시)          │
├─────────────────────────────────────────┤
│ [관리자 시뮬레이션 바] (관리자만)        │
├─────────────────────────────────────────┤
│ [비활성화/사용량 초과 알림]              │
├─────────────────────────────────────────┤
│ 🦷 히어로 섹션                           │
│   "사진으로 건강한 이야기를 만들어보세요" │
├─────────────────────────────────────────┤
│ PhotoUploader (사진 업로드)              │
│   - 드래그 앤 드롭                       │
│   - 최대 5장                            │
│   - 키워드 입력                          │
│   - 순서 변경 (dnd-kit)                 │
├─────────────────────────────────────────┤
│ [블로그 생성 버튼]                       │
├─────────────────────────────────────────┤
│ PhotoBlogResult (생성된 결과)            │
│   - 제목 표시                            │
│   - 본문 (이미지 + 텍스트)               │
│   - 해시태그                             │
│   - 네이버 블로그 복사 버튼              │
├─────────────────────────────────────────┤
│ CouponRedeem (이용권 등록)               │
├─────────────────────────────────────────┤
│ RecentPostsList (최근 생성 글)           │
├─────────────────────────────────────────┤
│ Footer                                   │
└─────────────────────────────────────────┘
```

**사용 컴포넌트**:

| 컴포넌트 | 파일 경로 | 용도 |
|----------|-----------|------|
| Header | `src/components/Header.tsx` | 상단 네비게이션 |
| PhotoUploader | `src/components/PhotoUploader.tsx` | 사진 업로드 UI |
| PhotoBlogResult | `src/components/PhotoBlogResult.tsx` | 생성된 블로그 표시 |
| RecentPostsList | `src/components/RecentPostsList.tsx` | 최근 글 목록 |
| CouponRedeem | `src/components/CouponRedeem.tsx` | 쿠폰 등록 |
| AdminSimulationBar | `src/components/AdminSimulationBar.tsx` | 관리자 시뮬레이션 |
| Button, Alert | `src/components/ui/*.tsx` | shadcn/ui |

**Hooks**:
- `usePhotoBlog` - 블로그 생성 로직
- `useAuth` - 인증 상태
- `useToast` - 알림

---

### 2. 인증 페이지 (`/auth`) - Auth.tsx

**파일**: `src/pages/Auth.tsx`

**목적**: 로그인, 회원가입, 데모 모드 진입

**화면 구성**:

```
┌─────────────────────────────────────────┐
│         배경 (그라데이션 + 장식)         │
│  ┌─────────────────────────────────┐    │
│  │ 🏥 Mediblog                     │    │
│  │ 환자들에게 다가가는 병원 소통 플랫폼│    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ [로그인] [회원가입] (탭)         │    │
│  ├─────────────────────────────────┤    │
│  │ 로그인 폼:                       │    │
│  │   이메일                         │    │
│  │   비밀번호                       │    │
│  │   [이메일 기억하기]              │    │
│  │   [로그인 버튼]                  │    │
│  ├─────────────────────────────────┤    │
│  │ 회원가입 폼:                     │    │
│  │   병원명                         │    │
│  │   지역                           │    │
│  │   이메일                         │    │
│  │   비밀번호                       │    │
│  │   [회원가입 버튼]                │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ ▶ 데모 체험하기                  │    │
│  │   병원명: [서울치과의원]         │    │
│  │   지역: [서울 강남구]            │    │
│  │   [데모 시작하기]                │    │
│  └─────────────────────────────────┘    │
│                                         │
│  📋 회원가입 후 관리자 승안내            │
└─────────────────────────────────────────┘
```

**사용 컴포넌트**:

| 컴포넌트 | 파일 경로 | 용도 |
|----------|-----------|------|
| Tabs | `src/components/ui/tabs.tsx` | 로그인/회원가입 전환 |
| Input | `src/components/ui/input.tsx` | 입력 필드 |
| Label | `src/components/ui/label.tsx` | 라벨 |
| Checkbox | `src/components/ui/checkbox.tsx` | 이메일 기억하기 |
| Button | `src/components/ui/button.tsx` | 버튼 |
| Alert | `src/components/ui/alert.tsx` | 에러 메시지 |

**인증 방식**:
- Clerk (`useSignIn`, `useSignUp`)
- Convex mutations (`createProfile`, `createOrUpdateUserRole`)

---

### 3. 관리자 페이지 (`/admin`) - Admin.tsx

**파일**: `src/pages/Admin.tsx`

**목적**: 사용자 관리, 통계, 쿠폰 발급

**화면 구성**:

```
┌─────────────────────────────────────────┐
│ AdminHeader (관리자 네비게이션)          │
├─────────────────────────────────────────┤
│ StatsWidgets (통계 카드 4개)             │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐   │
│ │총업체│ │승인대기│ │오늘생성│ │월간사용│   │
│ └──────┘ └──────┘ └──────┘ └──────┘   │
├─────────────────────────────────────────┤
│ [활동 모니터링] [업체 관리] [쿠폰 관리]   │
├─────────────────────────────────────────┤
│                                         │
│ ▶ 활동 모니터링 탭:                      │
│   GlobalActivityFeed (실시간 활동)       │
│                                         │
│ ▶ 업체 관리 탭:                          │
│   ┌─────────────────────────────────┐   │
│   │ 승인 대기 중인 업체              │   │
│   │ (테이블: 병원명, 지역, 이메일..)  │   │
│   └─────────────────────────────────┘   │
│   ┌─────────────────────────────────┐   │
│   │ 업체 목록                        │   │
│   │ (테이블: 병원명, 지역, 사용률,    │   │
│   │  최근접속, 누적생성, 상태, 관리)  │   │
│   └─────────────────────────────────┘   │
│                                         │
│ ▶ 쿠폰 관리 탭:                          │
│   CouponGenerator (쿠폰 생성기)          │
│                                         │
├─────────────────────────────────────────┤
│ [모달들]                                 │
│ - Edit Dialog (업체 정보 수정)           │
│ - Delete Confirm (삭제 확인)             │
│ - StyleConfigModal (스타일 설정)         │
│ - UsageHistoryModal (이용 통계)          │
└─────────────────────────────────────────┘
```

**사용 컴포넌트**:

| 컴포넌트 | 파일 경로 | 용도 |
|----------|-----------|------|
| AdminHeader | `src/components/admin/AdminHeader.tsx` | 관리자 네비게이션 |
| StatsWidgets | `src/components/admin/StatsWidgets.tsx` | 통계 카드 |
| GlobalActivityFeed | `src/components/admin/GlobalActivityFeed.tsx` | 활동 피드 |
| StyleConfigModal | `src/components/admin/StyleConfigModal.tsx` | 스타일 설정 |
| UsageHistoryModal | `src/components/admin/UsageHistoryModal.tsx` | 이용 통계 |
| CouponGenerator | `src/components/admin/CouponGenerator.tsx` | 쿠폰 생성 |
| Card, Table, Dialog, Switch, Select, AlertDialog, Tabs, Badge, Progress | `src/components/ui/*.tsx` | shadcn/ui |

**관리 기능**:
- 승인 대기 업체 관리
- 사용자 프로필 수정/삭제
- 요금제 설정 (trial/basic/premium)
- 월간 한도 설정
- 스타일 설정

---

### 4. 404 페이지 (`*`) - NotFound.tsx

**파일**: `src/pages/NotFound.tsx`

**화면 구성**:

```
┌─────────────────────────────────────────┐
│                                         │
│              404                        │
│     Oops! Page not found               │
│        Return to Home                  │
│                                         │
└─────────────────────────────────────────┘
```

---

## 컴포넌트 분류

### 1. UI 프리미티브 (shadcn/ui)
**위치**: `src/components/ui/`

50+ 기본 컴포넌트:

| 카테고리 | 컴포넌트 |
|----------|----------|
| 버튼 | button, toggle, toggle-group |
| 입력 | input, textarea, label, checkbox, radio-group, switch, select, slider |
| 레이아웃 | card, dialog, sheet, sidebar, tabs, accordion, collapsible |
| 피드백 | alert, alert-dialog, toast, toaster, sonner, progress, skeleton |
| 네비게이션 | dropdown-menu, navigation-menu, menubar, breadcrumb |
| 데이터 | table, pagination, chart |
| 기타 | badge, avatar, tooltip, separator, scroll-area, calendar |

### 2. 페이지 전용 컴포넌트

#### Index 페이지용
| 컴포넌트 | 파일 | 용도 |
|----------|------|------|
| PhotoUploader | `src/components/PhotoUploader.tsx` | 사진 업로드 (드래그, 압축, 순서변경) |
| PhotoBlogResult | `src/components/PhotoBlogResult.tsx` | 생성된 블로그 표시 |
| RecentPostsList | `src/components/RecentPostsList.tsx` | 최근 생성 글 목록 |
| CouponRedeem | `src/components/CouponRedeem.tsx` | 쿠폰 등록 |
| AdminSimulationBar | `src/components/AdminSimulationBar.tsx` | 관리자 시뮬레이션 |
| LoadingSkeleton | `src/components/LoadingSkeleton.tsx` | 로딩 상태 |
| GeneratedContent | `src/components/GeneratedContent.tsx` | 생성 콘텐츠 표시 |
| ActivityForm | `src/components/ActivityForm.tsx` | 활동 입력 폼 |
| CategoryChips | `src/components/CategoryChips.tsx` | 카테고리 선택 |

#### Admin 페이지용
| 컴포넌트 | 파일 | 용도 |
|----------|------|------|
| AdminHeader | `src/components/admin/AdminHeader.tsx` | 관리자 네비게이션 |
| StatsWidgets | `src/components/admin/StatsWidgets.tsx` | 통계 카드 4개 |
| GlobalActivityFeed | `src/components/admin/GlobalActivityFeed.tsx` | 전체 활동 피드 |
| StyleConfigModal | `src/components/admin/StyleConfigModal.tsx` | 글쓰기 스타일 설정 |
| UsageHistoryModal | `src/components/admin/UsageHistoryModal.tsx` | 이용 통계 모달 |
| CouponGenerator | `src/components/admin/CouponGenerator.tsx` | 쿠폰 생성기 |

### 3. 공유 컴포넌트

| 컴포넌트 | 파일 | 사용 페이지 | 용도 |
|----------|------|-------------|------|
| Header | `src/components/Header.tsx` | Index, Auth | 메인 네비게이션 |
| ThemeToggle | `src/components/ThemeToggle.tsx` | Header, AdminHeader | 다크/라이트 모드 |
| NavLink | `src/components/NavLink.tsx` | Header | 네비게이션 링크 |

---

## 컴포넌트 계층 구조

```
App.tsx (Provider Stack)
├── QueryClientProvider (TanStack Query)
├── ThemeProvider (next-themes)
├── AuthProvider (Clerk + Convex)
├── TooltipProvider
├── Toaster / Sonner
└── Routes
    │
    ├── Index (/) ────────────────────────────────
    │   ├── Header
    │   │   ├── NavLink (홈)
    │   │   ├── ThemeToggle
    │   │   └── UserMenu (프로필, 로그아웃)
    │   │
    │   ├── [데모 모드 배너] (조건부)
    │   │
    │   ├── AdminSimulationBar (관리자만)
    │   │
    │   ├── Alert (비활성화/사용량 초과)
    │   │
    │   ├── 히어로 섹션 (타이틀)
    │   │
    │   ├── PhotoUploader
    │   │   ├── DropZone
    │   │   ├── PhotoItem[] (드래그 가능)
    │   │   └── KeywordInput
    │   │
    │   ├── Button (블로그 생성)
    │   │
    │   ├── PhotoBlogResult
    │   │   ├── Title
    │   │   ├── Content (이미지 + 텍스트)
    │   │   ├── Hashtags
    │   │   └── CopyButton
    │   │
    │   ├── CouponRedeem
    │   │   └── Dialog (쿠폰 입력)
    │   │
    │   ├── RecentPostsList
    │   │   └── PostItem[] (미리보기 모달)
    │   │
    │   └── Footer
    │
    ├── Auth (/auth) ─────────────────────────────
    │   ├── 브랜드 헤더 (로고, 타이틀)
    │   │
    │   ├── Tabs (로그인 | 회원가입)
    │   │   ├── 로그인 탭
    │   │   │   ├── Input (이메일)
    │   │   │   ├── Input (비밀번호)
    │   │   │   ├── Checkbox (이메일 기억)
    │   │   │   └── Button (로그인)
    │   │   │
    │   │   └── 회원가입 탭
    │   │       ├── Input (병원명)
    │   │       ├── Input (지역)
    │   │       ├── Input (이메일)
    │   │       ├── Input (비밀번호)
    │   │       └── Button (회원가입)
    │   │
    │   ├── 데모 모드 섹션
    │   │   ├── Input (병원명)
    │   │   ├── Input (지역)
    │   │   └── Button (데모 시작)
    │   │
    │   └── 하단 안내
    │
    ├── Admin (/admin) ──────────────────────────
    │   ├── AdminHeader
    │   │   ├── Logo
    │   │   ├── ThemeToggle
    │   │   └── UserMenu
    │   │
    │   ├── StatsWidgets
    │   │   ├── StatCard (총 업체)
    │   │   ├── StatCard (승인 대기)
    │   │   ├── StatCard (오늘 생성)
    │   │   └── StatCard (월간 사용)
    │   │
    │   ├── Tabs (활동 모니터링 | 업체 관리 | 쿠폰 관리)
    │   │   │
    │   │   ├── 활동 모니터링 탭
    │   │   │   └── GlobalActivityFeed
    │   │   │
    │   │   ├── 업체 관리 탭
    │   │   │   ├── Card (승인 대기)
    │   │   │   │   └── Table
    │   │   │   │       └── TableRow[]
    │   │   │   │
    │   │   │   └── Card (업체 목록)
    │   │   │       └── Table
    │   │   │           └── TableRow[]
    │   │   │               ├── Badge (상태)
    │   │   │               ├── Progress (사용률)
    │   │   │               └── Button[] (관리)
    │   │   │
    │   │   └── 쿠폰 관리 탭
    │   │       └── CouponGenerator
    │   │
    │   ├── Dialog (업체 수정)
    │   │   ├── Input (이메일)
    │   │   ├── Input (병원명)
    │   │   ├── Input (지역)
    │   │   ├── Select (요금제)
    │   │   ├── Input (월간 한도)
    │   │   ├── Input (최대 이미지)
    │   │   ├── Switch (활성화)
    │   │   └── Button (저장)
    │   │
    │   ├── AlertDialog (삭제 확인)
    │   │
    │   ├── StyleConfigModal
    │   │   ├── Select (글쓰기 스타일)
    │   │   ├── Select (글 길이)
    │   │   ├── Switch (이모지 사용)
    │   │   ├── Textarea (커스텀 프롬프트)
    │   │   └── Button (저장)
    │   │
    │   └── UsageHistoryModal
    │       └── ActivityChart
    │
    └── NotFound (*) ────────────────────────────
        └── 404 메시지
```

---

## 상태 관리 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│                    Providers (App.tsx)                  │
├─────────────────────────────────────────────────────────┤
│ QueryClientProvider (TanStack Query)                    │
│   └─ 서버 상태 캐싱, 자동 리프레시                        │
├─────────────────────────────────────────────────────────┤
│ ThemeProvider (next-themes)                             │
│   └─ 다크/라이트 모드                                    │
├─────────────────────────────────────────────────────────┤
│ AuthProvider (AuthContext.tsx)                          │
│   ├─ Clerk 인증 상태                                     │
│   ├─ Convex 프로필 데이터                                │
│   ├─ 데모 모드 상태                                      │
│   └─ 권한 관리 (admin/user)                              │
├─────────────────────────────────────────────────────────┤
│ ConvexProvider                                           │
│   ├─ useQuery (실시간 데이터 구독)                       │
│   ├─ useMutation (데이터 수정)                           │
│   └─ useAction (AI 생성 등 외부 API)                     │
└─────────────────────────────────────────────────────────┘
```

---

## 데이터 흐름

### 블로그 생성 플로우

```
[사용자]
    ↓ 사진 선택
[PhotoUploader]
    ↓ 압축, Data URL 변환
[usePhotoBlog Hook]
    ↓ generateBlog Action 호출
[Convex Action]
    ↓ Google Gemini API 호출
    ↓ 이미지 분석, 텍스트 생성
    ↓ JSON 응답 파싱
[PhotoBlogResult]
    ↓ 결과 표시
    ↓ 네이버 블로그 복사
[사용자]
```

### 인증 플로우

```
[Auth.tsx]
    ↓ 로그인/회원가입
[Clerk API]
    ↓ 세션 생성
[AuthContext]
    ↓ 프로필 조회/생성
[Convex]
    ↓ 권한 확인
[페이지 리다이렉트]
```

---

## 파일 요약

### 페이지 파일 (4개)
- `src/pages/Index.tsx` - 메인 블로그 생성
- `src/pages/Auth.tsx` - 인증
- `src/pages/Admin.tsx` - 관리자 대시보드
- `src/pages/NotFound.tsx` - 404

### 커스텀 컴포넌트 (16개)
- 공유: Header, ThemeToggle, NavLink
- Index용: PhotoUploader, PhotoBlogResult, RecentPostsList, CouponRedeem, AdminSimulationBar, LoadingSkeleton, GeneratedContent, ActivityForm, CategoryChips
- Admin용: AdminHeader, StatsWidgets, GlobalActivityFeed, StyleConfigModal, UsageHistoryModal, CouponGenerator

### UI 프리미티브 (50+개)
- `src/components/ui/` - shadcn/ui 컴포넌트들

---

*문서 작성일: 2026-03-03*
