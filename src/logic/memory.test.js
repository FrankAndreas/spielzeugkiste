import { describe, it, expect } from 'vitest'
import { buildDeck, parseGrid } from './memory.js'

describe('buildDeck', () => {
  const pairs = [
    { id: 'lion',  label: 'Löwe',    tts: 'Löwe',    image: 'lion.svg' },
    { id: 'bear',  label: 'Bär',     tts: 'Bär',     image: 'bear.svg' },
    { id: 'fox',   label: 'Fuchs',   tts: 'Fuchs',   image: 'fox.svg'  },
  ]

  it('returns 2× the number of pairs', () => {
    const deck = buildDeck(pairs)
    expect(deck).toHaveLength(6)
  })

  it('each pair id appears exactly twice', () => {
    const deck = buildDeck(pairs)
    const lionCards = deck.filter(c => c.id === 'lion')
    expect(lionCards).toHaveLength(2)
  })

  it('each card has a unique key', () => {
    const deck = buildDeck(pairs)
    const keys = deck.map(c => c.key)
    expect(new Set(keys).size).toBe(6)
  })

  it('deck order is shuffled (not identical to input doubled)', () => {
    // Run 10 times — at least one should differ (probability of always same: negligible)
    const results = Array.from({ length: 10 }, () => buildDeck(pairs).map(c => c.id).join(','))
    expect(new Set(results).size).toBeGreaterThan(1)
  })
})

describe('parseGrid', () => {
  it('parses "4x4" to { cols: 4, rows: 4 }', () => {
    expect(parseGrid('4x4')).toEqual({ cols: 4, rows: 4 })
  })

  it('parses "3x4" to { cols: 3, rows: 4 }', () => {
    expect(parseGrid('3x4')).toEqual({ cols: 3, rows: 4 })
  })
})
