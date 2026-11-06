# Combat HUD fixes

Four of the owner's asks about the fight screen, in one branch.

## 1. Auto place follows the formation picked

The owner's words: "Auto, when in combat and using it to place heroes, should place them in accordance with the formation selected."

- **The pick is remembered.** A tap on a shape in the prep screen's Formation sheet (`#formBtn`, `tacticsView.ts`) still sets the placed
  heroes out in it, and now also keeps the shape as the pick for that army or mode (`pickFormation`, `Meta.formations`, kept by the same
  key as the tactic, `tacticKey`; `sim/tacticPick.ts`). A save keeps only known shapes (`readFormations`); saves from before have none.
- **Auto place uses it.** `autoDeploy(b, run, meta, boostFor, shape)` (`sim/autoplay.ts`) takes the shape and sets the squad out by
  `deploySpots`: each hero at its tile of the shape (`formationSpots`, `sim/formations.ts`, the same tiles the sheet's Arrange gives), any
  hero the shape has no tile for on the nearest free tile of the heroes' rows. The page's Auto button (and an auto-replay's placing) passes
  the pick, while the formations are open (with Auto place).
- **No pick, no change.** With no shape picked, `deploySpots` is `autoFormation` exactly as before, so every tool, bot and balance figure
  plays out the same. The sheet has a fifth choice, **Loose**, which forgets the pick (nobody moves); the sheet says which shape Auto place
  will use, and the picked shape (or Loose) is lit.
- Nothing rolls a die: the board and the squad decide the tiles.
- A shape still needs its parts to count (a Shield Wall wants two front-liners, a Spearhead three in the lead, Skirmish four heroes); Auto
  sets the party out in the shape's tiles regardless, as Arrange always did.

Tests: `test/auto-formation.test.ts` (new): the pick kept per army or mode, Loose forgets it, a save keeps only known shapes; Auto with a
shape puts every hero on its `formationSpots` tile, one a tile, the same each time, and with none plays exactly as before (24 seeded runs,
every shape); a party that can make every shape stands in each one on at least 8 of 10 boards.

## 2. The tactic button moved down

The owner's words: "The tactics button should be down on the right side, above the heroes' bars, not at the top."

`#tacticBtn` (the gilded medallion of 0.370) now rides on the hero panel's top edge at the right (`#panel .fhTactic`: `right: 8px`,
`bottom: calc(100% + 10px)`), so it sits just above the hero rows whether they are five full rows or eight compact ones. Its word
(`#tacticWord`, "Advance", "Hold", "Charge") pops up to its left, level with its middle, and fades as before (still with no movement under
reduced motion). Its name stays under its icon. The spell row keeps the orbs, Auto and the War Horn.

## 3. No overlaps on the fight screen

The owner's words: "Make sure there isn't any overlap in menus, icons, bars and such. I saw some in combat."

### The probe

`node tools/combat-hud/probe.mjs [--shots <prefix>]` after `npm run web` (`ROOT=` another build, `SIZES=393` for one size). It plays real
fights in the built page at 393x852, 360x780 and 412x915, with a party of five (an army run) and of eight (the Calamity), at the fight's
start, mid-fight with a toast showing (the game's own toast, the deploy helpers' unlock lines told again), a boss wave with a toast, just
after a tap on the tactic button, and an ultimate's moment. At each it measures every part of the fight screen (the top bar's hearts, gold,
clock, buttons, status line and version; the mana, the spell orbs, Auto, the War Horn; the tactic button and its word; the boss, twist and
combo bars, the synergy column, the auto-replay bar, a boss's phase banner; the hero rows, their names, bars, portraits and skill chips; the
toasts, the skill cut-ins, the ultimate's and the boss's showcase words, the quip bubble, the boss card) and prints every pair that
intersects (a text line by its text; a part inside another, as a chip in its row, does not count). There is no pause button on the fight
screen; the speed button is in the top bar and is measured there. The tutorial's counsel card is left out: it is a lesson laid over the
screen on purpose.

### Before (main at 0.371.0): 88 overlaps

| Where | What overlapped |
|---|---|
| Every size, mid-fight and boss | A toast's lane (118 px down) lay on the top bar's gold, clock and mute button at 393 and 360, and on the spell orbs and Auto at 412 and in the Calamity |
| Every size, boss wave | The boss's bar started 2 px inside the spell row (mana, orbs, Auto), and ran under the tactic button (54 x 24 px) |
| Boss wave, Calamity start | A quip's bubble on the orbs, Auto, the boss's bar, the tactic button and the Calamity's twist banner (232 x 42 px) |
| Calamity mid-fight | The toast over the twist banner |

The full list is in the probe's output; the shots are `docs/samples/combat-hud/before-<party>-<scene>-<w>.png`.

### The fixes

- **The boss's bar** starts under the spell row's own bottom (`layout`, `main.ts`: the row's 6 px drop was left out).
- **The tactic button** is no longer at the top (section 2), so nothing at the top runs under it.
- **Toasts in a fight** (`hudClear.ts`, `achievementsView.ts`): the lane starts just under the lowest of the top parts (the top bar, the
  spell row, the boss's, twist's and combo bars), and the toast fades in and out there (`.toast.lane`) rather than sliding down over the
  orbs. Off the fight screen the lane is as it was.
- **Quips** (`quipView.ts`): a bubble keeps clear of the whole fight HUD (`FIGHT_HUD`: the top bar, the spell row, the boss's, twist's and
  combo bars, the tactic button and the hero rows), checked as boxes (left and right too, not only rows) and again until it covers none; a
  bubble said at the deploy, before the spell row shows, is set clear again as the fight begins and when a boss's bar comes in
  (`reclearQuip`).

### After: no overlaps

Every case at all three sizes, parties of five and eight, every moment: 0 overlaps. (The first after run found 2 more, a quip pushed under
the boss's bar into the toast's lane; a quip now keeps clear of a lane toast too, and steps out of the lane when a toast comes.) The
probe measures the page's parts, not the board's own floating words: a combat label drawn on the board near the screen's edge can still
be cut by the edge, as before. Shots: `docs/samples/combat-hud/after-<party>-<scene>-<w>.png` (2x, reduced to 256 colours).

## 4. The flags on the fighters

The owner's words: "Why are there flags on the characters in the battle screens?"

Nothing in the fight draws a flag, pennant, banner or marker on a fighter: no tactic, formation, bond, trait, oath or origin mark is put on
the board (the only pennant icon is the Advance tactic's, on the button). What reads as a flag is each hero's **meter plate over its head**
(`drawBar`, `render/unitView.ts`): its health bar, its pool (stamina or mana) and its ultimate's sliver were drawn as three bars stacked on
a dark plate 32 px wide and 12 px deep. At the fight camera's zoom that dark block with a green stripe on top, wider than the little sprite
under it, looks like a flag flown over each hero. A foe has only its single red bar, which is why only the heroes seemed to carry them.

The tall black-and-red pole seen on the Calamity's first map is not one either: it is a shrine tile (the land's terrain, the "Holy
ground" blessing), standing on the board, not on a fighter.

It carries useful information (who is hurt, who is close to a skill or an ultimate, at a glance over the board), so it stays, made subtle:
one slim strip the width of the bar, on a faint plate (half as dark): health 3 px (green, gold when low), the pool 1 px under it (gold
stamina, blue mana), the ultimate 1 px under that (violet filling, gold when ready); 7 px deep in all instead of 12. The rows under the
board show every number. The foes' bars are unchanged.

## Checks

- `npm run typecheck`, `npm run web`.
- `npm test -- auto-formation tactic formations autoplay ui-standard quip no-flicker fight-hud`: 105 pass.
- The probe before and after, all three sizes (above); the shots in `docs/samples/combat-hud/`.

## 5. The boss's bar under Auto (BOSS-BAR)

The owner's words, on 0.373.0: "The Auto button covers the boss health bar."

### When it happened

The spell row (`#hudSpells`: the War Horn, the mana, the orbs, Auto) may wrap (`flex-wrap: wrap`, so a narrow phone's Auto drops under the
row rather than off the screen). With the War Horn in the row (held once an Eidolon is bound) and four spells (three slots and the open
one; no save casts more, so there is no six-spell row), the row is too wide at 393 and 360 across: Auto drops to a second line, 148 to
196 px down. `layout` (`main.ts`) put the boss's bar under a row it took to be always one line high (`ORBS_ROW`, 48 px), at 148 px: Auto
lay on the bar's left end, 48 x 34 px. At 412 across the row fits on one line. The phone's height does not matter (360x640 the same). It
happened in every mode with a boss's bar: an army's boss, the Calamity's map boss and an Eidolon's trial (the Last Stand draws its foes'
bars on the board and has no bar to cover). The 0.373 probe missed it because its save had no Eidolon bound (no horn) and three spells.

### The fix

- **Laid out from what is drawn** (`placeTopHud`, `main.ts`): a twist's banner under the top bar, the spell row under that, then the
  boss's bar under the spell row's measured bottom (at least one row's height, as before the fight when the row is not drawn), and the
  synergies and the combo bar under the lowest of them. `layout` calls it.
- **Laid out again when anything up there changes size** (`watchTopHud`): a `ResizeObserver` on the top bar, the twist banner, the spell
  row and the boss's bar runs it again when the row wraps or unwraps, the War Horn or a spell comes in, the fonts load or the bar shows.
  The bar is also placed (its name set first) the moment it shows (`refreshBossBar`). When the bar moves, a toast in its lane and a quip's
  bubble are set clear of it again.
- The board's fit is reckoned as before.
- **Quips** (`quipView.ts`, `hudClear.ts`), which the new cases caught on main as well: on a short phone (360x640) the tactic button sits
  above the screen's middle, and a bubble's old step (below a part in the top half, above it in the bottom half) sent it back and forth
  between the button and the hero rows, ending on the button. A bubble now goes to the nearest spot just above or below a part that covers
  none and stays on the screen (the old step only when there is none). And the parts kept clear are every match, not the first, so a
  toast fading out of the lane and the next coming in are both kept clear. A bubble said at the deploy is set clear again as the spell
  row comes in.

### The probe

`tools/combat-hud/probe.mjs` now also plays boss waves with 2, 3 and 4 spells, with and without the War Horn, in an army, at the
Calamity's map boss (the map's boss spot entered through its own view) and in Nivra's trial (as practice, the same fight), at
393x852, 360x780, 412x915, 360x640 and 393x852 with a 24 px top safe-area inset (put on the top bar by hand: a desktop browser's inset is
0: every rule of the page's sheets that reads `env(safe-area-inset-top)` is given 24 px). It waits for the fonts. A boss case with no boss's bar on the screen counts as a failure, so the probe cannot pass by missing the bar.
`KITS=boss` runs only the boss cases; `SIZES=393,360640,393s` picks sizes.

- Before (main at 0.373.0, the boss cases, `KITS=boss`): 17 overlaps. `auto x bossBar (48x34 px)` 12 times: four spells and the horn at
  393x852, 360x780, 360x640 and 393 with the inset, in the army, the Calamity and the trial (never at 412). `tactic x quip` 4 times and
  `toast x quip` once, all at 360x640.
- After: see the checks below. Shots: `docs/samples/combat-hud/bossbar-before-<case>-<w>.png` and `bossbar-after-<case>-<w>.png`
  (`<w>x640` for the short phone, `<w>s` for the inset).
