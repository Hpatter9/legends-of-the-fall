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
