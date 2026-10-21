// Tools for free drawing (Malen): what a stroke looks like and how it is drawn.
export const TOOLS  = ['brush', 'pencil', 'eraser']
export const SIZES  = ['S', 'M', 'L']
export const COLORS = [
  '#1f1f1f', '#8d6e63', '#e53935', '#ff7043', '#fdd835', '#7cb342',
  '#2e7d32', '#29b6f6', '#1e66d0', '#8e24aa', '#ff6fc8', '#ffffff',
]
export const PAPER = '#ffffff'

// Line widths per size, in CSS px
const WIDTHS = {
  brush:  { S: 6, M: 14, L: 28 },
  pencil: { S: 2, M: 4,  L: 8 },
  eraser: { S: 14, M: 32, L: 64 },
}

/** Width, colour and opacity of a stroke. The pencil is thin and a little see-through. */
export function strokeStyle(tool, size, color) {
  return {
    width: WIDTHS[tool][size],
    color: tool === 'eraser' ? PAPER : color,
    alpha: tool === 'pencil' ? 0.8 : 1,
  }
}

/** Draws a stroke { tool, size, color, points }: a smooth line, or a dot for a tap. */
export function drawStroke(ctx, stroke) {
  const pts = stroke.points
  if (!pts.length) return
  const { width, color, alpha } = strokeStyle(stroke.tool, stroke.size, stroke.color)
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  if (pts.length === 1) {
    ctx.beginPath()
    ctx.arc(pts[0].x, pts[0].y, width / 2, 0, Math.PI * 2)
    ctx.fill()
  } else {
    // Through the midpoints, so the line has no corners
    ctx.beginPath()
    ctx.moveTo(pts[0].x, pts[0].y)
    for (let i = 1; i < pts.length - 1; i++) {
      const mid = { x: (pts[i].x + pts[i + 1].x) / 2, y: (pts[i].y + pts[i + 1].y) / 2 }
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, mid.x, mid.y)
    }
    ctx.lineTo(pts.at(-1).x, pts.at(-1).y)
    ctx.stroke()
  }
  ctx.restore()
}
