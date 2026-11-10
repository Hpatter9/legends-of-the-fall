# RUNE-BENCH-ART: the earlier rune bench paintings, wired in

Branch `claude/rune-bench-art`, from main 0.443.0 with `art/rune-bench` (PR #474) merged in. Shots at 393x852, 360x780 and 412x915 are in
`docs/samples/rune-bench-art/`: `heroes-<w>.png` (the hero side and the grip), `runes-<w>.png` (the rune side with seven runes in the
bag) and `runes-chosen-393.png` (a rune chosen, named in the hint).

## The pieces

PR #474 holds seven pieces painted from an earlier prompt. `tools/rune-bench/import-art.py` expects the ten names of the newer prompt
(`rune-bench-art-prompts.md`), so it now has `FALLBACKS`: each newer piece that is not painted takes the earlier one, at the earlier one's
own shape and slice. The newer piece always wins once it lands.

| Newer piece | Earlier piece used | Written as | Drawn |
| --- | --- | --- | --- |
| `grip` | `grip.png` (64 x 224) | 64 x 262, nine-sliced 46 / 14 | caps 23 px, sides 7 px on the 28 px bar |
| `grip-lit` | `grip-held.png` | the same | while the bar is held |
| `tray` | `rune-bench-backing.png` (768 x 320) | 384 x 151, nine-sliced 38 / 44 | a 10 to 11 px frame round the tiles |
| `tile`, `tile-lit`, `tile-empty` | `rune-tile.png`, `rune-tile-lit.png`, `rune-tile-empty.png` (160 x 160) | 120 x 120, nine-sliced 26 | a 6 px frame |
| `rune-auto-locked` | `rune-auto-lock.png` (96 x 96) | 96 x 96, whole | the locked rune Auto's padlock |

- The earlier and newer grips share a file name. The script tells them apart by canvas (`EARLIER_CANVAS`): 64 x 224 is the earlier grip,
  any other size the newer.
- Not painted in either set: `socket`, `socket-twin` and `rune-auto` (unlocked). These keep the painted plates of `paintedButtons.css`,
  section 12.
- Checked: in a copy of the folder, a newer `tile.png` (128 x 96) and a newer `grip.png` (64 x 208) each replace their fallback.
- `build.mjs` already copies `src/art/ui/rune-bench/*.webp` and lists them in the service worker (seven files, 62 KB), so the bench plays
  offline.

## A fix found on the way: the grip's own look never showed

The grip is a `<button>` with no class, so the plain-button plate rule matched it:
`button:not([class]):not(#mute):not(#gear):not(#speed)`. Its three `:not(#…)` count as three IDs and outrank every `#benchGrip` rule. The
pull bar wore the plain slate plate and padding, not its own plaque, and the painted grip could not show either. It now has
`class="benchGrip"` (`src/index.html`), so its own rules apply.

## The rune names at 360

On the one-row bench (BATTLE-POLISH) a tile is 35 px wide at 360 and about 40 px at 412. No rune's name and numeral fits ("Bulwa…"). The tile
now drops the word (`src/runeBench.css`) and its stone is a little bigger (26 px). Which rune it is shows in the stone's colour and gem, and
its level in the pips under it. The hint line names the rune chosen ("Ember I: Now tap its twin…", `chosenName` in `src/runeBench.ts`), and a
hold opens the rune's card, as before.

## Files

`tools/rune-bench/import-art.py`, `src/runeBenchArt.css` (written by the script), `src/art/ui/rune-bench/*.webp`, `src/index.html`,
`src/runeBench.ts`, `src/runeBench.css`, `CREDITS.md`, `art-source/rune-bench/` (from PR #474).

## Checks run

- `npm run typecheck`: clean. `npm run web`: builds, with the seven files in the service worker.
- `npm test -- rune bench-drop deploy featureUnlocks painted-buttons ui-standard`: 52 of 52 pass.
- The screens at the three sizes (the shots above): the hero side, the rune side and a rune chosen. The grip, the tray and the tiles wear
  the paintings, and the pull bar is centred on the shorter bench.

## Since UI-ART-WIRE: the ten-piece set

The newer prompt's ten pieces landed on `art/rune-bench` beside the seven earlier ones, and now win in every slot
([ui-art-wire.md](ui-art-wire.md)). The painter saved the newer resting grip as `grip-rest.png` (64 x 208), keeping the earlier
`grip.png` (64 x 224); the script's `ALIASES` takes it as the newer grip. The socket, the twin-ready socket and the open rune Auto
medallion, which neither set had painted before, replace the last stand-ins.
