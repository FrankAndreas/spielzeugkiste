import { describe, it, expect } from 'vitest'
import { LETTERS, BOX } from './letters.js'
import { createTracer, penDown, penMove, penUp } from './tracing.js'

const S     = LETTERS.S
const guide = S.strokes[0]
const first = guide[0]
const last  = guide.at(-1)

// Moves the pen along a list of points; returns the last non-null result
function trace(tr, id, points) {
  let result = null
  for (const p of points) result = penMove(tr, id, p) ?? result
  return result
}

// Points on the straight line from a to b
const line = (a, b, n = 40) => Array.from({ length: n + 1 }, (_, i) => ({ x: a.x + (b.x - a.x) * i / n, y: a.y + (b.y - a.y) * i / n }))

describe('letter S', () => {
  it('is one stroke from the top right to the bottom left, inside the box', () => {
    expect(S.strokes).toHaveLength(1)
    expect(first.x).toBeGreaterThan(BOX.width / 2)
    expect(first.y).toBeLessThan(BOX.height / 3)
    expect(last.x).toBeLessThan(BOX.width / 2)
    expect(last.y).toBeGreaterThan(BOX.height * 2 / 3)
    guide.forEach(p => {
      expect(p.x).toBeGreaterThanOrEqual(0)
      expect(p.x).toBeLessThanOrEqual(BOX.width)
      expect(p.y).toBeGreaterThanOrEqual(0)
      expect(p.y).toBeLessThanOrEqual(BOX.height)
    })
  })

  it('has evenly spaced guide points', () => {
    for (let i = 1; i < guide.length; i++) {
      expect(Math.hypot(guide[i].x - guide[i - 1].x, guide[i].y - guide[i - 1].y)).toBeLessThanOrEqual(2.5)
    }
  })
})

describe('tracer', () => {
  it('completes the letter when the pen follows the guide', () => {
    const tr = createTracer(S)
    expect(penDown(tr, 1, first, 10)).toEqual({ accepted: true })
    expect(trace(tr, 1, guide)).toBe('letter-done')
    expect(tr.done).toBe(true)
  })

  it('forgives a wobbly line close to the guide', () => {
    const tr = createTracer(S)
    penDown(tr, 1, first, 10)
    const wobbly = guide.map((p, i) => ({ x: p.x + (i % 2 ? 6 : -6), y: p.y + (i % 3 ? 5 : -5) }))
    expect(trace(tr, 1, wobbly)).toBe('letter-done')
  })

  it('only starts near the green start dot', () => {
    const tr = createTracer(S)
    expect(penDown(tr, 1, last, 10)).toEqual({ accepted: false, reason: 'far-from-start' })
    expect(penDown(tr, 1, { x: first.x + 15, y: first.y + 10 }, 10)).toEqual({ accepted: true })
  })

  it('ignores a big contact like a resting hand', () => {
    const tr = createTracer(S)
    expect(penDown(tr, 1, first, 60)).toEqual({ accepted: false, reason: 'too-big' })
  })

  it('accepts a touch whose size the browser does not report', () => {
    const tr = createTracer(S)
    expect(penDown(tr, 1, first, 0)).toEqual({ accepted: true })
  })

  it('follows only the pen while a hand touches elsewhere', () => {
    const tr = createTracer(S)
    penDown(tr, 1, first, 10)
    expect(penDown(tr, 2, first, 10)).toEqual({ accepted: false, reason: 'pen-busy' })
    expect(penMove(tr, 2, last)).toBeNull()
    expect(penUp(tr, 2)).toBeNull()
    expect(trace(tr, 1, guide)).toBe('letter-done')
  })

  it('does not count a shortcut straight to the end', () => {
    const tr = createTracer(S)
    penDown(tr, 1, first, 10)
    expect(trace(tr, 1, line(first, last))).toBeNull()
    expect(penUp(tr, 1)).toBe('too-short')
  })

  it('does not count tracing backwards', () => {
    const tr = createTracer(S)
    penDown(tr, 1, first, 10)
    expect(trace(tr, 1, [...guide].reverse())).toBeNull()
  })

  it('starts the stroke over after lifting too early', () => {
    const tr = createTracer(S)
    penDown(tr, 1, first, 10)
    trace(tr, 1, guide.slice(0, guide.length / 2))
    expect(tr.progress).toBeGreaterThan(0)
    expect(penUp(tr, 1)).toBe('too-short')
    expect(tr.progress).toBe(0)
    expect(penDown(tr, 3, first, 10)).toEqual({ accepted: true })
    expect(trace(tr, 3, guide)).toBe('letter-done')
  })

  it('accepts nothing more once the letter is done', () => {
    const tr = createTracer(S)
    penDown(tr, 1, first, 10)
    trace(tr, 1, guide)
    expect(penUp(tr, 1)).toBeNull()
    expect(penDown(tr, 2, first, 10)).toEqual({ accepted: false, reason: 'done' })
  })
})
