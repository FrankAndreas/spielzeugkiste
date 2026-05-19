<template>
  <div class="layout">
    <AppHeader
      :title="`🎨 ${theme?.name ?? ''}`"
      :tts="theme?.tts ?? ''"
      color="#4D96FF"
    />

    <!-- Page selector strip -->
    <div class="page-strip" v-if="theme">
      <button
        v-for="page in theme.pages"
        :key="page.id"
        class="page-thumb"
        :class="{ active: currentPage?.id === page.id }"
        @click="selectPage(page)"
      >
        {{ page.label }}
      </button>
    </div>

    <!-- SVG canvas -->
    <div class="canvas-area" ref="canvasEl" @wheel.prevent="onWheel">
      <div
        class="svg-wrapper"
        ref="wrapperEl"
        :style="{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }"
        v-html="svgContent"
        @click="onSvgClick"
      />
      <div class="zoom-badge" :class="{ visible: showBadge }">{{ Math.round(zoom * 100) }}%</div>
    </div>

    <!-- Palette (always visible at bottom) -->
    <div class="palette">
      <div class="palette-hint">Farbe wählen — tippe dann auf das Bild &nbsp;|&nbsp; 🤏 Zwei Finger zum Zoomen</div>
      <div class="swatches">
        <button
          v-for="col in COLORS"
          :key="col"
          class="swatch"
          :class="{ selected: selectedColor === col }"
          :style="{ background: col, border: col === '#f5f0e8' ? '2px solid #ccc' : 'none' }"
          @click="selectedColor = col"
        />
      </div>
      <div class="toolbar">
        <button class="tool-btn" @click="undo" :disabled="!colorHistory.length">↩ Rückgängig</button>
        <button class="tool-btn" @click="clearColors">🗑 Löschen</button>
        <button class="tool-btn" @click="resetZoom">🔍 Zoom zurück</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { useContentStore } from '../../stores/content.js'
import { speak } from '../../services/tts.js'
import AppHeader from '../../components/AppHeader.vue'

const COLORS = ['#FFD93D','#FF9A3C','#FF6B6B','#6BCB77','#4D96FF','#C77DFF','#FF6FC8','#795548','#607D8B','#f5f0e8']
const BLANK   = '#f5f0e8'
const MIN_ZOOM = 1, MAX_ZOOM = 5

const route   = useRoute()
const store   = useContentStore()
const themeId = computed(() => route.params.theme)
const theme   = computed(() => store.currentTheme)

const canvasEl    = ref(null)
const wrapperEl   = ref(null)
const svgContent  = ref('')
const currentPage = ref(null)
const selectedColor = ref('#FFD93D')
const colorHistory  = ref([])  // [{ el, prev }]
const zoom    = ref(1)
const pan     = ref({ x: 0, y: 0 })
const showBadge = ref(false)
let badgeTimer = null

// Touch pinch state
let lastTouchDist = null
let lastTouchMid  = null

onMounted(async () => {
  await store.loadTheme('coloring', themeId.value)
  if (theme.value?.pages?.length) selectPage(theme.value.pages[0])
  speak(theme.value?.tts ?? '')
})

onUnmounted(() => {
  canvasEl.value?.removeEventListener('touchstart', onTouchStart)
  canvasEl.value?.removeEventListener('touchmove', onTouchMove)
  canvasEl.value?.removeEventListener('touchend', onTouchEnd)
})

async function selectPage(page) {
  currentPage.value = page
  colorHistory.value = []
  const res = await fetch(`/content/coloring/${themeId.value}/${page.svg}`)
  svgContent.value = await res.text()
  await nextTick()
  setupTouchListeners()
  speak(page.tts)
}

function setupTouchListeners() {
  const el = canvasEl.value
  if (!el) return
  el.addEventListener('touchstart', onTouchStart, { passive: false })
  el.addEventListener('touchmove',  onTouchMove,  { passive: false })
  el.addEventListener('touchend',   onTouchEnd,   { passive: false })
}

// Tap to fill a region
function onSvgClick(e) {
  const target = e.target
  if (!target.dataset?.region) return
  colorHistory.value.push({ el: target, prev: target.getAttribute('fill') })
  target.setAttribute('fill', selectedColor.value)
}

function undo() {
  const last = colorHistory.value.pop()
  if (last) last.el.setAttribute('fill', last.prev)
}

function clearColors() {
  colorHistory.value = []
  wrapperEl.value?.querySelectorAll('[data-region]').forEach(el => el.setAttribute('fill', BLANK))
}

// Zoom
function flashBadge() {
  showBadge.value = true
  clearTimeout(badgeTimer)
  badgeTimer = setTimeout(() => { showBadge.value = false }, 1200)
}

function clampPan() {
  const maxPan = (zoom.value - 1) * (canvasEl.value?.clientWidth ?? 300) / 2
  pan.value.x = Math.max(-maxPan, Math.min(maxPan, pan.value.x))
  pan.value.y = Math.max(-maxPan, Math.min(maxPan, pan.value.y))
}

function onWheel(e) {
  zoom.value = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom.value * (e.deltaY < 0 ? 1.12 : 0.89)))
  if (zoom.value === MIN_ZOOM) { pan.value = { x: 0, y: 0 } }
  clampPan(); flashBadge()
}

function resetZoom() {
  zoom.value = 1; pan.value = { x: 0, y: 0 }; flashBadge()
}

function touchDist(t)  { return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY) }
function touchMid(t)   { return { x: (t[0].clientX + t[1].clientX)/2, y: (t[0].clientY + t[1].clientY)/2 } }

function onTouchStart(e) {
  if (e.touches.length === 2) {
    e.preventDefault()
    lastTouchDist = touchDist(e.touches)
    lastTouchMid  = touchMid(e.touches)
  }
}
function onTouchMove(e) {
  if (e.touches.length !== 2) return
  e.preventDefault()
  const dist = touchDist(e.touches)
  const mid  = touchMid(e.touches)
  zoom.value = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom.value * dist / lastTouchDist))
  pan.value  = { x: pan.value.x + mid.x - lastTouchMid.x, y: pan.value.y + mid.y - lastTouchMid.y }
  clampPan(); flashBadge()
  lastTouchDist = dist; lastTouchMid = mid
}
function onTouchEnd() { lastTouchDist = null }
</script>

<style scoped>
.layout { height: 100vh; display: flex; flex-direction: column; overflow: hidden; }

.page-strip {
  display: flex; gap: 8px; padding: 7px 12px;
  overflow-x: auto; background: #e3f0ff; flex-shrink: 0;
}
.page-thumb {
  border-radius: 10px; border: 3px solid transparent;
  background: white; cursor: pointer; padding: 5px 12px;
  font-size: 0.82rem; font-weight: bold; color: #333; white-space: nowrap; flex-shrink: 0;
}
.page-thumb.active { border-color: #4D96FF; }

.canvas-area {
  flex: 1; min-height: 0; position: relative; overflow: hidden;
  background: #fff9f0; display: flex; align-items: center; justify-content: center;
}
.svg-wrapper {
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
  transform-origin: center center; will-change: transform;
}
.svg-wrapper :deep(svg) { width: auto; height: auto; max-width: 100%; max-height: 100%; display: block; }
.svg-wrapper :deep([data-region]) { cursor: pointer; }

.zoom-badge {
  position: absolute; bottom: 8px; left: 50%; transform: translateX(-50%);
  background: rgba(0,0,0,0.35); color: white; font-size: 0.72rem; font-weight: bold;
  border-radius: 12px; padding: 3px 10px; pointer-events: none;
  opacity: 0; transition: opacity 0.3s;
}
.zoom-badge.visible { opacity: 1; }

.palette {
  background: white; border-top: 3px solid #FFD93D;
  padding: 8px 12px 12px; flex-shrink: 0;
}
.palette-hint { font-size: 0.7rem; color: #bbb; text-align: center; margin-bottom: 8px; }
.swatches { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }
.swatch {
  width: 36px; height: 36px; border-radius: 50%;
  cursor: pointer; border: 3px solid transparent !important;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  transition: transform 0.15s, border-color 0.15s;
}
.swatch.selected { border-color: #333 !important; transform: scale(1.22); }
.toolbar { display: flex; justify-content: center; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
.tool-btn {
  background: #f0f4ff; border: 2px solid #c5d5ff;
  border-radius: 20px; padding: 6px 16px; font-size: 0.82rem;
  cursor: pointer; font-weight: 600; color: #4D96FF;
}
.tool-btn:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
