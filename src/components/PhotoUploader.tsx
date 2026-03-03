import { useRef, useState, useMemo } from 'react';
import imageCompression from 'browser-image-compression';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { X, GripVertical, Loader2, ImagePlus, Upload } from 'lucide-react';

// 진료과별 키워드 예시
const DEPARTMENT_KEYWORDS: Record<string, string[]> = {
  internal_medicine: [
    "예: 건강검진, 혈압 측정",
    "예: 만성질환 상담, 당뇨 관리",
    "예: 혈액검사, 건강 상담",
    "예: 영양 상담, 식단 관리",
    "예: 예방접종, 건강 관리",
    "예: 환자 상담, 진료",
    "예: 운동 처방, 건강 증진",
    "예: 금연 클리닉, 건강 교육",
    "예: 성인병 예방, 정기 검진",
    "예: 이벤트, 건강 강연",
  ],
  pediatrics: [
    "예: 예방접종, 소아 진료",
    "예: 성장 클리닉, 키 측정",
    "예: 영유아 검진, 건강 상담",
    "예: 소아 감기, 진료",
    "예: 알레르기 검사, 상담",
    "예: 영양 상담, 아이 건강",
    "예: 발달 검사, 상담",
    "예: 부모 상담, 육아 교육",
    "예: 신생아 검진, 건강 관리",
    "예: 이벤트, 건강 강연",
  ],
  ent: [
    "예: 청력 검사, 귀 진료",
    "예: 비염 치료, 코 내시경",
    "예: 축농증 수술, 상담",
    "예: 편도 수술, 목 진료",
    "예: 이명 치료, 귀 상담",
    "예: 어지럼증 클리닉, 진료",
    "예: 수면 무호흡, 상담",
    "예: 알레르기 비염, 치료",
    "예: 후두 검사, 목 상담",
    "예: 이벤트, 건강 강연",
  ],
  dermatology: [
    "예: 피부 검진, 상담",
    "예: 여드름 치료, 피부 관리",
    "예: 피부 미백, 시술",
    "예: 주름 치료, 보톡스",
    "예: 색소 치료, 기미 제거",
    "예: 모낭염 치료, 두피 관리",
    "예: 아토피 치료, 피부 상담",
    "예: 필러 시술, 리프팅",
    "예: 레이저 치료, 피부 재생",
    "예: 이벤트, 건강 강연",
  ],
  ophthalmology: [
    "예: 시력 검사, 안과 진료",
    "예: 백내장 수술, 상담",
    "예: 녹내장 검사, 진료",
    "예: 망막 검사, 안저 촬영",
    "예: 라식 수술, 상담",
    "예: 안구건조증, 치료",
    "예: 사시 수술, 상담",
    "예: 결막염 치료, 진료",
    "예: 눈물길 수술, 상담",
    "예: 이벤트, 건강 강연",
  ],
  orthopedics: [
    "예: 관절 내시경, 수술 상담",
    "예: 척추 클리닉, 허리 진료",
    "예: 인공관절 수술, 상담",
    "예: 어깨 통증, 진료",
    "예: 무릎 관절염, 치료",
    "예: 골절 치료, 석고 고정",
    "예: 스포츠 의학, 재활",
    "예: 디스크 치료, 상담",
    "예: 도수 치료, 재활 운동",
    "예: 이벤트, 건강 강연",
  ],
  obstetrics: [
    "예: 산전 검진, 임신 상담",
    "예: 초음파 검사, 태아 확인",
    "예: 임신 성 educati, 영양 상담",
    "예: 출산 전후, 관리",
    "예: 부인과 검진, 자궁경부",
    "예: 불임 상담, 임신 계획",
    "예: 자궁근종, 상담",
    "예: 냉 대하증, 진료",
    "예: 폐경 관리, 호르몬 치료",
    "예: 이벤트, 건강 강연",
  ],
  urology: [
    "예: 전립선 검진, 남성 건강",
    "예: 소변 검사, 비뇨기 진료",
    "예: 신장 결석, 치료 상담",
    "예: 전립선 비대증, 치료",
    "예: 발기부전, 남성 상담",
    "예: 요실금 치료, 재활",
    "예: 방광염 치료, 진료",
    "예: 남성 불임, 상담",
    "예: 요로 감염, 치료",
    "예: 이벤트, 건강 강연",
  ],
  psychiatry: [
    "예: 심리 상담, 정신 건강",
    "예: 불면증 치료, 수면 클리닉",
    "예: 우울증 상담, 치료",
    "예: 불안 장애, 진료",
    "예: 스트레스 관리, 상담",
    "예: 공황 장애, 치료",
    "예: ADHD 진단, 상담",
    "예: 강박 장애, 치료",
    "예: 정신 건강 교육, 상담",
    "예: 이벤트, 건강 강연",
  ],
  dentistry: [
    "예: 구강 검진, 환자분 상담하는 모습",
    "예: 스케일링, 치석 제거 진료",
    "예: 임플란트 상담, 정밀 진단",
    "예: 치아 미백, 심미 치료",
    "예: 충치 치료, 치아 복원",
    "예: 발치 진료, 사랑니 발치",
    "예: 보철 치료, 크라운 제작",
    "예: 교정 상담, 투명 교정기",
    "예: 예방 치료, 불소 도포",
    "예: 이벤트, 건강 강연",
  ],
  anesthesiology: [
    "예: 수술 전 상담, 마취 계획",
    "예: 통증 클리닉, 만성 통증",
    "예: 수술 마취, 모니터링",
    "예: 신경 차단술, 통증 완화",
    "예: 척추 마취, 시술",
    "예: 수술 후 통증 관리",
    "예: 암성 통증, 완화 치료",
    "예: 영역 마취, 상담",
    "예: 통증 재활, 치료",
    "예: 이벤트, 건강 강연",
  ],
};

// 기본 키워드 예시 (진료과 미지정 시)
const DEFAULT_KEYWORDS = [
  "예: 건강검진, 환자 상담",
  "예: 진료, 치료",
  "예: 상담, 검사",
  "예: 예방 접종, 건강 관리",
  "예: 환자 교육, 상담",
  "예: 정기 검진, 진료",
  "예: 건강 상담, 검사",
  "예: 치료, 관리",
  "예: 예방, 건강 증진",
  "예: 이벤트, 건강 강연",
];

export interface PhotoItem {
  id: string;
  file: File;
  preview: string;
  keyword: string;
}

interface PhotoUploaderProps {
  photos: PhotoItem[];
  onPhotosChange: (photos: PhotoItem[]) => void;
  isLoading?: boolean;
  maxPhotos?: number;
  department?: string;
  onPhotoClick?: (photo: PhotoItem) => void;
}

interface SortablePhotoItemProps {
  photo: PhotoItem;
  index: number;
  onKeywordChange: (id: string, keyword: string) => void;
  onRemove: (id: string) => void;
  isDisabled: boolean;
  placeholderExample: string;
  onPhotoClick?: (photo: PhotoItem) => void;
}

const SortablePhotoItem = ({ photo, index, onKeywordChange, onRemove, isDisabled, placeholderExample, onPhotoClick }: SortablePhotoItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: photo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`overflow-hidden transition-all duration-300 border-border/60 group ${
        isDragging 
          ? 'opacity-60 shadow-elevated ring-2 ring-primary/40 scale-[1.02] z-50 rotate-1' 
          : 'shadow-soft hover:shadow-card hover:border-primary/30'
      }`}
    >
      <CardContent className="p-4">
        <div className="flex gap-4 items-start">
          {/* Drag Handle + Order indicator */}
          <div 
            className="flex flex-col items-center gap-2 pt-1 cursor-grab active:cursor-grabbing touch-none transition-transform duration-200 hover:scale-110"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="w-5 h-5 text-muted-foreground/40 group-hover:text-primary transition-colors duration-200" />
            <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary text-xs font-bold flex items-center justify-center transition-all duration-200 group-hover:bg-primary/20 group-hover:scale-105">
              {index + 1}
            </span>
          </div>

          {/* Thumbnail */}
          <div 
            className={`relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-muted shadow-soft group/thumb transition-transform duration-300 ${onPhotoClick ? 'cursor-pointer hover:ring-2 hover:ring-primary/50 hover:scale-105' : 'hover:scale-105'}`}
            onClick={(e) => {
              if (onPhotoClick) {
                e.stopPropagation();
                onPhotoClick(photo);
              }
            }}
          >
            <img
              src={photo.preview}
              alt={`사진 ${index + 1}`}
              className="w-full h-full object-cover transition-transform duration-500 group-hover/thumb:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover/thumb:opacity-100 transition-opacity duration-300" />
          </div>

          {/* Keyword Input */}
          <div className="flex-1 space-y-2">
            <label className="text-xs font-medium text-muted-foreground transition-colors duration-200 group-hover:text-foreground/70">
              이 사진의 진료/상황 키워드 입력
            </label>
            <Input
              placeholder={placeholderExample}
              value={photo.keyword}
              onChange={(e) => onKeywordChange(photo.id, e.target.value)}
              disabled={isDisabled}
              className="text-sm h-10 transition-all duration-200 focus:shadow-soft"
            />
          </div>

          {/* Remove Button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110"
            onClick={() => onRemove(photo.id)}
            disabled={isDisabled}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const compressImage = async (file: File): Promise<File> => {
  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1024,
    useWebWorker: true,
    fileType: 'image/jpeg' as const,
    initialQuality: 0.8,
  };

  try {
    const compressedFile = await imageCompression(file, options);
    return compressedFile;
  } catch (error) {
    console.error('Image compression failed:', error);
    return file;
  }
};

const PhotoUploader = ({ photos, onPhotosChange, isLoading = false, maxPhotos = 5, department, onPhotoClick }: PhotoUploaderProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // 진료과에 따른 키워드 예시 선택
  const placeholderExamples = useMemo(() => {
    if (department && DEPARTMENT_KEYWORDS[department]) {
      return DEPARTMENT_KEYWORDS[department];
    }
    return DEFAULT_KEYWORDS;
  }, [department]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = photos.findIndex((p) => p.id === active.id);
      const newIndex = photos.findIndex((p) => p.id === over.id);
      onPhotosChange(arrayMove(photos, oldIndex, newIndex));
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    await processFiles(files);
  };

  const processFiles = async (files: File[]) => {
    const remainingSlots = maxPhotos - photos.length;
    const filesToAdd = files.slice(0, remainingSlots);

    if (filesToAdd.length === 0) return;

    setIsCompressing(true);

    try {
      const compressedFiles = await Promise.all(
        filesToAdd.map(file => compressImage(file))
      );

      const newPhotos: PhotoItem[] = compressedFiles.map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        preview: URL.createObjectURL(file),
        keyword: '',
      }));

      onPhotosChange([...photos, ...newPhotos]);
    } catch (error) {
      console.error('Error processing images:', error);
    } finally {
      setIsCompressing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files).filter(file => 
      file.type.startsWith('image/')
    );
    
    if (files.length > 0) {
      await processFiles(files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleRemovePhoto = (id: string) => {
    const photoToRemove = photos.find(p => p.id === id);
    if (photoToRemove) {
      URL.revokeObjectURL(photoToRemove.preview);
    }
    onPhotosChange(photos.filter(p => p.id !== id));
  };

  const handleKeywordChange = (id: string, keyword: string) => {
    onPhotosChange(
      photos.map(p => p.id === id ? { ...p, keyword } : p)
    );
  };

  const isDisabled = isLoading || isCompressing;

  return (
    <div className="space-y-5">
      {/* Upload Button with Drag & Drop */}
      <Card 
        className={`border-dashed border-2 transition-all duration-300 cursor-pointer group ${
          isDragOver 
            ? 'border-primary bg-primary/10 scale-[1.02] shadow-elevated' 
            : 'border-primary/25 bg-forest-light hover:bg-primary/5 hover:border-primary/40 hover:shadow-card'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !isDisabled && photos.length < maxPhotos && fileInputRef.current?.click()}
      >
        <CardContent className="p-8">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            disabled={isDisabled || photos.length >= maxPhotos}
          />
          <div className="w-full h-28 flex flex-col items-center justify-center gap-3">
            {isCompressing ? (
              <>
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <span className="text-sm text-primary font-medium animate-pulse">
                  사진 최적화 중...
                </span>
              </>
            ) : isDragOver ? (
              <>
                <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center animate-bounce">
                  <Upload className="w-7 h-7 text-primary" />
                </div>
                <span className="text-sm font-medium text-primary">
                  여기에 사진을 놓으세요!
                </span>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center transition-all duration-300 group-hover:bg-primary/25 group-hover:scale-110 group-hover:rotate-3">
                  <ImagePlus className="w-7 h-7 text-primary transition-transform duration-300 group-hover:scale-110" />
                </div>
                <div className="space-y-1 text-center">
                  <span className="text-sm font-medium text-foreground transition-colors duration-200 group-hover:text-primary">
                    오늘의 진료/이벤트 사진 순서대로 선택하기
                  </span>
                  <span className="text-xs text-muted-foreground block transition-colors duration-200">
                    {photos.length}/{maxPhotos}장 선택됨 · 드래그 앤 드롭 가능
                  </span>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Photo List with Drag & Drop */}
      {photos.length > 0 && (
        <div className="space-y-4 animate-fade-in">
          <p className="text-sm font-medium text-muted-foreground flex items-center gap-2 transition-colors duration-200 hover:text-foreground/70">
            <GripVertical className="w-4 h-4 animate-pulse" />
            드래그하여 순서 변경 가능 ({photos.length}장)
          </p>
          
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={photos.map(p => p.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {photos.map((photo, index) => (
                  <SortablePhotoItem
                    key={photo.id}
                    photo={photo}
                    index={index}
                    onKeywordChange={handleKeywordChange}
                    onRemove={handleRemovePhoto}
                    isDisabled={isDisabled}
                    placeholderExample={placeholderExamples[index % placeholderExamples.length]}
                    onPhotoClick={onPhotoClick}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}
    </div>
  );
};

export default PhotoUploader;