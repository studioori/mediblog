import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Users, Sparkles, ImageOff, Clock, Check } from 'lucide-react';
import { useFaceDetection, type FaceDetectionResult } from '@/hooks/useFaceDetection';
import { applyFaceBlur, type BlurMode } from '@/lib/faceBlur';
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

interface FaceBlurModalProps {
  isOpen: boolean;
  onClose: () => void;
  photo: PhotoItem | null;
  onApply?: (processedFile: File | null, photoId: string) => void;
}

const FaceBlurModal = ({ isOpen, onClose, photo, onApply }: FaceBlurModalProps) => {
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [detectionResult, setDetectionResult] = useState<FaceDetectionResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blurMode, setBlurMode] = useState<BlurMode>('mosaic');
  
  const { isReady: isDetectorReady, detectFacesFromUrl } = useFaceDetection();

  const processImage = useCallback(async () => {
    if (!photo) return;

    setIsProcessing(true);
    setError(null);
    setProcessedImage(null);
    setDetectionResult(null);

    try {
      const result = await detectFacesFromUrl(photo.preview);
      setDetectionResult(result);

      const blurredImage = await applyFaceBlur(
        photo.preview,
        result.faces,
        blurMode,
        1000
      );
      setProcessedImage(blurredImage);
    } catch (err) {
      console.error('Face blur processing failed:', err);
      setError(err instanceof Error ? err.message : '이미지 처리 실패');
    } finally {
      setIsProcessing(false);
    }
  }, [photo, blurMode, detectFacesFromUrl]);

  const applyBlurMode = useCallback(async () => {
    if (!photo || !detectionResult) return;

    setIsProcessing(true);
    try {
      const blurredImage = await applyFaceBlur(
        photo.preview,
        detectionResult.faces,
        blurMode,
        1000
      );
      setProcessedImage(blurredImage);
    } catch (err) {
      console.error('Apply blur failed:', err);
      setError(err instanceof Error ? err.message : '이미지 처리 실패');
    } finally {
      setIsProcessing(false);
    }
  }, [photo, detectionResult, blurMode]);

  useEffect(() => {
    if (isOpen && photo && isDetectorReady) {
      processImage();
    }
  }, [isOpen, photo, isDetectorReady]);

  useEffect(() => {
    if (detectionResult && !isProcessing) {
      applyBlurMode();
    }
  }, [blurMode]);

  useEffect(() => {
    if (!isOpen) {
      setProcessedImage(null);
      setDetectionResult(null);
      setError(null);
      setBlurMode('mosaic');
    }
  }, [isOpen]);

  const handleModeChange = (mode: BlurMode) => {
    setBlurMode(mode);
  };

  const handleApply = () => {
    if (!photo || !onApply) return;

    if (blurMode === 'none') {
      onApply(null, photo.id);
    } else if (processedImage) {
      const originalName = photo.file.name;
      const extension = originalName.split('.').pop() || 'jpg';
      const baseName = originalName.replace(/\.[^/.]+$/, '');
      const newFileName = `${baseName}_processed.${extension}`;
      const processedFile = base64ToFile(processedImage, newFileName);
      onApply(processedFile, photo.id);
    }
    onClose();
  };

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
                      {detectionResult.faces.length}개 감지
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

        <div className="space-y-4 flex-1 flex flex-col min-h-0">
          <div className="flex gap-2">
            <Button
              variant={blurMode === 'mosaic' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleModeChange('mosaic')}
              disabled={isProcessing}
            >
              모자이크
            </Button>
            <Button
              variant={blurMode === 'emoji' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleModeChange('emoji')}
              disabled={isProcessing}
            >
              😊 이모티콘
            </Button>
            <Button
              variant={blurMode === 'none' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleModeChange('none')}
              disabled={isProcessing}
            >
              원본
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 border rounded-lg p-4 bg-muted/30">
            {isProcessing && (
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

            {!isProcessing && !error && processedImage && (
              <div className="flex justify-center">
                <img
                  src={processedImage}
                  alt="처리된 이미지"
                  className="max-w-full h-auto rounded-lg shadow-lg"
                  style={{ width: '1000px' }}
                />
              </div>
            )}

            {!isProcessing && !error && !processedImage && detectionResult && detectionResult.faces.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Users className="w-10 h-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  감지된 얼굴이 없습니다
                </p>
              </div>
            )}
          </div>

          {onApply && !isProcessing && !error && (processedImage || blurMode === 'none') && (
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
