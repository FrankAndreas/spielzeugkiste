import { DIRS, isOpposite } from './direction.js'

// The maze of the old page: W wall, . dot, * power-up, P player start,
// G monster start, space open without a dot. Row 9 is the tunnel.
export const MAZE = [
  'WWWWWWWWWWWWWWWWWWW',
  'W........W........W',
  'W*WW.WWW.W.WWW.WW*W',
  'W.................W',
  'W.WW.W.WWWWW.W.WW.W',
  'W....W...W...W....W',
  'WWWW.WWW W WWW.WWWW',
  '   W.W   G   W.W   ',
  'WWWW.W WW WW W.WWWW',
  '       G G G       ',
  'WWWW.W WWWWW W.WWWW',
  '   W.W   G   W.W   ',
  'WWWW.W WWWWW W.WWWW',
  'W........W........W',
  'W.WW.WWW.W.WWW.WW.W',
  'W*.W.....P.....W.*W',
  'WW.W.W.WWWWW.W.W.WW',
  'W....W...W...W....W',
  'W.WWWWWW.W.WWWWWW.W',
  'W.................W',
  'WWWWWWWWWWWWWWWWWWW',
]

// Tiles per second; the player always outruns the monsters
export const SPEEDS = {
  langsam: { player: 4, monster: 2.5 },
  mittel:  { player: 5, monster: 3.5 },
  schnell: { player: 6, monster: 4.5 },
}
export const SCORES    = { dot: 10, power: 50, monster: 200 }
export const LIVES     = 5
export const SCARED_MS = 6000

const MONSTERS = 4          // one per theme sprite
const HIT      = 0.6        // tiles between centres that count as touching
const SLICE    = 1000 / 60  // ms per simulation step, small enough not to miss a touch
const MAX_DT   = 100        // ms simulated per update at most

const ORDER = ['up', 'down', 'left', 'right']
const key   = (x, y) => `${x},${y}`

function actor(x, y, speed) {
  return { x, y, dir: 'up', progress: 0, start: { x, y }, speed, scared: false }
}

/** A new game on the given maze rows at a speed from SPEEDS. */
export function createGame(maze, speed) {
  const s = SPEEDS[speed] ?? SPEEDS.langsam
  const game = {
    cols: maze[0].length, rows: maze.length,
    walls: new Set(), dots: new Set(), powers: new Set(),
    total: 0, eaten: 0, halfDone: false,
    player: null, monsters: [], wish: null,
    lives: LIVES, score: 0, scaredMs: 0, over: false, cleared: false,
  }
  maze.forEach((row, y) => [...row].forEach((c, x) => {
    if (c === 'W') game.walls.add(key(x, y))
    if (c === '.') game.dots.add(key(x, y))
    if (c === '*') game.powers.add(key(x, y))
    if (c === 'P') game.player = actor(x, y, s.player)
    if (c === 'G' && game.monsters.length < MONSTERS) game.monsters.push(actor(x, y, s.monster))
  }))
  game.total = game.dots.size + game.powers.size
  return game
}

/** Continuous position of an actor in tiles, for drawing and touching. */
export function position(a) {
  return { x: a.x + DIRS[a.dir].x * a.progress, y: a.y + DIRS[a.dir].y * a.progress }
}

/**
 * The player's wish. A reversal applies at once, even between tiles; any
 * other turn waits for the next tile where that way is open.
 */
export function setDirection(game, dir) {
  const p = game.player
  if (p.progress > 0 && isOpposite(dir, p.dir)) {
    p.x = wrapX(game, p.x + DIRS[p.dir].x)
    p.y += DIRS[p.dir].y
    p.dir = dir
    p.progress = 1 - p.progress
    game.wish = null
  } else {
    game.wish = dir
  }
}

const wrapX = (game, x) => (x + game.cols) % game.cols

function open(game, x, y, dir) {
  const ny = y + DIRS[dir].y
  if (ny < 0 || ny >= game.rows) return false
  return !game.walls.has(key(wrapX(game, x + DIRS[dir].x), ny))
}

/**
 * Advances the game by dtMs (at most MAX_DT) in small slices and returns what
 * happened: 'dot', 'power', 'caught', 'life-lost', 'half', 'cleared', 'game-over'.
 */
export function update(game, dtMs, random = Math.random) {
  const events = []
  let left = Math.min(dtMs, MAX_DT)
  while (left > 0 && !game.over && !game.cleared) {
    const slice = Math.min(SLICE, left)
    left -= slice
    game.scaredMs = Math.max(0, game.scaredMs - slice)
    if (!game.scaredMs) game.monsters.forEach(m => { m.scared = false })

    movePlayer(game, slice / 1000, events)
    if (game.cleared) break
    game.monsters.forEach(m => moveMonster(game, m, slice / 1000, random))
    if (touch(game, events)) break
  }
  return events
}

function movePlayer(game, dt, events) {
  const p = game.player
  let budget = p.speed * dt
  while (budget > 0) {
    if (p.progress === 0) {
      if (game.wish && open(game, p.x, p.y, game.wish)) p.dir = game.wish
      if (!open(game, p.x, p.y, p.dir)) return
    }
    const stepTo = Math.min(budget, 1 - p.progress)
    p.progress += stepTo
    budget -= stepTo
    if (p.progress >= 1) {
      p.x = wrapX(game, p.x + DIRS[p.dir].x)
      p.y += DIRS[p.dir].y
      p.progress = 0
      eat(game, events)
      if (game.cleared) return
    }
  }
}

function eat(game, events) {
  const k = key(game.player.x, game.player.y)
  if (game.dots.delete(k)) {
    game.score += SCORES.dot
    events.push('dot')
  } else if (game.powers.delete(k)) {
    game.score += SCORES.power
    game.scaredMs = SCARED_MS
    game.monsters.forEach(m => { m.scared = true })
    events.push('power')
  } else {
    return
  }
  game.eaten++
  if (!game.halfDone && game.eaten * 2 >= game.total) {
    game.halfDone = true
    events.push('half')
  }
  if (game.eaten === game.total) {
    game.cleared = true
    events.push('cleared')
  }
}

// Monsters wander: at each tile they pick a random open way, turning back
// only at a dead end. Scared ones move at half speed.
function moveMonster(game, m, dt, random) {
  let budget = m.speed * (m.scared ? 0.5 : 1) * dt
  while (budget > 0) {
    if (m.progress === 0) {
      const ways = ORDER.filter(d => open(game, m.x, m.y, d))
      if (!ways.length) return
      const forward = ways.filter(d => !isOpposite(d, m.dir))
      const choices = forward.length ? forward : ways
      m.dir = choices[Math.floor(random() * choices.length)]
    }
    const stepTo = Math.min(budget, 1 - m.progress)
    m.progress += stepTo
    budget -= stepTo
    if (m.progress >= 1) {
      m.x = wrapX(game, m.x + DIRS[m.dir].x)
      m.y += DIRS[m.dir].y
      m.progress = 0
    }
  }
}

function reset(a) {
  a.x = a.start.x
  a.y = a.start.y
  a.dir = 'up'
  a.progress = 0
  a.scared = false
}

// Returns true when the player lost a life (the round restarts)
function touch(game, events) {
  const p = position(game.player)
  for (const m of game.monsters) {
    const q = position(m)
    if (Math.hypot(p.x - q.x, p.y - q.y) >= HIT) continue
    if (m.scared) {
      game.score += SCORES.monster
      reset(m)
      events.push('caught')
      continue
    }
    game.lives--
    events.push('life-lost')
    reset(game.player)
    game.monsters.forEach(reset)
    game.wish = null
    if (game.lives === 0) {
      game.over = true
      events.push('game-over')
    }
    return true
  }
  return false
}
