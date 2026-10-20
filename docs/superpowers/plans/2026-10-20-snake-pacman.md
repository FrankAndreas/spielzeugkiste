# Snake & Pac-Man Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Snake and Pac-Man to Spielzeugkiste as touch-first, themed (Einhorn, Prinzessin) games with spoken German.

**Architecture:** Each game is a pure, tested logic module in `src/logic/` (state + `step`/`update` functions, no DOM) and a Vue view in `src/views/games/` that renders the state on a `<canvas>`, drives it with a shared `requestAnimationFrame` loop, and takes input from a shared arrow pad, swipes and keys. Themes are content (`public/content/<game>/<theme>/theme.json`) with emoji sprites and colours, like the old pages.

**Tech Stack:** Vue 3 (`<script setup>`), Vue Router (hash), Pinia content store, Vitest + jsdom, Web Speech API via `src/services/tts.js`.

**Spec:** `docs/superpowers/specs/2026-10-20-snake-pacman-design.md`

## Global Constraints

- Nothing loaded from the internet at runtime: no CDN scripts, no web fonts.
- iPad first: every action works by touch; arrow keys and WASD also work on a laptop.
- All UI text and speech in German; speech only through `speak()` from `src/services/tts.js`.
- Losing is friendly: end card text "Oh! Nochmal?" plus the score, a big "Nochmal" button, spoken the same. Never "ABSTURZ" or scolding.
- Themes: `einhorn` and `prinzessin` for both games; adding a theme is a content folder only.
- Snake: 15 × 15 field, edges wrap, own body ends the round, slow start, small speed-up, low top speed.
- Pac-Man: the old 19 × 21 maze, random monsters, 5 lives, one speed choice "Langsam / Mittel / Schnell" (default Langsam) setting player and monsters, player always faster than monsters.
- Best score per game and theme in `localStorage`, never breaking the game when storage is unavailable.
- Game loops stop on unmount and pause while the page is hidden or an end/win card is shown.
- Match the surrounding code: aligned assignments, short comments only where needed, no semicolons.

## Review Focus

1. A child taps two arrows within one tick (e.g. moving up, taps ←, then ↓): the snake must never reverse into itself — test in Task 2.
2. The iPad sleeps or the tab is hidden mid-game: on return nothing teleports or dies — `update` substeps and clamps large `dt` (Task 4 test), the loop pauses on `visibilitychange` (Task 3).
3. Player and monster move towards each other between frames: they must collide, not pass through each other — test in Task 4.
4. Private browsing / blocked storage: the games still run and simply don't remember a best score — test in Task 1.
5. A small accidental finger movement while tapping the field must not turn the snake or unicorn — test in Task 1.

## File Structure

| File | Responsibility |
|---|---|
| `src/logic/direction.js` (+ test) | Direction vectors, opposite check, key → direction, swipe → direction |
| `src/services/bestScore.js` (+ test) | Read/write best score per game and theme, storage-safe |
| `src/logic/snake.js` (+ test) | Snake state, turning, stepping, items, tick speed |
| `src/logic/pacman.js` (+ test) | Maze parsing, movement, monsters, scoring, lives, events |
| `src/composables/useGameLoop.js` | rAF loop with `dt`, pause on hidden page, stop on unmount |
| `src/components/ArrowPad.vue` | Four big arrow buttons, emits `dir` |
| `src/views/games/SnakeGame.vue` | Snake view: canvas, input, speech, end card |
| `src/views/games/PacmanGame.vue` | Pac-Man view: canvas, input, speech, end and win cards |
| `src/views/ThemeSelectView.vue` | + speed picker for `pacman` |
| `src/router/index.js` | + two routes |
| `public/content/games.json` | + two games |
| `public/content/{snake,pacman}/{einhorn,prinzessin}/theme.json` | Theme content |

---

### Task 1: Direction helpers and best score

**Files:**
- Create: `src/logic/direction.js`, `src/logic/direction.test.js`
- Create: `src/services/bestScore.js`, `src/services/bestScore.test.js`

**Interfaces:**
- Produces:
  - `DIRS: { up: {x:0,y:-1}, down: {x:0,y:1}, left: {x:-1,y:0}, right: {x:1,y:0} }`
  - `isOpposite(a: string, b: string): boolean`
  - `keyToDirection(key: string): string | null` — `ArrowUp/w/W → 'up'` etc.
  - `swipeDirection(dx: number, dy: number, threshold = 24): string | null` — dominant axis; `null` when both `|dx|` and `|dy|` are below `threshold` (pixels)
  - `loadBest(game: string, theme: string): number` — 0 when missing or storage fails
  - `saveBest(game: string, theme: string, score: number): boolean` — stores only if higher, returns whether it is a new record; never throws. Key: `spielzeugkiste.best.<game>.<theme>`

- [ ] **Step 1: Write the failing tests**

```js
// direction.test.js
it('maps arrow keys and WASD', () => {
  expect(keyToDirection('ArrowLeft')).toBe('left')
  expect(keyToDirection('w')).toBe('up')
  expect(keyToDirection('D')).toBe('right')
  expect(keyToDirection('Enter')).toBeNull()
})
it('detects opposites', () => {
  expect(isOpposite('up', 'down')).toBe(true)
  expect(isOpposite('up', 'left')).toBe(false)
})
it('picks the dominant swipe axis', () => {
  expect(swipeDirection(60, 10)).toBe('right')
  expect(swipeDirection(-5, -40)).toBe('up')
})
it('ignores small finger movements', () => {
  expect(swipeDirection(10, -12)).toBeNull()
})

// bestScore.test.js — stub localStorage with an in-memory object per test
it('returns 0 without a stored score', () => expect(loadBest('snake', 'einhorn')).toBe(0))
it('stores only a higher score and reports a record', () => {
  expect(saveBest('snake', 'einhorn', 12)).toBe(true)
  expect(saveBest('snake', 'einhorn', 8)).toBe(false)
  expect(loadBest('snake', 'einhorn')).toBe(12)
  expect(loadBest('snake', 'prinzessin')).toBe(0)
})
it('keeps working when storage throws', () => {
  vi.stubGlobal('localStorage', { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') } })
  expect(loadBest('pacman', 'einhorn')).toBe(0)
  expect(saveBest('pacman', 'einhorn', 50)).toBe(true)
})
```

- [ ] **Step 2: Run** `npx vitest run src/logic/direction.test.js src/services/bestScore.test.js` — expected FAIL (modules missing).
- [ ] **Step 3: Implement both modules** with the signatures above.
- [ ] **Step 4: Run the same command** — expected PASS. Run `npm run lint` — no errors.
- [ ] **Step 5: Commit** `feat: add direction helpers and best-score storage`

---

### Task 2: Snake logic

**Files:**
- Create: `src/logic/snake.js`, `src/logic/snake.test.js`

**Interfaces:**
- Consumes: `DIRS`, `isOpposite` (Task 1)
- Produces:
  - `SIZE = 15`, `ITEMS_ON_FIELD = 2`
  - `createSnake(kinds: string[], random = Math.random): State` — snake of length 3 at the centre `(7,7),(7,8),(7,9)` heading `'up'`, `ITEMS_ON_FIELD` items placed; `State = { snake: {x,y}[], dir, nextDir, items: {x,y,kind}[], kinds, collected: 0, over: false }`
  - `turn(state, dir): void` — sets `nextDir` unless `dir` is opposite to `state.dir` (the direction of the last *step*, not `nextDir`)
  - `step(state, random = Math.random): 'ate' | 'crashed' | null` — applies `nextDir`, moves the head with wrap-around on all edges, ends the round (`over = true`) on hitting the body (the tail cell that moves away this step is free), grows and respawns an item when eating
  - `spawnItem(state, random): {x,y,kind} | null` — random free cell (not snake, not item); `null` when none is free
  - `tickMs(collected: number): number` — `Math.max(140, 260 - 6 * collected)`

- [ ] **Step 1: Write the failing tests** in `snake.test.js`:
  - `createSnake` → length 3 at the centre, heading up, 2 items not on the snake.
  - `turn(s, 'down')` while heading up → `nextDir` stays `'up'`; `turn(s, 'left')` → `'left'`.
  - **Rapid turns:** heading up, `turn(s,'left')`, `turn(s,'down')`, `step(s)` → head moved left, not down, `s.over === false`.
  - **Wrap:** head at `x: 0` heading left, `step` → head `x === 14`; same for top/bottom edges.
  - **Eating:** item placed directly ahead → `step` returns `'ate'`, length 4, `collected === 1`, still 2 items on the field.
  - **Crash:** snake of length 5 in a U shape so the head turns into its body → `step` returns `'crashed'`, `over === true`.
  - **Tail follows:** head moving into the cell the tail leaves this step → not a crash.
  - `spawnItem` on a field fully covered by the snake → `null`.
  - `tickMs(0) === 260`, `tickMs(10) === 200`, `tickMs(100) === 140`.
- [ ] **Step 2: Run** `npx vitest run src/logic/snake.test.js` — expected FAIL.
- [ ] **Step 3: Implement** `src/logic/snake.js` with the interfaces above.
- [ ] **Step 4: Run** — expected PASS; `npm run lint` clean.
- [ ] **Step 5: Commit** `feat: add snake game logic`

---

### Task 3: Snake game in the app

**Files:**
- Create: `src/composables/useGameLoop.js`, `src/components/ArrowPad.vue`, `src/views/games/SnakeGame.vue`
- Create: `public/content/snake/einhorn/theme.json`, `public/content/snake/prinzessin/theme.json`
- Modify: `public/content/games.json` (append), `src/router/index.js`

**Interfaces:**
- Consumes: Task 1 (`keyToDirection`, `swipeDirection`, `loadBest`, `saveBest`), Task 2 (all), `speak` (resolves when speech ends), `useContentStore().loadTheme('snake', theme)`
- Produces (reused by Task 5):
  - `useGameLoop(onFrame: (dtMs: number) => void): { start(): void, stop(): void, running: Ref<boolean> }` — rAF loop; `dtMs` capped at 100; pauses while `document.hidden` and resumes when visible if it was running; stops on component unmount.
  - `<ArrowPad @dir="(d: string) => …" :color="string" />` — four buttons ≥ 64 px in a cross, `pointerdown` (not `click`, for instant response), `touch-action: none`.
- Theme schema (snake):
  ```json
  { "name": "Einhorn", "tts": "Einhorn-Schlange! Sammle Sterne und Herzen.",
    "collective": "Schätze",
    "colors": { "bg": "#FFF0FA", "grid": "rgba(0,0,0,0.05)", "head": "#B39DDB",
                "body": ["#FF6B6B", "#FF9A3C", "#FFD93D", "#6BCB77", "#4D96FF", "#9B59B6"] },
    "face": "🦄", "items": ["⭐", "💖"] }
  ```
  Prinzessin: pink palette (`head` `#D02090`, `body` `["#FF69B4", "#FF82AB"]`), `face` `"👸"`, `items` `["👑", "💎"]`, `collective` `"Schätze"`, tts "Prinzessin-Schlange! Sammle Kronen und Edelsteine."
- `games.json` entry: `{ "id": "snake", "name": "Schlange", "emoji": "🐍", "description": "Sammle Schätze", "color": "#9B59B6", "shadow": "#6f3d87", "tts": "Willkommen bei der Schlange! Wähle ein Thema.", "themes": ["einhorn", "prinzessin"] }`
- Route: `{ path: '/snake/:theme/play', component: SnakeGame }` (lazy import like the others).

- [ ] **Step 1: Add content, route and games.json entry.** Run `npm test` — still PASS (games.json shape unchanged).
- [ ] **Step 2: Implement `useGameLoop` and `ArrowPad`.**
- [ ] **Step 3: Implement `SnakeGame.vue`.** Behaviour:
  - `AppHeader` with theme name and tts; score bar "⭐ n" and "Rekord: n" (from `loadBest`).
  - Square canvas, as large as fits above the arrow pad (portrait) or beside it (landscape); redraw on `resize`; draw with `devicePixelRatio` for crisp emoji. Body cells cycle through `colors.body`; head shows `face`; items draw their emoji.
  - Loop accumulates `dtMs` and calls `step` every `tickMs(collected)`.
  - Input: `ArrowPad`, swipe on the canvas (`pointerdown`/`pointerup` → `swipeDirection`), `keydown` → `keyToDirection`; all call `turn`.
  - Every 5 collected: `speak(\`Toll, schon ${n} ${theme.collective}!\`)`.
  - On `'crashed'`: stop the loop, `saveBest`, show the end card "Oh! Nochmal?" with "n Schätze" and, on a record, "Neuer Rekord!"; `speak('Oh! Nochmal?')`. "Nochmal" builds a fresh `createSnake` and starts the loop.
  - The round starts on the first input or a "Los!" button, so the snake doesn't move while the intro is spoken.
- [ ] **Step 4: Verify in the browser.** `npm run dev`, open `http://localhost:5173/#/snake`, play both themes in Chrome with the device toolbar set to iPad (portrait and landscape): arrows, swipes and keys steer; edges wrap; crashing shows the end card; the record survives a reload; switching tabs pauses. `npm test` and `npm run lint` clean.
- [ ] **Step 5: Commit** `feat: add Snake with Einhorn and Prinzessin themes`

---

### Task 4: Pac-Man logic

**Files:**
- Create: `src/logic/pacman.js`, `src/logic/pacman.test.js`

**Interfaces:**
- Consumes: `DIRS`, `isOpposite` (Task 1)
- Produces:
  - `MAZE: string[]` — the 21 rows of `LEVEL` copied verbatim from `~/work/games/pacman/index.html` (`W` wall, `.` dot, `*` power-up, `P` player start, `G` monster start, space = open, no dot; row 9 is the tunnel, open at both ends).
  - `SPEEDS = { langsam: { player: 4, monster: 2.5 }, mittel: { player: 5, monster: 3.5 }, schnell: { player: 6, monster: 4.5 } }` (tiles per second)
  - `SCORES = { dot: 10, power: 50, monster: 200 }`, `LIVES = 5`, `SCARED_MS = 6000`
  - `createGame(maze: string[], speed: keyof SPEEDS, random = Math.random): Game` — `Game = { cols, rows, walls: Set<string>, dots: Set<string>, powers: Set<string>, total, player: Actor, monsters: Actor[], lives, score, scaredMs, over, cleared }`; `Actor = { x, y, dir, progress, start: {x,y}, speed }` with `x, y` the tile last left and `progress` 0–1 towards the next tile; keys are `"x,y"`.
  - `setDirection(game, dir): void` — queues the player's wish; a reversal applies immediately (mid-tile), others at the next tile centre if open.
  - `position(actor): {x, y}` — continuous position, for rendering and collisions.
  - `update(game, dtMs, random = Math.random): string[]` — events from `'dot' | 'power' | 'caught' | 'life-lost' | 'half' | 'cleared' | 'game-over'`. Internally substeps in slices of at most `1000/60` ms and processes at most 100 ms per call. Player stops in front of walls; monsters pick a random open direction at each tile centre, never reversing unless at a dead end; tunnel wraps `x`. Collision when the continuous positions are closer than 0.6 tiles: scared monster → `'caught'`, score, back to its start, not scared; otherwise `'life-lost'`, everyone back to start (and `'game-over'`, `over = true` at 0 lives). While scared, monsters move at half speed. `'half'` fires once when the eaten dots and power-ups reach half of `total`; `'cleared'` (`cleared = true`) when none are left.

- [ ] **Step 1: Write the failing tests** in `pacman.test.js` (use small hand-made mazes where it keeps the test readable, e.g. `['WWWWW', 'WP..W', 'WWWWW']`):
  - `createGame(MAZE, 'langsam')` → 19 × 21, 4 monsters, 5 lives, `total` equals the number of `.` and `*`.
  - `SPEEDS` → player faster than monsters at every level.
  - Moving right along a corridor for 1000 ms at 4 tiles/s eats dots → `score` 10 per dot, events contain `'dot'`.
  - Player facing a wall stays at its tile centre (`progress === 0`).
  - Reversal mid-tile turns around immediately.
  - Tunnel: player leaving column 0 on the tunnel row appears at column 18.
  - **Large dt:** `update(game, 5000)` moves the player at most 100 ms worth (≤ 0.4 tiles at 4 tiles/s).
  - **No pass-through:** player and monster two tiles apart facing each other in a corridor, `update` in one 100 ms call → `'life-lost'`.
  - Power-up → `'power'`, `scaredMs === SCARED_MS`; touching a monster then → `'caught'`, `score` +200, monster back at its start.
  - Last life lost → `'game-over'`, `over === true`.
  - `'half'` fires exactly once; eating the last dot → `'cleared'`.
- [ ] **Step 2: Run** `npx vitest run src/logic/pacman.test.js` — expected FAIL.
- [ ] **Step 3: Implement** `src/logic/pacman.js`.
- [ ] **Step 4: Run** — expected PASS; `npm run lint` clean.
- [ ] **Step 5: Commit** `feat: add Pac-Man game logic`

---

### Task 5: Pac-Man game in the app

**Files:**
- Create: `src/views/games/PacmanGame.vue`
- Create: `public/content/pacman/einhorn/theme.json`, `public/content/pacman/prinzessin/theme.json`
- Modify: `public/content/games.json` (append), `src/router/index.js`, `src/views/ThemeSelectView.vue`

**Interfaces:**
- Consumes: Task 1, Task 3 (`useGameLoop`, `ArrowPad`), Task 4 (all), `speak`, content store.
- Theme schema (pacman):
  ```json
  { "name": "Einhorn", "tts": "Einhorn-Jagd! Sammle alle Bonbons.",
    "colors": { "bg": "#1e1b4b", "wall": "#a855f7", "dot": "#FF8FC8" },
    "player": "🦄", "monsters": ["🐉", "🦖", "🦈", "🐙"], "scared": "🥶", "power": "🍩" }
  ```
  Prinzessin: `colors` `{ "bg": "#4a1942", "wall": "#FF69B4", "dot": "#B9F2FF" }` (gems), `player` `"👸"`, `monsters` `["🐺", "🧙", "🕷️", "🐍"]`, `scared` `"😵"`, `power` `"👑"`, tts "Prinzessin-Jagd! Sammle alle Edelsteine."
- `games.json` entry: `{ "id": "pacman", "name": "Pac-Man", "emoji": "🍬", "description": "Sammeln und flitzen", "color": "#FF69B4", "shadow": "#c94a8c", "tts": "Willkommen bei der Jagd! Wähle ein Thema und wie schnell es geht.", "themes": ["einhorn", "prinzessin"] }`
- Route: `{ path: '/pacman/:theme/play', component: PacmanGame }`; speed from `route.query.speed` (`langsam` default when missing or unknown).
- `ThemeSelectView`: for `gameId === 'pacman'`, a "Tempo" picker like Memory's difficulty with `Langsam 🐢 / Mittel 🦄 / Schnell ⚡` (values `langsam/mittel/schnell`, default `langsam`), passed as `query: { speed }`.

- [ ] **Step 1: Add content, route, games.json entry and the speed picker.** `npm test` PASS.
- [ ] **Step 2: Implement `PacmanGame.vue`.** Behaviour:
  - Header with theme name; bar with score, lives as repeated `player` emoji, "Rekord: n".
  - Canvas keeps the maze's 19:21 ratio and fits beside/above the `ArrowPad`; walls as rounded blocks in `colors.wall`, dots as small circles in `colors.dot`, power-ups as the `power` emoji, monsters as their emoji or `scared` while `scaredMs > 0`.
  - Input as in Snake (pad, swipe on canvas, keys) → `setDirection`.
  - Starts on first input or "Los!". After `'life-lost'`: pause 1.5 s before continuing (`speak('Hoppla!')`).
  - `'half'` → `speak('Super, schon die Hälfte!')`. `'cleared'` → stop, `saveBest`, wait for the current speech to end, then show the win overlay "Geschafft!" with score and `speak('Geschafft!')`; "Nochmal" restarts with full lives and score 0 (same as `SnakeGame`'s pattern; skip if the view was left).
  - `'game-over'` → stop, `saveBest`, friendly end card "Oh! Nochmal?" as in Snake.
- [ ] **Step 3: Verify in the browser** as in Task 3, for both themes and all three speeds: Langsam is easy to steer by swipe and pad on an iPad-sized viewport, monsters are slower than the player, the tunnel works, the win overlay comes after the last announcement. `npm test`, `npm run lint`, `npm run build` clean.
- [ ] **Step 4: Commit** `feat: add Pac-Man with Einhorn and Prinzessin themes`
