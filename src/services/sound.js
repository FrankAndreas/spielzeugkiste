export const SOUND_KINDS = ['sparkle', 'bell', 'chime', 'siren', 'piano', 'drum']

const GAP_MS = 700

let ctx = null

/**
 * Creates (once) and resumes the shared audio context. iOS only allows this
 * from a user gesture, so call it on a tap. Returns the context, or null.
 */
export function unlockAudio() {
  const Ctx = window.AudioContext || window.webkitAudioContext
  if (!Ctx) return null
  if (!ctx) ctx = new Ctx()
  ctx.resume?.()
  return ctx
}

// One oscillator through its own gain envelope
function tone({ type = 'sine', freq, to, start = 0, length, volume = 0.3 }) {
  const t   = ctx.currentTime + start
  const osc = ctx.createOscillator()
  const amp = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t)
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t + length)
  amp.gain.setValueAtTime(0.0001, t)
  amp.gain.linearRampToValueAtTime(volume, t + 0.01)
  amp.gain.exponentialRampToValueAtTime(0.0001, t + length)
  osc.connect(amp)
  amp.connect(ctx.destination)
  osc.start(t)
  osc.stop(t + length + 0.02)
}

const SOUNDS = {
  sparkle: () => [1320, 1760, 2350].forEach((freq, i) => tone({ freq, start: i * 0.06, length: 0.15, volume: 0.15 })),
  bell:    () => { tone({ freq: 880, length: 0.4 }); tone({ freq: 1760, length: 0.25, volume: 0.1 }) },
  chime:   () => { tone({ freq: 1568, length: 0.35, volume: 0.2 }); tone({ freq: 2093, length: 0.3, volume: 0.1 }) },
  siren:   () => tone({ type: 'square', freq: 660, to: 990, length: 0.3, volume: 0.08 }),
  piano:   () => tone({ type: 'triangle', freq: 523, length: 0.4, volume: 0.35 }),
  drum:    () => tone({ freq: 160, to: 50, length: 0.25, volume: 0.6 }),
}

/** One short beat of the given kind; silent without Web Audio. */
export function playBeat(kind) {
  if (!ctx) unlockAudio()
  if (!ctx) return
  ;(SOUNDS[kind] ?? SOUNDS.drum)()
}

const wait = ms => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Plays n beats gapMs apart, calling onBeat(1..n) with each. Resolves one gap
 * after the last beat, or as soon as the signal is aborted.
 */
export async function playBeats(kind, n, onBeat, { gapMs = GAP_MS, signal } = {}) {
  for (let i = 1; i <= n; i++) {
    if (signal?.aborted) return
    playBeat(kind)
    onBeat?.(i)
    await wait(gapMs)
  }
}
