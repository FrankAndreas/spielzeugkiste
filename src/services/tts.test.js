import { describe, it, expect, vi, beforeEach } from 'vitest'
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
})
