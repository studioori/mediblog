# 얼굴 모자이크 개별 조정 기능 - 테스트 계획

## 🧪 테스트 개요

이 문서는 [`face-adjustment-plan.md`](./face-adjustment-plan.md)에 정의된 얼굴 모자이크 조정 기능의 테스트 전략과 시나리오를 담고 있습니다.

---

## 1. 수동 테스트 (개발 환경) - 필수

**이유**: 얼굴 인식은 브라우저에서만 동작, 실제 동작 확인 필요

### 1.1 테스트 시나리오

#### Test Case 1: 기본 얼굴 감지
```
Given: 이미지 업로드 완료
When: 얼굴 모자이크 모달 열기
Then: 
  - 모든 얼굴이 감지되어야 함
  - 각 얼굴에 이모티콘 오버레이 표시
  - Bounding box가 파란색으로 표시
```

#### Test Case 2: 드래그 기능
```
Given: 얼굴 감지 완료 상태
When: 이모티콘 중앙 원을 드래그
Then:
  - 이모티콘 위치가 실시간으로 이동
  - offsetX, offsetY 값 업데이트
  - 미리보기 이미지 실시간 갱신
```

#### Test Case 3: 리사이즈 기능
```
Given: 얼굴 감지 완료 상태
When: 우하단 핸들을 드래그
Then:
  - 이모티콘 크기가 0.5x ~ 2.0x 범위에서 조정
  - scale 값 업데이트
  - 미리보기 이미지 실시간 갱신
```

#### Test Case 4: 이모티콘 변경
```
Given: 얼굴 선택 상태
When: 다른 이모티콘 클릭
Then:
  - 선택된 얼굴의 이모티콘 변경
  - 미리보기 즉시 업데이트
```

#### Test Case 5: 다중 얼굴 조정
```
Given: 3명 이상의 얼굴 감지
When: 각 얼굴을 개별적으로 조정
Then:
  - 각 조정이 독립적으로 동작
  - 다른 얼굴에 영향 없음
```

#### Test Case 6: 적용 및 취소
```
Given: 조정 완료 상태
When: "적용" 버튼 클릭
Then:
  - 처리된 이미지가 업로드 목록에 반영
  - 모달 자동 닫기

When: ESC 키 또는 모달 외부 클릭
Then:
  - 변경사항 취소
  - 원본 이미지 유지
```

### 1.2 테스트용 이미지 셋

**준비물**:
1. **단일 얼굴** - 정면 (1장)
2. **다중 얼굴** - 2~3명 (1장)
3. **다중 얼굴** - 5명 이상 (1장)
4. **측면 얼굴** - 프로필 샷 (1장)
5. **작은 얼굴** - 단체 사진 뒤쪽 (1장)
6. **마스크 착용** - 마스크 쓴 얼굴 (1장)

**이미지 소스**:
- 프로젝트 내 `public/test-images/` 폴더 생성
- 무료 이미지 사이트 (Unsplash, Pexels)에서 다운로드
- 실제 의료진 사진은 HIPAA/개인정보 보호로 사용 불가

---

## 2. 컴포넌트 유닛 테스트 (선택사항)

**도구**: Jest + React Testing Library

### 2.1 테스트 가능한 부분

```typescript
// src/hooks/useFaceDetection.test.ts
describe('useFaceDetection', () => {
  it('should initialize face bounding boxes with default values', () => {
    const faces = [
      { x: 100, y: 100, width: 50, height: 50 }
    ];
    const initialized = initializeFaceBoxes(faces);
    
    expect(initialized[0]).toHaveProperty('id');
    expect(initialized[0]).toHaveProperty('emoji');
    expect(initialized[0].scale).toBe(1.0);
    expect(initialized[0].offsetX).toBe(0);
    expect(initialized[0].offsetY).toBe(0);
  });
});

// src/lib/faceBlur.test.ts
describe('applyEmoji', () => {
  it('should apply emoji with custom scale', () => {
    // Canvas mock 필요
    // scale에 따른 fontSize 계산 검증
  });
});

// src/components/FaceBlurModal.test.tsx
describe('FaceBlurModal', () => {
  it('should update face position on drag', () => {
    // mouse event mock
    // offsetX, offsetY 업데이트 검증
  });
  
  it('should update face scale on resize', () => {
    // resize event mock
    // scale 업데이트 검증 (0.5 ~ 2.0 범위)
  });
});
```

### 2.2 Mock 전략

```typescript
// face-api.js mock
jest.mock('@vladmandic/face-api', () => ({
  nets: {
    ssdMobilenetv1: {
      loadFromUri: jest.fn()
    }
  },
  detectAllFaces: jest.fn(() => Promise.resolve([
    { box: { x: 100, y: 100, width: 50, height: 50 } }
  ])),
  SsdMobilenetv1Options: jest.fn()
}));

// Canvas mock
HTMLCanvasElement.prototype.getContext = jest.fn();
```

---

## 3. E2E 테스트 (선택사항)

**도구**: Playwright 또는 Cypress

### 3.1 E2E 테스트 시나리오

```typescript
// e2e/face-adjustment.spec.ts
test('complete face adjustment flow', async ({ page }) => {
  // 1. 이미지 업로드
  await page.goto('/');
  await page.setInputFiles('input[type="file"]', 'test-images/group.jpg');
  
  // 2. 모달 열기
  await page.click('img.thumbnail');
  
  // 3. 얼굴 감지 대기
  await page.waitForSelector('svg.overlay', { timeout: 5000 });
  
  // 4. 드래그 수행
  const face = await page.locator('circle.drag-handle').first();
  await face.dragTo(page.locator('img'), { 
    targetPosition: { x: 200, y: 200 } 
  });
  
  // 5. 리사이즈 수행
  const resizeHandle = await page.locator('rect.resize-handle').first();
  await resizeHandle.dragTo(page.locator('img'), {
    targetPosition: { x: 300, y: 300 }
  });
  
  // 6. 이모티콘 변경
  await page.click('button.emoji-picker:has-text("😎")');
  
  // 7. 적용
  await page.click('button:has-text("적용")');
  
  // 8. 검증
  const processedImage = await page.locator('img.processed');
  await expect(processedImage).toBeVisible();
});
```

---

## 4. 성능 테스트

### 4.1 렌더링 성능

```typescript
// 드래그 중 실시간 재렌더링 성능 측정
const measureDragPerformance = () => {
  const start = performance.now();
  
  // 100회 드래그 시뮬레이션
  for (let i = 0; i < 100; i++) {
    handleMouseMove({ clientX: i, clientY: i });
  }
  
  const end = performance.now();
  const avgTime = (end - start) / 100;
  
  console.log(`Average drag render time: ${avgTime}ms`);
  // 목표: < 16ms (60fps)
};
```

### 4.2 메모리 사용량

```typescript
// 얼굴 조정 상태 메모리 측정
const measureMemoryUsage = () => {
  const before = performance.memory?.usedJSHeapSize;
  
  // 대량 얼굴 조정 (100개)
  const faces = Array(100).fill(null).map((_, i) => ({
    id: `face-${i}`,
    x: i * 10,
    y: i * 10,
    width: 50,
    height: 50,
    emoji: '😊',
    scale: 1.0,
    offsetX: 0,
    offsetY: 0
  }));
  
  const after = performance.memory?.usedJSHeapSize;
  const delta = (after - before) / 1024 / 1024; // MB
  
  console.log(`Memory increase: ${delta}MB`);
  // 목표: < 1MB for 100 faces
};
```

---

## 5. 브라우저 호환성 테스트

**대상 브라우저**:
- Chrome 90+ (주 사용자)
- Firefox 88+
- Safari 14+
- Edge 90+

**테스트 항목**:
- [ ] SVG overlay 렌더링
- [ ] Canvas 이모티콘 처리
- [ ] 마우스 이벤트 (drag, resize)
- [ ] 터치 이벤트 (모바일)
- [ ] face-api.js 모델 로드

---

## 6. 접근성 테스트

**도구**: axe-core, Lighthouse

```typescript
// 키보드 네비게이션
test('keyboard navigation', async () => {
  // Tab으로 얼굴 간 이동
  await userEvent.tab();
  expect(firstFace).toHaveFocus();
  
  // 화살표 키로 위치 조정
  await userEvent.keyboard('{ArrowRight}');
  expect(firstFace.offsetX).toBeGreaterThan(0);
  
  // +/- 키로 크기 조정
  await userEvent.keyboard('{Shift}=');
  expect(firstFace.scale).toBeGreaterThan(1.0);
});
```

---

## 📊 테스트 실행 계획

### 단계별 테스트

| 단계 | 테스트 유형 | 시기 | 담당 |
|------|------------|------|------|
| Phase 1 완료 후 | 유닛 테스트 | 즉시 | 개발자 |
| Phase 2 완료 후 | 수동 테스트 (기본) | 즉시 | 개발자 |
| Phase 3 완료 후 | 수동 테스트 (전체) | 즉시 | 개발자 |
| Phase 4 완료 후 | 성능 테스트 | 즉시 | 개발자 |
| Phase 5 완료 후 | E2E 테스트 | 선택사항 | 개발자 |
| 배포 전 | 브라우저 호환성 | 선택사항 | QA |

### 테스트 체크리스트

#### 필수 테스트 (반드시 수행)
- [ ] Test Case 1: 기본 얼굴 감지
- [ ] Test Case 2: 드래그 기능
- [ ] Test Case 3: 리사이즈 기능
- [ ] Test Case 4: 이모티콘 변경
- [ ] Test Case 5: 다중 얼굴 조정
- [ ] Test Case 6: 적용 및 취소
- [ ] 테스트 이미지 6종으로 검증

#### 권장 테스트 (시간 허용 시)
- [ ] 유닛 테스트 작성
- [ ] E2E 테스트 작성
- [ ] 성능 테스트
- [ ] 브라우저 호환성 테스트
- [ ] 접근성 테스트

---

## 🛠️ 테스트 환경 설정

### 1. 테스트 이미지 준비

```bash
# 프로젝트 루트에서 실행
mkdir -p public/test-images

# 테스트 이미지 다운로드 (예시)
# Unsplash에서 무료 이미지 다운로드 후 public/test-images/에 저장
```

### 2. 테스트 스크립트 추가

```json
// package.json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:e2e": "playwright test",
    "test:coverage": "jest --coverage"
  }
}
```

### 3. 테스트 설정 파일

```typescript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  }
};

// jest.setup.ts
import '@testing-library/jest-dom';

// Canvas mock
HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
  fillText: jest.fn(),
  drawImage: jest.fn(),
  getImageData: jest.fn(),
  putImageData: jest.fn()
}));
```

---

## 📝 테스트 결과 기록 템플릿

```markdown
## 테스트 결과 - YYYY-MM-DD

### 환경
- 브라우저: Chrome 120
- OS: macOS 14
- Node: 20.x

### 수동 테스트 결과

| Test Case | 결과 | 비고 |
|-----------|------|------|
| TC1: 기본 감지 | ✅ Pass | 5개 얼굴 모두 감지 |
| TC2: 드래그 | ✅ Pass | 부드러운 이동 |
| TC3: 리사이즈 | ⚠️ Issue | 0.5x 이하 축소 시 깨짐 |
| TC4: 이모티콘 변경 | ✅ Pass | 즉시 반영 |
| TC5: 다중 조정 | ✅ Pass | 독립 동작 확인 |
| TC6: 적용/취소 | ✅ Pass | 정상 동작 |

### 발견된 이슈
1. 리사이즈 시 0.5x 이하에서 이모티콘 깨짐
   - 원인: fontSize 최소값(20px) 미만
   - 해결: fontSize 계산 로직 수정 필요

### 성능 측정
- 평균 드래그 렌더링: 8ms ✅
- 100개 얼굴 메모리 증가: 0.8MB ✅
```

---

## ✅ 테스트 준비 완료 체크리스트

- [ ] 개발 서버 실행 가능 (`npm run dev`)
- [ ] 테스트 이미지 6종 준비됨
- [ ] Jest 설정 완료 (선택사항)
- [ ] Playwright 설정 완료 (선택사항)
- [ ] 테스트 체크리스트 출력 완료


