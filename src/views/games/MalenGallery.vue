<template>
  <div class="layout">
    <AppHeader title="🖌️ Malen" :tts="TTS" color="#26A69A" />

    <p class="prompt">Ein neues Bild malen oder weitermalen?</p>
    <div class="grid">
      <button class="new-card" @click="router.push('/malen/draw')">
        <span class="plus">➕</span>
        <span>Neues Bild</span>
      </button>
      <div v-for="p in paintings" :key="p.id" class="painting">
        <img :src="p.thumb" alt="Bild" @click="router.push(`/malen/draw/${p.id}`)" />
        <button class="delete" aria-label="Bild löschen" @click="remove(p)">🗑</button>
      </div>
    </div>
    <p v-if="loaded && !paintings.length" class="empty">Noch keine Bilder. Tippe auf ➕ und mal los!</p>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { speak } from '../../services/tts.js'
import { listPaintings, deletePainting } from '../../services/paintings.js'
import AppHeader from '../../components/AppHeader.vue'

const router = useRouter()

const TTS       = 'Malen! Mach ein neues Bild, oder tippe auf ein Bild und mal weiter.'
const paintings = ref([])
const loaded    = ref(false)

onMounted(async () => {
  speak(TTS)
  paintings.value = await listPaintings()
  loaded.value    = true
})

async function remove(p) {
  if (!confirm('Dieses Bild löschen?')) return
  await deletePainting(p.id)
  paintings.value = paintings.value.filter(x => x.id !== p.id)
}
</script>

<style scoped>
.layout { min-height: 100vh; display: flex; flex-direction: column; background: #f3fbfa; }
.prompt { text-align: center; padding: 14px 16px 6px; font-size: 0.95rem; color: #666; }
.empty { text-align: center; color: #999; padding: 8px 16px; }
.grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 14px;
  padding: 10px 16px 24px;
}
.new-card, .painting { aspect-ratio: 4 / 3; border-radius: 16px; overflow: hidden; position: relative; }
.new-card {
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px;
  font-size: 1.1rem; font-weight: bold; color: #26A69A;
  background: white; border: 3px dashed #26A69A;
}
.plus { font-size: 2.6rem; }
.painting { background: white; border: 3px solid #cfe9e6; box-shadow: 0 3px 0 #b8dcd8; }
.painting img { width: 100%; height: 100%; object-fit: cover; display: block; cursor: pointer; }
.delete {
  position: absolute; top: 6px; right: 6px; width: 38px; height: 38px; border-radius: 50%;
  font-size: 1.1rem; background: rgba(255, 255, 255, 0.9); border: 1px solid #ddd;
}
</style>
