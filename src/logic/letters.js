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

export const LETTERS = {
  // Top bow anticlockwise from the upper right, then the bottom bow clockwise to the lower left
  S: {
    name: 'S',
    strokes: [resample([...arc(50, 39, 33, 29, -30, -270), ...arc(50, 99, 36, 31, -90, 150).slice(1)])],
  },
}
