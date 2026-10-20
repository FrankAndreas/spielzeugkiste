import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import SchreibenMenu from './SchreibenMenu.vue'

vi.mock('../../services/tts.js', () => ({ speak: vi.fn(() => Promise.resolve()), stopSpeaking: vi.fn() }))

async function open(path = '/schreiben/play') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/schreiben/play', component: SchreibenMenu },
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
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ json: () => Promise.resolve({ names: ['SINA', 'DIEGO'] }) })))
  })
  afterEach(() => vi.unstubAllGlobals())

  it('shows the names and the letters', async () => {
    const { wrapper } = await open()
    expect(wrapper.findAll('.name-card').map(b => b.text())).toEqual(['SINA', 'DIEGO'])
    expect(wrapper.findAll('.letter-btn').map(b => b.text()).join('')).toBe('ACDEGHIJLNOPRS')
  })

  it('opens a name or a letter, keeping debug on', async () => {
    const { wrapper, router } = await open('/schreiben/play?debug')
    await wrapper.findAll('.name-card')[1].trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe('/schreiben/name/DIEGO?debug')
    await router.push('/schreiben/play')
    await wrapper.findAll('.letter-btn')[0].trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe('/schreiben/letter/A')
  })
})
