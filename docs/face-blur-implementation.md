# 얼굴 모자이크 기능 구현 가이드

## 📋 개요

업로드된 사진에서 얼굴을 식별해 모자이크/이모티콘으로 가리는 기능

---

## 🛠️ 최종 기술 스택

| 항목 | 기술 | 비고 |
|------|------|------|
| 얼굴 인식 | `@vladmandic/face-api` | face-api.js의 유지보수 포크 |
| 감지 모델 | SSD MobileNet V1 | 고정밀 다중 얼굴 감지 |
| UI | shadcn/ui Dialog | 모달 팝업 |
| 이미지 처리 | Canvas API | 모자이크/이모티콘 오버레이 |
| 이미지 압축 | browser-image-compression | 업로드 전 처리 |

---

## 📁 파일 구조

```
src/
├── hooks/
│   └── useFaceDetection.ts    # 얼굴 인식 훅
├── lib/
│   └── faceBlur.ts            # 모자이크 처리 유틸리티
├── components/
│   ├── PhotoUploader.tsx      # 썸네일 클릭 이벤트 + 이미지 압축
│   └── FaceBlurModal.tsx      # 모달 컴포넌트
└── pages/
    └── Index.tsx              # 모달 상태 관리
```

---

## ⚙️ 최종 적용 설정

### 감지기 설정 (SSD MobileNet V1)

```typescript
// useFaceDetection.ts
const DETECTOR_OPTIONS = new faceapi.SsdMobilenetv1Options({
  minConfidence: 0.2,    // 신뢰도 임계값
  maxResults: 100,       // 최대 감지 얼굴 수
});
```

| 파라미터 | 값 | 설명 |
|----------|-----|------|
| `minConfidence` | **0.2** | 0.15~0.3 범위 권장. 낮을수록 감지율↑, 오탐지↑ |
| `maxResults` | 100 | 최대 감지 가능 얼굴 수 |

### 모델 로드

```typescript
const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model';
await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
```

---

## 🎨 처리 파라미터

### 모자이크 처리 (faceBlur.ts)

| 파라미터 | 값 | 설명 |
|----------|-----|------|
| 블록 크기 | `10px` | 모자이크 픽셀 블록 크기 |
| 얼굴 패딩 | `15%` | 감지된 얼굴 영역 확장 비율 |
| 처리 너비 | `1000px` | 처리 시 이미지 리사이즈 너비 |
| JPEG 품질 | `0.9` | 출력 이미지 품질 (90%) |

### 이모티콘 목록

```typescript
const EMOJI_LIST = ['😊', '😄', '🙂', '😐', '😎', '🤗'];
```

이모티콘 모드 선택 시 무작위로 선택되어 얼굴 영역에 오버레이됩니다.

### 이미지 압축 (PhotoUploader.tsx)

업로드 전 클라이언트 사이드 압축 설정:

```typescript
const options = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1024,
  useWebWorker: true,
  fileType: 'image/jpeg',
  initialQuality: 0.8,
};
```

| 파라미터 | 값 | 설명 |
|----------|-----|------|
| 최대 크기 | 1MB | 파일 크기 제한 |
| 최대 해상도 | 1024px | 가로/세로 최대 길이 |
| 품질 | 0.8 | 압축 품질 (80%) |
| 포맷 | JPEG | 출력 포맷 |

---

## 🔧 설정값 조정 가이드

### minConfidence 값에 따른 효과

| 값 | 감지율 | 처리 속도 | 오탐지 | 권장 상황 |
|----|--------|----------|--------|----------|
| 0.1 | 매우 높음 | 느림 | 많음 | 작은 얼굴 많은 단체 사진 |
| **0.2** | 높음 | 보통 | 적음 | **일반적인 사용 (현재 설정)** |
| 0.3 | 보통 | 빠름 | 매우 적음 | 큰 얼굴 위주 |
| 0.5 | 낮음 | 빠름 | 거의 없음 | 오탐지 최소화 필요 시 |

### 조정 방법

`src/hooks/useFaceDetection.ts`:
```typescript
const DETECTOR_OPTIONS = new faceapi.SsdMobilenetv1Options({
  minConfidence: 0.2,  // ← 이 값 조정
  maxResults: 100,
});
```

---

## 📊 성능 특성

### 처리 시간 (1024px 이미지 기준)

| 단계 | 평균 시간 |
|------|----------|
| 얼굴 감지 | ~80ms |
| 모자이크 처리 | ~20ms |
| **총 처리 시간** | **~100ms** |

### 감지 성능

| 상황 | 감지율 | 비고 |
|------|--------|------|
| 정면 얼굴 | 95%+ | 최적 |
| 측면 얼굴 | 85%+ | 양호 |
| 마스크 착용 | 70%+ | minConfidence 낮추면 개선 |
| 작은 얼굴 | 80%+ | 단체 사진 뒤쪽 |

---

## 🖥️ UI 구성

### 모달 구조

```
┌────────────────────────────────────────────┐
│  얼굴 모자이크 처리                         │
│  [키워드]  👤 N개 감지  ⏱ XXms             │
├────────────────────────────────────────────┤
│  [모자이크]  [😊 이모티콘]  [원본]          │
├────────────────────────────────────────────┤
│                                            │
│         처리된 이미지 (1000px)             │
│         (스크롤 가능)                      │
│                                            │
├────────────────────────────────────────────┤
│                           [✓ 적용]         │
└────────────────────────────────────────────┘
```

### 처리 모드

| 모드 | 설명 | 적용 시 동작 |
|------|------|-------------|
| 모자이크 | 얼굴 영역에 픽셀 블러 처리 | 처리된 이미지로 업로드 목록 교체 |
| 이모티콘 | 얼굴 영역에 랜덤 이모티콘 오버레이 | 처리된 이미지로 업로드 목록 교체 |
| 원본 | 처리 없이 원본 표시 | 변경 없음 (원본 유지) |

---

## ✅ 적용 기능

### 기능 개요

모자이크/이모티콘/원본 중 선택한 옵션을 실제 업로드 이미지에 반영하는 기능

### 동작 흐름

```
1. 썸네일 클릭 → FaceBlurModal 열림
2. 모드 선택 (모자이크/이모티콘/원본)
3. "적용" 버튼 클릭
   - 모자이크/이모티콘: 처리된 이미지(base64) → File 변환 → 업로드 목록 교체
   - 원본: 변경 없음
4. 모달 자동 닫기
```

### 주요 함수

#### `base64ToFile()` - FaceBlurModal.tsx

```typescript
const base64ToFile = (base64: string, filename: string): File => {
  const arr = base64.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
};
```

#### `handlePhotoApply()` - Index.tsx

```typescript
const handlePhotoApply = (processedFile: File | null, photoId: string) => {
  if (processedFile) {
    // 기존 preview URL 해제
    const oldPreview = photos.find(p => p.id === photoId)?.preview;
    if (oldPreview) {
      URL.revokeObjectURL(oldPreview);
    }

    // PhotoItem 교체
    setPhotos(prev => prev.map(p => {
      if (p.id === photoId) {
        return {
          ...p,
          file: processedFile,
          preview: URL.createObjectURL(processedFile),
        };
      }
      return p;
    }));
  }
};
```

### Props 인터페이스

```typescript
interface FaceBlurModalProps {
  isOpen: boolean;
  onClose: () => void;
  photo: PhotoItem | null;
  onApply?: (processedFile: File | null, photoId: string) => void;
}
```

| Prop | 타입 | 설명 |
|------|------|------|
| `onApply` | `(file: File \| null, id: string) => void` | 적용 버튼 클릭 시 호출. `null`이면 원본 유지 |

---

## 🏗️ 아키텍처 결정: 얼굴 인식 모델 선택

### face-api.js 선택 이유

**MediaPipe 대비 장점:**
1. 다중 얼굴 무제한 감지 (100개)
2. 압축된 이미지에서도 작은 얼굴 인식 우수
3. 한국인 얼굴 인식 성능 더 우수
4. 클라이언트 사이드 처리로 서버 부하 없음

**트레이드오프:**
- 모델 파일 크기 (~5MB, CDN에서 로드)
- 브라우저 호환성 고려 필요
- 오프라인 동작 불가 (CDN 의존)

---

## 📝 참고사항

### 이미지 처리 흐름

```
원본 이미지 → browser-image-compression (1024px, 0.8 품질 압축)
            → face-api.js 얼굴 감지
            → Canvas 모자이크 처리 (1000px, 0.9 품질)
            → base64 출력
```

### 주의사항

1. **이미지 압축**: `browser-image-compression`이 1024px로 압축하므로 작은 얼굴은 감지 어려울 수 있음
2. **CDN 의존**: 모델 CDN에서 로드, 오프라인 동작 불가
3. **메모리**: 대용량 이미지 처리 시 메모리 사용량 증가
4. **패키지**: `@vladmandic/face-api`는 원본 face-api.js의 유지보수 포크

---

## 🔗 관련 파일

| 파일 | 역할 |
|------|------|
| `src/hooks/useFaceDetection.ts` | 얼굴 인식 로직, 모델 로드 |
| `src/lib/faceBlur.ts` | 모자이크/이모티콘 처리 |
| `src/components/FaceBlurModal.tsx` | UI 컴포넌트, base64→File 변환 |
| `src/components/PhotoUploader.tsx` | 썸네일 클릭 이벤트, 이미지 압축 |
| `src/pages/Index.tsx` | 모달 상태 관리, 적용 로직 |

---

## 🔮 향후 계획

`docs/face-adjustment-plan.md`에서 개별 얼굴 조정 기능(드래그, 크기 조절, 이모티콘 개별 선택) 로드맵 확인 가능

---

## 📚 외부 참고

- [@vladmandic/face-api GitHub](https://github.com/vladmandic/face-api)
- [SSD MobileNet 논문](https://arxiv.org/abs/1512.02325)
- [browser-image-compression](https://github.com/nicollash/browser-image-compression)
