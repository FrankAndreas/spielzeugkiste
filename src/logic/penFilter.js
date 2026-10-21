// Which touch draws: one at a time, and never one much bigger than the pen
// (a resting hand). Browsers report contact sizes very differently (the iPad
// 41.6 px in steps, Firefox 1 px, 0 when unknown), so the size is compared with
// the smallest contact seen, as in tracing.js.
const HAND_FACTOR = 2

export function createPenFilter() {
  return { pen: null, smallest: Infinity }
}

/** A touch starts; true if it is the pen from now on. */
export function penStart(f, id, contactPx) {
  if (contactPx > 0) f.smallest = Math.min(f.smallest, contactPx)
  if (f.pen !== null || contactPx > HAND_FACTOR * f.smallest) return false
  f.pen = id
  return true
}

/** A touch ends; true if it was the pen. */
export function penEnd(f, id) {
  if (f.pen !== id) return false
  f.pen = null
  return true
}
