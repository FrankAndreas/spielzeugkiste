// All distances in letter space (see BOX in letters.js)
const START_RADIUS = 22   // how close to the start dot the pen must touch down
const TOLERANCE    = 16   // how far from the guide still counts as on it
const WINDOW       = 12   // guide points the pen may move ahead per sample (≈ 24 units)
const END_SLACK    = 3    // guide points short of the end that still finish a stroke
const MAX_CONTACT  = 40   // CSS px; a bigger touch is a resting hand

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)

/** A tracer for one letter: which stroke is next and how far along it the pen got. */
export function createTracer(letter) {
  return { letter, stroke: 0, progress: 0, pen: null, done: false }
}

const guide = tr => tr.letter.strokes[tr.stroke]

/**
 * A finger, pen or hand touches down. Only one pen is followed: the first touch
 * that is small enough and starts near the start of the next stroke.
 */
export function penDown(tr, id, p, contactPx) {
  if (tr.done)                         return { accepted: false, reason: 'done' }
  if (tr.pen !== null)                 return { accepted: false, reason: 'pen-busy' }
  if (contactPx > MAX_CONTACT)         return { accepted: false, reason: 'too-big' }
  if (dist(p, guide(tr)[0]) > START_RADIUS) return { accepted: false, reason: 'far-from-start' }
  tr.pen      = id
  tr.progress = 0
  return { accepted: true }
}

/**
 * The pen moved. Progress only moves forward, and only by a little at a time,
 * so shortcuts and backwards tracing don't count. Returns 'stroke-done',
 * 'letter-done' or null.
 */
export function penMove(tr, id, p) {
  if (id !== tr.pen) return null
  const g   = guide(tr)
  const end = Math.min(g.length - 1, tr.progress + WINDOW)
  let best = -1
  let bestDist = TOLERANCE
  for (let i = tr.progress; i <= end; i++) {
    const d = dist(p, g[i])
    if (d <= bestDist) { best = i; bestDist = d }
  }
  if (best > tr.progress) tr.progress = best
  if (tr.progress < g.length - 1 - END_SLACK) return null

  tr.pen = null
  if (tr.stroke === tr.letter.strokes.length - 1) {
    tr.done = true
    return 'letter-done'
  }
  tr.stroke++
  tr.progress = 0
  return 'stroke-done'
}

/** The pen lifted. Lifting before the end of the stroke starts that stroke over. */
export function penUp(tr, id) {
  if (id !== tr.pen) return null
  tr.pen      = null
  tr.progress = 0
  return 'too-short'
}
