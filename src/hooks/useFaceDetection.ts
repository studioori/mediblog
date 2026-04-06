import { useRef, useState, useCallback, useEffect } from 'react';
import { 
  workerLoadModels, 
  workerWarmup,
  workerDetectFaces as workerDetect
} from '@/lib/faceDetectionWorkerClient';

export type BlurMode = 'mosaic' | 'emoji' | 'none';

export interface FaceBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  emoji?: string;
  scale?: number;
  offsetX?: number;
  offsetY?: number;
  id?: string;
  mode?: BlurMode;
  mosaicStrength?: number;
  selected?: boolean;
}

export interface FaceDetectionResult {
  faces: FaceBoundingBox[];
  imageWidth: number;
  imageHeight: number;
  processingTime: number;
}

interface UseFaceDetectionReturn {
  isReady: boolean;
  isLoading: boolean;
  error: string | null;
  detectFaces: (imageElement: HTMLImageElement | HTMLCanvasElement) => Promise<FaceDetectionResult>;
  detectFacesFromUrl: (imageUrl: string) => Promise<FaceDetectionResult>;
}

export const EMOJI_LIST = ['😊', '😄', '🙂', '😐', '😎', '🤗'];

export const toSquareBox = (face: FaceBoundingBox): FaceBoundingBox => {
  const size = Math.max(face.width, face.height);
  const centerX = face.x + face.width / 2;
  const centerY = face.y + face.height / 2;
  
  return {
    ...face,
    x: centerX - size / 2,
    y: centerY - size / 2,
    width: size,
    height: size,
  };
};

export const initializeFaceBoxes = (faces: FaceBoundingBox[]): FaceBoundingBox[] => {
  return faces.map((face, index) => {
    const squareFace = toSquareBox(face);
    return {
      ...squareFace,
      id: `face-${index}`,
      emoji: EMOJI_LIST[Math.floor(Math.random() * EMOJI_LIST.length)],
      scale: 1.0,
      offsetX: 0,
      offsetY: 0,
      mode: 'emoji' as BlurMode,
      mosaicStrength: 2,
      selected: false,
    };
  });
};

let isWorkerReady = false;
let isWorkerWarmedUp = false;
let isLoadingModels = false;

export const useFaceDetection = (): UseFaceDetectionReturn => {
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isInitialized = useRef(false);

  const initWorker = useCallback(async () => {
    if (isWorkerReady) {
      setIsReady(true);
      return;
    }

    if (isLoadingModels) {
      return;
    }

    isLoadingModels = true;
    setIsLoading(true);
    setError(null);

    try {
      await workerLoadModels();
      isWorkerReady = true;
      setIsReady(true);
    } catch (err) {
      console.error('[FaceAPI] Failed to initialize:', err);
      setError(err instanceof Error ? err.message : '얼굴 인식 초기화 실패');
    } finally {
      setIsLoading(false);
      isLoadingModels = false;
    }
  }, []);

  useEffect(() => {
    if (!isInitialized.current) {
      isInitialized.current = true;
      initWorker();
    }
  }, [initWorker]);

  const detectFaces = useCallback(async (
    imageElement: HTMLImageElement | HTMLCanvasElement
  ): Promise<FaceDetectionResult> => {
    if (!isWorkerReady) {
      await initWorker();
      if (!isWorkerReady) {
        throw new Error('얼굴 인식이 초기화되지 않았습니다.');
      }
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas context를 생성할 수 없습니다.');
    }

    const width = imageElement.width || (imageElement as HTMLImageElement).naturalWidth || 0;
    const height = imageElement.height || (imageElement as HTMLImageElement).naturalHeight || 0;
    
    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(imageElement, 0, 0);
    
    const imageData = ctx.getImageData(0, 0, width, height);
    
    const result = await workerDetect(imageData);
    
    const faces: FaceBoundingBox[] = result.faces.map(f => ({
      x: f.x,
      y: f.y,
      width: f.width,
      height: f.height,
    }));

    return {
      faces,
      imageWidth: width,
      imageHeight: height,
      processingTime: Math.round(result.time),
    };
  }, [initWorker]);

  const detectFacesFromUrl = useCallback(async (
    imageUrl: string
  ): Promise<FaceDetectionResult> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = async () => {
        try {
          const result = await detectFaces(img);
          resolve(result);
        } catch (err) {
          reject(err);
        }
      };
      
      img.onerror = () => {
        reject(new Error('이미지 로드 실패'));
      };
      
      img.src = imageUrl;
    });
  }, [detectFaces]);

  return {
    isReady,
    isLoading,
    error,
    detectFaces,
    detectFacesFromUrl,
  };
};

export const preloadFaceDetectionModels = (): Promise<void> => {
  if (isWorkerReady && isWorkerWarmedUp) {
    return Promise.resolve();
  }

  return workerLoadModels()
    .then(() => workerWarmup())
    .then(() => {
      isWorkerReady = true;
      isWorkerWarmedUp = true;
    })
    .catch((err) => {
      console.error('[FaceAPI] Preload failed:', err);
    });
};

export default useFaceDetection;
