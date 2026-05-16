import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useContentStore } from './content.js'

const MOCK_GAMES = {
  games: [
    { id: 'memory', name: 'Memory', emoji: '🃏', themes: ['tiere'] }
  ]
}

const MOCK_THEME = {
  name: 'Tiere',
  tts: 'Tier-Memory!',
  gridSize: '4x4',
  pairs: [{ id: 'lion', image: 'images/lion.svg', label: 'Löwe', tts: 'Löwe' }]
}

describe('content store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.stubGlobal('fetch', vi.fn())
  })

  it('loadGames populates games array', async () => {
    fetch.mockResolvedValue({ json: () => Promise.resolve(MOCK_GAMES) })
    const store = useContentStore()
    await store.loadGames()
    expect(store.games).toHaveLength(1)
    expect(store.games[0].id).toBe('memory')
  })

  it('loadTheme populates currentTheme', async () => {
    fetch.mockResolvedValue({ json: () => Promise.resolve(MOCK_THEME) })
    const store = useContentStore()
    await store.loadTheme('memory', 'tiere')
    expect(store.currentTheme.name).toBe('Tiere')
    expect(store.currentTheme.pairs).toHaveLength(1)
  })

  it('findGame returns game by id', async () => {
    fetch.mockResolvedValue({ json: () => Promise.resolve(MOCK_GAMES) })
    const store = useContentStore()
    await store.loadGames()
    expect(store.findGame('memory').name).toBe('Memory')
    expect(store.findGame('unknown')).toBeUndefined()
  })
})
