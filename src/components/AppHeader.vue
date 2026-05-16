<template>
  <header class="app-header" :style="{ background: color }">
    <button v-if="showBack" class="icon-btn" @click="router.back()">←</button>
    <div class="title">{{ title }}</div>
    <button class="icon-btn" @click="onSpeak" aria-label="Vorlesen">🔊</button>
  </header>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { speak } from '../services/tts.js'

const props = defineProps({
  title:    { type: String, required: true },
  tts:      { type: String, default: '' },
  color:    { type: String, default: '#FF6B6B' },
  showBack: { type: Boolean, default: true },
})

const router = useRouter()
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
