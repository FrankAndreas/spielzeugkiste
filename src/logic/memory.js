export function buildDeck(pairs) {
  const doubled = pairs.flatMap(p => [
    { ...p, key: `${p.id}-a` },
    { ...p, key: `${p.id}-b` },
  ])
  // Fisher-Yates shuffle
  for (let i = doubled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [doubled[i], doubled[j]] = [doubled[j], doubled[i]]
  }
  return doubled
}

export function parseGrid(gridSize) {
  const [cols, rows] = gridSize.split('x').map(Number)
  return { cols, rows }
}

/** `count` different pairs, picked at random, so a big theme isn't always played with its first cards. */
export function pickPairs(pairs, count, random = Math.random) {
  const a = [...pairs]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a.slice(0, count)
}

// Players are animals, so children who can't read yet know whose turn it is
export const PLAYERS = [
  { emoji: '🦄', say: 'das Einhorn', color: '#C77DFF' },
  { emoji: '🐻', say: 'der Bär',     color: '#FF9A3C' },
  { emoji: '🐸', say: 'der Frosch',  color: '#6BCB77' },
  { emoji: '🐱', say: 'die Katze',   color: '#4D96FF' },
]

export function createPlayers(n) {
  return PLAYERS.slice(0, n).map(p => ({ ...p, pairs: 0 }))
}

/** The number of players from the address: 1 to 4, otherwise 1. */
export function parsePlayers(value) {
  const n = Number(value)
  return Number.isInteger(n) && n >= 1 && n <= PLAYERS.length ? n : 1
}

/** The players with the most pairs: one winner, or several on a tie. */
export function winners(players) {
  const best = Math.max(...players.map(p => p.pairs))
  return players.filter(p => p.pairs === best)
}
