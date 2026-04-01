import FaceDetectionWorker from '@/workers/faceDetection.worker?worker';

export interface WorkerFaceDetection {
  x: number;
  y: number;
  width: number;
  height: number;
}

type MessageHandler = (result: any) => void;

const pendingMessages = new Map<string, MessageHandler>();
let worker: Worker | null = null;
let messageId = 0;

const getWorker = (): Worker => {
  if (!worker) {
    worker = new FaceDetectionWorker();
    worker.onmessage = (e) => {
      const { id, payload } = e.data;
      const handler = pendingMessages.get(id);
      if (handler) {
        handler(payload);
        pendingMessages.delete(id);
      }
    };
  }
  return worker;
};

export const workerLoadModels = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const id = `load_${++messageId}`;
    const w = getWorker();
    
    pendingMessages.set(id, () => resolve());
    w.postMessage({ type: 'LOAD_MODELS', id });
    
    setTimeout(() => {
      pendingMessages.delete(id);
      reject(new Error('Load models timeout'));
    }, 30000);
  });
};

export const workerWarmup = (): Promise<number> => {
  return new Promise((resolve, reject) => {
    const id = `warmup_${++messageId}`;
    const w = getWorker();
    
    pendingMessages.set(id, (payload) => resolve(payload.time));
    w.postMessage({ type: 'WARMUP', id });
    
    setTimeout(() => {
      pendingMessages.delete(id);
      reject(new Error('Warmup timeout'));
    }, 60000);
  });
};

export const workerDetectFaces = (imageData: ImageData): Promise<{
  faces: WorkerFaceDetection[];
  time: number;
}> => {
  return new Promise((resolve, reject) => {
    const id = `detect_${++messageId}`;
    const w = getWorker();
    
    pendingMessages.set(id, (payload) => {
      if (payload.error) {
        reject(new Error(payload.error));
      } else {
        resolve(payload);
      }
    });
    
    w.postMessage({ type: 'DETECT_FACES', id, payload: imageData });
    
    setTimeout(() => {
      pendingMessages.delete(id);
      reject(new Error('Face detection timeout'));
    }, 60000);
  });
};

export const terminateWorker = () => {
  if (worker) {
    worker.terminate();
    worker = null;
    pendingMessages.clear();
  }
};
