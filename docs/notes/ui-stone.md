# Stone and iron: the game's look

The owner picked style B from the mockups (`claude/ui-styles`). It is now the one look; the `?style=` switch and the other three styles are gone.
Dungeon slate and brick, riveted iron, cold blue-grey with ember-orange accents. Fonts, sizes (multiples of 12) and the no-bold, no-flash rules are unchanged.

## What changed
- **Kit**: `src/art/ui/*.png` are the stone kit (same names and sizes as before, so every 9-slice number holds), plus `page.png` (the menu page and panel fill). `python3 -I tools/ui/styles.py` redraws them.
- **Tokens**: `src/tokens.css` (inlined first by `build.mjs`) holds the colour ramps and the meaning names below. `tools/ui/stone-tokens.mjs --convert` moved every hard-coded colour of the UI's CSS onto them
  (`src/index.html`, `pixel.css`, `rogue.css`, `equip`, `awaken`, `talents`, `codex`, `eliteSets`, `twists`, `calmap`, `campPlaces`, and the CSS strings in `armiesView.ts`, `synergyView.ts`, `starter.ts`, `spellbook.ts`, `library.ts`, `hall.ts`). Hue family and lightness decide the ramp and step: browns become slate, golds ember, greens, blues, reds and purples keep their hue.
- **`src/stone.css`** (inlined last): the few rules a token cannot carry: panel texture, ribbon ink, bands, wells, the result's plate, the off-button ink.
- **Contrast**: castle labels are ember on near-black (about 10:1, were 4.1); the Spells page and the Recruit scroll are slate plates, not cream paper; the off-button ink is `--s12` (5.5:1 on its face); the result's text sits on a slate plate over the sky. `tools/ui/contrast.py` measures every text box from the screenshots (`AUDIT=1 node tools/ui/stone-shots.mjs out/web ui-stone-after`): medians 7.8 to 11 per screen; what is left under 4.5 is outlined text drawn on the board's sky (`#gold`, `#status`, as before) and animating result rows.

## Tokens
Ramps (each also has `--x-rgb`, the same colour as `r g b`, for `rgb(var(--x-rgb) / 0.5)`):
- **s**: s0=#080b0f s1=#0b0e12 s2=#11151b s3=#171c23 s4=#1a2028 s5=#232a33 s6=#2a323c s7=#343e4a s8=#3c4755 s9=#4d5a6a s10=#5d6b7c s11=#7b8997 s12=#9aa8b6 s13=#b4c2d0 s14=#cfd9e3 s15=#e6edf4 
- **e**: e0=#3a1a08 e1=#7a3410 e2=#a8481a e3=#b8521a e4=#d4631f e5=#ec7a2c e6=#ff8a3c e7=#ffa660 e8=#ffb878 e9=#ffd0a0 e10=#ffe6cc 
- **r**: r0=#3a0e0a r1=#6a1c14 r2=#8a2a1e r3=#b3382a r4=#d04a38 r5=#f0503a r6=#ff8a7a r7=#ffb3a8 r8=#ffd9d2 
- **g**: g0=#12401c g1=#1e5a2c g2=#2f8a44 g3=#3fa83f g4=#6fdc6f g5=#9af09a g6=#c4f6bc 
- **b**: b0=#0c1828 b1=#26396e b2=#3a78d6 b3=#4a9cff b4=#7cc0ff b5=#9fd4ff b6=#cde8ff 
- **p**: p0=#1a0d2a p1=#3a2a6a p2=#6a4a9a p3=#8a6ac8 p4=#b06aff p5=#d8c4ff p6=#efe4ff 

`s` slate (dark to light; `s1` deep, `s2` page, `s4` panel, `s8` button, `s10` edge, `s13` dim text, `s15` ink), `e` ember (accent: `e5` primary, `e8` highlight), `r` danger, `g` good, `b` ice (mana), `p` arcane. `--white` `--black` and their `-rgb`.

Meanings (use these in new rules): `--page --panel --panel-hi --edge-lo --edge-hi`, `--text --text-dim --text-faint`, `--accent --accent-hi --accent-lo --ember-hot`, `--danger --danger-hi --danger-lo`,
`--good --good-lo`, `--mana --mana-lo`, `--rare`, buttons `--btn-fill --btn-rim --btn-lip --btn-primary --btn-ink --btn-off --off-ink`, tab bar `--tab-bar --tab-on`, `--badge`, overlays `--overlay --scrim --shade`, `--panel-bg` (page texture on slate).
The older names (`--ink --dim --edge --gold --gold-hi --gold-lo --red --ember --deep`) still exist in `:root` and now point at the ramps.

## Adding a screen in the style
1. Frames: use the existing classes (`.hmPanel`, `.hsheet`, `.evcard` for panels, `button` / `button.primary` for buttons, `.card`, `.hrow`, `.chip` for rows and labels, a `ribbon` heading as `#hmSub h2` does); they already take the kit's `border-image`.
2. Colours: only `var(--token)`, never a hex; for a tint use `rgb(var(--s1-rgb) / 0.8)`. Text on a panel is `--text`, small notes `--text-dim`, numbers and headings `--accent-hi`, a bad thing `--danger-hi`, a good one `--good`.
3. Page background: `url(ui/page.png) 0 0 / 32px 32px, var(--s2)`; panel fill is `var(--panel-bg)`. Pixel textures only at whole-number scales with `image-rendering: pixelated`.
4. Put text over art (the board, a scene) on a slate plate (`rgb(var(--s1-rgb) / 0.82)` with a `--s7` outline), as `#summary` does.
5. Check it: add the screen to `tools/ui/stone-shots.mjs`, run it at 393x852 and 360x780, and run `contrast.py`.

## What stayed art colour
Not touched, on purpose: the scene paintings and their labels' canvases (`camp.ts`, `castle.ts`, `tavern.ts`, `hall.ts` room and sparks, `library.ts` room glow, `calMap.ts` land), the battle board and fx (`render/boardView.ts`, `backdrop.ts`, `castleSpots.ts`, `uiFx.ts`), damage numbers, hp and mana fills' hues (kept as the good, danger and ice ramps), the loading screen's painted dusk (its title and bar follow the tokens), the falling leaves, and the PixelLab icons (`ic-*`, `tab-*`). Counted: the UI chrome's numeric colours went from about 1,080 (832 hex, 246 rgb) to 11 (the leaves and the theme colour); the art files above hold about 170 more.

## Screens and tools
`tools/ui/stone-shots.mjs <build> <prefix> [WxH]` takes 34 screens (loading, starter, five home tabs, codex, achievements, settings, party, armies, army card, hero sheet, awakening, equipment, talents, deploy, running, boss card, boss bar, result, recap, auto summary, event, tips, stash, chest, Calamity pick and map, tower, shop, daily, gacha). `tools/ui/stone-sheets.py` makes the overview sheets. Samples: `docs/samples/ui-stone-before-*.png` and `ui-stone-after-*.png` (393x852 and `-360x780`), `ui-stone-sheet-<home|heroes|fight|more>.png` (before | after) and `ui-stone-sheet-360-*.png`.
Not captured: a boss's phase banner (it needs a calamity boss at its threshold; its CSS is tokenised like the boss card).

## The audit and finish pass (`claude/ui-stone-2`)

**Found and fixed**
- The rarity tokens `--r1` to `--r5` shared names with the danger ramp, so common gear and card frames showed dark red and the Mythic token pointed at itself. The grade colours are now `--rar1` to `--rar5`.
- `--ink` and `--dim` had been mapped to peach and orange (the old cream and tan). They are now `--s15` and `--s13`, so body and small text are slate-white and steel everywhere, not orange.
- Notes, power labels and the locked or "bad" text that used the old tan now use `--text-dim` or `--danger-hi`; the defeat banner, the danger button and the starter and spellbook pages follow.
- The gear-set and relic-set colours (`sim/gearSets.ts`, `sim/relicSets.ts`, shown in menus through `--sc` and `--set`) are now token strings (`var(--e6)` and so on).
- The speech bubbles drawn on canvas over the camp and the tavern are slate plates read from the tokens (`src/render/tok.ts`), not brown and cream.
- The `trim-l` and `trim-r` pictures are redrawn in the kit (they were still brown).
- A runtime scan (`AUDIT=1 node tools/ui/stone-shots.mjs ...`) lists any visible element whose text, fill or border is still a warm brown or cream: none are left except the ember accent fills and the border colour under picture frames.

**Counts.** The UI chrome's hard-coded colours were already moved onto tokens in the first pass (no numeric colour is left in any UI CSS or in the UI strings of `.ts` files). The counts a plain grep still finds are `var(--gold)`-style token uses (`--gold` now means ember; the name is kept so old rules work) and the art below.

**Stayed art** (painted scenes, the board, the void and effects): `render/calRealm.ts` (51, the void realm), `camp.ts` (31, the scene, its fire and table), `render/boardView.ts` (29), `hall.ts` (27, the summoning room and its sparks), `castle.ts` (27, scaffolds, flags and glows), `tavern.ts` (15), `render/castleSpots.ts` (15), `render/backdrop.ts` (12), `render/uiFx.ts` (6, the pull reveal's sparkles), `library.ts` (5, the room's glow), `calMap.ts` (3, the land's fog), `render/sheets.ts` (2), and the falling leaves and the theme colour in `index.html` (11).

**Screens checked (393x852 and 360x780; `docs/samples/ui-stone2-*.png`)**
- Loading ✓, turn-upright ✓, version line ✓ (top bar of every shot), starter ✓, tips ✓
- Home: Battle camp ✓, Heroes tavern ✓, Castle ✓ and building card ✓, Recruit hall ✓, Spells library ✓, stash cart ✓, chest opening ✓, daily ✓
- Settings ✓ (top, bottom, "Start over" two-tap confirm ✓), achievements ✓, achievement toast ✓ (on the result), codex ✓ and detail ✓
- Hero sheet ✓, awakening ✓, talents ✓, equipment ✓, equipment picker with compare ✓, gear sets ✓, party ✓
- Armies ✓, army card ✓ (locked and open), unlock moment ✓, result ✓, army result ✓, recap ✓, auto-replay summary ✓, recycle confirm ✓
- Fight: deploy HUD, spell bar, bench and synergy column ✓, running ✓, boss card ✓, boss bar ✓, twist banner ✓, long-map overview ✓
- Tower: map ✓, elite info ✓, twist node ✓, shop ✓, campfire ✓, recruit node ✓, treasure ✓ and relic pick ✓, mystery ✓, event ✓, abandon confirm ✓, summary ✓
- Calamity: pick and ascension ✓, map ✓
- Gacha result ✓
- Not shot: the boss phase banner (needs a boss at its threshold; its CSS is tokenised like the boss card), the mimic (a mystery that starts a fight; the fight HUD is shot), the relic popup from a header relic (same plate as the event card).
