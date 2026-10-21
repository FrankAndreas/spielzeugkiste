<template>
  <header class="app-header" :style="{ background: color }">
    <button v-if="showBack" class="icon-btn" aria-label="Zurück" @click="up">←</button>
    <div class="title">{{ title }}</div>
    <button class="icon-btn" @click="onSpeak" aria-label="Vorlesen">🔊</button>
  </header>
</template>

<script setup>
import { useRoute, useRouter } from 'vue-router'
import { speak } from '../services/tts.js'
import { upPath } from '../navigation.js'

const props = defineProps({
  title:    { type: String, required: true },
  tts:      { type: String, default: '' },
  color:    { type: String, default: '#FF6B6B' },
  showBack: { type: Boolean, default: true },
})

const route  = useRoute()
const router = useRouter()

// One level up; ?debug stays on while within a game
function up() {
  const path = upPath(route.path)
  router.push({ path, query: path === '/' ? {} : route.query })
}
function onSpeak() { speak(props.tts || props.title) }
</script>

<style scoped>
.app-header {
  padding: 10px 14px;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}
.title {
  flex: 1;
  font-size: 1.1rem;
  font-weight: bold;
  color: white;
}
</style>
