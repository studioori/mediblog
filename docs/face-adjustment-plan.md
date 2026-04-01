# 얼굴 모자이크 개별 조정 기능 구현 계획

## 📋 기능 개요

**목표**: 얼굴 모자이크 처리 화면에서 개별 이모티콘의 크기와 위치를 조정하는 기능 추가

**현재 상태**:
- face-api.js (SSD MobileNet V1)로 자동 얼굴 감지
- Canvas API로 이모티콘/모자이크 자동 처리
- 조정 기능 없음 - 완전 자동 처리만 가능

**목표 상태**:
- 감지된 얼굴 영역을 개별적으로 선택하여 조정 가능
- 드래그로 위치 이동
- 핸들로 크기 조정
- 이모티콘 종류 선택
- 얼굴별 모드 선택 (모자이크/이모티콘/없음)
- 실시간 미리보기
- 마지막 작업 Undo
- 얼굴 삭제 기능
- 모바일 터치 지원

---

## 📋 구현 계획

### Phase 1: 데이터 구조 확장 + 좌표 스케일링 추상화 (20분)

**1.1 FaceBoundingBox 타입 확장**
```typescript
// src/hooks/useFaceDetection.ts
export interface FaceBoundingBox {
  x: number;              // 원본 이미지 좌표
  y: number;              // 원본 이미지 좌표
  width: number;
  height: number;
  // 새로 추가
  emoji?: string;           // 이모티콘 종류
  scale?: number;           // 크기 배율 (0.5 ~ 2.0, 기본값 1.0)
  offsetX?: number;         // X축 이동 (px, 원본 이미지 좌표 기준)
  offsetY?: number;         // Y축 이동 (px, 원본 이미지 좌표 기준)
  id?: string;              // 고유 식별자
  mode?: BlurMode;         // 얼굴별 모드 오버라이드
  selected?: boolean;       // 선택 상태
}
```

**1.2 기본값 설정 함수**
```typescript
const initializeFaceBoxes = (faces: FaceBoundingBox[]): FaceBoundingBox[] => {
  return faces.map((face, index) => ({
    ...face,
    id: `face-${index}`,
    emoji: EMOJI_LIST[Math.floor(Math.random() * EMOJI_LIST.length)],
    scale: 1.0,
    offsetX: 0,
    offsetY: 0,
    mode: 'mosaic' as BlurMode,
    selected: false,
  }));
};
```

**1.3 좌표 스케일링 추상화**
```typescript
// src/components/FaceBlurModal.tsx

// 디스플레이 스케일 계산 (이미지 로드 시 한 번만)
const calculateDisplayScale = (containerWidth: number, originalImageWidth: number): number => {
  return containerWidth / originalImageWidth;
};

// 원본 좌표 → 디스플레이 좌표 변환
const toDisplayCoords = (face: FaceBoundingBox, displayScale: number) => ({
  x: (face.x + (face.offsetX || 0)) * displayScale,
  y: (face.y + (face.offsetY || 0)) * displayScale,
  width: face.width * (face.scale || 1.0) * displayScale,
  height: face.height * (face.scale || 1.0) * displayScale,
});

// 디스플레이 좌표 → 원본 좌표 변환 (드래그 시)
const toOriginalCoords = (displayValue: number, displayScale: number): number => {
  return displayValue / displayScale;
};
```

---

### Phase 2: Interactive Overlay 컴포넌트 + 터치 지원 (50분)

**2.1 FaceOverlay 컴포넌트 구조**
```tsx
// src/components/FaceBlurModal.tsx 내부

<div className="relative">
  {/* 원본 이미지 */}
  <img
    ref={imageRef}
    src={photo.preview}
    className="max-w-full"
    style={{ width: '1000px' }}
    onLoad={handleImageLoad}
  />

  {/* SVG Overlay - Face Regions */}
  <svg
    className="absolute top-0 left-0 w-full h-full pointer-events-none"
    style={{ touchAction: 'none' }}
  >
    {adjustedFaces.map((face) => {
      const display = toDisplayCoords(face, displayScale);

      return (
        <g key={face.id} className="pointer-events-auto">
          {/* Bounding Box - 선택 상태 표시 */}
          <rect
            x={display.x}
            y={display.y}
            width={display.width}
            height={display.height}
            className={`stroke-2 fill-transparent ${
              face.selected
                ? 'stroke-primary stroke-dashed'
                : 'stroke-blue-500/50'
            }`}
            onClick={() => selectFace(face.id)}
          />

          {/* 삭제 버튼 (호버 시) */}
          {face.selected && (
            <foreignObject
              x={display.x + display.width - 28}
              y={display.y - 8}
              width="24"
              height="24"
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteFace(face.id);
                }}
                className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600"
              >
                ×
              </button>
            </foreignObject>
          )}

          {/* Drag Handle (중앙) */}
          <circle
            cx={display.x + display.width / 2}
            cy={display.y + display.height / 2}
            r={10}
            className="fill-blue-500 cursor-move"
            onMouseDown={(e) => handleDragStart(e, face.id)}
            onTouchStart={(e) => handleTouchStart(e, face.id, 'drag')}
            onPointerDown={(e) => handlePointerDown(e, face.id, 'drag')}
          />

          {/* Resize Handles (모서리) */}
          {/* 우하단 resize handle */}
          <rect
            x={display.x + display.width - 8}
            y={display.y + display.height - 8}
            width="16"
            height="16"
            className="fill-blue-600 cursor-se-resize"
            onMouseDown={(e) => handleResizeStart(e, face.id)}
            onTouchStart={(e) => handleTouchStart(e, face.id, 'resize')}
            onPointerDown={(e) => handlePointerDown(e, face.id, 'resize')}
          />
        </g>
      );
    })}
  </svg>
</div>
```

**2.2 마우스 이벤트 핸들러 구현**
```typescript
const [dragState, setDragState] = useState<{
  faceId: string;
  startX: number;
  startY: number;
  mode: 'drag' | 'resize';
} | null>(null);

const handleDragStart = (e: React.MouseEvent, faceId: string) => {
  e.preventDefault();
  saveSnapshot();
  setDragState({
    faceId,
    startX: e.clientX,
    startY: e.clientY,
    mode: 'drag'
  });
};

const handleResizeStart = (e: React.MouseEvent, faceId: string) => {
  e.preventDefault();
  saveSnapshot();
  setDragState({
    faceId,
    startX: e.clientX,
    startY: e.clientY,
    mode: 'resize'
  });
};

const handleMouseMove = (e: React.MouseEvent) => {
  if (!dragState) return;

  const deltaX = e.clientX - dragState.startX;
  const deltaY = e.clientY - dragState.startY;

  // 디스플레이 변화를 원본 좌표로 변환
  const originalDeltaX = toOriginalCoords(deltaX, displayScale);
  const originalDeltaY = toOriginalCoords(deltaY, displayScale);

  if (dragState.mode === 'drag') {
    // 위치 이동
    setAdjustedFaces(prev => prev.map(face =>
      face.id === dragState.faceId
        ? { ...face, offsetX: (face.offsetX || 0) + originalDeltaX, offsetY: (face.offsetY || 0) + originalDeltaY }
        : face
    ));
  } else {
    // 크기 조정
    setAdjustedFaces(prev => prev.map(face =>
      face.id === dragState.faceId
        ? { ...face, scale: Math.max(0.5, Math.min(2.0, face.scale! + deltaX * 0.01)) }
        : face
    ));
  }

  setDragState(prev => prev ? { ...prev, startX: e.clientX, startY: e.clientY } : null);
};

const handleMouseUp = () => {
  setDragState(null);
};
```

**2.3 터치 이벤트 핸들러**
```typescript
const handleTouchStart = (e: React.TouchEvent, faceId: string, mode: 'drag' | 'resize') => {
  e.preventDefault();
  const touch = e.touches[0];
  saveSnapshot();
  setDragState({
    faceId,
    startX: touch.clientX,
    startY: touch.clientY,
    mode
  });
};

const handleTouchMove = (e: React.TouchEvent) => {
  if (!dragState) return;
  e.preventDefault();

  const touch = e.touches[0];
  const deltaX = touch.clientX - dragState.startX;
  const deltaY = touch.clientY - dragState.startY;

  const originalDeltaX = toOriginalCoords(deltaX, displayScale);
  const originalDeltaY = toOriginalCoords(deltaY, displayScale);

  if (dragState.mode === 'drag') {
    setAdjustedFaces(prev => prev.map(face =>
      face.id === dragState.faceId
        ? { ...face, offsetX: (face.offsetX || 0) + originalDeltaX, offsetY: (face.offsetY || 0) + originalDeltaY }
        : face
    ));
  } else {
    setAdjustedFaces(prev => prev.map(face =>
      face.id === dragState.faceId
        ? { ...face, scale: Math.max(0.5, Math.min(2.0, face.scale! + deltaX * 0.01)) }
        : face
    ));
  }

  setDragState(prev => prev ? { ...prev, startX: touch.clientX, startY: touch.clientY } : null);
};

const handleTouchEnd = () => {
  setDragState(null);
};
```

**2.4 Pointer Events 통합 (선택사항)**
```typescript
// 마우스 + 터치를 하나의 API로 처리하려면 Pointer Events 사용
const handlePointerDown = (e: React.PointerEvent, faceId: string, mode: 'drag' | 'resize') => {
  e.preventDefault();
  saveSnapshot();
  setDragState({
    faceId,
    startX: e.clientX,
    startY: e.clientY,
    mode
  });
};
```

**2.5 얼굴 선택/삭제 핸들러**
```typescript
const [selectedFaceId, setSelectedFaceId] = useState<string | null>(null);

const selectFace = (faceId: string) => {
  setAdjustedFaces(prev => prev.map(face =>
    face.id === faceId ? { ...face, selected: true } : { ...face, selected: false }
  ));
  setSelectedFaceId(faceId);
};

const deleteFace = (faceId: string) => {
  setAdjustedFaces(prev => prev.filter(face => face.id !== faceId));
  setSelectedFaceId(null);
};
```

---

### Phase 3: 이모티콘 선택 UI + 얼굴별 모드 토글 (40분)

**3.1 이모티콘 선택 팝오버**
```tsx
<div className="flex gap-1 mt-2">
  {EMOJI_LIST.map(emoji => (
    <button
      key={emoji}
      onClick={() => updateFaceEmoji(selectedFaceId, emoji)}
      className="text-2xl hover:scale-125 transition-transform"
    >
      {emoji}
    </button>
  ))}
</div>
```

**3.2 크기 조정 슬라이더**
```tsx
<div className="flex items-center gap-2 mt-2">
  <Label>크기</Label>
  <Slider
    value={[selectedFace.scale * 100]}
    onValueChange={([value]) => updateFaceScale(selectedFaceId, value / 100)}
    min={50}
    max={200}
    step={5}
  />
  <span className="text-sm">{Math.round(selectedFace.scale * 100)}%</span>
</div>
```

**3.3 얼굴별 모드 토글**
```tsx
<div className="flex gap-2 mt-2">
  <Button
    variant={selectedFace.mode === 'mosaic' ? 'default' : 'outline'}
    size="sm"
    onClick={() => updateFaceMode(selectedFaceId, 'mosaic')}
  >
    모자이크
  </Button>
  <Button
    variant={selectedFace.mode === 'emoji' ? 'default' : 'outline'}
    size="sm"
    onClick={() => updateFaceMode(selectedFaceId, 'emoji')}
  >
    😊 이모티콘
  </Button>
  <Button
    variant={selectedFace.mode === 'none' ? 'default' : 'outline'}
    size="sm"
    onClick={() => updateFaceMode(selectedFaceId, 'none')}
  >
    없음
  </Button>
</div>

// 핸들러
const updateFaceMode = (faceId: string, mode: BlurMode) => {
  saveSnapshot();
  setAdjustedFaces(prev => prev.map(face =>
    face.id === faceId ? { ...face, mode } : face
  ));
};
```

---

### Phase 4: 실시간 미리보기 + Undo (35분)

**4.1 단일 Undo 구현**
```typescript
const [previousState, setPreviousState] = useState<FaceBoundingBox[] | null>(null);

const saveSnapshot = () => {
  setPreviousState(structuredClone(adjustedFaces));
};

const undo = () => {
  if (previousState) {
    setAdjustedFaces(previousState);
    setPreviousState(null);
    toast({
      title: "마지막 작업 취소",
      description: "이전 상태로 복구했습니다",
    });
  }
};

// Undo 버튼
<Button
  variant="outline"
  size="sm"
  onClick={undo}
  disabled={!previousState}
>
  ↶ 취소
</Button>
```

**4.2 수정된 faceBlur.ts - 얼굴별 모드 지원**
```typescript
// src/lib/faceBlur.ts

function applyEmoji(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  emoji: string = '😊',
  scale: number = 1.0
): void {
  const fontSize = Math.max(Math.min(width, height) * 0.8 * scale, 20);

  ctx.font = `${fontSize}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const centerX = x + width / 2;
  const centerY = y + height / 2;

  ctx.fillText(emoji, centerX, centerY);
}

export function applyFaceBlur(
  imageSource: HTMLImageElement | HTMLCanvasElement | string,
  faces: FaceBoundingBox[],
  globalMode: BlurMode = 'mosaic',
  targetWidth: number = 1000
): Promise<string> {
  // ... 기존 로직

  for (const face of faces) {
    // 얼굴별 모드 오버라이드 체크
    const mode = face.mode || globalMode;
    if (mode === 'none') continue;

    const adjustedX = face.x + (face.offsetX || 0);
    const adjustedY = face.y + (face.offsetY || 0);
    const adjustedWidth = face.width * (face.scale || 1.0);
    const adjustedHeight = face.height * (face.scale || 1.0);

    if (mode === 'mosaic') {
      applyMosaic(
        ctx,
        adjustedX * scaleX,
        adjustedY * scaleY,
        adjustedWidth * scaleX,
        adjustedHeight * scaleY
      );
    } else if (mode === 'emoji') {
      applyEmoji(
        ctx,
        adjustedX * scaleX,
        adjustedY * scaleY,
        adjustedWidth * scaleX,
        adjustedHeight * scaleY,
        face.emoji || '😊',
        face.scale || 1.0
      );
    }
  }
}
```

---

### Phase 5: UI Polish (20분)

**5.1 토스트 알림**
```typescript
// 조정 완료 시
toast({
  title: "이모티콘 조정 완료",
  description: "변경사항이 적용되었습니다",
});
```

**5.3 브라우저 줌 테스트 체크리스트**
```typescript
// 브라우저 줌 레벨 테스트
const testBrowserZoom = () => {
  // 개발자 콘솔에서 테스트:
  // window.devicePixelRatio
  // window.innerWidth
  console.log('devicePixelRatio:', window.devicePixelRatio);
  console.log('innerWidth:', window.innerWidth);

  // 줌 레벨: 90%, 100%, 110%에서 테스트
};
```

---

## 🎨 최종 UI 구성

```
┌────────────────────────────────────────────────┐
│  얼굴 모자이크 처리                              │
│  [키워드]  👤 N개 감지  ⏱ XXms                  │
│  [↶ 취소]                                      │
├────────────────────────────────────────────────┤
│  [모자이크]  [😊 이모티콘]  [원본]               │
│                                                 │
│  📌 선택된 얼굴: Face-3                       │
│  이모티콘: 😊 😄 🙂 😐 😎 🤗               │
│  모드: [모자이크] [😊] [없음]                   │
│  크기: ━━━━●━━━━━━  100%                       │
├────────────────────────────────────────────────┤
│                                                 │
│    ┌─────────────────┐                        │
│    │   원본 이미지    │                        │
│    │                 │                        │
│    │  ┌─────┐       │  ← 드래그 가능          │
│    │  │ 😊  │ ○ × │  ← resize + 삭제버튼        │
│    │  └─────┘       │                        │
│    │  ┌─────┐       │  ← 선택됨 (점선)           │
│    │  │ 😄  │ ×   │                         │
│    │  └─────┘       │                         │
│    └─────────────────┘                        │
│                                                 │
├────────────────────────────────────────────────┤
│  [취소]                        [적용]          │
└────────────────────────────────────────────────┘
```

---

## ⚠️ 주의사항

1. **브라우저 줌**: 90%, 100%, 110%에서 테스트 필요
2. **HiDPI 디스플레이**: devicePixelRatio 고려
3. **터치 이벤트**: 실제 모바일 기기에서 테스트 필수
4. **좌표 드리프트**: 원본 좌표 기반으로 저장하여 방지

---

## 📁 관련 파일

| 파일 | 역할 | 변경사항 |
|------|------|----------|
| `src/hooks/useFaceDetection.ts` | FaceBoundingBox 타입 확장 | mode, selected 추가 |
| `src/lib/faceBlur.ts` | applyFaceBlur 함수 수정 | 얼굴별 모드 오버라이드 지원 |
| `src/components/FaceBlurModal.tsx` | Overlay UI, 이벤트 핸들러, 상태 관리 | 터치, Undo, 선택, 삭제 추가 |

---

## 📚 기술 스택

- **얼굴 인식**: face-api.js (SSD MobileNet V1) - 유지
- **UI**: React + TypeScript, SVG overlay
- **이미지 처리**: Canvas API - 확장
- **컴포넌트**: shadcn/ui (Slider, Button 등)
- **상태 관리**: React useState (structuredClone for Undo)
- **좌표 변환**: 원본 이미지 좌표계 + 디스플레이 스케일

