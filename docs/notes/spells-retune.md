# The game retuned for a player who casts (SPELLS-RETUNE)

Release 0.291.0 made the fight's Auto switch cast the king's spells as well as the ultimates (`auto-cast.md`). Every balance table had been
measured by a greedy bot that never cast a spell, so the fights became much easier than the tables said (Orcs Normal at level 1 went from
13% to 73% cleared in one try, a fresh save's daily from 77% to every date). The owner's decision: **keep Auto as smart as it is, and retune the
armies (and the daily, the Last Stand and the Calamity where they move) so the difficulty targets hold for a player who casts.**

## 1. The balance tools cast by default

- `tools/autoplay.ts`: `botSpells.on` is now **on by default**, so every greedy player (`playArmy`, `playDaily`, `playFinal`, the climbs of
  `playTower` and `playCalamity`) sets `autoSpells` on each fight, as the page's Auto does, and casts through the same chooser (`autoCast.ts`).
  `BOT_SPELLS=0` in the environment turns it off (the bot every table before 0.292 was measured with); `BOT_LOADOUT=heal,meteor,haste` fixes
  the loadout.
- The bots that play their own fights cast too: `tools/army-pace/pace.ts`, `tools/merge-two/pace.ts`, the whole-run table of `tools/balance.ts`,
  the Last Stand (`tools/stand-balance.ts`) and the ULT-CHARGE probe (`tools/ult-charge/probe.ts`: the levelled daily and the Last Stand).
- **The loadout** (`botLoadout`): a fresh save owns only the starting three, **Heal, Meteor, Haste** (8 of the 9 power), and the bot keeps them
  at every stage. At the top of the game (Mage Tower 4: 11 power, Rally taught, Resurrect and Meteor Shower earned by the Undead and Infernal
  clears) I measured the alternatives a player could then afford, on the Golem Forge's Mythic at level 100 and the Yokai's Normal at 65
  with hearts (6 saves, mean tries): Heal/Meteor/Haste 1.5 and 1.3, Heal/Meteor/Resurrect 1.7 and 1.2, Heal/Meteor/Rally 1.8 and 1.5,
  Heal/Meteor/Meteor Shower 2.2 and 1.7; no spells 2.5 and 3.3. No later set was stronger, so a player who keeps the starting three is the measure.
- The identity proofs (`tools/status-fx/logs.ts`, `tools/spells/identity.ts`) turn the bot's spells off while they hash: their fixtures were
  recorded by a bot that never cast, and they prove the fights, not the bot.
- `tools/spells-retune/` (new): one tool for every army cell the earlier notes measured with three different players, on the same seeds as
  `tools/army-pace` (`node tools/spells-retune/run.mjs cell <army:level:tier:flags>...`, and `tune` to bisect a `start` or a tier lift). Flags:
  `t` every talent row the level opens, `h` hearts, castle `c` (the curve's, `tools/curve`), `p` (the army pace's), `m` (maxed).

## 2. The yardstick

For each cell the target is what the spell-less bot measured on main 0.291.0, on the same seeds: the difficulty the tables and the owner's
calls were set to. Where that value sat outside an army's documented band of 2 to 3.5 tries at its recommended level (`army-curve.md`), the band
wins. The cells are the earlier notes' own:

- the first four armies at their recommended level, the curve's player (no talents, no castle, gear, XP carried; 24 saves);
- the Labyrinth and the Ogres at theirs, the army pace's player (every talent row, the climb's castle; 12 saves);
- the Infernal Host at 55, the Yokai and the Golem Forge at 65, **with hearts** (LATE-RETUNE's yardstick, the owner's call; 12 to 24 saves);
- the harder tiers on the last three armies with every talent and a maxed castle (`--deep`; 8 saves), and the first army's Mythic at 55 and
  60 with the army pace's player (the first army's 11th star).

## 3. The knobs

| Knob | Before | After | Why |
| --- | --- | --- | --- |
| Orc Warband `start` | 0.39 | **0.58** | the first army stays hard for a new save |
| Undead Legion `start` | 1.48 | **1.7** | at its own level it was in band with spells (2.5 tries), but a level-1 party that casts ground through it in 25 tries (the owner's rule, `test/armies.test.ts`); 1.65 still did |
| Beast Packs `start` | 1.66 | **2.17** | |
| The Wildwood `start` | 2.01 | **2.52** | |
| The Labyrinth `start` | 4.85 | **7** | its Hard lift 1.6 to **1.86**, so Hard stays over the tougher Normal |
| Ogre Clans `start` | 9.3 | **12.2** | |
| Infernal Host `start` | 12.5 | **14.9** | |
| Yokai Night Parade `start` | 14.2 | **15** | |
| Golem Forge `start` | 14.6 | **16.8** | its bosses' fixed strength makes it move less with `start` (16 still read 1.7 tries), and it must stay over the Yokai |
| `xpStart` of every army | | raised with `start` (first four: the old `start`) | a run pays the XP it did, so the level pace is as it was (`armyXpShare`) |
| A tier's `answer` (Hard, Elite, Legendary, Mythic) | none, none, 2.8, 2.76 | **1.18, 1.18, 3.3, 3.26** | one x1.18 on every tier above Normal; XP is taken back out as before. Elite at x1.12 put its attack under Hard's on the last three armies, so one factor for all four keeps their order as it was |
| `DAILY_START` | 0.565 | **0.76** | the daily's foes, the bosses with them |
| Last Stand `HALL_EASE` | 0.88 | **1.2** | every wave's strength |
| Calamity `CAL_SCALE.start` | 0.435 | **0.6** | |

The Normal values were bisected with `node tools/spells-retune/run.mjs tune` (5 steps), the tier factor from x1.15 and x1.3 trials, the daily,
the Last Stand and the Calamity from two or three trials each. Each tier still stands over the one below in hp and attack on every army (the
smallest margin is 2.2%, the Infernal Host's Hard attack).

## 4. Before and after

Mean tries to clear (a save that never clears in 25 counts 26; the share that cleared in brackets when under 100%). "Never" is the spell-less bot
on main's numbers, "Spells" the casting bot on main's numbers, "Retuned" the casting bot on this branch. The same seeds in every column.

**Normal**

| Cell | Never (target) | Spells | Retuned |
| --- | --- | --- | --- |
| Orc Warband, level 1 (curve) | 2.2 | 1.2 | 2.3 |
| Undead Legion, level 8 (curve) | 9.6 (band 2 to 3.5) | 2.5 | 4.1 |
| Beast Packs, level 15 (curve) | 2.8 | 1.1 | 3.2 |
| The Wildwood, level 22 (curve) | 3.7 | 1.0 | 3.2 |
| The Labyrinth, level 35 (pace) | 2.8 | 1.0 | 2.3 |
| Ogre Clans, level 45 (pace) | 1.7 (band 2 to 3.5) | 1.3 | 2.3 |
| Infernal Host, level 55, hearts | 3.8 | 1.2 | 4.4 |
| Infernal Host, level 58 (pace) | 9.7 | 2.4 | 8.3 |
| Yokai Night Parade, level 65, hearts | 3.6 | 1.8 | 3.1 |
| Golem Forge, level 65, hearts (24 saves) | 2.3 | 1.7 | 2.0 |
| Golem Forge, level 74 (pace, 24 saves) | 2.5 | 1.4 (12 saves) | 2.8 |

**The harder tiers** (every talent, a maxed castle, 8 saves)

| Cell | Never (target) | Spells | Retuned |
| --- | --- | --- | --- |
| Infernal Host, Hard, level 35 | 13.6 (88%) | 2.5 | 12.5 (75%) |
| Infernal Host, Hard, level 45 | 3.6 | 1.5 | 2.4 |
| Yokai, Hard, level 45 | 24.5 (13%) | 15.5 (75%) | 26 (0%) |
| Golem Forge, Hard, level 45 | 14.3 (88%) | 5.5 | 23.4 (38%) |
| Infernal Host, Elite, level 45 | 9.6 (75%) | 2.3 | 10.3 (88%) |
| Yokai, Elite, level 45 | 26 (0%) | 20.3 (38%) | 26 (0%) |
| Golem Forge, Elite, level 45 | 20.5 (38%) | 8.4 | 21.5 (25%) |
| Infernal Host, Legendary, level 65 | 2.3 | 1.3 | 2.5 |
| Yokai, Legendary, level 65 | 24.0 (13%) | 13.3 (88%) | 24.4 (13%) |
| Golem Forge, Legendary, level 65 | 10.1 (88%) | 3.6 | 11.8 (88%) |
| Infernal Host, Mythic, level 100 | 4.8 | 3.1 | 3.0 |
| Yokai, Mythic, level 100 | 4.9 | 2.3 | 5.9 |
| Golem Forge, Mythic, level 100 | 3.0 | 1.4 | 2.1 |
| Orc Warband, Mythic, level 55 (pace, 16 saves) | 4.3 | 2.0 (8 saves) | 4.2 |
| Orc Warband, Mythic, level 60 (pace, 16 saves) | 2.3 | 1.1 (8 saves) | 1.6 |

(Hard at level 25, the band's entry, is a wall on the last three armies in every column: 26, 0% cleared.)

**The other modes**

| Measure | Never | Spells | Retuned |
| --- | --- | --- | --- |
| Daily, fresh save, with hearts / without (`npm run daily-rate -- --days 112`) | 71% / 50% | 100% / 98% | 72% / 52% |
| Daily, levelled save at 30 / 50 (`node tools/ult-charge/run.mjs 40 --only daily`, 80 dates; main vs this branch) | 69% / 66% | - | 58% / 59% |
| Last Stand medians at levels 1 / 10 / 20 / 40 / 60 / 80 (`npm run stand-balance`, 30 runs; retuned 20) | 4 / 9 / 10 / 15 / 19 / 20 | 5 / 11 / 13 / 23 / 26 / 30 | 4 / 9 / 10 / 15 / 19 / 20 |
| Calamity, no castle: mean maps, map 2 reached, full clears (30 runs) | 1.53, 53%, 3% | 2.10, 93%, 17% | 1.53, 53%, 0% |
| Calamity, maxed castle | 1.50, 50%, 0% | 2.07, 97%, 10% | 1.43, 47%, 0% |

The spire is the Last Stand now (`--tower` is its old name), so it is the row above.

## 5. Tests (an owner-approved change of requirement)

The difficulty tests now measure with the casting bot (their headers say so); none of their bars moved, and all pass on the retuned numbers.
Changed because the rule did:

- `test/army-pace.test.ts`: the first four armies' Normal strength is SPELLS-RETUNE's (0.58, 1.7, 2.17, 2.52) with their old `start` as
  `xpStart`, and every army, the first four included, pays its old XP.
- `test/stand-retreat.test.ts`: the strong party that walks the rooms casts the starting three on its own, as Auto does (the waves are tuned
  for that player; without them it no longer reaches the fourth room).
- `test/calamity.test.ts` ("a full Calamity clear leaves the starting hero well past level 20"): a full clear is as rare as it was (one run in
  30 to 100), and none of the first 40 seeds clears now, so seed 116, which does, is tried first. The bar (past level 20) is as it was.
- **Identity fixtures re-recorded: `daily` and `stand`**, in `test/fixtures/ailment-logs.json` and `test/fixtures/spells-identity.json`, for
  `DAILY_START` and `HALL_EASE`, which are constants. Every other scenario keeps its hash: the proofs put the raised army strengths and
  `CAL_SCALE.start` back by value, as they already did for LATE-RETUNE, and their bots cast nothing.

## For the owner

1. **The Undead Legion** is a little over its band at its own level (4.1 tries at level 8, where the band is 2 to 3.5), because your rule that a
   level-1 party cannot grind through any army but the first needs `start` 1.7 once Auto casts (1.65 is ground through on one save). It is still
   far easier than the spell-less bot found it on main (9.6). Keep the rule as it is, or let the Undead fall to a level-1 grind so it can sit at 2.8?
2. **The levelled daily** is about ten points harder than on main (58% to 59% at levels 30 and 50, from 66% to 69%), because `DAILY_START` lifts
   every daily and the share of the squad's power the daily answers (`DAILY_ANSWER`) was left alone. That keeps the daily's top hard, as you
   asked; `DAILY_ANSWER.share` 0.75 a little lower would bring it back to main's if you would rather.
3. **The targets are main's spell-less measures**, not the older notes' figures. LATE-RETUNE's cells (the Infernal Host 5 tries at 55, the Yokai
   about 10 at 65, the Golem Forge about 8 at 65, all with hearts) had already drifted easier on main before Auto cast (3.8, 3.6 and 2.3), and I
   matched main. Say if you want the late three back to LATE-RETUNE's harder figures.
4. The full tables in `difficulty-tables.md` were measured spell-less and not re-run cell by cell (nine armies, seven levels, five tiers, with and
   without talents is days of the bot); the sampled cells above are back on them, and the tables stand as the target.

## Checks run

`npm install`, `npm run typecheck`, the full `npm test`, `npm run web`. The measurements above. No page or renderer changed.
