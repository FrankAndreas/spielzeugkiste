# Kids Game Suite — Design Spec
**Date:** 2026-05-16  
**Status:** Approved

---

## 1. Overview

A self-hosted web-based game suite for children aged 5–8. Three initial games with themed content, designed for touch-first use on an iPad, with laptop/browser as a fallback. Hosted on a Synology NAS as static files. All content is bundled at install time — no runtime LLM or backend required. UI and all text is in German with Text-to-Speech support throughout.

**Initial games:**
1. Memory (Paare finden)
2. Unterschiede finden (10 Unterschiede)
3. Ausmalen (Ausmalbild)

**Future games (not in scope now):** early maths, reading challenges.

---

## 2. Tech Stack

| Concern | Choice | Reason |
|---|---|---|
| Framework | Vue 3 + Vite | Component model suits a game suite; builds to static files |
| Router | Vue Router | SPA navigation between games and themes |
| State | Pinia | Shared state (selected theme, TTS preferences) |
| TTS | Web Speech API (`de-DE`) | No external dependency; works in Safari (iPad) and Chrome |
| Coloring engine | SVG named regions | Instant tap-to-fill, scales perfectly, thousands of free SVGs available |
| Deployment | Static `dist/` folder | Copied directly to NAS web folder; no server-side logic |

---

## 3. Visual Style

**Bubbly & Playful** — bright candy colours, rounded shapes, large bouncy buttons. Optimised for touch targets appropriate for 5–8 year olds.

- Primary accent: `#FF6B6B` (coral red)
- Secondary: `#FFD93D` (yellow), `#6BCB77` (green), `#4D96FF` (blue)
- Background: `#fff9f0` (warm white)
- All interactive targets minimum 44×44px
- No hover-only interactions

---

## 4. Navigation & Shell

```
/ (Home)
  /:game (Theme selection)
    /:game/:theme/play (Game play screen)
/setup (Hotspot editor — hidden from kids)
```

- Home screen: grid of game cards, each with emoji, name, short description
- Theme selection: grid of theme thumbnails; game-specific options (e.g. difficulty for Memory) shown below
- Every screen: 🔊 TTS button in header reads current context in German; ← back button
- No login, no accounts, no tracking

---

## 5. Content Model

All content lives in `public/content/` as static files. The app loads a `games.json` index at startup listing available games and their themes. Adding a new theme = create a folder + write a `theme.json` + add images. No code changes required.

### Directory structure

```
public/content/
├── games.json                  ← index of all games + theme lists
├── memory/
│   └── tiere/
│       ├── theme.json
│       └── images/             ← card images (jpg/png)
├── differences/
│   └── bauernhof/
│       ├── theme.json          ← includes hotspot coordinates
│       ├── original.jpg
│       └── modified.jpg
└── coloring/
    └── tiere/
        ├── theme.json
        └── svgs/               ← one SVG per coloring page
```

### theme.json schemas

**Memory**
```json
{
  "name": "Tiere",
  "tts": "Willkommen beim Tier-Memory! Finde alle Paare.",
  "gridSize": "4x4",
  "pairs": [
    { "id": "lion", "image": "images/lion.jpg", "label": "Löwe", "tts": "Löwe" }
  ]
}
```

**Differences**
```json
{
  "name": "Bauernhof",
  "tts": "Finde die 10 Unterschiede zwischen den zwei Bildern!",
  "original": "original.jpg",
  "modified": "modified.jpg",
  "hotspots": [
    { "id": 1, "x": 0.23, "y": 0.45, "r": 32 }
  ]
}
```
Coordinates are 0–1 fractions of image dimensions. The `r` value (radius in px at natural image size) is scaled at runtime — hotspots near the edge grow automatically (up to 1.9× at the very edge) to compensate for imprecise tapping.

**Coloring**
```json
{
  "name": "Tiere",
  "tts": "Wähle eine Farbe und male das Bild aus!",
  "pages": [
    { "id": "lion", "svg": "svgs/lion.svg", "label": "Löwe", "tts": "Der Löwe" }
  ]
}
```

---

## 6. Game Designs

### 6.1 Memory

- Grid of face-down cards; tap to flip
- Two matching cards: both go green, TTS speaks the item name
- Two non-matching cards: flip back after 1 second
- Progress shown as filled dots at the bottom
- Difficulty selector on theme screen: Leicht (3×4), Mittel (4×4), Schwer (4×6). The `gridSize` field in `theme.json` sets the default; the user can override it per play session on the theme screen.
- Completion: confetti animation + TTS "Toll gemacht! Alle Paare gefunden!"
- Cards support both photo images and emoji (theme.json decides)

### 6.2 Unterschiede finden

- Two images displayed side by side (iPad landscape recommended for this game)
- Tap/click a difference on the **modified** (right) image only → red circle appears, TTS names the difference
- Wrong tap → image shakes briefly
- Counter: `X / 10 gefunden` shown in header
- 💡 Tipp button: briefly flashes a yellow hint circle on the next unfound difference
- Progress shown as dots at the bottom
- Completion: celebration animation + TTS "Super! Alle Unterschiede gefunden!"
- Images are prepared ahead of time using GenAI; hotspot positions defined via the Hotspot Editor

### 6.3 Ausmalen

- SVG displayed in a flexible canvas area (takes all space between header and palette)
- Page selector strip (scrollable) lets the kid switch between pages in the theme
- Colour palette pinned at the bottom — always visible, never requires scrolling
- Tap any `data-region` shape → fills with selected colour
- Pinch-to-zoom (touch) / scroll-wheel zoom (mouse) + single-finger/drag pan when zoomed
- Zoom resets via "Zoom zurück" button; zoom level shown as a badge while zooming
- Undo (↩) and "Alles löschen" buttons in palette toolbar

---

## 7. Hotspot Editor (`/setup`)

A standalone developer/parent tool (dark UI, clearly separate from the kids' app) for defining hotspot positions on Differences game images.

### Interaction modes (keyboard shortcuts)
| Key | Mode | Cursor | Action |
|-----|------|--------|--------|
| `P` | Place | crosshair | Click anywhere on image → places a new hotspot |
| `M` | Move | move/grabbing | Click + drag → repositions nearest hotspot |
| `S` | Scale | ew-resize | Click + drag right/left → grows/shrinks nearest hotspot radius |
| `Del` | — | — | Deletes selected hotspot |
| `Ctrl+Z` | — | — | Undo |
| `Ctrl+Y` | — | — | Redo |

### Edge scaling (visual only in editor, applied at runtime in game)
Hotspots within 12% of any image edge display up to 1.9× larger with an orange dashed ring. This reflects the runtime behaviour where edge hotspots have a proportionally larger tap target to compensate for imprecise touches near borders.

### Output
Live JSON preview updates as hotspots are placed/moved/scaled. "Kopieren" copies the JSON to clipboard for pasting into `theme.json`.

---

## 8. Text-to-Speech

- Uses `window.speechSynthesis` (Web Speech API), language `de-DE`
- Every screen has a context TTS string defined in `theme.json`
- 🔊 button always visible in the header; speaks the current screen's TTS string
- In-game TTS: Memory speaks item name on match; Differences speaks difference name on find; Coloring speaks page label on page change
- No external API or network call — fully offline

---

## 9. Image & Asset Sources

| Game | Source |
|------|--------|
| Memory cards | Free/open-licensed (OpenClipart, Unsplash, etc.) |
| Differences pairs | GenAI-generated ahead of time; modified outside the app |
| Coloring SVGs | Free SVG coloring pages (OpenClipart, etc.); SVGs must have `data-region` attributes on fillable shapes |

---

## 10. Deployment

1. `npm run build` → produces `dist/`
2. Copy `dist/` to NAS web folder (e.g. via rsync or SCP)
3. Serve with any static file server (Nginx, Apache, or Synology's built-in web server)
4. No environment variables, no server-side logic, no database

Add `.superpowers/` to `.gitignore`.

---

## 11. Future Scope (not in this phase)

- Upload new themes via an admin page (no re-deploy needed)
- Early maths game (counting, simple addition)
- Reading challenge game
- Progress tracking per child (localStorage, no server)
- Offline PWA mode (service worker caching)
