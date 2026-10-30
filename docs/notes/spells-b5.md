# RPG spells, batch 5: the ranged heroes and the summoners

The sixth batch of the approved design v2 ([rpg-spells-design.md](rpg-spells-design.md), sections 4.3 and 4.7), after the melee heroes
([spells-b4.md](spells-b4.md)). It reworks eight heroes: the Archer, the Ranger, the Gunslinger, the Rifle Bot, the Siege Bot, the Dread
Pirate, the Beastmaster and the Reaper. Every renamed move keeps its old key, so its look, sound, ailment rider and skill-2 check carry on.
What the moves newly do is built on the movement toolkit, in `src/sim/kits/ranged.ts`. Nothing outside these eight heroes plays differently
(the proof is below).

## The eight kits

| Hero | Skill 1 | Skill 2 | Ultimate |
| --- | --- | --- | --- |
| Archer | Volley (kept) | **Aimed Shot** (Pinning Shot): with a foe beside her she first **leaps** up to 2 tiles back, to higher ground if she can (`leapBack`, `highGround`) | **Hail of Arrows** (Arrow Storm), renamed |
| Ranger | **Snare** (Snare Trap), renamed | **Spike Growth** (Spike Field), renamed | **Entangle** (Hunter's Net), renamed |
| Gunslinger | **Piercing Shot** (Dead Eye), renamed | **Fan the Hammer**: with a foe within 2 she first **rolls** up to 2 tiles clear (`rollAway`, a dash) | High Noon (kept) |
| Rifle Bot | **Rapid Shot** (Burst Fire), renamed | Suppressing Fire (kept) | **Overclock**: it first **jets** (an arc, up to 3 tiles) to the highest free tile in reach, or clear of a foe beside it (`jets`) |
| Siege Bot | **Bombard** (Shell Barrage): the shell **launches** the foe at its heart 2 tiles and **shoves** the rest of the 3x3 a tile out (`BOMBARD_THROWS`) | Siege Mode (kept) | **Orbital Strike**: the first shell **launches** every foe in its 3x3 2 tiles outward (`ORBITAL_THROWS`) |
| Dread Pirate | **Cannonade** (Broadside), renamed | **Powder Keg**: the blast **launches** its 3x3 a tile outward, 2 at its heart (`KEG_THROWS`) | Ghost Fleet (kept) |
| Beastmaster | **Summon Beast** (Call of the Wild), renamed | **Pack Tactics** ("Sic 'Em"): each wolf within 4 **leaps** at the marked foe (`wolfLeap`); farther ones blink, as before | **Conjure Animals** (Hunt of the Pack), renamed |
| Reaper | Reap (kept) | **Animate Dead** (Bound Soul), renamed | **Harvest of Souls**: the sweep first **drags** every foe within 5 a tile towards him (`reaperDrag`); power 2.6 (was 3.07) |

The throws are one rule, `blastThrows(b, by, at, throws, out)`: a `Pending` shell or meteor that carries `throws` (`battle.ts`) throws its
foes when it lands, the ring outward from the blast's heart (`moveMany`) and the heart's foe along the line from the thrower.

**Tier skills, renamed:**
- the Gunslinger: Steady Aim, Through and Through, Lightning Draw;
- the Reaper: Grim Harvest (tier 4);
- the Dread Pirate: Double Cannonade, Ghost Armada, The Drowned Fleet.

The talents and the deep talent rows that name these skills use the new names.

## The page

The moves use Session A's painted toolkit art: launches and leaps its launch arc, shoves its shove, the rolls its dash streak, the drag
its pull. A skill's lead look is its old one, kept by its key. Screenshots: `docs/samples/spells-b5-orbital-*` (the Orbital Strike's shell
throwing its 3x3) and `docs/samples/spells-b5-harvest-*` (the Reaper's sweep), from `tools/spells/ranged-shots.mjs` (port 8910).

## Balance

**Parity** (`node tools/kits/tune.mjs`, 12,000 fights; "main" is 0.251.0 in a clean checkout):

| Level | The eight, main → this batch | Every hero |
| --- | --- | --- |
| 1 (stage 5) | Archer −0.9 → −1.0, Ranger −0.6 → −0.8, Gunslinger −0.3 → −0.3, Rifle Bot −0.3 → −0.4, **Siege Bot −1.0 → +2.5**, Dread Pirate −0.2 → 0.0, Beastmaster −0.4 → −0.3, Reaper −0.7 → −0.9 | none beyond 6 (beyond 4: the Knight, Samurai Commander and Illusionist, as on main) |
| 10 (stage 24) | Archer 0.0 → +0.7, Ranger +2.1 → +1.8, Gunslinger +0.3 → +0.3, Rifle Bot +0.4 → +0.3, **Siege Bot −4.6 → −1.6**, Dread Pirate −0.2 → −0.1, Beastmaster +1.7 → +1.6, Reaper +1.7 → +1.8 | none beyond 6 (seven beyond 4, none of the eight; nine on main) |
| 30 (stage 78) | Archer −1.0 → −0.4, Ranger −1.7 → −1.4, Gunslinger +0.7 → +0.4, Rifle Bot −0.8 → +1.4, Siege Bot +0.6 → −1.1, Dread Pirate −1.9 → −0.3, Beastmaster −1.9 → −2.9, Reaper +2.7 → +1.8 | none beyond 4; spread 7.4 (7.0 on main) |

The Siege Bot and the Dread Pirate, the outliers before, are both nearer the middle at every level: the Siege Bot's throws lift it from −4.6 to
−1.6 at level 10. Before its power was trimmed, the Reaper's drag made Harvest of Souls +4.8 at level 30.

**The modes:**

| Mode | This batch | Main |
| --- | --- | --- |
| Last Stand (party of eight with the Archer and Ranger; 30 greedy runs; mean, median at L10, L20, L30, L60, L100) | 8.9 (9), 10.2 (10), 14.3 (14), 18.5 (19), 22.7 (22) | 8.9 (9), 10.3 (10), 14.5 (14), 18.6 (19), 23.2 (22) |
| Calamity (150 greedy runs; mean maps cleared) | 1.47 (99/46/1/0/0/0) | 1.44 (99/43/1/0/0/0) |
| Daily (60 days) | 80% cleared | 80% (the same) |
| Armies on Normal (`tools/curve/run.mjs`, 24 saves) | undead L8 6.1, beasts L15 2.1, wildwood L22 3.1, labyrinth L35 17.7 | 6.1, 2.0, 3.3, 17.7 |

## The proof that nothing else changed

`REWORKED` in `tools/spells/identity.ts` names the eight. The five `...Others` scenarios now leave them out of every team. I recorded them
on main's code before the batch (commit 6b1c70f), and they did not move.

These scenarios changed:
- `field1`, `field30`, `bosses`, `armyFoes`, `spells`, `heroes1`, `heroes10` and `heroes30`. Each has one of the eight; the level-1 ones
  have the Siege Bot, whose skill 1 (Bombard) now throws.

These did not move: `lands`, `army`, `daily`, `tower`, `stand` and `calamity`.

`ailment-logs.json` moved for `field1`, `field30`, `bosses`, `armyFoes` and `spells` only. Both test files say why.

Tests: `test/ranged.test.ts`.
