<template>
  <div class="layout">
    <AppHeader title="✏️ Schreiben" :tts="TTS" color="#E67E22" />

    <p class="prompt">Welchen Namen möchtest du schreiben?</p>
    <div class="names">
      <button v-for="n in names" :key="n" class="name-card" @click="open('name', n)">{{ n }}</button>
    </div>

    <p class="prompt">Oder einen Buchstaben üben</p>
    <div class="letters">
      <button v-for="l in LETTERS" :key="l" class="letter-btn" @click="open('letter', l)">{{ l }}</button>
    </div>

    <p class="prompt">Oder eine Zahl</p>
    <div class="letters digits">
      <button v-for="d in DIGITS" :key="d" class="digit-btn" @click="open('letter', d)">{{ d }}</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { speak } from '../../services/tts.js'
import { LETTERS, DIGITS } from '../../logic/letters.js'
import AppHeader from '../../components/AppHeader.vue'

const route  = useRoute()
const router = useRouter()

const TTS     = 'Schreiben! Wähle einen Namen, einen Buchstaben oder eine Zahl.'
const names   = ref([])

onMounted(async () => {
  speak(TTS)
  const res  = await fetch('/content/schreiben/names.json')
  names.value = (await res.json()).names
})

// Keeps ?debug on the way into the game
function open(kind, value) {
  router.push({ path: `/schreiben/${kind}/${value}`, query: route.query })
}
</script>

<style scoped>
.layout { min-height: 100vh; display: flex; flex-direction: column; background: #FFF8EE; }
.prompt { text-align: center; padding: 14px 16px 6px; font-size: 0.95rem; color: #666; }
.names, .letters { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; padding: 8px 16px; }
.letters { max-width: 620px; margin: 0 auto; }   /* 7 per row: two even rows of 14 */
.digits { max-width: 450px; }                       /* 5 per row */
.name-card {
  min-width: 140px; padding: 18px 20px; font-size: 1.8rem; font-weight: bold; letter-spacing: 0.08em;
  color: #333; background: white; border: 3px solid #E67E22; border-radius: 20px; box-shadow: 0 4px 0 #b35f12;
}
.letter-btn, .digit-btn {
  width: 72px; height: 72px; font-size: 2rem; font-weight: bold; color: #E67E22;
  background: white; border: 3px solid #f0c9a4; border-radius: 16px; box-shadow: 0 3px 0 #e0b48a;
}
.name-card:active, .letter-btn:active, .digit-btn:active { transform: translateY(2px); box-shadow: none; }
</style>
