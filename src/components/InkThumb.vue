<template>
  <canvas ref="canvas" class="thumb" :width="W * dpr" :height="H * dpr" />
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { BOX } from '../logic/letters.js'
import { drawInk } from '../services/letterCanvas.js'

// A finished letter in the child's own handwriting, small
const props = defineProps({ ink: { type: Array, required: true } })

const W = 36
const H = 61   // the letter box with its bottom band
const dpr = window.devicePixelRatio || 1
const canvas = ref(null)

onMounted(() => {
  const ctx = canvas.value.getContext?.('2d')
  if (!ctx) return
  const scale = Math.min(W / BOX.width, H / BOX.height)
  ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0)
  drawInk(ctx, props.ink, 9)
})
</script>

<style scoped>
.thumb { width: 36px; height: 61px; display: block; }
</style>
