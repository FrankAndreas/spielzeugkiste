import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AnswerChoices from './AnswerChoices.vue'

describe('AnswerChoices', () => {
  it('shows each number with fingers and emits the pick', async () => {
    const w = mount(AnswerChoices, { props: { choices: [4, 5, 6] } })
    const buttons = w.findAll('button.choice')
    expect(buttons.map(b => b.find('.digit').text())).toEqual(['4', '5', '6'])
    expect(w.findAll('svg').length).toBeGreaterThan(0)
    await buttons[1].trigger('click')
    expect(w.emitted('pick')).toEqual([[5]])
  })

  it('emits nothing while disabled', async () => {
    const w = mount(AnswerChoices, { props: { choices: [4, 5, 6], disabled: true } })
    await w.findAll('button.choice')[0].trigger('click')
    expect(w.emitted('pick')).toBeUndefined()
  })

  it('shows only digits above 10', () => {
    const w = mount(AnswerChoices, { props: { choices: [12, 13, 14] } })
    expect(w.findAll('svg')).toHaveLength(0)
  })
})
