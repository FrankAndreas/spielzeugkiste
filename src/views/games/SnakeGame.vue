<template>
  <div class="layout" v-if="theme">
    <AppHeader :title="`🐍 ${theme.name}`" :tts="theme.tts" color="#9B59B6" />

    <div class="score-bar">
      <span class="score">{{ theme.items[0] }} {{ state.collected }}</span>
      <span class="best">Rekord: {{ best }}</span>
    </div>

    <div class="stage">
      <div ref="fieldWrap" class="field-wrap">
        <div class="board">
          <canvas
            ref="canvas"
            class="field"
            @pointerdown="onPointerDown"
            @pointerup="onPointerUp"
          />

          <div v-if="phase === 'ready'" class="card ready">
            <button class="btn big" @click="begin">Los!</button>
          </div>

          <div v-if="phase === 'over'" class="card">
            <div class="card-title">Oh! Nochmal?</div>
            <div class="card-sub">{{ state.collected }} {{ theme.collective }}</div>
            <div v-if="record" class="card-record">Neuer Rekord!</div>
            <button class="btn big" @click="restart">Nochmal</button>
          </div>
        </div>
      </div>

      <ArrowPad color="#9B59B6" @dir="onDir" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { useContentStore } from '../../stores/content.js'
import { speak } from '../../services/tts.js'
import { loadBest, saveBest } from '../../services/bestScore.js'
import { keyToDirection, swipeDirection } from '../../logic/direction.js'
import { SIZE, createSnake, turn, step, tickMs } from '../../logic/snake.js'
import { useGameLoop } from '../../composables/useGameLoop.js'
import AppHeader from '../../components/AppHeader.vue'
import ArrowPad from '../../components/ArrowPad.vue'

const MILESTONE = 5   // speak a cheer every this many items

const route   = useRoute()
const store   = useContentStore()
const themeId = computed(() => route.params.theme)
const theme   = computed(() => store.currentTheme)

const state     = ref({ snake: [], items: [], collected: 0 })
const phase     = ref('ready')   // ready → playing → over
const best      = ref(0)
const record    = ref(false)
const canvas    = ref(null)
const fieldWrap = ref(null)

let acc = 0
let resizer = null
let swipeStart = null

const loop = useGameLoop(dt => {
  acc += dt
  while (acc >= tickMs(state.value.collected)) {
    acc -= tickMs(state.value.collected)
    const event = step(state.value)
    if (event === 'ate' && state.value.collected % MILESTONE === 0) {
      speak(`Toll, schon ${state.value.collected} ${theme.value.collective}!`)
    }
    if (event === 'crashed') return gameOver()
  }
  draw()
})

onMounted(async () => {
  await store.loadTheme('snake', themeId.value)
  best.value = loadBest('snake', themeId.value)
  state.value = createSnake(theme.value.items)
  speak(theme.value.tts)
  await nextTick()
  resizer = new ResizeObserver(fitCanvas)
  resizer.observe(fieldWrap.value)
  window.addEventListener('keydown', onKey)
})

onUnmounted(() => {
  resizer?.disconnect()
  window.removeEventListener('keydown', onKey)
})

function begin() {
  if (phase.value === 'playing') return
  phase.value = 'playing'
  acc = 0
  loop.start()
}

function restart() {
  state.value  = createSnake(theme.value.items)
  record.value = false
  phase.value  = 'ready'
  draw()
  begin()
}

function gameOver() {
  loop.stop()
  phase.value  = 'over'
  record.value = saveBest('snake', themeId.value, state.value.collected)
  best.value   = loadBest('snake', themeId.value)
  draw()
  speak('Oh! Nochmal?')
}

// The first direction also starts the round
function onDir(dir) {
  if (phase.value === 'over') return
  turn(state.value, dir)
  begin()
}

function onKey(e) {
  const dir = keyToDirection(e.key)
  if (!dir) return
  e.preventDefault()
  onDir(dir)
}

function onPointerDown(e) {
  swipeStart = { x: e.clientX, y: e.clientY }
}

function onPointerUp(e) {
  if (!swipeStart) return
  const dir = swipeDirection(e.clientX - swipeStart.x, e.clientY - swipeStart.y)
  swipeStart = null
  if (dir) onDir(dir)
}

// The field is square and as large as its wrapper allows; the backing store
// uses the device pixel ratio so emoji stay crisp
function fitCanvas() {
  const el = canvas.value
  if (!el) return
  const { width, height } = fieldWrap.value.getBoundingClientRect()
  const size = Math.floor(Math.min(width, height))
  const dpr  = window.devicePixelRatio || 1
  el.style.width  = `${size}px`
  el.style.height = `${size}px`
  el.width  = size * dpr
  el.height = size * dpr
  draw()
}

function draw() {
  const el = canvas.value
  if (!el || !theme.value) return
  const ctx  = el.getContext('2d')
  const cell = el.width / SIZE
  const { colors, face } = theme.value

  ctx.fillStyle = colors.bg
  ctx.fillRect(0, 0, el.width, el.height)
  ctx.strokeStyle = colors.grid
  ctx.lineWidth = 1
  for (let i = 1; i < SIZE; i++) {
    ctx.beginPath(); ctx.moveTo(i * cell, 0); ctx.lineTo(i * cell, el.height); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(0, i * cell); ctx.lineTo(el.width, i * cell); ctx.stroke()
  }

  ctx.textAlign    = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `${Math.floor(cell * 0.8)}px system-ui, sans-serif`
  for (const item of state.value.items) {
    ctx.fillText(item.kind, (item.x + 0.5) * cell, (item.y + 0.55) * cell)
  }

  // Body from the tail up, so the head is drawn on top
  const snake = state.value.snake
  for (let i = snake.length - 1; i > 0; i--) {
    ctx.fillStyle = colors.body[(i - 1) % colors.body.length]
    roundRect(ctx, snake[i].x * cell + 1, snake[i].y * cell + 1, cell - 2, cell - 2, cell * 0.3)
  }
  if (snake.length) {
    ctx.fillStyle = colors.head
    roundRect(ctx, snake[0].x * cell, snake[0].y * cell, cell, cell, cell * 0.35)
    ctx.font = `${Math.floor(cell * 0.85)}px system-ui, sans-serif`
    ctx.fillText(face, (snake[0].x + 0.5) * cell, (snake[0].y + 0.55) * cell)
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
  ctx.fill()
}
</script>

<style scoped>
.layout { height: 100vh; height: 100dvh; display: flex; flex-direction: column; overflow: hidden; }

.score-bar {
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px 16px; font-weight: bold; flex-shrink: 0;
}
.score { font-size: 1.2rem; color: #9B59B6; }
.best  { font-size: 0.9rem; color: #888; }

/* Portrait: field above the arrow pad; landscape: side by side */
.stage {
  flex: 1; min-height: 0;
  display: flex; flex-direction: column; align-items: center; gap: 12px;
  padding: 0 12px 16px;
}
@media (orientation: landscape) {
  .stage { flex-direction: row; justify-content: center; }
}
.field-wrap {
  position: relative; flex: 1; min-height: 0; min-width: 0; width: 100%;
  display: flex; align-items: center; justify-content: center;
}
@media (orientation: landscape) {
  .field-wrap { height: 100%; }
}
.board { position: relative; }
.field {
  display: block;
  border-radius: 14px;
  box-shadow: 0 4px 0 #6f3d87;
  touch-action: none;
}

.card {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px;
  background: rgba(255, 255, 255, 0.85);
  border-radius: 14px;
}
.card.ready  { background: rgba(255, 255, 255, 0.35); justify-content: flex-end; padding-bottom: 18%; }
.card-title  { font-size: 1.8rem; font-weight: bold; color: #9B59B6; }
.card-sub    { font-size: 1.1rem; color: #666; }
.card-record { font-size: 1.1rem; font-weight: bold; color: #FF9A3C; }
.big { background: #9B59B6; color: white; font-size: 1.4rem; padding: 14px 36px; box-shadow: 0 4px 0 #6f3d87; }
</style>
