<template>
  <div class="layout">
    <AppHeader
      :title="`🃏 Memory — ${theme?.name ?? ''}`"
      :tts="theme?.tts ?? ''"
      color="#FFD93D"
    />

    <div v-if="players.length > 1" class="players">
      <div
        v-for="(p, i) in players"
        :key="p.emoji"
        :class="['player', { current: i === turn && !won }]"
        :style="{ '--c': p.color }"
      >
        <span class="player-emoji">{{ p.emoji }}</span>
        <span class="player-pairs">{{ p.pairs }}</span>
      </div>
    </div>

    <div class="progress-bar">
      <div
        v-for="(_, i) in totalPairs"
        :key="i"
        class="dot"
        :class="{ found: i < foundCount }"
      />
    </div>

    <div class="grid-wrap">
    <div
      v-if="theme"
      class="grid"
      :style="{ gridTemplateColumns: `repeat(${grid.cols}, ${cardSize}px)` }"
    >
      <button
        v-for="card in deck"
        :key="card.key"
        class="card"
        :class="{ flipped: flipped.has(card.key), matched: matched.has(card.id) }"
        :disabled="locked || flipped.has(card.key) || matched.has(card.id)"
        @click="onCardClick(card)"
      >
        <div class="card-inner">
          <div class="card-front">
            <img :src="`/content/memory/${themeId}/${card.image}`" :alt="card.label" />
          </div>
          <div class="card-back">⭐</div>
        </div>
      </button>
    </div>
    </div>

    <!-- Zoom toolbar -->
    <div class="zoom-bar">
      <button class="zoom-btn" @click="zoomOut" :disabled="cardSize <= MIN_CARD">−</button>
      <span class="zoom-label">{{ cardSize }}px</span>
      <button class="zoom-btn" @click="zoomIn"  :disabled="cardSize >= MAX_CARD">+</button>
    </div>

    <!-- Win overlay -->
    <Transition name="fade">
      <div v-if="won" class="win-overlay">
        <div class="win-content">
          <div class="win-emoji">🎉</div>
          <template v-if="players.length > 1">
            <div class="win-text">{{ winnerText }}</div>
            <div class="ranking">
              <span v-for="p in ranking" :key="p.emoji" class="rank">{{ p.emoji }} {{ p.pairs }}</span>
            </div>
          </template>
          <template v-else>
            <div class="win-text">Toll gemacht!</div>
            <div class="win-sub">Alle Paare gefunden!</div>
          </template>
          <button class="btn" style="background:#FF6B6B;color:white" @click="restart">Nochmal</button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useContentStore } from '../../stores/content.js'
import { speak } from '../../services/tts.js'
import { buildDeck, parseGrid, pickPairs, createPlayers, parsePlayers, winners } from '../../logic/memory.js'
import AppHeader from '../../components/AppHeader.vue'

const route   = useRoute()
const store   = useContentStore()
const themeId = computed(() => route.params.theme)
const gridStr = computed(() => route.query.grid ?? theme.value?.gridSize ?? '4x4')
const grid    = computed(() => parseGrid(gridStr.value))
const theme   = computed(() => store.currentTheme)
const capital = text => text[0].toUpperCase() + text.slice(1)

// Several players take turns on one device; a pair found means another go
const players = ref(createPlayers(parsePlayers(route.query.players)))
const turn    = ref(0)
const ranking = computed(() => [...players.value].sort((a, b) => b.pairs - a.pairs))
const winnerText = computed(() => {
  const best = winners(players.value)
  return best.length > 1 ? 'Unentschieden!' : `${best[0].emoji} gewinnt!`
})

const MIN_CARD = 48
const MAX_CARD = 160
const WIN_PAUSE_MS = 800   // after the last pair is announced, before celebrating

const deck     = ref([])
const flipped  = ref(new Set())   // card keys currently face-up (max 2)
const matched  = ref(new Set())   // card ids that have been matched
const locked   = ref(false)
const won      = ref(false)
const cardSize = ref(88)
let left = false

function fitCardSize() {
  const { cols, rows } = grid.value
  const availW = window.innerWidth  - 24 - (cols - 1) * 10
  const availH = window.innerHeight - 130 - (rows - 1) * 10  // header + progress + zoom bar
  const byW = Math.floor(availW / cols)
  const byH = Math.floor(availH / rows)
  cardSize.value = Math.max(MIN_CARD, Math.min(MAX_CARD, Math.min(byW, byH)))
}

function zoomIn()  { cardSize.value = Math.min(MAX_CARD, cardSize.value + 12) }
function zoomOut() { cardSize.value = Math.max(MIN_CARD, cardSize.value - 12) }

const totalPairs = computed(() => deck.value.length / 2)
const foundCount = computed(() => matched.value.size)

onMounted(async () => {
  await store.loadTheme('memory', themeId.value)
  restart()
})

onUnmounted(() => { left = true })

function restart() {
  const pairs = theme.value?.pairs ?? []
  const { cols, rows } = grid.value
  const count = (cols * rows) / 2
  deck.value    = buildDeck(pickPairs(pairs, count))
  players.value = createPlayers(players.value.length)
  turn.value    = 0
  flipped.value = new Set()
  matched.value = new Set()
  locked.value  = false
  won.value     = false
  fitCardSize()
  const intro = theme.value?.tts ?? ''
  speak(players.value.length > 1 ? `${intro} ${capital(players.value[0].say)} fängt an.` : intro)
}

function onCardClick(card) {
  if (locked.value) return
  const next = new Set(flipped.value)
  next.add(card.key)
  flipped.value = next

  if (next.size < 2) return  // first card — wait for second

  const [keyA, keyB] = [...next]
  const cardA = deck.value.find(c => c.key === keyA)
  const cardB = deck.value.find(c => c.key === keyB)

  if (cardA.id === cardB.id) {
    // Match
    const m = new Set(matched.value)
    m.add(cardA.id)
    matched.value = m
    flipped.value = new Set()
    const multi = players.value.length > 1
    if (multi) players.value[turn.value].pairs++
    const last = m.size === totalPairs.value
    const announced = speak(multi && !last ? `${cardA.tts}. Nochmal!` : cardA.tts)
    if (last) {
      // Let the last pair be heard, unless the game was restarted or left meanwhile
      const current = deck.value
      announced.then(() => setTimeout(() => {
        if (left || deck.value !== current) return
        won.value = true
        speak(multi ? endText() : 'Toll gemacht! Alle Paare gefunden!')
      }, WIN_PAUSE_MS))
    }
  } else {
    // No match — flip back after 1s
    locked.value = true
    setTimeout(() => {
      flipped.value = new Set()
      locked.value  = false
      if (players.value.length > 1 && !left) {
        turn.value = (turn.value + 1) % players.value.length
        speak(`Jetzt ist ${players.value[turn.value].say} dran.`)
      }
    }, 1000)
  }
}

function endText() {
  const best = winners(players.value)
  if (best.length > 1) return 'Unentschieden! Toll gespielt!'
  const n = best[0].pairs
  return `${capital(best[0].say)} gewinnt mit ${n} ${n === 1 ? 'Paar' : 'Paaren'}!`
}
</script>

<style scoped>
.layout { height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
.players { display: flex; justify-content: center; gap: 10px; padding: 8px 12px 0; flex-shrink: 0; }
.player {
  display: flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 20px;
  background: white; border: 3px solid #eee; font-weight: bold; transition: transform 0.2s;
}
.player.current { border-color: var(--c); transform: scale(1.15); box-shadow: 0 0 10px var(--c); }
.player-emoji { font-size: 1.6rem; }
.player-pairs { font-size: 1.2rem; min-width: 1.2em; text-align: center; color: #333; }
.ranking { display: flex; justify-content: center; gap: 14px; margin: 6px 0 16px; font-size: 1.5rem; }
.progress-bar { display: flex; justify-content: center; gap: 6px; padding: 10px; flex-wrap: wrap; flex-shrink: 0; }
.dot { width: 16px; height: 16px; border-radius: 50%; background: #ddd; transition: background 0.3s; }
.dot.found { background: #6BCB77; }
.grid-wrap { flex: 1; min-height: 0; overflow: auto; display: flex; justify-content: center; align-items: flex-start; padding: 8px 12px; }
.grid { display: grid; gap: 10px; }
.zoom-bar {
  display: flex; align-items: center; justify-content: center; gap: 14px;
  padding: 8px 12px; flex-shrink: 0; background: white; border-top: 2px solid #FFD93D;
}
.zoom-btn {
  width: 38px; height: 38px; border-radius: 50%; border: 2px solid #FFD93D;
  background: #fff9f0; font-size: 1.4rem; font-weight: bold; line-height: 1;
  cursor: pointer; color: #333;
}
.zoom-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.zoom-label { font-size: 0.78rem; color: #aaa; min-width: 44px; text-align: center; }

/* Flip card */
.card { perspective: 600px; background: none; border: none; padding: 0; }
.card-inner {
  width: 100%; aspect-ratio: 1 / 1;
  position: relative; transform-style: preserve-3d;
  transition: transform 0.4s;
}
.card.flipped .card-inner,
.card.matched .card-inner { transform: rotateY(180deg); }
.card-front, .card-back {
  position: absolute; inset: 0; border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
  backface-visibility: hidden; -webkit-backface-visibility: hidden;
}
.card-back  { background: #4D96FF; box-shadow: 0 4px 0 #2a6fcc; font-size: 1.8rem; }
.card-front { background: white; border: 3px solid #FF6B6B; box-shadow: 0 4px 0 #e0e0e0; transform: rotateY(180deg); }
.card.flipped .card-back,
.card.matched .card-back  { visibility: hidden; }
.card-front img { width: 80%; height: 80%; object-fit: contain; }
.card.matched .card-front { background: #6BCB77; border-color: #4aaf59; opacity: 0.75; }

/* Win overlay */
.win-overlay {
  position: fixed; inset: 0; background: rgba(255,255,255,0.93);
  display: flex; align-items: center; justify-content: center; z-index: 100;
}
.win-content { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 14px; }
.win-emoji { font-size: 5rem; }
.win-text  { font-size: 1.8rem; font-weight: bold; color: #FF6B6B; }
.win-sub   { font-size: 1rem; color: #888; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
