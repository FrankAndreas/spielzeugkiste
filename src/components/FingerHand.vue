<template>
  <span class="hands">
    <svg v-for="(up, h) in hands" :key="h" viewBox="0 0 60 70" class="hand" aria-hidden="true">
      <rect
        v-for="(f, i) in FINGERS"
        :key="i"
        :class="['finger', { up: i < up }]"
        :x="i < up ? f.x : 20" :y="i < up ? f.y : 36" :width="f.w" :height="i < up ? 46 - f.y : 10"
        rx="4.5"
      />
      <rect class="palm" x="14" y="32" width="42" height="34" rx="11" />
    </svg>
  </span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({ count: { type: Number, required: true } })

// Thumb, index, middle, ring, little finger
// (folded fingers hide behind the palm)
const FINGERS = [
  { x: 2,  y: 24, w: 12 },
  { x: 15, y: 6,  w: 9 },
  { x: 26, y: 2,  w: 9 },
  { x: 37, y: 6,  w: 9 },
  { x: 48, y: 14, w: 8 },
]

// Raised fingers per hand: one hand up to 5, then a full hand plus the rest
const hands = computed(() => props.count <= 5 ? [props.count] : [5, props.count - 5])
</script>

<style scoped>
.hands { display: inline-flex; gap: 2px; }
.hand { width: 44px; height: 52px; }
.finger { fill: #f4c7a1; }
.finger.up { fill: #f0a875; }
.palm { fill: #f0a875; }
</style>
