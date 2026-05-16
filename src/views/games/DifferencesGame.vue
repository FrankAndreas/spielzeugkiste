<template>
  <div class="layout">
    <AppHeader
      :title="`🔍 ${theme?.name ?? ''}`"
      :tts="theme?.tts ?? ''"
      color="#6BCB77"
    />

    <div class="score-bar" v-if="theme">
      <div class="dots">
        <div
          v-for="h in theme.hotspots"
          :key="h.id"
          class="dot"
          :class="{ found: found.has(h.id) }"
        />
      </div>
      <span class="score-text">{{ found.size }} / {{ theme.hotspots.length }}</span>
      <button class="icon-btn hint-btn" @click="showHint" :disabled="found.size === theme.hotspots.length">
        💡
      </button>
    </div>

    <div class="images-row" v-if="theme">
      <!-- Original (left) — display only, no tap -->
      <div class="img-wrap">
        <span class="img-label">Original</span>
        <img
          :src="`/content/differences/${themeId}/${theme.original}`"
          :alt="theme.name"
          class="scene-img"
        />
      </div>

      <!-- Modified (right) — tappable -->
      <div class="img-wrap tappable" ref="modifiedWrap" @click="onTap">
        <span class="img-label">Suchbild</span>
        <img
          :src="`/content/differences/${themeId}/${theme.modified}`"
          :alt="theme.name"
          class="scene-img"
        />
        <!-- Found markers -->
        <div
          v-for="h in theme.hotspots"
          v-show="found.has(h.id) || hintId === h.id"
          :key="h.id"
          class="marker"
          :class="{ hint: hintId === h.id && !found.has(h.id) }"
          :style="markerStyle(h)"
        />
      </div>
    </div>

    <!-- Win overlay -->
    <Transition name="fade">
      <div v-if="won" class="win-overlay">
        <div class="win-content">
          <div class="win-emoji">🎉</div>
          <div class="win-text">Super!</div>
          <div class="win-sub">Alle Unterschiede gefunden!</div>
          <button class="btn" style="background:#6BCB77;color:white" @click="restart">Nochmal</button>
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
import { edgeScale, hitTest } from '../../logic/differences.js'
import AppHeader from '../../components/AppHeader.vue'

const route        = useRoute()
const store        = useContentStore()
const themeId      = computed(() => route.params.theme)
const theme        = computed(() => store.currentTheme)
const modifiedWrap = ref(null)

const found  = ref(new Set())
const hintId = ref(null)
const won    = ref(false)
let hintTimer = null

onMounted(async () => {
  await store.loadTheme('differences', themeId.value)
  restart()
})

onUnmounted(() => clearTimeout(hintTimer))

function restart() {
  found.value  = new Set()
  hintId.value = null
  won.value    = false
  speak(theme.value?.tts ?? '')
}

function onTap(e) {
  if (!modifiedWrap.value || !theme.value) return
  const rect = modifiedWrap.value.getBoundingClientRect()
  const tapX  = (e.clientX - rect.left)  / rect.width
  const tapY  = (e.clientY - rect.top)   / rect.height

  for (const h of theme.value.hotspots) {
    if (found.value.has(h.id)) continue
    if (hitTest(tapX, tapY, h, rect)) {
      const next = new Set(found.value)
      next.add(h.id)
      found.value = next
      speak(h.label ?? `Unterschied ${h.id}`)
      if (next.size === theme.value.hotspots.length) {
        setTimeout(() => { won.value = true; speak('Super! Alle Unterschiede gefunden!') }, 500)
      }
      return
    }
  }
  // Wrong tap — brief shake animation on the right image wrapper
  modifiedWrap.value.classList.add('shake')
  setTimeout(() => modifiedWrap.value?.classList.remove('shake'), 400)
}

function showHint() {
  if (!theme.value) return
  const remaining = theme.value.hotspots.filter(h => !found.value.has(h.id))
  if (!remaining.length) return
  hintId.value = remaining[0].id
  clearTimeout(hintTimer)
  hintTimer = setTimeout(() => { hintId.value = null }, 2000)
  speak('Schau mal dort!')
}

function markerStyle(h) {
  const scale = edgeScale(h.x, h.y)
  const r     = h.r * scale
  return {
    left:   `${h.x * 100}%`,
    top:    `${h.y * 100}%`,
    width:  `${r * 2}px`,
    height: `${r * 2}px`,
  }
}
</script>

<style scoped>
.layout { min-height: 100vh; display: flex; flex-direction: column; }

.score-bar {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 12px; flex-shrink: 0;
}
.dots { display: flex; gap: 5px; flex: 1; flex-wrap: wrap; }
.dot { width: 18px; height: 18px; border-radius: 50%; background: #ddd; transition: background 0.3s; }
.dot.found { background: #6BCB77; }
.score-text { font-size: 0.9rem; font-weight: bold; color: #6BCB77; white-space: nowrap; }
.hint-btn { font-size: 1.2rem; }

.images-row {
  display: flex; gap: 6px; padding: 6px;
  flex: 1; min-height: 0;
}
.img-wrap {
  flex: 1; position: relative; border-radius: 12px;
  overflow: hidden; border: 3px solid #FFD93D;
}
.img-wrap.tappable { cursor: crosshair; }
.img-label {
  position: absolute; top: 6px; left: 6px; z-index: 1;
  background: rgba(0,0,0,0.4); color: white;
  font-size: 0.7rem; font-weight: bold;
  border-radius: 8px; padding: 2px 8px;
  pointer-events: none;
}
.scene-img { width: 100%; height: 100%; object-fit: cover; display: block; }

.marker {
  position: absolute;
  border-radius: 50%;
  border: 3px solid #FF6B6B;
  background: rgba(255, 107, 107, 0.25);
  transform: translate(-50%, -50%);
  pointer-events: none;
  transition: transform 0.3s cubic-bezier(.34, 1.56, .64, 1);
}
.marker.hint {
  border-color: #FFD93D;
  background: rgba(255, 217, 61, 0.35);
  animation: pulse 0.7s ease-in-out 3;
}

@keyframes pulse {
  0%, 100% { transform: translate(-50%, -50%) scale(1); }
  50%       { transform: translate(-50%, -50%) scale(1.3); }
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25%      { transform: translateX(-8px); }
  75%      { transform: translateX(8px); }
}
.shake { animation: shake 0.4s ease; }

.win-overlay {
  position: fixed; inset: 0; background: rgba(255, 255, 255, 0.93);
  display: flex; align-items: center; justify-content: center; z-index: 100;
}
.win-content { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 14px; }
.win-emoji { font-size: 5rem; }
.win-text  { font-size: 1.8rem; font-weight: bold; color: #6BCB77; }
.win-sub   { font-size: 1rem; color: #888; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to       { opacity: 0; }
</style>
