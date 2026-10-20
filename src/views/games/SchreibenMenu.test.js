import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import SchreibenMenu from './SchreibenMenu.vue'

vi.mock('../../services/tts.js', () => ({ speak: vi.fn(() => Promise.resolve()), stopSpeaking: vi.fn() }))

const KEY = 'spielzeugkiste.schreiben.words'

async function open(path = '/schreiben/play') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/schreiben/play', component: SchreibenMenu },
      { path: '/schreiben/words', component: { template: '<div />' } },
      { path: '/schreiben/letter/:letter', component: { template: '<div />' } },
      { path: '/schreiben/name/:name', component: { template: '<div />' } },
    ],
  })
  await router.push(path)
  await router.isReady()
  const wrapper = mount(SchreibenMenu, { global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

describe('SchreibenMenu', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ json: () => Promise.resolve({ words: ['SINA', 'DIEGO'] }) })))
  })
  afterEach(() => vi.unstubAllGlobals())

  it('shows the words, their letters and the digits', async () => {
    const { wrapper } = await open()
    expect(wrapper.findAll('.name-card').map(b => b.text())).toEqual(['SINA', 'DIEGO'])
    expect(wrapper.findAll('.letter-btn').map(b => b.text()).join('')).toBe('ADEGINOS')
    expect(wrapper.findAll('.digit-btn').map(b => b.text()).join('')).toBe('0123456789')
  })

  it('leaves out words that are switched off, and their letters', async () => {
    localStorage.setItem(KEY, JSON.stringify([{ word: 'OMA', on: true }, { word: 'SINA', on: false }]))
    const { wrapper } = await open()
    expect(wrapper.findAll('.name-card').map(b => b.text())).toEqual(['OMA'])
    expect(wrapper.findAll('.letter-btn').map(b => b.text()).join('')).toBe('AMO')
  })

  it('says so when no word is switched on', async () => {
    localStorage.setItem(KEY, JSON.stringify([{ word: 'SINA', on: false }]))
    const { wrapper } = await open()
    expect(wrapper.findAll('.name-card')).toHaveLength(0)
    expect(wrapper.find('.empty').exists()).toBe(true)
  })

  it('opens a word, a letter or the word list, keeping debug on', async () => {
    const { wrapper, router } = await open('/schreiben/play?debug')
    await wrapper.findAll('.name-card')[1].trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe('/schreiben/name/DIEGO?debug')
    await router.push('/schreiben/play?debug')
    await wrapper.findAll('.letter-btn')[0].trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe('/schreiben/letter/A?debug')
    await router.push('/schreiben/play')
    await wrapper.find('.settings').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe('/schreiben/words')
  })
})
