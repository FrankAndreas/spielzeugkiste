import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import ThemeSelectView from './ThemeSelectView.vue'
import { THEME_ICONS } from '../themeIcons.js'

vi.mock('../services/tts.js', () => ({ speak: vi.fn(() => Promise.resolve()), stopSpeaking: vi.fn() }))

const GAMES = JSON.parse(readFileSync(resolve('public/content/games.json'), 'utf8'))

let lastRouter = null

async function open(game) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:game', component: ThemeSelectView }, { path: '/:game/:theme/play', component: { template: '<div />' } }],
  })
  lastRouter = router
  await router.push(`/${game}`)
  await router.isReady()
  const wrapper = mount(ThemeSelectView, { global: { plugins: [router, createPinia()] } })
  await flushPromises()
  return wrapper
}

describe('ThemeSelectView', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ json: () => Promise.resolve(GAMES) })))
  })
  afterEach(() => vi.unstubAllGlobals())

  it('has an icon for every theme of every game', () => {
    for (const game of GAMES.games) for (const t of game.themes) expect(THEME_ICONS[t], `${game.id}: ${t}`).toBeTruthy()
  })

  it('shows each theme with its icon and a capitalised name', async () => {
    const wrapper = await open('coloring')
    const buttons = wrapper.findAll('.theme-btn')
    expect(buttons.map(b => b.find('.theme-icon').text())).toEqual(GAMES.games.find(g => g.id === 'coloring').themes.map(t => THEME_ICONS[t]))
    expect(buttons[1].find('.theme-name').text()).toBe('Einhorn')
  })

  it('lets 1 to 4 players play Memory', async () => {
    const wrapper = await open('memory')
    const options = wrapper.findAll('.player-btn')
    expect(options.map(o => o.text())).toEqual(['🦄', '🦄🐻', '🦄🐻🐸', '🦄🐻🐸🐱'])
    expect(options[0].classes()).toContain('active')
    await options[2].trigger('click')
    await wrapper.findAll('.theme-btn')[0].trigger('click')
    await flushPromises()
    expect(lastRouter.currentRoute.value.query).toMatchObject({ players: '3' })
  })

  it('asks for players only in Memory', async () => {
    const wrapper = await open('coloring')
    expect(wrapper.findAll('.player-btn')).toHaveLength(0)
  })
})
