import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { savePainting, loadPainting } from '../../services/paintings.js'
import MalenCanvas from './MalenCanvas.vue'

vi.mock('../../services/tts.js', () => ({ speak: vi.fn(() => Promise.resolve()), stopSpeaking: vi.fn() }))
vi.mock('../../services/paintings.js', () => ({
  savePainting: vi.fn(() => Promise.resolve('new-id')),
  loadPainting: vi.fn(() => Promise.resolve({ id: 'old', image: 'data:old', thumb: 'data:t' })),
}))

async function open(path = '/malen/draw') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/malen/play', component: { template: '<div />' } },
      { path: '/malen/draw/:id?', component: MalenCanvas },
    ],
  })
  await router.push(path)
  await router.isReady()
  const wrapper = mount(MalenCanvas, { global: { plugins: [router] }, attachTo: document.body })
  await flushPromises()
  return { wrapper, router }
}

// jsdom has no PointerEvent, and MouseEvent's clientX can't be set: use a plain event
const fire = async (w, type, props) => {
  w.find('canvas.paper').element.dispatchEvent(Object.assign(new Event(type, { bubbles: true }), props))
  await flushPromises()
}

async function scribble(w, id = 1, size = 10) {
  const t = { pointerId: id, pointerType: 'touch', width: size, height: size }
  await fire(w, 'pointerdown', { ...t, clientX: 10, clientY: 10 })
  await fire(w, 'pointermove', { ...t, clientX: 40, clientY: 30 })
  await fire(w, 'pointerup',   { ...t, clientX: 40, clientY: 30 })
}

describe('MalenCanvas', () => {
  let wrapper

  beforeEach(() => {
    savePainting.mockClear()
    loadPainting.mockClear()
    HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/png;base64,PIC')
  })
  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
  })

  it('offers three tools, three sizes and twelve colours', async () => {
    ;({ wrapper } = await open())
    expect(wrapper.findAll('.tool')).toHaveLength(3)
    expect(wrapper.findAll('.size')).toHaveLength(3)
    expect(wrapper.findAll('.color')).toHaveLength(12)
  })

  it('switches tool, size and colour', async () => {
    ;({ wrapper } = await open())
    await wrapper.findAll('.tool')[2].trigger('click')
    expect(wrapper.findAll('.tool')[2].classes()).toContain('active')
    await wrapper.findAll('.size')[0].trigger('click')
    expect(wrapper.findAll('.size')[0].classes()).toContain('active')
    await wrapper.findAll('.color')[3].trigger('click')
    expect(wrapper.findAll('.color')[3].classes()).toContain('active')
  })

  it('draws a stroke, and undo takes it back', async () => {
    ;({ wrapper } = await open())
    expect(wrapper.find('.undo').attributes('disabled')).toBeDefined()
    await scribble(wrapper)
    expect(wrapper.find('.undo').attributes('disabled')).toBeUndefined()
    await wrapper.find('.undo').trigger('click')
    expect(wrapper.find('.undo').attributes('disabled')).toBeDefined()
  })

  it('ignores a second touch while the pen draws', async () => {
    ;({ wrapper } = await open())
    const pen  = { pointerId: 1, pointerType: 'touch', width: 10, height: 10 }
    const hand = { pointerId: 2, pointerType: 'touch', width: 80, height: 80 }
    await fire(wrapper, 'pointerdown', { ...pen, clientX: 10, clientY: 10 })
    await fire(wrapper, 'pointerdown', { ...hand, clientX: 300, clientY: 300 })
    await fire(wrapper, 'pointermove', { ...hand, clientX: 310, clientY: 320 })
    await fire(wrapper, 'pointerup',   { ...hand, clientX: 310, clientY: 320 })
    await fire(wrapper, 'pointermove', { ...pen, clientX: 30, clientY: 20 })
    await fire(wrapper, 'pointerup',   { ...pen, clientX: 30, clientY: 20 })
    await wrapper.find('.undo').trigger('click')
    expect(wrapper.find('.undo').attributes('disabled')).toBeDefined()
  })

  it('saves the picture with a thumbnail and goes back to the gallery', async () => {
    let router
    ;({ wrapper, router } = await open())
    await scribble(wrapper)
    await wrapper.find('.done').trigger('click')
    await flushPromises()
    expect(savePainting).toHaveBeenCalledWith({ id: undefined, image: 'data:image/png;base64,PIC', thumb: 'data:image/png;base64,PIC' })
    expect(router.currentRoute.value.path).toBe('/malen/play')
  })

  it('saves when leaving, but only if something was drawn', async () => {
    ;({ wrapper } = await open())
    wrapper.unmount()
    expect(savePainting).not.toHaveBeenCalled()
    ;({ wrapper } = await open())
    await scribble(wrapper)
    wrapper.unmount()
    wrapper = null
    await flushPromises()
    expect(savePainting).toHaveBeenCalledTimes(1)
  })

  it('goes on with a saved painting and saves it under its id', async () => {
    ;({ wrapper } = await open('/malen/draw/old'))
    expect(loadPainting).toHaveBeenCalledWith('old')
    await scribble(wrapper)
    await wrapper.find('.done').trigger('click')
    await flushPromises()
    expect(savePainting.mock.calls[0][0].id).toBe('old')
  })
})
