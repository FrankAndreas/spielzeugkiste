import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { listPaintings, deletePainting } from '../../services/paintings.js'
import MalenGallery from './MalenGallery.vue'

vi.mock('../../services/tts.js', () => ({ speak: vi.fn(() => Promise.resolve()), stopSpeaking: vi.fn() }))
vi.mock('../../services/paintings.js', () => ({
  listPaintings:  vi.fn(),
  deletePainting: vi.fn(() => Promise.resolve()),
}))

async function open() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/malen/play', component: MalenGallery },
      { path: '/malen/draw/:id?', component: { template: '<div />' } },
    ],
  })
  await router.push('/malen/play')
  await router.isReady()
  const wrapper = mount(MalenGallery, { global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

describe('MalenGallery', () => {
  beforeEach(() => {
    listPaintings.mockResolvedValue([{ id: 'b', thumb: 'data:b', updated: 2 }, { id: 'a', thumb: 'data:a', updated: 1 }])
    vi.stubGlobal('confirm', vi.fn(() => true))
  })
  afterEach(() => vi.unstubAllGlobals())

  it('shows a new-picture card and the paintings, newest first', async () => {
    const { wrapper } = await open()
    expect(wrapper.find('.new-card').exists()).toBe(true)
    expect(wrapper.findAll('.painting img').map(i => i.attributes('src'))).toEqual(['data:b', 'data:a'])
  })

  it('starts a new picture', async () => {
    const { wrapper, router } = await open()
    await wrapper.find('.new-card').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/malen/draw')
  })

  it('opens a painting to go on with it', async () => {
    const { wrapper, router } = await open()
    await wrapper.findAll('.painting')[1].find('img').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/malen/draw/a')
  })

  it('deletes a painting after asking', async () => {
    const { wrapper } = await open()
    await wrapper.findAll('.delete')[0].trigger('click')
    await flushPromises()
    expect(confirm).toHaveBeenCalled()
    expect(deletePainting).toHaveBeenCalledWith('b')
    expect(wrapper.findAll('.painting')).toHaveLength(1)
  })

  it('says so when there are no paintings yet', async () => {
    listPaintings.mockResolvedValue([])
    const { wrapper } = await open()
    expect(wrapper.find('.empty').exists()).toBe(true)
  })
})
