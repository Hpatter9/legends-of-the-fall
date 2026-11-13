# Heart rows (the run's lives as ten hearts)

The owner: "For the hearts, I want to see two rows of five up top. And when one is used, one fades to black."

## What it is

- The top bar's lives box (`#lives`, drawn by `Game.drawLives` in `src/main.ts`) holds a heart for each of the run's lives, five to a row:
  ten lives are two rows of five. The picture is the game's own heart (`src/art/ui/combat-heart.png`, the same `heartUrl`), drawn at
  20 px, so two rows with a 2 px gap fill the bar's 44 px row (the height of the sound, settings and speed medallions). The bar is no
  taller than it was. On a phone narrower than 380 px (360x780) they are 16 px: at 20 px the ten hearts (100 px, where the old heart
  and number took about 54) pushed a five-figure purse ("12500 gold") 14 px into the clock.
- A full heart is a life still held. A spent life is the same heart faded to black (`grayscale(1) brightness(0.14)` with a faint pale
  rim, so its shape still shows on the dark bar); it is never removed.
- Lives are spent from the end: the last heart of the last row goes first, so the full hearts stay together from the first one.
- A life spent: its heart flares (bright, a touch larger), shrinks and settles dark, 0.52 s (`HEART_FADE_MS`). When several go at
  once (the whole party fell, a life each) they fade one after another, last first, 110 ms apart (`HEART_STAGGER_MS`). Lives given back
  (a road event) turn full at once. Reduced motion: the hearts change at once.
- Three or fewer left (the low state): the full hearts glow amber now and then (2.4 s); with reduced motion the glow is steady.
- The number that stood beside the heart is gone (the hearts are the count, and the bar has no room for both at 360 px); the words
  stay on the box's tooltip and label: "N of 10 lives left. A fallen hero rises after 5 seconds for one life." The march orders' badge
  still sits after the hearts. Hidden where it always was (runs without lives: the Last Stand, the Calamity, the old tower).
- The hearts are kept from draw to draw (so one can fade where it stands) and made afresh only when the run's all changes.

The rules (rows, which hearts are full, which fade and when, the words) are pure, in `src/heartRowsRules.ts`, tested by
`test/heart-rows.test.ts`.

## How many lives a run can have

`livesMax(run)` (`src/sim/run.ts`) is `LIVES` (10) less `HEART_LIVES` (5) for each heart the orders take (`heartsLost`, `march.ts`):
only the Cursed march takes one, so a run has 10 lives, or 5 under a curse (one row of five). Nothing else changes the all: road
events (`spendLives`) spend or give back lives within it. The layout lays any number in rows of five regardless.

## The recap and the result card

The wave's card says "A life spent · N left" (or "3 lives spent · ...") with the same heart as its line's icon
(`battleNoteArt.ts`), the result's figures "Lives spent", and the recap's wave chips "♥N". Each is one heart beside words, an icon
for a line, not the bar's count, so nothing clashes; they are left as they were.

## Checks

`node tools/heart-rows/shots.mjs [width]` plays an army run in the built game at 393x852, 360x780 and 412x915 and writes to
`docs/samples/heart-rows/`: the bar with 10, 7, 3 and 0 lives in a fight, the deploy, the result card and the march between waves
(whole page), and filmstrips of one heart fading (`fade-one-*`) and five at once (`fade-five-*`), its animations paused and stepped
60 ms a frame. It fails if the hearts, the gold's words, the clock and the three medallions overlap, if the Version line lies over
the hearts, or if anything runs off the page; `checks.json` beside them has every box's place.
