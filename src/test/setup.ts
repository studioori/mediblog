import '@testing-library/jest-dom'
import { vi } from 'vitest'

class MockCanvasRenderingContext2D {
  fillText = vi.fn()
  drawImage = vi.fn()
  getImageData = vi.fn(() => ({
    data: new Uint8ClampedArray(4),
    width: 100,
    height: 100,
  }))
  putImageData = vi.fn()
  font = ''
  textAlign = ''
  textBaseline = ''
}

HTMLCanvasElement.prototype.getContext = vi.fn(() => new MockCanvasRenderingContext2D()) as any

HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/jpeg;base64,mockbase64data')

class MockImage {
  src = ''
  crossOrigin = ''
  naturalWidth = 100
  naturalHeight = 100
  width = 100
  height = 100
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  
  constructor() {
    setTimeout(() => {
      if (this.onload) this.onload()
    }, 0)
  }
}

(globalThis as any).Image = MockImage

vi.mock('@vladmandic/face-api', () => ({
  nets: {
    ssdMobilenetv1: {
      loadFromUri: vi.fn(() => Promise.resolve()),
    },
  },
  detectAllFaces: vi.fn(() => Promise.resolve([
    { box: { x: 100, y: 100, width: 50, height: 50 } }
  ])),
  SsdMobilenetv1Options: vi.fn(),
}))
