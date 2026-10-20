<template>
  <div v-if="layout === 'frames'" class="frames">
    <div v-for="f in frameCount" :key="f" class="frame">
      <button
        v-for="i in frameItems(f - 1)"
        :key="i"
        :class="['obj', { marked: marked.has(i) }]"
        @click="onTap(i)"
      >{{ emoji }}</button>
    </div>
  </div>
  <div v-else class="loose">
    <button
      v-for="(p, i) in points"
      :key="i"
      :class="['obj', { marked: marked.has(i) }]"
      :style="{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }"
      @click="onTap(i)"
    >{{ emoji }}</button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { looseLayout, seededRandom } from '../logic/numbers.js'

const props = defineProps({
  count:  { type: Number, required: true },
  emoji:  { type: String, required: true },
  layout: { type: String, default: 'loose' },   // 'loose' (≤ 10) or 'frames'
  marked: { type: Set, default: () => new Set() },
  seed:   { type: Number, default: 1 },
})
const emit = defineEmits(['tap'])

// Depends only on count and seed, so objects stay still while being counted
const points     = computed(() => looseLayout(props.count, seededRandom(props.seed)))
const frameCount = computed(() => Math.ceil(props.count / 10))

function frameItems(frame) {
  const items = []
  for (let i = frame * 10; i < Math.min(props.count, frame * 10 + 10); i++) items.push(i)
  return items
}

function onTap(i) {
  if (!props.marked.has(i)) emit('tap', i)
}
</script>

<style scoped>
.loose { position: relative; width: 100%; height: 100%; min-height: 240px; }
.loose .obj { position: absolute; transform: translate(-50%, -50%); width: 84px; height: 84px; font-size: 3.6rem; }
.frames { display: flex; flex-wrap: wrap; gap: 14px; justify-content: center; align-content: center; height: 100%; }
.frame {
  display: grid; grid-template-columns: repeat(5, 60px); grid-auto-rows: 60px; gap: 4px;
  padding: 6px; border: 3px dotted var(--accent, #00B8A9); border-radius: 12px;
}
.obj {
  width: 60px; height: 60px; font-size: 2.6rem; line-height: 1;
  background: none; border: none; border-radius: 50%; padding: 0;
  transition: box-shadow 0.2s, background 0.2s;
}
.obj.marked { background: rgba(255, 230, 120, 0.7); box-shadow: 0 0 14px 4px rgba(255, 210, 60, 0.9); animation: bounce 0.3s; }
.loose .obj.marked { animation: none; }
@keyframes bounce { 50% { transform: scale(1.15); } }
</style>
