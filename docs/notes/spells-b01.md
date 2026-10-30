# RPG spells, batches 0 and 1: fixed skill keys and the movement toolkit

The owner approved design v2 ([rpg-spells-design.md](rpg-spells-design.md)) and said to start building. These are its first two
batches. Neither one gives a hero a new move yet, so **every fight plays exactly as on main**, and the proof is below. Batch 2 (the
healers and the revive) comes next.

## Batch 0: fixed skill keys

- **The key:** `Skill.key?` (in `src/sim/abilities.ts`), read through `keyOf(s)`. When a skill has no key, its key is its name, so
  today every key equals the name. The key is what these look a skill up by:
  - the ailment riders (`skillRiders`) and the skill-2 checks (`SKILL2_WHEN`);
  - the `skill` event, whose `name` field now carries the key;
  - the page: its look, element, sound, ultimate check and quips (`fx.ts`, `soundRules.ts`, `quipRules.ts`, through `keyOfKit` and
    `ultKeyOf`).

  A later batch can rename a hero's skill by giving it `key: '<old name>'` and a new `name`, and its painting, sound and riders carry
  on.
- **The words on screen:** `skillShown(u, key)` in `src/sim/heroKits.ts` gives the name of the skill with that key in the caster's
  own kit. So a foe that kept a skill's old name still shows the old name.
- **Foes get their own copies.** A foe whose skill or ultimate was the same object as a hero's now has its own copy, the same in
  every way (the last pass in `abilities.ts`, after the elite and Calamity kits are built). These are: the Skeleton Archers, the werewolf
  packs, the grove satyrs, the maze minotaurs and gorgons, the Orc Chieftain and Bone Captain, the Alpha Wolf, the Gorgon Queen, the
  Minotaur Champion, the yokai, the Nine Tails, the Iron Golem and the elites. Reworking a hero's skill in place can no longer change a
  foe.
- **Tests:** `test/skill-keys.test.ts`.
  - With no key of its own, a skill's key is its name.
  - Every hero's two skills and ultimate find a look and an element by key.
  - Borrowed skills are copies with the same key and cast.
  - A renamed skill's event carries its key, and the words shown come from the caster's kit.

## Batch 1: the movement and battlefield toolkit

All of it is in `src/sim/toolkit/`, as the design's section 3 specifies. A move is resolved in the tick it is cast: the tile changes at
once, and the fighter's `step` (which carries an `arc` for a launch or a leap) and the move's event tell the page how to draw it. No
randomness: every choice is a fixed order (a score, then distance, then id).

| Part | File | What it offers |
| --- | --- | --- |
| The shared move rule | `move.ts` | `previewMove` (changes nothing, so the AI can score a move first) and `displace`. `shove`, `pull` and `launch` move one fighter; `moveMany` moves several, farthest first for shoves and launches, nearest first for drags. The rules are in the first table below. `airborne(b, u)`. |
| Charge | `charge.ts` | `charge(b, me, opts)` with `route: 'line' \| 'path' \| 'leap'` and `through`. Riders: `stun`, `shove`, `launch`, `haste`, and `land` (a 3x3 splash). Also `chargePlans`, `bestCharge` and `chargeScore`. The score is the blow; ×1.5 for a shooter or caster; up to +30% for a hurt target; +1 blow for each extra foe a through-charge strikes; ×0.5 when the charger is under 40% health and would end with three or more foes beside it. |
| Teleport | `blink.ts` | `blinkTo`; `safeTile`, the farthest from the three nearest foes; `behindTile`, opposite the target's facing, else the free side tile farthest from its friends; `blinkStrike`; `teleportSlash` (k foes in turn, untargetable between hops, optional `home`); `canLand`. |
| Pull | `move.ts` | `pull`: a drag towards the caster, re-aimed each tile, that stops beside the caster. A drag up a climb higher than the foe's own jump slams it. |
| Knockback and launch | `move.ts` | `shove` and `launch` from a source (the caster or a blast's centre). |
| Burrow | `burrow.ts` | `burrow`, `burrowTarget` (most foes beside it, back-line foes counted twice) and `erupt`. The caster is underground (`Unit.under`) for 800 ms + 100 ms a tile. While under it cannot act, cannot be targeted or struck, and its tile is free (`unitAt` skips it). A pending `erupt` brings it up under its target, or the nearest foe, or where it went down. The target is struck and launched, the foes beside it are struck and shoved a tile, and the caster takes the target's tile. |
| Walls | `walls.ts` | `raiseWall` lays the six kinds (second table below) and `tickWalls` runs them. A wall is never laid where it would leave some fighter unable to walk to any foe (a flood fill per fighter), nor on the Last Stand's dais. The AI's lines are `chokeLine`, `laneLine`, `shieldLine` and `mostAtRisk`. `shotWall` is what a wall does to a shot. |
| Auras | `auras.ts` | `raiseAura` (round the caster or on a tile; the same name from the same caster refreshes it) and `tickAuras`. For allies: `guard` (the strongest counts, `Unit.auraGuard`, taken off in `hurt`), `atk` (undone when it runs out), `heal`, `ward`, `mana` and `stamina`. For foes: `dmg`, `slow` and an ailment. An aura round a caster ends when the caster falls. `auraWorth` counts the allies and foes inside. |
| Swap | `blink.ts` | `swapPlaces`, and `canSwap`, which is never true for a boss, a big fighter, the Standard or the king. |
| The AI's choices | `score.ts` | `pullTarget` (the hardest-hitting back-line foe at 3+, never one already beside a hero, a boss last), `moveWorth`, `crowdWorth`, `moveIsWorth` (beats a plain hit by half), `bestThrow`, `rescueTarget` (under 35% with two foes beside it) and `shouldEscape`. |

**The shared move rule:**

| The next tile is | A shove or drag | A launch |
| --- | --- | --- |
| Free | Moves on | Flies over |
| Another fighter | Stops. Both take 0.25x attack; nobody else moves | Flies over |
| Solid, or the board's edge | Stops with a slam: 0.4x + 0.1x for each tile short, and a 0.8 s stun | Ends before it, with the slam |
| A climb of more than 1 (more than the foe's jump for a drag) | Slams | Flies over up to 2 levels above the take-off |
| A drop of 2 or more | 10 damage a level | Fall damage from the take-off |
| Deep water | Stops at the bank | Lands short |
| Lava | Set burning | Set burning |
| Ice | Slides one tile further | Slides one tile |
| A powder barrel | The barrel goes off, and the slam | The same |

More rules for moved fighters:
- **A launch** is airborne for 450 ms + 60 ms a tile, then stunned for 0.6 s. While it is in the air, melee cannot reach it (a blow
  already swung at it misses), but shots and spells still can.
- **Bosses and big fighters** move half as far, and a launch on them is a one-tile shove.
- **Never moved:** the steadfast (`passive.steady`), the still, decoys and the king.
- **No friendly fire:** nothing shoves, drags or launches a fighter of the mover's own side.
- **Fliers** take no fall damage.

**The walls:**

| Wall | How it is laid | Blocks walking | Blocks shots | Touching it |
| --- | --- | --- | --- | --- |
| Stone | `Tile.wall` | Everyone | Yes | — |
| Ice | `Tile.bar` | Everyone | No | Foes beside it are chilled each second; a slam into it shatters the tile |
| Thorns | `Tile.bar` | Everyone | No | Foes beside it take 0.3x and bleed, each second |
| Light | `Tile.bar` + `barSide` | The other side only | The other side's shots | Foes beside it take 0.2x each second |
| Fire | Only on the battle | Nobody | No | Foes in it burn (0.15x a half second) |
| Wind | Only on the battle | Nobody | Turns the other side's shots back for half | — |

`canStep` and `walkFrom` take an optional `side`, which opens a wall that lets that side through. Every walk in the fight's own AI
passes its walker's side. Two places do not: the Last Stand's flow fields, which are built once a wave, and the long map's walk,
which treat any raised wall as solid. The batch that first lays walls in the Last Stand should look at that.

**Where it plugs into the fight (`battle.ts`):** each of these does nothing until a skill uses the toolkit.
- `tickToolkit`, called when there are walls or auras.
- The pending `erupt`.
- Shots meeting a wall, and a blow at a fighter in the air or underground.
- The melee AI not reaching a fighter in the air.
- `unitAt` skipping a burrower.
- `hurt` skipping a burrower, and taking an aura's guard off.
- The new events: `shove`, `launch`, `slam`, `fall`, `wallBreak`, `burrow`, `swap` and `aura`, plus `terrain` with the six wall
  kinds and a side.

New state is all optional: `Battle.walls?` and `auras?`; `Unit.air?`, `under?`, `auraGuard?` and `auraAtk?`; `Tile.bar?` and
`barSide?`.

**The page's placeholders** (`src/render/toolkitLooks.ts` holds the data; `fx.ts` and `unitView.ts` draw it). Until the painted spell
effects arrive ([rpg-spells-art-prompt.md](rpg-spells-art-prompt.md)), every look is a Pixel Effects pack strip, tinted:
- **A launch or leap** flies in an arc (`step.arc`). Its shadow stays on the ground, with dust where it lifts and a burst where it
  lands.
- **A shove** kicks dust along its path.
- **A slam** shows a flash and a small shake; **a fall** says "Fall!".
- **A burrow** shows the dig, then a heaped earth mound running along the tunnel (drawn, with the dust strip on it) while the
  burrower's sprite is hidden, then the eruption.
- **The walls:**
  - stone: the board's ruined-wall prop;
  - ice: the prop in pale blue, with ice spikes;
  - thorns: forest spikes;
  - light: a light pillar;
  - fire: flames;
  - wind: a vortex.

  Each rises with a burst, and fades when the sim no longer has it.
- **An aura** is a ring over its reach (a diamond of tiles), breathing, with its strip turning at its heart; it follows its caster.
- **A swap** shows a swirl at both ends; **a blink** uses the existing puff.
- **Sounds** use the shared cues until the rendered `mv-` sounds arrive.

Reduced motion holds each loop's first frame, and battery saver thins the dust. `window.__toolkit` exposes the toolkit to the
screenshot tool. The game never calls it from there.

## The proof that nothing changed

`tools/spells/identity.ts` (run with `node tools/spells/identity.mjs`) folds seeded fights into one hash per scenario: every event of
every tick, with all its keys, and every fighter's end state (tile, health, pool and ultimate meter). The scenarios are:
- every mode from the STATUS-FX proof (`field1`, `field30`, `bosses`, `armyFoes`, `spells`, `lands`, `army`, `daily`, `tower`,
  `stand`, `calamity`), played with the game as it ships, ailments on;
- a fight for each of the 45 heroes at level 1, 10 and 30 (`heroes1`, `heroes10`, `heroes30`).

The fixture `test/fixtures/spells-identity.json` was recorded on main's code before batch 0 (commit 8d10c1b).
`test/spells-identity.test.ts` holds every hash to it, and it passes with both batches in. The merged main (0.235.0) was also run
alone in a clean checkout, and it gives the same 14 hashes, so the fixture stands for the current main too.

## Tests

- `test/toolkit.test.ts` (29 tests), on bare boards:
  - every row of the move rule;
  - the boss rules, no friendly fire and fliers;
  - pulls, and the order several fighters are moved in;
  - line, path and leap charges, through-charges, and the charge AI;
  - blinks, behind-tiles, teleport slashes and swaps;
  - burrow, from going down to coming up;
  - each wall kind, the seal check, and the three wall lines;
  - aura guard, healing, harm, refresh, ending with the caster, and the attack lift being undone;
  - the pull, throw, rescue and escape choices;
  - the same staged moves ending the same way every time.
- `test/toolkit-looks.test.ts`: every placeholder names a strip the pack has.
- `test/skill-keys.test.ts` (4 tests) and `test/spells-identity.test.ts`.

## Checks

- `npm run typecheck` passes, and the full `npm test` passes (1528 tests, 0 failures) after merging main 0.235.0. `npm run web` builds.
- `node tools/spells/shots.mjs` (port 8840) stages each move in a real army fight (the Undead, wave 2) by calling the toolkit on the
  fight's own fighters, then holds the fight still. Screenshots:
  - at 393x852: `docs/samples/spells-b01-launch-393x852.png`, `-walls-`, `-aura-`, `-burrow-` and `-slash-`, and all five side by side
    in `spells-b01-all-393x852.png`;
  - the launch also at 360x780 and 412x915.

  No page errors.
