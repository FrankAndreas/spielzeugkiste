import { describe, it, expect } from 'vitest'
import { newGame, choose, start, toggle, undo, remaining, startGuess, pickGuess, cancelGuess, answer } from './raten.js'

// A game that has left the pick screen with the cat as the secret animal
const playing = () => start(choose(newGame(), 'katze'))
const guessing = id => pickGuess(startGuess(playing()), id)

describe('newGame', () => {
  it('starts on the pick screen with nothing hidden', () => {
    expect(newGame()).toEqual({ phase: 'pick', choice: null, secret: null, hidden: [], history: [], guess: null })
  })
})

describe('choose and start', () => {
  it('replaces the choice when another animal is tapped', () => {
    expect(choose(choose(newGame(), 'kuh'), 'schaf').choice).toBe('schaf')
  })

  it('stays on the pick screen without a choice', () => {
    expect(start(newGame()).phase).toBe('pick')
  })

  it('makes the choice the secret animal', () => {
    const s = playing()
    expect(s.phase).toBe('play')
    expect(s.secret).toBe('katze')
  })

  it('ignores choosing once the game has started', () => {
    expect(choose(playing(), 'kuh').choice).toBe('katze')
  })
})

describe('toggle and undo', () => {
  it('does nothing on the pick screen', () => {
    expect(toggle(newGame(), 'kuh').hidden).toEqual([])
  })

  it('hides an animal and brings it back on a second tap', () => {
    const once = toggle(playing(), 'kuh')
    expect(once.hidden).toEqual(['kuh'])
    const twice = toggle(once, 'kuh')
    expect(twice.hidden).toEqual([])
    expect(twice.history).toEqual(['kuh', 'kuh'])
  })

  it('treats the own secret animal like any other tile', () => {
    expect(toggle(playing(), 'katze').hidden).toEqual(['katze'])
  })

  it('reverts the taps in reverse order', () => {
    const s = toggle(toggle(playing(), 'kuh'), 'schaf')
    expect(undo(s).hidden).toEqual(['kuh'])
    expect(undo(undo(s)).hidden).toEqual([])
  })

  it('does nothing without taps to undo', () => {
    expect(undo(playing())).toEqual(playing())
  })
})

describe('remaining', () => {
  it('counts the animals that are not hidden', () => {
    expect(remaining(toggle(playing(), 'kuh'), ['kuh', 'schaf', 'katze'])).toBe(2)
  })
})

describe('guessing', () => {
  it('ignores a hidden animal', () => {
    const s = startGuess(toggle(playing(), 'kuh'))
    expect(pickGuess(s, 'kuh').guess).toBeNull()
  })

  it('goes back to playing on cancel', () => {
    const s = cancelGuess(guessing('schaf'))
    expect(s.phase).toBe('play')
    expect(s.guess).toBeNull()
  })

  it('is won on a right answer', () => {
    expect(answer(guessing('schaf'), true).phase).toBe('won')
  })

  it('hides the animal on a wrong answer, and undo brings it back', () => {
    const s = answer(guessing('schaf'), false)
    expect(s.phase).toBe('play')
    expect(s.guess).toBeNull()
    expect(s.hidden).toEqual(['schaf'])
    expect(undo(s).hidden).toEqual([])
  })

  it('needs a guessed animal before an answer', () => {
    const s = startGuess(playing())
    expect(answer(s, true)).toBe(s)
  })
})

describe('a new game after playing', () => {
  it('forgets the secret, the hidden animals and the taps', () => {
    const s = newGame()
    expect(undo(s)).toEqual(newGame())
    expect(s.hidden).toEqual([])
    expect(s.secret).toBeNull()
  })
})
