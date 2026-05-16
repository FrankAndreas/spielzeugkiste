<template>
  <div class="layout">
    <AppHeader title="🧀 Käseklicker" tts="Klick auf den Käse!" color="#FFD93D" />

    <!-- Counter -->
    <div class="counter">
      <div class="total">{{ fmt(cheeseNow) }} 🧀</div>
      <div class="sub-row">
        <span class="ever">Gesamt: {{ fmt(cheese) }}</span>
        <span class="cps" v-if="cps > 0">{{ fmtDec(cps) }}/Sek</span>
      </div>
      <button class="reset-btn" @click="confirmReset">↺</button>
    </div>

    <!-- Cheese -->
    <div class="cheese-area" ref="cheeseAreaEl">
      <div
        v-for="f in floaters"
        :key="f.id"
        class="floater"
        :style="{ left: f.x + 'px', top: f.y + 'px' }"
      >+{{ fmt(clickPower) }}</div>

      <button
        class="cheese-btn"
        :class="{ pop: popping }"
        @click="onCheeseClick"
        @animationend="popping = false"
      >🧀</button>
    </div>

    <!-- Shop -->
    <div class="shop">
      <div class="shop-row">
        <button
          v-for="b in BUILDINGS"
          :key="b.id"
          class="shop-item"
          :class="{ buyable: canAfford(b), owned: counts[b.id] > 0 }"
          @click="buy(b)"
        >
          <div class="si-icon">{{ b.icon }}</div>
          <div class="si-name">{{ b.name }}</div>
          <div class="si-owned">× {{ counts[b.id] }}</div>
          <div class="si-cost">{{ fmt(buildingCost(b)) }} 🧀</div>
          <div class="si-rate">+{{ fmtDec(b.cps) }}/s</div>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted, onUnmounted, nextTick } from 'vue'
import { speak } from '../../services/tts.js'
import AppHeader from '../../components/AppHeader.vue'

const BUILDINGS = [
  { id: 'mouse',   name: 'Maus',     icon: '🐭', baseCost: 15,    cps: 0.1 },
  { id: 'cat',     name: 'Katze',    icon: '🐱', baseCost: 100,   cps: 0.5 },
  { id: 'farmer',  name: 'Bauer',    icon: '👨‍🌾', baseCost: 500,   cps: 2   },
  { id: 'dairy',   name: 'Käserei',  icon: '🏠', baseCost: 2000,  cps: 10  },
  { id: 'factory', name: 'Fabrik',   icon: '🏭', baseCost: 10000, cps: 50  },
]

const MILESTONES = [100, 500, 1000, 5000, 10000, 50000, 100000, 1e6]
const SAVE_KEY = 'cheese-clicker-save'

const cheese       = ref(0)   // total ever produced
const cheeseNow    = ref(0)   // current spendable
const counts       = reactive(Object.fromEntries(BUILDINGS.map(b => [b.id, 0])))
const popping      = ref(false)
const floaters     = ref([])
const cheeseAreaEl = ref(null)

let floatId    = 0
let ticker     = null
let lastSave   = 0
let nextMilestone = 0

const cps = computed(() =>
  BUILDINGS.reduce((sum, b) => sum + b.cps * counts[b.id], 0)
)

const clickPower = computed(() => Math.max(1, Math.ceil(cps.value * 0.05)))

function buildingCost(b) {
  return Math.ceil(b.baseCost * Math.pow(1.15, counts[b.id]))
}

function canAfford(b) {
  return cheeseNow.value >= buildingCost(b)
}

function buy(b) {
  const c = buildingCost(b)
  if (cheeseNow.value < c) return
  cheeseNow.value -= c
  counts[b.id]++
  speak(b.name)
  save()
}

function onCheeseClick(e) {
  const gained = clickPower.value
  cheese.value    += gained
  cheeseNow.value += gained
  checkMilestone()

  popping.value = false
  nextTick(() => { popping.value = true })

  const rect = cheeseAreaEl.value?.getBoundingClientRect()
  if (rect) {
    const x = e.clientX - rect.left + (Math.random() * 40 - 20)
    const y = e.clientY - rect.top  - 20
    const id = floatId++
    floaters.value.push({ id, x, y })
    setTimeout(() => { floaters.value = floaters.value.filter(f => f.id !== id) }, 900)
  }
}

function checkMilestone() {
  if (cheese.value >= nextMilestone && nextMilestone > 0) {
    speak(`${fmt(nextMilestone)} Käse! Toll gemacht!`)
    const idx = MILESTONES.indexOf(nextMilestone)
    nextMilestone = MILESTONES[idx + 1] ?? Infinity
  }
}

function fmt(n) {
  n = Math.floor(n)
  if (n >= 1e9) return (n / 1e9).toFixed(1) + ' Mrd.'
  if (n >= 1e6) return (n / 1e6).toFixed(1) + ' Mio.'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return n.toString()
}

function fmtDec(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  if (n < 10)   return n.toFixed(1)
  return Math.floor(n).toString()
}

function save() {
  localStorage.setItem(SAVE_KEY, JSON.stringify({
    cheese:    cheese.value,
    cheeseNow: cheeseNow.value,
    counts:    { ...counts },
    milestone: nextMilestone,
  }))
  lastSave = Date.now()
}

function load() {
  try {
    const data = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null')
    if (!data) { nextMilestone = MILESTONES[0]; return }
    cheese.value    = data.cheese    ?? 0
    cheeseNow.value = data.cheeseNow ?? 0
    BUILDINGS.forEach(b => { counts[b.id] = data.counts?.[b.id] ?? 0 })
    nextMilestone   = data.milestone ?? MILESTONES.find(m => m > cheese.value) ?? MILESTONES[0]
  } catch { nextMilestone = MILESTONES[0] }
}

function confirmReset() {
  if (!confirm('Wirklich von vorne anfangen?')) return
  localStorage.removeItem(SAVE_KEY)
  cheese.value    = 0
  cheeseNow.value = 0
  BUILDINGS.forEach(b => { counts[b.id] = 0 })
  nextMilestone = MILESTONES[0]
  speak('Neu gestartet!')
}

onMounted(() => {
  load()
  speak('Klick auf den Käse!')

  ticker = setInterval(() => {
    if (cps.value > 0) {
      const gained = cps.value / 20   // 50ms tick → 20 ticks per second
      cheese.value    += gained
      cheeseNow.value += gained
      checkMilestone()
    }
    if (Date.now() - lastSave > 10000) save()
  }, 50)
})

onUnmounted(() => {
  clearInterval(ticker)
  save()
})
</script>

<style scoped>
.layout { height: 100vh; display: flex; flex-direction: column; overflow: hidden; background: #fff9f0; }

/* Counter */
.counter {
  flex-shrink: 0; text-align: center; padding: 10px 16px 8px;
  background: linear-gradient(to bottom, #fffde7, #fff9f0);
  border-bottom: 2px solid #FFD93D; position: relative;
}
.total   { font-size: 1.8rem; font-weight: bold; color: #333; line-height: 1.1; }
.sub-row { display: flex; justify-content: center; gap: 16px; margin-top: 2px; }
.ever    { font-size: 0.72rem; color: #bbb; }
.cps     { font-size: 0.72rem; color: #FF9A3C; font-weight: bold; }
.reset-btn {
  position: absolute; top: 8px; right: 10px;
  background: none; border: none; font-size: 1.1rem; color: #ccc;
  cursor: pointer; padding: 4px 8px;
}
.reset-btn:hover { color: #FF6B6B; }

/* Cheese area */
.cheese-area {
  flex: 1; min-height: 0; display: flex; align-items: center; justify-content: center;
  position: relative; overflow: hidden;
}

.cheese-btn {
  background: none; border: none; padding: 0;
  font-size: min(38vw, 200px); line-height: 1;
  cursor: pointer; user-select: none; touch-action: manipulation;
  filter: drop-shadow(0 8px 20px rgba(255, 180, 0, 0.45));
  transition: filter 0.1s;
}
.cheese-btn:active { filter: drop-shadow(0 4px 8px rgba(255, 180, 0, 0.3)); }
.cheese-btn.pop { animation: pop 0.16s ease; }

@keyframes pop {
  0%   { transform: scale(1); }
  35%  { transform: scale(0.87); }
  100% { transform: scale(1); }
}

.floater {
  position: absolute; pointer-events: none;
  font-size: 1.05rem; font-weight: bold; color: #FF9A3C;
  text-shadow: 0 1px 3px rgba(0,0,0,0.15);
  animation: float-up 0.9s ease-out forwards;
  white-space: nowrap;
}
@keyframes float-up {
  0%   { opacity: 1; transform: translateY(0) scale(1); }
  20%  { opacity: 1; transform: translateY(-12px) scale(1.1); }
  100% { opacity: 0; transform: translateY(-70px) scale(0.8); }
}

/* Shop */
.shop {
  flex-shrink: 0; background: white;
  border-top: 3px solid #FFD93D; padding: 10px 12px 14px;
}
.shop-row {
  display: flex; gap: 8px;
  overflow-x: auto; padding-bottom: 2px;
  scrollbar-width: none;
}
.shop-row::-webkit-scrollbar { display: none; }

.shop-item {
  flex-shrink: 0; width: 82px;
  display: flex; flex-direction: column; align-items: center; gap: 1px;
  padding: 8px 4px 10px; border-radius: 14px;
  border: 2px solid #eee; background: #fafafa;
  cursor: pointer; opacity: 0.4;
  transition: opacity 0.2s, border-color 0.2s, transform 0.1s;
}
.shop-item.owned   { opacity: 0.65; }
.shop-item.buyable { opacity: 1; border-color: #FFD93D; }
.shop-item.buyable:active { transform: scale(0.94); }

.si-icon  { font-size: 1.7rem; line-height: 1; }
.si-name  { font-size: 0.68rem; font-weight: bold; color: #333; margin-top: 2px; }
.si-owned { font-size: 0.65rem; color: #999; }
.si-cost  { font-size: 0.66rem; font-weight: bold; color: #FF9A3C; text-align: center; line-height: 1.3; }
.si-rate  { font-size: 0.6rem; color: #6BCB77; }
</style>
