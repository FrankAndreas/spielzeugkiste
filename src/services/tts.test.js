import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { speak, stopSpeaking } from './tts.js'

describe('tts service', () => {
  let mockSynth

  beforeEach(() => {
    mockSynth = {
      cancel: vi.fn(),
      speak:  vi.fn(),
    }
    vi.stubGlobal('speechSynthesis', mockSynth)
    vi.stubGlobal('SpeechSynthesisUtterance', class {
      constructor(text) { this.text = text; this.lang = '' }
    })
  })

  it('speaks with de-DE language', () => {
    speak('Hallo Welt')
    const utterance = mockSynth.speak.mock.calls[0][0]
    expect(utterance.text).toBe('Hallo Welt')
    expect(utterance.lang).toBe('de-DE')
  })

  it('cancels previous speech before speaking', () => {
    speak('first')
    speak('second')
    expect(mockSynth.cancel).toHaveBeenCalledTimes(2)
  })

  it('stopSpeaking cancels synthesis', () => {
    stopSpeaking()
    expect(mockSynth.cancel).toHaveBeenCalledTimes(1)
  })

  it('does nothing when speechSynthesis is unavailable', () => {
    vi.stubGlobal('speechSynthesis', undefined)
    expect(() => speak('test')).not.toThrow()
  })

  it('resolves right away when speechSynthesis is unavailable', async () => {
    vi.stubGlobal('speechSynthesis', undefined)
    await expect(speak('test')).resolves.toBeUndefined()
  })

  describe('waiting for the end of speech', () => {
    beforeEach(() => vi.useFakeTimers())
    afterEach(() => vi.useRealTimers())

    const settled = p => {
      let done = false
      p.then(() => { done = true })
      return () => done
    }

    it('resolves when the utterance ends', async () => {
      const isDone = settled(speak('Hallo'))
      await vi.advanceTimersByTimeAsync(0)
      expect(isDone()).toBe(false)
      mockSynth.speak.mock.calls[0][0].onend()
      await vi.advanceTimersByTimeAsync(0)
      expect(isDone()).toBe(true)
    })

    it('resolves when the utterance fails or is interrupted', async () => {
      const isDone = settled(speak('Hallo'))
      mockSynth.speak.mock.calls[0][0].onerror()
      await vi.advanceTimersByTimeAsync(0)
      expect(isDone()).toBe(true)
    })

    it('resolves after a timeout when no end event arrives', async () => {
      const isDone = settled(speak('Hallo'))
      await vi.advanceTimersByTimeAsync(1000)
      expect(isDone()).toBe(false)
      await vi.advanceTimersByTimeAsync(10000)
      expect(isDone()).toBe(true)
    })
  })
})
