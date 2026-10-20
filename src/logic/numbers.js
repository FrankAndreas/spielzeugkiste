const WORDS = [
  'null', 'eins', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn',
  'elf', 'zwölf', 'dreizehn', 'vierzehn', 'fünfzehn', 'sechzehn', 'siebzehn', 'achtzehn', 'neunzehn', 'zwanzig',
]

const LOOSE_COLS = 4
const LOOSE_ROWS = 3
const JITTER     = 0.15   // of a cell, so neighbours never overlap

/** The German word for 0–20, as said when counting ("eins", not "ein"). */
export function numberWord(n) {
  return WORDS[n]
}

function shuffle(list, random) {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** The answer plus two near numbers (±1, ±2) within 0..max, shuffled. */
export function answerChoices(answer, max, random = Math.random) {
  const near = [answer - 2, answer - 1, answer + 1, answer + 2].filter(n => n >= 0 && n <= max)
  return shuffle([answer, ...shuffle(near, random).slice(0, 2)], random)
}

/** Centre points (fractions 0..1) for up to 10 objects: one per cell of a 4×3 grid, jittered. */
export function looseLayout(n, random = Math.random) {
  const cells = []
  for (let row = 0; row < LOOSE_ROWS; row++) for (let col = 0; col < LOOSE_COLS; col++) cells.push({ col, row })
  const jitter = () => (random() * 2 - 1) * JITTER
  return shuffle(cells, random).slice(0, n).map(({ col, row }) => ({
    x: (col + 0.5 + jitter()) / LOOSE_COLS,
    y: (row + 0.5 + jitter()) / LOOSE_ROWS,
  }))
}

/** Ten-frame places: rows of 5, frames of 10. */
export function tenFrameLayout(n) {
  return Array.from({ length: n }, (_, i) => ({
    frame: Math.floor(i / 10),
    row:   Math.floor((i % 10) / 5),
    col:   i % 5,
  }))
}

const PIPS = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [2, 0], [0, 2], [2, 2]],
  5: [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]],
  6: [[0, 0], [2, 0], [0, 1], [2, 1], [0, 2], [2, 2]],
}

/** Pip positions of a die face on a 3×3 grid. */
export function dicePips(value) {
  return PIPS[value].map(([x, y]) => ({ x, y }))
}
