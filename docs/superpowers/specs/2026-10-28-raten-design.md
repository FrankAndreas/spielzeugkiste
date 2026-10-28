# Rate mal! (guessing game for two iPads) — Design

**Date:** 2026-10-28
**Status:** Awaiting approval

## Why

The user's kids (about 7) want to play a "guess the secret figure" game against each other. They
sit across from each other, **each with their own iPad**. One asks out loud "Hat es Federn?", the
other answers "Nein", and the asking kid taps away the animals that no longer fit.

The questions and answers are spoken, so **the two iPads never need to talk to each other**. Each
iPad is simply one kid's board. The app stays static and offline, as the design spec
(`2026-05-16-kids-games-design.md`) requires: no server, no rooms, no network.

This is an original game in the deduction genre: our own name, our own animal sets from the
existing themes. It does not copy the board game *Guess Who? / Wer ist es?* (name, artwork, faces).

## Goals

- A new game **"Rate mal!"** (id `raten`) with its own tile and theme picker, like the other games.
- Two themes at the start: **Bauernhof** and **Meer**, each with exactly **24 animals** in a
  **6 × 4 grid** (iPad landscape).
- Three phases on one play screen (see the mockup at the end):
  1. **Pick:** "Wähle dein geheimes Tier! Verrat es nicht 🤫". All 24 animals are shown, and the kid
     taps one, which gets a blue frame (tapping another moves the frame). A big **"✓ Los geht's!"**
     button, shown once an animal is chosen, makes it their secret animal and starts the game.
  2. **Play:** the secret animal stays visible on the right as **"Dein Tier"**, so the kid doesn't
     forget it. Tapping an animal on the board greys it out; tapping it again brings it back.
     **"↩ Zurück"** undoes the last tap. A counter shows **"Noch N übrig"** (N = animals not greyed).
     **"🔄 Neues Spiel"** goes back to the pick phase with all animals shown again.
  3. **Guess:** **"🎯 Ich rate!"** puts the board in guess mode. The kid taps an animal and a dialog
     shows it big (greyed animals can't be guessed), with TTS reading **"Ist es die Katze?"** (article from the content). The other
     kid answers out loud, and the guessing kid taps:
     - **"🎉 Richtig!"**: a win overlay with 🎉, "Super! Erraten!" read aloud, and buttons
       "Nochmal" (back to pick) and home.
     - **"Falsch"**: the dialog closes, the guessed animal gets greyed out (undoable like any tap),
       and the game goes on.
     A guess mode that wasn't wanted can be left again (tap "Ich rate!" again, or "Abbrechen" in the
     dialog).
- The iPad of the kid who was guessed shows nothing special; that kid taps "Neues Spiel" too.
- The app **never checks** the kids' taps. It is a board for flipping, not a referee.

## Non-goals

- No connection between the two iPads, no server, no room codes.
- No solo game against the iPad (the user said "no single game for now"). That's why the content
  has **no list of features per animal**.
- No scores, turn tracking or "who's turn is it". The kids handle turns out loud.
- No saving a game across reloads.

## Anti-goals (would make it a failure even if it works)

- **Giving the secret away.** The secret animal's name must never be spoken by TTS, and the
  pick screen must not read names aloud on tap: the other kid sits right across.
- Fiddly controls: wrong taps must be easy to undo, all targets big (tiles fill the grid).
- Different boards on the two iPads: both must show the same 24 animals **in the same fixed order**
  (theme.json order, no shuffle), so the kids can compare and point.

## How it fits into the existing app

- **Content:** `public/content/raten/<theme>/theme.json`, listed in `games.json`:
  ```json
  {
    "name": "Bauernhof",
    "tts": "Rate mal! Wähle dein geheimes Tier.",
    "animals": [
      { "id": "kuh", "image": "../../memory/bauernhof/images/kuh.svg", "label": "Kuh", "the": "die Kuh" }
    ]
  }
  ```
  `the` is the name with its article, for "Ist es die Kuh?". Image paths are relative to the theme
  folder, as in Memory. Images **reuse the existing Memory SVGs** (emoji on a coloured tile) instead of copying them. New animals get new SVGs in the same
  style, in `public/content/raten/<theme>/images/`.
- **games.json:** a new entry `raten`, name "Rate mal!", emoji 🕵️, description "Geheimes Tier raten",
  its own colour/shadow pair, themes `["bauernhof", "meer"]`.
- **Route:** `/raten/:theme/play` → `RatenGame.vue`. `upPath` already handles it (← goes back to the
  theme picker). No options on the theme screen.
- **Logic:** a pure module `src/logic/raten.js` with tests (state for pick / play / guess, toggling,
  the undo history, the remaining count), like the other `src/logic/*` modules. The view stays thin.
- **Content test:** in `src/content.test.js`, each `raten` theme has a name, tts and exactly 24
  animals with unique ids, an image that exists on disk, a label and a `the` that ends with the label.
- **TTS:** `speak()` from `services/tts.js`. Spoken: the theme's intro on the pick screen, "Los
  geht's! Stell eine Frage." when the game starts, "Ist es …?" in the guess dialog, and the win text.

### Animals

**Bauernhof** (20 existing + 4 new): Kuh, Schwein, Schaf, Ziege, Hahn, Huhn, Küken, Ente,
Truthahn, Pferd, Hund, Katze, Maus, Hase, Igel, Frosch, Biene, Marienkäfer, Schnecke, Eule
+ new **Esel 🫏, Gans 🪿, Ratte 🐀, Schmetterling 🦋**.

**Meer** (19 existing + 5 new): Tropenfisch, Fisch, Kugelfisch, Hai, Wal, Delfin, Krake,
Tintenfisch, Krabbe, Hummer, Garnele, Schildkröte, Robbe, Otter, Pinguin, Flamingo, Krokodil,
Meerjungfrau, Muschel
+ new **Qualle 🪼, Koralle 🪸, Eisbär 🐻‍❄️, Seeschlange 🐍, Möwe 🐦**.

## Calls made while writing this (not discussed with the user)

- Name "Rate mal!" and id `raten` are placeholders, chosen to avoid the trademarked "Wer ist es?".
- "Falsch" greys out the guessed animal and the game continues.
- "Dein Tier" is always visible. The user didn't say whether the other kid peeking is a problem;
  if it is, a later version can hide it behind a tap.
- The new Meer animals (Qualle, Koralle, Eisbär, Seeschlange, Möwe) and that Meerjungfrau and
  Muschel count as "animals" here.
- Picking needs a "Los geht's!" tap, so a mis-tap on the pick screen doesn't start the game.
- Greyed animals can't be guessed.
- The newer emoji (🫏 🪿 🪼 🪸) need iOS 16.4 or later; check on the kids' iPads, swap the animal if not.
- Tapping a tile during play makes no sound and says nothing (it could give hints to the other kid).
- ← during a game leaves without asking, like the other games.

## Left to the builder

- Exact layout sizes so the 6 × 4 grid plus the side column fit an iPad landscape screen without
  scrolling, and a sensible fallback in portrait / on a laptop.
- How greyed tiles look (the mockup: grey, desaturated, 35 % opacity) and the selected tile frame.
- Animation details for greying out and the win overlay (Memory's win overlay is a fine model).

## Mockup

The mockup sent in chat (`mockup.png`) shows the three phases: pick (blue frame on the chosen
animal), play ("Dein Tier" card, "Noch 9 übrig", Zurück, Ich rate!, Neues Spiel), and the guess
dialog ("Ist es das Schaf?", Richtig! / Falsch).
