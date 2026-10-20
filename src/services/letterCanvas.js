// Drawing a letter to trace on a canvas, in letter space (see BOX in letters.js)

export const INK = '#7B2FBE'

export function path(ctx, pts) {
  ctx.beginPath()
  ctx.moveTo(pts[0].x, pts[0].y)
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
}

/** The child's own lines. */
export function drawInk(ctx, ink, width = 7) {
  ctx.lineCap = ctx.lineJoin = 'round'
  ctx.strokeStyle = INK
  ctx.lineWidth = width
  for (const line of ink) if (line.length > 1) { path(ctx, line); ctx.stroke() }
}

/**
 * The letter with as much help as asked for ('full', 'dots' or 'start'):
 * bands to trace in, the traced part in green, the child's ink, and the
 * start dot of the next stroke.
 */
export function drawLetter(ctx, { letter, tracer, help, ink }) {
  ctx.lineCap = ctx.lineJoin = 'round'
  const many = letter.strokes.length > 1
  letter.strokes.forEach(g => {
    path(ctx, g)
    ctx.strokeStyle = help === 'start' ? '#f1ece4' : '#ece3d6'
    ctx.lineWidth = 22
    ctx.stroke()
    if (help !== 'start') {
      ctx.setLineDash([0.1, 6])
      ctx.strokeStyle = '#b9a58c'
      ctx.lineWidth = 3
      path(ctx, g)
      ctx.stroke()
      ctx.setLineDash([])
    }
  })
  // Traced parts on top, so a later band never covers a finished stroke
  letter.strokes.forEach((g, s) => {
    const traced = s < tracer.stroke || tracer.done ? g : s === tracer.stroke ? g.slice(0, tracer.progress + 1) : []
    if (traced.length > 1) {
      path(ctx, traced)
      ctx.strokeStyle = '#7ED957'
      ctx.lineWidth = 22
      ctx.stroke()
    }
    if (help === 'full' && s >= tracer.stroke && !tracer.done) arrows(ctx, g)
  })

  drawInk(ctx, ink)

  if (tracer.done) return
  const g = letter.strokes[tracer.stroke]
  ctx.fillStyle = '#2ECC71'
  ctx.beginPath()
  ctx.arc(g[0].x, g[0].y, 9, 0, Math.PI * 2)
  ctx.fill()
  if (help !== 'full') arrow(ctx, g, 6)
  if (help === 'full' && many) {
    ctx.fillStyle = 'white'
    ctx.font = 'bold 11px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(String(tracer.stroke + 1), g[0].x, g[0].y + 0.5)
  }
}

/** Touches that are not the pen, as circles of their contact size (debug). */
export function drawOthers(ctx, others, scale) {
  for (const { p, size, reason } of others.values()) {
    ctx.strokeStyle = reason === 'too-big' ? '#E74C3C' : '#F39C12'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(p.x, p.y, Math.max(3, size / 2 / scale), 0, Math.PI * 2)
    ctx.stroke()
  }
}

// Small chevrons along the stroke, pointing the way to write
function arrows(ctx, g) {
  for (let i = 14; i < g.length - 8; i += 18) arrow(ctx, g, i)
}

function arrow(ctx, g, i) {
  const a = g[Math.min(i, g.length - 1)]
  const b = g[Math.min(g.length - 1, i + 2)]
  ctx.save()
  ctx.translate(a.x, a.y)
  ctx.rotate(Math.atan2(b.y - a.y, b.x - a.x))
  ctx.strokeStyle = '#E67E22'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(-4, -5)
  ctx.lineTo(3, 0)
  ctx.lineTo(-4, 5)
  ctx.stroke()
  ctx.restore()
}
