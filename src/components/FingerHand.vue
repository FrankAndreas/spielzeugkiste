<template>
  <span class="hands">
    <svg v-for="(up, h) in hands" :key="h" viewBox="0 0 60 70" class="hand" aria-hidden="true">
      <rect
        v-for="(f, i) in FINGERS"
        :key="i"
        :class="['finger', { up: i < up }]"
        :x="f.x" :y="i < up ? f.y : 34" :width="f.w" :height="i < up ? 40 - f.y : 10"
        rx="5"
      />
      <rect class="palm" x="8" y="32" width="44" height="34" rx="12" />
    </svg>
  </span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({ count: { type: Number, required: true } })

// Thumb, index, middle, ring, little finger
const FINGERS = [
  { x: 0,  y: 26, w: 11 },
  { x: 12, y: 8,  w: 9 },
  { x: 23, y: 4,  w: 9 },
  { x: 34, y: 8,  w: 9 },
  { x: 45, y: 16, w: 8 },
]

// Raised fingers per hand: one hand up to 5, then a full hand plus the rest
const hands = computed(() => props.count <= 5 ? [props.count] : [5, props.count - 5])
</script>

<style scoped>
.hands { display: inline-flex; gap: 2px; }
.hand { width: 28px; height: 33px; }
.finger { fill: #f4c7a1; }
.finger.up { fill: #f0a875; }
.palm { fill: #f0a875; }
</style>
