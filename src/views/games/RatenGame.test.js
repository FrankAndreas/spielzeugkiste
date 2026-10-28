import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { speak } from '../../services/tts.js'
import RatenGame from './RatenGame.vue'

vi.mock('../../services/tts.js', () => ({ speak: vi.fn(() => Promise.resolve()), stopSpeaking: vi.fn() }))

const LABELS = Array.from({ length: 24 }, (_, i) => `Tier${String.fromCharCode(65 + i)}`)
const THEME = {
  name: 'Test', tts: 'Rate mal! Wähle dein geheimes Tier.',
  animals: LABELS.map(label => ({ id: label.toLowerCase(), image: `images/${label}.svg`, label, the: `das ${label}` })),
}

const said = () => speak.mock.calls.map(c => c[0])
const tiles = w => w.findAll('.board .tile')
const tile = (w, label) => tiles(w).find(t => t.find('img').attributes('alt') === label)
const offCount = w => tiles(w).filter(t => t.classes('off')).length

async function play() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/raten/:theme/play', component: RatenGame }, { path: '/', component: { template: '<div/>' } }],
  })
  await router.push('/raten/test/play')
  await router.isReady()
  const wrapper = mount(RatenGame, { global: { plugins: [router, createPinia()] } })
  await flushPromises()
  return wrapper
}

// Picks TierH as the secret animal and starts the game
async function started() {
  const w = await play()
  await tile(w, 'TierH').trigger('click')
  await w.find('.start').trigger('click')
  return w
}

describe('RatenGame', () => {
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

  it('shows the 24 animals in the order of the theme', async () => {
    wrapper = await play()
    expect(tiles(wrapper).map(t => t.find('img').attributes('alt'))).toEqual(LABELS)
    expect(tiles(wrapper)[0].find('img').attributes('src')).toBe('/content/raten/test/images/TierA.svg')
    expect(said()).toContain(THEME.tts)
  })

  it('marks the tapped animal and moves the mark to another one', async () => {
    wrapper = await play()
    expect(wrapper.find('.start').exists()).toBe(false)
    await tile(wrapper, 'TierA').trigger('click')
    await tile(wrapper, 'TierB').trigger('click')
    expect(tile(wrapper, 'TierA').classes()).not.toContain('chosen')
    expect(tile(wrapper, 'TierB').classes()).toContain('chosen')
    expect(wrapper.find('.start').exists()).toBe(true)
  })

  it('never says the secret animal', async () => {
    wrapper = await started()
    await tile(wrapper, 'TierA').trigger('click')
    await wrapper.find('.undo').trigger('click')
    for (const text of said()) for (const label of LABELS) expect(text).not.toContain(label)
  })

  it('shows the own animal and starts with all 24 on the board', async () => {
    wrapper = await started()
    expect(wrapper.find('.mine').text()).toContain('TierH')
    expect(said()).toContain("Los geht's! Stell eine Frage.")
    expect(wrapper.find('.count').text()).toBe('Noch 24 übrig')
  })

  it('greys an animal out on a tap and brings it back with Zurück', async () => {
    wrapper = await started()
    await tile(wrapper, 'TierA').trigger('click')
    expect(tile(wrapper, 'TierA').classes()).toContain('off')
    expect(wrapper.find('.count').text()).toBe('Noch 23 übrig')
    await wrapper.find('.undo').trigger('click')
    expect(offCount(wrapper)).toBe(0)
  })

  it('asks about a guessed animal, but not about a greyed one', async () => {
    wrapper = await started()
    await tile(wrapper, 'TierA').trigger('click')
    await wrapper.find('.guess').trigger('click')
    await tile(wrapper, 'TierA').trigger('click')
    expect(wrapper.find('.guess-dialog').exists()).toBe(false)
    await tile(wrapper, 'TierB').trigger('click')
    expect(wrapper.find('.guess-dialog').text()).toContain('Ist es das TierB?')
    expect(said()).toContain('Ist es das TierB?')
  })

  it('ignores taps on the board while the guess dialog is open', async () => {
    wrapper = await started()
    await wrapper.find('.guess').trigger('click')
    await tile(wrapper, 'TierB').trigger('click')
    await tile(wrapper, 'TierC').trigger('click')
    expect(wrapper.find('.guess-dialog').text()).toContain('Ist es das TierB?')
    expect(offCount(wrapper)).toBe(0)
  })

  it('goes back to the board on Abbrechen', async () => {
    wrapper = await started()
    await wrapper.find('.guess').trigger('click')
    await tile(wrapper, 'TierB').trigger('click')
    await wrapper.find('.cancel').trigger('click')
    expect(wrapper.find('.guess-dialog').exists()).toBe(false)
    await tile(wrapper, 'TierC').trigger('click')
    expect(tile(wrapper, 'TierC').classes()).toContain('off')
  })

  it('greys out a wrong guess', async () => {
    wrapper = await started()
    await wrapper.find('.guess').trigger('click')
    await tile(wrapper, 'TierB').trigger('click')
    await wrapper.find('.wrong').trigger('click')
    expect(wrapper.find('.guess-dialog').exists()).toBe(false)
    expect(tile(wrapper, 'TierB').classes()).toContain('off')
  })

  it('celebrates a right guess and starts over with Nochmal', async () => {
    wrapper = await started()
    await tile(wrapper, 'TierA').trigger('click')
    await wrapper.find('.guess').trigger('click')
    await tile(wrapper, 'TierB').trigger('click')
    await wrapper.find('.right').trigger('click')
    expect(wrapper.find('.win').exists()).toBe(true)
    expect(said()).toContain('Super! Erraten!')
    await wrapper.find('.again').trigger('click')
    expect(wrapper.find('.win').exists()).toBe(false)
    expect(wrapper.find('.hint').text()).toContain('Wähle dein geheimes Tier')
    expect(offCount(wrapper)).toBe(0)
  })

  it('cannot guess when every animal is greyed out', async () => {
    wrapper = await started()
    for (const label of LABELS) await tile(wrapper, label).trigger('click')
    expect(wrapper.find('.count').text()).toBe('Noch 0 übrig')
    expect(wrapper.find('.guess').attributes('disabled')).toBeDefined()
  })
})
