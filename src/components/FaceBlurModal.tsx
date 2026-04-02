import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Loader2, Users, Sparkles, ImageOff, Clock, Check, Undo2, X } from 'lucide-react';
import { useFaceDetection, type FaceDetectionResult, type FaceBoundingBox, type BlurMode, initializeFaceBoxes, EMOJI_LIST } from '@/hooks/useFaceDetection';
import { applyFaceBlur } from '@/lib/faceBlur';
import { type PhotoItem } from '@/components/PhotoUploader';

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

const cloneState = <T,>(state: T): T => {
  return typeof structuredClone === 'function' 
    ? structuredClone(state) 
    : JSON.parse(JSON.stringify(state));
};

interface FaceBlurModalProps {
  isOpen: boolean;
  onClose: () => void;
  photo: PhotoItem | null;
  onApply?: (processedFile: File | null, photoId: string, faceSettings?: FaceBoundingBox[]) => void;
}

const FaceBlurModal = ({ isOpen, onClose, photo, onApply }: FaceBlurModalProps) => {
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [detectionResult, setDetectionResult] = useState<FaceDetectionResult | null>(null);
  const [adjustedFaces, setAdjustedFaces] = useState<FaceBoundingBox[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [globalMode, setGlobalMode] = useState<BlurMode>('emoji');
  const [selectedFaceId, setSelectedFaceId] = useState<string | null>(null);
  const [previousState, setPreviousState] = useState<FaceBoundingBox[] | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { isReady: isDetectorReady, detectFacesFromUrl } = useFaceDetection();

  const [dragState, setDragState] = useState<{
    faceId: string;
    startX: number;
    startY: number;
    mode: 'drag' | 'resize';
  } | null>(null);
  const [displayScale, setDisplayScale] = useState(1);

  useEffect(() => {
    if (imageLoaded && imageRef.current && detectionResult) {
      const scale = imageRef.current.offsetWidth / detectionResult.imageWidth;
      setDisplayScale(scale);
    }
  }, [imageLoaded, detectionResult]);

  const toDisplayCoords = useCallback((face: FaceBoundingBox) => {
    const scale = displayScale;
    return {
      x: (face.x + (face.offsetX || 0)) * scale,
      y: (face.y + (face.offsetY || 0)) * scale,
      width: face.width * (face.scale || 1.0) * scale,
      height: face.height * (face.scale || 1.0) * scale,
    };
  }, [displayScale]);

  const toOriginalCoords = useCallback((displayValue: number): number => {
    return displayValue / displayScale;
  }, [displayScale]);

  const saveSnapshot = useCallback(() => {
    setPreviousState(cloneState(adjustedFaces));
  }, [adjustedFaces]);

  const undo = useCallback(() => {
    if (previousState) {
      setAdjustedFaces(previousState);
      setPreviousState(null);
    }
  }, [previousState]);

  const processImage = useCallback(async () => {
    if (!photo) return;

    setIsProcessing(true);
    setError(null);
    setProcessedImage(null);
    setDetectionResult(null);
    setAdjustedFaces([]);
    setSelectedFaceId(null);
    setPreviousState(null);

    const imageToProcess = photo.originalPreview || photo.preview;

    if (photo.faceSettings && photo.faceSettings.length > 0) {
      setAdjustedFaces(photo.faceSettings);
      const img = new Image();
      img.onload = () => {
        setDetectionResult({
          faces: photo.faceSettings!,
          imageWidth: img.naturalWidth,
          imageHeight: img.naturalHeight,
          processingTime: 0,
        });
        setProcessedImage(imageToProcess);
        setIsProcessing(false);
      };
      img.src = imageToProcess;
      return;
    }

    try {
      const result = await detectFacesFromUrl(imageToProcess);
      setDetectionResult(result);
      
      const initializedFaces = initializeFaceBoxes(result.faces).map(face => ({
        ...face,
        mode: globalMode,
      }));
      setAdjustedFaces(initializedFaces);

      setProcessedImage(imageToProcess);
    } catch (err) {
      console.error('Face blur processing failed:', err);
      setError(err instanceof Error ? err.message : '이미지 처리 실패');
    } finally {
      setIsProcessing(false);
    }
  }, [photo, globalMode, detectFacesFromUrl]);

  useEffect(() => {
    if (isOpen && photo && isDetectorReady) {
      processImage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, photo, isDetectorReady]);

  useEffect(() => {
    if (!isOpen) {
      setProcessedImage(null);
      setDetectionResult(null);
      setAdjustedFaces([]);
      setError(null);
      setGlobalMode('emoji');
      setSelectedFaceId(null);
      setPreviousState(null);
      setImageLoaded(false);
    }
  }, [isOpen]);

  const handleGlobalModeChange = (mode: BlurMode) => {
    setGlobalMode(mode);
    saveSnapshot();
    setAdjustedFaces(prev => prev.map(face => ({ ...face, mode })));
  };

  const selectFace = (faceId: string) => {
    setAdjustedFaces(prev => prev.map(face => ({
      ...face,
      selected: face.id === faceId,
    })));
    setSelectedFaceId(faceId);
  };

  const deleteFace = (faceId: string) => {
    saveSnapshot();
    setAdjustedFaces(prev => prev.filter(face => face.id !== faceId));
    setSelectedFaceId(null);
  };

  const handlePointerDown = (e: React.PointerEvent, faceId: string, mode: 'drag' | 'resize') => {
    e.preventDefault();
    e.stopPropagation();
    saveSnapshot();
    selectFace(faceId);
    setDragState({
      faceId,
      startX: e.clientX,
      startY: e.clientY,
      mode,
    });
  };

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!dragState) return;

    const deltaX = e.clientX - dragState.startX;
    const deltaY = e.clientY - dragState.startY;

    const originalDeltaX = toOriginalCoords(deltaX);
    const originalDeltaY = toOriginalCoords(deltaY);

    if (dragState.mode === 'drag') {
      setAdjustedFaces(prev => prev.map(face =>
        face.id === dragState.faceId
          ? { 
              ...face, 
              offsetX: (face.offsetX || 0) + originalDeltaX, 
              offsetY: (face.offsetY || 0) + originalDeltaY 
            }
          : face
      ));
    } else {
      const scaleDelta = deltaX * 0.005;
      setAdjustedFaces(prev => prev.map(face =>
        face.id === dragState.faceId
          ? { ...face, scale: Math.max(0.5, Math.min(2.0, (face.scale || 1.0) + scaleDelta)) }
          : face
      ));
    }

    setDragState(prev => prev ? { ...prev, startX: e.clientX, startY: e.clientY } : null);
  }, [dragState, toOriginalCoords]);

  const handlePointerUp = useCallback(() => {
    setDragState(null);
  }, []);

  useEffect(() => {
    if (dragState) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      return () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
      };
    }
  }, [dragState, handlePointerMove, handlePointerUp]);

  const updateFaceEmoji = (faceId: string, emoji: string) => {
    saveSnapshot();
    setAdjustedFaces(prev => prev.map(face =>
      face.id === faceId ? { ...face, emoji, mode: 'emoji' } : face
    ));
  };

  const updateFaceScale = (faceId: string, scale: number) => {
    saveSnapshot();
    setAdjustedFaces(prev => prev.map(face =>
      face.id === faceId ? { ...face, scale } : face
    ));
  };

  const updateFaceMode = (faceId: string, mode: BlurMode) => {
    saveSnapshot();
    setAdjustedFaces(prev => prev.map(face =>
      face.id === faceId ? { ...face, mode } : face
    ));
  };

  const handleApply = async () => {
    if (!photo || !onApply) return;

    if (adjustedFaces.length === 0) {
      onApply(null, photo.id, adjustedFaces);
      onClose();
      return;
    }
    
    setIsProcessing(true);
    try {
      const finalImage = await applyFaceBlur(
        photo.originalPreview || photo.preview,
        adjustedFaces,
        1000
      );
      const originalName = photo.file.name;
      const extension = originalName.split('.').pop() || 'jpg';
      const baseName = originalName.replace(/\.[^/.]+$/, '');
      const newFileName = `${baseName}_processed.${extension}`;
      const processedFile = base64ToFile(finalImage, newFileName);
      onApply(processedFile, photo.id, adjustedFaces);
      onClose();
    } catch (err) {
      console.error('Final image generation failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const selectedFace = adjustedFaces.find(f => f.id === selectedFaceId);

  const panelPosition = useMemo(() => {
    if (!selectedFace || !imageRef.current) {
      return { top: 8, right: 8 };
    }

    const display = toDisplayCoords(selectedFace);
    const imageWidth = imageRef.current.offsetWidth;
    const imageHeight = imageRef.current.offsetHeight;
    const panelWidth = 224;
    const panelHeight = 140;
    const margin = 16;
    const panelGap = 24;

    const faceCenterX = display.x + display.width / 2;
    const imageCenterX = imageWidth / 2;

    let left: number | undefined;
    let right: number | undefined;

    if (faceCenterX > imageCenterX) {
      left = Math.max(margin, display.x - panelWidth - panelGap);
    } else {
      right = imageWidth - (display.x + display.width) - panelGap - panelWidth;
      if (right < margin) {
        right = undefined;
        left = margin;
      }
    }

    const top = Math.max(margin, Math.min(display.y, imageHeight - panelHeight - margin));

    return { top, left, right };
  }, [selectedFace, toDisplayCoords]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[1080px] h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            얼굴 모자이크 처리
          </DialogTitle>
          <DialogDescription>
            {photo && (
              <span className="flex items-center gap-2">
                {photo.keyword || '키워드 없음'}
                {detectionResult && (
                  <>
                    <Badge variant="secondary" className="ml-2">
                      <Users className="w-3 h-3 mr-1" />
                      {adjustedFaces.length}개
                    </Badge>
                    <Badge variant="outline" className="ml-1">
                      <Clock className="w-3 h-3 mr-1" />
                      {detectionResult.processingTime}ms
                    </Badge>
                  </>
                )}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 flex-1 flex flex-col min-h-0">
          <div className="flex gap-2 items-center">
            <Button
              variant={globalMode === 'emoji' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleGlobalModeChange('emoji')}
              disabled={isProcessing}
            >
              😊 이모티콘
            </Button>
            <Button
              variant={globalMode === 'mosaic' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleGlobalModeChange('mosaic')}
              disabled={isProcessing}
            >
              모자이크
            </Button>
            
            <div className="flex-1" />
            
            <Button
              variant="outline"
              size="sm"
              onClick={undo}
              disabled={!previousState}
              className="gap-1"
            >
              <Undo2 className="w-4 h-4" />
              취소
            </Button>
          </div>



          <div className="flex-1 overflow-y-auto min-h-0 border rounded-lg p-4 bg-muted/30">
            {isProcessing && !processedImage && (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  얼굴 인식 및 처리 중...
                </p>
              </div>
            )}

            {error && (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <ImageOff className="w-10 h-10 text-destructive" />
                <p className="text-sm text-destructive">{error}</p>
                <Button variant="outline" size="sm" onClick={processImage}>
                  다시 시도
                </Button>
              </div>
            )}

            {!isProcessing && !error && processedImage && detectionResult && (
              <div className="flex justify-center">
                <div ref={containerRef} className="relative inline-block">
                  <img
                    ref={imageRef}
                    src={processedImage}
                    alt="처리된 이미지"
                    className="block max-w-full rounded-lg shadow-lg"
                    style={{ width: '1000px' }}
                    onLoad={() => setImageLoaded(true)}
                    draggable={false}
                  />
                  
                  {imageLoaded && adjustedFaces.length > 0 && (
                    <svg
                      className="absolute top-0 left-0 pointer-events-none"
                      style={{
                        width: imageRef.current?.offsetWidth,
                        height: imageRef.current?.offsetHeight,
                        touchAction: 'none',
                      }}
                    >
                      {adjustedFaces.map(face => {
                        const display = toDisplayCoords(face);
                        const mode = face.mode || 'mosaic';
                        const showPreview = mode !== 'none';
                        
                        return (
                          <g key={face.id} className="pointer-events-auto">
                            {showPreview && mode === 'mosaic' && (
                              <rect
                                x={display.x}
                                y={display.y}
                                width={display.width}
                                height={display.height}
                                className="fill-gray-500/60"
                              />
                            )}
                            {showPreview && mode === 'emoji' && (
                              <text
                                x={display.x + display.width / 2}
                                y={display.y + display.height / 2 - display.height * 0.08}
                                textAnchor="middle"
                                dominantBaseline="central"
                                fontSize={Math.min(display.width, display.height)}
                                style={{ userSelect: 'none' }}
                              >
                                {face.emoji || '😊'}
                              </text>
                            )}
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
                              onClick={() => selectFace(face.id!)}
                            />
                            
                            {face.selected && (
                              <>
                                <foreignObject
                                  x={display.x + display.width - 28}
                                  y={display.y - 8}
                                  width="24"
                                  height="24"
                                >
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteFace(face.id!);
                                    }}
                                    className="w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 text-sm font-bold"
                                  >
                                    ×
                                  </button>
                                </foreignObject>
                              </>
                            )}
                            
                            <text
                              x={display.x + display.width / 2}
                              y={display.y + display.height / 2}
                              textAnchor="middle"
                              dominantBaseline="central"
                              fontSize={Math.min(display.width, display.height) * 0.7}
                              style={{ 
                                userSelect: 'none',
                                cursor: 'move',
                                opacity: mode === 'emoji' ? 0 : 1,
                              }}
                              className={face.selected ? 'fill-primary' : 'fill-blue-500'}
                              onPointerDown={(e) => handlePointerDown(e, face.id!, 'drag')}
                            >
                              {face.emoji || '😊'}
                            </text>
                            
                            <rect
                              x={display.x + display.width - 8}
                              y={display.y + display.height - 8}
                              width="16"
                              height="16"
                              className={`fill-blue-600 cursor-se-resize ${
                                face.selected ? 'fill-primary' : ''
                              }`}
                              onPointerDown={(e) => handlePointerDown(e, face.id!, 'resize')}
                            />
                          </g>
                        );
                      })}
                    </svg>
                  )}
                  
                  {imageLoaded && selectedFace && (
                    <div 
                      className="absolute w-56 bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg p-2 space-y-1.5 z-10"
                      style={{
                        top: panelPosition.top,
                        left: panelPosition.left,
                        right: panelPosition.right,
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">얼굴 편집</span>
                        <button
                          onClick={() => setSelectedFaceId(null)}
                          className="h-5 w-5 rounded hover:bg-muted flex items-center justify-center"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      
                      <div className="flex gap-0.5 justify-center">
                        {EMOJI_LIST.map(emoji => (
                          <button
                            key={emoji}
                            onClick={() => updateFaceEmoji(selectedFace.id!, emoji)}
                            className={`text-xl hover:scale-110 transition-transform p-0.5 rounded ${
                              selectedFace.emoji === emoji ? 'bg-primary/20 ring-1 ring-primary' : ''
                            }`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>

                       <div className="flex gap-1">
                         <button
                           onClick={() => updateFaceMode(selectedFace.id!, 'emoji')}
                           className={`flex-1 text-xs px-2 py-1 rounded transition-colors ${
                             selectedFace.mode === 'emoji' 
                               ? 'bg-primary text-primary-foreground' 
                               : 'bg-muted hover:bg-muted/80'
                           }`}
                         >
                           이모티콘
                         </button>
                         <button
                           onClick={() => updateFaceMode(selectedFace.id!, 'mosaic')}
                           className={`flex-1 text-xs px-2 py-1 rounded transition-colors ${
                             selectedFace.mode === 'mosaic' 
                               ? 'bg-primary text-primary-foreground' 
                               : 'bg-muted hover:bg-muted/80'
                           }`}
                         >
                           모자이크
                         </button>
                       </div>

                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">크기</span>
                          <span className="text-xs font-mono">
                            {Math.round((selectedFace.scale || 1.0) * 100)}%
                          </span>
                        </div>
                        <Slider
                          value={[(selectedFace.scale || 1.0) * 100]}
                          onValueChange={([value]) => updateFaceScale(selectedFace.id!, value / 100)}
                          min={50}
                          max={200}
                          step={5}
                          className="h-4"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {!isProcessing && !error && !processedImage && detectionResult && adjustedFaces.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Users className="w-10 h-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  감지된 얼굴이 없습니다
                </p>
              </div>
            )}
          </div>

          {onApply && !isProcessing && !error && processedImage && (
            <div className="flex justify-end pt-2">
              <Button
                onClick={handleApply}
                className="gap-2"
              >
                <Check className="w-4 h-4" />
                적용
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FaceBlurModal;
