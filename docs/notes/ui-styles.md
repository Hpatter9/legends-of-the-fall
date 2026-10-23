# UI style mockups

The owner asked for a UI revamp ("not just color, but texture"), mockups first. Four complete looks are in the build, switchable for
now: `?style=a|b|c|d` in the address, or `__game.style('b')` (kept in this browser; `?style=off` or `style('')` goes back). With nothing
set the page is exactly as before. **Nothing is chosen yet; this is for picking one.**

## Packs found
There is **no GUI/UI pack** in `chronos-assets` (no panels, buttons, 9-slices, parchment or ribbons in any of the ~60 Craftpix packs or the loose
packs). What exists and was useful: **DawnLike** (`Objects/Floor.png` brick, log, sand and cobble sets in 12 colourways; `GUI/GUI0.png`, small
hearts, bars and 16px frames, too small and too few for our 9-slices; its 16 colours are the DawnBringer palette), the Craftpix dungeon packs
(`2d-top-down-pixel-dungeon`, `undead-tileset`, `crystal-cave`: stone walls and floors, already used for the tower) and the Craftpix medieval banners (props, not UI).
So the textures come from DawnLike floor tiles (recoloured onto each style's ramp by brightness rank, no resampling); the frames and buttons are drawn
natively by `tools/ui/styles.py`, as `tools/ui/frames.py` did for today's kit. Run `python3 -I tools/ui/styles.py` to redraw. If the owner wants real
pack-made frames, a GUI pack must be bought (Craftpix sells several).

## How it works
- `tools/ui/style-swap.mjs` writes `src/styles/swap.css`: every picture-drawing declaration in `pixel.css`/`rogue.css`/`index.html`, repeated
  under `body[data-style]` and reading the file from `var(--u-<name>)`. Only picture and mapped-ink declarations are copied (a whole-rule copy beat later rules and broke layout).
- `src/styles/common.css` holds the shared rules over tokens; `a.css`..`d.css` set the tokens (palette, inks, `--page-bg`, `--panel-fill`, ...).
  Images are `src/ui/styles/<s>/` (same names and sizes as `src/art/ui/`, so the 9-slice numbers hold); `build.mjs` copies them and lists them in the service worker's `FILES` (offline).
- Spots converted to tokens (defaults keep today's colours): `--shade` (the `rgba(0,0,0,.3/.35)` wells), `--deep` for `#1a0d07`, `--sky-ink` (the blue skill labels), `--bright`,
  `--passive-ink`, `--got-ink`, the recruit scroll (`--scroll-*`), `--btn-ink`, `--btn-glow`, `--off-ink`, `--lost-ink`.
- Whole-pixel scales only (`image-rendering: pixelated`); no new animation; the styles add none. New images: 21 KB in all.

## The four styles
| | Palette | Textures (DawnLike tile) | Frames |
|---|---|---|---|
| **A Wood and gold** | ink `#fbf1dc`, dim `#dcc9a6`, gold `#f4b73c`/`#ffe9a0`/`#cf8a1a`, panel `#2a1910`, bar `#2a1a10..#5c3d27`, deep `#140a05`, red `#e65a42` | logs (`Floor.png` 0,480) turned 90 degrees as planks | walnut buttons with gold rim and rivets, double gold panel rim, crimson ribbons |
| **B Stone and iron** | ink `#e6edf4`, dim `#b4c2d0`, ember `#ec7a2c`/`#ffb878`/`#b8521a`, panel `#1a2028`, slate `#171c23..#36404c`, deep `#0b0e12` | grey brick (0,96) bar, dark brick (0,144) page | steel rims, iron bolt heads, ember primary buttons, iron ribbons with ember edges |
| **C Parchment and ink** | paper `#ecdcb4`, page `#e4d2a4`, ink `#2b1a0e`, dim `#4a3622`, wax red `#b3261e`/`#a3281f`, leather `#8a5a30`, bars `#4a2c18..#744c32` | sand tile (0,288) as leather, sand tile (0,240) as paper | inked double rim and red corner pips, cream thread corner stitches, wax-red primary, cream cards |
| **D Royal arcane** | Endesga 32: ink `#e6ecfa`, dim `#aab8d6`, cyan `#2ce8f5`/`#0099db`/`#0e72ad`, violet `#68386c`/`#b55088`, panel `#1f2238`, deep `#181425` | navy cobble (112,192) bar, star-flecked slate (0,384) page | silver rim with cyan inner line, gem corners, cyan primary, violet ribbons |
C is the only one with light panels: paper elements redefine `--ink`, `--dim`, `--gold-hi` locally (custom properties inherit), and leather/wax parts put them back.

## Contrast (WCAG, computed from the palette)
Body text on panel: A 15.0, B 13.9, C 12.3, D 13.2 (all above 7:1). Dim text on panel: A 10.4, B 9.0, C 8.4, D 7.8. Accent text on panel: 14.0, 9.7, 7.0, 13.0.
Primary button label on its face: A 8.8, B 7.2, C 5.8, D 6.3 (large 12-17px labels; all above 4.5). Bar text: 13.0, 12.9, 9.3, 12.8. Ribbon text: A 4.8, B 8.7, C 6.4, D 7.6.
`tools/ui/contrast.py` measures every text box on the seven screens from the screenshots (`AUDIT=1 node tools/ui/style-shots.mjs ...`): medians 7.5-12 in A, B, D and about 5-9 in C.
The few boxes left under 4.5 are the outlined gold and status text drawn straight on the board art (the same in today's look), the fight sky text, and a few small labels at 3.6-4.4 (A's disabled "shards" button 3.6; B castle labels 4.1; D "Equipment" heading 2.7, probably under the scroll edge); fix in the full pass.

## Hard-coded colours remaining
832 hex colours and 246 `rgb()/rgba()` in `src/index.html`, `src/*.css`, `src/*.ts` (counted after the conversions above; spots with a token default still count their default). The mock screens are clean; the rest (Pixi scenes, spellbook, tower, codex, equipment pickers) are untouched.

## Plan for the full pass (once one style is chosen)
1. Delete the other three and the `data-style` switch; make the chosen kit the real `src/art/ui/` set (move files, fold `swap.css` and tokens back into `pixel.css`/`:root`).
2. Convert the remaining ~1,000 colours to tokens, by file: `index.html` first, then `pixel.css`, `rogue.css`, tower/codex/equip, then the runtime-injected CSS in `.ts` files (`hall.ts`, `spellbook.ts`, `starter.ts`); use `grep` counts per file as the progress bar.
3. Run `tools/ui/contrast.py` on every screen (extend `style-shots.mjs`) and fix everything under 4.5, aiming at 7.
4. Retexture the scene-side chrome (camp signs, castle labels, hall room frames) and the tab/hero icons for the chosen palette.
5. Screenshots at 393x852, 360x780 and 412x915 for every screen; owner signs off.

## Screens and tools
`tools/ui/style-shots.mjs` (writes `docs/samples/ui-style-<today|a|b|c|d>-<battle|heroes|sheet|armies|castle|recruit|fight|recap>.png`, plus `-360x780`, `-412x915` for battle, sheet, fight), `tools/ui/compare.py` (the `ui-style-compare-<screen>.png` sheets), `tools/ui/sheet.py`, `tools/ui/contrast.py`.
Checked at 360x780: nothing clipped or overlapping in any style (home and hero sheet), same wrapping as today.
