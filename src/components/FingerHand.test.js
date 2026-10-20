import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import FingerHand from './FingerHand.vue'

describe('FingerHand', () => {
  it('shows one hand up to 5', () => {
    const w = mount(FingerHand, { props: { count: 3 } })
    expect(w.findAll('svg')).toHaveLength(1)
    expect(w.findAll('.finger.up')).toHaveLength(3)
    expect(w.findAll('.finger')).toHaveLength(5)
  })

  it('shows a full hand plus the rest from 6 to 10', () => {
    const w = mount(FingerHand, { props: { count: 7 } })
    expect(w.findAll('svg')).toHaveLength(2)
    expect(w.findAll('.finger.up')).toHaveLength(7)
  })

  it('shows a fist for 0', () => {
    const w = mount(FingerHand, { props: { count: 0 } })
    expect(w.findAll('.finger.up')).toHaveLength(0)
  })
})
