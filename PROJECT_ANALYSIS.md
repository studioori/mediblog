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

## 아키텍처 결정 사항

### 왜 이 스택을 선택했는가

| 기술 | 선택 이유 | 트레이드오프 |
|------|----------|-------------|
| **Convex** | 서버리스 + 실시간 구독 내장, 서버 관리 부담 없음, TypeScript 네이티브 | 벤더 락인, 다른 DB 대비 커뮤니티 작음 |
| **Clerk** | 인증 UI/UX 완성도 높음, 한국어 지원, 관리 기능 포함 | 비용 (무료 티어 제한), 커스터마이징 제약 |
| **Google Gemini** | 멀티모달(이미지+텍스트) 처리 우수, 한국어 생성 품질 양호 | API 응답 시간 변동, 비용 |
| **face-api.js** | 클라이언트 사이드 처리로 서버 부하 없음, 다중 얼굴 감지 우수 | 모델 파일 크기 (~5MB), 브라우저 호환성 |
| **shadcn/ui** | Radix UI 기반 접근성, 복사-붙여넣기 방식으로 커스터마이징 자유로움 | 컴포넌트 수동 업데이트 필요 |

### 얼굴 인식 모델 선택: MediaPipe → face-api.js

**MediaPipe에서 전환한 이유:**
- short_range 모델이 압축된 이미지에서 작은 얼굴 감지 실패
- 다중 얼굴 감지 제한 (~2개)
- 한국인 얼굴 인식 성능 부족

**face-api.js 장점:**
- 다중 얼굴 무제한 감지 (100개)
- 작은 얼굴 인식 우수
- 한국인 얼굴 더 나은 성능

### 데이터 흐름 원칙

1. **클라이언트 우선 처리**: 이미지 압축, 얼굴 인식은 클라이언트에서 수행 → 서버 부하 감소
2. **실시간 구독**: Convex `useQuery`로 데이터 변경 시 자동 갱신
3. **AI 호출은 Action으로**: 외부 API 호출은 Convex Action에서만 수행 (API 키 보호)

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
- **Google Gemini API**: AI 블로그 생성 (Gemini 2.5 Flash 모델)
- **Clerk**: 사용자 인증

### 기타 라이브러리
- **browser-image-compression**: 이미지 압축 (클라이언트)
- **dnd-kit**: 드래그 앤 드롭, 사진 순서 변경
- **face-api.js**: 얼굴 인식 및 모자이크 처리 (`@vladmandic/face-api`)
- **sonner**: 토스트 알림
- **next-themes**: 다크 모드 지원

---

## 데이터베이스 스키마 (Convex)

### 주요 테이블

#### `profiles` - 사용자 프로필 및 구독 정보
- `clerk_id`: Clerk 사용자 ID
- `email`, `center_name`, `region`: 기본 정보
- `plan_tier`: 플랜 등급 (free/basic/premium)
- `monthly_limit`, `current_usage`: 사용량 관리
- `is_active`: 활성 상태 (관리자 승인 필요)
- `style_config`: 글쓰기 스타일 설정 (JSON)
- `writing_style`, `content_length`, `use_emoji`: AI 생성 옵션

#### `user_roles` - 사용자 권한 관리
- `user_id`, `role` (admin/user)

#### `generated_posts` - 생성된 블로그 포스트
- `user_id`, `content`, `image_paths`, `title`, `status`, `created_at`

#### `activity_logs` - 사용자 활동 로그
- `user_id`, `action_type`, `metadata`, `created_at`

#### `coupons` - 쿠폰 관리
- `code`, `duration_months`, `is_used`, `used_by`, `used_at`

---

## 핵심 기능 플로우

### 1. 사진 업로드 및 블로그 생성

```
[사용자] → [PhotoUploader] (압축, 키워드 입력)
    → [usePhotoBlog Hook] (generateBlog Action 호출)
    → [Convex Action] (Google Gemini API 호출, 이미지 분석)
    → [PhotoBlogResult] (결과 표시, 네이버 블로그 복사)
```

### 2. 인증 흐름

```
[Clerk 인증] → [AuthContext] (프로필 조회/생성, 권한 확인)
    → [페이지 접근 제어] (로그인, 활성 상태, 사용량 확인)
```

### 3. 데모 모드 흐름

```
[데모 모드 시작] → [AuthContext.startDemo()] (가상 사용자 생성)
    → [블로그 생성] (모든 체크 바이패스, DB 저장 건너뜀)
    → [데모 모드 종료] (가상 사용자 제거)
```

---

## 데모 모드 상세 분석

### 데모 모드 목적
- 회원가입 없이 서비스 테스트 가능
- AI 블로그 생성 기능 체험
- 구매 결정 전 기능 확인

### 데모 모드 구현

```typescript
// AuthContext.tsx
const startDemo = useCallback((hospitalName: string, region: string) => {
  const demoUser: SimulationProfile = {
    id: 'demo_user',
    center_name: hospitalName,
    region,
    is_active: true,
    current_usage: 0,
    monthly_limit: 9999, // 무제한
    plan_tier: 'premium',
    // ...
  };
  setDemoProfile(demoUser);
  setIsDemo(true);
}, []);
```

### 배포 시 제거 필요 파일

1. `src/contexts/AuthContext.tsx`: isDemo, demoProfile, startDemo, endDemo 제거
2. `src/pages/Index.tsx`: 데모 모드 배너, 체크 로직 제거
3. `src/pages/Auth.tsx`: 데모 모드 진입 버튼 제거
4. `src/hooks/usePhotoBlog.ts`: 데모 모드 체크 제거
5. `src/pages/Admin.tsx`: AdminSimulationBar 관련 코드 제거

---

## AI 블로그 생성 가이드라인

### 의료법 준수 (Safety First)

1. **치료 효과 보장 표현 금지**:
   - ❌ "완치", "100%", "확실한", "재발 없는", "부작용 없는"
   - ✅ "높은 만족도", "부작용을 최소화한", "다년간의 임상 경험"

2. **최상급 비교 표현 금지**:
   - ❌ "최고", "1위", "No.1", "원탑", "국내 최고"
   - ✅ "다년간의 경험을 갖춘", "정성을 다하는", "환자 중심의"

3. **'전문병원' 명칭 사용 제한** (보건복지부 지정이 아닌 경우):
   - ❌ "임플란트 전문병원"
   - ✅ "임플란트 진료 과목", "임플란트 센터"

4. **할인 및 유인 행위 금지**: 할인 관련 내용 언급하지 않음

5. **환자 후기 조작 금지**: 가상 후기 작성 금지

### SEO 최적화

- **키워드**: 지역명 + 질환/증상 조합 (예: "서울 임플란트")
- **문장**: 30자 이내로 짧게 끊기
- **문단**: 3~4줄 단위로 나누어 여백 주기
- **제목**: 25~35자 이내

### 4단계 글쓰기 프레임워크

1. **도입부 (20%)**: 날씨, 계절, 환자 공감
2. **정보 제공 (30%)**: 질환 원인, 증상, 예방법 (중학교 수준 용어)
3. **솔루션 (35%)**: 병원만의 치료 프로세스, 장비, 의료진 철학
4. **마무리 (15%)**: 진료 시간, 위치 안내, 따뜻한 응원

### 5가지 글쓰기 스타일

1. **따뜻한 이웃 (Warm & Friendly)**: "~했대요", 쉬운 단어
2. **활기찬 리포터 (Energetic & Cheerful)**: 짧은 문장, 감탄사
3. **차분한 전문가 (Calm & Professional)**: 전문적 서술, 신뢰감
4. **감성 에세이 (Poetic & Emotional)**: 서정적 문체, 계절 활용
5. **담백한 관찰자 (Concise & Clear)**: 객관적 묘사, 팩트 위주

### 3가지 글 길이 설정

- **Short**: 3-4문단
- **Medium**: 5-6문단
- **Long**: 7-8문단 이상

---

## 개발 시 주의사항

### 자주 발생하는 실수

1. **AI 응답 파싱**: 마크다운 제거 → JSON 파싱 → 정규식 추출 → 필드별 추출 (다단계 파싱 필요)
2. **이미지 압축**: 1024px로 압축하므로 작은 얼굴은 감지 어려울 수 있음
3. **데모 모드**: 모든 체크 로직에서 데모 모드 예외 처리 필요
4. **권한 체크**: 관리자 기능은 항상 권한 검증 후 실행

### 성능 고려사항

1. **이미지 압축**: browser-image-compression으로 1MB 이하, 1024x1024로 압축
2. **얼굴 인식**: 1024px 이미지 기준 ~100ms 처리 (감지 80ms + 처리 20ms)
3. **TanStack Query**: 서버 상태 캐싱 및 자동 리프레시 활용
4. **Convex 인덱싱**: 자주 조회하는 필드에 인덱스 적용

### 보안 체크포인트

1. **의료법 준수**: 모든 AI 생성 콘텐츠는 의료법 가이드라인 준수
2. **API 키 보호**: Google Gemini API 키는 Convex 환경 변수에서만 관리
3. **권한 체크**: 모든 관리자 기능은 권한 검증 후 실행
