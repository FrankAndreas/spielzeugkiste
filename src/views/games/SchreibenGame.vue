<template>
  <div class="layout">
    <AppHeader :title="`✏️ Schreiben — ${letter.name}`" :tts="intro" color="#E67E22" />

    <div class="stars">
      <span v-for="i in ROUNDS" :key="i" :class="['star', { done: i <= round }]">⭐</span>
    </div>

    <div ref="area" class="area">
      <canvas
        ref="canvas"
        class="board"
        @pointerdown="onDown"
        @pointermove="onMove"
        @pointerup="onUp"
        @pointercancel="onUp"
      />
      <div v-if="debug" class="debug">
        <div>Fortschritt {{ progressPct }} % · Strich {{ strokeNo }}/{{ letter.strokes.length }}</div>
        <div v-for="(l, i) in debugLines" :key="i">{{ l }}</div>
      </div>
    </div>

    <Transition name="fade">
      <div v-if="won" class="win">
        <div class="win-content">
          <div class="win-emoji">🎉</div>
          <div class="win-text">Super geschrieben!</div>
          <div class="win-buttons">
            <button class="btn again-btn" @click="restart">Nochmal</button>
            <button class="btn done-btn" @click="router.push('/')">Fertig</button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { speak, stopSpeaking } from '../../services/tts.js'
import { createTraceLog, logEvent, sendTraces } from '../../services/traceLog.js'
import { LETTERS, BOX } from '../../logic/letters.js'
import { createTracer, penDown, penMove, penUp } from '../../logic/tracing.js'
import AppHeader from '../../components/AppHeader.vue'

const route  = useRoute()
const router = useRouter()

const ROUNDS       = 3
const HELP         = ['full', 'dots', 'start']   // less help each round
const WIN_PAUSE_MS = 800
const HINT_GAP_MS  = 4000   // don't repeat the start-dot hint more often
const SMALL_TRY    = 8      // guide points; lifting before this is just a tap

const letter = LETTERS.S
const debug  = 'debug' in route.query
const intro  = `Schreib ein ${letter.name}! Fang beim grünen Punkt an.`

const area   = ref(null)
const canvas = ref(null)
const round  = ref(0)
const won    = ref(false)
const debugLines  = ref([])
const progressPct = ref(0)
const strokeNo    = ref(1)

let tracer   = createTracer(letter)
let ink      = []           // strokes drawn by the pen, in letter space
let others   = new Map()    // other touches (debug): id -> { p, size, reason }
let fit      = { scale: 1, ox: 0, oy: 0 }
let log      = null
let left     = false
let lastHint = 0

onMounted(() => {
  resize()
  window.addEventListener('resize', resize)
  document.addEventListener('visibilitychange', onHidden)
  startRound()
  speak(intro)
})

onUnmounted(() => {
  left = true
  window.removeEventListener('resize', resize)
  document.removeEventListener('visibilitychange', onHidden)
  sendTraces(log, { result: 'left' })
  stopSpeaking()
})

// Copies the tracer's state into the debug line
function sync() {
  progressPct.value = Math.round(100 * tracer.progress / (letter.strokes[tracer.stroke].length - 1))
  strokeNo.value    = tracer.stroke + 1
}

function startRound() {
  tracer = createTracer(letter, tracer.smallest)
  sync()
  ink = []
  others = new Map()
  log = createTraceLog({
    game: 'schreiben', letter: letter.name, round: round.value + 1, help: HELP[round.value],
    viewport: [window.innerWidth, window.innerHeight], dpr: window.devicePixelRatio,
    scale: +fit.scale.toFixed(3), ua: navigator.userAgent,
  })
  draw()
}

function restart() {
  round.value = 0
  won.value   = false
  startRound()
  speak(intro)
}

// Letter box centred in the area, as big as fits with a margin
function resize() {
  const el = area.value
  const c  = canvas.value
  if (!el || !c) return
  const w = el.clientWidth
  const h = el.clientHeight
  const dpr = window.devicePixelRatio || 1
  c.width  = w * dpr
  c.height = h * dpr
  c.style.width  = `${w}px`
  c.style.height = `${h}px`
  const scale = Math.min(w / BOX.width, h / BOX.height) * 0.82
  fit = { scale, ox: (w - BOX.width * scale) / 2, oy: (h - BOX.height * scale) / 2, dpr }
  draw()
}

function toLetter(e) {
  const r = canvas.value.getBoundingClientRect()
  return { x: (e.clientX - r.left - fit.ox) / fit.scale, y: (e.clientY - r.top - fit.oy) / fit.scale }
}

const round1 = n => Math.round(n * 10) / 10
const contact = e => Math.max(e.width || 0, e.height || 0)

function record(kind, e, p, extra = {}) {
  const event = {
    kind, id: e.pointerId, type: e.pointerType, x: round1(p.x), y: round1(p.y),
    w: round1(e.width || 0), h: round1(e.height || 0), pr: round1(e.pressure || 0), ...extra,
  }
  logEvent(log, event)
  if (debug && kind !== 'move') {
    const text = `${kind} #${event.id} ${event.type} ${event.w}×${event.h} p${event.pr}${extra.reason ? ' ' + extra.reason : ''}${extra.result ? ' → ' + extra.result : ''}`
    debugLines.value = [text, ...debugLines.value].slice(0, 8)
  }
}

function onDown(e) {
  if (won.value) return
  const p = toLetter(e)
  const { accepted, reason } = penDown(tracer, e.pointerId, p, contact(e))
  record('down', e, p, accepted ? { pen: true } : { reason })
  if (accepted) {
    canvas.value.setPointerCapture?.(e.pointerId)
    ink.push([p])
  } else {
    others.set(e.pointerId, { p, size: contact(e), reason })
    // A small touch away from the start: probably the pen in the wrong place
    if (reason === 'far-from-start' && performance.now() - lastHint > HINT_GAP_MS) {
      lastHint = performance.now()
      speak('Fang beim grünen Punkt an.')
    }
  }
  draw()
}

function onMove(e) {
  const p = toLetter(e)
  if (e.pointerId !== tracer.pen) {
    if (others.has(e.pointerId)) {
      others.get(e.pointerId).p = p
      record('move', e, p, { other: true })
      if (debug) draw()
    }
    return
  }
  record('move', e, p, { pen: true })
  const samples = e.getCoalescedEvents?.() ?? []
  let result = null
  for (const s of samples.length ? samples : [e]) {
    const q = toLetter(s)
    ink.at(-1).push(q)
    result = penMove(tracer, e.pointerId, q) ?? result
    if (result) break
  }
  sync()
  if (result) finishStroke(result, e, p)
  draw()
}

function onUp(e) {
  // Neither the pen nor a known other touch: the pen lifting after a finished letter
  if (e.pointerId !== tracer.pen && !others.has(e.pointerId)) return
  others.delete(e.pointerId)
  const p        = toLetter(e)
  const progress = tracer.progress
  const result   = penUp(tracer, e.pointerId)
  record(e.type === 'pointercancel' ? 'cancel' : 'up', e, p, result ? { result, progress } : {})
  if (result === 'too-short') {
    ink = []
    sync()
    sendTraces(log, { result: 'too-short', progress })
    if (progress >= SMALL_TRY) speak('Fast! Fang nochmal beim grünen Punkt an.')
  } else if (tracer.pen === null && !others.size) {
    // All fingers off and no pen taken: send them anyway, so ignored touches show up too
    sendTraces(log, { result: 'no-pen' })
  }
  draw()
}

// The iPad may switch apps or lock without leaving the game
function onHidden() {
  if (document.visibilityState === 'hidden') sendTraces(log, { result: 'hidden' })
}

function finishStroke(result, e, p) {
  if (result !== 'letter-done') return   // multi-stroke letters continue with the next stroke
  record('done', e, p, { result })
  sendTraces(log, { result })
  const finished = ++round.value
  speak(`Super! Ein ${letter.name}!`).then(() => {
    if (left || finished !== round.value) return
    if (finished === ROUNDS) {
      setTimeout(() => {
        if (left || finished !== round.value) return
        won.value = true
        speak('Super geschrieben!')
      }, WIN_PAUSE_MS)
    } else {
      startRound()
    }
  })
}

// ---- Drawing -------------------------------------------------------------

function draw() {
  const ctx = canvas.value?.getContext?.('2d')
  if (!ctx) return
  const { scale, ox, oy, dpr = 1 } = fit
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, canvas.value.width, canvas.value.height)
  ctx.translate(ox, oy)
  ctx.scale(scale, scale)
  ctx.lineCap = ctx.lineJoin = 'round'

  const help = HELP[Math.min(round.value, ROUNDS - 1)]
  const tr   = tracer
  letter.strokes.forEach((g, s) => {
    // Wide band to trace in, a dotted centre line, then the traced part in green
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
    const traced = s < tr.stroke || tr.done ? g : s === tr.stroke ? g.slice(0, tr.progress + 1) : []
    if (traced.length > 1) {
      path(ctx, traced)
      ctx.strokeStyle = '#7ED957'
      ctx.lineWidth = 22
      ctx.stroke()
    }
    if (help === 'full') arrows(ctx, g)
  })

  // Ink of the pen
  ctx.strokeStyle = '#7B2FBE'
  ctx.lineWidth = 7
  for (const line of ink) { if (line.length > 1) { path(ctx, line); ctx.stroke() } }

  // Start dot of the next stroke, with an arrow showing the way
  if (!tr.done) {
    const g = letter.strokes[tr.stroke]
    ctx.fillStyle = '#2ECC71'
    ctx.beginPath()
    ctx.arc(g[0].x, g[0].y, 9, 0, Math.PI * 2)
    ctx.fill()
    if (help !== 'full') arrow(ctx, g, 6)
  }

  if (debug) {
    for (const { p, size, reason } of others.values()) {
      ctx.strokeStyle = reason === 'too-big' ? '#E74C3C' : '#F39C12'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(p.x, p.y, Math.max(3, size / 2 / scale), 0, Math.PI * 2)
      ctx.stroke()
    }
  }
}

function path(ctx, pts) {
  ctx.beginPath()
  ctx.moveTo(pts[0].x, pts[0].y)
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y)
}

// Small chevrons along the stroke, pointing the way to write
function arrows(ctx, g) {
  for (let i = 14; i < g.length - 8; i += 18) arrow(ctx, g, i)
}

function arrow(ctx, g, i) {
  const a = g[i]
  const b = g[Math.min(g.length - 1, i + 2)]
  const ang = Math.atan2(b.y - a.y, b.x - a.x)
  ctx.save()
  ctx.translate(a.x, a.y)
  ctx.rotate(ang)
  ctx.strokeStyle = '#E67E22'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(-4, -5)
  ctx.lineTo(3, 0)
  ctx.lineTo(-4, 5)
  ctx.stroke()
  ctx.restore()
}
</script>

<style scoped>
.layout { height: 100vh; display: flex; flex-direction: column; overflow: hidden; background: #FFF8EE; }
.stars { display: flex; justify-content: center; gap: 8px; padding: 8px; flex-shrink: 0; }
.star { font-size: 1.6rem; filter: grayscale(1); opacity: 0.35; transition: all 0.3s; }
.star.done { filter: none; opacity: 1; transform: scale(1.1); }
.area { position: relative; flex: 1; min-height: 0; }
.board { display: block; touch-action: none; -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }
.debug {
  position: absolute; left: 8px; bottom: 8px; max-width: 60%; padding: 6px 8px;
  font: 11px/1.4 monospace; color: #333; background: rgba(255, 255, 255, 0.85); border-radius: 8px;
  pointer-events: none;
}
.win { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.45); display: flex; align-items: center; justify-content: center; }
.win-content { background: white; border-radius: 28px; padding: 32px 40px; text-align: center; }
.win-emoji { font-size: 4rem; }
.win-text { font-size: 2rem; font-weight: bold; margin: 8px 0 18px; }
.win-buttons { display: flex; gap: 14px; justify-content: center; }
.again-btn { background: #E67E22; color: white; }
.done-btn { background: #eee; color: #333; }
</style>
