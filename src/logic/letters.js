// Letters as strokes of evenly spaced points in a BOX-sized space (y down)
export const BOX  = { width: 100, height: 140 }
const STEP = 2

// Points along an ellipse arc from angle a0 to a1 (degrees, y down)
function arc(cx, cy, rx, ry, a0, a1) {
  const n = Math.ceil(Math.abs(a1 - a0) / 2)
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = (a0 + (a1 - a0) * i / n) * Math.PI / 180
    return { x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) }
  })
}

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

const line = (x0, y0, x1, y1) => [{ x: x0, y: y0 }, { x: x1, y: y1 }]

// One stroke from pieces (lines and arcs) drawn in a row
const stroke = (...pieces) => resample(pieces.flat())

// Capital letters for the family names. Strokes run top to bottom and left
// to right; round letters start at the top and go anticlockwise.
// `say` is how the letter is spoken ("Schreib ein Es").
export const LETTERS = {
  A: { say: 'A', strokes: [stroke(line(50, 10, 14, 130)), stroke(line(50, 10, 86, 130)), stroke(line(28, 88, 72, 88))] },
  C: { say: 'Ze', strokes: [stroke(arc(55, 70, 42, 60, -45, -315))] },
  D: { say: 'De', strokes: [stroke(line(20, 10, 20, 130)), stroke(line(20, 10, 45, 10), arc(45, 70, 42, 60, -90, 90), line(45, 130, 20, 130))] },
  E: { say: 'E', strokes: [stroke(line(24, 10, 24, 130)), stroke(line(24, 10, 80, 10)), stroke(line(24, 70, 70, 70)), stroke(line(24, 130, 80, 130))] },
  G: { say: 'Ge', strokes: [stroke(arc(55, 70, 42, 60, -45, -360)), stroke(line(66, 72, 97, 72))] },
  H: { say: 'Ha', strokes: [stroke(line(20, 10, 20, 130)), stroke(line(80, 10, 80, 130)), stroke(line(20, 70, 80, 70))] },
  I: { say: 'I', strokes: [stroke(line(50, 10, 50, 130))] },
  J: { say: 'Jott', strokes: [stroke(line(70, 10, 70, 100), arc(45, 100, 25, 28, 0, 180))] },
  L: { say: 'El', strokes: [stroke(line(25, 10, 25, 130)), stroke(line(25, 130, 80, 130))] },
  N: { say: 'En', strokes: [stroke(line(20, 10, 20, 130)), stroke(line(20, 10, 80, 130)), stroke(line(80, 10, 80, 130))] },
  O: { say: 'O', strokes: [stroke(arc(50, 70, 40, 60, -90, -450))] },
  P: { say: 'Pe', strokes: [stroke(line(22, 10, 22, 130)), stroke(line(22, 10, 50, 10), arc(50, 40, 32, 30, -90, 90), line(50, 70, 22, 70))] },
  R: { say: 'Er', strokes: [stroke(line(22, 10, 22, 130)), stroke(line(22, 10, 50, 10), arc(50, 40, 32, 30, -90, 90), line(50, 70, 22, 70)), stroke(line(45, 70, 84, 130))] },
  // Top bow anticlockwise from the upper right, then the bottom bow clockwise to the lower left
  S: { say: 'Es', strokes: [stroke(arc(50, 39, 33, 29, -30, -270), arc(50, 99, 36, 31, -90, 150).slice(1))] },
}
for (const [name, l] of Object.entries(LETTERS)) l.name = name

const HELP = ['full', 'dots', 'start']

/**
 * What to write: a letter three times with less help each time, or a name
 * letter by letter with full help. Empty if a letter isn't known.
 */
export function writingTasks({ letter, name }) {
  const letters = name ? [...name] : [letter, letter, letter]
  if (!letters.every(l => LETTERS[l])) return []
  return letters.map((l, i) => ({ letter: l, help: name ? 'full' : HELP[i] }))
}
