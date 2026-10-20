import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ObjectField from './ObjectField.vue'

const props = extra => ({ count: 4, emoji: '🦄', layout: 'loose', marked: new Set(), seed: 1, ...extra })

describe('ObjectField', () => {
  it('shows one button per object and emits taps', async () => {
    const w = mount(ObjectField, { props: props() })
    expect(w.findAll('button.obj')).toHaveLength(4)
    await w.findAll('button.obj')[2].trigger('click')
    expect(w.emitted('tap')).toEqual([[2]])
  })

  it('ignores taps on objects already counted', async () => {
    const w = mount(ObjectField, { props: props({ marked: new Set([2]) }) })
    expect(w.findAll('button.obj')[2].classes()).toContain('marked')
    await w.findAll('button.obj')[2].trigger('click')
    expect(w.emitted('tap')).toBeUndefined()
  })

  it('puts more than 10 into ten-frames', () => {
    const w = mount(ObjectField, { props: props({ count: 14, layout: 'frames' }) })
    expect(w.findAll('.frame')).toHaveLength(2)
    expect(w.findAll('button.obj')).toHaveLength(14)
  })

  it('keeps objects still when re-rendered with the same seed', async () => {
    const w = mount(ObjectField, { props: props() })
    const before = w.findAll('button.obj').map(b => b.attributes('style'))
    await w.setProps({ marked: new Set([0]) })
    expect(w.findAll('button.obj').map(b => b.attributes('style'))).toEqual(before)
  })
})
