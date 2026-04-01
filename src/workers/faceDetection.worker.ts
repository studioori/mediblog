import * as faceapi from '@vladmandic/face-api';

(self as unknown as { global: typeof self }).global = self;

const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model';

let isModelLoaded = false;
let isWarmedUp = false;
let isPatched = false;

const DETECTOR_OPTIONS = new faceapi.SsdMobilenetv1Options({
  minConfidence: 0.2,
  maxResults: 100,
});

const createOffscreenCanvas = (width = 640, height = 480): OffscreenCanvas => {
  return new OffscreenCanvas(width, height);
};

const patchEnvironment = (): void => {
  if (isPatched) return;
  
  try {
    type FaceApiEnv = {
      setEnv?: (env: unknown) => unknown;
      createNodejsEnv?: () => unknown;
      monkeyPatch?: (opts: { Canvas: typeof OffscreenCanvas; createCanvasElement?: () => OffscreenCanvas }) => void;
    };
    const env = (faceapi as unknown as { env?: FaceApiEnv }).env;
    
    if (env && env.setEnv && env.createNodejsEnv && env.monkeyPatch) {
      env.setEnv(env.createNodejsEnv() as unknown);
      env.monkeyPatch({
        Canvas: OffscreenCanvas,
        createCanvasElement: createOffscreenCanvas,
      });
    } else if (env?.monkeyPatch) {
      env.monkeyPatch({
        Canvas: OffscreenCanvas,
        createCanvasElement: createOffscreenCanvas,
      });
    }
    
    isPatched = true;
  } catch (error) {
    console.error('[Worker] Failed to patch environment:', error);
    throw error;
  }
};

const loadModels = async (): Promise<void> => {
  if (isModelLoaded) return;
  
  patchEnvironment();
  
  await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
  isModelLoaded = true;
};

const warmup = async (): Promise<number> => {
  if (isWarmedUp) return 0;
  if (!isModelLoaded) await loadModels();
  
  const start = performance.now();
  const canvas = createOffscreenCanvas(100, 100);
  const canvasEl = canvas as unknown as HTMLCanvasElement;
  await faceapi.detectAllFaces(canvasEl, DETECTOR_OPTIONS);
  isWarmedUp = true;
  return performance.now() - start;
};

const detectFaces = async (imageData: ImageData): Promise<{ faces: Array<{x: number; y: number; width: number; height: number}>; time: number }> => {
  if (!isModelLoaded) await loadModels();
  if (!isWarmedUp) await warmup();
  
  const canvas = createOffscreenCanvas(imageData.width, imageData.height);
  const canvasEl = canvas as unknown as HTMLCanvasElement;
  const ctx = canvasEl.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available');
  
  ctx.putImageData(imageData, 0, 0);
  
  const start = performance.now();
  const detections = await faceapi.detectAllFaces(
    canvasEl, 
    DETECTOR_OPTIONS
  );
  
  const faces = detections.map(d => ({
    x: d.box.x,
    y: d.box.y,
    width: d.box.width,
    height: d.box.height,
  }));
  
  return { faces, time: performance.now() - start };
};

self.onmessage = async (e: MessageEvent) => {
  const { type, payload, id } = e.data;
  
  try {
    switch (type) {
      case 'LOAD_MODELS': {
        const start = performance.now();
        await loadModels();
        self.postMessage({ 
          type: 'LOAD_MODELS_COMPLETE', 
          id,
          payload: { time: performance.now() - start }
        });
        break;
      }
      
      case 'WARMUP': {
        const time = await warmup();
        self.postMessage({ 
          type: 'WARMUP_COMPLETE', 
          id,
          payload: { time }
        });
        break;
      }
      
      case 'DETECT_FACES': {
        const result = await detectFaces(payload);
        self.postMessage({ 
          type: 'DETECT_FACES_COMPLETE', 
          id,
          payload: result
        });
        break;
      }
      
      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error) {
    console.error('[Worker] Error:', error);
    self.postMessage({ 
      type: 'ERROR', 
      id,
      payload: { 
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }
    });
  }
};
