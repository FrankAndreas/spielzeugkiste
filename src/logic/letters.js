// Letters and digits of the Deutschschweizer Basisschrift as strokes of evenly
// spaced points. The paths come from scripts/letters/generate.py, which follows
// the official font and the stroke order of docs/handwriting/basisschrift.md.
import data from './basisschrift.json'

/** Units: cap height 100; `lines` are the cap line, middle, baseline and descender line. */
export const BOX  = data.box
const STEP = 2

// Re-spaces a polyline so neighbouring points are STEP apart
function resample(points) {
  const out = [points[0]]
  let prev = points[0]
  let carry = 0
  for (let i = 1; i < points.length; i++) {
    const p = points[i]
    let seg = Math.hypot(p.x - prev.x, p.y - prev.y)
    let from = prev
    while (carry + seg >= STEP) {
      const t = (STEP - carry) / seg
      from = { x: from.x + (p.x - from.x) * t, y: from.y + (p.y - from.y) * t }
      out.push(from)
      seg = Math.hypot(p.x - from.x, p.y - from.y)
      carry = 0
    }
    carry += seg
    prev = p
  }
  const end = points.at(-1)
  if (Math.hypot(end.x - out.at(-1).x, end.y - out.at(-1).y) > STEP / 2) out.push(end)
  return out
}

// How a glyph is spoken, with its article: "Schreib ein Es", "Schreib eine Sieben"
const SAY = {
  A: 'ein A', C: 'ein Ze', D: 'ein De', E: 'ein E', G: 'ein Ge', H: 'ein Ha', I: 'ein I',
  J: 'ein Jott', L: 'ein El', N: 'ein En', O: 'ein O', P: 'ein Pe', R: 'ein Er', S: 'ein Es',
  0: 'eine Null', 1: 'eine Eins', 2: 'eine Zwei', 3: 'eine Drei', 4: 'eine Vier',
  5: 'eine Fünf', 6: 'eine Sechs', 7: 'eine Sieben', 8: 'eine Acht', 9: 'eine Neun',
}

export const GLYPHS = Object.fromEntries(Object.entries(data.glyphs).map(([name, strokes]) => [name, {
  name,
  say: SAY[name],
  strokes: strokes.map(s => resample(s.map(([x, y]) => ({ x, y })))),
}]))

export const LETTERS = Object.keys(GLYPHS).filter(c => /[A-Z]/.test(c)).sort()
export const DIGITS  = Object.keys(GLYPHS).filter(c => /\d/.test(c)).sort()

const HELP = ['full', 'dots', 'start']

/**
 * What to write: a letter or digit three times with less help each time, or a
 * name letter by letter with full help. Empty if a glyph isn't known.
 */
export function writingTasks({ letter, name }) {
  const glyphs = name ? [...name] : [letter, letter, letter]
  if (!glyphs.every(g => GLYPHS[g])) return []
  return glyphs.map((g, i) => ({ letter: g, help: name ? 'full' : HELP[i] }))
}
