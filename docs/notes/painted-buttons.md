# Painted buttons

The owner's ask: painted buttons throughout the game. "The code drawn and created ones just don't look good. Buttons for settings,
achievements, seasons, council, daily, auto, tactics and formations, etc." The owner painted nine sheets with ChatGPT (art branch
`art/painted-buttons`, PR #468, head `7a7c18de`), merged into this branch, `claude/painted-buttons`.

## The art and the cutter

`art-source/ui/buttons/`: seven 1024 x 1024 medallion sheets (4 x 4 cells of 256): `top-bar`, `tabs`, `camp`, `fight`, `actions`,
`tavern`, `glyphs`; and two 1536 x 1024 plate sheets (3 x 4 cells of 512 x 256): `plates-buttons`, `plates-frames`.

`python3 tools/painted-buttons/cut.py` cuts all 136 cells into `src/art/ui/buttons/<name>.webp`:

- medallions: trimmed to their paint, squared about its centre, 96 px (glyphs 48 px);
- plates: each row cropped to the union of its three cells' paint (so a button's normal, pressed and disabled plates share their slice
  lines), then halved. The prompts' nine-slice margins (plates-buttons 72/64; chips 64/56; tabs 56, top 64, bottom 40; plaques 72/64) are
  halved and less the crop, and written to `src/paintedButtonsSlices.css` as `--<plate>-slice` and `--<plate>-width`. The switch (row 4
  of plates-frames) is a whole piece, 120 x 60.

**Bytes added: 640,000** (136 WebP files, quality 86). They are files, not bundled: `build.mjs` copies them to `out/web/ui/buttons/` and adds
each to the service worker's `FILES` (through `UI_FILES`), so they play offline.

The PR body lists every sheet's cells but camp and fight; those two were read off the sheets:

- camp: daily (chest at sunrise), assault (ram at a palisade), council (throne and candles), march-orders (map with a pin), tavern
  (tankard), spells (tome and star), march (pennant), trophies (chalice), continue (arrow), choose-battle (crossed swords and crown), quest
  (scroll and quill), armies (three banners), coin, sword, heart, home (cottage);
- fight: autocast, autocast-lit, form-wall, form-wedge, form-square, form-spread, horn, horn-lit, orb-gold, orb-bronze, orb-lit,
  orb-silver (the four rings have clear centres), ultimate (sun and flame), mana (drop), formations (banner over dots), stop (hand).

The names of every cell are in `PB_ICONS` and `PB_PLATES` (`src/paintedButton.ts`).

## The shared piece

- `src/paintedButton.ts`: `medal` (a painted picture as an `<img>`), `medallionButton` (round, with a lit picture and `setLit`, and a
  badge slot, `setBadge`: the red pip, the count seal, the quest seal, Hester's coin), `plateButton` (primary, secondary, danger, with
  their pressed and disabled plates), `chip`, `tabPlate`, `plaque`, `paintedSwitch` (role="switch"), `choiceRow`, and `glyphWord` ("‹ Back"
  and "Close" wear the painted back chevron or close glyph before the word). Plain DOM, no Pixi.
- `src/paintedButtons.css`, loaded after every other sheet: the plates are drawn with `border-image` over a 1 px border, so no button's
  layout moves; the rim is drawn inward over the padding. State rules restate the whole `border-image` (an earlier rule's `border-image:
  none` would otherwise reset the slice).
- The standard ornate menu picks the plates up by its own classes: `.omFoot` buttons (Back or Close on the slate plate with its glyph,
  the primary on the amber plate), `.omChoice` on the choice plates (dim, gilt green when chosen, dark when disabled). Any classless text
  button, `.small`, `.primary` and `.danger` button anywhere is on the matching plate.

## What is wired

- **Camp top bar**: crowns and stones chips (painted crown and stone), the season chip (the season's medallion; now 44 px tall, it was 26),
  achievements and settings medallions, the painted news pip and the alert bell for the Updates news.
- **Fight top bar**: sound on and off, settings, speed ×1, ×2, ×3 (by `data-speed`, with an aria-label), in 44 px columns (they were 40).
  Lives and gold keep their painted heart and their words.
- **Bottom tabs**: the tab plates (lit when chosen, pressed), each tab's medallion and its lit picture when chosen, the painted count seal,
  quest seal, shop coin and lock. Which mark shows is unchanged (`heroesTabMark`'s one mark).
- **Camp**: Choose your battle (amber plate, crossed swords and crown), Continue (its arrow), the tracked quest's chip (its scroll), the
  Daily (its medallion on a plaque; cleared shows the painted tick), the Dark Council (its medallion on a plaque), the enemy's plate (the
  plaque). The castle's chips are on the chip plates.
- **Armies page**: the tiers on the choice plates, the painted chevrons, Fight and Assault with their medallions, Continue, Back.
- **Deploy**: Fight (amber plate, crossed swords), Hire, Auto, Home, Auto merge, the rune bench's Satchel, Auto and Merge all, Formation,
  with their medallions on the slate plates. The War Council's Auto-pick, March orders and March to battle wear theirs.
- **Fight HUD**: the spell orbs in the painted rings (gold, lit while armed, bronze while it cannot be paid), the mana drop, the auto-cast
  medallion (lit when on; its switch and word kept for readers), the ultimate medallion on a ready row's portrait, the formation sheet's
  shapes (wall, wedge, square, spread) on the choice plates, Stop.
- **Tavern**: All heroes, Upgrades, Quests, Hester's shop, Quest board, Talk to Gwen, Trophies, Elders' table and each hero's upgrade, with
  the tavern sheet's medallions on the slate plates (a service with news on the gilt plate); the two section tabs on the tab plates.
- **Hester's stall**: its tabs (Books, Gear, Tomes, Chests, Sell, Repair, Enchant, the caravan) with the stall medallions on the tab plates;
  Back.
- **Menus**: every ornate menu's footer and choice rows; the "‹ Back" and "Close" of the standard menus, Settings, the War Council, the
  sub-pages, the armies page, the hero pages, the quest log, the upgrade list, the shop, the formation sheet and the trophy wall carry the
  painted glyph. Settings' menu rows are choice plates with the painted chevron; the War Council's search has the painted magnifier.
- **Settings**: every On/Off toggle is the painted switch (off, on, dulled when disabled; its words kept for readers, `aria-pressed` as
  before); the paired choices (speed, cut-ins, showcase) are choice plates.

Every button keeps its handler, its spoken name and its size; presses nudge or shrink a medallion, and reduced motion keeps them still.

## Not wired, and why

- **The war horn**: it is already the Eidolons' own painted horn, which fills as the fight goes (its three paintings). The sheet's horn and
  lit horn are cut and ready, but a static medallion would lose the fill.
- **The tactic medallions** (Advance, Charge, Hold): already painted and not on these sheets, as the director said.
- **Cells cut but with no home yet**: camp's tavern, spells, armies, trophies, coin, sword and heart (those places are reached by the
  tabs, or are not camp buttons today); actions' next-stage, leave, reveal-all, return, retain,
  recycle, pull-1, pull-10, skip, march-battle (their buttons are on plates now, but the result, summon and dismiss screens keep their
  words without a medallion: they were not changed in this pass); fight's orb-silver; glyphs plus, minus, star, star-empty, cross, info,
  up, down, help (the game writes these as text characters inside lines, "★ 0/11", not as buttons of their own).
- **Buttons with their own drawn faces kept**: hero portraits and cards, the summoning hall's pull buttons (already its own painted
  frames), the stash's chests, map spots, the Assault's orders bar, the rune bench's pager.
- **Small targets that were small before**: the armies page's pager dots (10 px) and the rune bench's three buttons (30 px tall, in the
  runes drawer). Not changed here.

## Checks

- `npm run typecheck` and `npm run web`: pass.
- Tests: `npm test -- painted-buttons ui-standard topbar deploy home tavern settings fight hud` (84 pass) and `npm test -- tactic stall
  trophy quest rank shop party houses dynast armies sound council season` (239 pass). New: `test/painted-buttons.test.ts` (every name has
  its file and every file a name, every class styled, every painted file the CSS asks for exists, the slice values come from the cutter, the
  build serves and caches the files, reduced motion).
- Shots: `node tools/painted-buttons/shots.mjs <before|after>` at 393 x 852, 360 x 780 and 412 x 915 into `docs/samples/painted-buttons/`
  (camp, tavern, services, recruit, castle, spells, armies, achievements, settings, switches, gameplay, season, stall, deploy, fight).
  It fails on a page error or a page wider than the screen, and lists visible buttons under 44 x 32.
