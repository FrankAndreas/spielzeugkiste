import { describe, it, expect } from 'vitest'
import { numberWord, answerChoices, looseLayout, tenFrameLayout, dicePips } from './numbers.js'

// Deterministic random numbers in [0, 1) (mulberry32)
function seeded(seed) {
  let a = seed + 1
  return () => {
    a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

describe('numberWord', () => {
  it('names 0 to 20 in German', () => {
    expect(numberWord(0)).toBe('null')
    expect(numberWord(1)).toBe('eins')
    expect(numberWord(7)).toBe('sieben')
    expect(numberWord(11)).toBe('elf')
    expect(numberWord(16)).toBe('sechzehn')
    expect(numberWord(17)).toBe('siebzehn')
    expect(numberWord(20)).toBe('zwanzig')
  })
})

describe('answerChoices', () => {
  it('gives 3 distinct near choices including the answer, within 0..max', () => {
    for (let a = 0; a <= 9; a++) for (let s = 0; s < 20; s++) {
      const c = answerChoices(a, 9, seeded(s))
      expect(c).toHaveLength(3)
      expect(new Set(c).size).toBe(3)
      expect(c).toContain(a)
      c.forEach(n => {
        expect(n).toBeGreaterThanOrEqual(0)
        expect(n).toBeLessThanOrEqual(9)
        expect(Math.abs(n - a)).toBeLessThanOrEqual(2)
      })
    }
  })

  it('does not always put the answer first', () => {
    const firsts = new Set([0, 1, 2, 3, 4, 5].map(s => answerChoices(5, 9, seeded(s))[0]))
    expect(firsts.size).toBeGreaterThan(1)
  })
})

describe('looseLayout', () => {
  it('places up to 10 objects inside the field without overlap', () => {
    for (let n = 0; n <= 10; n++) for (let s = 0; s < 10; s++) {
      const pts = looseLayout(n, seeded(s))
      expect(pts).toHaveLength(n)
      pts.forEach(p => {
        expect(p.x).toBeGreaterThan(0)
        expect(p.x).toBeLessThan(1)
        expect(p.y).toBeGreaterThan(0)
        expect(p.y).toBeLessThan(1)
      })
      for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
        const far = Math.abs(pts[i].x - pts[j].x) >= 0.15 || Math.abs(pts[i].y - pts[j].y) >= 0.2
        expect(far).toBe(true)
      }
    }
  })
})

describe('tenFrameLayout', () => {
  it('fills rows of 5 and frames of 10', () => {
    const l = tenFrameLayout(14)
    expect(l).toHaveLength(14)
    expect(l[0]).toEqual({ frame: 0, row: 0, col: 0 })
    expect(l[5]).toEqual({ frame: 0, row: 1, col: 0 })
    expect(l[9]).toEqual({ frame: 0, row: 1, col: 4 })
    expect(l[13]).toEqual({ frame: 1, row: 0, col: 3 })
  })
})

describe('dicePips', () => {
  it('has the standard faces', () => {
    for (let v = 1; v <= 6; v++) expect(dicePips(v)).toHaveLength(v)
    expect(dicePips(1)).toEqual([{ x: 1, y: 1 }])
    expect(dicePips(5)).toContainEqual({ x: 1, y: 1 })
    expect(dicePips(6)).not.toContainEqual({ x: 1, y: 1 })
  })
})
