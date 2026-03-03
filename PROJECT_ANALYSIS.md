# Mediblog 프로젝트 분석

## 프로젝트 개요

**Mediblog**는 한국의 치과 및 병원을 위한 AI 기반 블로그 생성 플랫폼입니다. 사용자가 병원 활동 사진을 최대 5장 업로드하면, Google Gemini AI가 사진을 분석하여 환자에게 다가가는 따뜻한 블로그 글을 자동으로 생성합니다.

### 핵심 기능

1. **사진 업로드**: 최대 5장의 병원 활동 사진 업로드 (드래그 앤 드롭 지원)
2. **AI 블로그 생성**: Google Gemini API를 활용하여 사진 분석 및 블로그 글 작성
3. **네이버 블로그 복사**: 생성된 글을 네이버 블로그용 HTML 형식으로 복사
4. **얼굴 모자이크 처리**: 업로드된 사진에서 얼굴을 감지하여 모자이크/이모티콘 처리 (face-api.js)
5. **데모 모드**: 회원가입 없이 서비스 테스트 가능 (배포 시 제거 예정)
6. **관리자 패널**: 사용자 관리, 통계 확인, 쿠폰 생성 기능

---

## 기술 스택

### 프론트엔드
- **React 18**: UI 라이브러리
- **TypeScript**: 타입 안전성
- **Vite**: 빠른 빌드 도구 (포트 8080)
- **TanStack Query**: 서버 상태 관리
- **React Router**: 라우팅
- **Tailwind CSS**: 스타일링
- **shadcn/ui**: UI 컴포넌트 라이브러리

### 백엔드
- **Convex**: 서버리스 백엔드 플랫폼 (실시간 구독 지원)
  - 데이터베이스
  - API 서버
  - 실시간 업데이트
- **Google Gemini API**: AI 블로그 생성 (Gemini 2.5 Flash 모델)
- **Clerk**: 사용자 인증

### 기타 라이브러리
- **browser-image-compression**: 이미지 압축 (클라이언트)
- **dnd-kit**: 드래그 앤 드롭, 사진 순서 변경
- **face-api.js**: 얼굴 인식 및 모자이크 처리 (`@vladmandic/face-api`)
- **sonner**: 토스트 알림
- **next-themes**: 다크 모드 지원

---

## 프로젝트 구조

```
mediblog/
├── convex/                    # Convex 백엔드 함수들
│   ├── schema.ts            # 데이터베이스 스키마 정의
│   ├── users.ts             # 사용자 관리 (프로필, 권한, 사용량)
│   ├── posts.ts             # 블로그 포스트 CRUD
│   ├── generateBlog.ts      # AI 블로그 생성 (Gemini API)
│   ├── admin.ts            # 관리자 기능
│   ├── coupons.ts           # 쿠폰 관리
│   └── crons.ts            # 스케줄러 작업 (사용량 리셋)
│
├── docs/                      # 프로젝트 문서
│   └── face-blur-implementation.md  # 얼굴 모자이크 기능 구현 가이드
│
├── src/                      # 프론트엔드 소스
│   ├── components/            # React 컴포넌트
│   │   ├── admin/           # 관리자용 컴포넌트
│   │   ├── ui/             # shadcn/ui 기본 컴포넌트
│   │   └── FaceBlurModal.tsx # 얼굴 모자이크 처리 모달
│   ├── contexts/            # React Context
│   ├── hooks/               # Custom Hooks
│   │   ├── useFaceDetection.ts  # 얼굴 인식 훅 (face-api.js)
│   │   └── usePhotoBlog.ts      # 블로그 생성 로직
│   ├── lib/                 # 유틸리티 함수
│   │   ├── faceBlur.ts      # 모자이크/이모티콘 처리
│   │   └── utils.ts         # 공통 유틸리티
│   ├── pages/               # 페이지 컴포넌트
│   └── types/               # TypeScript 타입 정의
│
├── public/                   # 정적 파일
├── .env                     # 환경 변수
└── package.json              # 프로젝트 설정
```

---

## 데이터베이스 스키마 (Convex)

### 주요 테이블

#### `profiles`
사용자 프로필 및 구독 정보
- `clerk_id`: Clerk 사용자 ID
- `email`: 이메일
- `center_name`: 병원명
- `region`: 지역 (선택)
- `plan_tier`: 플랜 등급 (free/basic/premium)
- `monthly_limit`: 월간 생성 제한
- `current_usage`: 현재 사용량
- `is_active`: 활성 상태 (관리자 승인 필요)
- `style_config`: 글쓰기 스타일 설정 (JSON)
- `writing_tone_prompt`: 글쓰기 톤 프롬프트
- `writing_style`: 글 스타일 (warm_friendly/energetic_cheerful/calm_professional/poetic_emotional/concise_clear)
- `content_length`: 글 길이 (short/medium/long)
- `use_emoji`: 이모지 사용 여부
- `max_image_count`: 최대 이미지 개수
- `subscription_expires_at`: 구독 만료일 (Unix timestamp)
- `intro_greeting`: 인사말 (선택)
- `outro_signature`: 결어 (선택)

#### `user_roles`
사용자 권한 관리
- `user_id`: 사용자 ID
- `role`: 권한 (admin/user)

#### `generated_posts`
생성된 블로그 포스트
- `user_id`: 사용자 ID (선택 - 데모 모드에서는 null)
- `content`: 포스트 내용
- `image_paths`: 이미지 경로 배열
- `title`: 포스트 제목 (선택)
- `category`: 카테고리 (선택)
- `status`: 상태 (draft/published/archived)
- `created_at`: 생성일 (Unix timestamp)

#### `activity_logs`
사용자 활동 로그
- `user_id`: 사용자 ID
- `action_type`: 액션 타입 (예: "post_generated", "login", "coupon_redeemed")
- `metadata`: 추가 메타데이터 (JSON)
- `created_at`: 생성일 (Unix timestamp)

#### `coupons`
쿠폰 관리
- `code`: 쿠폰 코드 (고유)
- `duration_months`: 유효 기간 (개월)
- `is_used`: 사용 여부
- `used_by`: 사용한 사용자 ID (선택)
- `used_at`: 사용일 (선택)
- `created_by`: 생성자 ID (선택)
- `created_at`: 생성일 (Unix timestamp)
- `description`: 쿠폰 설명 (선택)

---

## 핵심 기능 플로우

### 1. 사진 업로드 및 블로그 생성

```
[사용자]
    ↓
[PhotoUploader 컴포넌트]
    ├─ 사진 선택 (최대 5장)
    ├─ 드래그 앤 드롭 지원
    ├─ 이미지 압축 (1MB 이하, 1024x1024)
    ├─ 순서 변경 (dnd-kit)
    └─ 키워드 입력 (진료과별 예시 제공)
    ↓
[usePhotoBlog Hook]
    ├─ 이미지를 Data URL로 변환
    ├─ generateBlog Action 호출 (Convex)
    └─ 사용량 증가 및 활동 로그 기록 (비데모)
    ↓
[generateBlog.ts (Convex Action)]
    ├─ Google Gemini API 호출
    │   ├─ 이미지 분석 (base64)
    │   ├─ 시스템 프롬프트 적용
    │   ├─ 4단계 글쓰기 프레임워크
    │   └─ 의료법 가이드라인 준수
    └─ JSON 응답 파싱
    ↓
[PhotoBlogResult 컴포넌트]
    ├─ 제목 표시
    ├─ 본문 표시 (이미지 + 텍스트)
    ├─ 해시태그 표시
    └─ 네이버 블로그용 HTML 복사 버튼
```

### 2. 인증 흐름

```
[Clerk 인증]
    ↓
[로그인/회원가입]
    ↓
[AuthContext]
    ├─ Clerk 사용자 정보 가져오기
    ├─ Convex 프로필 조회
    ├─ 프로필 자동 생성 (없는 경우)
    ├─ 권한 확인
    └─ 사용 가능 여부 계산
    ↓
[페이지 접근 제어]
    ├─ 로그인 여부 확인
    ├─ 활성 상태 확인
    └─ 사용량 확인
```

### 3. 데모 모드 흐름

```
[데모 모드 시작]
    ↓
[AuthContext.startDemo()]
    ├─ demoProfile 생성 (가상 사용자)
    │   ├─ id: 'demo_user'
    │   ├─ plan_tier: 'premium'
    │   ├─ monthly_limit: 9999 (무제한)
    │   └─ is_active: true
    └─ isDemo: true로 설정
    ↓
[블로그 생성]
    ├─ 로그인 체크 건너뜀
    ├─ 사용량 체크 건너뜀
    ├─ 활성 상태 체크 건너뜀
    └─ 데이터베이스 저장 건너뜀 (임시)
    ↓
[데모 모드 종료]
    ├─ demoProfile 제거
    └─ isDemo: false로 설정
```

---

## 주요 페이지

### 1. 메인 페이지 (`/` - `src/pages/Index.tsx`)

**기능**:
- 사진 업로드 (PhotoUploader)
- 블로그 생성 버튼
- 생성된 블로그 결과 표시 (PhotoBlogResult)
- 데모 모드 배너 (데모 활성 시)
- 관리자 시뮬레이션 바 (관리자 전용)
- 활성화 대기 알림
- 사용량 초과 알림
- 이용권 등록 (CouponRedeem)
- 최근 생성 글 목록 (RecentPostsList)

**데모 모드와의 차이점**:
- 로그인 체크 바이패스
- 활성 상태 체크 바이패스
- 사용량 제한 바이패스
- 데이터베이스 저장 건너뜀

### 2. 인증 페이지 (`/auth` - `src/pages/Auth.tsx`)

**기능**:
- Clerk 로그인/회원가입 UI
- 회원가입 폼 (병원명, 진료과, 지역 입력)
- 데모 모드 진입 버튼

### 3. 관리자 페이지 (`/admin` - `src/pages/Admin.tsx`)

**기능**:
- 대시보드 통계 (총 사용자, 오늘 생성 글, 월간 사용량)
- 사용자 목록 (프로필, 권한, 활성 상태, 마지막 활동, 포스트 수)
- 사용자 상세 모달 (권한 변경, 플랜 변경, 활성/비활성, 이메일 업데이트)
- 쿠폰 생성기 (쿠폰 코드, 기간 발급)
- 스타일 설정 모달 (글쓰기 스타일 설정)
- 활동 로그 확인
- 시뮬레이션 바 (다른 사용자로 시뮬레이션)

---

## 데모 모드 상세 분석

### 데모 모드 목적
- 회원가입 없이 서비스 테스트 가능
- AI 블로그 생성 기능 체험
- 구매 결정 전 기능 확인

### 데모 모드 구현

#### 1. AuthContext (`src/contexts/AuthContext.tsx`)

```typescript
// 데모 모드 상태
const [isDemo, setIsDemo] = useState(false);
const [demoProfile, setDemoProfile] = useState<SimulationProfile | null>(null);

// 데모 모드 시작
const startDemo = useCallback((hospitalName: string, region: string, department?: string) => {
  const demoUser: SimulationProfile = {
    id: 'demo_user',
    center_name: hospitalName,
    region,
    department,
    writing_tone_prompt: null,
    style_config: null,
    writing_style: 'warm_friendly',
    content_length: 'medium',
    use_emoji: true,
    is_active: true,
    current_usage: 0,
    monthly_limit: 9999, // 무제한
    plan_tier: 'premium',
    max_image_count: 10,
  };
  setDemoProfile(demoUser);
  setIsDemo(true);
}, []);

// 데모 모드 종료
const endDemo = useCallback(() => {
  setDemoProfile(null);
  setIsDemo(false);
}, []);
```

#### 2. Index.tsx 데모 모드 체크

```typescript
// 데모 모드 및 관리자는 체크 바이패스
if (!isAdmin && !isDemo && !profile?.is_active) {
  toast({ title: '서비스 이용 불가', ... });
  return;
}

// 데모 모드 및 관리자는 사용량 체크 바이패스
if (!isAdmin && !isDemo && !canGenerate) {
  toast({ title: '이용 횟수 초과', ... });
  return;
}
```

#### 3. usePhotoBlog.ts 데모 모드 처리

```typescript
// 데모 모드에서는 데이터베이스 저장 건너뜀
if (!isDemo && user) {
  await createPostMutation({
    userId: user.id,
    content: fullContent,
    title: blogData.title,
    imagePaths: urls,
    status: 'draft',
  });

  await incrementUsageMutation({ userId: user.id });
  await logActivityMutation({
    userId: user.id,
    actionType: 'GENERATE_POST',
  });

  refreshProfile();
}
```

### 배포 시 제거 필요 파일

데모 모드 관련 코드를 제거하려면 다음 파일에서 작업 필요:

1. `src/contexts/AuthContext.tsx`
   - `isDemo`, `demoProfile` 상태 제거
   - `startDemo`, `endDemo` 함수 제거
   - `AuthContextType`에서 데모 관련 필드 제거

2. `src/pages/Index.tsx`
   - 데모 모드 배너 UI 제거 (라인 109-135)
   - 데모 모드 체크 로직 제거
   - 데모 모드 관련 토스트 알림 제거

3. `src/pages/Auth.tsx`
   - 데모 모드 진입 버튼 제거

4. `src/hooks/usePhotoBlog.ts`
   - 데모 모드 체크 제거
   - 데모 모드에서의 데이터베이스 저장 건너뜀 로직 제거

5. `src/pages/Admin.tsx`
   - AdminSimulationBar 관련 코드 제거

---

## AI 블로그 생성 가이드라인 (Medical Blog Content Guidelines)

### 의료법 준수 (Safety First)

1. **치료 효과 보장 표현 금지**:
   - ❌ "완치", "100%", "확실한", "재발 없는", "부작용 없는"
   - ✅ "높은 만족도", "부작용을 최소화한", "다년간의 임상 경험"

2. **최상급 비교 표현 금지**:
   - ❌ "최고", "1위", "No.1", "원탑", "국내 최고", "세계 최고"
   - ✅ "다년간의 경험을 갖춘", "정성을 다하는", "환자 중심의"

3. **'전문병원' 명칭 사용 제한** (보건복지부 지정이 아닌 경우):
   - ❌ "임플란트 전문병원", "척추 전문병원"
   - ✅ "임플란트 진료 과목", "임플란트 집중 치료", "임플란트 센터"

4. **할인 및 유인 행위 금지**:
   - ❌ "오늘만 반값", "친구 소개 시 할인", "선착순 무료"
   - ✅ 할인 관련 내용은 언급하지 않음

5. **환자 후기 조작 금지**:
   - ❌ 가상의 환자 후기 작성, 대가성 후기, 조작된 전후 사진 설명
   - ✅ 일반적인 환자 반응 "~라고 말씀하시는 분들이 많습니다" 서술

### SEO 최적화

- **키워드**: 지역명 + 질환/증상 조합 (예: "서울 임플란트", "서울 치아통증")
- **메인 키워드**: 본문에서 3~4회 자연스럽게 반복
- **문장**: 30자 이내로 짧게 끊기
- **문단**: 3~4줄 단위로 나누어 여백 주기
- **제목**: 25~35자 이내 (모바일 가독성 + CTR 최적화)
- **지역명 + 핵심 키워드** 포함 권장

### 4단계 글쓰기 프레임워크

1. **도입부 (공감)** - 전체의 20%
   - 날씨, 계절, 최근 이슈 언급
   - 환자가 겪는 통증과 고민으로 공감대 형성

2. **정보 제공 (전문성)** - 전체의 30%
   - 질환의 원인, 증상, 예방법 등 의학적으로 정확한 정보
   - 중학교 수준의 쉬운 용어로 설명
   - 전문 용어는 괄호 안에 쉬운 설명 추가

3. **솔루션 (차별성)** - 전체의 35%
   - 해당 병원만의 치료 프로세스, 장비, 의료진 철학 소개
   - "왜 이 병원이어야 하는가"를 자연스럽게 전달
   - 환자 중심의 진료 방식 강조

4. **마무리 (행동 유도)** - 전체의 15%
   - 진료 시간, 위치 안내는 자연스럽게
   - 따뜻한 응원과 격려로 마무리

### 5가지 글쓰기 스타일

1. **따뜻한 이웃 (Warm & Friendly)**
   - "~했대요", "~하셨어요", 세상에!"
   - 딱딱한 전문 용어 대신 쉬운 단어 사용

2. **활기찬 리포터 (Energetic & Cheerful)**
   - 짧은 문장 사용하여 속도감
   - 감탄사와 현장 소리 적절히 활용
   - 밝고 긍정적인 에너지

3. **차분한 전문가 (Calm & Professional)**
   - 감성보다는 진료/시술의 효과와 환자분의 구체적인 반응 전문적 서술
   - 차분하고 신뢰감 있는 어조

4. **감성 에세이 (Poetic & Emotional)**
   - 한 편의 수필처럼 서정적인 문체
   - 계절의 느낌, 빛의 기울기, 공기의 온도 등 활용
   - '꽃/웃음꽃' 비유 금지

5. **담백한 관찰자 (Concise & Clear)**
   - 다큐멘터리 내레이션처럼 차분하고 객관적 묘사
   - '행복했다', '편안했다' 같은 감정 형용사 배제
   - 눈에 보이는 사실(Fact) 위주로 건조하지만 깊은 여운

### 3가지 글 길이 설정

1. **Short**: 간결하게 핵심만 전달 (3-4문단)
2. **Medium**: 적당한 길이의 균형 잡힌 글 (5-6문단)
3. **Long**: 자세하고 풍성한 내용 (7-8문단 이상)

---

## 환경 변수 설정

### `.env` 파일 (프로젝트 루트)

```bash
VITE_CONVEX_URL=your_convex_deployment_url_here
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key_here
```

### Convex 대시보드 환경 변수

- `GOOGLE_API_KEY`: Google Gemini API 키 (AI 블로그 생성용)

---

## 실행 방법

### 개발 환경

```bash
# 의존성 설치
npm install

# Convex 개발 서버 시작 (필요)
npx convex dev

# 프론트엔드 개발 서버 시작 (포트 8080)
npm run dev
```

**중요**: `npx convex dev`와 `npm run dev`를 동시에 실행해야 전체 기능 작동

### 빌드

```bash
# 프로덕션 빌드
npm run build

# 개발 빌드
npm run build:dev

# 빌드 미리보기
npm run preview
```

---

## 주요 컴포넌트

### PhotoUploader (`src/components/PhotoUploader.tsx`)
- 최대 5장 사진 업로드
- 드래그 앤 드롭 지원
- 이미지 압축 (1MB 이하, 1024x1024)
- 순서 변경 (dnd-kit)
- 진료과별 키워드 예시 제공
- 각 사진별 키워드 입력

### PhotoBlogResult (`src/components/PhotoBlogResult.tsx`)
- 네이버 블로그 스타일 미리보기
- 이미지 우선 구조 (텍스트와 이미지가 교차 배치)
- 해시태그 표시
- 네이버 블로그용 HTML 복사 버튼

### AdminSimulationBar (`src/components/AdminSimulationBar.tsx`)
- 관리자가 다른 사용자로 시뮬레이션
- 사용자 선택 드롭다운
- 데모 사용자 포함

---

## Convex 함수 구조

### Queries (데이터 조회)

#### users.ts
- `getProfile`: userId로 프로필 조회
- `getProfileByEmail`: email로 프로필 조회
- `getUserRole`: 사용자 권한 조회
- `canGenerate`: 생성 가능 여부 확인 (활성 상태, 구독 만료, 사용량 체크)
- `getCurrentUser`: 현재 사용자의 전체 정보 조회

#### posts.ts
- `getPosts`: 모든 포스트 목록 조회 (페이지네이션)
- `getPostsByUser`: 특정 사용자의 포스트 목록 조회
- `getRecentPosts`: 최근 포스트 조회 (권한 기반)
- `getPostById`: ID로 포스트 상세 조회
- `getPostCountByUser`: 특정 사용자의 포스트 수 조회
- `getPostsByCategory`: 카테고리별 포스트 조회
- `searchPosts`: 포스트 검색 (제목 또는 내용)

#### admin.ts
- `getAllProfiles`: 모든 프로필 조회 (관리자용, 어드민 제외)
- `getAdminUserIds`: 모든 어드민 사용자 ID 조회
- `getAdminStats`: 관리자 대시보드 통계 조회
- `getLastActiveTimes`: 사용자별 마지막 활동 시간 조회
- `getPostCountsByUsers`: 사용자별 포스트 수 조회
- `getUserRoleByUserId`: 특정 사용자의 권한 조회
- `getActivityLogs`: 활동 로그 조회 (전체)
- `getActivityLogsByUser`: 특정 사용자의 활동 로그 조회
- `getAllPosts`: 관리자용 전체 포스트 조회
- `getProfilesWithAnalytics`: 관리자용 프로필 + 활동 정보 통합 조회

### Mutations (데이터 수정)

#### users.ts
- `createProfile`: 새 프로필 생성 (회원가입 시)
- `updateProfile`: 프로필 업데이트
- `incrementUsage`: 사용량 증가
- `createOrUpdateUserRole`: 사용자 권한 생성/업데이트
- `linkPendingProfile`: pending 프로필을 실제 Clerk ID로 연결
- `resetMonthlyUsage`: 월간 사용량 리셋 (cron용)
- `logActivity`: 활동 로그 추가

#### posts.ts
- `createPost`: 새 포스트 생성
- `updatePost`: 포스트 수정
- `deletePost`: 포스트 삭제
- `deletePostsByUser`: 사용자의 모든 포스트 삭제
- `bulkUpdateStatus`: 포스트 상태 일괄 변경

#### admin.ts
- `adminUpdateProfile`: 관리자용 프로필 업데이트
- `adminUpdateUserRole`: 관리자용 사용자 권한 업데이트
- `adminUpdateEmail`: 관리자용 이메일 업데이트
- `adminCreateUser`: 관리자용 새 사용자 생성
- `adminDeleteUser`: 관리자용 사용자 삭제
- `updateStyleConfig`: 스타일 설정 업데이트

### Actions (외부 API 호출)

#### generateBlog.ts
- `generateBlog`: AI 블로그 생성 (클라이언트 호출용)
  - Google Gemini API 사용
  - 이미지 분석 (base64)
  - 4단계 글쓰기 프레임워크 적용
  - 의료법 가이드라인 준수
  - JSON 응답 파싱 (다단계)
- `generateBlogInternal`: 내부용 AI 블로그 생성 (다른 Convex 함수에서 호출용)
- `checkApiStatus`: API 연결 상태 확인
- `getAvailablePersonas`: 사용 가능한 페르소나 목록 조회

### Internal Mutations (내부용, cron에서만 호출)

#### posts.ts
- `deleteOldPosts`: 오래된 포스트 정리 (24시간 이상 지난 draft 상태 포스트 삭제)
- `deletePostsBeforeTime`: 지정된 시간 이전의 모든 포스트 정리
- `deleteArchivedPosts`: archived 상태의 오래된 포스트 정리

---

## 라우팅 구조

```typescript
<Routes>
  <Route path="/" element={<Index />} />           {/* 메인 페이지 */}
  <Route path="/auth" element={<Auth />} />       {/* 인증 페이지 */}
  <Route path="/admin" element={<Admin />} />     {/* 관리자 페이지 */}
  <Route path="*" element={<NotFound />} />       {/* 404 페이지 */}
</Routes>
```

---

## 보안 고려사항

1. **의료법 준수**: 모든 AI 생성 콘텐츠는 의료법 가이드라인을 준수하도록 프롬프트에 적용
2. **금지어 필터링**: "완치", "100%", "최고", "전문병원" 등 금지어 사용 방지
3. **API 키 보호**: Google Gemini API 키는 Convex 환경 변수에서만 관리 (프론트엔드 노출 금지)
4. **권한 체크**: 모든 관리자 기능은 권한 검증 후 실행
5. **이미지 압축**: 클라이언트에서 이미지 압축으로 저장소 비용 절감

---

## 성능 최적화

1. **이미지 압축**: browser-image-compression으로 1MB 이하, 1024x1024로 압축
2. **TanStack Query**: 서버 상태 캐싱 및 자동 리프레시
3. **Convex 인덱싱**: 자주 조회하는 필드에 인덱스 적용 (by_user_id, by_created_at 등)
4. **페이지네이션**: 대량 데이터 조회 시 페이지네이션 사용
5. **코드 분할**: React.lazy 또는 dynamic import로 라우트 레벨 코드 분할 고려

---

## 개발 참고사항

### 이미지 처리 현재 상태
- 현재 이미지를 Data URL로 변환하여 사용
- TODO: Convex File Storage로 이미지 업로드 구현

### 데모 모드 제거 시점
- 배포 직전에 데모 모드 관련 코드 모두 제거
- AuthContext, Index.tsx, Auth.tsx, usePhotoBlog.ts 등에서 데모 관련 코드 삭제

### 에러 처리
- AI 응답 파싱 시 다단계 파싱 로직 적용 (마크다운 제거 → JSON 파싱 → 정규식 추출 → 필드별 추출)
- 재시도 로직: 최대 3회 재시도, 속도 제한 시 지연

---

## 라이선스

이 프로젝트는 별도의 라이선스 파일이 없습니다. 상용 라이브러리는 각각의 라이선스를 따릅니다.

---

## 문서 갱신 이력

- **2026-03-04**: 얼굴 인식 기능(face-api.js) 추가, department 필드 제거 반영
- **2026-02-27**: 초기 프로젝트 분석 문서 작성
