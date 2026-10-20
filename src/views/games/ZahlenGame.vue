<template>
  <div
    class="layout"
    :style="{ background: theme?.colors.bg, '--accent': theme?.colors.accent }"
    @pointerdown="unlockAudio"
    @touchend="unlockAudio"
    @click="unlockAudio"
  >
    <AppHeader title="🔢 Zahlen" :tts="question" color="#00B8A9" />

    <div class="stars">
      <span v-for="i in tasks.length" :key="i" :class="['star', { done: i <= stars }]">⭐</span>
    </div>

    <template v-if="task && obj">
      <div class="play">
        <ObjectField
          v-if="task.type === 'count'"
          :count="task.amount"
          :emoji="obj.emoji"
          :layout="task.amount > 10 ? 'frames' : 'loose'"
          :marked="marked"
          :seed="index"
          @tap="onTap"
        />

        <div v-else-if="task.type === 'dice'" class="dice">
          <DiceFace
            v-for="(d, i) in task.dice"
            :key="i"
            :value="d"
            :offset="i === 0 ? 0 : task.dice[0]"
            :marked="marked"
            @tap="onTap"
          />
        </div>

        <div v-else-if="task.type === 'plus'" class="plus">
          <ObjectField :count="task.a" :emoji="obj.emoji" layout="frames" :marked="marked" @tap="onTap" />
          <span class="sign">+</span>
          <ObjectField :count="task.b" :emoji="obj.emoji" layout="frames" :marked="shifted" @tap="i => onTap(task.a + i)" />
        </div>

        <div v-else-if="task.type === 'listen'" class="listen">
          <span :key="beat" :class="['listen-pic', { pulse: beat > 0 }]">{{ theme.listen.picture }}</span>
          <button class="again" :disabled="locked" @click="replay">🔁</button>
        </div>

        <div v-else-if="task.type === 'build'" class="build">
          <div class="target">{{ task.answer }}</div>
          <div class="supply">
            <ObjectField :count="task.supply - inBasket" :emoji="obj.emoji" layout="frames" @tap="addToBasket" />
          </div>
          <div class="basket">
            <span class="basket-icon">{{ theme.basket }}</span>
            <ObjectField :count="inBasket" :emoji="obj.emoji" layout="frames" :marked="marked" @tap="takeFromBasket" />
          </div>
        </div>
      </div>

      <button v-if="task.type === 'build'" class="check" :disabled="locked" @click="onPick(inBasket)">✓</button>
      <AnswerChoices v-else :choices="task.choices" :disabled="locked" @pick="onPick" />
    </template>

    <Transition name="fade">
      <div v-if="won" class="win">
        <div class="win-content">
          <div class="win-emoji">🎉</div>
          <div class="win-text">Super gemacht!</div>
          <div class="win-buttons">
            <button class="btn again-btn" @click="start">Nochmal</button>
            <button class="btn done-btn" @click="router.push('/')">Fertig</button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useContentStore } from '../../stores/content.js'
import { speak, stopSpeaking } from '../../services/tts.js'
import { unlockAudio, playBeats } from '../../services/sound.js'
import { buildSession, parseLevel, numberWord, questionText, cheerText } from '../../logic/numbers.js'
import AppHeader from '../../components/AppHeader.vue'
import ObjectField from '../../components/ObjectField.vue'
import DiceFace from '../../components/DiceFace.vue'
import AnswerChoices from '../../components/AnswerChoices.vue'

const route  = useRoute()
const router = useRouter()
const store  = useContentStore()

const WIN_PAUSE_MS   = 800   // after the last cheer, before celebrating
const COUNT_ALONG_MS = 900   // between beats when counting the sounds along

const theme    = computed(() => store.currentTheme)
const level    = computed(() => parseLevel(route.query.level))
const tasks    = ref([])
const index    = ref(0)
const stars    = ref(0)
const marked   = ref(new Set())
const inBasket = ref(0)
const beat     = ref(0)
const locked   = ref(true)
const won      = ref(false)

const task     = computed(() => tasks.value[index.value])
const obj      = computed(() => task.value && theme.value?.objects[task.value.kind])
const question = computed(() => task.value && obj.value ? questionText(task.value, obj.value) : '')
// Marks of the second plus group, shifted back to its own indices
const shifted  = computed(() => new Set([...marked.value].map(i => i - task.value.a).filter(i => i >= 0)))

// Every await checks it is still the same game: leaving or restarting bumps the token
let token = 0
let left  = false
let beats = null
const alive = t => !left && t === token
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

onMounted(async () => {
  await store.loadTheme('zahlen', route.params.theme)
  if (!left) start()
})

onUnmounted(() => {
  left = true
  token++
  beats?.abort()
  stopSpeaking()
})

async function start() {
  const t = ++token
  tasks.value = buildSession(level.value, theme.value.objects.length, Math.random)
  index.value = 0
  stars.value = 0
  won.value   = false
  resetMarks()
  locked.value = true
  await speak(theme.value.tts)
  if (alive(t)) ask(t)
}

function resetMarks() {
  marked.value   = new Set()
  inBasket.value = 0
  beat.value     = 0
}

async function ask(t) {
  locked.value = true
  await speak(question.value)
  if (!alive(t)) return
  if (task.value.type === 'listen') {
    await playListen(t)
    if (!alive(t)) return
  }
  locked.value = false
}

async function playListen(t, onCount) {
  beats?.abort()
  beats = new AbortController()
  await playBeats(theme.value.listen.sound, task.value.amount, i => {
    if (!alive(t)) return
    beat.value = i
    onCount?.(i)
  }, { signal: beats.signal, gapMs: onCount ? COUNT_ALONG_MS : undefined })
}

async function replay() {
  if (locked.value) return
  const t = token
  locked.value = true
  await playListen(t)
  if (alive(t)) locked.value = false
}

function onTap(i) {
  if (locked.value || marked.value.has(i)) return
  marked.value = new Set(marked.value).add(i)
  speak(numberWord(marked.value.size))
}

function addToBasket() {
  if (locked.value) return
  inBasket.value++
  speak(numberWord(inBasket.value))
}

function takeFromBasket() {
  if (locked.value) return
  inBasket.value--
  speak(numberWord(inBasket.value))
}

async function onPick(n) {
  if (locked.value) return
  const t = token
  locked.value = true
  await speak(numberWord(n))
  if (!alive(t)) return
  if (n === task.value.answer) await right(t)
  else await wrong(t)
}

async function right(t) {
  await speak(cheerText(task.value.answer))
  if (!alive(t)) return
  stars.value++
  if (index.value === tasks.value.length - 1) {
    await sleep(WIN_PAUSE_MS)
    if (!alive(t)) return
    won.value = true
    speak('Super gemacht!')
    return
  }
  index.value++
  resetMarks()
  ask(t)
}

async function wrong(t) {
  await speak('Hmm, zähl nochmal mit mir')
  if (!alive(t)) return
  await countAlong(t)
  if (!alive(t)) return
  marked.value = new Set()
  locked.value = false
}

// Highlights every object (or pip, or beat) in turn and says its number
async function countAlong(t) {
  const { type, answer } = task.value
  if (type === 'listen') {
    await playListen(t, i => speak(numberWord(i)))
    return
  }
  const total = type === 'build' ? inBasket.value : answer
  marked.value = new Set()
  if (total === 0) await speak('Schau, da ist gar nichts. Null!')
  for (let i = 0; i < total; i++) {
    marked.value = new Set([...marked.value, i])
    await speak(numberWord(i + 1))
    if (!alive(t)) return
  }
  if (!alive(t)) return
  if (type === 'build') await speak(`Wir brauchen ${numberWord(answer)}.`)
}
</script>

<style scoped>
.layout { height: 100vh; display: flex; flex-direction: column; overflow: hidden; touch-action: manipulation; }
.stars { display: flex; justify-content: center; gap: 8px; padding: 8px; flex-shrink: 0; }
.star { font-size: 1.6rem; filter: grayscale(1); opacity: 0.35; transition: all 0.3s; }
.star.done { filter: none; opacity: 1; transform: scale(1.1); }
.play { flex: 1; min-height: 0; padding: 8px 16px; display: flex; align-items: center; justify-content: center; }
.play > * { width: 100%; height: 100%; }
.dice, .plus { display: flex; align-items: center; align-content: center; justify-content: center; gap: 24px; flex-wrap: wrap; }
.plus > :not(.sign) { width: auto; height: auto; }
.sign { font-size: 3.5rem; font-weight: bold; color: #555; }
.listen { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; }
.listen-pic { font-size: 9rem; line-height: 1; }
.listen-pic.pulse { animation: pulse 0.4s; }
@keyframes pulse { 40% { transform: scale(1.3); } }
.again { font-size: 2.2rem; width: 72px; height: 72px; border-radius: 50%; border: 3px solid var(--accent); background: white; }
.build { display: flex; flex-direction: column; align-items: center; justify-content: space-around; gap: 8px; }
.build > .supply, .build > .basket { width: auto; }
.target { font-size: 4rem; font-weight: bold; color: var(--accent); line-height: 1; }
.basket {
  display: flex; align-items: center; gap: 12px; min-height: 90px; min-width: 260px; padding: 8px 14px;
  background: rgba(255, 255, 255, 0.7); border: 3px dashed var(--accent); border-radius: 20px;
}
.basket-icon { font-size: 3rem; }
.check {
  align-self: center; margin: 10px; width: 96px; height: 96px; flex-shrink: 0;
  font-size: 3rem; font-weight: bold; color: white; background: var(--accent);
  border: none; border-radius: 50%; box-shadow: 0 4px 0 rgba(0, 0, 0, 0.25);
}
.check:disabled { opacity: 0.6; }
.win { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.45); display: flex; align-items: center; justify-content: center; }
.win-content { background: white; border-radius: 28px; padding: 32px 40px; text-align: center; }
.win-emoji { font-size: 4rem; }
.win-text { font-size: 2rem; font-weight: bold; margin: 8px 0 18px; }
.win-buttons { display: flex; gap: 14px; justify-content: center; }
.again-btn { background: #00B8A9; color: white; }
.done-btn { background: #eee; color: #333; }
</style>
