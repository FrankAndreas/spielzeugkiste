import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import SchreibenWords from './SchreibenWords.vue'

const KEY   = 'spielzeugkiste.schreiben.words'
const saved = () => JSON.parse(localStorage.getItem(KEY))

async function open() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/schreiben/play', component: { template: '<div />' } },
      { path: '/schreiben/words', component: SchreibenWords },
    ],
  })
  await router.push('/schreiben/words')
  await router.isReady()
  const wrapper = mount(SchreibenWords, { global: { plugins: [router] } })
  await flushPromises()
  return { wrapper, router }
}

const rows = w => w.findAll('.word-row').map(r => [r.find('.word').text(), r.find('input.toggle').element.checked])

describe('SchreibenWords', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ json: () => Promise.resolve({ words: ['SINA', 'DIEGO'] }) })))
    vi.stubGlobal('confirm', vi.fn(() => true))
  })
  afterEach(() => vi.unstubAllGlobals())

  it('lists the words with a switch each', async () => {
    const { wrapper } = await open()
    expect(rows(wrapper)).toEqual([['SINA', true], ['DIEGO', true]])
  })

  it('switches a word off and keeps that', async () => {
    const { wrapper } = await open()
    await wrapper.findAll('input.toggle')[1].setValue(false)
    expect(saved()).toEqual([{ word: 'SINA', on: true }, { word: 'DIEGO', on: false }])
  })

  it('adds a new word in capitals, switched on, at the top', async () => {
    const { wrapper } = await open()
    await wrapper.find('input.new-word').setValue('oma')
    await wrapper.find('form').trigger('submit')
    expect(rows(wrapper)[0]).toEqual(['OMA', true])
    expect(saved()[0]).toEqual({ word: 'OMA', on: true })
    expect(wrapper.find('input.new-word').element.value).toBe('')
  })

  it('explains a word it cannot take', async () => {
    const { wrapper } = await open()
    await wrapper.find('input.new-word').setValue('Anna-Lena')
    await wrapper.find('form').trigger('submit')
    expect(wrapper.find('.error').text()).toContain('Buchstaben')
    expect(rows(wrapper)).toHaveLength(2)
    await wrapper.find('input.new-word').setValue('sina')
    await wrapper.find('form').trigger('submit')
    expect(wrapper.find('.error').text()).toContain('schon')
  })

  it('deletes a word after asking', async () => {
    const { wrapper } = await open()
    await wrapper.findAll('.delete')[0].trigger('click')
    expect(confirm).toHaveBeenCalledWith('SINA löschen?')
    expect(rows(wrapper)).toEqual([['DIEGO', true]])
    expect(saved()).toEqual([{ word: 'DIEGO', on: true }])
  })

  it('goes back to the game menu', async () => {
    const { wrapper, router } = await open()
    await wrapper.find('.done').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/schreiben/play')
  })
})
