import { useRef, useState, useCallback, useEffect } from 'react';
import * as faceapi from '@vladmandic/face-api';

export interface FaceBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
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

const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model';

let isModelsLoaded = false;
let loadingPromise: Promise<void> | null = null;

const DETECTOR_OPTIONS = new faceapi.SsdMobilenetv1Options({
  minConfidence: 0.2,
  maxResults: 100,
});

export const useFaceDetection = (): UseFaceDetectionReturn => {
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isInitialized = useRef(false);

  const loadModels = useCallback(async () => {
    if (isModelsLoaded) {
      setIsReady(true);
      return;
    }

    if (loadingPromise) {
      await loadingPromise;
      setIsReady(true);
      return;
    }

    setIsLoading(true);
    setError(null);

    loadingPromise = (async () => {
      await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
      isModelsLoaded = true;
    })();

    try {
      await loadingPromise;
      setIsReady(true);
    } catch (err) {
      console.error('Failed to load face-api models:', err);
      setError(err instanceof Error ? err.message : '얼굴 인식 모델 로드 실패');
      loadingPromise = null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isInitialized.current) {
      isInitialized.current = true;
      loadModels();
    }
  }, [loadModels]);

  const detectFaces = useCallback(async (
    imageElement: HTMLImageElement | HTMLCanvasElement
  ): Promise<FaceDetectionResult> => {
    if (!isModelsLoaded) {
      await loadModels();
      if (!isModelsLoaded) {
        throw new Error('얼굴 인식 모델이 로드되지 않았습니다.');
      }
    }

    const startTime = performance.now();

    try {
      const detections = await faceapi.detectAllFaces(imageElement, DETECTOR_OPTIONS);
      
      const faces: FaceBoundingBox[] = detections.map(detection => {
        const box = detection.box;
        return {
          x: box.x,
          y: box.y,
          width: box.width,
          height: box.height,
        };
      });

      const endTime = performance.now();

      return {
        faces,
        imageWidth: imageElement.width || (imageElement as HTMLImageElement).naturalWidth || 0,
        imageHeight: imageElement.height || (imageElement as HTMLImageElement).naturalHeight || 0,
        processingTime: Math.round(endTime - startTime),
      };
    } catch (err) {
      console.error('Face detection failed:', err);
      throw new Error(err instanceof Error ? err.message : '얼굴 인식 실패');
    }
  }, [loadModels]);

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

export default useFaceDetection;
