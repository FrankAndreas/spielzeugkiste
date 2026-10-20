# Snake & Pac-Man for Spielzeugkiste — Design

**Date:** 2026-10-20
**Status:** Awaiting approval

## Why

The kids already play two stand-alone pages on the NAS, `http://<NAS>/snake/` and
`http://<NAS>/pacman/` (sources in `~/work/games/{snake,pacman}/index.html`, not under git). They
play mostly on the **iPad**, and what they love about them are the **themes — unicorns and
princesses**. As they are, the pages don't fit the iPad well: Snake hides its arrow buttons on screens
≥ 768 px, so it can only be steered with a keyboard there; both load Tailwind and fonts from the
internet at runtime; neither speaks or looks like Spielzeugkiste.

Rebuild both as proper Spielzeugkiste games: touch-first, themed, spoken German, bundled with the app.

## Goals

- Snake and Pac-Man as two new games in Spielzeugkiste, each with its own tile on the home screen
  and a theme picker like the other games.
- Two themes each to start: **Einhorn** and **Prinzessin**. Adding a theme later means adding a
  content folder, not code.
- Playable on the iPad with a finger: big on-screen arrow buttons, plus swiping on the field.
  Arrow keys / WASD keep working on a laptop.
- Forgiving for children aged 5–8: slow by default, losing is friendly, never punishing.
- Short spoken German encouragement through the existing `speak()` service.
- A best score per game and theme, remembered on the device.

## Non-goals

- Keeping the old pages' Minecraft, Mario and Pokémon themes (can come back later as themes).
- The old Snake "level editor" (field size, item count, wall mode) as a menu — the kid-friendly
  settings are fixed instead (see below).
- Multiple Pac-Man levels / mazes, sound effects or music, online high scores.
- Removing the old pages from the NAS (that's for the user to do once happy).

## Anti-goals (would make it a failure even if it works)

- A child gets stuck because something only works with a keyboard.
- Harsh losing: "ABSTURZ!", game-over screens that feel like a punishment, or speech that scolds.
- Anything loaded from the internet at runtime (Tailwind CDN, Google Fonts).
- Too fast to steer for a 5-year-old at the default setting.

## Decisions made with the user

- Rebuild as proper Spielzeugkiste games (not iframes of the old pages).
- iPad first.
- Themes: Einhorn and Prinzessin.
- The gameplay proposals below were shown to the user and accepted ("fine so far").

### Snake

- **Field:** small grid (15 × 15), the snake starts slow and speeds up only a little per item, with a
  low top speed.
- **Edges wrap:** leaving the field on one side brings the snake in on the other — no wall crashes.
  Running into its own body ends the round.
- **Losing:** a friendly end card — "Oh! Nochmal?" with the number of collected items and a big
  "Nochmal" button; spoken the same.
- **Controls:** four large arrow buttons below the field, always visible (also on the iPad); swiping
  on the field; arrow keys / WASD.
- **Themes:** Einhorn — rainbow-coloured snake, collects stars and hearts. Prinzessin — pink snake,
  collects crowns and gems.
- **Speech:** short cheers at milestones (e.g. every 5 items: "Toll, schon 10 Herzen!"), not on
  every item.

### Pac-Man

- **Maze:** the existing 19 × 21 maze from the old page (`LEVEL` in `pacman/index.html`), including
  the tunnel row; monsters move randomly at junctions as today.
- **Controls:** swiping (as today) plus the same arrow buttons; arrow keys / WASD.
- **Themes:** Einhorn — the unicorn 🦄 with sweets and magic doughnuts as power-ups (today's game).
  Prinzessin — a princess collecting gems, a crown as power-up.
- **Speed:** one combined choice **"Langsam / Mittel / Schnell"** that sets both the player's and the
  monsters' speed (decided with the user). It replaces the old page's two controls (monster
  buttons Einfach/Normal/Schwer and the player slider up to "Turbo"); Turbo is dropped. At every
  setting the player is somewhat faster than the monsters, so escaping is always possible; speeds
  divide evenly into the tile size so turning at junctions stays exact. Default is **"Langsam"**.
  Chosen on the theme screen or before starting (builder's call).
- **Lives:** 5 instead of 3. Losing the last one gives the same friendly "Oh! Nochmal?" card.
- **Speech:** cheers at halfway ("Super, schon die Hälfte!") and on clearing the maze ("Geschafft!"
  with the win overlay, like the other games — after the previous announcement, see
  `speak()` resolving when speech ends).

### Both

- Everything bundled with the app (no CDN, no web fonts); same stack as the other games
  (Vue 3 views under `src/views/games/`, pure logic in `src/logic/` with Vitest tests).
- Best score per game and theme in `localStorage` (as `CheeseGame.vue` does for its save), wrapped so
  a missing or blocked storage never breaks the game.

## How it fits into the existing app

- `public/content/games.json`: two new entries (`snake`, `pacman`) with name, emoji, colour, tts and
  `themes: ["einhorn", "prinzessin"]`.
- `public/content/{snake,pacman}/{einhorn,prinzessin}/theme.json`: name, tts, colours, the sprites
  (snake head/body colours, item images; player, monsters, dots, power-up) and item names for the
  spoken cheers. The Memory "Einhorn & Prinzessin" theme already has SVGs for unicorn, princess,
  crown, heart, diamond and star (`public/content/memory/einhorn/images/`) that can be reused or
  copied.
- `src/router/index.js`: `/snake/:theme/play` and `/pacman/:theme/play`, lazy-loaded like the others.
- The existing `ThemeSelectView`, `AppHeader`, `speak()` and the content store are reused.
- Game loops must stop when the view unmounts or the app goes to the background
  (`visibilitychange`), and pause rather than run on while the end card or win overlay is shown.

## Calls made while writing this (not discussed with the user)

- **Scores:** Snake counts collected items. Pac-Man keeps today's points (dots, power-ups, caught
  monsters). The best score is kept per game and theme, not per speed.
- **After winning Pac-Man:** the win overlay offers "Nochmal", which restarts the same maze with full
  lives and a fresh score.
- **Mixed items in cheers:** each theme names its items collectively for the spoken milestones
  (e.g. Einhorn: "Schon 10 Schätze!"), since a theme collects two kinds of items.

## Left to the builder

- Rendering technique (canvas vs. DOM/SVG), as long as it stays smooth on an iPad and crisp at any
  size; the field scales to the screen in both orientations.
- Exact speeds, speed-up per item, milestone spacing, the wording of cheers.
- Layout in landscape vs. portrait (e.g. arrow buttons beside the field in landscape).
- Exact look of the arrow buttons and of the Prinzessin theme's sprites.
- Whether difficulty is picked on the theme screen (like Memory's grid size) or on a start card.
- How Pac-Man's monsters show the "scared" state in each theme.
