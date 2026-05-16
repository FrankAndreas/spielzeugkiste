import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useContentStore = defineStore('content', () => {
  const games        = ref([])
  const currentTheme = ref(null)

  async function loadGames() {
    const res = await fetch('/content/games.json')
    const data = await res.json()
    games.value = data.games
  }

  async function loadTheme(game, theme) {
    const res = await fetch(`/content/${game}/${theme}/theme.json`)
    currentTheme.value = await res.json()
  }

  function findGame(id) {
    return games.value.find(g => g.id === id)
  }

  return { games, currentTheme, loadGames, loadTheme, findGame }
})
