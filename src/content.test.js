import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { SOUND_KINDS } from './services/sound.js'
import { GLYPHS } from './logic/letters.js'

// Vitest runs from the repo root
const read = path => JSON.parse(readFileSync(resolve('public/content', path), 'utf8'))

const ZAHLEN_THEMES = ['einhorn', 'prinzessin', 'eisprinzessin', 'feuerwehr', 'ballett', 'musik']

describe('Zahlen content', () => {
  it('lists the six themes in games.json', () => {
    const game = read('games.json').games.find(g => g.id === 'zahlen')
    expect(game.themes).toEqual(ZAHLEN_THEMES)
  })

  it.each(ZAHLEN_THEMES)('has a complete %s theme', id => {
    const t = read(`zahlen/${id}/theme.json`)
    expect(t.name).toBeTruthy()
    expect(t.tts).toBeTruthy()
    expect(t.colors.bg).toBeTruthy()
    expect(t.colors.accent).toBeTruthy()
    expect(t.basket).toBeTruthy()
    expect(t.objects.length).toBeGreaterThanOrEqual(3)
    for (const o of t.objects) {
      expect(o.emoji).toBeTruthy()
      expect(o.many).toBeTruthy()
      expect(o.one).toMatch(/^eine? \S/)
    }
    expect(SOUND_KINDS).toContain(t.listen.sound)
    expect(t.listen.picture).toBeTruthy()
  })
})

describe('Schreiben content', () => {
  it('has names made only of letters the game can teach', () => {
    const { names } = read('schreiben/names.json')
    expect(names.length).toBeGreaterThan(0)
    for (const name of names) for (const l of name) expect(GLYPHS[l], `${name}: ${l}`).toBeTruthy()
  })
})
