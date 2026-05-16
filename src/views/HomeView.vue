<template>
  <div class="home-layout">
    <AppHeader
      title="🎮 Spielesammlung"
      :tts="tts"
      color="#FF6B6B"
      :show-back="false"
    />
    <p class="prompt">Was möchtest du spielen?</p>
    <div class="grid">
      <GameCard
        v-for="game in store.games"
        :key="game.id"
        :game="game"
        @select="onSelect"
      />
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useContentStore } from '../stores/content.js'
import { speak } from '../services/tts.js'
import AppHeader from '../components/AppHeader.vue'
import GameCard from '../components/GameCard.vue'

const store  = useContentStore()
const router = useRouter()
const tts    = 'Willkommen! Was möchtest du spielen?'

onMounted(async () => {
  await store.loadGames()
  speak(tts)
})

function onSelect(game) {
  router.push(`/${game.id}`)
}
</script>

<style scoped>
.home-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.prompt {
  text-align: center;
  padding: 18px 16px 8px;
  font-size: 1rem;
  color: #666;
}
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  padding: 8px 16px 20px;
}
</style>
