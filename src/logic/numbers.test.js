import { describe, it, expect } from 'vitest'
import { numberWord, answerChoices, looseLayout, tenFrameLayout, dicePips, parseLevel, buildSession, questionText, cheerText } from './numbers.js'

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

describe('buildSession', () => {
  it('has 6 tasks: a small count first, then each type once', () => {
    for (const level of [9, 20]) for (let s = 0; s < 30; s++) {
      const t = buildSession(level, 3, seeded(s))
      expect(t).toHaveLength(6)
      expect(t[0].type).toBe('count')
      expect(t[0].amount).toBeGreaterThanOrEqual(1)
      expect(t[0].amount).toBeLessThanOrEqual(5)
      expect(t.slice(1).map(x => x.type).sort()).toEqual(['build', 'count', 'dice', 'listen', 'plus'])
      t.forEach(x => {
        expect(x.kind).toBeGreaterThanOrEqual(0)
        expect(x.kind).toBeLessThan(3)
      })
    }
  })

  it('keeps every answer in the level range', () => {
    for (let s = 0; s < 200; s++) {
      for (const x of buildSession(9, 3, seeded(s))) {
        expect(x.answer).toBeLessThanOrEqual(9)
        if (x.type === 'count')  expect(x.answer).toBe(x.amount)
        if (x.type === 'dice')   { expect(x.dice).toHaveLength(1); expect(x.answer).toBe(x.dice[0]) }
        if (x.type === 'plus')   { expect(x.a).toBeGreaterThanOrEqual(1); expect(x.b).toBeGreaterThanOrEqual(1); expect(x.answer).toBe(x.a + x.b) }
        if (x.type === 'build')  { expect(x.answer).toBeGreaterThanOrEqual(1); expect(x.supply).toBe(x.answer + 3) }
        if (x.type === 'listen') expect(x.answer).toBeGreaterThanOrEqual(1)
        if (x.type !== 'build')  expect(x.choices).toContain(x.answer)
      }
      for (const x of buildSession(20, 3, seeded(s))) {
        expect(x.answer).toBeLessThanOrEqual(20)
        if (x.type === 'count')  expect(x.answer).toBeGreaterThanOrEqual(1)
        if (x.type === 'dice')   { expect(x.dice).toHaveLength(2); expect(x.answer).toBe(x.dice[0] + x.dice[1]) }
        if (x.type === 'listen') expect(x.answer).toBeLessThanOrEqual(10)
        if (x.type !== 'build')  x.choices.forEach(n => expect(n).toBeLessThanOrEqual(20))
      }
    }
  })

  it('sometimes asks for zero in Bis 9, but never in task 1', () => {
    const zeros = []
    for (let s = 0; s < 300; s++) {
      buildSession(9, 3, seeded(s)).forEach((x, i) => { if (x.answer === 0) zeros.push([i, x.type]) })
    }
    expect(zeros.length).toBeGreaterThan(0)
    zeros.forEach(([i, type]) => {
      expect(i).toBeGreaterThan(0)
      expect(type).toBe('count')
    })
  })
})

describe('parseLevel', () => {
  it('accepts 20 and falls back to 9', () => {
    expect(parseLevel('20')).toBe(20)
    expect(parseLevel('9')).toBe(9)
    expect(parseLevel(undefined)).toBe(9)
    expect(parseLevel('toString')).toBe(9)
  })
})

describe('questionText and cheerText', () => {
  const obj = { one: 'ein Einhorn', many: 'Einhörner' }

  it('asks in German with number words', () => {
    expect(questionText({ type: 'count' }, obj)).toBe('Wie viele Einhörner?')
    expect(questionText({ type: 'build', answer: 5 }, obj)).toBe('Leg fünf Einhörner in den Korb.')
    expect(questionText({ type: 'build', answer: 1 }, obj)).toBe('Leg ein Einhorn in den Korb.')
    expect(questionText({ type: 'plus', a: 3, b: 1 }, obj)).toBe('drei Einhörner und ein Einhorn. Wie viele zusammen?')
    expect(questionText({ type: 'dice' }, obj)).toBe('Wie viele Punkte?')
    expect(questionText({ type: 'listen' }, obj)).toBe('Hör gut zu! Wie oft?')
  })

  it('cheers with the number', () => {
    expect(cheerText(5)).toBe('Super! Fünf!')
  })
})
