# Deutschschweizer Basisschrift — stroke order for Schreiben

The handwriting game (Schreiben) teaches capital letters and digits the way
Swiss schools do: the Deutschschweizer Basisschrift, the school script
of the German-speaking cantons, recommended by the D-EDK since 2015 and
taught from 1st grade.

## Sources

- Official reference — stroke order and direction. "Buchstabenvorlagen
  mit einem Haus" (house labels for 1st grade), basisschrift.ch →
  Materialien für Lehrpersonen:
  <https://www.basisschrift.ch/sites/default/files/6_2_1_buchst_vorlagen_hausetiketten_0.pdf>
  Every letter and digit in the "Schreibhaus" lines, with numbered arrows.
  The table below is transcribed from it.
- Official font — letter shapes. DCH-Basisschrift (OTF/TTF),
  <https://www.basisschrift.ch/download>. Free for teaching in Switzerland,
  not for redistribution, so it is not in this repo.
  `scripts/letters/generate.py` derives the tracing paths from it.
- Overview for parents (alphabet and digits):
  <https://www.basisschrift.ch/sites/default/files/6_2_11_Luzerner%20Basisschrift_%C3%9Cbersicht%20f%C3%BCr%20Eltern_2019_01_24.pdf>
- Teaching material "Basilo" (Ingold-Biwa), documentation:
  <https://ingold-biwa.ch/fileadmin/Flyer/DE/Basisschrift_Dokumentation_2020.pdf>.
  Its A is written in three strokes from the tip. The official house labels
  write it in one stroke up and down plus the bar. We follow the official
  house labels.

## Lines ("Schreibhaus")

The game uses these units: cap height 100, a box 120 wide and 200 high,
and these lines:

| Line | y | Meaning |
|---|---|---|
| top | 40 | cap line: capitals and digits start here; the dots of Ä, Ö, Ü sit above it |
| middle | 90 | x-height |
| base | 140 | baseline |
| descender | 190 | bottom of the bottom band: G, J and Y reach down to it |

On screen the game shows the lines down to the bottom band, and space above
the cap line only for words with dots.

Capital letters are not joined. Between strokes the pen lifts
("Luftsprung").

## Stroke order

Numbers are the stroke order. "→" means one continuous stroke, without
lifting the pen. All of these are in the game.

| Glyph | Strokes |
|---|---|
| A | 1: bottom left → up to the tip → down to bottom right · 2: bar, left → right |
| B | 1: down · 2: top left → right → upper bowl → lower bowl → bottom left |
| C | 1: top right → anticlockwise round → bottom right |
| D | 1: down · 2: top left → right → bowl clockwise → bottom left |
| E | 1: down → along the baseline to the right · 2: top bar → · 3: middle bar → |
| F | 1: down · 2: top bar → · 3: middle bar → |
| G | 1: top right → anticlockwise round → up to the middle → stem down into the bottom band → hook to the left |
| H | 1: left line down · 2: right line down · 3: bar → |
| I | 1: down |
| J | 1: down into the bottom band → hook to the left |
| K | 1: down · 2: top right → slant down to the line → slant down to the right |
| L | 1: down → along the baseline to the right |
| M | 1: bottom left → up → down to the middle → up → down |
| N | 1: left line down · 2: top left → slant down → right line up |
| O | 1: top → anticlockwise round → top |
| P | 1: down · 2: top left → right → bowl → middle of the line |
| Q | 1: like O · 2: tail down to the right (the number is not legible on the label; the game makes the tail stroke 2) |
| R | 1: down · 2: top left → bowl → middle of the line → leg down to the right |
| S | 1: top right → anticlockwise → clockwise → bottom left |
| T | 1: down · 2: top bar → |
| U | 1: top left → down → round → up → right line down |
| V | 1: top left → down → up to top right |
| W | 1: top left → down → up → down → up |
| X | 1: top left → bottom right · 2: top right → bottom left |
| Y | 1: top left → down → round → up → stem down into the bottom band → hook to the left |
| Z | 1: top bar → → slant down to the left → bottom bar → |
| Ä, Ö, Ü | the letter, then the left dot, then the right dot (each a tap) |
| 0 | 1: top → anticlockwise round → top |
| 1 | 1: from the flag up to the top → down |
| 2 | 1: top left → clockwise over the top → slant down to the left → along the baseline → |
| 3 | 1: top left → upper bow clockwise → middle → lower bow → bottom left |
| 4 | 1: top → slant down to the left → bar → · 2: the line down from the top |
| 5 | 1: top left down to the middle → bow clockwise → bottom left · 2: top bar → |
| 6 | 1: top right → anticlockwise down → round the loop → closing at the left |
| 7 | 1: top bar → → slant down to the left · 2: middle bar → |
| 8 | 1: top → anticlockwise → down through the middle → round the bottom → up through the middle → top |
| 9 | 1: top right → anticlockwise round the loop → back to the top right → stem down → small hook to the left |

## Adding a glyph

1. Look up its strokes in the house labels above, and add its row here.
2. Add its waypoints to `GLYPHS` in `scripts/letters/generate.py`, in
   stroke order, starting where the pen starts.
3. Download the font and run
   `python3 scripts/letters/generate.py path/to/DCH-Basisschrift.ttf preview.png`.
   It fails if a waypoint is off the letter, or if part of the letter is
   left out. Check `preview.png`: numbered dots mark where each stroke
   starts, squares where it ends.
4. Add how it is spoken (`SAY` in `src/logic/letters.js`), and its stroke
   count and directions to `src/logic/letters.test.js`.

## Words

The words to write are edited in the game (⚙️ Wörter in Schreiben) and kept
on the device. Only words that are switched on appear, and the letter
buttons are the letters of those words. Until the list is changed, the
defaults in `public/content/schreiben/words.json` apply. Keeping one list
for all devices on the NAS: GitHub issue #1.
