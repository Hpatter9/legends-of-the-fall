# STATS batch 2: power and growth

The second batch of the owner-approved D&D stats design ([rpg-stats-design.md](rpg-stats-design.md), section 14, batch 2; the owner's
answers of 31 October 2026 at its end). Batch 1 ([stats-1.md](stats-1.md)) made the six scores data; this batch makes them move a fight.
Nothing is shown to the player yet (the page is batch 3), and the armies, the daily and the Calamity are not retuned (that is the joint
rebalance, the skills overhaul's batch 8 with the stats' batch 7).

## What moved

- **Health grows with CON, blows with the blow ability, and each skill with its own ability** (`src/sim/statPower.ts`). Each point of
  modifier is +5% (`PER_POINT.POWER`), counted from the hero's level-1 scores, so a hero at level 1, rank 0 or 1, grade 1, with nothing
  extra, fights exactly as before (a test). `addUnit` puts the health share into `maxHp` and the blow share into `power`, and keeps the
  shares on the fighter (`Unit.stats`); `fire` and the ultimate in `heroKits.ts` lift a skill by its ability's share over the blow share
  (`skillShare`), through `powered`'s new `stat`: it lifts the attack the skill carries (its damage, the heals and shields worked from
  attack, and what it calls up) but not `castPower()`, so no score stretches what a skill lasts. (The heals and shields worked from
  `castPower()` alone, such as Healing Word's share of health, do not take the score yet.)
- **Which ability a skill takes** (`skillStatOf`, the design's section 7): the body skills (Dragon Breath, Scale Ward, Inferno Breath, the
  Shambler's Contagion, Devour, Bile Spit and Plague Tide) take CON; a listed weapon skill (`WEAPON_SKILLS`: the Ninja Monk's strikes, the
  Yamabushi's staff, the Satyr's horns, the Gorgon's bite, Command Strike, Divine Smite, Barbed Arrow, Reap, Grapeshot, Dragon Dive,
  Scourge, Hellblade Sweep, Blood Price) and every skill of a hero who strikes and casts with the same STR or DEX take the blow ability;
  every other skill (spells, heals, summons, songs, ultimates) the casting ability. A skill learnt from a book keeps the rule of its home
  kit, worked out with the caster's own scores (a wizard swings a Kesa Cut with its DEX).
- **The improvements and epic boons are live**: the levels' scores (`scoresAtLevel`, batch 1) are read at the level the hero fights at (a
  kind's lasting level, or a run's own level in the spire and the Calamity).
- **The level curve gives back what the scores add on average.** Every share is divided by the roster's mean share at the same level
  (`trimOf`), so the mean hero's health and attack at every level are the curve's alone; what moves is how the 45 heroes differ. The curve's
  constants (`LEVEL_HP`, `LEVEL_ATK`, the late shares, the milestones) are untouched, which keeps the page's level-up numbers and Duchess's
  level-100 body as they were; the trim is worked out from the profiles, so it stays exact when a profile or a share is tuned.
- **Ranks, grades and awakening give score steps** (batch 1's `stepBonus`: +1 to the two best scores a rank above 1 and a grade above 1,
  +2 to the primary an awakened step). `gradeBoost` now carries the rank (`Boost.rank`), so every path that builds a hero's boost from it
  (a run's heroes, guests, the Last Stand, the sweeps) has them. The spire's own heroes have no rank, as before.
- **The talents' stat nodes**: a tier-1 node that gave health now gives **CON +2**, one that gave attack the hero's **blow ability +2**
  ("Tempered Steel: CON +2"; ids and names kept, so saves keep their picks). The crit, dodge and charge nodes keep their shares for now:
  DEX's crit and Armour Class come in batch 4 and INT's cooldowns in batch 6, and turning them into scores before then would leave a
  STR hero's crit node doing nothing. The auto-picker and the node glyphs read the scores as the health or attack they replaced.
- **Gear's scores**: each of the 60 bases gives an ability by what it is (`BASE_SCORE` in `equipBases.ts`: blades, axes and maces STR;
  katanas, daggers, bows, guns and leathers DEX; mail and plate CON; staves, tomes and robes INT; vestments, a gi, relics and idols WIS;
  wands, silk, charms, lyres and circlets CHA), **+1 at Rare and Epic, +2 at Legendary and Mythic** (`RARITY_SCORE`). It is fixed by the
  base, so every piece already owned has it; a broken piece gives nothing, as before. `EquipStats.scores` carries the points of the worn
  pieces and the talents together.
- **`powerOf`** reads the health and blow shares, so the hero sheet's power follows the fight.

Not in this batch: the d20, AC, initiative, DEX's blow speed and crits (batch 4); saves (batch 5); pools, INT's cooldowns, CHA's ultimate
fill, the summons' own stat blocks (batch 6). A summon called up by a skill copies its caller's attack while the skill is cast, as it always
did, so a wolf or a treant already carries the summoning skill's ability share.

## The numbers

The mean hero's power by level (`node tools/stats/budget.mjs`: `powerOf` at grade 1, nothing worn), on main before this batch and after:

| Level | Main, rank 0 | Now, rank 0 | Move | Main, rank 4 | Now, rank 4 | Move |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 790.8 | 790.8 | +0.00% | 1076.0 | 1140.5 | +6.0% |
| 4 | 1264.5 | 1264.5 | +0.00% | 1720.3 | 1821.3 | +5.9% |
| 8 | 1894.8 | 1894.9 | +0.01% | 2577.9 | 2651.2 | +2.8% |
| 10 | 2209.8 | 2210.0 | +0.01% | 3006.5 | 3091.9 | +2.8% |
| 12 | 2524.8 | 2524.9 | +0.00% | 3434.9 | 3531.0 | +2.8% |
| 16 | 2682.2 | 2683.2 | +0.04% | 3649.1 | 3752.2 | +2.8% |
| 20 | 2839.7 | 2841.2 | +0.05% | 3863.4 | 3972.8 | +2.8% |
| 25 | 3182.0 | 3183.7 | +0.05% | 4329.0 | 4451.7 | +2.8% |
| 30 | 3595.0 | 3597.0 | +0.06% | 4891.1 | 5104.8 | +4.4% |
| 40 | 3839.1 | 3841.1 | +0.05% | 5223.0 | 5367.9 | +2.8% |
| 50 | 4099.0 | 4101.0 | +0.05% | 5576.6 | 5814.2 | +4.3% |
| 60 | 4378.5 | 4379.5 | +0.02% | 5956.8 | 6117.4 | +2.7% |
| 80 | 5000.1 | 5002.4 | +0.05% | 6802.6 | 6984.7 | +2.7% |
| 100 | 5751.0 | 5754.6 | +0.06% | 7824.2 | 8034.3 | +2.7% |

So the mean by level is within 0.1% of main (the design asks 1%). A rank 4 hero is 3 to 6% stronger than on main: the ranks keep their
x1.08 step and the score steps come on top (see the question below). A grade's steps add up to 8% more on top of `GRADE_BOOST` (grade 4 at
level 1: health +4%, attack +8% on the mean hero; nothing at some levels, where a step only lifts an odd score to an even one).

**Parity.** By the scores alone, no hero rises more than 3% over the mean at any level (a test); the most is +2.7% (the heroes whose
primary is their blow ability or CON). The furthest below are the Beastmaster's blows (−12% at level 100: he strikes with a STR of 10,
and his power is his wolves, whose CHA keeps level) and the Kraken's and the Dread Pirate's skills (−8%: they cast with their third
score). In fights at level 30 (`test/hero-balance-ultimates.test.ts`'s table, 12,000 fights at stage 78) the average team still wins 61.3%;
the heroes' lifts ran from −4.7 to +3.7 points on main and from −5.2 to +4.5 now (the band is ±6), and no hero moved more than 2.7
points (the Reaper −2.7, the Ninja Monk −1.5; the Samurai Commander +1.2, the Wizard, the Tyrant and the Gorgon +1.1).

## The identity fixtures

Re-recorded by the tests' own hashes (the headers say so): in `test/spells-identity.test.ts` field30, bosses, armyFoes, spells, lands,
army, daily, tower, stand, heroes1, heroes10, heroes30 and the four moving `...Others` (heroes1 places grades 1 to 3, daily and tower
merge); in `test/ailments-identical.test.ts` field30, bosses, armyFoes, spells, lands, army, daily, tower and stand. field1, field1Others and
calamity (heroes at level 1, grade 1) kept their hashes in both.

Older tests brought to the owner's new rules: a grade's, a rank's and a level's health and attack now carry their score shares
(`grade-stats`, `run`, `shards`, `levels`), a Legendary sword is STR +2 as well as its attack (`equipment`), and the Knight's first two
nodes are CON +2 and STR +2 (`talents`).

Four tests whose one seeded fight turned the other way (each checked against main's code before the batch, in a scratch copy):

- `eidolon-trial`: Nivra's breath was held to one row, but its rage version is a row deeper (`sigTiles`), and this seed's fight now lasts
  long enough to reach it. The check now takes the rage row; the corrected test passes on main's code too.
- `more-heroes`: Demon Form "wears off" passed on main only because the Demon Swordsman fell at 12.8 s (a fall ends the form); his form
  lasts about 25 s since SUMMON-TIMERS. With CON's 4 more health he stood, still in form. The test now keeps him standing until the form
  has run out (and passes on main's code too).
- `eidolon-chain-4`: seed 2003's close fight is now lost before Voltara takes her second form. She takes it in 9 of the 10 seeds 2003 to
  2012 both on main and now (main missed 2004, now 2003), so the test uses 2004. **But her trial's win rate for that level-40 party
  (Knight, Peasant, Samurai, Archer, Wizard) fell from 6 of those 10 seeds to 2**: no one hero's change does it (each tried alone), it is
  the five together in a close fight (the frail Wizard −7% health, the two CON tanks' blows −2%). For the joint rebalance.
- `hero-kits-all`: "most heroes cast both skills" counted one season of nine fights; its first fight turned from a win to a loss and the
  count from 38 to 32. Over six seasons of seeds the count is 35.5 on main and 35.2 now, with the same heroes missing, so the bar (35)
  stays and the test now averages the six.

## Tests

`test/stats-power.test.ts`: a level-8 Barbarian's STR is 20 and its blows carry +10% of its body attack more than at level 1, and its fight
attack is the curve's times its share over the roster's mean; a rank 4 Knight has CON and STR +3 (rank 0 and 1 none; two awakened steps
+4 CON; grade 3 +2 each); every hero at level 1, rank 0 or 1 fights exactly as before; the mean power at fourteen levels is within 1% of
main's (recorded above), and the trim keeps the mean shares at 1 at every level; parity (no hero more than 3% over the mean, none far
under); the skills' abilities (the Cleric's Guiding Bolt WIS, Divine Smite STR, Dragon Breath CON, Cannonade DEX and Grapeshot STR for the
Dread Pirate, a book's Kesa Cut DEX) and a level-20 Cleric's shares; the talents' nodes and the gear's scores, and that a fight reads them.

New tool: `node tools/stats/budget.mjs [--levels 1,20,100] [--heroes]` (read-only).

## Questions for the owner

1. **Ranks and grades: the multipliers kept.** The design's table had a rank's hp and attack step fall from x1.08 to x1.05 "to keep the
   total", but your answer 4 says the score steps come "on top of the bigger hp and attack step", so this batch keeps x1.08 (and
   `GRADE_BOOST` and `AWAKEN_MULT`) as they are. A rank 4 hero is 3 to 6% stronger than on main; at x1.05 it would be 5 to 8% weaker. Say
   if you meant the trim; it is one number (`RANK_MULT`), and the joint rebalance can take either.
2. **The crit, dodge and charge nodes** stay shares until DEX and INT do something of their own (batches 4 and 6), as above.
3. **Voltara's trial** at level 40 is harder for the test's party (6 of 10 seeds won on main, 2 now), as above: for the joint rebalance,
   unless you want it held now.

## Checks

`npm run typecheck` clean; the full `npm test` 2158 pass, 0 fail; `npm run web` built. Measured: `tools/stats/budget.mjs` on main and after
(the table above) and the level-30 hero sweep (12,000 fights) on both. No page changed (the only words the player sees move are the four
health and attack nodes' lines on the talent tree, "CON +2" in place of "+5% hp"), so no browser check; the Stats panel is batch 3.
