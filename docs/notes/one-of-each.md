# One of each hero on the field (ONE-OF-EACH)

The owner's ask: "New update: we should only allow one unit of a hero on the battlefield at a time." So the same hero kind may not stand on
the board twice at once. Copies still come (hires, offers, rewards) and wait on the bench: merging two of a kind (MERGE-TWO) is what they are
for.

## What counts as the same hero

The same kind (`def`) is the same hero, whatever its grade (★ to ★★★★), rank, level, gear or awakened form: they all fight as one `def`. A
cursed mirror's inverted clone is its original's kind, so it is the same hero too. Not heroes for the rule: a unit a skill called up (it has
an `owner`: the Beastmaster's pack, the Druid's treant, the imps), a summon kind (`UNITS[k].summon`: wolves, treants) and a fallen hero.

## The rules (`src/sim/battle.ts`, `src/sim/run.ts`, new `src/sim/oneEach.ts`)

- `placeBlock(b, def, u, v, tag)` says why a hero may not go on a tile: `phase`, `side`, `tile`, `taken` or, new, `twin` (another of its kind
  is on the field). `canPlace` is `placeBlock(...) === null`, so `place` refuses a twin. `twinOf(b, def, tag)` finds the twin: a living hero
  unit of that def, tagged as another roster hero, with no owner. A placed hero moved to another tile is not its own twin, so moving still
  works. An untagged hero (the old tests' and tools' way) has no twin: `place` moves the one there is, as it always did.
- `squadTwin(run, kind, except)` and `canJoin(run, id)` (room in the squad and no twin in it): `setSquad` refuses a second of a kind, and
  every place that pushed a hero into the squad now asks `canJoin` (`newRun`'s two free heroes, the Calamity's hires `hireHero`, the free
  prisoner and the mirror's clone in `mystery.ts`, the hero who fills a gone clone's place in `tower.ts`).
- `swapTwin(b, run, id, boost)`: a bench copy put on its twin's tile takes the tile and the twin's place in the squad, and the twin goes back
  to the bench (`canSwapTwin` says when). The page uses it for a drop or a tap on the twin.
- Merging is untouched: a copy dragged onto its twin of the same grade merges into it, as before (the merge gesture comes first).
- The greedy player: `pickSquad` takes one of each kind (the strongest copy first; a kept hero first, a kept second of a kind is dropped;
  `oneOfEach`), so a roster of fewer kinds than the squad fields fewer heroes. `autoDeploy` fields one of each too and trims the squad to what
  it placed. This covers the page's Auto place, auto-replay (`autoPrep` uses both), the balance tools and the tests.
- Old saves: a saved run whose squad holds two of a kind loads as it is; at the next deploy the extra copy goes back to the bench (the page's
  `placeSquad` drops a hero `place` refuses from the squad, and `autoDeploy` trims it). No save field changed.
- The Last Stand was one of each already (`pickEight` takes distinct kinds; its heroes are posted with `addUnit`), and so was the Calamity's
  hiring (each kind once a run). The daily's five and a quest battle's cast are distinct kinds; the quest's hires respect the rule like any run.

## The page (`src/main.ts`, new `src/oneEachNote.ts`, new `src/oneEach.css`, `src/render/boardView.ts`, `build.mjs`)

- A bench card of a kind already on the field is dimmed and marked **On field** (`.twinOn`, `.twinMark`), unless it can merge with the one
  fielded (then the merge marks show, as before).
- Picking it up says "Kwame is already on the field · drop on them to swap" by the finger, and the twin's tile turns pink (the new `twin` tile
  mark). Let go on the twin's tile: they swap (or merge, if they match). Let go anywhere else on the rows: refused, the note again ("... drop on
  them to merge" when they match) and the twin's tile lit for a moment. The same for a tap on a chosen card then a tap on the board.
- The note is a small fixed box (`#twinNote`, `role=status`), 2.4 s; reduced motion drops its slide-in. The heroes are named (`heroName`),
  so the note names the hero ("Kwame"), not the calling.

## Balance (measured, not retuned)

Before is main 0.272.0 (94c27f7), after is this branch, on the same seeds. The bot used to field two of a kind when they were its strongest
heroes; it now fields one of each, which also fills more trait tiers (a trait counts different heroes).

| Measure | Before | After |
| --- | --- | --- |
| Single-try clears, 48 tries (`tools/merge-two/run.mjs`, the recruits' five): Orcs Normal 30 / Orcs Mythic 55 | 100%, 17% | 100%, 8% |
| the same: Infernal Normal 55, Yokai Normal 64, Golems Normal 74 | 10%, 6%, 50% | 15%, 4%, 63% |
| the same, the starting five, no talents: Orcs at 1, Undead at 22, Beasts at 20 | 19%, 38%, 33% | 21%, 31%, 31% |
| **A new save's starter pack of three** (`tools/one-of-each/run.mjs`, 48 tries): Orcs at 1, Sword and Shield / Blade and Spell | 75%, 46% | **29%, 13%** |
| the same at 5 | 90%, 79% | **50%, 21%** |
| the same at 10 | 96%, 98% | 71%, 77% |
| the same, Undead at 15 | 15%, 10% | 0%, 2% |
| Daily, fresh save, 112 dates (`npm run daily-rate`): with hearts / no hearts | 72%, 49% | 79%, 61% |
| Mythic at level 100, every talent, maxed castle: mean tries, 8 saves (`run.mjs --mythic`): Infernal, Yokai, Golems | 4.25, 4.13, 2.25 | 2.13, 2.38, 2.63 |
| Army pace, Normal tries at 55 / 65 (`SAVES=6 node tools/army-pace/run.mjs normal 55,65`, share cleared in 25): Ogres | 1.0, 1.0 | 1.2, 1.2 |
| the same: Infernal | 15.7 (67%), 3.0 | 12.0 (83%), 2.0 |
| the same: Yokai | 26.0 (0%), 12.5 (83%) | 26.0 (0%), 16.5 (83%) |
| the same: Golems | 22.7 (33%), 8.3 | 24.2 (17%), 9.3 |
| Last Stand | unchanged by construction: one of each already; its `stand` scenario hashes did not move | |

(The first five armies take one try at 55 and 65 before and after.)

What it means:

- **A new save is hit hard.** A starter pack is three heroes, so the party is three kinds and the field holds three heroes, not five, until
  more heroes are unlocked (before, the bot filled the other two places with copies). The first army's single-try clear at level 1 falls from
  75% and 46% to 29% and 13%. This is the one place the rule "breaks badly"; it is not retuned here (the owner's call, below).
- Saves with a full party of five: the early and middle cells move within the noise of 48 tries (about 7 points), Orcs Mythic at 55 a little
  down. The climb's tries per army hold their shape (6 saves are noisy): the Infernal Host a little sooner, the Yokai and the Golem Forge a
  try or so later at 65. The daily is easier (79% against the 66-75% band) and Mythic at level 100 takes about half the tries on the Infernal Host and the Yokai:
  a squad of five different heroes fills more trait tiers than one with two of a kind.

## Tests

- New `test/one-of-each.test.ts`: a twin is refused with the reason `twin` and another kind is not; a placed hero moves; summons, a skill's
  called units and the fallen are not twins; a bench copy merges into its fielded twin; a copy swaps in on its twin's tile; the squad takes one
  of each (`setSquad`, `canJoin`); the greedy player picks one of each, the strongest copy first, and auto-place fields them; a roster of two
  kinds fields two; an old save with two of a kind fielded loads and the extra copy goes back to the bench; an army played by the greedy player
  never fields two of a kind; the Last Stand's eight are one of each.
- Changed to the owner's rule (each fixture fielded two of a kind on purpose or by accident):
  - `test/run.test.ts`: "grade raises hp and attack in the fight" puts its two knights on boards of their own; "squad is capped at five" uses
    seven kinds, not seven knights.
  - `test/equipment.test.ts`: "faster blows, crits and longer reach" sets a Ranger beside the Archer, not a second Archer.
  - `test/autoplay.test.ts`: "auto-deploy is legal on every board" expects the squad to be the smaller of five and the roster's kinds.
  - `test/starter.test.ts`: "the first run works with any pack" expects a second hire of the same kind to be refused on the field.
  - `test/calamity.test.ts`: "the squad takes ten" and "the cursed mirror's clone is a guest" hire distinct kinds (their lists had a second
    knight or archer); "the cursed mirror" expects the clone to wait on the bench while its original fights.
  - `test/difficulty.test.ts`: "Mythic is still not a first-try clear at level 100" takes six saves, not three (the bar, 1.5 tries, is as it
    was): the Golem Forge's first three saves took 2, 1 and 1 tries (1.33), over eight saves 2.63 (2.25 before).
  - `test/fixtures/ailment-logs.json` and `test/fixtures/spells-identity.json`: the `army` and `daily` scenario hashes re-recorded (the greedy
    player fields one of each); every other scenario, the Last Stand's included, keeps its hash.

## Tools and pictures

`tools/one-of-each/` (`run.mjs`, `pace.ts`: the starter packs' cells; `mythic.ts`: the Mythic check over more saves; `shots.mjs`: the browser
check). Pictures `docs/samples/one-of-each-{bench,refused,swap,merge}-{393x852,360x780,412x915}.png` and `one-of-each-held-393x852.png`.

## For the owner

1. **New saves**: with a starter pack of three, only three heroes fight until more are unlocked, and the first army is much harder
   (29% and 13% single-try clears at level 1, from 75% and 46%). Should a new save start with more heroes (a fourth and fifth early), the
   first army be eased, or is a three-hero start fine as it is?
2. **The cursed mirror** (the spire's event): its inverted clone is the same hero, so it waits on the bench while its original fights and
   can only be swapped in for it. Keep that, or let the clone take its original's place on the field for its two floors?
3. The daily is now a little easy for a fresh save (79% with hearts) and Mythic at level 100 takes fewer tries on the Infernal Host and the
   Yokai. Retune those, or leave them?
