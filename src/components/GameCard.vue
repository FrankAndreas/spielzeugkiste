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
