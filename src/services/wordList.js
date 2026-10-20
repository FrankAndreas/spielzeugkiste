// The words for Schreiben, kept on this device (localStorage). Until the
// parent changes them, the defaults from content/schreiben/words.json apply.
// Sharing one list across devices: GitHub issue #1.
import { GLYPHS } from '../logic/letters.js'

const KEY = 'spielzeugkiste.schreiben.words'
export const MAX_LENGTH = 12   // more doesn't fit on one row

export function normalizeWord(text) {
  return text.trim().toUpperCase()
}

/** Why a word can't be added: 'empty', 'letters', 'too-long', 'exists', or null if it can. */
export function checkWord(word, list) {
  if (!word) return 'empty'
  if (![...word].every(c => GLYPHS[c])) return 'letters'
  if (word.length > MAX_LENGTH) return 'too-long'
  if (list.some(w => w.word === word)) return 'exists'
  return null
}

/** The words as [{ word, on }], and whether this device can keep changes. */
export async function loadWords() {
  let raw   = null
  let saved = null
  let kept  = true
  try {
    raw = localStorage.getItem(KEY)
  } catch {
    kept = false   // private mode or blocked: changes last until the page reloads
  }
  try {
    saved = JSON.parse(raw)
  } catch {
    // A damaged list: fall back to the defaults
  }
  if (Array.isArray(saved)) return { words: saved, kept }
  const res = await fetch('/content/schreiben/words.json')
  const { words } = await res.json()
  return { words: words.map(word => ({ word, on: true })), kept }
}

/** Saves the words on this device; false if the browser keeps nothing. */
export function saveWords(words) {
  try {
    localStorage.setItem(KEY, JSON.stringify(words))
    return true
  } catch {
    return false
  }
}
