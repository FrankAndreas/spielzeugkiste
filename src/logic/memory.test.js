import { describe, it, expect } from 'vitest'
import { buildDeck, parseGrid, pickPairs, PLAYERS, createPlayers, parsePlayers, winners } from './memory.js'

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

describe('pickPairs', () => {
  const many = Array.from({ length: 26 }, (_, i) => ({ id: `card-${i}` }))
  let seed = 1
  const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }

  it('takes as many different pairs as the grid needs', () => {
    const picked = pickPairs(many, 8, random)
    expect(picked).toHaveLength(8)
    expect(new Set(picked.map(p => p.id)).size).toBe(8)
    picked.forEach(p => expect(many).toContain(p))
  })

  it('takes different pairs from game to game, not always the first ones', () => {
    const seen = new Set()
    for (let i = 0; i < 20; i++) pickPairs(many, 8, random).forEach(p => seen.add(p.id))
    expect(seen.size).toBeGreaterThan(20)
  })

  it('takes all pairs when the theme has fewer than the grid needs', () => {
    expect(pickPairs(many.slice(0, 5), 8, random)).toHaveLength(5)
  })
})

describe('players', () => {
  it('has four animals a child can tell apart, each with a spoken name', () => {
    expect(PLAYERS.map(p => p.emoji)).toEqual(['🦄', '🐻', '🐸', '🐱'])
    PLAYERS.forEach(p => expect(p.say).toMatch(/^(der|die|das) /))
  })

  it('starts everyone with no pairs', () => {
    expect(createPlayers(3).map(p => [p.emoji, p.pairs])).toEqual([['🦄', 0], ['🐻', 0], ['🐸', 0]])
  })

  it('reads the number of players from the address: 1 to 4, otherwise 1', () => {
    expect(parsePlayers('3')).toBe(3)
    expect(parsePlayers('4')).toBe(4)
    expect(parsePlayers('7')).toBe(1)
    expect(parsePlayers(undefined)).toBe(1)
    expect(parsePlayers('toString')).toBe(1)
  })

  it('knows who won, and when it is a tie', () => {
    const players = createPlayers(3)
    players[0].pairs = 3; players[1].pairs = 5; players[2].pairs = 2
    expect(winners(players).map(p => p.emoji)).toEqual(['🐻'])
    players[2].pairs = 5
    expect(winners(players).map(p => p.emoji)).toEqual(['🐻', '🐸'])
  })
})
