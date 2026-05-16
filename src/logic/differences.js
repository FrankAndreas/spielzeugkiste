const EDGE_ZONE = 0.12
const MAX_SCALE = 1.9

/**
 * Returns a hit-radius multiplier based on proximity to the image edge.
 * Hotspots near an edge are harder to tap accurately, so we enlarge their
 * effective radius up to MAX_SCALE when the hotspot is right at the edge.
 *
 * @param {number} x - normalised x position (0–1)
 * @param {number} y - normalised y position (0–1)
 * @returns {number} scale factor (1.0–MAX_SCALE)
 */
export function edgeScale(x, y) {
  const nearest = Math.min(x, 1 - x, y, 1 - y)
  if (nearest >= EDGE_ZONE) return 1
  return 1 + (MAX_SCALE - 1) * (1 - nearest / EDGE_ZONE)
}

/**
 * Tests whether a tap lands within the (edge-scaled) hotspot radius.
 *
 * @param {number} tapX - normalised tap x (0–1)
 * @param {number} tapY - normalised tap y (0–1)
 * @param {{ x: number, y: number, r: number }} hotspot
 * @param {{ width: number, height: number }} containerRect
 * @returns {boolean}
 */
export function hitTest(tapX, tapY, hotspot, containerRect) {
  const scale   = edgeScale(hotspot.x, hotspot.y)
  const screenR = hotspot.r * scale
  const dx      = (tapX - hotspot.x) * containerRect.width
  const dy      = (tapY - hotspot.y) * containerRect.height
  return Math.sqrt(dx * dx + dy * dy) <= screenR
}
