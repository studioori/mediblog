import { describe, it, expect } from 'vitest'
import { initializeFaceBoxes, EMOJI_LIST } from '@/hooks/useFaceDetection'
import type { FaceBoundingBox } from '@/hooks/useFaceDetection'

describe('initializeFaceBoxes', () => {
  it('should initialize face bounding boxes with default values', () => {
    const faces: FaceBoundingBox[] = [
      { x: 100, y: 100, width: 50, height: 50 }
    ]
    
    const initialized = initializeFaceBoxes(faces)
    
    expect(initialized[0]).toHaveProperty('id', 'face-0')
    expect(initialized[0]).toHaveProperty('emoji')
    expect(EMOJI_LIST).toContain(initialized[0].emoji)
    expect(initialized[0].scale).toBe(1.0)
    expect(initialized[0].offsetX).toBe(0)
    expect(initialized[0].offsetY).toBe(0)
    expect(initialized[0].mode).toBe('emoji')
    expect(initialized[0].selected).toBe(false)
  })

  it('should assign unique IDs to each face', () => {
    const faces: FaceBoundingBox[] = [
      { x: 100, y: 100, width: 50, height: 50 },
      { x: 200, y: 200, width: 60, height: 60 },
      { x: 300, y: 300, width: 70, height: 70 },
    ]
    
    const initialized = initializeFaceBoxes(faces)
    
    expect(initialized[0].id).toBe('face-0')
    expect(initialized[1].id).toBe('face-1')
    expect(initialized[2].id).toBe('face-2')
  })

  it('should convert face to square box', () => {
    const faces: FaceBoundingBox[] = [
      { x: 150, y: 200, width: 80, height: 90 }
    ]
    
    const initialized = initializeFaceBoxes(faces)
    
    expect(initialized[0].width).toBe(90)
    expect(initialized[0].height).toBe(90)
    expect(initialized[0].x).toBe(145)
    expect(initialized[0].y).toBe(200)
  })

  it('should preserve square faces unchanged', () => {
    const faces: FaceBoundingBox[] = [
      { x: 100, y: 100, width: 50, height: 50 }
    ]
    
    const initialized = initializeFaceBoxes(faces)
    
    expect(initialized[0].x).toBe(100)
    expect(initialized[0].y).toBe(100)
    expect(initialized[0].width).toBe(50)
    expect(initialized[0].height).toBe(50)
  })

  it('should assign random emoji from EMOJI_LIST', () => {
    const faces: FaceBoundingBox[] = [
      { x: 100, y: 100, width: 50, height: 50 }
    ]
    
    const results = Array(20).fill(null).map(() => {
      return initializeFaceBoxes(faces)[0].emoji
    })
    
    const uniqueEmojis = new Set(results)
    expect(uniqueEmojis.size).toBeGreaterThan(1)
    
    results.forEach(emoji => {
      expect(EMOJI_LIST).toContain(emoji)
    })
  })

  it('should handle empty faces array', () => {
    const faces: FaceBoundingBox[] = []
    
    const initialized = initializeFaceBoxes(faces)
    
    expect(initialized).toEqual([])
  })

  it('should handle multiple faces with different sizes', () => {
    const faces: FaceBoundingBox[] = [
      { x: 0, y: 0, width: 10, height: 10 },
      { x: 1000, y: 1000, width: 500, height: 500 },
    ]
    
    const initialized = initializeFaceBoxes(faces)
    
    expect(initialized).toHaveLength(2)
    expect(initialized[0].x).toBe(0)
    expect(initialized[1].x).toBe(1000)
    expect(initialized[0].width).toBe(10)
    expect(initialized[1].width).toBe(500)
  })
})

describe('EMOJI_LIST', () => {
  it('should contain expected emojis', () => {
    expect(EMOJI_LIST).toEqual(['😊', '😄', '🙂', '😐', '😎', '🤗'])
  })

  it('should have 6 emojis', () => {
    expect(EMOJI_LIST).toHaveLength(6)
  })
})
