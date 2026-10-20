import { describe, it, expect, vi, beforeEach } from 'vitest'
import { loadBest, saveBest } from './bestScore.js'

describe('best score', () => {
  beforeEach(() => {
    const data = {}
    vi.stubGlobal('localStorage', {
      getItem: k => (k in data ? data[k] : null),
      setItem: (k, v) => { data[k] = String(v) },
    })
  })

  it('returns 0 without a stored score', () => {
    expect(loadBest('snake', 'einhorn')).toBe(0)
  })

  it('stores only a higher score and reports a record', () => {
    expect(saveBest('snake', 'einhorn', 12)).toBe(true)
    expect(saveBest('snake', 'einhorn', 8)).toBe(false)
    expect(loadBest('snake', 'einhorn')).toBe(12)
    expect(loadBest('snake', 'prinzessin')).toBe(0)
  })

  it('does not count a score of 0 as a record', () => {
    expect(saveBest('snake', 'einhorn', 0)).toBe(false)
  })

  it('keeps working when storage throws', () => {
    const blocked = () => { throw new Error('blocked') }
    vi.stubGlobal('localStorage', { getItem: blocked, setItem: blocked })
    expect(loadBest('pacman', 'einhorn')).toBe(0)
    expect(saveBest('pacman', 'einhorn', 50)).toBe(true)
  })
})
