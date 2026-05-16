import { describe, it, expect } from 'vitest'
import { createHistory } from './history.js'

describe('createHistory', () => {
  it('starts with canUndo=false and canRedo=false', () => {
    const h = createHistory([1, 2, 3])
    expect(h.canUndo()).toBe(false)
    expect(h.canRedo()).toBe(false)
    expect(h.current()).toEqual([1, 2, 3])
  })

  it('push records a new state and enables undo', () => {
    const h = createHistory([1])
    h.push([1, 2])
    expect(h.canUndo()).toBe(true)
    expect(h.current()).toEqual([1, 2])
  })

  it('undo returns the previous state', () => {
    const h = createHistory([1])
    h.push([1, 2])
    h.undo()
    expect(h.current()).toEqual([1])
    expect(h.canUndo()).toBe(false)
  })

  it('redo returns the next state after undo', () => {
    const h = createHistory([1])
    h.push([1, 2])
    h.undo()
    h.redo()
    expect(h.current()).toEqual([1, 2])
    expect(h.canRedo()).toBe(false)
  })

  it('push after undo discards redo states', () => {
    const h = createHistory([1])
    h.push([1, 2])
    h.push([1, 2, 3])
    h.undo()                  // back to [1, 2]
    h.push([1, 2, 99])        // discards [1, 2, 3]
    expect(h.canRedo()).toBe(false)
    expect(h.current()).toEqual([1, 2, 99])
  })
})
