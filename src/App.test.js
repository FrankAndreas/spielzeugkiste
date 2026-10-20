import { describe, it, expect } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory, useRoute } from 'vue-router'
import App from './App.vue'

// Reads the param once at setup, like the games do
const Game = { setup: () => ({ value: useRoute().params.value }), template: '<div class="game">{{ value }}</div>' }

describe('App', () => {
  it('starts a fresh game when only the route parameter changes', async () => {
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/g/:value', component: Game }] })
    await router.push('/g/E')
    const wrapper = mount(App, { global: { plugins: [router] } })
    await flushPromises()
    expect(wrapper.find('.game').text()).toBe('E')
    await router.push('/g/SINA')
    await flushPromises()
    expect(wrapper.find('.game').text()).toBe('SINA')
  })
})
