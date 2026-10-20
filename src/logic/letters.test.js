import { describe, it, expect } from 'vitest'
import { GLYPHS, LETTERS, DIGITS, BOX, writingTasks } from './letters.js'
import { createTracer, penDown, penMove, penUp } from './tracing.js'

const ALL = Object.keys(GLYPHS)
const [TOP, , BASE, DESC] = BOX.lines

// Stroke counts of the official templates (docs/handwriting/basisschrift.md)
const STROKES = {
  A: 2, C: 1, D: 2, E: 3, G: 1, H: 3, I: 1, J: 1, L: 1, N: 2, O: 1, P: 2, R: 2, S: 1,
  0: 1, 1: 1, 2: 1, 3: 1, 4: 2, 5: 2, 6: 1, 7: 2, 8: 1, 9: 1,
}

const near = (a, b, d = 8) => Math.hypot(a.x - b.x, a.y - b.y) <= d
const start = (ch, s = 0) => GLYPHS[ch].strokes[s][0]
const end   = (ch, s = 0) => GLYPHS[ch].strokes[s].at(-1)

describe('glyphs', () => {
  it('has the letters of the family names and the digits 0-9', () => {
    expect(LETTERS.join('')).toBe('ACDEGHIJLNOPRS')
    expect(DIGITS.join('')).toBe('0123456789')
    expect(ALL.sort()).toEqual([...DIGITS, ...LETTERS].sort())
  })

  it.each(ALL)('%s has the documented number of strokes', ch => {
    expect(GLYPHS[ch].strokes).toHaveLength(STROKES[ch])
  })

  it.each(ALL)('%s stays in the box with evenly spaced points', ch => {
    for (const g of GLYPHS[ch].strokes) {
      expect(g.length).toBeGreaterThan(5)
      for (let i = 0; i < g.length; i++) {
        expect(g[i].x).toBeGreaterThanOrEqual(0)
        expect(g[i].x).toBeLessThanOrEqual(BOX.width)
        expect(g[i].y).toBeGreaterThanOrEqual(TOP - 2)
        expect(g[i].y).toBeLessThanOrEqual(DESC + 2)
        if (i) expect(Math.hypot(g[i].x - g[i - 1].x, g[i].y - g[i - 1].y)).toBeLessThanOrEqual(2.5)
      }
    }
  })

  it('follows the documented directions', () => {
    // A: one stroke up from the bottom left over the tip, then the bar from the left
    expect(start('A').y).toBeGreaterThan(BASE - 8)
    expect(end('A').x).toBeGreaterThan(start('A').x + 50)
    expect(end('A', 1).x).toBeGreaterThan(start('A', 1).x)
    // E and L: down and along the bottom in one stroke
    for (const ch of 'EL') expect(end(ch).y).toBeGreaterThan(BASE - 8)
    for (const ch of 'EL') expect(end(ch).x).toBeGreaterThan(start(ch).x + 30)
    // N: the diagonal down, then up the right line
    expect(end('N', 1).y).toBeLessThan(TOP + 8)
    // R: the bowl and the leg in one stroke
    expect(end('R', 1).y).toBeGreaterThan(BASE - 8)
    // G and J reach down into the bottom band
    for (const ch of 'GJ') expect(Math.max(...GLYPHS[ch].strokes[0].map(p => p.y))).toBeGreaterThan(DESC - 10)
    // C, O, S, G, 0 start at the top
    for (const ch of 'COSG0') expect(start(ch).y).toBeLessThan(TOP + 10)
    // 1: up from the flag, then down
    expect(start('1').y).toBeGreaterThan(TOP + 15)
    expect(end('1').y).toBeGreaterThan(BASE - 8)
    // 4: first the slant and the bar, then the line down
    expect(end('4', 0).x).toBeGreaterThan(start('4', 0).x)
    expect(end('4', 1).y).toBeGreaterThan(BASE - 8)
    // 5 and 7: the bar along the top is a stroke of its own
    expect(near(start('5', 1), start('5', 0))).toBe(true)
    expect(near(end('7', 0), { x: end('7', 0).x, y: BASE })).toBe(true)
    // 9: the loop first, then the stem down
    expect(end('9').y).toBeGreaterThan(BASE - 8)
  })

  it.each(ALL)('%s can be traced stroke by stroke', ch => {
    const tr = createTracer(GLYPHS[ch])
    const results = GLYPHS[ch].strokes.map((g, s) => {
      expect(penDown(tr, s, g[0], 10)).toEqual({ accepted: true })
      let r = null
      for (const p of g) r = penMove(tr, s, p) ?? r
      penUp(tr, s)
      return r
    })
    expect(results.at(-1)).toBe('letter-done')
    expect(results.slice(0, -1).every(r => r === 'stroke-done')).toBe(true)
  })

  it.each(ALL)('%s has a spoken name with its article', ch => {
    expect(GLYPHS[ch].say).toMatch(/^eine? \S/)
  })
})

describe('writingTasks', () => {
  it('practises a letter or digit three times with less help each time', () => {
    expect(writingTasks({ letter: 'A' })).toEqual([
      { letter: 'A', help: 'full' }, { letter: 'A', help: 'dots' }, { letter: 'A', help: 'start' },
    ])
    expect(writingTasks({ letter: '7' })).toHaveLength(3)
  })

  it('writes a name letter by letter with full help', () => {
    expect(writingTasks({ name: 'SINA' })).toEqual([
      { letter: 'S', help: 'full' }, { letter: 'I', help: 'full' }, { letter: 'N', help: 'full' }, { letter: 'A', help: 'full' },
    ])
  })

  it('returns nothing for glyphs it does not know', () => {
    expect(writingTasks({ letter: 'Q' })).toEqual([])
    expect(writingTasks({ name: 'SIQA' })).toEqual([])
  })
})
