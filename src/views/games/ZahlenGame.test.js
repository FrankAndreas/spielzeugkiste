import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import { speak } from '../../services/tts.js'
import ZahlenGame from './ZahlenGame.vue'

vi.mock('../../services/tts.js', () => ({
  speak:        vi.fn(() => Promise.resolve()),
  stopSpeaking: vi.fn(),
}))

vi.mock('../../services/sound.js', () => ({
  unlockAudio: vi.fn(),
  playBeat:    vi.fn(),
  playBeats:   vi.fn(async (kind, n, onBeat) => { for (let i = 1; i <= n; i++) onBeat?.(i) }),
}))

// A known session, so the tests can answer every task
const SESSION = [
  { type: 'count',  kind: 0, amount: 3, answer: 3, choices: [2, 3, 4] },
  { type: 'dice',   kind: 0, dice: [4], answer: 4, choices: [3, 4, 5] },
  { type: 'build',  kind: 0, amount: 2, supply: 5, answer: 2 },
  { type: 'plus',   kind: 0, a: 1, b: 2, answer: 3, choices: [2, 3, 4] },
  { type: 'listen', kind: 0, amount: 2, answer: 2, choices: [1, 2, 3] },
  { type: 'count',  kind: 0, amount: 1, answer: 1, choices: [0, 1, 2] },
]

vi.mock('../../logic/numbers.js', async importActual => ({
  ...(await importActual()),
  buildSession: vi.fn(() => SESSION.map(t => ({ ...t }))),
}))

const THEME = {
  name: 'Einhorn', tts: 'Zählen mit Einhörnern!',
  colors: { bg: '#fff', accent: '#a0f' },
  objects: [{ emoji: '🦄', one: 'ein Einhorn', many: 'Einhörner' }],
  basket: '🧺',
  listen: { sound: 'sparkle', picture: '✨' },
}

const said = () => speak.mock.calls.map(c => c[0])

async function play() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/zahlen/:theme/play', component: ZahlenGame },
    ],
  })
  await router.push('/zahlen/einhorn/play?level=9')
  await router.isReady()
  const wrapper = mount(ZahlenGame, { global: { plugins: [router, createPinia()] } })
  await flushPromises()
  return wrapper
}

const pick = (w, n) => w.findAll('button.choice').find(b => b.find('.digit').text() === String(n)).trigger('click')

describe('ZahlenGame', () => {
  let wrapper

  beforeEach(() => {
    setActivePinia(createPinia())
    speak.mockReset()
    speak.mockImplementation(() => Promise.resolve())
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ json: () => Promise.resolve(THEME) })))
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
    vi.unstubAllGlobals()
  })

  it('greets and asks the first question', async () => {
    wrapper = await play()
    expect(said()).toEqual(['Zählen mit Einhörnern!', 'Wie viele Einhörner?'])
  })

  it('counts each tapped object once, in order', async () => {
    wrapper = await play()
    const objs = wrapper.findAll('button.obj')
    expect(objs).toHaveLength(3)
    for (const i of [2, 0, 1]) await objs[i].trigger('click')
    await objs[0].trigger('click')
    expect(said().slice(2)).toEqual(['eins', 'zwei', 'drei'])
  })

  it('cheers a right answer, fills a star and moves on', async () => {
    wrapper = await play()
    await pick(wrapper, 3)
    await flushPromises()
    expect(said()).toContain('drei')
    expect(said()).toContain('Super! Drei!')
    expect(wrapper.findAll('.star.done')).toHaveLength(1)
    expect(wrapper.find('.die').exists()).toBe(true)
    expect(said().at(-1)).toBe('Wie viele Punkte?')
  })

  it('counts along after a wrong answer and keeps the task', async () => {
    wrapper = await play()
    await pick(wrapper, 2)
    await flushPromises()
    expect(said().slice(2)).toEqual(['zwei', 'Hmm, zähl nochmal mit mir', 'eins', 'zwei', 'drei'])
    expect(wrapper.findAll('.star.done')).toHaveLength(0)
    expect(wrapper.findAll('button.obj')).toHaveLength(3)
    expect(wrapper.findAll('button.obj.marked')).toHaveLength(0)
  })

  it('ignores answers while it counts along', async () => {
    wrapper = await play()
    const pending = []
    speak.mockImplementation(() => new Promise(resolve => pending.push(resolve)))
    await pick(wrapper, 2)
    pending.shift()()
    await flushPromises()
    expect(said().at(-1)).toBe('Hmm, zähl nochmal mit mir')
    const before = speak.mock.calls.length
    await pick(wrapper, 3)
    await wrapper.findAll('button.obj')[0].trigger('click')
    expect(speak.mock.calls.length).toBe(before)
  })

  it('celebrates after the sixth task', async () => {
    wrapper = await play()
    await pick(wrapper, 3)
    await flushPromises()
    await pick(wrapper, 4)
    await flushPromises()
    const supply = () => wrapper.findAll('.supply button.obj')
    await supply()[0].trigger('click')
    await supply()[0].trigger('click')
    expect(wrapper.findAll('.basket button.obj')).toHaveLength(2)
    await wrapper.find('button.check').trigger('click')
    await flushPromises()
    await pick(wrapper, 3)
    await flushPromises()
    await pick(wrapper, 2)
    await flushPromises()
    await pick(wrapper, 1)
    await flushPromises()
    expect(wrapper.findAll('.star.done')).toHaveLength(6)
    expect(wrapper.find('.win').exists()).toBe(false)
    await new Promise(resolve => setTimeout(resolve, 900))
    await flushPromises()
    expect(wrapper.find('.win').text()).toContain('Super gemacht!')
    expect(said().at(-1)).toBe('Super gemacht!')
  })

  it('stays silent after leaving in the middle of counting along', async () => {
    wrapper = await play()
    const pending = []
    speak.mockImplementation(() => new Promise(resolve => pending.push(resolve)))
    await pick(wrapper, 2)
    wrapper.unmount()
    wrapper = null
    const before = speak.mock.calls.length
    while (pending.length) { pending.shift()(); await flushPromises() }
    expect(speak.mock.calls.length).toBe(before)
  })
})
