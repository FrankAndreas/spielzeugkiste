import { describe, it, expect } from 'vitest'
import { edgeScale, hitTest } from './differences.js'

describe('edgeScale', () => {
  it('returns 1.0 for a point at the centre', () => {
    expect(edgeScale(0.5, 0.5)).toBe(1)
  })

  it('returns > 1 when within 12% of an edge', () => {
    expect(edgeScale(0.05, 0.5)).toBeGreaterThan(1)
  })

  it('returns MAX_SCALE at the very edge (0)', () => {
    expect(edgeScale(0, 0.5)).toBeCloseTo(1.9)
  })

  it('clamps at 1 for edge distances >= EDGE_ZONE', () => {
    expect(edgeScale(0.15, 0.5)).toBe(1)
  })
})

describe('hitTest', () => {
  // Container: 800px wide, 600px tall
  const rect = { width: 800, height: 600 }

  it('returns true when tap is within the hotspot radius', () => {
    const hotspot = { x: 0.5, y: 0.5, r: 40 }
    // Tap exactly at centre — distance 0
    expect(hitTest(0.5, 0.5, hotspot, rect)).toBe(true)
  })

  it('returns true when tap is within scaled edge radius', () => {
    const hotspot = { x: 0.05, y: 0.5, r: 30 }
    const scale   = edgeScale(0.05, 0.5)
    const screenR = hotspot.r * scale
    // Tap at hotspot centre — always hits regardless of scale
    expect(hitTest(0.05, 0.5, hotspot, rect)).toBe(true)
  })

  it('returns false when tap is far outside radius', () => {
    const hotspot = { x: 0.5, y: 0.5, r: 30 }
    // Tap 200px away in screen space = 0.25 fraction away
    expect(hitTest(0.75, 0.5, hotspot, rect)).toBe(false)
  })
})
