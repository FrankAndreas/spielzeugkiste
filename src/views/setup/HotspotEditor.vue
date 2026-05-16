<template>
  <div class="layout">
    <div class="header">
      <div>
        <div class="title">🔧 Hotspot Editor</div>
        <div class="sub">Nur für Eltern / Entwickler — nicht im Kindermodus sichtbar</div>
      </div>
      <div class="spacer"></div>
      <div class="badge">{{ currentFile || 'kein Bild geladen' }}</div>
    </div>

    <div class="body">

      <!-- Tool strip -->
      <div class="tool-strip">
        <button
          v-for="m in modeList"
          :key="m.id"
          class="tool-btn"
          :class="[m.id, { active: mode === m.id }]"
          @click="setMode(m.id)"
          :title="m.label"
        >
          {{ m.icon }}
          <div class="tip">{{ m.label }} <span class="kbd">{{ m.key }}</span></div>
        </button>
        <div class="sep"></div>
        <button class="tool-btn" :disabled="!hist?.canUndo()" @click="doUndo" title="Rückgängig">
          ↩<div class="tip">Rückgängig <span class="kbd">Ctrl Z</span></div>
        </button>
        <button class="tool-btn" :disabled="!hist?.canRedo()" @click="doRedo" title="Wiederholen">
          ↪<div class="tip">Wiederholen <span class="kbd">Ctrl Y</span></div>
        </button>
        <div class="sep"></div>
        <button class="tool-btn" @click="deleteSelected" :disabled="selectedIdx === null" title="Löschen">
          🗑<div class="tip">Löschen <span class="kbd">Del</span></div>
        </button>
        <button class="tool-btn" @click="clearAll" title="Alle löschen">
          ✕<div class="tip">Alle löschen</div>
        </button>
      </div>

      <!-- Image panel -->
      <div class="img-panel">
        <div class="img-toolbar">
          <input type="file" accept="image/*" @change="onFileLoad" ref="fileInput" style="display:none"/>
          <button class="btn" @click="$refs.fileInput.click()">📂 Bild laden</button>
          <div class="mode-pill" :class="mode">{{ currentMode.label }}</div>
        </div>

        <div
          class="img-area"
          ref="imgAreaEl"
          :style="{ cursor: currentMode.cursor }"
          @mousedown="onMousedown"
        >
          <img v-if="imgSrc" :src="imgSrc" class="bg-img" draggable="false" />
          <div v-else class="empty-hint">📂 Lade ein Bild, um Hotspots zu platzieren</div>

          <!-- Hotspot markers -->
          <div
            v-for="(h, i) in hotspots"
            :key="h.id"
            class="marker"
            :class="{ selected: i === selectedIdx, 'near-edge': edgeScaleFor(h) > 1.05 }"
            :style="markerStyle(h)"
          >{{ h.id }}</div>
        </div>
      </div>

      <!-- Sidebar -->
      <div class="sidebar">
        <div class="section">
          <h3>Hotspots ({{ hotspots.length }} / 10)</h3>
          <div class="hs-list">
            <div
              v-for="(h, i) in hotspots"
              :key="h.id"
              class="hs-item"
              :class="{ selected: i === selectedIdx }"
              @click="selectedIdx = i"
            >
              <div class="dot"></div>
              <div class="lbl">#{{ h.id }}</div>
              <div class="del" @click.stop="removeAt(i)">✕</div>
            </div>
          </div>
          <div class="slider-row">
            <span>Radius:</span>
            <input type="range" min="10" max="80" v-model.number="defaultRadius" @input="onRadiusChange"/>
            <span>{{ defaultRadius }}</span>
          </div>
        </div>
        <div class="json-section">
          <h3>📋 JSON</h3>
          <pre class="json-box">{{ jsonOutput }}</pre>
          <button class="btn primary" @click="copyJson">📋 Kopieren</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { createHistory } from '../../logic/history.js'
import { edgeScale } from '../../logic/differences.js'

const MODES = {
  place: { id:'place', icon:'✚', label:'Neu platzieren', key:'P', cursor:'crosshair',  cls:'place' },
  move:  { id:'move',  icon:'✥', label:'Verschieben',    key:'M', cursor:'move',       cls:'move'  },
  scale: { id:'scale', icon:'⊙', label:'Grösse ändern',  key:'S', cursor:'ew-resize',  cls:'scale' },
}
const modeList = Object.values(MODES)

const mode        = ref('place')
const imgSrc      = ref('')
const currentFile = ref('')
const imgAreaEl   = ref(null)
const fileInput   = ref(null)
const selectedIdx = ref(null)
const defaultRadius = ref(32)
const hotspots    = ref([])
let hist          = null
let drag          = null

const currentMode = computed(() => MODES[mode.value])

function edgeScaleFor(h) { return edgeScale(h.x, h.y) }

// Init history with empty array
function initHistory() {
  hist = createHistory([])
  hotspots.value = hist.current()
}
initHistory()

function snapshot() { hist.push(JSON.parse(JSON.stringify(hotspots.value))) }

function doUndo() {
  if (!hist.canUndo()) return
  hist.undo()
  hotspots.value = hist.current()
  selectedIdx.value = null
}

function doRedo() {
  if (!hist.canRedo()) return
  hist.redo()
  hotspots.value = hist.current()
  selectedIdx.value = null
}

function setMode(m) { mode.value = m }

function toFrac(clientX, clientY) {
  const r = imgAreaEl.value?.getBoundingClientRect()
  if (!r) return { x: 0, y: 0 }
  return { x: (clientX - r.left) / r.width, y: (clientY - r.top) / r.height }
}

function nearest(fx, fy) {
  const r = imgAreaEl.value?.getBoundingClientRect()
  if (!r || !hotspots.value.length) return null
  let best = 0, bestD = Infinity
  hotspots.value.forEach((h, i) => {
    const d = Math.hypot((h.x - fx) * r.width, (h.y - fy) * r.height)
    if (d < bestD) { bestD = d; best = i }
  })
  return best
}

function onMousedown(e) {
  if (!imgSrc.value) return
  const f = toFrac(e.clientX, e.clientY)
  if (f.x < 0 || f.x > 1 || f.y < 0 || f.y > 1) return

  if (mode.value === 'place') {
    if (hotspots.value.length >= 10) return
    snapshot()
    const id = hotspots.value.length + 1
    hotspots.value.push({ id, x: f.x, y: f.y, r: defaultRadius.value })
    selectedIdx.value = hotspots.value.length - 1
    hist.push(JSON.parse(JSON.stringify(hotspots.value)))
    return
  }

  const idx = nearest(f.x, f.y)
  if (idx === null) return
  selectedIdx.value = idx
  const h = hotspots.value[idx]
  drag = { idx, origX: h.x, origY: h.y, origR: h.r, startX: e.clientX, startY: e.clientY, moved: false }
  e.preventDefault()
}

function onMousemove(e) {
  if (!drag) return
  const r  = imgAreaEl.value?.getBoundingClientRect()
  if (!r) return
  const dx = e.clientX - drag.startX
  const dy = e.clientY - drag.startY
  if (!drag.moved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
    snapshot()
    drag.moved = true
  }
  if (!drag.moved) return
  const h = hotspots.value[drag.idx]
  if (mode.value === 'move') {
    h.x = Math.max(0, Math.min(1, drag.origX + dx / r.width))
    h.y = Math.max(0, Math.min(1, drag.origY + dy / r.height))
  } else if (mode.value === 'scale') {
    h.r = Math.max(10, Math.round(drag.origR + dx * 0.5))
    defaultRadius.value = h.r
  }
}

function onMouseup() {
  if (drag?.moved) hist.push(JSON.parse(JSON.stringify(hotspots.value)))
  drag = null
}

function onFileLoad(e) {
  const file = e.target.files[0]
  if (!file) return
  if (imgSrc.value) URL.revokeObjectURL(imgSrc.value)
  currentFile.value = file.name
  imgSrc.value = URL.createObjectURL(file)
}

function removeAt(i) {
  snapshot()
  hotspots.value.splice(i, 1)
  hotspots.value.forEach((h, j) => h.id = j + 1)
  selectedIdx.value = hotspots.value.length ? Math.min(selectedIdx.value ?? 0, hotspots.value.length - 1) : null
  hist.push(JSON.parse(JSON.stringify(hotspots.value)))
}

function deleteSelected() { if (selectedIdx.value !== null) removeAt(selectedIdx.value) }

function clearAll() {
  snapshot()
  hotspots.value = []
  selectedIdx.value = null
  hist.push([])
}

function onRadiusChange() {
  if (selectedIdx.value !== null && hotspots.value[selectedIdx.value]) {
    snapshot()
    hotspots.value[selectedIdx.value].r = defaultRadius.value
    hist.push(JSON.parse(JSON.stringify(hotspots.value)))
  }
}

const jsonOutput = computed(() => JSON.stringify({
  hotspots: hotspots.value.map(h => ({
    id: h.id,
    x: +h.x.toFixed(3),
    y: +h.y.toFixed(3),
    r: h.r,
  })),
}, null, 2))

function copyJson() { navigator.clipboard.writeText(jsonOutput.value) }

function markerStyle(h) {
  const sc = edgeScale(h.x, h.y)
  const r  = h.r * sc
  return {
    left:   `${h.x * 100}%`,
    top:    `${h.y * 100}%`,
    width:  `${r * 2}px`,
    height: `${r * 2}px`,
    transform: 'translate(-50%, -50%)',
  }
}

function onKeydown(e) {
  if (e.target.tagName === 'INPUT') return
  if (e.key === 'p' || e.key === 'P') { setMode('place'); return }
  if (e.key === 'm' || e.key === 'M') { setMode('move');  return }
  if (e.key === 's' || e.key === 'S') { setMode('scale'); return }
  if (e.key === 'Delete' || e.key === 'Backspace') { deleteSelected(); return }
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); doUndo(); return }
  if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) { e.preventDefault(); doRedo() }
}

onMounted(() => {
  window.addEventListener('mousemove', onMousemove)
  window.addEventListener('mouseup',   onMouseup)
  window.addEventListener('keydown',   onKeydown)
})
onUnmounted(() => {
  window.removeEventListener('mousemove', onMousemove)
  window.removeEventListener('mouseup',   onMouseup)
  window.removeEventListener('keydown',   onKeydown)
})
</script>

<style scoped>
.layout { height: 100vh; display: flex; flex-direction: column; background: #1e1e2e; color: #cdd6f4; font-family: system-ui, sans-serif; }
.header { background: #181825; padding: 10px 16px; display: flex; align-items: center; gap: 12px; border-bottom: 2px solid #313244; flex-shrink: 0; }
.title  { font-size: 1rem; font-weight: bold; color: #cba6f7; }
.sub    { font-size: 0.75rem; color: #6c7086; }
.spacer { flex: 1; }
.badge  { background: #313244; border-radius: 8px; padding: 3px 10px; font-size: 0.75rem; color: #a6adc8; }

.body { flex: 1; min-height: 0; display: flex; }

.tool-strip {
  width: 52px; flex-shrink: 0; background: #11111b;
  border-right: 2px solid #313244;
  display: flex; flex-direction: column; align-items: center; padding: 8px 0; gap: 4px;
}
.tool-btn {
  width: 38px; height: 38px; border-radius: 10px; border: 2px solid transparent;
  background: #1e1e2e; color: #cdd6f4; font-size: 1.2rem; cursor: pointer;
  display: flex; align-items: center; justify-content: center; position: relative;
}
.tool-btn:hover:not(:disabled) { background: #313244; }
.tool-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.tool-btn.active.place { border-color: #a6e3a1; background: rgba(166,227,161,0.12); }
.tool-btn.active.move  { border-color: #89b4fa; background: rgba(137,180,250,0.12); }
.tool-btn.active.scale { border-color: #fab387; background: rgba(250,179,135,0.12); }
.sep { width: 30px; height: 1px; background: #313244; margin: 2px 0; }
.tip {
  position: absolute; left: 46px; top: 50%; transform: translateY(-50%);
  background: #45475a; color: #cdd6f4; font-size: 0.72rem;
  border-radius: 6px; padding: 4px 10px; white-space: nowrap;
  pointer-events: none; opacity: 0; transition: opacity 0.15s; z-index: 50;
  display: flex; align-items: center; gap: 6px;
}
.tool-btn:hover .tip { opacity: 1; }
.kbd { background: #313244; border: 1px solid #585b70; border-radius: 4px; padding: 1px 5px; font-size: 0.68rem; font-family: monospace; color: #cba6f7; }

.img-panel { flex: 1; min-width: 0; display: flex; flex-direction: column; border-right: 2px solid #313244; }
.img-toolbar { padding: 8px 12px; display: flex; gap: 8px; align-items: center; border-bottom: 1px solid #313244; flex-shrink: 0; }
.btn { background: #313244; border: 1px solid #45475a; color: #cdd6f4; border-radius: 6px; padding: 5px 12px; font-size: 0.78rem; cursor: pointer; }
.btn:hover { background: #45475a; }
.btn.primary { background: #cba6f7; color: #1e1e2e; font-weight: bold; }
.mode-pill { margin-left: auto; font-size: 0.78rem; font-weight: bold; padding: 3px 14px; border-radius: 12px; border: 2px solid; }
.mode-pill.place { color: #a6e3a1; border-color: #a6e3a1; }
.mode-pill.move  { color: #89b4fa; border-color: #89b4fa; }
.mode-pill.scale { color: #fab387; border-color: #fab387; }

.img-area { flex: 1; position: relative; overflow: hidden; }
.bg-img { width: 100%; height: 100%; object-fit: contain; display: block; pointer-events: none; }
.empty-hint { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: #6c7086; font-size: 1rem; }

.marker {
  position: absolute; border-radius: 50%;
  border: 3px solid #f87171; background: rgba(248,113,113,0.22);
  display: flex; align-items: center; justify-content: center;
  font-size: 0.75rem; font-weight: bold; color: white;
  pointer-events: none;
}
.marker.selected { border-color: #cba6f7; background: rgba(203,166,247,0.28); color: #cba6f7; }
.marker.near-edge { border-color: #fab387; background: rgba(250,179,135,0.28); }

.sidebar { width: 240px; flex-shrink: 0; display: flex; flex-direction: column; }
.section { padding: 12px; border-bottom: 1px solid #313244; flex-shrink: 0; }
.section h3 { font-size: 0.8rem; font-weight: bold; color: #89b4fa; margin-bottom: 8px; }
.hs-list { display: flex; flex-direction: column; gap: 4px; max-height: 180px; overflow-y: auto; }
.hs-item { background: #313244; border-radius: 6px; padding: 5px 10px; display: flex; align-items: center; gap: 8px; font-size: 0.78rem; cursor: pointer; border: 2px solid transparent; }
.hs-item:hover { border-color: #45475a; }
.hs-item.selected { border-color: #cba6f7; background: #3c3857; }
.dot { width: 10px; height: 10px; border-radius: 50%; background: #f38ba8; flex-shrink: 0; }
.lbl { flex: 1; }
.del { cursor: pointer; color: #6c7086; }
.del:hover { color: #f38ba8; }
.slider-row { display: flex; align-items: center; gap: 8px; margin-top: 8px; font-size: 0.78rem; }
.slider-row input { flex: 1; accent-color: #cba6f7; }

.json-section { flex: 1; min-height: 0; padding: 12px; display: flex; flex-direction: column; gap: 8px; }
.json-section h3 { font-size: 0.8rem; font-weight: bold; color: #89b4fa; flex-shrink: 0; }
.json-box { flex: 1; background: #11111b; border-radius: 8px; padding: 10px; font-size: 0.7rem; font-family: monospace; color: #a6e3a1; overflow-y: auto; white-space: pre; line-height: 1.5; }
</style>
