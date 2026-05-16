import { createRouter, createWebHashHistory } from 'vue-router'

// Lazy-loaded views — keeps initial bundle small
const HomeView        = () => import('../views/HomeView.vue')
const ThemeSelectView = () => import('../views/ThemeSelectView.vue')
const MemoryGame      = () => import('../views/games/MemoryGame.vue')
const DifferencesGame = () => import('../views/games/DifferencesGame.vue')
const ColoringGame    = () => import('../views/games/ColoringGame.vue')
const HotspotEditor   = () => import('../views/setup/HotspotEditor.vue')

export default createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/',                         component: HomeView },
    { path: '/:game',                    component: ThemeSelectView },
    { path: '/memory/:theme/play',       component: MemoryGame },
    { path: '/differences/:theme/play',  component: DifferencesGame },
    { path: '/coloring/:theme/play',     component: ColoringGame },
    { path: '/setup',                    component: HotspotEditor },
  ],
})
