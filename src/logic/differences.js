const EDGE_ZONE = 0.12
const MAX_SCALE = 1.9

/** Hotspot radii are given in pixels of an image rendered this wide. */
export const REF_WIDTH = 800

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
 * The radius scales with the rendered image width (see REF_WIDTH).
 *
 * @param {number} tapX - normalised tap x (0–1)
 * @param {number} tapY - normalised tap y (0–1)
 * @param {{ x: number, y: number, r: number }} hotspot
 * @param {{ width: number, height: number }} containerRect
 * @returns {boolean}
 */
export function hitTest(tapX, tapY, hotspot, containerRect) {
  const scale   = edgeScale(hotspot.x, hotspot.y)
  const screenR = hotspot.r * scale * containerRect.width / REF_WIDTH
  const dx      = (tapX - hotspot.x) * containerRect.width
  const dy      = (tapY - hotspot.y) * containerRect.height
  return Math.sqrt(dx * dx + dy * dy) <= screenR
}

function shuffle(items, random) {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Builds one round from a scene SVG by picking `count` random candidate
 * differences and one variant of each.
 *
 * A candidate is a `<g data-diff="key" data-cx data-cy data-r>` group (hotspot
 * in viewBox units) holding a `<g data-variant="orig">` plus one or more
 * alternatives `<g data-variant="…" data-label="…" display="none">`. The scene
 * file as-is renders as the original image.
 *
 * Passing the previous round's hotspots keeps consecutive rounds apart:
 * differences that weren't in it are picked first, and a difference that has
 * to repeat gets another variant if it has one.
 *
 * @param {string} svgText - scene SVG source
 * @param {number} count - number of differences to pick
 * @param {() => number} [random] - RNG returning [0, 1)
 * @param {{ key: string, variant: string }[]} [previous] - hotspots of the previous round
 * @returns {{ original: string, modified: string,
 *             hotspots: { id: number, key: string, variant: string,
 *                         x: number, y: number, r: number, label: string }[] }}
 */
export function buildRound(svgText, count, random = Math.random, previous = []) {
  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml')
  const svg = doc.documentElement
  const [, , vbW, vbH] = svg.getAttribute('viewBox').split(/[\s,]+/).map(Number)
  const original = new XMLSerializer().serializeToString(doc)

  const lastVariant = new Map(previous.map(h => [h.key, h.variant]))
  const candidates  = shuffle([...svg.querySelectorAll('[data-diff]')], random)
  const isFresh     = g => !lastVariant.has(g.getAttribute('data-diff'))
  const picked = [...candidates.filter(isFresh), ...candidates.filter(g => !isFresh(g))]
    .slice(0, count)

  const hotspots = picked.map((g, i) => {
    const all      = [...g.children].filter(v => v.getAttribute('data-variant') !== 'orig')
    const others   = all.filter(v => v.getAttribute('data-variant') !== lastVariant.get(g.getAttribute('data-diff')))
    const variants = others.length ? others : all
    const variant  = variants[Math.floor(random() * variants.length)]
    g.querySelector('[data-variant="orig"]').setAttribute('display', 'none')
    variant.removeAttribute('display')
    return {
      id:      i + 1,
      key:     g.getAttribute('data-diff'),
      variant: variant.getAttribute('data-variant'),
      x:       +g.getAttribute('data-cx') / vbW,
      y:       +g.getAttribute('data-cy') / vbH,
      r:       +g.getAttribute('data-r') * REF_WIDTH / vbW,
      label:   variant.getAttribute('data-label'),
    }
  })

  return { original, modified: new XMLSerializer().serializeToString(doc), hotspots }
}
