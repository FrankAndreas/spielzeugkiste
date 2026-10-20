# Zahlen (early math) for Spielzeugkiste — Design

**Date:** 2026-10-20
**Status:** Awaiting approval

## Why

The user's daughter (kindergarten age) counts to about 20 and recognises the single digits 0–9.
**She counts on her fingers, even when she sees a "5".** She loves princesses and unicorns, Elsa
("Eisprinzessin"), the film *Sing*, Feuerwehrmann Sam, ballet and music.

We want a first educational game that practises counting and early adding with the things she
loves. It should work the way she already counts: by pointing at things and using fingers.

This is a first version. **She will test it and give feedback**, so it should be small enough to
change easily rather than complete. Handwriting with the Edurino pen is a separate, later project.

## Goals

- A new game **"Zahlen" 🔢** with its own tile and theme picker, like the other games.
- Two levels, chosen on the theme screen the way Pac-Man chooses its Tempo:
  **"Bis 9"** for amounts 0–9 and **"Bis 20"** for amounts up to 20. Passed as `?level=9` or `?level=20`.
- One session is **6 tasks** with mixed round types, starting easy, then "Super!".
- Every task is asked aloud through `speak()`. She never has to read anything except digits.
- Everything works by tapping on the iPad.

### Round types

1. **Zählen:** "Wie viele Erdbeeren?" A set of objects is shown. Tapping an object marks it with
   a glow, and the app says the next number ("eins", "zwei" …), like pointing with a finger.
   Tapping a marked object does nothing. Then she picks the answer.
2. **Würfel:** a die face is shown and the app asks "Wie viele Punkte?". "Bis 9" uses one die
   (1–6). "Bis 20" uses two dice, so the total is 2–12. Dots can be tapped and counted like objects.
3. **Mengen legen:** a big digit is shown and the app says "Leg 5 Erdbeeren in den Korb". Tapping
   an object in the supply row moves it into the basket and says its count. Tapping an object in
   the basket puts it back. A big ✓ button checks the answer.
4. **Plus:** two groups are shown with a "+" between them. The app says "3 Erdbeeren und 2
   Erdbeeren. Wie viele zusammen?". Objects can be tap-counted across both groups. Then she picks
   the answer. "Bis 9" keeps the total at 9 or below; "Bis 20" keeps it at 20 or below.
5. **Hören:** "Hör gut zu! Wie oft?" A sound plays N times (N up to 9, and up to 10 for "Bis 20",
   because more beats get tedious). A big theme picture pulses with each beat. A 🔁 button plays
   the beats again. Then she picks the answer.

### Answers

- Pick-the-answer tasks offer **3 big buttons**: the right number and two near numbers, in random
  order and within the level's range.
- Each button shows the digit and, for 0–10, a **finger picture**: one hand for 0–5, two hands for
  6–10, with 5 always shown as a full hand. Above 10 the button shows only the digit.
- Tapping a button says its number aloud. This matters most in "Bis 20", where she can't read
  "14" yet.

### Showing amounts

- Up to 10 objects are spread loosely over the play area, without overlapping.
- More than 10 objects are laid out in **ten-frames (Zehnerfeld)**: rows of 5, filling one frame of
  10 before starting the next. So 14 looks like one full frame plus 4.

### Right and wrong

- **Right:** a short cheer ("Super! Fünf!"), a star fills in the progress row of 6 stars, then the
  next task.
- **Wrong:** never a buzzer, a red cross or a scolding. The app says "Hmm, zähl nochmal mit mir",
  counts every object aloud while highlighting each one, and then lets her pick again.
  For Hören, it plays the beats again and counts them aloud. The task only ends when she gets it
  right; a corrected answer fills the star too.
- After 6 tasks: "Super gemacht!" after the last speech plus the existing 800 ms pause, with buttons
  to play again or go home.

### Themes

All six themes ship with the first version. A theme only changes the pictures, the sound, the colours
and the words, never the math. Each theme is a content folder, so adding one later needs no code.

| Theme | Objects (examples) | Sound for Hören |
|---|---|---|
| Einhorn 🦄 | unicorns, rainbows, stars | sparkle |
| Prinzessin 👸 | crowns, gems, castles | bell |
| Eisprinzessin ❄️ | snowflakes, snowmen, ice | chime |
| Feuerwehr 🚒 | fire engines, helmets, extinguishers | siren beep |
| Ballett 🩰 | ballet shoes, bows, flowers | piano note |
| Musik 🎵 | microphones, drums, koala/pig "singers" | drum |

- Objects are emoji. Every object has German singular and plural forms for the speech: one
  "Einhorn", several "Einhörner".
- Sounds are short tones generated with Web Audio, so no audio files are needed.
- The themes are inspired by her favourites but contain no Disney or film artwork, names or logos.

## Non-goals

- Handwriting and the Edurino pen (a separate project).
- Edurino figure recognition.
- Subtraction, numbers above 20, written number words.
- Difficulty that adapts automatically, statistics, or saved progress.
- Drag-and-drop. Tapping is enough for the first version.

## Anti-goals (would make it a failure even if it works)

- She feels she failed: timers, lost lives, buzzers, red crosses, scolding speech.
- She has to read words to know what to do.
- A task she can't solve by counting: amounts out of her range, or objects too small to tap or
  too hidden to count.
- The speech of one task gets cut off by the next. Always wait for speech to end, as the other
  games do.

## How it fits into the existing app

- `public/content/games.json` gets a `zahlen` entry with the six theme ids.
- `public/content/zahlen/<theme>/theme.json` holds the theme data: name, intro tts, colours, the
  objects with their singular and plural forms, the basket emoji, and the Hören sound and picture.
- `ThemeSelectView.vue` gets the level picker for `zahlen`, built like Pac-Man's Tempo picker
  (`Bis 9 🖐`, `Bis 20 🙌`). Default: `Bis 9`.
- The router gets `/zahlen/:theme/play`.
- The math is pure, tested logic in `src/logic/`: building a session of tasks (with an injectable
  `random`), choosing answer options, and the ten-frame layout. The view only renders and speaks.
- German number words 0–20 for speech come from one small table. The browser's own reading of "5"
  is not reliable on every device.

## Calls made while writing this (not discussed with the user)

- 6 tasks per session, and the order of round types: the first task is always Zählen with a small
  amount.
- In Zählen, tapping a marked object again does nothing rather than unmarking it.
- In "Bis 9", Zählen also asks for 0 now and then ("Wie viele? Keine!"). It never asks for 0 in
  Würfel or Hören.
- Die faces use the standard pip layout. In "Bis 20", two dice are shown instead of bigger amounts.
- 3 answer choices, not 4, so there is less to look at.
- A wrong answer repeats the same task with the same amount, rather than moving on.
- Tapping instead of dragging in Mengen legen.

## Left to the builder

- Exact emoji, colours and German phrasings per theme, within the table above.
- The finger-hand drawing (inline SVG is fine), the animations, and the spacing of the loose layout.
- The Web Audio tone shapes.
- How the round types are mixed after the first task, as long as all of them appear over a few
  sessions.
