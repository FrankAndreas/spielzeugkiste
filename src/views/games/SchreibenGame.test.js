import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { speak } from '../../services/tts.js'
import { LETTERS } from '../../logic/letters.js'
import SchreibenGame from './SchreibenGame.vue'

vi.mock('../../services/tts.js', () => ({
  speak:        vi.fn(() => Promise.resolve()),
  stopSpeaking: vi.fn(),
}))

// jsdom has no layout: give the board area a size, so letter space maps to
// scale 8.2 with the box at (90, 126)
const W = 1000, H = 1400, SCALE = 8.2, OX = 90, OY = 126
const px = p => ({ clientX: OX + p.x * SCALE, clientY: OY + p.y * SCALE })
const guide = LETTERS.S.strokes[0]

const said  = () => speak.mock.calls.map(c => c[0])
const posts = () => navigator.sendBeacon.mock.calls.map(c => c[1])

async function play(query = '') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', component: { template: '<div />' } }, { path: '/schreiben/play', component: SchreibenGame }],
  })
  await router.push(`/schreiben/play${query}`)
  await router.isReady()
  return mount(SchreibenGame, { global: { plugins: [router] }, attachTo: document.body })
}

// jsdom has no PointerEvent, and MouseEvent's clientX can't be set: use a plain event
async function fire(w, type, props) {
  w.find('canvas').element.dispatchEvent(Object.assign(new Event(type, { bubbles: true }), props))
  await flushPromises()
}

async function write(w, id = 1, points = guide, size = 10) {
  const touch = { pointerId: id, pointerType: 'touch', width: size, height: size }
  await fire(w, 'pointerdown', { ...touch, ...px(points[0]) })
  for (const p of points) await fire(w, 'pointermove', { ...touch, ...px(p) })
  await fire(w, 'pointerup', { ...touch, ...px(points.at(-1)) })
}

describe('SchreibenGame', () => {
  let wrapper

  beforeEach(() => {
    speak.mockClear()
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(W)
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(H)
    vi.stubGlobal('navigator', { ...navigator, userAgent: 'test', sendBeacon: vi.fn(() => true) })
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = null
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('says what to do', async () => {
    wrapper = await play()
    expect(said()).toEqual(['Schreib ein S! Fang beim grünen Punkt an.'])
  })

  it('cheers a traced S, fills a star and posts the trace', async () => {
    wrapper = await play()
    await write(wrapper)
    expect(said()).toContain('Super! Ein S!')
    expect(wrapper.findAll('.star.done')).toHaveLength(1)
    const body = JSON.parse(await posts()[0].text())
    expect(body).toMatchObject({ game: 'schreiben', letter: 'S', round: 1, result: 'letter-done' })
    expect(body.events[0]).toMatchObject({ kind: 'down', id: 1, type: 'touch', pen: true })
    expect(body.events.some(e => e.kind === 'move')).toBe(true)
  })

  it('does not post the pen lifting after a finished letter on its own', async () => {
    wrapper = await play()
    await write(wrapper)
    const results = await Promise.all(posts().map(async b => JSON.parse(await b.text()).result))
    expect(results).toEqual(['letter-done'])
  })

  it('ignores a resting hand and records it', async () => {
    wrapper = await play('?debug')
    await fire(wrapper, 'pointerdown', { pointerId: 9, pointerType: 'touch', width: 80, height: 70, ...px({ x: 90, y: 130 }) })
    // Before any pen touch there is no size to compare with: its place gives it away
    expect(wrapper.find('.debug').text()).toContain('far-from-start')
    await write(wrapper, 1)
    expect(said()).toContain('Super! Ein S!')
    const body = JSON.parse(await posts()[0].text())
    expect(body.events[0]).toMatchObject({ kind: 'down', id: 9, w: 80, h: 70, reason: 'far-from-start' })
  })

  it('encourages after lifting halfway and posts that try', async () => {
    wrapper = await play()
    await write(wrapper, 1, guide.slice(0, guide.length / 2))
    expect(said()).toContain('Fast! Fang nochmal beim grünen Punkt an.')
    expect(wrapper.findAll('.star.done')).toHaveLength(0)
    expect(JSON.parse(await posts()[0].text()).result).toBe('too-short')
  })

  it('celebrates after three letters', async () => {
    wrapper = await play()
    for (let i = 1; i <= 3; i++) await write(wrapper, i)
    expect(wrapper.findAll('.star.done')).toHaveLength(3)
    await new Promise(resolve => setTimeout(resolve, 900))
    await flushPromises()
    expect(wrapper.find('.win').text()).toContain('Super geschrieben!')
  })

  it('posts touches that were all ignored, so the reason reaches the file', async () => {
    wrapper = await play()
    const touch = { pointerId: 5, pointerType: 'touch', width: 80, height: 80, ...px({ x: 50, y: 70 }) }
    await fire(wrapper, 'pointerdown', touch)
    await fire(wrapper, 'pointerup', touch)
    const body = JSON.parse(await posts()[0].text())
    expect(body.result).toBe('no-pen')
    expect(body.events.map(e => [e.kind, e.reason])).toEqual([['down', 'far-from-start'], ['up', undefined]])
  })

  it('posts what it has when the iPad hides the page', async () => {
    wrapper = await play()
    await fire(wrapper, 'pointerdown', { pointerId: 1, pointerType: 'touch', width: 10, height: 10, ...px(guide[0]) })
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    document.dispatchEvent(new Event('visibilitychange'))
    expect(JSON.parse(await posts()[0].text()).result).toBe('hidden')
  })
})
