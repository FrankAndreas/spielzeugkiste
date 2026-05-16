# Kids Game Suite — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a self-hosted, touch-first Vue 3 kids game suite (Memory, Differences, Coloring) with German TTS, themed content, and a developer Hotspot Editor.

**Architecture:** Vue 3 SPA built with Vite, deployed as static files to a Synology NAS. All game content is JSON + image files under `public/content/` — no code change needed to add themes. Core game logic lives in plain JS functions, separately tested from Vue components.

**Tech Stack:** Vue 3 (Composition API + `<script setup>`), Vue Router 4 (hash history), Pinia, Vitest + @vue/test-utils, Web Speech API.

---

## File Map

```
kids-games/
├── public/
│   └── content/
│       ├── games.json
│       ├── memory/tiere/
│       │   ├── theme.json
│       │   └── images/  (lion.svg, elephant.svg …)
│       ├── differences/bauernhof/
│       │   ├── theme.json
│       │   ├── original.jpg
│       │   └── modified.jpg
│       └── coloring/tiere/
│           ├── theme.json
│           └── svgs/  (lion.svg …)
├── src/
│   ├── main.js
│   ├── App.vue
│   ├── router/
│   │   └── index.js
│   ├── stores/
│   │   └── content.js
│   ├── services/
│   │   └── tts.js
│   ├── logic/
│   │   ├── memory.js          ← pure game logic, fully tested
│   │   ├── differences.js     ← hit-test + edge-scale logic, fully tested
│   │   └── history.js         ← generic undo/redo stack, fully tested
│   ├── components/
│   │   ├── AppHeader.vue
│   │   └── GameCard.vue
│   ├── views/
│   │   ├── HomeView.vue
│   │   ├── ThemeSelectView.vue
│   │   └── games/
│   │       ├── MemoryGame.vue
│   │       ├── DifferencesGame.vue
│   │       └── ColoringGame.vue
│   └── views/setup/
│       └── HotspotEditor.vue
├── vite.config.js
└── package.json
```

---

## Task 1: Project scaffold

**Files:**
- Create: `package.json`, `vite.config.js`, `src/main.js`, `index.html`, `.gitignore`

- [ ] **Step 1: Initialise the Vue + Vite project**

```bash
cd /home/andreas/work/kids-games
npm create vite@latest . -- --template vue
```

When prompted "Current directory is not empty. Remove existing files and continue?" — choose **Yes** (the `docs/` folder will be re-added via git).

- [ ] **Step 2: Install runtime dependencies**

```bash
npm install vue-router@4 pinia
```

- [ ] **Step 3: Install dev dependencies**

```bash
npm install -D vitest @vue/test-utils jsdom @vitejs/plugin-vue
```

- [ ] **Step 4: Replace `vite.config.js`**

```js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
```

- [ ] **Step 5: Add test script to `package.json`**

In `package.json`, add to `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 6: Delete Vite's placeholder files**

```bash
rm -rf src/assets src/components/HelloWorld.vue src/components/TheWelcome.vue src/components/WelcomeItem.vue src/style.css
```

- [ ] **Step 7: Update `.gitignore`**

Append to `.gitignore`:
```
.superpowers/
dist/
```

- [ ] **Step 8: Restore docs and verify**

```bash
git status
```
Expected: `docs/` still present (git tracked), `node_modules/` and `dist/` ignored.

- [ ] **Step 9: Verify Vite starts**

```bash
npm run dev
```
Expected: server starts on `http://localhost:5173` (browser shows default Vue page).

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: scaffold Vue 3 + Vite project with Vitest"
```

---

## Task 2: Router, App shell, and global CSS

**Files:**
- Create: `src/router/index.js`, `src/App.vue`, `src/components/AppHeader.vue`, `src/assets/main.css`
- Modify: `src/main.js`

- [ ] **Step 1: Create `src/router/index.js`**

```js
import { createRouter, createWebHashHistory } from 'vue-router'

// Lazy-loaded views — keeps initial bundle small
const HomeView        = () => import('../views/HomeView.vue')
const ThemeSelectView = () => import('../views/ThemeSelectView.vue')
const MemoryGame      = () => import('../views/games/MemoryGame.vue')
const DifferencesGame = () => import('../views/games/DifferencesGame.vue')
const ColoringGame    = () => import('../views/games/ColoringGame.vue')
const HotspotEditor   = () => import('../views/setup/HotspotEditor.vue')

export default createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/',                         component: HomeView },
    { path: '/:game',                    component: ThemeSelectView },
    { path: '/memory/:theme/play',       component: MemoryGame },
    { path: '/differences/:theme/play',  component: DifferencesGame },
    { path: '/coloring/:theme/play',     component: ColoringGame },
    { path: '/setup',                    component: HotspotEditor },
  ],
})
```

Hash history (`#/`) is used because the NAS serves static files — no server-side routing available.

- [ ] **Step 2: Create `src/assets/main.css`**

```css
:root {
  --color-bg:        #fff9f0;
  --color-primary:   #FF6B6B;
  --color-shadow-primary: #c0392b;
  --color-yellow:    #FFD93D;
  --color-green:     #6BCB77;
  --color-blue:      #4D96FF;
  --color-text:      #333;
  --radius-card:     20px;
  --radius-btn:      24px;
  font-family: system-ui, -apple-system, sans-serif;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html, body {
  height: 100%;
  background: var(--color-bg);
  color: var(--color-text);
  -webkit-tap-highlight-color: transparent;
}

button {
  cursor: pointer;
  font-family: inherit;
  border: none;
  background: none;
}

/* Touch-friendly: minimum 44px tap targets */
.btn {
  min-height: 44px;
  min-width: 44px;
  border-radius: var(--radius-btn);
  padding: 10px 20px;
  font-size: 1rem;
  font-weight: bold;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.icon-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: white;
  box-shadow: 0 2px 6px rgba(0,0,0,0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
}
```

- [ ] **Step 3: Create `src/components/AppHeader.vue`**

```vue
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
```

- [ ] **Step 4: Create `src/App.vue`**

```vue
<template>
  <RouterView />
</template>

<script setup>
import { RouterView } from 'vue-router'
</script>
```

- [ ] **Step 5: Update `src/main.js`**

```js
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router/index.js'
import App from './App.vue'
import './assets/main.css'

createApp(App).use(createPinia()).use(router).mount('#app')
```

- [ ] **Step 6: Create stub views so the router doesn't crash**

```bash
mkdir -p src/views/games src/views/setup
```

Create `src/views/HomeView.vue`:
```vue
<template><div>Home</div></template>
```

Create `src/views/ThemeSelectView.vue`:
```vue
<template><div>Theme Select</div></template>
```

Create `src/views/games/MemoryGame.vue`:
```vue
<template><div>Memory</div></template>
```

Create `src/views/games/DifferencesGame.vue`:
```vue
<template><div>Differences</div></template>
```

Create `src/views/games/ColoringGame.vue`:
```vue
<template><div>Coloring</div></template>
```

Create `src/views/setup/HotspotEditor.vue`:
```vue
<template><div>Setup</div></template>
```

- [ ] **Step 7: Verify dev server**

```bash
npm run dev
```
Open `http://localhost:5173` — page loads without console errors.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add router, app shell, global CSS, AppHeader component"
```

---

## Task 3: TTS service

**Files:**
- Create: `src/services/tts.js`, `src/services/tts.test.js`

- [ ] **Step 1: Write the failing test**

Create `src/services/tts.test.js`:
```js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { speak, stopSpeaking } from './tts.js'

describe('tts service', () => {
  let mockSynth

  beforeEach(() => {
    mockSynth = {
      cancel: vi.fn(),
      speak:  vi.fn(),
    }
    vi.stubGlobal('speechSynthesis', mockSynth)
    vi.stubGlobal('SpeechSynthesisUtterance', class {
      constructor(text) { this.text = text; this.lang = '' }
    })
  })

  it('speaks with de-DE language', () => {
    speak('Hallo Welt')
    const utterance = mockSynth.speak.mock.calls[0][0]
    expect(utterance.text).toBe('Hallo Welt')
    expect(utterance.lang).toBe('de-DE')
  })

  it('cancels previous speech before speaking', () => {
    speak('first')
    speak('second')
    expect(mockSynth.cancel).toHaveBeenCalledTimes(2)
  })

  it('stopSpeaking cancels synthesis', () => {
    stopSpeaking()
    expect(mockSynth.cancel).toHaveBeenCalledTimes(1)
  })

  it('does nothing when speechSynthesis is unavailable', () => {
    vi.stubGlobal('speechSynthesis', undefined)
    expect(() => speak('test')).not.toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- src/services/tts.test.js
```
Expected: FAIL — `Cannot find module './tts.js'`

- [ ] **Step 3: Create `src/services/tts.js`**

```js
export function speak(text, lang = 'de-DE') {
  if (!window.speechSynthesis) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = lang
  window.speechSynthesis.speak(u)
}

export function stopSpeaking() {
  if (window.speechSynthesis) window.speechSynthesis.cancel()
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- src/services/tts.test.js
```
Expected: PASS — 4 tests passing.

- [ ] **Step 5: Commit**

```bash
git add src/services/
git commit -m "feat: add TTS service with de-DE language support"
```

---

## Task 4: Content loading store + sample games.json

**Files:**
- Create: `src/stores/content.js`, `src/stores/content.test.js`, `public/content/games.json`

- [ ] **Step 1: Create `public/content/games.json`**

```json
{
  "games": [
    {
      "id": "memory",
      "name": "Memory",
      "emoji": "🃏",
      "description": "Paare finden",
      "color": "#FFD93D",
      "shadow": "#c9a800",
      "tts": "Willkommen beim Memory! Wähle ein Thema.",
      "themes": ["tiere"]
    },
    {
      "id": "differences",
      "name": "Unterschiede",
      "emoji": "🔍",
      "description": "10 Unterschiede finden",
      "color": "#6BCB77",
      "shadow": "#4aaf59",
      "tts": "Willkommen beim Unterschiedespiel! Wähle ein Thema.",
      "themes": ["bauernhof"]
    },
    {
      "id": "coloring",
      "name": "Ausmalen",
      "emoji": "🎨",
      "description": "Bilder anmalen",
      "color": "#4D96FF",
      "shadow": "#2a6fcc",
      "tts": "Willkommen beim Ausmalen! Wähle ein Thema.",
      "themes": ["tiere"]
    }
  ]
}
```

- [ ] **Step 2: Write the failing test**

Create `src/stores/content.test.js`:
```js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useContentStore } from './content.js'

const MOCK_GAMES = {
  games: [
    { id: 'memory', name: 'Memory', emoji: '🃏', themes: ['tiere'] }
  ]
}

const MOCK_THEME = {
  name: 'Tiere',
  tts: 'Tier-Memory!',
  gridSize: '4x4',
  pairs: [{ id: 'lion', image: 'images/lion.svg', label: 'Löwe', tts: 'Löwe' }]
}

describe('content store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.stubGlobal('fetch', vi.fn())
  })

  it('loadGames populates games array', async () => {
    fetch.mockResolvedValue({ json: () => Promise.resolve(MOCK_GAMES) })
    const store = useContentStore()
    await store.loadGames()
    expect(store.games).toHaveLength(1)
    expect(store.games[0].id).toBe('memory')
  })

  it('loadTheme populates currentTheme', async () => {
    fetch.mockResolvedValue({ json: () => Promise.resolve(MOCK_THEME) })
    const store = useContentStore()
    await store.loadTheme('memory', 'tiere')
    expect(store.currentTheme.name).toBe('Tiere')
    expect(store.currentTheme.pairs).toHaveLength(1)
  })

  it('findGame returns game by id', async () => {
    fetch.mockResolvedValue({ json: () => Promise.resolve(MOCK_GAMES) })
    const store = useContentStore()
    await store.loadGames()
    expect(store.findGame('memory').name).toBe('Memory')
    expect(store.findGame('unknown')).toBeUndefined()
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npm test -- src/stores/content.test.js
```
Expected: FAIL — `Cannot find module './content.js'`

- [ ] **Step 4: Create `src/stores/content.js`**

```js
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useContentStore = defineStore('content', () => {
  const games        = ref([])
  const currentTheme = ref(null)

  async function loadGames() {
    const res = await fetch('/content/games.json')
    const data = await res.json()
    games.value = data.games
  }

  async function loadTheme(game, theme) {
    const res = await fetch(`/content/${game}/${theme}/theme.json`)
    currentTheme.value = await res.json()
  }

  function findGame(id) {
    return games.value.find(g => g.id === id)
  }

  return { games, currentTheme, loadGames, loadTheme, findGame }
})
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm test -- src/stores/content.test.js
```
Expected: PASS — 3 tests passing.

- [ ] **Step 6: Commit**

```bash
git add src/stores/ public/content/
git commit -m "feat: add content store and games.json"
```

---

## Task 5: Home screen

**Files:**
- Create: `src/components/GameCard.vue`
- Modify: `src/views/HomeView.vue`

- [ ] **Step 1: Create `src/components/GameCard.vue`**

```vue
<template>
  <button class="game-card" :style="{ '--shadow': game.shadow }" @click="$emit('select', game)">
    <div class="emoji">{{ game.emoji }}</div>
    <div class="name">{{ game.name }}</div>
    <div class="desc">{{ game.description }}</div>
  </button>
</template>

<script setup>
defineProps({ game: { type: Object, required: true } })
defineEmits(['select'])
</script>

<style scoped>
.game-card {
  background: white;
  border-radius: 20px;
  padding: 22px 12px;
  text-align: center;
  box-shadow: 0 4px 0 var(--shadow);
  border: 3px solid var(--shadow);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  transition: transform 0.1s;
  -webkit-tap-highlight-color: transparent;
}
.game-card:active { transform: translateY(2px); box-shadow: 0 2px 0 var(--shadow); }
.emoji { font-size: 3rem; }
.name  { font-size: 1.1rem; font-weight: bold; color: #333; }
.desc  { font-size: 0.8rem; color: #888; }
</style>
```

- [ ] **Step 2: Replace `src/views/HomeView.vue`**

```vue
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
```

- [ ] **Step 3: Start dev server and verify visually**

```bash
npm run dev
```
Open `http://localhost:5173` — home screen shows game cards loaded from `games.json`. TTS fires on load. Clicking a card navigates to `/#/memory` etc. (shows stub).

- [ ] **Step 4: Commit**

```bash
git add src/
git commit -m "feat: add home screen with dynamic game cards"
```

---

## Task 6: Theme selection screen

**Files:**
- Modify: `src/views/ThemeSelectView.vue`

- [ ] **Step 1: Replace `src/views/ThemeSelectView.vue`**

```vue
<template>
  <div class="layout" v-if="game">
    <AppHeader
      :title="`${game.emoji} ${game.name}`"
      :tts="game.tts"
      :color="game.color"
    />

    <p class="prompt">Welches Thema möchtest du spielen?</p>

    <div class="theme-grid">
      <button
        v-for="theme in game.themes"
        :key="theme"
        class="theme-btn"
        :style="{ '--c': game.color, '--s': game.shadow }"
        @click="onThemeSelect(theme)"
      >
        {{ theme }}
      </button>
    </div>

    <!-- Memory-only: difficulty selector -->
    <div v-if="gameId === 'memory'" class="difficulty">
      <p class="diff-label">Schwierigkeit</p>
      <div class="diff-row">
        <button
          v-for="opt in difficultyOptions"
          :key="opt.value"
          :class="['diff-btn', { active: difficulty === opt.value }]"
          @click="difficulty = opt.value"
        >
          {{ opt.label }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useContentStore } from '../stores/content.js'
import { speak } from '../services/tts.js'
import AppHeader from '../components/AppHeader.vue'

const route  = useRoute()
const router = useRouter()
const store  = useContentStore()

const gameId   = computed(() => route.params.game)
const game     = computed(() => store.findGame(gameId.value))
const difficulty = ref('4x4')

const difficultyOptions = [
  { label: 'Leicht (3×4)', value: '3x4' },
  { label: 'Mittel (4×4)', value: '4x4' },
  { label: 'Schwer (4×6)', value: '4x6' },
]

onMounted(async () => {
  if (!store.games.length) await store.loadGames()
  if (game.value) speak(game.value.tts)
})

function onThemeSelect(theme) {
  const query = gameId.value === 'memory' ? { grid: difficulty.value } : {}
  router.push({ path: `/${gameId.value}/${theme}/play`, query })
}
</script>

<style scoped>
.layout { min-height: 100vh; display: flex; flex-direction: column; }
.prompt { text-align: center; padding: 14px 16px 6px; font-size: 0.95rem; color: #666; }
.theme-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  padding: 8px 14px;
}
.theme-btn {
  background: white;
  border-radius: 16px;
  padding: 14px 8px;
  font-size: 0.85rem;
  font-weight: bold;
  color: #333;
  box-shadow: 0 3px 0 var(--s);
  border: 2px solid var(--c);
  text-transform: capitalize;
}
.theme-btn:active { transform: translateY(2px); box-shadow: 0 1px 0 var(--s); }
.difficulty { padding: 12px 14px; }
.diff-label { font-size: 0.8rem; color: #888; text-align: center; margin-bottom: 8px; }
.diff-row { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }
.diff-btn {
  background: white;
  border-radius: 20px;
  padding: 8px 16px;
  font-size: 0.82rem;
  font-weight: bold;
  color: #888;
  border: 2px solid #ddd;
}
.diff-btn.active { background: #FF6B6B; color: white; border-color: #FF6B6B; }
</style>
```

- [ ] **Step 2: Verify navigating from home screen to theme select**

Open `http://localhost:5173`, click Memory card → theme select shows "tiere" theme button and difficulty picker. Click Differences → theme select shows "bauernhof". TTS fires on each.

- [ ] **Step 3: Commit**

```bash
git add src/views/ThemeSelectView.vue
git commit -m "feat: add theme selection screen with difficulty picker for Memory"
```

---

## Task 7: Memory game — logic + component + sample content

**Files:**
- Create: `src/logic/memory.js`, `src/logic/memory.test.js`
- Create: `public/content/memory/tiere/theme.json`, `public/content/memory/tiere/images/` (SVG placeholders)
- Modify: `src/views/games/MemoryGame.vue`

- [ ] **Step 1: Create sample content — `public/content/memory/tiere/theme.json`**

```json
{
  "name": "Tiere",
  "tts": "Tier-Memory! Finde alle Paare.",
  "gridSize": "4x4",
  "pairs": [
    { "id": "lion",     "image": "images/lion.svg",     "label": "Löwe",    "tts": "Löwe" },
    { "id": "elephant", "image": "images/elephant.svg", "label": "Elefant", "tts": "Elefant" },
    { "id": "fox",      "image": "images/fox.svg",      "label": "Fuchs",   "tts": "Fuchs" },
    { "id": "bird",     "image": "images/bird.svg",     "label": "Vogel",   "tts": "Vogel" },
    { "id": "dolphin",  "image": "images/dolphin.svg",  "label": "Delfin",  "tts": "Delfin" },
    { "id": "rabbit",   "image": "images/rabbit.svg",   "label": "Hase",    "tts": "Hase" },
    { "id": "tiger",    "image": "images/tiger.svg",    "label": "Tiger",   "tts": "Tiger" },
    { "id": "bear",     "image": "images/bear.svg",     "label": "Bär",     "tts": "Bär" }
  ]
}
```

- [ ] **Step 2: Create placeholder SVG images**

```bash
mkdir -p public/content/memory/tiere/images
```

Create `public/content/memory/tiere/images/lion.svg` (repeat for each animal, changing emoji):
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="12" fill="#FFD93D"/>
  <text x="50" y="65" text-anchor="middle" font-size="50">🦁</text>
</svg>
```

Repeat for: `elephant.svg` (🐘), `fox.svg` (🦊), `bird.svg` (🐦), `dolphin.svg` (🐬), `rabbit.svg` (🐰), `tiger.svg` (🐯), `bear.svg` (🐻).

- [ ] **Step 3: Write the failing test for memory logic**

Create `src/logic/memory.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { buildDeck, parseGrid } from './memory.js'

describe('buildDeck', () => {
  const pairs = [
    { id: 'lion',  label: 'Löwe',    tts: 'Löwe',    image: 'lion.svg' },
    { id: 'bear',  label: 'Bär',     tts: 'Bär',     image: 'bear.svg' },
    { id: 'fox',   label: 'Fuchs',   tts: 'Fuchs',   image: 'fox.svg'  },
  ]

  it('returns 2× the number of pairs', () => {
    const deck = buildDeck(pairs)
    expect(deck).toHaveLength(6)
  })

  it('each pair id appears exactly twice', () => {
    const deck = buildDeck(pairs)
    const lionCards = deck.filter(c => c.id === 'lion')
    expect(lionCards).toHaveLength(2)
  })

  it('each card has a unique key', () => {
    const deck = buildDeck(pairs)
    const keys = deck.map(c => c.key)
    expect(new Set(keys).size).toBe(6)
  })

  it('deck order is shuffled (not identical to input doubled)', () => {
    // Run 10 times — at least one should differ (probability of always same: negligible)
    const results = Array.from({ length: 10 }, () => buildDeck(pairs).map(c => c.id).join(','))
    expect(new Set(results).size).toBeGreaterThan(1)
  })
})

describe('parseGrid', () => {
  it('parses "4x4" to { cols: 4, rows: 4 }', () => {
    expect(parseGrid('4x4')).toEqual({ cols: 4, rows: 4 })
  })

  it('parses "3x4" to { cols: 3, rows: 4 }', () => {
    expect(parseGrid('3x4')).toEqual({ cols: 3, rows: 4 })
  })
})
```

- [ ] **Step 4: Run test to verify it fails**

```bash
npm test -- src/logic/memory.test.js
```
Expected: FAIL — `Cannot find module './memory.js'`

- [ ] **Step 5: Create `src/logic/memory.js`**

```js
/**
 * Build a shuffled deck from an array of pairs.
 * Each pair produces two cards with a shared id and unique key.
 */
export function buildDeck(pairs) {
  const doubled = pairs.flatMap((p, i) => [
    { ...p, key: `${p.id}-a` },
    { ...p, key: `${p.id}-b` },
  ])
  // Fisher-Yates shuffle
  for (let i = doubled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [doubled[i], doubled[j]] = [doubled[j], doubled[i]]
  }
  return doubled
}

/** Parse "4x4" → { cols: 4, rows: 4 } */
export function parseGrid(gridSize) {
  const [cols, rows] = gridSize.split('x').map(Number)
  return { cols, rows }
}
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
npm test -- src/logic/memory.test.js
```
Expected: PASS — 5 tests passing.

- [ ] **Step 7: Replace `src/views/games/MemoryGame.vue`**

```vue
<template>
  <div class="layout">
    <AppHeader
      :title="`🃏 Memory — ${theme?.name ?? ''}`"
      :tts="theme?.tts ?? ''"
      color="#FFD93D"
    />

    <div class="progress-bar">
      <div
        v-for="(_, i) in totalPairs"
        :key="i"
        class="dot"
        :class="{ found: i < foundCount }"
      />
    </div>

    <div
      v-if="theme"
      class="grid"
      :style="{ gridTemplateColumns: `repeat(${grid.cols}, 1fr)` }"
    >
      <button
        v-for="card in deck"
        :key="card.key"
        class="card"
        :class="{ flipped: flipped.has(card.key), matched: matched.has(card.id) }"
        :disabled="locked || flipped.has(card.key) || matched.has(card.id)"
        @click="onCardClick(card)"
      >
        <div class="card-inner">
          <div class="card-front">
            <img :src="`/content/memory/${themeId}/${card.image}`" :alt="card.label" />
          </div>
          <div class="card-back">⭐</div>
        </div>
      </button>
    </div>

    <!-- Win overlay -->
    <Transition name="fade">
      <div v-if="won" class="win-overlay">
        <div class="win-content">
          <div class="win-emoji">🎉</div>
          <div class="win-text">Toll gemacht!</div>
          <div class="win-sub">Alle Paare gefunden!</div>
          <button class="btn" style="background:#FF6B6B;color:white" @click="restart">Nochmal</button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useContentStore } from '../../stores/content.js'
import { speak } from '../../services/tts.js'
import { buildDeck, parseGrid } from '../../logic/memory.js'
import AppHeader from '../../components/AppHeader.vue'

const route   = useRoute()
const store   = useContentStore()
const themeId = computed(() => route.params.theme)
const gridStr = computed(() => route.query.grid ?? '4x4')
const grid    = computed(() => parseGrid(gridStr.value))
const theme   = computed(() => store.currentTheme)

const deck     = ref([])
const flipped  = ref(new Set())   // card keys currently face-up (max 2)
const matched  = ref(new Set())   // card ids that have been matched
const locked   = ref(false)
const won      = ref(false)

const totalPairs = computed(() => deck.value.length / 2)
const foundCount = computed(() => matched.value.size)

onMounted(async () => {
  await store.loadTheme('memory', themeId.value)
  restart()
})

function restart() {
  const pairs = theme.value?.pairs ?? []
  // For the selected grid, use only as many pairs as fit
  const { cols, rows } = grid.value
  const count = (cols * rows) / 2
  deck.value    = buildDeck(pairs.slice(0, count))
  flipped.value = new Set()
  matched.value = new Set()
  locked.value  = false
  won.value     = false
  speak(theme.value?.tts ?? '')
}

function onCardClick(card) {
  if (locked.value) return
  const next = new Set(flipped.value)
  next.add(card.key)
  flipped.value = next

  if (next.size < 2) return  // first card — wait for second

  const [keyA, keyB] = [...next]
  const cardA = deck.value.find(c => c.key === keyA)
  const cardB = deck.value.find(c => c.key === keyB)

  if (cardA.id === cardB.id) {
    // Match
    const m = new Set(matched.value)
    m.add(cardA.id)
    matched.value = m
    flipped.value = new Set()
    speak(cardA.tts)
    if (m.size === totalPairs.value) {
      setTimeout(() => {
        won.value = true
        speak('Toll gemacht! Alle Paare gefunden!')
      }, 500)
    }
  } else {
    // No match — flip back after 1s
    locked.value = true
    setTimeout(() => {
      flipped.value = new Set()
      locked.value  = false
    }, 1000)
  }
}
</script>

<style scoped>
.layout { min-height: 100vh; display: flex; flex-direction: column; }
.progress-bar { display: flex; justify-content: center; gap: 6px; padding: 10px; flex-wrap: wrap; }
.dot { width: 16px; height: 16px; border-radius: 50%; background: #ddd; transition: background 0.3s; }
.dot.found { background: #6BCB77; }
.grid { display: grid; gap: 10px; padding: 12px; flex: 1; }

/* Flip card */
.card { perspective: 600px; background: none; border: none; padding: 0; }
.card-inner {
  width: 100%; aspect-ratio: 1;
  position: relative; transform-style: preserve-3d;
  transition: transform 0.4s;
}
.card.flipped .card-inner,
.card.matched .card-inner { transform: rotateY(180deg); }
.card-front, .card-back {
  position: absolute; inset: 0; border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
  backface-visibility: hidden; -webkit-backface-visibility: hidden;
}
.card-back  { background: #4D96FF; box-shadow: 0 4px 0 #2a6fcc; font-size: 1.8rem; }
.card-front { background: white; border: 3px solid #FF6B6B; box-shadow: 0 4px 0 #e0e0e0; transform: rotateY(180deg); }
.card-front img { width: 80%; height: 80%; object-fit: contain; }
.card.matched .card-front { background: #6BCB77; border-color: #4aaf59; opacity: 0.75; }

/* Win overlay */
.win-overlay {
  position: fixed; inset: 0; background: rgba(255,255,255,0.93);
  display: flex; align-items: center; justify-content: center; z-index: 100;
}
.win-content { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 14px; }
.win-emoji { font-size: 5rem; }
.win-text  { font-size: 1.8rem; font-weight: bold; color: #FF6B6B; }
.win-sub   { font-size: 1rem; color: #888; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
```

- [ ] **Step 8: Verify Memory game works end-to-end**

Open `http://localhost:5173` → Memory → Tiere → game loads, cards flip, TTS speaks on match, win screen appears when all pairs found.

- [ ] **Step 9: Commit**

```bash
git add src/logic/ src/views/games/MemoryGame.vue public/content/memory/
git commit -m "feat: Memory game with flip logic, TTS, and win screen"
```

---

## Task 8: Differences game — logic + component + sample content

**Files:**
- Create: `src/logic/differences.js`, `src/logic/differences.test.js`
- Create: `public/content/differences/bauernhof/theme.json`
- Modify: `src/views/games/DifferencesGame.vue`

- [ ] **Step 1: Create `public/content/differences/bauernhof/theme.json`**

Use placeholder images from a free source (or generate with GenAI). For development, use coloured rectangles.

```json
{
  "name": "Bauernhof",
  "tts": "Finde die 10 Unterschiede! Tippe auf die Unterschiede im rechten Bild.",
  "original": "original.jpg",
  "modified": "modified.jpg",
  "hotspots": [
    { "id": 1, "x": 0.133, "y": 0.143, "r": 32 },
    { "id": 2, "x": 0.500, "y": 0.476, "r": 38 },
    { "id": 3, "x": 0.790, "y": 0.500, "r": 30 },
    { "id": 4, "x": 0.183, "y": 0.643, "r": 28 },
    { "id": 5, "x": 0.793, "y": 0.226, "r": 26 },
    { "id": 6, "x": 0.350, "y": 0.800, "r": 30 },
    { "id": 7, "x": 0.650, "y": 0.750, "r": 28 },
    { "id": 8, "x": 0.250, "y": 0.300, "r": 26 },
    { "id": 9, "x": 0.700, "y": 0.350, "r": 30 },
    { "id": 10, "x": 0.450, "y": 0.200, "r": 28 }
  ]
}
```

Add placeholder images (any 800×600 JPGs or PNGs) into `public/content/differences/bauernhof/`. For development, these can be the same image temporarily — swap for real GenAI-prepared pairs before publishing.

- [ ] **Step 2: Write the failing test**

Create `src/logic/differences.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { edgeScale, hitTest } from './differences.js'

describe('edgeScale', () => {
  it('returns 1.0 for a point at the centre', () => {
    expect(edgeScale(0.5, 0.5)).toBe(1)
  })

  it('returns > 1 when within 12% of an edge', () => {
    expect(edgeScale(0.05, 0.5)).toBeGreaterThan(1)
  })

  it('returns MAX_SCALE at the very edge (0)', () => {
    expect(edgeScale(0, 0.5)).toBeCloseTo(1.9)
  })

  it('clamps at 1 for edge distances >= EDGE_ZONE', () => {
    expect(edgeScale(0.15, 0.5)).toBe(1)
  })
})

describe('hitTest', () => {
  // Container: 800px wide, 600px tall
  const rect = { width: 800, height: 600 }

  it('returns true when tap is within the hotspot radius', () => {
    const hotspot = { x: 0.5, y: 0.5, r: 40 }
    // Tap exactly at centre — distance 0
    expect(hitTest(0.5, 0.5, hotspot, rect)).toBe(true)
  })

  it('returns true when tap is within scaled edge radius', () => {
    const hotspot = { x: 0.05, y: 0.5, r: 30 }
    const scale   = edgeScale(0.05, 0.5)
    const screenR = hotspot.r * scale
    // Tap at hotspot centre — always hits regardless of scale
    expect(hitTest(0.05, 0.5, hotspot, rect)).toBe(true)
  })

  it('returns false when tap is far outside radius', () => {
    const hotspot = { x: 0.5, y: 0.5, r: 30 }
    // Tap 200px away in screen space = 0.25 fraction away
    expect(hitTest(0.75, 0.5, hotspot, rect)).toBe(false)
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npm test -- src/logic/differences.test.js
```
Expected: FAIL — `Cannot find module './differences.js'`

- [ ] **Step 4: Create `src/logic/differences.js`**

```js
const EDGE_ZONE = 0.12
const MAX_SCALE = 1.9

/**
 * Returns a radius multiplier (1.0–MAX_SCALE) based on proximity to image edges.
 * Hotspots near an edge get a larger hit area to compensate for imprecise tapping.
 */
export function edgeScale(x, y) {
  const nearest = Math.min(x, 1 - x, y, 1 - y)
  if (nearest >= EDGE_ZONE) return 1
  return 1 + (MAX_SCALE - 1) * (1 - nearest / EDGE_ZONE)
}

/**
 * Returns true if a tap at (tapX, tapY) [0–1 fractions] hits the hotspot.
 * containerRect: { width, height } of the image element in screen pixels.
 */
export function hitTest(tapX, tapY, hotspot, containerRect) {
  const scale   = edgeScale(hotspot.x, hotspot.y)
  const screenR = hotspot.r * scale
  const dx      = (tapX - hotspot.x) * containerRect.width
  const dy      = (tapY - hotspot.y) * containerRect.height
  return Math.sqrt(dx * dx + dy * dy) <= screenR
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm test -- src/logic/differences.test.js
```
Expected: PASS — 6 tests passing.

- [ ] **Step 6: Replace `src/views/games/DifferencesGame.vue`**

```vue
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

const route       = useRoute()
const store       = useContentStore()
const themeId     = computed(() => route.params.theme)
const theme       = computed(() => store.currentTheme)
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
  // Wrong tap — brief shake (CSS class toggling)
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
  background: rgba(255,107,107,0.25);
  transform: translate(-50%, -50%);
  pointer-events: none;
  transition: transform 0.3s cubic-bezier(.34,1.56,.64,1);
}
.marker.hint {
  border-color: #FFD93D;
  background: rgba(255,217,61,0.35);
  animation: pulse 0.7s ease-in-out 3;
}
@keyframes pulse {
  0%,100% { transform: translate(-50%,-50%) scale(1); }
  50%      { transform: translate(-50%,-50%) scale(1.3); }
}

@keyframes shake {
  0%,100% { transform: translateX(0); }
  25%     { transform: translateX(-8px); }
  75%     { transform: translateX(8px); }
}
.shake { animation: shake 0.4s ease; }

.win-overlay {
  position: fixed; inset: 0; background: rgba(255,255,255,0.93);
  display: flex; align-items: center; justify-content: center; z-index: 100;
}
.win-content { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 14px; }
.win-emoji { font-size: 5rem; }
.win-text  { font-size: 1.8rem; font-weight: bold; color: #6BCB77; }
.win-sub   { font-size: 1rem; color: #888; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
```

- [ ] **Step 7: Verify Differences game works end-to-end**

Navigate to `http://localhost:5173` → Unterschiede → Bauernhof → both images shown side by side. Tap on modified image near a hotspot → red circle appears. 💡 button flashes hint. Win screen appears on completion.

- [ ] **Step 8: Commit**

```bash
git add src/logic/ src/views/games/DifferencesGame.vue public/content/differences/
git commit -m "feat: Differences game with hit detection, hints, and edge scaling"
```

---

## Task 9: Coloring game — component + sample content

**Files:**
- Create: `public/content/coloring/tiere/theme.json`, `public/content/coloring/tiere/svgs/lion.svg`
- Modify: `src/views/games/ColoringGame.vue`

- [ ] **Step 1: Create `public/content/coloring/tiere/theme.json`**

```json
{
  "name": "Tiere",
  "tts": "Wähle eine Farbe und tippe auf das Bild zum Anmalen!",
  "pages": [
    { "id": "lion",     "svg": "svgs/lion.svg",     "label": "Löwe",    "tts": "Der Löwe" },
    { "id": "elephant", "svg": "svgs/elephant.svg", "label": "Elefant", "tts": "Der Elefant" }
  ]
}
```

- [ ] **Step 2: Create `public/content/coloring/tiere/svgs/lion.svg`**

```bash
mkdir -p public/content/coloring/tiere/svgs
```

```svg
<svg id="coloring-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 280">
  <ellipse data-region="mane"         cx="150" cy="148" rx="90" ry="88"  fill="#f5f0e8" stroke="#2c1a0a" stroke-width="5"/>
  <ellipse data-region="body"         cx="150" cy="200" rx="65" ry="52"  fill="#f5f0e8" stroke="#2c1a0a" stroke-width="5"/>
  <ellipse data-region="head"         cx="150" cy="130" rx="58" ry="55"  fill="#f5f0e8" stroke="#2c1a0a" stroke-width="5"/>
  <ellipse data-region="ear-left"     cx="100" cy="82"  rx="18" ry="18"  fill="#f5f0e8" stroke="#2c1a0a" stroke-width="5"/>
  <ellipse data-region="ear-left-inner" cx="100" cy="82" rx="10" ry="10" fill="#f5f0e8" stroke="#2c1a0a" stroke-width="3"/>
  <ellipse data-region="ear-right"    cx="200" cy="82"  rx="18" ry="18"  fill="#f5f0e8" stroke="#2c1a0a" stroke-width="5"/>
  <ellipse data-region="ear-right-inner" cx="200" cy="82" rx="10" ry="10" fill="#f5f0e8" stroke="#2c1a0a" stroke-width="3"/>
  <ellipse data-region="muzzle"       cx="150" cy="148" rx="28" ry="22"  fill="#f5f0e8" stroke="#2c1a0a" stroke-width="4"/>
  <ellipse data-region="nose"         cx="150" cy="141" rx="10" ry="7"   fill="#f5f0e8" stroke="#2c1a0a" stroke-width="3"/>
  <ellipse data-region="eye-left"     cx="126" cy="118" rx="12" ry="10"  fill="#f5f0e8" stroke="#2c1a0a" stroke-width="4"/>
  <ellipse                            cx="126" cy="118" rx="5"  ry="5"   fill="#2c1a0a"/>
  <ellipse data-region="eye-right"    cx="174" cy="118" rx="12" ry="10"  fill="#f5f0e8" stroke="#2c1a0a" stroke-width="4"/>
  <ellipse                            cx="174" cy="118" rx="5"  ry="5"   fill="#2c1a0a"/>
  <path   data-region="tail"         d="M210 220 Q255 190 260 230 Q265 260 240 265 Q225 268 215 255 Q208 240 210 220Z" fill="#f5f0e8" stroke="#2c1a0a" stroke-width="4"/>
  <rect   data-region="leg-fl"       x="108" y="235" width="28" height="38" rx="10" fill="#f5f0e8" stroke="#2c1a0a" stroke-width="4"/>
  <rect   data-region="leg-fr"       x="164" y="235" width="28" height="38" rx="10" fill="#f5f0e8" stroke="#2c1a0a" stroke-width="4"/>
  <path d="M140 155 Q150 162 160 155" fill="none" stroke="#2c1a0a" stroke-width="2.5" stroke-linecap="round"/>
  <line x1="150" y1="148" x2="150" y2="156" stroke="#2c1a0a" stroke-width="2"/>
  <line x1="122" y1="148" x2="92"  y2="143" stroke="#2c1a0a" stroke-width="1.5"/>
  <line x1="122" y1="152" x2="92"  y2="155" stroke="#2c1a0a" stroke-width="1.5"/>
  <line x1="178" y1="148" x2="208" y2="143" stroke="#2c1a0a" stroke-width="1.5"/>
  <line x1="178" y1="152" x2="208" y2="155" stroke="#2c1a0a" stroke-width="1.5"/>
</svg>
```

Copy `lion.svg` to `elephant.svg` as a placeholder (replace with real artwork later).

- [ ] **Step 3: Replace `src/views/games/ColoringGame.vue`**

```vue
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
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useContentStore } from '../../stores/content.js'
import { speak } from '../../services/tts.js'
import AppHeader from '../../components/AppHeader.vue'

const COLORS = ['#FFD93D','#FF9A3C','#FF6B6B','#6BCB77','#4D96FF','#C77DFF','#FF6FC8','#795548','#607D8B','#f5f0e8']
const BLANK   = '#f5f0e8'
const MIN_ZOOM = 1, MAX_ZOOM = 5, EDGE_ZONE = 0.12

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
  max-width: 100%; max-height: 100%;
  transform-origin: center center; will-change: transform;
}
.svg-wrapper :deep(svg) { max-width: 100%; max-height: 100%; display: block; }
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
```

- [ ] **Step 4: Verify Coloring game works end-to-end**

Navigate to Ausmalen → Tiere → lion SVG loads. Select a colour, tap a region → fills. Undo works. Pinch / scroll to zoom. Palette stays pinned at bottom.

- [ ] **Step 5: Commit**

```bash
git add src/views/games/ColoringGame.vue public/content/coloring/
git commit -m "feat: Coloring game with SVG regions, pinch-to-zoom, and undo"
```

---

## Task 10: Hotspot editor

**Files:**
- Create: `src/logic/history.js`, `src/logic/history.test.js`
- Modify: `src/views/setup/HotspotEditor.vue`

- [ ] **Step 1: Write the failing test for the undo/redo history stack**

Create `src/logic/history.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { createHistory } from './history.js'

describe('createHistory', () => {
  it('starts with canUndo=false and canRedo=false', () => {
    const h = createHistory([1, 2, 3])
    expect(h.canUndo()).toBe(false)
    expect(h.canRedo()).toBe(false)
    expect(h.current()).toEqual([1, 2, 3])
  })

  it('push records a new state and enables undo', () => {
    const h = createHistory([1])
    h.push([1, 2])
    expect(h.canUndo()).toBe(true)
    expect(h.current()).toEqual([1, 2])
  })

  it('undo returns the previous state', () => {
    const h = createHistory([1])
    h.push([1, 2])
    h.undo()
    expect(h.current()).toEqual([1])
    expect(h.canUndo()).toBe(false)
  })

  it('redo returns the next state after undo', () => {
    const h = createHistory([1])
    h.push([1, 2])
    h.undo()
    h.redo()
    expect(h.current()).toEqual([1, 2])
    expect(h.canRedo()).toBe(false)
  })

  it('push after undo discards redo states', () => {
    const h = createHistory([1])
    h.push([1, 2])
    h.push([1, 2, 3])
    h.undo()                  // back to [1, 2]
    h.push([1, 2, 99])        // discards [1, 2, 3]
    expect(h.canRedo()).toBe(false)
    expect(h.current()).toEqual([1, 2, 99])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- src/logic/history.test.js
```
Expected: FAIL — `Cannot find module './history.js'`

- [ ] **Step 3: Create `src/logic/history.js`**

```js
/**
 * Generic undo/redo history stack.
 * States are stored as deep-cloned snapshots.
 * Usage:
 *   const h = createHistory(initialState)
 *   h.push(newState)
 *   h.undo()  → h.current() is previous state
 *   h.redo()  → h.current() is next state
 */
export function createHistory(initial) {
  const stack  = [JSON.parse(JSON.stringify(initial))]
  let pointer  = 0

  return {
    current: ()  => JSON.parse(JSON.stringify(stack[pointer])),
    canUndo: ()  => pointer > 0,
    canRedo: ()  => pointer < stack.length - 1,
    push(state) {
      stack.splice(pointer + 1)
      stack.push(JSON.parse(JSON.stringify(state)))
      pointer = stack.length - 1
    },
    undo() {
      if (pointer > 0) pointer--
    },
    redo() {
      if (pointer < stack.length - 1) pointer++
    },
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- src/logic/history.test.js
```
Expected: PASS — 5 tests passing.

- [ ] **Step 5: Replace `src/views/setup/HotspotEditor.vue`**

```vue
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
let hotspots      = ref([])
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
```

- [ ] **Step 6: Verify hotspot editor at `/setup`**

Navigate to `http://localhost:5173/#/setup`. Load a JPEG image using "📂 Bild laden". Place hotspots with `P` mode, move with `M`, resize with `S`. Test `Ctrl+Z` / `Ctrl+Y`. Verify JSON updates live.

- [ ] **Step 7: Commit**

```bash
git add src/logic/history.js src/logic/history.test.js src/views/setup/HotspotEditor.vue
git commit -m "feat: Hotspot Editor with place/move/scale modes, undo/redo, and JSON export"
```

---

## Task 11: Run full test suite + build for NAS

**Files:** No new files — verification only.

- [ ] **Step 1: Run all tests**

```bash
npm test
```
Expected output: all tests pass.
```
 ✓ src/services/tts.test.js        (4 tests)
 ✓ src/stores/content.test.js      (3 tests)
 ✓ src/logic/memory.test.js        (5 tests)
 ✓ src/logic/differences.test.js   (6 tests)
 ✓ src/logic/history.test.js       (5 tests)

 Test Files  5 passed (5)
 Tests      23 passed (23)
```

- [ ] **Step 2: Build for production**

```bash
npm run build
```
Expected: `dist/` folder created with no errors.

- [ ] **Step 3: Preview the production build locally**

```bash
npm run preview
```
Open `http://localhost:4173` — verify all three games work from the production build.

- [ ] **Step 4: Deploy to NAS**

Copy the `dist/` folder to your Synology NAS web directory:
```bash
# Replace <NAS_IP> and <WEB_ROOT> with your values
rsync -avz dist/ <NAS_USER>@<NAS_IP>:<WEB_ROOT>/kids-games/
```

On the NAS, ensure the web server (Nginx or Apache via Web Station) serves `kids-games/index.html` for the root URL. No server-side configuration is needed — all routing is handled client-side via hash URLs (`/#/memory` etc.).

- [ ] **Step 5: Test on iPad**

Open Safari on the iPad, navigate to `http://<NAS_IP>/kids-games/`. Verify:
- Home screen loads and TTS fires
- Memory cards flip on tap
- Differences game registers taps correctly
- Coloring game responds to pinch-to-zoom
- Back button works on all screens

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "chore: verify build and add NAS deployment notes"
```

---

## Self-review against spec

| Spec requirement | Covered by |
|---|---|
| Vue 3 + Vite, hash router, Pinia | Tasks 1–2 |
| German language + TTS on every screen | Task 3, AppHeader in Task 2 |
| iPad touch-first, 44px targets | main.css in Task 2 |
| JSON-driven content, no code change for new themes | Task 4 (content store + games.json) |
| Memory: flip, match, difficulty, TTS, win | Task 7 |
| Differences: tap modified image only, hotspots, edge scaling, hint | Tasks 8 |
| Coloring: SVG regions, pinned palette, zoom/pan, undo | Task 9 |
| Hotspot editor: P/M/S modes, Ctrl+Z/Y, JSON export, edge scale preview | Task 10 |
| Static build, NAS deployment | Task 11 |
| No runtime LLM, no backend | All tasks (only `fetch` for local static files) |
