// Where the ← button leads: one level up in the app, not back in the browser
// history (which, after menu → letter → menu, would lead to the letter again).

// Screens inside a game that sit below the game's own start screen (/<game>/play)
const SUB_SCREENS = ['name', 'letter', 'words', 'draw']

export function upPath(path) {
  const [game, second, third] = path.split('/').filter(Boolean)
  if (!game || !second) return '/'                             // home, or a game's theme selection
  if (SUB_SCREENS.includes(second)) return `/${game}/play`      // Schreiben letter, Malen picture, …
  if (third === 'play') return `/${game}`                       // a game with themes: back to the themes
  return '/'                                                    // a game's own start screen
}
