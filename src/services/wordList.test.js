import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { loadWords, saveWords, normalizeWord, checkWord, MAX_LENGTH } from './wordList.js'

const KEY = 'spielzeugkiste.schreiben.words'

describe('wordList', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ json: () => Promise.resolve({ words: ['SINA', 'NINA'] }) })))
  })
  afterEach(() => vi.unstubAllGlobals())

  it('starts with the default words, all switched on', async () => {
    expect(await loadWords()).toEqual({ words: [{ word: 'SINA', on: true }, { word: 'NINA', on: true }], kept: true })
    expect(fetch).toHaveBeenCalledWith('/content/schreiben/words.json')
  })

  it('keeps the words saved on this device', async () => {
    expect(saveWords([{ word: 'OMA', on: true }, { word: 'SINA', on: false }])).toBe(true)
    expect((await loadWords()).words).toEqual([{ word: 'OMA', on: true }, { word: 'SINA', on: false }])
    expect(fetch).not.toHaveBeenCalled()
  })

  it('ignores a damaged saved list', async () => {
    localStorage.setItem(KEY, '{nope')
    expect((await loadWords()).words.map(w => w.word)).toEqual(['SINA', 'NINA'])
  })

  it('still works when the browser keeps nothing', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
    expect(saveWords([{ word: 'OMA', on: true }])).toBe(false)
    expect(await loadWords()).toMatchObject({ kept: false })
    vi.restoreAllMocks()
  })

  it('writes words in capitals', () => {
    expect(normalizeWord('  müller ')).toBe('MÜLLER')
    expect(normalizeWord('Sina')).toBe('SINA')
  })

  it('says what is wrong with a word', () => {
    const list = [{ word: 'SINA', on: true }]
    expect(checkWord('OMA', list)).toBeNull()
    expect(checkWord('', list)).toBe('empty')
    expect(checkWord('SINA', list)).toBe('exists')
    expect(checkWord('ANNA-LENA', list)).toBe('letters')
    expect(checkWord('A'.repeat(MAX_LENGTH + 1), list)).toBe('too-long')
  })
})
