<template>
  <div class="layout" v-if="theme">
    <AppHeader :title="`🍬 ${theme.name}`" :tts="theme.tts" color="#FF69B4" />

    <div class="score-bar">
      <span class="score">{{ score }}</span>
      <span class="lives">{{ theme.player.repeat(lives) }}</span>
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
            <div class="card-sub">{{ score }} Punkte</div>
            <div v-if="record" class="card-record">Neuer Rekord!</div>
            <button class="btn big" @click="restart">Nochmal</button>
          </div>

          <div v-if="phase === 'won'" class="card">
            <div class="card-emoji">🎉</div>
            <div class="card-title">Geschafft!</div>
            <div class="card-sub">{{ score }} Punkte</div>
            <div v-if="record" class="card-record">Neuer Rekord!</div>
            <button class="btn big" @click="restart">Nochmal</button>
          </div>
        </div>
      </div>

      <ArrowPad color="#FF69B4" @dir="onDir" />
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
import { MAZE, SPEEDS, createGame, setDirection, position, update } from '../../logic/pacman.js'
import { useGameLoop } from '../../composables/useGameLoop.js'
import AppHeader from '../../components/AppHeader.vue'
import ArrowPad from '../../components/ArrowPad.vue'

const HOPPLA_MS    = 1500   // pause after a lost life
const WIN_PAUSE_MS = 800    // after the last announcement, before celebrating

const route   = useRoute()
const store   = useContentStore()
const themeId = computed(() => route.params.theme)
const theme   = computed(() => store.currentTheme)
const speed   = computed(() => (route.query.speed in SPEEDS ? route.query.speed : 'langsam'))

const phase     = ref('ready')   // ready → playing ⇄ hoppla → over | won
const score     = ref(0)
const lives     = ref(0)
const best      = ref(0)
const record    = ref(false)
const canvas    = ref(null)
const fieldWrap = ref(null)

let game = null
let resizer = null
let swipeStart = null
let lastSpeech = Promise.resolve()
let left = false

const say = text => { lastSpeech = speak(text) }

const loop = useGameLoop(dt => {
  for (const event of update(game, dt)) {
    if (event === 'half') say('Super, schon die Hälfte!')
    if (event === 'life-lost' && !game.over) hoppla()
    if (event === 'game-over') gameOver()
    if (event === 'cleared') cleared()
  }
  score.value = game.score
  lives.value = game.lives
  draw()
})

onMounted(async () => {
  await store.loadTheme('pacman', themeId.value)
  best.value = loadBest('pacman', themeId.value)
  newGame()
  say(theme.value.tts)
  await nextTick()
  resizer = new ResizeObserver(fitCanvas)
  resizer.observe(fieldWrap.value)
  window.addEventListener('keydown', onKey)
})

onUnmounted(() => {
  left = true
  resizer?.disconnect()
  window.removeEventListener('keydown', onKey)
})

function newGame() {
  game = createGame(MAZE, speed.value)
  score.value  = 0
  lives.value  = game.lives
  record.value = false
}

function begin() {
  if (phase.value !== 'ready') return
  phase.value = 'playing'
  loop.start()
}

function restart() {
  newGame()
  phase.value = 'ready'
  draw()
  begin()
}

function hoppla() {
  loop.stop()
  phase.value = 'hoppla'
  say('Hoppla!')
  const current = game
  setTimeout(() => {
    if (left || game !== current || phase.value !== 'hoppla') return
    phase.value = 'playing'
    loop.start()
  }, HOPPLA_MS)
}

function finish() {
  loop.stop()
  record.value = saveBest('pacman', themeId.value, game.score)
  best.value   = loadBest('pacman', themeId.value)
  score.value  = game.score
}

function gameOver() {
  finish()
  phase.value = 'over'
  say('Oh! Nochmal?')
}

// Let the last announcement finish, unless the game was restarted or left meanwhile
function cleared() {
  finish()
  phase.value = 'clearing'
  const current = game
  lastSpeech.then(() => setTimeout(() => {
    if (left || game !== current) return
    phase.value = 'won'
    say('Geschafft!')
  }, WIN_PAUSE_MS))
}

// The first direction also starts the game
function onDir(dir) {
  if (!game || ['over', 'won', 'clearing'].includes(phase.value)) return
  setDirection(game, dir)
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

// Keeps the maze's aspect ratio at the largest size the wrapper allows
function fitCanvas() {
  const el = canvas.value
  if (!el || !game) return
  const { width, height } = fieldWrap.value.getBoundingClientRect()
  const tile = Math.floor(Math.min(width / game.cols, height / game.rows))
  const dpr  = window.devicePixelRatio || 1
  el.style.width  = `${tile * game.cols}px`
  el.style.height = `${tile * game.rows}px`
  el.width  = tile * game.cols * dpr
  el.height = tile * game.rows * dpr
  draw()
}

function draw() {
  const el = canvas.value
  if (!el || !game || !theme.value) return
  const ctx  = el.getContext('2d')
  const tile = el.width / game.cols
  const { colors } = theme.value

  ctx.fillStyle = colors.bg
  ctx.fillRect(0, 0, el.width, el.height)

  ctx.fillStyle = colors.wall
  for (const k of game.walls) {
    const [x, y] = k.split(',').map(Number)
    ctx.beginPath()
    ctx.roundRect(x * tile + 1, y * tile + 1, tile - 2, tile - 2, tile * 0.25)
    ctx.fill()
  }

  ctx.fillStyle = colors.dot
  for (const k of game.dots) {
    const [x, y] = k.split(',').map(Number)
    ctx.beginPath()
    ctx.arc((x + 0.5) * tile, (y + 0.5) * tile, tile * 0.13, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.textAlign    = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `${Math.floor(tile * 0.8)}px system-ui, sans-serif`
  const sprite = (emoji, x, y) => ctx.fillText(emoji, (x + 0.5) * tile, (y + 0.55) * tile)

  for (const k of game.powers) {
    const [x, y] = k.split(',').map(Number)
    sprite(theme.value.power, x, y)
  }
  game.monsters.forEach((m, i) => {
    const p = position(m)
    sprite(m.scared ? theme.value.scared : theme.value.monsters[i % theme.value.monsters.length], p.x, p.y)
  })
  const p = position(game.player)
  ctx.font = `${Math.floor(tile * 0.95)}px system-ui, sans-serif`
  sprite(theme.value.player, p.x, p.y)
}
</script>

<style scoped>
.layout { height: 100vh; height: 100dvh; display: flex; flex-direction: column; overflow: hidden; }

.score-bar {
  display: flex; justify-content: space-between; align-items: center; gap: 8px;
  padding: 8px 16px; font-weight: bold; flex-shrink: 0;
}
.score { font-size: 1.2rem; color: #FF69B4; min-width: 3em; }
.lives { font-size: 1.1rem; letter-spacing: 2px; }
.best  { font-size: 0.9rem; color: #888; min-width: 5em; text-align: right; }

/* Portrait: maze above the arrow pad; landscape: side by side */
.stage {
  flex: 1; min-height: 0;
  display: flex; flex-direction: column; align-items: center; gap: 12px;
  padding: 0 12px 16px;
}
@media (orientation: landscape) {
  .stage { flex-direction: row; justify-content: center; }
}
.field-wrap {
  flex: 1; min-height: 0; min-width: 0; width: 100%;
  display: flex; align-items: center; justify-content: center;
}
@media (orientation: landscape) {
  .field-wrap { height: 100%; }
}
.board { position: relative; }
.field {
  display: block;
  border-radius: 14px;
  box-shadow: 0 4px 0 #c94a8c;
  touch-action: none;
}

.card {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 14px;
}
.card.ready  { background: rgba(255, 255, 255, 0.25); justify-content: flex-end; padding-bottom: 18%; }
.card-emoji  { font-size: 4rem; }
.card-title  { font-size: 1.8rem; font-weight: bold; color: #FF69B4; }
.card-sub    { font-size: 1.1rem; color: #666; }
.card-record { font-size: 1.1rem; font-weight: bold; color: #FF9A3C; }
.big { background: #FF69B4; color: white; font-size: 1.4rem; padding: 14px 36px; box-shadow: 0 4px 0 #c94a8c; }
</style>
