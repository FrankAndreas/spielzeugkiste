// Best scores live in localStorage. Storage can be missing or blocked
// (private browsing), so every access is guarded: the game then simply
// doesn't remember the score.
const key = (game, theme) => `spielzeugkiste.best.${game}.${theme}`

export function loadBest(game, theme) {
  try {
    return Number(localStorage.getItem(key(game, theme))) || 0
  } catch {
    return 0
  }
}

/** Stores the score if it beats the best one; returns whether it does. */
export function saveBest(game, theme, score) {
  if (score <= loadBest(game, theme)) return false
  try {
    localStorage.setItem(key(game, theme), String(score))
  } catch { /* not remembered, still a record for this round */ }
  return true
}
