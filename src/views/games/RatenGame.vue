<template>
  <div class="layout">
    <AppHeader
      :title="`🕵️ Rate mal! — ${theme?.name ?? ''}`"
      :tts="theme?.tts ?? ''"
      color="#8D6E63"
    />

    <div class="hint">{{ hint }}</div>

    <div v-if="theme" class="main">
      <div class="grid-wrap">
        <div class="board" :style="{ gridTemplateColumns: `repeat(${COLS}, ${tileSize}px)` }">
          <button
            v-for="a in animals"
            :key="a.id"
            class="tile"
            :class="{ off: game.hidden.includes(a.id), chosen: game.phase === 'pick' && game.choice === a.id, aiming: game.phase === 'guess' }"
            @click="onTile(a)"
          >
            <img :src="src(a)" :alt="a.label" />
            <span class="label">{{ a.label }}</span>
          </button>
        </div>
      </div>

      <div class="side">
        <template v-if="game.phase === 'pick'">
          <button v-if="game.choice" class="btn start" @click="onStart">✓ Los geht's!</button>
        </template>
        <template v-else>
          <div class="mine">
            <div class="mine-title">Dein Tier</div>
            <div class="tile big">
              <img :src="src(secret)" :alt="secret.label" />
              <span class="label">{{ secret.label }}</span>
            </div>
          </div>
          <div class="count">Noch {{ left }} übrig</div>
          <button class="btn undo" :disabled="!game.history.length" @click="game = undo(game)">↩ Zurück</button>
          <button
            class="btn guess"
            :class="{ active: game.phase === 'guess' }"
            :disabled="left === 0"
            @click="onGuess"
          >🎯 Ich rate!</button>
          <div class="spacer" />
          <button class="btn new-game" @click="restart">🔄 Neues Spiel</button>
        </template>
      </div>
    </div>

    <div v-if="guessed" class="overlay">
      <div class="guess-dialog">
        <div class="question">Ist es {{ guessed.the }}?</div>
        <div class="tile big">
          <img :src="src(guessed)" :alt="guessed.label" />
          <span class="label">{{ guessed.label }}</span>
        </div>
        <div class="ask">Was sagt dein Freund?</div>
        <div class="row">
          <button class="btn right" @click="onAnswer(true)">🎉 Richtig!</button>
          <button class="btn wrong" @click="onAnswer(false)">Falsch</button>
        </div>
        <button class="cancel" @click="game = cancelGuess(game)">Abbrechen</button>
      </div>
    </div>

    <Transition name="fade">
      <div v-if="game.phase === 'won'" class="win">
        <div class="win-content">
          <div class="win-emoji">🎉</div>
          <div class="win-text">Super! Erraten!</div>
          <button class="btn again" @click="restart">Nochmal</button>
          <button class="btn home" @click="router.push('/')">🏠 Zur Übersicht</button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useContentStore } from '../../stores/content.js'
import { speak } from '../../services/tts.js'
import { newGame, choose, start, toggle, undo, remaining, startGuess, pickGuess, cancelGuess, answer } from '../../logic/raten.js'
import AppHeader from '../../components/AppHeader.vue'

const COLS = 6
const ROWS = 4
const MIN_TILE = 56
const MAX_TILE = 150
const SIDE_W   = 210   // the column with "Dein Tier" and the buttons
const GAP      = 10

const route   = useRoute()
const router  = useRouter()
const store   = useContentStore()
const themeId = computed(() => route.params.theme)
const theme   = computed(() => store.currentTheme)
const animals = computed(() => theme.value?.animals ?? [])

const game     = ref(newGame())
const tileSize = ref(100)

const byId    = id => animals.value.find(a => a.id === id)
const secret  = computed(() => byId(game.value.secret))
const guessed = computed(() => game.value.phase === 'guess' && game.value.guess ? byId(game.value.guess) : null)
const left    = computed(() => remaining(game.value, animals.value.map(a => a.id)))

const hint = computed(() => ({
  pick:  'Wähle dein geheimes Tier! Verrat es nicht 🤫',
  guess: 'Tippe auf das Tier, das du rätst.',
})[game.value.phase] ?? '')

const src = a => `/content/raten/${themeId.value}/${a.image}`

function fitTileSize() {
  const availW = window.innerWidth  - 24 - 12 - SIDE_W - (COLS - 1) * GAP   // padding, gap to the side column
  const availH = window.innerHeight - 120 - (ROWS - 1) * GAP                // header + hint line
  const size   = Math.min(Math.floor(availW / COLS), Math.floor(availH / ROWS))
  tileSize.value = Math.max(MIN_TILE, Math.min(MAX_TILE, size))
}

onMounted(async () => {
  window.addEventListener('resize', fitTileSize)
  fitTileSize()
  await store.loadTheme('raten', themeId.value)
  restart()
})

onUnmounted(() => window.removeEventListener('resize', fitTileSize))

function restart() {
  game.value = newGame()
  speak(theme.value?.tts ?? '')
}

// Taps say nothing: the other kid sits right across and would hear it
function onTile(a) {
  const { phase, guess } = game.value
  if (phase === 'pick') game.value = choose(game.value, a.id)
  else if (phase === 'play') game.value = toggle(game.value, a.id)
  else if (phase === 'guess' && !guess) {
    game.value = pickGuess(game.value, a.id)
    if (guessed.value) speak(`Ist es ${guessed.value.the}?`)
  }
}

function onStart() {
  game.value = start(game.value)
  speak("Los geht's! Stell eine Frage.")
}

function onGuess() {
  game.value = game.value.phase === 'guess' ? cancelGuess(game.value) : startGuess(game.value)
}

function onAnswer(right) {
  game.value = answer(game.value, right)
  if (right) speak('Super! Erraten!')
}
</script>

<style scoped>
.layout { height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
.hint { min-height: 2.2em; padding: 4px 12px; text-align: center; font-size: 1.2rem; font-weight: bold; flex-shrink: 0; }
.main { flex: 1; min-height: 0; display: flex; gap: 12px; padding: 0 12px 12px; }
.grid-wrap { flex: 1; min-width: 0; overflow: auto; display: flex; align-items: flex-start; }
.board { display: grid; gap: 10px; margin: 0 auto; }   /* margin, not justify-content: never crops an overflowing board */

.tile {
  aspect-ratio: 1 / 1; padding: 4px; border-radius: 16px; background: white;
  border: 3px solid #e8ddd5; box-shadow: 0 4px 0 #d6c8bd;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  transition: opacity 0.2s, filter 0.2s, transform 0.1s;
}
.tile img { width: 72%; height: 72%; object-fit: contain; border-radius: 10px; }
.tile .label { font-size: 0.8rem; font-weight: bold; color: #333; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
.tile:active { transform: scale(0.95); }
.tile.off { filter: grayscale(1); opacity: 0.35; box-shadow: none; }
.tile.chosen { outline: 6px solid #4D96FF; outline-offset: 2px; }
.tile.aiming:not(.off) { border-color: #4D96FF; }
.tile.big { width: 150px; margin: 0 auto; }
.tile.big .label { font-size: 1rem; }

.side { width: 210px; flex-shrink: 0; display: flex; flex-direction: column; gap: 12px; }
.mine { background: white; border-radius: 20px; padding: 10px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.12); }
.mine-title { font-weight: bold; margin-bottom: 6px; }
.count { font-size: 1.2rem; font-weight: bold; text-align: center; }
.spacer { flex: 1; }
.side .btn { width: 100%; font-size: 1.1rem; box-shadow: 0 4px 0 rgba(0,0,0,0.2); }
.start { background: #6BCB77; color: white; font-size: 1.4rem !important; min-height: 70px; }
.undo, .new-game { background: white; color: #333; }
.undo:disabled { opacity: 0.4; }
.guess { background: #4D96FF; color: white; }
.guess.active { background: #2a6fcc; box-shadow: inset 0 3px 6px rgba(0,0,0,0.3) !important; }
.guess:disabled { opacity: 0.4; }

.overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 50;
  display: flex; align-items: center; justify-content: center;
}
.guess-dialog { background: white; border-radius: 28px; padding: 24px 32px; text-align: center; width: min(480px, 90vw); }
.question { font-size: 1.8rem; font-weight: bold; margin-bottom: 14px; }
.guess-dialog .tile.big { width: 180px; }
.ask { margin: 14px 0 10px; font-size: 1.1rem; }
.row { display: flex; gap: 14px; }
.row .btn { flex: 1; color: white; font-size: 1.2rem; min-height: 60px; box-shadow: 0 4px 0 rgba(0,0,0,0.2); }
.right { background: #6BCB77; }
.wrong { background: #FF6B6B; }
.cancel { margin-top: 14px; min-height: 44px; padding: 0 16px; color: #888; font-size: 1rem; }

.win {
  position: fixed; inset: 0; background: rgba(255,255,255,0.93);
  display: flex; align-items: center; justify-content: center; z-index: 100;
}
.win-content { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 14px; }
.win-emoji { font-size: 5rem; }
.win-text  { font-size: 1.8rem; font-weight: bold; color: #FF6B6B; }
.again { background: #FF6B6B; color: white; }
.home  { background: white; color: #333; box-shadow: 0 2px 6px rgba(0,0,0,0.15); }
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
