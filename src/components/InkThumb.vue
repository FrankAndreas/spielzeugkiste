<template>
  <canvas ref="canvas" class="thumb" :width="W * dpr" :height="H * dpr" />
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { drawInk } from '../services/letterCanvas.js'

// A finished letter in the child's own handwriting, small
const props = defineProps({
  ink:  { type: Array, required: true },
  view: { type: Object, required: true },   // the part of letter space to show (viewBox)
})

const W = 36
const H = 61
const dpr = window.devicePixelRatio || 1
const canvas = ref(null)

onMounted(() => {
  const ctx = canvas.value.getContext?.('2d')
  if (!ctx) return
  const { view } = props
  const scale = Math.min(W / view.width, H / view.height)
  const ox = (W - view.width * scale) / 2 - view.x * scale
  const oy = (H - view.height * scale) / 2 - view.y * scale
  ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * ox, dpr * oy)
  drawInk(ctx, props.ink, 9)
})
</script>

<style scoped>
.thumb { width: 36px; height: 61px; display: block; }
</style>
