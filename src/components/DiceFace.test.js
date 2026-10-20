import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DiceFace from './DiceFace.vue'

describe('DiceFace', () => {
  it('shows the pips and emits taps with the offset', async () => {
    const w = mount(DiceFace, { props: { value: 5, offset: 6, marked: new Set() } })
    expect(w.findAll('button.pip')).toHaveLength(5)
    await w.findAll('button.pip')[0].trigger('click')
    expect(w.emitted('tap')).toEqual([[6]])
  })

  it('ignores taps on pips already counted', async () => {
    const w = mount(DiceFace, { props: { value: 3, offset: 6, marked: new Set([7]) } })
    expect(w.findAll('button.pip')[1].classes()).toContain('marked')
    await w.findAll('button.pip')[1].trigger('click')
    expect(w.emitted('tap')).toBeUndefined()
  })
})
