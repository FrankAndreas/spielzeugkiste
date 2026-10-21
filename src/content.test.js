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
  it('has default words made only of letters the game can teach', () => {
    const { words: names } = read('schreiben/words.json')
    expect(names.length).toBeGreaterThan(0)
    for (const name of names) for (const l of name) expect(GLYPHS[l], `${name}: ${l}`).toBeTruthy()
  })
})

describe('Ausmalen content', () => {
  const COLORING = ['tiere', 'einhorn', 'prinzessin', 'eisprinzessin', 'feuerwehr', 'ballett', 'musik']
  const BLANK = '#f5f0e8'   // ColoringGame's "not coloured yet"

  it('lists the themes in games.json', () => {
    expect(read('games.json').games.find(g => g.id === 'coloring').themes).toEqual(COLORING)
  })

  it('gives every picture an icon, the animals too', () => {
    for (const p of read('coloring/tiere/theme.json').pages) expect(p.icon, p.id).toBeTruthy()
  })

  it.each(COLORING.filter(t => t !== 'tiere'))('%s has three pictures with areas to colour', id => {
    const theme = read(`coloring/${id}/theme.json`)
    expect(theme.name).toBeTruthy()
    expect(theme.tts).toBeTruthy()
    expect(theme.pages).toHaveLength(3)
    for (const page of theme.pages) {
      expect(page.label).toBeTruthy()
      expect(page.icon, `${id}: ${page.id}`).toBeTruthy()
      expect(page.tts).toBeTruthy()
      const svg = new DOMParser().parseFromString(
        readFileSync(resolve('public/content/coloring', id, page.svg), 'utf8'), 'image/svg+xml')
      expect(svg.querySelector('parsererror'), page.svg).toBeNull()
      expect(svg.documentElement.getAttribute('viewBox')).toBeTruthy()
      const regions = [...svg.querySelectorAll('[data-region]')]
      expect(regions.length, page.svg).toBeGreaterThanOrEqual(8)
      expect(new Set(regions.map(r => r.dataset.region)).size, `${page.svg}: region names repeat`).toBe(regions.length)
      for (const r of regions) {
        expect(r.getAttribute('fill'), `${page.svg} ${r.dataset.region}`).toBe(BLANK)
        expect(r.getAttribute('stroke'), `${page.svg} ${r.dataset.region}`).toBeTruthy()
      }
    }
  })
})
