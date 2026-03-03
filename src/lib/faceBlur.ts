import { type FaceBoundingBox } from '@/hooks/useFaceDetection';

export type BlurMode = 'mosaic' | 'emoji' | 'none';

const EMOJI_LIST = ['😊', '😄', '🙂', '😐', '😎', '🤗'];

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
  height: number
): void {
  const emoji = getRandomEmoji();
  const fontSize = Math.max(Math.min(width, height) * 0.8, 20);
  
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
  mode: BlurMode = 'mosaic',
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

      if (mode === 'none' || faces.length === 0) {
        resolve(canvas.toDataURL('image/jpeg', 0.9));
        return;
      }

      const scaleX = canvas.width / sourceWidth;
      const scaleY = canvas.height / sourceHeight;

      for (const face of faces) {
        const padding = 0.15;
        const paddedX = Math.max(0, face.x - face.width * padding);
        const paddedY = Math.max(0, face.y - face.height * padding);
        const paddedWidth = face.width * (1 + padding * 2);
        const paddedHeight = face.height * (1 + padding * 2);

        const scaledX = paddedX * scaleX;
        const scaledY = paddedY * scaleY;
        const scaledWidth = paddedWidth * scaleX;
        const scaledHeight = paddedHeight * scaleY;

        if (mode === 'mosaic') {
          applyMosaic(ctx, scaledX, scaledY, scaledWidth, scaledHeight);
        } else if (mode === 'emoji') {
          applyEmoji(ctx, scaledX, scaledY, scaledWidth, scaledHeight);
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
