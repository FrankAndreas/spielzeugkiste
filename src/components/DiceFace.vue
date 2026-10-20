<template>
  <div class="die">
    <button
      v-for="(p, i) in pips"
      :key="i"
      :class="['pip', { marked: marked.has(offset + i) }]"
      :style="{ gridColumn: p.x + 1, gridRow: p.y + 1 }"
      @click="onTap(offset + i)"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { dicePips } from '../logic/numbers.js'

const props = defineProps({
  value:  { type: Number, required: true },
  offset: { type: Number, default: 0 },   // index of the first pip, so two dice count on
  marked: { type: Set, default: () => new Set() },
})
const emit = defineEmits(['tap'])

const pips = computed(() => dicePips(props.value))

function onTap(i) {
  if (!props.marked.has(i)) emit('tap', i)
}
</script>

<style scoped>
.die {
  display: grid; grid-template: repeat(3, 60px) / repeat(3, 60px); gap: 4px; padding: 10px;
  background: white; border-radius: 22px; border: 3px solid #333; box-shadow: 0 5px 0 #999;
}
.pip { width: 48px; height: 48px; margin: auto; border-radius: 50%; border: none; background: #333; padding: 0; }
.pip.marked { background: #FFB800; box-shadow: 0 0 12px 4px rgba(255, 200, 0, 0.8); }
</style>
