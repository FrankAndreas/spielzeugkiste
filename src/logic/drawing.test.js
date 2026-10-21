import { describe, it, expect } from 'vitest'
import { TOOLS, SIZES, COLORS, strokeStyle, drawStroke } from './drawing.js'

// Records what a stroke does to a canvas
function fakeCtx() {
  const calls = []
  const ctx = new Proxy({ calls }, {
    get: (t, k) => k in t ? t[k] : (...args) => calls.push([k, ...args]),
    set: (t, k, v) => { calls.push([`set ${String(k)}`, v]); t[k] = v; return true },
  })
  return ctx
}

describe('tools', () => {
  it('has a brush, a pencil and an eraser in three sizes, and 12 colours', () => {
    expect(TOOLS).toEqual(['brush', 'pencil', 'eraser'])
    expect(SIZES).toEqual(['S', 'M', 'L'])
    expect(COLORS).toHaveLength(12)
    expect(new Set(COLORS).size).toBe(12)
  })

  it('gets wider with each size, for every tool', () => {
    for (const tool of TOOLS) {
      const [s, m, l] = SIZES.map(size => strokeStyle(tool, size, '#ff0000').width)
      expect(s).toBeLessThan(m)
      expect(m).toBeLessThan(l)
    }
  })

  it('draws the pencil thinner and lighter than the brush', () => {
    const brush  = strokeStyle('brush', 'M', '#ff0000')
    const pencil = strokeStyle('pencil', 'M', '#ff0000')
    expect(pencil.width).toBeLessThan(brush.width)
    expect(pencil.alpha).toBeLessThan(1)
    expect(brush.alpha).toBe(1)
    expect(brush.color).toBe('#ff0000')
  })

  it('erases with the paper colour, whatever colour is chosen', () => {
    expect(strokeStyle('eraser', 'M', '#ff0000').color).toBe('#ffffff')
  })
})

describe('drawStroke', () => {
  it('draws a line through the points in the tool style', () => {
    const ctx = fakeCtx()
    drawStroke(ctx, { tool: 'brush', size: 'L', color: '#00ff00', points: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 20, y: 5 }] })
    expect(ctx.calls).toContainEqual(['set strokeStyle', '#00ff00'])
    expect(ctx.calls).toContainEqual(['set lineWidth', strokeStyle('brush', 'L', '#00ff00').width])
    expect(ctx.calls.some(c => c[0] === 'stroke')).toBe(true)
  })

  it('draws a dot for a single tap', () => {
    const ctx = fakeCtx()
    drawStroke(ctx, { tool: 'pencil', size: 'S', color: '#0000ff', points: [{ x: 5, y: 5 }] })
    expect(ctx.calls.some(c => c[0] === 'arc')).toBe(true)
    expect(ctx.calls.some(c => c[0] === 'fill')).toBe(true)
  })

  it('leaves the canvas as it found it', () => {
    const ctx = fakeCtx()
    drawStroke(ctx, { tool: 'pencil', size: 'M', color: '#0000ff', points: [{ x: 0, y: 0 }, { x: 9, y: 9 }] })
    expect(ctx.calls[0][0]).toBe('save')
    expect(ctx.calls.at(-1)[0]).toBe('restore')
  })

  it('ignores a stroke without points', () => {
    const ctx = fakeCtx()
    expect(() => drawStroke(ctx, { tool: 'brush', size: 'S', color: '#000000', points: [] })).not.toThrow()
    expect(ctx.calls).toEqual([])
  })
})
