// One kid's board in "Rate mal!". Every function returns a new state and
// leaves the state as it is when the action doesn't fit the current phase:
// 'pick' (choosing the secret animal) → 'play' → 'guess' → 'won'.

export function newGame() {
  return { phase: 'pick', choice: null, secret: null, hidden: [], history: [], guess: null }
}

/** Marks the animal tapped on the pick screen; another tap moves the mark. */
export function choose(state, id) {
  return state.phase === 'pick' ? { ...state, choice: id } : state
}

/** "Los geht's!": the marked animal becomes the secret one. */
export function start(state) {
  if (state.phase !== 'pick' || !state.choice) return state
  return { ...state, phase: 'play', secret: state.choice }
}

function flip(hidden, id) {
  return hidden.includes(id) ? hidden.filter(h => h !== id) : [...hidden, id]
}

/** Greys an animal out, or brings it back. Remembered for undo. */
export function toggle(state, id) {
  if (state.phase !== 'play') return state
  return { ...state, hidden: flip(state.hidden, id), history: [...state.history, id] }
}

/** "Zurück": reverts the last tap. */
export function undo(state) {
  if (state.phase !== 'play' || !state.history.length) return state
  const id = state.history.at(-1)
  return { ...state, hidden: flip(state.hidden, id), history: state.history.slice(0, -1) }
}

export function remaining(state, ids) {
  return ids.filter(id => !state.hidden.includes(id)).length
}

/** "Ich rate!": the next tap on the board picks the guess. */
export function startGuess(state) {
  return state.phase === 'play' ? { ...state, phase: 'guess', guess: null } : state
}

/** Only animals still on the board can be guessed. */
export function pickGuess(state, id) {
  if (state.phase !== 'guess' || state.hidden.includes(id)) return state
  return { ...state, guess: id }
}

export function cancelGuess(state) {
  return state.phase === 'guess' ? { ...state, phase: 'play', guess: null } : state
}

/** What the other kid said. A wrong guess is greyed out like a tap, so undo brings it back. */
export function answer(state, right) {
  if (state.phase !== 'guess' || !state.guess) return state
  if (right) return { ...state, phase: 'won' }
  return toggle({ ...state, phase: 'play', guess: null }, state.guess)
}
