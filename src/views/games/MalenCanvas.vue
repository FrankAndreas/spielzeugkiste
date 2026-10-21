<template>
  <div class="layout">
    <AppHeader title="🖌️ Malen" :tts="TTS" color="#26A69A" />

    <div class="bar">
      <div class="group">
        <button
          v-for="t in TOOL_BUTTONS"
          :key="t.id"
          :class="['tool', { active: tool === t.id }]"
          @click="tool = t.id"
        ><span class="icon">{{ t.icon }}</span>{{ t.label }}</button>
      </div>
      <div class="group">
        <button
          v-for="sh in SHAPE_BUTTONS"
          :key="sh.id"
          :class="['shape', { active: tool === sh.id }]"
          :aria-label="sh.label"
          @click="tool = sh.id"
        >{{ sh.icon }}</button>
      </div>
      <div class="group">
        <button
          v-for="s in SIZES"
          :key="s"
          :class="['size', { active: size === s }]"
          :aria-label="`Grösse ${s}`"
          @click="size = s"
        ><span class="dot" :style="dotStyle(s)" /></button>
      </div>
      <div class="group">
        <button class="act undo" :disabled="!strokes.length" @click="undo">↩</button>
        <button class="act clear" @click="clearAll">🗑</button>
        <button class="act done" @click="done">✅ Fertig</button>
      </div>
    </div>

    <div ref="area" class="area">
      <canvas
        ref="paper"
        class="paper"
        @pointerdown="onDown"
        @pointermove="onMove"
        @pointerup="onUp"
        @pointercancel="onUp"
      />
      <canvas ref="overlay" class="overlay" />
      <div v-if="debug" class="debug">
        <div v-for="(l, i) in debugLines" :key="i">{{ l }}</div>
      </div>
    </div>

    <div class="colors">
      <button
        v-for="c in COLORS"
        :key="c"
        :class="['color', { active: color === c }]"
        :style="{ background: c }"
        :aria-label="c"
        @click="pickColor(c)"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { speak } from '../../services/tts.js'
import { savePainting, loadPainting } from '../../services/paintings.js'
import { COLORS, SIZES, PAPER, drawStroke, isShape } from '../../logic/drawing.js'
import { createPenFilter, penStart, penEnd } from '../../logic/penFilter.js'
import AppHeader from '../../components/AppHeader.vue'

const route  = useRoute()
const router = useRouter()

const TTS = 'Mal, was du magst! Wähle einen Pinsel, einen Stift oder den Radierer.'
const TOOL_BUTTONS = [
  { id: 'brush',  icon: '🖌️', label: 'Pinsel' },
  { id: 'pencil', icon: '✏️', label: 'Stift' },
  { id: 'eraser', icon: '🧽', label: 'Radierer' },
]
const SHAPE_BUTTONS = [
  { id: 'line',     icon: '➖', label: 'Linie' },
  { id: 'circle',   icon: '⭕', label: 'Kreis' },
  { id: 'rect',     icon: '⬜', label: 'Viereck' },
  { id: 'triangle', icon: '🔺', label: 'Dreieck' },
  { id: 'star',     icon: '⭐', label: 'Stern' },
  { id: 'heart',    icon: '❤️', label: 'Herz' },
]
const MIN_SHAPE   = 6     // px; a shape dragged less than this was just a tap
const THUMB_WIDTH = 320

const area    = ref(null)
const paper   = ref(null)
const overlay = ref(null)
const tool    = ref('brush')
const size    = ref('M')
const color   = ref(COLORS[2])
const strokes = ref([])
const debug   = 'debug' in route.query   // ?debug: list touches, for finding input problems
const debugLines = ref([])

let paintingId = route.params.id || undefined
let background = null    // a saved painting being continued
let current    = null    // the stroke being drawn
let changed    = false
let dpr        = 1
const filter   = createPenFilter()

onMounted(async () => {
  speak(TTS)
  resize()
  window.addEventListener('resize', resize)
  if (paintingId) {
    const saved = await loadPainting(paintingId)
    if (saved) {
      const img = new Image()
      img.onload = () => { background = img; redraw() }
      img.src = saved.image
    }
  }
})

// Before unmounting, while the canvas is still there: keep what was drawn when leaving with ← as well
onBeforeUnmount(() => {
  window.removeEventListener('resize', resize)
  save()
})

// Picking a colour while the eraser is in hand goes back to the brush
function pickColor(c) {
  color.value = c
  if (tool.value === 'eraser') tool.value = 'brush'
}

// The size buttons show small, medium and large, whatever the tool's real widths are
const DOTS = { S: 10, M: 20, L: 32 }

function dotStyle(s) {
  const w = DOTS[s]
  return { width: `${w}px`, height: `${w}px`, background: tool.value === 'eraser' ? '#bbb' : color.value }
}

function context(canvas) {
  const ctx = canvas?.getContext?.('2d')
  ctx?.setTransform(dpr, 0, 0, dpr, 0, 0)
  return ctx
}

function resize() {
  const el = area.value
  if (!el) return
  dpr = window.devicePixelRatio || 1
  for (const c of [paper.value, overlay.value]) {
    c.width  = el.clientWidth * dpr
    c.height = el.clientHeight * dpr
    c.style.width  = `${el.clientWidth}px`
    c.style.height = `${el.clientHeight}px`
  }
  redraw()
}

// Paper, the saved painting (if any) as big as fits, then every stroke
function redraw() {
  const ctx = context(paper.value)
  if (!ctx) return
  const w = paper.value.width / dpr
  const h = paper.value.height / dpr
  ctx.fillStyle = PAPER
  ctx.fillRect(0, 0, w, h)
  if (background) {
    const s = Math.min(w / background.width, h / background.height) * dpr
    const bw = background.width * s / dpr
    const bh = background.height * s / dpr
    ctx.drawImage(background, (w - bw) / 2, (h - bh) / 2, bw, bh)
  }
  for (const s of strokes.value) drawStroke(ctx, s)
}

function point(e) {
  const r = paper.value.getBoundingClientRect()
  return { x: e.clientX - r.left, y: e.clientY - r.top }
}

const contact = e => Math.max(e.width || 0, e.height || 0)

function log(kind, e, note = '') {
  if (!debug) return
  const line = `${kind} #${e.pointerId} ${e.pointerType} ${Math.round(e.width || 0)}×${Math.round(e.height || 0)} ${note}`
  debugLines.value = [line.trim(), ...debugLines.value].slice(0, 10)
}

function onDown(e) {
  const busy = filter.pen !== null
  const ok   = penStart(filter, e.pointerId, contact(e))
  log('down', e, ok ? 'pen' : busy ? 'busy' : 'too-big')
  if (!ok) return
  paper.value.setPointerCapture?.(e.pointerId)
  current = { tool: tool.value, size: size.value, color: color.value, points: [point(e)] }
  drawCurrent()
}

function onMove(e) {
  if (!current || e.pointerId !== filter.pen) return
  if (isShape(current.tool)) {
    current.points = [current.points[0], point(e)]   // from where the drag started to here
  } else {
    const samples = e.getCoalescedEvents?.() ?? []
    for (const s of samples.length ? samples : [e]) current.points.push(point(s))
  }
  drawCurrent()
}

function onUp(e) {
  log(e.type === 'pointercancel' ? 'cancel' : 'up', e, `${current?.points.length ?? 0} points`)
  if (!penEnd(filter, e.pointerId) || !current) return
  if (isShape(current.tool)) {
    const [a, b] = [current.points[0], point(e)]
    current.points = [a, b]
    if (Math.hypot(b.x - a.x, b.y - a.y) < MIN_SHAPE) {
      current = null
      drawCurrent()
      return
    }
  }
  strokes.value = [...strokes.value, current]
  const ctx = context(paper.value)
  if (ctx) drawStroke(ctx, current)
  current = null
  drawCurrent()
  changed = true
}

// The stroke in progress lives on its own layer, so a see-through pencil isn't drawn over itself
function drawCurrent() {
  const ctx = context(overlay.value)
  if (!ctx) return
  ctx.clearRect(0, 0, overlay.value.width, overlay.value.height)
  if (current) drawStroke(ctx, current)
}

function undo() {
  strokes.value = strokes.value.slice(0, -1)
  changed = true
  redraw()
}

function clearAll() {
  if (!confirm('Alles wegmachen und neu anfangen?')) return
  strokes.value = []
  background = null
  changed = true
  redraw()
}

function thumbnail() {
  const t = document.createElement('canvas')
  t.width  = THUMB_WIDTH
  t.height = Math.round(THUMB_WIDTH * paper.value.height / paper.value.width) || THUMB_WIDTH
  t.getContext?.('2d')?.drawImage(paper.value, 0, 0, t.width, t.height)
  return t.toDataURL('image/jpeg', 0.7)
}

async function save() {
  if (!changed || !paper.value) return
  changed = false
  paintingId = await savePainting({ id: paintingId, image: paper.value.toDataURL('image/png'), thumb: thumbnail() })
}

async function done() {
  await save()
  router.push('/malen/play')
}
</script>

<style scoped>
.layout { height: 100vh; display: flex; flex-direction: column; overflow: hidden; background: #f3fbfa; }
.bar {
  display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 8px;
  padding: 8px 12px; flex-shrink: 0; background: #e0f2f1;
}
.group { display: flex; gap: 6px; align-items: center; }
.tool, .size, .act {
  min-height: 48px; padding: 4px 12px; border-radius: 14px; font-weight: bold; font-size: 0.85rem;
  background: white; border: 3px solid transparent; color: #333;
}
.tool { display: flex; align-items: center; gap: 6px; }
.icon { font-size: 1.5rem; }
.size { width: 56px; padding: 0; display: flex; align-items: center; justify-content: center; }
.dot { display: block; flex-shrink: 0; border-radius: 50%; border: 1px solid #ccc; }
.shape { min-width: 48px; min-height: 48px; font-size: 1.4rem; border-radius: 14px; background: white; border: 3px solid transparent; }
.tool.active, .size.active, .shape.active { border-color: #26A69A; }
.act:disabled { opacity: 0.4; }
.done { background: #26A69A; color: white; }
.area { position: relative; flex: 1; min-height: 0; margin: 8px; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12); }
.paper, .overlay { position: absolute; inset: 0; display: block; }
.paper { touch-action: none; -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }
.overlay { pointer-events: none; }
.debug {
  position: absolute; left: 8px; bottom: 8px; padding: 6px 8px; pointer-events: none;
  font: 11px/1.4 monospace; color: #333; background: rgba(255, 255, 255, 0.85); border-radius: 8px;
}
.colors { display: flex; justify-content: center; flex-wrap: wrap; gap: 8px; padding: 8px 12px 12px; flex-shrink: 0; }
.color { width: 44px; height: 44px; border-radius: 50%; border: 3px solid #ddd; }
.color.active { border-color: #333; transform: scale(1.12); }
</style>
