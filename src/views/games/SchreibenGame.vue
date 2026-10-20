<template>
  <div class="layout">
    <AppHeader :title="`✏️ Schreiben — ${target}`" :tts="prompt" color="#E67E22" />

    <div v-if="mode === 'name'" class="name-row">
      <div
        v-for="(l, i) in tasks"
        :key="i"
        :class="['name-letter', { done: i < done, current: i === done }]"
      >
        <InkThumb v-if="i < done" :ink="inks[i]" :view="view" />
        <span v-else>{{ l.letter }}</span>
      </div>
    </div>
    <div v-else class="stars">
      <span v-for="i in tasks.length" :key="i" :class="['star', { done: i <= done }]">⭐</span>
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
        <div>{{ letter?.name }} · Fortschritt {{ progressPct }} % · Strich {{ strokeNo }}/{{ letter?.strokes.length }}</div>
        <div v-for="(l, i) in debugLines" :key="i">{{ l }}</div>
      </div>
    </div>

    <Transition name="fade">
      <div v-if="won" class="win">
        <div class="win-content">
          <div class="win-emoji">🎉</div>
          <div class="win-text">{{ mode === 'name' ? `Du hast ${target} geschrieben!` : 'Super geschrieben!' }}</div>
          <div class="win-buttons">
            <button class="btn again-btn" @click="restart">Nochmal</button>
            <button class="btn done-btn" @click="router.push({ path: '/schreiben/play', query: route.query })">Fertig</button>
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
import { drawLetter, drawLines, drawOthers } from '../../services/letterCanvas.js'
import { GLYPHS, BOX, writingTasks, viewBox, fitView } from '../../logic/letters.js'
import { createTracer, penDown, penMove, penUp } from '../../logic/tracing.js'
import AppHeader from '../../components/AppHeader.vue'
import InkThumb from '../../components/InkThumb.vue'

const route  = useRoute()
const router = useRouter()

const WIN_PAUSE_MS = 800
const HINT_GAP_MS  = 4000   // don't repeat the start-dot hint more often
const SMALL_TRY    = 8      // guide points; lifting before this is just a tap

// Spoken hints for a touch that missed the start dot; none beside the letter
const HINTS = {
  'wrong-end':      'Andersherum! Fang beim grünen Punkt an.',
  'far-from-start': 'Fang beim grünen Punkt an.',
}
const capital = text => text[0].toUpperCase() + text.slice(1)

// A name letter by letter, or one letter practised three times
const mode   = route.params.name ? 'name' : 'letter'
const target = route.params.name ?? route.params.letter
const tasks  = writingTasks(mode === 'name' ? { name: target } : { letter: target })
const view   = viewBox(tasks.map(t => t.letter))   // one size for every letter of a word
const debug  = 'debug' in route.query

const area   = ref(null)
const canvas = ref(null)
const done   = ref(0)          // finished tasks
const inks   = ref([])         // the child's lines per finished task
const won    = ref(false)
const prompt = ref('')
const debugLines  = ref([])
const progressPct = ref(0)
const strokeNo    = ref(1)
const letter      = ref(null)

let tracer   = null
let ink      = []           // lines of the current letter, in letter space
let others   = new Map()    // other touches (debug): id -> { p, size, reason }
let fit      = { scale: 1, ox: 0, oy: 0 }
let log      = null
let left     = false
let lastHint = 0

onMounted(() => {
  if (!tasks.length) {
    router.replace({ path: '/schreiben/play', query: route.query })
    return
  }
  resize()
  window.addEventListener('resize', resize)
  document.addEventListener('visibilitychange', onHidden)
  startTask()
  say(mode === 'name'
    ? `Wir schreiben ${target}! Zuerst ${letter.value.say}.`
    : `Schreib ${letter.value.say}! Fang beim grünen Punkt an.`)
})

onUnmounted(() => {
  left = true
  window.removeEventListener('resize', resize)
  document.removeEventListener('visibilitychange', onHidden)
  if (log) sendTraces(log, { result: 'left' })
  stopSpeaking()
})

// Speaks and remembers the text for the 🔊 button
function say(text) {
  prompt.value = text
  return speak(text)
}

// Copies the tracer's state into the debug line
function sync() {
  progressPct.value = Math.round(100 * tracer.progress / (letter.value.strokes[tracer.stroke].length - 1))
  strokeNo.value    = tracer.stroke + 1
}

function startTask() {
  const task = tasks[done.value]
  letter.value = GLYPHS[task.letter]
  tracer = createTracer(letter.value, tracer?.smallest)
  sync()
  ink = []
  others = new Map()
  log = createTraceLog({
    game: 'schreiben', mode, ...(mode === 'name' && { name: target }), letter: task.letter,
    task: done.value + 1, help: task.help,
    viewport: [window.innerWidth, window.innerHeight], dpr: window.devicePixelRatio,
    scale: +fit.scale.toFixed(3), ua: navigator.userAgent,
  })
  draw()
}

function restart() {
  done.value = 0
  inks.value = []
  won.value  = false
  startTask()
  say(mode === 'name' ? `Wir schreiben ${target}! Zuerst ${letter.value.say}.` : `Schreib ${letter.value.say}!`)
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
  fit = { ...fitView(view, w, h), dpr }
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
  if (won.value || !tracer) return
  const p = toLetter(e)
  const { accepted, reason } = penDown(tracer, e.pointerId, p, contact(e))
  record('down', e, p, accepted ? { pen: true, stroke: tracer.stroke + 1 } : { reason })
  if (accepted) {
    canvas.value.setPointerCapture?.(e.pointerId)
    ink.push([p])
  } else {
    others.set(e.pointerId, { p, size: contact(e), reason })
    // On the letter but not at the start dot: probably the pen in the wrong place
    if (HINTS[reason] && performance.now() - lastHint > HINT_GAP_MS) {
      lastHint = performance.now()
      speak(HINTS[reason])
    }
  }
  draw()
}

function onMove(e) {
  if (!tracer) return
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
  if (result === 'letter-done') finishLetter(e, p)
  draw()
}

function onUp(e) {
  // Neither the pen nor a known other touch: the pen lifting after a finished stroke
  if (!tracer || (e.pointerId !== tracer.pen && !others.has(e.pointerId))) return
  others.delete(e.pointerId)
  const p        = toLetter(e)
  const progress = tracer.progress
  const result   = penUp(tracer, e.pointerId)
  record(e.type === 'pointercancel' ? 'cancel' : 'up', e, p, result ? { result, progress, stroke: tracer.stroke + 1 } : {})
  if (result === 'letter-done') {
    finishLetter(e, p)   // a tapped dot can end the letter (Ä, Ö, Ü)
  } else if (result === 'too-short') {
    ink.pop()   // only the unfinished stroke; finished strokes stay
    sync()
    sendTraces(log, { result: 'too-short', progress, stroke: tracer.stroke + 1 })
    if (progress >= SMALL_TRY) speak('Fast! Fang nochmal beim grünen Punkt an.')
  } else if (!result && tracer.pen === null && !others.size) {
    // All fingers off and no pen taken: send them anyway, so ignored touches show up too
    sendTraces(log, { result: 'no-pen' })
  }
  draw()
}

// The iPad may switch apps or lock without leaving the game
function onHidden() {
  if (document.visibilityState === 'hidden' && log) sendTraces(log, { result: 'hidden' })
}

function finishLetter(e, p) {
  record('done', e, p, { result: 'letter-done' })
  sendTraces(log, { result: 'letter-done' })
  inks.value = [...inks.value, ink]
  const finished = ++done.value
  const last     = finished === tasks.length
  const next     = last ? null : GLYPHS[tasks[finished].letter]
  const text = mode === 'letter' ? `Super! ${capital(letter.value.say)}!`
             : last              ? `Super! Du hast ${target} geschrieben!`
             :                     `Jetzt ${next.say}.`
  if (!last && mode === 'name') startTask()   // the next letter shows while its name is spoken
  say(text).then(() => {
    if (left || finished !== done.value) return
    if (!last) {
      if (mode === 'letter') startTask()
      return
    }
    setTimeout(() => {
      if (left || finished !== done.value) return
      won.value = true
      if (mode === 'letter') say('Super geschrieben!')
    }, WIN_PAUSE_MS)
  })
}

function draw() {
  const ctx = canvas.value?.getContext?.('2d')
  if (!ctx || !tracer) return
  const { scale, ox, oy, dpr = 1 } = fit
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, canvas.value.width, canvas.value.height)
  ctx.translate(ox, oy)
  ctx.scale(scale, scale)
  drawLines(ctx, BOX, view)
  drawLetter(ctx, { letter: letter.value, tracer, help: tasks[Math.min(done.value, tasks.length - 1)].help, ink })
  if (debug) drawOthers(ctx, others, scale)
}
</script>

<style scoped>
.layout { height: 100vh; display: flex; flex-direction: column; overflow: hidden; background: #FFF8EE; }
.stars { display: flex; justify-content: center; gap: 8px; padding: 8px; flex-shrink: 0; }
.star { font-size: 1.6rem; filter: grayscale(1); opacity: 0.35; transition: all 0.3s; }
.star.done { filter: none; opacity: 1; transform: scale(1.1); }
.name-row { display: flex; justify-content: center; gap: 6px; padding: 8px; flex-shrink: 0; }
.name-letter {
  width: 44px; height: 60px; display: flex; align-items: center; justify-content: center;
  font-size: 2rem; font-weight: bold; color: #ccc; border-bottom: 3px solid #e8dccb;
}
.name-letter.current { color: #E67E22; border-bottom-color: #E67E22; }
.name-letter.done { border-bottom-color: #7ED957; }
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
