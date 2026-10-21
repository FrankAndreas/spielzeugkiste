import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import AppHeader from './AppHeader.vue'

vi.mock('../services/tts.js', () => ({ speak: vi.fn(() => Promise.resolve()) }))

describe('AppHeader', () => {
  it('goes one level up, not back to where the child came from', async () => {
    const Page = { components: { AppHeader }, template: '<AppHeader title="x" />' }
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/:p(.*)*', component: Page }],
    })
    // Menu → letter A → menu → word SINA: back must lead to the menu, not to A
    for (const p of ['/schreiben/play', '/schreiben/letter/A', '/schreiben/play', '/schreiben/name/SINA?debug']) await router.push(p)
    const wrapper = mount({ template: '<router-view />' }, { global: { plugins: [router] } })
    await flushPromises()
    await wrapper.find('.icon-btn').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe('/schreiben/play?debug')
  })
})
