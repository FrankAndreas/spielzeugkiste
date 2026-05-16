<template>
  <div class="layout">
    <AppHeader
      :title="`🃏 Memory — ${theme?.name ?? ''}`"
      :tts="theme?.tts ?? ''"
      color="#FFD93D"
    />

    <div class="progress-bar">
      <div
        v-for="(_, i) in totalPairs"
        :key="i"
        class="dot"
        :class="{ found: i < foundCount }"
      />
    </div>

    <div
      v-if="theme"
      class="grid"
      :style="{ gridTemplateColumns: `repeat(${grid.cols}, 1fr)` }"
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

    <!-- Win overlay -->
    <Transition name="fade">
      <div v-if="won" class="win-overlay">
        <div class="win-content">
          <div class="win-emoji">🎉</div>
          <div class="win-text">Toll gemacht!</div>
          <div class="win-sub">Alle Paare gefunden!</div>
          <button class="btn" style="background:#FF6B6B;color:white" @click="restart">Nochmal</button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useContentStore } from '../../stores/content.js'
import { speak } from '../../services/tts.js'
import { buildDeck, parseGrid } from '../../logic/memory.js'
import AppHeader from '../../components/AppHeader.vue'

const route   = useRoute()
const store   = useContentStore()
const themeId = computed(() => route.params.theme)
const gridStr = computed(() => route.query.grid ?? theme.value?.gridSize ?? '4x4')
const grid    = computed(() => parseGrid(gridStr.value))
const theme   = computed(() => store.currentTheme)

const deck     = ref([])
const flipped  = ref(new Set())   // card keys currently face-up (max 2)
const matched  = ref(new Set())   // card ids that have been matched
const locked   = ref(false)
const won      = ref(false)

const totalPairs = computed(() => deck.value.length / 2)
const foundCount = computed(() => matched.value.size)

onMounted(async () => {
  await store.loadTheme('memory', themeId.value)
  restart()
})

function restart() {
  const pairs = theme.value?.pairs ?? []
  // For the selected grid, use only as many pairs as fit
  const { cols, rows } = grid.value
  const count = (cols * rows) / 2
  deck.value    = buildDeck(pairs.slice(0, count))
  flipped.value = new Set()
  matched.value = new Set()
  locked.value  = false
  won.value     = false
  speak(theme.value?.tts ?? '')
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
    speak(cardA.tts)
    if (m.size === totalPairs.value) {
      setTimeout(() => {
        won.value = true
        speak('Toll gemacht! Alle Paare gefunden!')
      }, 500)
    }
  } else {
    // No match — flip back after 1s
    locked.value = true
    setTimeout(() => {
      flipped.value = new Set()
      locked.value  = false
    }, 1000)
  }
}
</script>

<style scoped>
.layout { min-height: 100vh; display: flex; flex-direction: column; }
.progress-bar { display: flex; justify-content: center; gap: 6px; padding: 10px; flex-wrap: wrap; }
.dot { width: 16px; height: 16px; border-radius: 50%; background: #ddd; transition: background 0.3s; }
.dot.found { background: #6BCB77; }
.grid { display: grid; gap: 10px; padding: 12px; flex: 1; }

/* Flip card */
.card { perspective: 600px; background: none; border: none; padding: 0; }
.card-inner {
  width: 100%; aspect-ratio: 1;
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
