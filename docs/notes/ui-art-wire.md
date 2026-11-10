# UI-ART-WIRE: four sets of the owner's painted UI art, wired in

Branch `claude/ui-art-wire`, from main 0.469.0; one commit per set. The version is unchanged. Before and after shots at 393x852,
360x780 and 412x915 are in `docs/samples/ui-art-wire/` (the "before" shots come from a build of main).

Every piece was checked before it was used:
- its canvas against its prompt;
- a transparent background, no baked-in ground;
- its states lined up pixel for pixel (the alpha masks compared);
- its look on a grey ground.

All four sets passed. **No piece was kept as a stand-in.** One flaw was fixed in the cut (the duel fills' edges, below), and is worth a
repaint.

## 1. The rune bench (`art/rune-bench`, the ten-piece set)

- **The files.** The ten newer pieces (`docs/notes/rune-bench-art-prompts.md`) sit beside the seven earlier ones. Each newer piece has
  the prompt's canvas: the grips 64 x 208, the tray 384 x 160, the tiles 128 x 96, the sockets and the Auto medallions 96 x 96. As the
  director guessed, the painter saved the newer resting grip as **`grip-rest.png`** and left `grip.png` the earlier 64 x 224 one.
  `tools/rune-bench/import-art.py` now has `ALIASES` (`grip`: `grip.png` if it has the newer canvas, else `grip-rest.png`). So every newer
  piece wins, and the earlier seven are fallbacks no slot needs now.
- **The states**: the grip resting and held, the three tiles, the two sockets, and the open and locked Auto. Each set lines up exactly
  (0 pixels of their alpha masks differ).
- **New in the game**: the **socket** (a copper ring) and the **twin-ready socket** (a gold one) round each stone, and the **open rune Auto
  medallion**. They replace the last stand-ins: the painted orbs of `paintedButtons.css` and the auto-place medallion. The newer grip, tray,
  tiles and locked Auto replace the earlier pieces.
- **Fit**: the tiles' painted corners are drawn at 9 to 10 px on the one-row bench's 40 px tiles (BATTLE-POLISH). The socket fills most of a
  tile and the frame shows round it. The pull bar is the newer grip, centred on the bench.
- Shots: `runes-{before,after}-<w>.png` (the rune side with seven runes), `runes-auto-open-after-393.png` (rune Auto unlocked, which a
  fresh save cannot reach: its lock class removed in the page), `grip-after-<w>.png` (the hero side and the grip).

## 2. The Auto ultimates button (`art/battle-polish`)

- `art-source/ui/buttons/auto-ult.png` and `auto-ult-lit.png`, 256 x 256, transparent, lined up exactly. The off state is iron with brass
  arrows round a star and flame; the lit state is crimson and gold.
- `tools/painted-buttons/cut.py` cuts them as single medallions (`SINGLES`) the same way as the sheets' cells: trimmed, squared about the
  paint, 96 px. The other 136 files came out byte for byte as before. `src/paintedButton.ts` lists them (`PB_ICONS.singles`).
- The ULT button (`.fhAutoUlt`) is `auto-ult` off and `auto-ult-lit` on, in place of the dimmed ultimate medallion and its CSS glow. It sits
  beside the SPELL button's `autocast` pair, which it now matches. The files are in `ui/buttons/`, which `build.mjs` copies, and the service
  worker lists them.
- Shots: `auto-ult-{before,after}-<w>.png` (the spell row with both off, then both on).

## 3. The duel's tug-of-war bar (`art/duel-show`)

`tools/duel-show/import-art.py` writes `src/art/duel/bar-*.webp`, kept at their painted 2x size. `duelShow.ts` imports them (bundled into
game.js, so nothing for the service worker's list) and sets them as CSS variables on the bar (`.dsArt`, `src/duelShow.css`).

- **The frame** (760 x 112) is drawn 56 px tall and nine-slices across: its ends (the socket and its clasp, 65 px each) keep their shape and
  its plain rails stretch to the bar's width. It lies over the rest, so the **faces** (28 px) sit in its sockets' openings: the champion's
  in the green-rimmed one at the left, the challenger's in the red at the right. The side ahead glows round its face.
- **The fills** tile from each end inside the channel (11 px tall, 57 px in from each side): green from the left and red from the right, as
  wide as each side's share (`tugPoint`, unchanged).
- **The knot** (14 x 22) rides the meeting point.
- **The flare** (80 x 56) bursts over the knot on a big swing, with the bar's pulse as before; none with reduced motion.
- The names and the ring's clock run along the top. The bar is 72 px tall, as the plaque version was.
- **The camera** (CAM-SAFE): the bar is still registered (`registerCamCover('#bossBar .dsTug')`) inside `#bossBar`, and its box is
  measured live.
- **A flaw, fixed in the cut: worth a repaint.** Each fill tile (64 x 26) has a clear 1 px rim and fades over its last column on each side.
  Laid end to end, they showed a dark seam every 64 px. The cut keeps the 60 x 24 middle, which repeats with only a faint join. The tiles
  are also semi-transparent throughout (alpha about 183, so the channel's dark floor shows through, which reads well). A repaint should have
  the fill run edge to edge with no rim and no fade at the left and right ends, so it repeats seamlessly.
- `tools/duel-show/shots.mjs` (the duel-show branch's own) passes all its checks at the three sizes. It now also takes a `swing-<w>` frame
  (the flare). Shots: `duel-bar-{before,after}-<w>.png` (4 s into the fight) and `duel-bar-swing-after-393.png`.

## 4. The Quest complete card (`art/quest-complete`)

- The seal (1024 x 512), the keepsake and the hero-joins (512 x 512 each) are painted at four times the prompts' sizes, transparent and
  clean. `tools/quest-complete/import-art.py` trims them and brings them down to twice what the card draws (the seal 288 x 84, the two
  icons 96 x 96). `questComplete.ts` imports them (bundled).
- **The seal** (a red wax seal with the keep's tower, on a green ribbon with gilt scrolls) goes over the card's head in place of the battle
  crest (`.omCrest.qxSeal`, 144 x 42).
- **The keepsake** (a brass medal on its nail) and **a hero joining** (a hooded stranger in a lit doorway, unnamed) go on those reward
  rows, in place of the trophy and the Heroes medal. The stranger names no one, so the join reveal that follows the card is still a reveal.
- Shots: `quest-complete-{before,after}-<w>.png`. `tools/ui-art-wire/qc-shots.mjs` opens the card through its own `openQuestComplete`
  on the built page, with a quest result that has every kind of row. A fresh save cannot reach a card with a keepsake and a hero joining.
  The "before" shot bundles main's copy of the card the same way.

## Credits

`CREDITS.md`: the rune bench line now names the ten-piece set; the painted buttons' line counts the two new files (138); new sections for
the duel bar and the Quest complete card.

## Checks run

- `npm run typecheck`: clean. `npm run web`: builds.
- `npm test -- painted-buttons fight-hud`, `duel safe-rect ui-standard`, `quest-complete ui-standard` as each set went in; then the full
  suite: `npm test`, 3093 of 3093 pass, none failed, cancelled or skipped.
- The shots above at 393x852, 360x780 and 412x915, with 0 page errors.
