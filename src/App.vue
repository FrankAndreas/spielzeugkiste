<template>
  <!-- Keyed by path: a new name or letter starts a fresh game, not the old one reused -->
  <RouterView :key="$route.path" />
</template>

<script setup>
import { RouterView } from 'vue-router'
</script>
