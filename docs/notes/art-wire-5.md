# Art wire 5: the Orc repaints and Expansion art 2

Merged `art/assault-orc` (PR #463, at 4553111b) and `art/expansion-2` (PR #464, at 9d524a7b) and brought their art into the game.

## The Assault's Orc repaints (PR #463)

- **The merge.** `orc-02-gates.png`, `orc-03-iron-gate.png`, `orc-07-keep.png` and `orc-13-decals.png` met main's copies as add/add conflicts; the
  branch's repaints were taken (the keep's is the PR's "Refine Bloodtusk keep hall throne and war banner sheet", newer than main's).
- **The cut.** `tools/assault/cut-sheets.py` run for all four holds (`KITS=` the `hpatter9/little-town` kits). Re-cutting main's old sheets first gave
  byte-identical files, so every change below is the repaints'. Only these pieces changed: `southGate` (and Battered, Broken), `northGate` (and Broken),
  `gateTower`, `ironGate` (and Battered, Broken), `postern` (and Broken), `cornerTower`, `keep`, `throne`, `greatBanner`, and the sixteen decals. The
  Necropolis, the Den and Elder Root change in exactly those slots, since all three still borrow the Orc sheets (recoloured), as expected.
- **Fit.** The repainted gates sheet has hard alpha (no halo at all); the iron-gate and keep sheets' faint haze (alpha under 128) is cleared by the
  cutter's own threshold, and the cut pieces show no fringe (checked on a light ground). The cutter's footprint report is better than before: the Iron
  Gate's three states no longer stray (they were 27 px low), and stand on their foot points; only the postern and the corner tower are "stood on
  their picture", as they were before. The keep's hall is wider (368 to 461 px) and sits on the mound's back terraces.
- **Kept back:** nothing. Every repaint sits right, so no corrected prompt was needed (`docs/notes/assault-art-fixes-prompts.md` was not written).
- **Looks.** The new palisade gates are brighter than the old (a cream hide roof over the red), which is the painting itself, not the cut.
- **Before and after**, `?bench=assault` Near and Mid at the South Gate (73,59), the Iron Gate (61,50), the burnt village's decals (56,90) and the keep
  (47,47), 393 and 360 wide: `docs/samples/art-wire-5/{before,after}-<spot>-<near|mid>-<width>.jpg` (`tools/art-wire-5/bench-shots.mjs`).

## Expansion art 2 (PR #464)

`tools/art-wire-5/import-expansion.py` cuts the three repainted sheets: each symbol trimmed to its painting, set square on a 4% margin and brought
down with Lanczos to the size the game draws, saved as a 256-colour palette PNG (no visible change, 210 KB for all of them against 447 KB for the old
128 px cuts). They are drawn smoothly now (`image-rendering: auto`). All are imported, so bundled into game.js: nothing for the service worker.

| Art | Cut | Where it shows (replacing) |
|-----|-----|----------------------------|
| The twelve traits (row 1) | `src/art/dynasty/trait-*.png`, 96 px | the nemesis card's Traits (the old cuts) |
| Council events (row 2) and News (row 3) | `src/art/council/*.png`, 96 px | the Council board's News (the old cuts) |
| The War Trophy (row 3, cell 6) | `src/art/council/token.png`, 96 px | the Spoils tab |
| Seasons | `src/art/dynasty/{spring,...}.png`, 144 px | the season chip and card |
| Fates | `src/art/dynasty/{mentor,...}.png`, 96 px | the Houses' rows, the farewell, the tavern's candle (`legend` stays reserved) |
| Scar frames 1 to 3 | `src/art/expansion/scar-{1,2,3}.png`, 128 px | every nemesis face (`face()`) and the taunt cut-in (the ✕ marks) |
| Heirloom frame | `src/art/expansion/heirloom-frame.png`, 192 px | an heirloom's gear card: its icon in the frame's opening, a gold mark in a notch per generation (new) |
| Heirloom chip | `src/art/expansion/heirloom-chip.png`, 48 px | the Houses' heirloom chip (the keepsake painting) |

- Cells 27 (the bandaged fist) and 30 (the small shield overlay) have no event that uses them yet and are not cut.
- The fight's name plate still shows ✕ marks for scars: it is Pixi text over the battle, with no portrait to frame.
- **The backdrops.** The PR also repainted the Houses' and the Council's backdrops; `tools/dynasty-art/import.py` brings them in as before. The
  Council's chamber was repainted with its sconces elsewhere, so its ALIVE lights and embers (`render/ambientScenes.ts`) were moved onto the new
  flames (found from the painting's bright pixels); the Houses' candles still sit where they were.
- **Not wired** (not asked for, and nothing draws them yet): `duel-ring.png`, `hester-table.png` and `elders-table.png`, also repainted in PR #464.
- The older importers (`tools/council-art/import.py`, `tools/dynasty-art/import.py`) no longer cut these symbols, so re-running them cannot bring
  back the 128 px cuts; their browser checks were brought up to date (the sizes, and the twentieth News kind, the Assault's Conquest).
- **Screens** at 393 and 360: `docs/samples/art-wire-5/{before,after}-<screen>-<width>.jpg` for the Council board, News (top and bottom), Spoils,
  three trait cards, the taunt cut-in (after only), the Houses, a House’s line, the season card and the heirloom’s gear card (`tools/art-wire-5/checks.mjs`, fixtures in
  `lab.ts`); every symbol at 64 and 24 px in `icons.png`.

Nothing new moves, so reduced motion needs nothing more.

## Checks

`npm run typecheck`, `npm run web`, `npm test -- assault field nemesis council news houses codex ui-standard alive ambient taunt equip` (216 pass) and
`npm test -- dynasty heir` (26 pass); the browser scripts above and the older council, dynasty and trait art checks at 393, 360 and 412, with 0 page
errors.
