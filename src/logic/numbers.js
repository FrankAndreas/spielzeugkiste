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

const TYPES       = ['count', 'dice', 'build', 'plus', 'listen']
const ZERO_CHANCE = 0.1   // how often a Bis-9 count asks for "keine"
const MAX_BEATS   = { 9: 9, 20: 10 }

/** The level from the query: 20, otherwise 9. */
export function parseLevel(value) {
  return value === '20' || value === 20 ? 20 : 9
}

const int = (lo, hi, random) => lo + Math.floor(random() * (hi - lo + 1))

function makeTask(type, level, kind, random) {
  switch (type) {
    case 'count': {
      const zero   = level === 9 && random() < ZERO_CHANCE
      const amount = zero ? 0 : int(1, level, random)
      return { type, kind, amount, answer: amount }
    }
    case 'dice': {
      const dice = Array.from({ length: level === 9 ? 1 : 2 }, () => int(1, 6, random))
      return { type, kind, dice, answer: dice.reduce((s, d) => s + d, 0) }
    }
    case 'build': {
      const amount = int(1, level, random)
      return { type, kind, amount, supply: amount + 3, answer: amount }
    }
    case 'plus': {
      const a = int(1, level - 1, random)
      const b = int(1, level - a, random)
      return { type, kind, a, b, answer: a + b }
    }
    case 'listen': {
      const amount = int(1, MAX_BEATS[level], random)
      return { type, kind, amount, answer: amount }
    }
  }
}

/**
 * Six tasks: a small count to start, then each round type once in random order.
 * `kind` indexes the theme's objects; every task but build has answer choices.
 */
export function buildSession(level, kindCount, random = Math.random) {
  const kind  = () => Math.floor(random() * kindCount)
  const first = { type: 'count', kind: kind(), amount: int(1, 5, random) }
  first.answer = first.amount
  const tasks = [first, ...shuffle(TYPES, random).map(type => makeTask(type, level, kind(), random))]
  for (const t of tasks) if (t.type !== 'build') t.choices = answerChoices(t.answer, level, random)
  return tasks
}

const group = (n, obj) => n === 1 ? obj.one : `${numberWord(n)} ${obj.many}`

/** The spoken question; `obj` is the theme object ({ one: 'ein Einhorn', many: 'Einhörner' }). */
export function questionText(task, obj) {
  switch (task.type) {
    case 'count':  return `Wie viele ${obj.many}?`
    case 'dice':   return 'Wie viele Punkte?'
    case 'build':  return `Leg ${group(task.answer, obj)} in den Korb.`
    case 'plus':   return `${group(task.a, obj)} und ${group(task.b, obj)}. Wie viele zusammen?`
    case 'listen': return 'Hör gut zu! Wie oft?'
  }
}

export function cheerText(answer) {
  const word = numberWord(answer)
  return `Super! ${word[0].toUpperCase()}${word.slice(1)}!`
}
