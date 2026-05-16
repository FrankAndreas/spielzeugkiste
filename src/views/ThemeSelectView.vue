<template>
  <div class="layout" v-if="game">
    <AppHeader
      :title="`${game.emoji} ${game.name}`"
      :tts="game.tts"
      :color="game.color"
    />

    <p class="prompt">Welches Thema möchtest du spielen?</p>

    <div class="theme-grid">
      <button
        v-for="theme in game.themes"
        :key="theme"
        class="theme-btn"
        :style="{ '--c': game.color, '--s': game.shadow }"
        @click="onThemeSelect(theme)"
      >
        {{ theme }}
      </button>
    </div>

    <!-- Memory-only: difficulty selector -->
    <div v-if="gameId === 'memory'" class="difficulty">
      <p class="diff-label">Schwierigkeit</p>
      <div class="diff-row">
        <button
          v-for="opt in difficultyOptions"
          :key="opt.value"
          :class="['diff-btn', { active: difficulty === opt.value }]"
          @click="difficulty = opt.value"
        >
          {{ opt.label }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useContentStore } from '../stores/content.js'
import { speak } from '../services/tts.js'
import AppHeader from '../components/AppHeader.vue'

const route  = useRoute()
const router = useRouter()
const store  = useContentStore()

const gameId   = computed(() => route.params.game)
const game     = computed(() => store.findGame(gameId.value))
const difficulty = ref('4x4')

const difficultyOptions = [
  { label: 'Leicht (3×4)', value: '3x4' },
  { label: 'Mittel (4×4)', value: '4x4' },
  { label: 'Schwer (4×6)', value: '4x6' },
]

onMounted(async () => {
  if (!store.games.length) await store.loadGames()
  if (game.value) speak(game.value.tts)
})

function onThemeSelect(theme) {
  const query = gameId.value === 'memory' ? { grid: difficulty.value } : {}
  router.push({ path: `/${gameId.value}/${theme}/play`, query })
}
</script>

<style scoped>
.layout { min-height: 100vh; display: flex; flex-direction: column; }
.prompt { text-align: center; padding: 14px 16px 6px; font-size: 0.95rem; color: #666; }
.theme-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  padding: 8px 14px;
}
.theme-btn {
  background: white;
  border-radius: 16px;
  padding: 14px 8px;
  font-size: 0.85rem;
  font-weight: bold;
  color: #333;
  box-shadow: 0 3px 0 var(--s);
  border: 2px solid var(--c);
  text-transform: capitalize;
}
.theme-btn:active { transform: translateY(2px); box-shadow: 0 1px 0 var(--s); }
.difficulty { padding: 12px 14px; }
.diff-label { font-size: 0.8rem; color: #888; text-align: center; margin-bottom: 8px; }
.diff-row { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }
.diff-btn {
  background: white;
  border-radius: 20px;
  padding: 8px 16px;
  font-size: 0.82rem;
  font-weight: bold;
  color: #888;
  border: 2px solid #ddd;
}
.diff-btn.active { background: #FF6B6B; color: white; border-color: #FF6B6B; }
</style>
