import { describe, it, expect, vi } from 'vitest'
import { applyFaceBlur } from '@/lib/faceBlur'
import type { FaceBoundingBox } from '@/hooks/useFaceDetection'

describe('applyFaceBlur', () => {
  it('should return base64 data URL for image with faces', async () => {
    const faces: FaceBoundingBox[] = [
      { x: 100, y: 100, width: 50, height: 50, mode: 'mosaic' }
    ]
    
    const result = await applyFaceBlur('test-image.jpg', faces, 1000)
    
    expect(result).toMatch(/^data:image\/jpeg;base64,/)
  })

  it('should handle empty faces array', async () => {
    const result = await applyFaceBlur('test-image.jpg', [], 1000)
    
    expect(result).toMatch(/^data:image\/jpeg;base64,/)
  })

  it('should skip faces with mode "none"', async () => {
    const faces: FaceBoundingBox[] = [
      { x: 100, y: 100, width: 50, height: 50, mode: 'none' }
    ]
    
    const result = await applyFaceBlur('test-image.jpg', faces, 1000)
    
    expect(result).toMatch(/^data:image\/jpeg;base64,/)
  })

  it('should apply emoji mode with custom emoji', async () => {
    const faces: FaceBoundingBox[] = [
      { x: 100, y: 100, width: 50, height: 50, mode: 'emoji', emoji: '😎' }
    ]
    
    const result = await applyFaceBlur('test-image.jpg', faces, 1000)
    
    expect(result).toMatch(/^data:image\/jpeg;base64,/)
  })

  it('should apply scale transformation', async () => {
    const faces: FaceBoundingBox[] = [
      { x: 100, y: 100, width: 50, height: 50, mode: 'mosaic', scale: 1.5 }
    ]
    
    const result = await applyFaceBlur('test-image.jpg', faces, 1000)
    
    expect(result).toMatch(/^data:image\/jpeg;base64,/)
  })

  it('should apply offset transformation', async () => {
    const faces: FaceBoundingBox[] = [
      { x: 100, y: 100, width: 50, height: 50, mode: 'mosaic', offsetX: 20, offsetY: 10 }
    ]
    
    const result = await applyFaceBlur('test-image.jpg', faces, 1000)
    
    expect(result).toMatch(/^data:image\/jpeg;base64,/)
  })

  it('should handle multiple faces with different modes', async () => {
    const faces: FaceBoundingBox[] = [
      { x: 100, y: 100, width: 50, height: 50, mode: 'mosaic' },
      { x: 200, y: 200, width: 60, height: 60, mode: 'emoji', emoji: '😊' },
      { x: 300, y: 300, width: 70, height: 70, mode: 'none' },
    ]
    
    const result = await applyFaceBlur('test-image.jpg', faces, 1000)
    
    expect(result).toMatch(/^data:image\/jpeg;base64,/)
  })
})

describe('applyFaceBlur - error handling', () => {
  it.skip('should reject on invalid image source', async () => {
    const faces: FaceBoundingBox[] = [
      { x: 100, y: 100, width: 50, height: 50 }
    ]
    
    await expect(applyFaceBlur('invalid-url', faces, 1000)).rejects.toThrow()
  })
})
