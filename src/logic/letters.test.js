import { describe, it, expect } from 'vitest'
import { LETTERS, BOX, writingTasks } from './letters.js'
import { createTracer, penDown, penMove, penUp } from './tracing.js'

const ALL = 'ACDEGHIJLNOPRS'.split('')
const STROKES = { A: 3, C: 1, D: 2, E: 4, G: 2, H: 3, I: 1, J: 1, L: 2, N: 3, O: 1, P: 2, R: 3, S: 1 }

describe('letters', () => {
  it('has the 14 letters of the family names with their stroke counts', () => {
    expect(Object.keys(LETTERS).sort()).toEqual(ALL)
    for (const l of ALL) expect(LETTERS[l].strokes, l).toHaveLength(STROKES[l])
  })

  it.each(ALL)('%s stays in the box with evenly spaced points', l => {
    for (const g of LETTERS[l].strokes) {
      expect(g.length).toBeGreaterThan(5)
      for (let i = 0; i < g.length; i++) {
        expect(g[i].x).toBeGreaterThanOrEqual(0)
        expect(g[i].x).toBeLessThanOrEqual(BOX.width)
        expect(g[i].y).toBeGreaterThanOrEqual(0)
        expect(g[i].y).toBeLessThanOrEqual(BOX.height)
        if (i) expect(Math.hypot(g[i].x - g[i - 1].x, g[i].y - g[i - 1].y)).toBeLessThanOrEqual(2.5)
      }
    }
  })

  it.each(ALL)('%s strokes run top to bottom, or left to right when flat', l => {
    for (const g of LETTERS[l].strokes) {
      const a = g[0], b = g.at(-1)
      if (Math.abs(a.y - b.y) > 1) expect(a.y, l).toBeLessThan(b.y + 1)
      else if (Math.abs(a.x - b.x) > 1) expect(a.x, l).toBeLessThan(b.x)
    }
  })

  it.each(ALL)('%s can be traced stroke by stroke', l => {
    const tr = createTracer(LETTERS[l])
    const results = LETTERS[l].strokes.map((g, s) => {
      expect(penDown(tr, s, g[0], 10)).toEqual({ accepted: true })
      let r = null
      for (const p of g) r = penMove(tr, s, p) ?? r
      penUp(tr, s)
      return r
    })
    expect(results.at(-1)).toBe('letter-done')
    expect(results.slice(0, -1).every(r => r === 'stroke-done')).toBe(true)
  })

  it.each(ALL)('%s has a spoken name', l => {
    expect(LETTERS[l].say).toBeTruthy()
  })
})

describe('writingTasks', () => {
  it('practises a letter three times with less help each time', () => {
    expect(writingTasks({ letter: 'A' })).toEqual([
      { letter: 'A', help: 'full' }, { letter: 'A', help: 'dots' }, { letter: 'A', help: 'start' },
    ])
  })

  it('writes a name letter by letter with full help', () => {
    expect(writingTasks({ name: 'SINA' })).toEqual([
      { letter: 'S', help: 'full' }, { letter: 'I', help: 'full' }, { letter: 'N', help: 'full' }, { letter: 'A', help: 'full' },
    ])
  })

  it('returns nothing for letters it does not know', () => {
    expect(writingTasks({ letter: 'Q' })).toEqual([])
    expect(writingTasks({ name: 'SIQA' })).toEqual([])
  })
})
