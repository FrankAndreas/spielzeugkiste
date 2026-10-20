import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// The audio context is shared module state, so every test gets a fresh module
async function load() {
  vi.resetModules()
  return import('./sound.js')
}

const param = () => ({
  value: 0,
  setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(),
})

class FakeAudioContext {
  static instances = 0
  constructor() {
    FakeAudioContext.instances++
    this.currentTime = 0
    this.destination = {}
    this.started     = 0
    this.resume      = vi.fn(() => Promise.resolve())
  }
  createOscillator() {
    return { type: 'sine', frequency: param(), connect: vi.fn(), start: () => this.started++, stop: vi.fn() }
  }
  createGain() {
    return { gain: param(), connect: vi.fn() }
  }
}

describe('sound without Web Audio', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('AudioContext', undefined)
    vi.stubGlobal('webkitAudioContext', undefined)
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('never throws', async () => {
    const { unlockAudio, playBeat } = await load()
    expect(() => unlockAudio()).not.toThrow()
    expect(() => playBeat('bell')).not.toThrow()
  })

  it('still counts the beats on time and resolves', async () => {
    const { playBeats } = await load()
    const onBeat = vi.fn()
    let done = false
    playBeats('drum', 3, onBeat).then(() => { done = true })
    await vi.advanceTimersByTimeAsync(0)
    expect(onBeat.mock.calls).toEqual([[1]])
    await vi.advanceTimersByTimeAsync(700)
    expect(onBeat.mock.calls).toEqual([[1], [2]])
    await vi.advanceTimersByTimeAsync(700)
    expect(onBeat.mock.calls).toEqual([[1], [2], [3]])
    expect(done).toBe(false)
    await vi.advanceTimersByTimeAsync(700)
    expect(done).toBe(true)
  })

  it('stops early when aborted', async () => {
    const { playBeats } = await load()
    const onBeat = vi.fn()
    const ctrl   = new AbortController()
    let done = false
    playBeats('drum', 5, onBeat, { signal: ctrl.signal }).then(() => { done = true })
    await vi.advanceTimersByTimeAsync(0)
    ctrl.abort()
    await vi.advanceTimersByTimeAsync(5000)
    expect(onBeat).toHaveBeenCalledTimes(1)
    expect(done).toBe(true)
  })
})

describe('sound with Web Audio', () => {
  beforeEach(() => {
    FakeAudioContext.instances = 0
    vi.stubGlobal('AudioContext', FakeAudioContext)
  })
  afterEach(() => vi.unstubAllGlobals())

  it('creates the context once and resumes it', async () => {
    const { unlockAudio } = await load()
    unlockAudio()
    unlockAudio()
    expect(FakeAudioContext.instances).toBe(1)
  })

  it('plays every sound kind', async () => {
    const { unlockAudio, playBeat, SOUND_KINDS } = await load()
    const ctx = unlockAudio()
    expect(ctx.resume).toHaveBeenCalled()
    expect(SOUND_KINDS).toEqual(['sparkle', 'bell', 'chime', 'siren', 'piano', 'drum'])
    for (const kind of SOUND_KINDS) {
      const before = ctx.started
      playBeat(kind)
      expect(ctx.started).toBeGreaterThan(before)
    }
  })
})
