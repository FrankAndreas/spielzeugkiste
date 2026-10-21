import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { speak } from '../../services/tts.js'
import MemoryGame from './MemoryGame.vue'

vi.mock('../../services/tts.js', () => ({ speak: vi.fn(() => Promise.resolve()), stopSpeaking: vi.fn() }))

const THEME = {
  name: 'Test', tts: 'Test-Memory!', gridSize: '2x2',
  pairs: [
    { id: 'apfel', image: 'images/apfel.svg', label: 'Apfel', tts: 'Apfel' },
    { id: 'birne', image: 'images/birne.svg', label: 'Birne', tts: 'Birne' },
  ],
}

const said = () => speak.mock.calls.map(c => c[0])
const sleep = ms => new Promise(r => setTimeout(r, ms))

async function play(query = '') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/memory/:theme/play', component: MemoryGame }],
  })
  await router.push(`/memory/test/play?grid=2x2${query}`)
  await router.isReady()
  const wrapper = mount(MemoryGame, { global: { plugins: [router, createPinia()] } })
  await flushPromises()
  return wrapper
}

// The two cards of a pair, by their picture
const cards = (w, label) => w.findAll('.card').filter(c => c.find('img').attributes('alt') === label)
const current = w => w.find('.player.current .player-emoji').text()
const pairsOf = w => w.findAll('.player .player-pairs').map(p => p.text())

describe('MemoryGame', () => {
  let wrapper

  beforeEach(() => {
    setActivePinia(createPinia())
    speak.mockClear()
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ json: () => Promise.resolve(THEME) })))
  })
  afterEach(() => {
    wrapper?.unmount()
    vi.unstubAllGlobals()
  })

  it('plays alone without a score bar, as before', async () => {
    wrapper = await play()
    expect(wrapper.find('.players').exists()).toBe(false)
  })

  it('shows a score bar and says who begins', async () => {
    wrapper = await play('&players=2')
    expect(wrapper.findAll('.player')).toHaveLength(2)
    expect(current(wrapper)).toBe('🦄')
    expect(said()).toContain('Test-Memory! Das Einhorn fängt an.')
  })

  it('passes the turn on after a miss', async () => {
    wrapper = await play('&players=2')
    await cards(wrapper, 'Apfel')[0].trigger('click')
    await cards(wrapper, 'Birne')[0].trigger('click')
    await sleep(1100)
    await flushPromises()
    expect(current(wrapper)).toBe('🐻')
    expect(said().at(-1)).toBe('Jetzt ist der Bär dran.')
  })

  it('counts a pair for the player, who goes again', async () => {
    wrapper = await play('&players=2')
    for (const c of cards(wrapper, 'Apfel')) await c.trigger('click')
    await flushPromises()
    expect(pairsOf(wrapper)).toEqual(['1', '0'])
    expect(current(wrapper)).toBe('🦄')
    expect(said()).toContain('Apfel. Nochmal!')
  })

  it('names the winner at the end', async () => {
    wrapper = await play('&players=2')
    for (const label of ['Apfel', 'Birne']) for (const c of cards(wrapper, label)) await c.trigger('click')
    await sleep(900)
    await flushPromises()
    expect(wrapper.find('.win-overlay').text()).toContain('🦄')
    expect(said().at(-1)).toBe('Das Einhorn gewinnt mit 2 Paaren!')
  })
})
