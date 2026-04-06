import { type FaceBoundingBox, type BlurMode, toSquareBox } from '@/hooks/useFaceDetection';

export type { BlurMode };

const EMOJI_LIST = ['😊', '😄', '🙂', '😐', '😎', '🤗'];

const MOSAIC_BLOCK_SIZES: Record<number, number> = {
  1: 5,
  2: 10,
  3: 20,
};

function getMosaicBlockSize(strength?: number): number {
  return MOSAIC_BLOCK_SIZES[strength || 2] || 10;
}

function getRandomEmoji(): string {
  return EMOJI_LIST[Math.floor(Math.random() * EMOJI_LIST.length)];
}

function applyMosaic(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  blockSize: number = 10
): void {
  const imageData = ctx.getImageData(x, y, width, height);
  const data = imageData.data;

  for (let blockY = 0; blockY < height; blockY += blockSize) {
    for (let blockX = 0; blockX < width; blockX += blockSize) {
      let totalR = 0, totalG = 0, totalB = 0;
      let count = 0;

      for (let dy = 0; dy < blockSize && blockY + dy < height; dy++) {
        for (let dx = 0; dx < blockSize && blockX + dx < width; dx++) {
          const pixelIndex = ((blockY + dy) * width + (blockX + dx)) * 4;
          totalR += data[pixelIndex];
          totalG += data[pixelIndex + 1];
          totalB += data[pixelIndex + 2];
          count++;
        }
      }

      const avgR = Math.round(totalR / count);
      const avgG = Math.round(totalG / count);
      const avgB = Math.round(totalB / count);

      for (let dy = 0; dy < blockSize && blockY + dy < height; dy++) {
        for (let dx = 0; dx < blockSize && blockX + dx < width; dx++) {
          const pixelIndex = ((blockY + dy) * width + (blockX + dx)) * 4;
          data[pixelIndex] = avgR;
          data[pixelIndex + 1] = avgG;
          data[pixelIndex + 2] = avgB;
        }
      }
    }
  }

  ctx.putImageData(imageData, x, y);
}

function applyEmoji(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  emoji: string = '😊',
  scale: number = 1.0
): void {
  const fontSize = Math.max(Math.min(width, height) * scale, 20);
  
  ctx.font = `${fontSize}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  const centerX = x + width / 2;
  const centerY = y + height / 2 - fontSize * 0.08;
  
  ctx.fillText(emoji, centerX, centerY);
}

export function applyFaceBlur(
  imageSource: HTMLImageElement | HTMLCanvasElement | string,
  faces: FaceBoundingBox[],
  targetWidth: number = 1000
): Promise<string> {
  return new Promise((resolve, reject) => {
    const processImage = (img: HTMLImageElement | HTMLCanvasElement) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Canvas context를 생성할 수 없습니다.'));
        return;
      }

      const sourceWidth = 'naturalWidth' in img ? img.naturalWidth : img.width;
      const sourceHeight = 'naturalHeight' in img ? img.naturalHeight : img.height;
      
      const scale = targetWidth / sourceWidth;
      canvas.width = targetWidth;
      canvas.height = Math.round(sourceHeight * scale);

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      if (faces.length === 0) {
        resolve(canvas.toDataURL('image/jpeg', 0.9));
        return;
      }

      const scaleX = canvas.width / sourceWidth;
      const scaleY = canvas.height / sourceHeight;

      for (const face of faces) {
        const mode = face.mode || 'mosaic';
        if (mode === 'none') continue;

        const squareFace = toSquareBox(face);
        
        const padding = 0.15;
        const baseX = squareFace.x + (squareFace.offsetX || 0);
        const baseY = squareFace.y + (squareFace.offsetY || 0);
        const faceWidth = squareFace.width * (squareFace.scale || 1.0);
        const faceHeight = squareFace.height * (squareFace.scale || 1.0);

        const paddedX = Math.max(0, baseX - faceWidth * padding);
        const paddedY = Math.max(0, baseY - faceHeight * padding);
        const paddedWidth = faceWidth * (1 + padding * 2);
        const paddedHeight = faceHeight * (1 + padding * 2);

        const scaledX = paddedX * scaleX;
        const scaledY = paddedY * scaleY;
        const scaledWidth = paddedWidth * scaleX;
        const scaledHeight = paddedHeight * scaleY;

        if (mode === 'mosaic') {
          applyMosaic(ctx, scaledX, scaledY, scaledWidth, scaledHeight, getMosaicBlockSize(squareFace.mosaicStrength));
        } else if (mode === 'emoji') {
          applyEmoji(
            ctx,
            scaledX,
            scaledY,
            scaledWidth,
            scaledHeight,
            squareFace.emoji || '😊',
            squareFace.scale || 1.0
          );
        }
      }

      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };

    if (typeof imageSource === 'string') {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => processImage(img);
      img.onerror = () => reject(new Error('이미지 로드 실패'));
      img.src = imageSource;
    } else {
      processImage(imageSource);
    }
  });
}

export function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('이미지 로드 실패'));
    img.src = url;
  });
}

export function applyMosaicPreview(
  imageSource: HTMLImageElement | HTMLCanvasElement | string,
  faces: FaceBoundingBox[],
  displayWidth: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const processImage = (img: HTMLImageElement | HTMLCanvasElement) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Canvas context를 생성할 수 없습니다.'));
        return;
      }

      const sourceWidth = 'naturalWidth' in img ? img.naturalWidth : img.width;
      const sourceHeight = 'naturalHeight' in img ? img.naturalHeight : img.height;

      const scale = displayWidth / sourceWidth;
      canvas.width = displayWidth;
      canvas.height = Math.round(sourceHeight * scale);

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const mosaicFaces = faces.filter(f => f.mode === 'mosaic');
      if (mosaicFaces.length === 0) {
        resolve(canvas.toDataURL('image/jpeg', 0.9));
        return;
      }

      const scaleX = canvas.width / sourceWidth;
      const scaleY = canvas.height / sourceHeight;

      for (const face of mosaicFaces) {
        const squareFace = toSquareBox(face);

        const padding = 0.15;
        const baseX = squareFace.x + (squareFace.offsetX || 0);
        const baseY = squareFace.y + (squareFace.offsetY || 0);
        const faceWidth = squareFace.width * (squareFace.scale || 1.0);
        const faceHeight = squareFace.height * (squareFace.scale || 1.0);

        const paddedX = Math.max(0, baseX - faceWidth * padding);
        const paddedY = Math.max(0, baseY - faceHeight * padding);
        const paddedWidth = faceWidth * (1 + padding * 2);
        const paddedHeight = faceHeight * (1 + padding * 2);

        const scaledX = Math.round(paddedX * scaleX);
        const scaledY = Math.round(paddedY * scaleY);
        const scaledWidth = Math.round(paddedWidth * scaleX);
        const scaledHeight = Math.round(paddedHeight * scaleY);

        const clampedX = Math.max(0, scaledX);
        const clampedY = Math.max(0, scaledY);
        const clampedWidth = Math.min(scaledWidth, canvas.width - clampedX);
        const clampedHeight = Math.min(scaledHeight, canvas.height - clampedY);

        if (clampedWidth > 0 && clampedHeight > 0) {
          applyMosaic(ctx, clampedX, clampedY, clampedWidth, clampedHeight, getMosaicBlockSize(face.mosaicStrength));
        }
      }

      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };

    if (typeof imageSource === 'string') {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => processImage(img);
      img.onerror = () => reject(new Error('이미지 로드 실패'));
      img.src = imageSource;
    } else {
      processImage(imageSource);
    }
  });
}
