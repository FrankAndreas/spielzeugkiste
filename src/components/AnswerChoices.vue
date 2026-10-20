<template>
  <div class="choices">
    <button
      v-for="n in choices"
      :key="n"
      class="choice"
      :disabled="disabled"
      @click="!disabled && emit('pick', n)"
    >
      <span class="digit">{{ n }}</span>
      <FingerHand v-if="n <= 10" :count="n" />
    </button>
  </div>
</template>

<script setup>
import FingerHand from './FingerHand.vue'

defineProps({
  choices:  { type: Array, required: true },
  disabled: { type: Boolean, default: false },
})
const emit = defineEmits(['pick'])
</script>

<style scoped>
.choices { display: flex; justify-content: center; gap: 16px; padding: 10px; flex-shrink: 0; }
.choice {
  min-width: 112px; min-height: 112px; padding: 8px 12px;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
  background: white; border: 3px solid var(--accent, #00B8A9); border-radius: 20px;
  box-shadow: 0 4px 0 #ccc;
}
.choice:active { transform: translateY(2px); box-shadow: 0 2px 0 #ccc; }
.choice:disabled { opacity: 0.6; }
.digit { font-size: 2.6rem; font-weight: bold; line-height: 1; color: #333; }
</style>
