# Hero talents (skill trees)

Every hero (all 25 of `ALL_HEROES`) has a small talent tree, kept per hero kind in `Meta.talents` like its level and shards.
The trees are data in `src/sim/talents.ts` (`TREES`); the panel is `src/talentView.ts` (styles in `src/talents.css`, inlined by
`build.mjs` after `equip.css`), on the hero sheet above Equipment.

## The tree

Eight nodes in three tiers (ids are `<kind>:<tier><letter>`, for example `knight:2a`):

| Tier | Nodes | Cost | Opens with |
| --- | --- | --- | --- |
| 1 | four cheap stat nodes (about +5% hp or attack, +1 defence, +3% crit or dodge, +4% attack speed, +6% move speed, +10% skill charge, a little regen) | 1 point each | always |
| 2 | a choice of two changes to the hero's own skill (Shield Wall lasts longer *or* draws foes from further; the Archer's Volley gets a second volley *or* slows what it hits) | 2 | two tier-1 nodes learned |
| 3 | a capstone choice of two: a second timed skill (a shout, a smoke bomb, a heal), a passive that changes how the hero plays (revive once, a kill refunds charge, thorns, leech) or, for a Mythic, a bigger ultimate | 3 | a tier-2 node learned |

A hero takes at most seven nodes (all four of tier 1, one of each pair) for 4 + 2 + 3 = **9 points** (`FULL_TREE_POINTS`).
The two of a pair are exclusive; the other one shows struck through.

## Points

- **Level**: one point every 3 levels (`LEVEL_POINT_EVERY`): 3, 6, 9, 12, 15, 18, so six at the cap.
- **Shards**: 3 of a kind's shards buy a point (`SHARD_POINT_COST`), up to 3 points (`MAX_SHARD_POINTS`). The split keeps ranks
  meaningful: a kind's rank still reads its total shards (`rankOf`), and spending shards on points is a separate tally
  (`Meta.talents[kind].bought`) that never lowers it. A duplicate pull is therefore worth either a nearer next rank or a third
  of a point, and a hero needs both its levels and a few duplicates to fill a tree (6 + 3 = 9).
- **Respec**: `RESPEC_BASE` 50 crowns plus 25 for each point spent (275 for a full tree) clears every learned node and gives
  the points back; the shard points stay bought. The panel asks for a second tap.

`learn`, `buyPoint`, `respec`, `whyNot` (the reason a node cannot be learned: not enough points, the other of the pair, an
earlier row) and `canLearn` are pure and tested.

## How a node reaches the fight

`heroStats(meta, kind)` (replacing `equipStats` at the two places `main.ts` places a hero) puts the worn equipment and the
talents together as one `EquipStats`, capped as the equipment is (`capStats`). So the talents ride the equipment's path into
`Boost.equip` and `Unit.eq`, and a hero with no talents and no equipment has no `eq`: **every old fight plays out exactly
as before** (`npm run balance` before and after is identical, line for line).

- Stat nodes are stats (hp, atk, def, crit, dodge, atkSpeed, moveSpeed, charge, regen).
- A skill or passive change is a number under a key of `EquipStats.tal` (`TAL_KEYS` in `talents.ts` lists them), read in
  `abilities.ts` through `tal(unit, key)`:
  - `pow`: the skill's attack is lifted while it casts (`powered`), so its blows, volleys, meteors, healing and what it calls up
    (the treant) all grow; `ultPow` the same for the ultimate only.
  - `dur`: a share longer for what a skill lasts (`durOf`: taunts, guards, stuns, charms, songs, banners, curses, burning ground,
    traps, decoys). `reach`: tiles more reach or radius (`reachOf`). `extra`: one more of what it makes (a strike, a jump, a
    trap, a treant, a second smaller volley or meteor).
  - `castHeal`, `castShield`, `castHaste`, `refund` (charge back): given when the skill goes off (`began`).
  - `skillSlow`, `skillStun`: what a skill hits is slowed or held (`onStrike`).
  - `ultRate`: a Mythic's ultimate charges faster (`gain`).
  - `block`, `thorns`, `leech`, `huddle`, `rage`, `frenzyMax`: more of the kit's own passive.
- A capstone may also switch on **abilities** (`TALENT_ABILITIES`, ids `tl_<kind>_<name>`): the equipment's trigger-and-kind
  engine (`equipFx.ts`: hit, nth blow, crit, kill, struck, start, tick, low, death; revive, rally, healAlly, stealth, charge,
  bleed, chain, ...) looks them up beside the equipment's own. `Ability.show` gives a tick ability a pop-up with its name.
  They use the skill stream for chances, so fights stay deterministic.

No randomness of its own: nothing new draws from the fight's main stream.

## Meta

`Meta.talents?: Record<kind, { picks: string[]; bought: number }>`: optional, so old saves load with none. `readTalents`
(called in `loadMeta` after levels and shards are read) drops unknown kinds and ids, repeats, both of a pair, a tier before its
turn, and anything past the points allowed, by replaying the picks through `learn`.

## UI

On the hero sheet, **Talents** shows the points, the learned tiles and an Open button. The tree is icon tiles (the equipment
set's 16px icons, drawn at 3x) joined by lines: the first row of four over the two pairs. A frame shows the state: dim and
greyed (locked), gold and blinking (available), gold filled with a green cost (learned), dashed with a red slash (ruled out).
A tap shows the node's name, tier, cost and words and a **Learn** button (or the reason it cannot be); below are the shard
exchange (3 shards for a point), **Respec (N crowns)** and Back. Screenshots: `docs/samples/talents-{empty,part,full}.png` and
`-360x780`, `-412x915` (`node tools/audit/talents.mjs` after `npm run web`).

## Tests (`test/talents.test.ts`)

The trees' shape and icons, point income (level and shards), costs and the order the tiers open, exclusive pairs, respec and its
refund, old saves and a damaged one, each modifier key taking effect in a small fight (and `ultPow`, `ultRate`, `extra`,
`dur`, `reach`, the cast riders and the passives one by one), every capstone ability firing, determinism (a fight with a full
tree plays out the same twice; a hero without talents has no `eq`), `heroStats` with equipment, and a ceiling on a full tree's
stat nodes.

## Balance (`npm run talent-balance`; `-- --games 300` is quicker)

`tools/talent-balance.ts` plays random five-hero teams at stage 13 and hero level 3 (17.7% won with no talents), paired by seed.
Table 1 is the effective strength of everyone's talents (the plain hp and attack bonus that wins as often), a random choice of
each pair; table 2 each hero's own tree as the win-rate lift on the teams that hold it. For scale an evolution grade is +60%
(`GRADE_MULT`) and the Mythic equipment kit is about +30%.

| Every hero has | Effective strength | Won |
| --- | --- | --- |
| nothing | 0 | 17.7% |
| the first row (4 points) | +6% | 35.0% |
| the first two rows (6 points) | +10% | 47.5% |
| the whole tree (9 points) | +17% | 65.8% |

A first pass of the capstones was stronger (+18% and one-hero lifts of 30 to 34 points, from the revives and the Cleric's heal),
so they were pulled back: the revives rise at 30% (the Werewolf's 25%), Healing Hands heals 15% every 7s, the Paladin's shield is
15%, Blood Pact 10% leech, Fox Charm's lengthening and the Nine-Tailed Dream's rate smaller. Table 2 now has most single trees at
+3 to +20 points, the highest (Yamabushi) +26 and the first row alone +0 to +11 (the Yamabushi and Warlock, whose first rows
are strong already). `npm run balance` (no talents in it) is identical before and after this branch.

## Also on the hero sheet: Equip best, and no blinking

- **Equip best / Equip all heroes** (`equipment.ts`: `itemScore`, `bestFor`, `equipBest`, `equipAll`, `strongestFirst`; buttons in `equipView.ts`). An item scores by its main stats (calling bonus, rarity and item level through `itemStats`) weighted for the hero (shooters value reach and crits, casters charge, sturdy heroes hp and defence) plus its ability (`ABILITY_WORTH` x its strength). By default only the bag is used; the toggle "Taking from other heroes" lets a stronger fit move a piece off another hero. Equip all serves the strongest heroes first and an earlier hero keeps what it was given. No item is ever on two heroes. Tests: `test/equip-best.test.ts`; screenshots `docs/samples/gear-best-{before,after}*.png` (`tools/audit/equip-best.mjs`). "Equip all heroes" sits in the same panel (reachable from the tavern's hero sheet), not on the tavern canvas.
- The slot picker flow is unchanged (the owner dropped the fewer-taps rework).
- The talent tree no longer blinks: an available node has a steady highlight; learning a node plays a short one-shot pop.
