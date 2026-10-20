<template>
  <div class="layout">
    <AppHeader title="⚙️ Wörter für Schreiben" color="#E67E22" />

    <form class="add" @submit.prevent="add">
      <input
        v-model="draft"
        class="new-word"
        placeholder="Neues Wort"
        autocapitalize="characters"
        autocomplete="off"
        spellcheck="false"
        :maxlength="MAX_LENGTH + 4"
      />
      <button class="btn add-btn" type="submit">Hinzufügen</button>
    </form>
    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="!kept" class="note">Dieses Gerät speichert nichts: Die Änderungen gelten nur, bis die Seite neu geladen wird.</p>

    <ul class="words">
      <li v-for="w in words" :key="w.word" class="word-row">
        <label class="switch">
          <input v-model="w.on" type="checkbox" class="toggle" @change="save" />
          <span class="word" :class="{ off: !w.on }">{{ w.word }}</span>
        </label>
        <button class="delete" :aria-label="`${w.word} löschen`" @click="remove(w)">🗑</button>
      </li>
    </ul>
    <p class="hint">Nur eingeschaltete Wörter erscheinen im Spiel, und ihre Buchstaben zum Üben.</p>

    <button class="btn done" @click="router.push({ path: '/schreiben/play', query: route.query })">Fertig</button>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { loadWords, saveWords, normalizeWord, checkWord, MAX_LENGTH } from '../../services/wordList.js'
import AppHeader from '../../components/AppHeader.vue'

const route  = useRoute()
const router = useRouter()

const ERRORS = {
  'empty':    'Bitte ein Wort eingeben.',
  'letters':  'Nur Buchstaben A–Z, Ä, Ö und Ü, ohne Leerzeichen oder Bindestrich.',
  'too-long': `Höchstens ${MAX_LENGTH} Buchstaben.`,
  'exists':   'Dieses Wort ist schon in der Liste.',
}

const words = ref([])
const draft = ref('')
const error = ref('')
const kept  = ref(true)

onMounted(async () => {
  const list = await loadWords()
  words.value = list.words
  kept.value  = list.kept
})

function save() {
  kept.value = saveWords(words.value) && kept.value
}

function add() {
  const word    = normalizeWord(draft.value)
  const problem = checkWord(word, words.value)
  error.value = problem ? ERRORS[problem] : ''
  if (problem) return
  words.value = [{ word, on: true }, ...words.value]
  draft.value = ''
  save()
}

function remove(w) {
  if (!confirm(`${w.word} löschen?`)) return
  words.value = words.value.filter(x => x !== w)
  save()
}
</script>

<style scoped>
.layout { min-height: 100vh; display: flex; flex-direction: column; background: #FFF8EE; }
.add { display: flex; gap: 10px; padding: 16px 16px 6px; justify-content: center; }
.new-word {
  flex: 1; max-width: 320px; padding: 10px 14px; font-size: 1.3rem; text-transform: uppercase;
  border: 2px solid #f0c9a4; border-radius: 12px; background: white;
}
.add-btn { background: #E67E22; color: white; }
.error { text-align: center; color: #c0392b; font-size: 0.9rem; padding: 2px 16px; }
.note, .hint { text-align: center; color: #999; font-size: 0.85rem; padding: 4px 16px; }
.words { list-style: none; margin: 8px auto; padding: 0 16px; width: 100%; max-width: 480px; }
.word-row {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 10px 14px; margin-bottom: 8px; background: white; border-radius: 14px; border: 2px solid #f3e3d0;
}
.switch { display: flex; align-items: center; gap: 14px; flex: 1; cursor: pointer; }
.toggle { width: 26px; height: 26px; accent-color: #E67E22; }
.word { font-size: 1.4rem; font-weight: bold; letter-spacing: 0.06em; color: #333; }
.word.off { color: #bbb; text-decoration: line-through; }
.delete { font-size: 1.3rem; background: none; border: none; padding: 6px; }
.done { align-self: center; margin: 12px 0 24px; background: #eee; color: #333; }
</style>
