<template>
  <canvas ref="canvas" class="thumb" :width="W * dpr" :height="H * dpr" />
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { BOX } from '../logic/letters.js'
import { drawInk } from '../services/letterCanvas.js'

// A finished letter in the child's own handwriting, small
const props = defineProps({ ink: { type: Array, required: true } })

const W = 40
const H = 56
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
.thumb { width: 40px; height: 56px; display: block; }
</style>
