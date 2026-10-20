import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { speak } from '../../services/tts.js'
import { GLYPHS, BOX } from '../../logic/letters.js'
import SchreibenGame from './SchreibenGame.vue'

vi.mock('../../services/tts.js', () => ({
  speak:        vi.fn(() => Promise.resolve()),
  stopSpeaking: vi.fn(),
}))

// jsdom has no layout: give the board area a size; letter space maps to it
// like the game does (the box as big as fits, times 0.9, centred)
const W = 1000, H = 1400
const SCALE = Math.min(W / BOX.width, H / BOX.height) * 0.9
const OX = (W - BOX.width * SCALE) / 2, OY = (H - BOX.height * SCALE) / 2
const px = p => ({ clientX: OX + p.x * SCALE, clientY: OY + p.y * SCALE })
const guide = GLYPHS.S.strokes[0]
let nextId = 100

const said  = () => speak.mock.calls.map(c => c[0])
const posts = () => navigator.sendBeacon.mock.calls.map(c => c[1])

async function play(path = '/schreiben/letter/S') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/schreiben/play', component: { template: '<div class="menu" />' } },
      { path: '/schreiben/letter/:letter', component: SchreibenGame },
      { path: '/schreiben/name/:name', component: SchreibenGame },
    ],
  })
  await router.push(path)
  await router.isReady()
  return mount(SchreibenGame, { global: { plugins: [router] }, attachTo: document.body })
}

// jsdom has no PointerEvent, and MouseEvent's clientX can't be set: use a plain event
async function fire(w, type, props) {
  w.find('canvas.board').element.dispatchEvent(Object.assign(new Event(type, { bubbles: true }), props))
  await flushPromises()
}

// Writes every stroke of a letter, each with a new pen touch
async function writeLetter(w, letter) {
  for (const g of GLYPHS[letter].strokes) await write(w, nextId++, g)
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
    expect(said()).toEqual(['Schreib ein Es! Fang beim grünen Punkt an.'])
  })

  it('cheers a traced S, fills a star and posts the trace', async () => {
    wrapper = await play()
    await write(wrapper)
    expect(said()).toContain('Super! Ein Es!')
    expect(wrapper.findAll('.star.done')).toHaveLength(1)
    const body = JSON.parse(await posts()[0].text())
    expect(body).toMatchObject({ game: 'schreiben', mode: 'letter', letter: 'S', task: 1, help: 'full', result: 'letter-done' })
    expect(body.events[0]).toMatchObject({ kind: 'down', id: 1, type: 'touch', pen: true, stroke: 1 })
    expect(body.events.some(e => e.kind === 'move')).toBe(true)
  })

  it('does not post the pen lifting after a finished letter on its own', async () => {
    wrapper = await play()
    await write(wrapper)
    const results = await Promise.all(posts().map(async b => JSON.parse(await b.text()).result))
    expect(results).toEqual(['letter-done'])
  })

  it('ignores a resting hand and records it', async () => {
    wrapper = await play('/schreiben/letter/S?debug')
    await fire(wrapper, 'pointerdown', { pointerId: 9, pointerType: 'touch', width: 80, height: 70, ...px({ x: 90, y: 130 }) })
    // Before any pen touch there is no size to compare with: its place beside the letter gives it away
    expect(wrapper.find('.debug').text()).toContain('off-letter')
    await write(wrapper, 1)
    expect(said()).toContain('Super! Ein Es!')
    const body = JSON.parse(await posts()[0].text())
    expect(body.events[0]).toMatchObject({ kind: 'down', id: 9, w: 80, h: 70, reason: 'off-letter' })
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

  it('writes a letter with several strokes', async () => {
    wrapper = await play('/schreiben/letter/H?debug')
    expect(said()).toEqual(['Schreib ein Ha! Fang beim grünen Punkt an.'])
    const [s1, s2, s3] = GLYPHS.H.strokes
    await write(wrapper, 1, s1)
    expect(wrapper.find('.debug').text()).toContain('Strich 2/3')
    // Lifting halfway through stroke 2 starts only stroke 2 over
    await write(wrapper, 2, s2.slice(0, s2.length / 2))
    expect(wrapper.find('.debug').text()).toContain('Strich 2/3')
    await write(wrapper, 3, s2)
    await write(wrapper, 4, s3)
    expect(said()).toContain('Super! Ein Ha!')
    expect(wrapper.findAll('.star.done')).toHaveLength(1)
  })

  it('writes a name letter by letter and celebrates it', async () => {
    wrapper = await play('/schreiben/name/SINA?debug')
    expect(said()).toEqual(['Wir schreiben SINA! Zuerst ein Es.'])
    expect(wrapper.findAll('.name-letter').map(l => l.text())).toEqual(['S', 'I', 'N', 'A'])
    await writeLetter(wrapper, 'S')
    expect(said().at(-1)).toBe('Jetzt ein I.')
    expect(wrapper.findAll('.name-letter.done')).toHaveLength(1)
    for (const l of 'INA') await writeLetter(wrapper, l)
    expect(said()).toContain('Super! Du hast SINA geschrieben!')
    await new Promise(resolve => setTimeout(resolve, 900))
    await flushPromises()
    expect(wrapper.find('.win').text()).toContain('SINA')
  })

  it('goes back to the menu for a letter it cannot teach', async () => {
    wrapper = await play('/schreiben/letter/Q')
    await flushPromises()
    expect(wrapper.vm.$router.currentRoute.value.path).toBe('/schreiben/play')
  })

  it('says which way round when the pen starts at the wrong end', async () => {
    wrapper = await play()
    await fire(wrapper, 'pointerdown', { pointerId: 7, pointerType: 'touch', width: 10, height: 10, ...px(guide.at(-1)) })
    expect(said().at(-1)).toBe('Andersherum! Fang beim grünen Punkt an.')
  })

  it('stays quiet for a touch beside the letter', async () => {
    wrapper = await play()
    await fire(wrapper, 'pointerdown', { pointerId: 7, pointerType: 'touch', width: 10, height: 10, ...px({ x: 2, y: 165 }) })
    expect(said()).toEqual(['Schreib ein Es! Fang beim grünen Punkt an.'])
  })

  it('speaks digits with their article', async () => {
    wrapper = await play('/schreiben/letter/7')
    expect(said()).toEqual(['Schreib eine Sieben! Fang beim grünen Punkt an.'])
    await writeLetter(wrapper, '7')
    expect(said()).toContain('Super! Eine Sieben!')
  })
})
