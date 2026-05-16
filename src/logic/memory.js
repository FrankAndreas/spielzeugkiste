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
