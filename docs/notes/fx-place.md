# FX-PLACE: battle effects play on the right tiles and cover the right fighters

Branch `claude/fx-place` (from main 0.455.0). The owner's ask: "make the battle effects play on the appropriate space, covering the appropriate
heroes". Renderer only: the sim is unchanged, and the version and `UPDATES` are untouched.

## The pure rule and the harness

- **`src/render/fxPlace.ts`** (new, pure) maps an event to the tiles its ground effect covers, using the sim's own reach for each:
  - `areaTiles`: an `area` event's 3x3, wider by its `r`, as `landArea` strikes; or, for a Mythic move in `AREA_REACH`, its diamond. `areaSkill`
    names the move an `area` belongs to.
  - `spellTiles`: a king's spell's tiles at its rank, as `castSpell` reads them.
  - `auraTiles`: an aura's diamond (Manhattan reach, as `toolkit/auras.ts` counts it).
  - `tilesWithin`: the helper behind all three.

  `fx.ts` draws its ground marks from these.
- **`test/fx-place.test.ts`** holds each rule to the sim:
  - Every king's spell, cast on a board crowded with foes and heroes at rank 1 and the top rank (38 casts touching 107 fighters), touches
    only fighters on its drawn tiles. The spells that strike all there (frost, lance, sunbeam, shatter, snare, hex) miss none on them.
  - The king's walls rise on exactly their drawn row.
  - An aura's drawn diamond is the sim's Manhattan reach, tile for tile.
  - An area's 3x3 is `landArea`'s.
  - The Mythics' reaches and the skill an area belongs to.
- **`node tools/fx-place/audit.mjs [--level 35] [--stage 40] [--fights 6]`**: every hero (the Mythics among them) in seeded fights at a level
  with every skill and ultimate open. For each `area` event it gives:
  - the share of the fighters its caster struck there that stood outside its drawn tiles (positions read before the tick, as a blast throws
    the struck outward);
  - the share of the foes inside a harm's tiles that it missed.

  `OLD=1` draws every area as the old 3x3, for comparison.
- **`node tools/fx-place/casts.mjs`** (bundle `casts.ts`) lists a page-dumped fight's casts by time, so `tools/battle-feel/frames.mjs --from
  <ms>` can take a strip at that moment.

## Every effect, what was wrong, and what changed

| Effect | Where it draws / what it covers | Was wrong | Now |
| --- | --- | --- | --- |
| Area (volleys, meteors, shells, bombards, judgements, starfalls, the ultimates' rains) | the 3x3 (+`r`) round the event's tile, on each tile's top | The marked tiles were drawn on the effects layer, over the heroes standing in them (a red or gold tint across their bodies) | Laid on each tile's ground, under the fighters in them (`tilePatch`), with main's pulse and a firm rim. Audit: 0 to 3% of the struck outside the tiles (the rest are blasts' throws and marks that follow a target, below) |
| The Mythics' bursts (Eclipse Cleave, Crownfall, Solar Aegis, Kneel Before Night, Starbreath, Broken Halo, Rootquake, Living Sanctuary, Heartwood, The World Stands) | `AREA_REACH`: the move's own diamond (reach 2 to 5) | Every one drew a meteor's red 3x3 with a fireball falling on its own caster. With the old rule, 78% of Broken Halo's struck stood outside it, 59% of Crownfall's and 40% of The World Stands'. The wards (Solar Aegis, Heartwood, Living Sanctuary, Death Denied) showed a red meteor on the foes round them, whom they never touch | Their diamond, in their element's colour (a ward in the healers' gold), under the fighters, with a burst of the element on the caster and no fireball. Audit: 0 to 11% of the struck outside |
| Comet Lance, Star Hunger, Death Denied, Rewrite Fate | the one tile they act on, or the caster's | A 3x3 meteor for a blow on one foe (60% of the foes in it were never struck), or for a heal and rewind of the whole squad | Only their own tile; each fighter struck, healed or moved shows its own effect on it |
| Heavenfall's constellations | three burning 3x3s, six seconds each | The sim burns them (`b.zones`) but sends no `zone` event, so nothing burned on screen | Burned for their six seconds on each constellation's 3x3 (`burns`) |
| Vael's totality ward | her diamond of 4 | It rides on a blow, with no cast that tick, so it was drawn as her last skill's area | Read as her ward (`areaSkill`) |
| King's spells: Lance | the aimed column | A 3x3 glow at the aimed tile, as well as the pillars down the column | The column glows |
| King's spells: Sunbeam | the aimed row (three rows at the top rank) | A 3x3 glow | The row (or three) glows |
| King's spells: Fire, Ice and Bone Wall | the wall's row (3 tiles, 5 at the top rank) | A 3x3 glow round the row | The row glows |
| The other spells (heal, haste, shield, frost, smite, poison, hex, cleanse, renewal...) | the 3x3 | The glow was drawn over the heroes in it | Under them, on each tile's ground |
| Auras (Spirit Guardians, Aura of Protection, Circle of Death, Solar Tribunal, Host's Halo, the clouds...) | the diamond of the reach | The tinted tiles (when no painted aura) were the square round it, half again as many tiles as the sim holds (49 for a 25-tile reach 3) | The diamond, tile for tile the sim's |
| Burning ground (`zone`), caltrops, snares, laid terrain, walls | each on its tile's ground | Checked: right (3x3 as `near3x3`, single tiles, the sim's tiles) | Unchanged |
| A skill's hits | on each fighter struck | Fixed in 0.451 (drawn as the caster's last skill) | Unchanged: every `casting` lookup reads this tick's cast first |
| Shots | from the shooter's body to the target's, re-aimed each frame | Checked: right, and they follow a moving target | Unchanged |
| Heals, shields, marks, statuses | on each fighter's sprite (feet, body or head by kind) | Checked: right | Unchanged |
| Dashes, blinks, shoves, launches | along the sim's path, tile tops with height | Checked: right | Unchanged |
| The Eidolons' strikes | a pillar over each foe struck, the burst on the foes' middle, the aftershocks across the foes' half | Checked: the strike hits every foe, so the spread is right | Unchanged |

What is right as it is:

- **Height:** every tile-placed mark goes through `tilePos` (the tile's height), so a mark on a raised or sunken tile sits on its top.
- **The camera:** the effects' layers (`fx.root`, its particles and the ultimate moment's layer) are children of the board's own container, so they
  move and zoom with the board through the follow camera, the ultimate's lean-in and x2 and x3.
- **Moving and dying targets:** body effects play on the struck fighter's sprite. Tile marks stay on their tiles, as the sim's areas do. A dive's
  doubled blow on its marked target (Queen Dragoon's Jump) follows that target even when it has left the 3x3, which is the sim's own rule; that
  is most of Jump's 24% "outside" in the audit.
- **Deliberately outside the tiles:**
  - Supernova Alignment's drags slam foes up to four tiles out; each slam shows on its foe.
  - Heavenfall strikes every foe.
  - Rewrite Fate heals the whole squad, so 86% of the healed stand outside its tile; each heal shows on its fighter.

## Shots

Frame strips (`docs/samples/fx-place/`; `tools/battle-feel/frames.mjs --only fx-mythic|fx-aura [--from <ms>] [--tag ...]`):

- `fx-mythic-crownfall-before-393.jpg` against `fx-mythic-crownfall-after-{393,360,412}.jpg`: Vael's Crownfall at 6.6 s. Before, a red 3x3
  and a fireball on her own tile; after, her diamond of 4 in her element's colour, under the fighters.
- `fx-mythic-{before,after}-*.jpg` and `fx-aura-{before,after}-*.jpg`: the whole fights, an archer's volleys and a wizard's meteor, and the
  auras of the Warlock, Inquisitor and Seraph, at 393, 360 and 412 wide.

## Art

No new art was needed: the patches are drawn tile by tile, so an area of any size or shape is covered exactly, never a small sprite stretched over
it. `docs/notes/fx-place-art-prompts.md` is not written.

## Checks

`npm run typecheck`, the full `npm test`, `npm run web`, and the strips above at 393x852, 360x780 and 412x915 (no page errors).
