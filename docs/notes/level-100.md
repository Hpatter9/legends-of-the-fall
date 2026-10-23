# Level 100

The lasting hero level (a hero kind's level, from the XP it earns in the armies, the daily and the like) now goes on to **100**
(it stopped at 30). The spire and the Calamity keep their own in-run levels, which still stop at 30 (`RUN_MAX_LEVEL`); nothing
in `calamity*.ts`, `calLand.ts`, `tower.ts` or the Calamity's XP constant was touched.

## What changed

- **The curve** (`src/sim/levels.ts`). Levels 1 to 30 are exactly as they were: the same XP totals (`xpFor(30)` is 70,200), so
  no save gains or loses a level there. Past 30 each level costs `deepStep(n)`: `DEEP_BASE` (125,000) at level 31 plus
  `DEEP_GROWTH` (4,700) for each level after it, with the first `DEEP_RAMP` (6) levels eased in so level 31 is not a wall. The three
  numbers were fitted with `npm run level-pace` (below). `MAX_LEVEL` is 100, `OLD_MAX_LEVEL` 30, `RUN_MAX_LEVEL` 30. `progressOf` and the
  XP bars read the new curve; at the top they say "max level".
- **Power.** Each lasting level past 30 adds `DEEP_SHARE` (a tenth) of a full step, and there is a lump of hp and attack at 40, 50, 60,
  70, 80, 90 and 100 (`MILESTONES`, bigger each time), and one more **talent point** at each of them (`levelPoints` is now
  `floor(level / 3)` plus the deep milestones reached: 40 points at level 100). Level 100 is **+61% hp and +59% attack over level 30**
  (table below); `power.ts` reads the same boost, so a level-100 hero's Power is +60% too.
- **Looks.** Each deep milestone gives a badge frame and a steady aura (`badgeOf(level)`, 1 to 7; names in `BADGE_NAMES`): Iron (40),
  Steel (50), Bronze (60), Silver (70), Gold (80), Ember (90), Arcane (100). The badge (`src/levelBadge.ts`, `src/levels.css`; Stone and
  Iron tokens, 12px, no bold) is on the bench and squad cards, the party picker, the roster, the hero sheet and the post-fight XP rows.
  The aura (`src/render/levelLook.ts`, drawn in `unitView.ts`) is one to three rings on the ground in the badge's colour, and from
  Gold a faint halo behind the body: drawn once, never pulsing. Heroes of the spire and Calamity never show one (their levels stop at 30).
- **Talents.** Every hero's tree gets four deep rows (tiers 4 to 7), each a choice of one from a pair, opened at lasting level **40, 60,
  80 and 100** and costing **5, 7, 8 and 9** points (29 more than the old tree's 9; with the 40 points of level 100 a hero can take all
  of it). A row opens once a node of the row before it is taken. Respec and shard points work as before (shards still add up to three
  points; a respec costs the same per point). The rows are in `src/sim/talentsDeep.ts`, written once for seven callings (Bulwark,
  Duelist, Berserker, Marksman, Archmage, Healer, Support) and fitted to each hero: the first row deepens the hero's own skill (the same
  effect its second row changed) or its ultimate, by name; the rest are the calling's signature, made only of the effects the tree
  already uses (stats, `TAL_KEYS`, and the abilities of `equipFx.ts`), so the fight needed nothing new. A test checks each hero's
  skill and ultimate names against its kit. The talent view (`talentView.ts`) draws seven rows, the deep ones labelled with their level,
  and scrolls inside the sheet; it fits at 393, 360 and 412 with no sideways scroll.
- **Achievements.** "Hardened Champion" (a hero at level 30, 30 crowns), "Legend in the Making" (level 50, 60 crowns) and "Centurion"
  (level 100, 200 crowns), each with a meter of the best hero's level, using the usual claim flow.
- **Tools.** `npm run level-pace` (`tools/levelPace.ts`): the pace model. `npm run balance -- --no-tables --deep --levels 30,40,60,100
  [--talents]`: the deep-level army table (5f). `--hero-level N --hero-stage S` on the hero table. `--tier 3:hp=6,atk=4` tries a harder tier.
  `tools/ui/level100-shots.mjs` makes the screenshots.

## Pace (`npm run level-pace`)

The player is the one of `unlock-pace`: 13 army runs a day (ten auto-replays, three by hand) on the best army and tier cleared (the
same clear schedule, no Legendary clears in the first year), the castle's Library rising to 5 (+30% XP), and a favourite hero in 90% of the
runs who earns 1.3 times the party's mean. What a run pays is **measured**: the tool plays real runs of every army on every tier and keeps the XP.

| level | XP needed | day reached |
|---|---|---|
| 10 | 2,700 | 1 |
| 20 | 11,400 | 1 |
| 30 | 70,200 | 4 |
| 40 | 1,203,400 | 28 |
| 50 | 3,134,900 | 58 |
| 60 | 5,536,400 | 87 |
| 70 | 8,407,900 | 112 |
| 80 | 11,749,400 | 133 |
| 90 | 15,560,900 | 159 |
| 100 | 19,842,400 | 181 |

Sensitivity of level 100 to the player's assumptions: favourite earns 1.0x the party mean, day 203; 1.6x, day 162; 8 runs a day, day 223;
20 runs a day, day 143.

**Level 30 comes in days, not weeks.** The model's favourite reaches 30 on day 4 (70,200 XP is only a few army runs' worth by then),
and the old curve to 30 was to stay as it was. So the curve past 30 starts well above it: the first deep level costs about 21,000 XP and
level 35 is 413,000 XP in all. If level 30 should take weeks, the old curve (or the XP the armies pay) is what would have to change, which is a
bigger call than this branch makes. Heroes already past 70,200 XP (a level-30 hero kept earning XP at the old cap) simply read a higher
level on the new curve.

## Power

| level | XP to reach | hp x | atk x | hp vs 30 | atk vs 30 | talent points | knight power | vs 30 |
|---|---|---|---|---|---|---|---|---|
| 20 | 11,400 | 3.86 | 3.34 | -22% | -20% | 6 | 2,409 | -21% |
| 30 | 70,200 | 4.92 | 4.20 | 0% | 0% | 10 | 3,049 | 0% |
| 40 | 1,203,400 | 5.26 | 4.48 | 7% | 7% | 14 | 3,256 | 7% |
| 50 | 3,134,900 | 5.62 | 4.78 | 14% | 14% | 18 | 3,477 | 14% |
| 60 | 5,536,400 | 6.01 | 5.10 | 22% | 21% | 23 | 3,714 | 22% |
| 70 | 8,407,900 | 6.43 | 5.44 | 31% | 30% | 27 | 3,967 | 30% |
| 80 | 11,749,400 | 6.88 | 5.81 | 40% | 38% | 31 | 4,241 | 39% |
| 90 | 15,560,900 | 7.37 | 6.21 | 50% | 48% | 36 | 4,538 | 49% |
| 100 | 19,842,400 | 7.94 | 6.66 | 61% | 59% | 40 | 4,878 | 60% |

(The multipliers are of the hero's base stats; Power is the knight's, a Samurai's goes 4,025 to 6,439: also +60%. The talent points are
what the levels give, not counting up to three from shards.)

## Balance

### Hero parity (`npm run balance -- --heroes-only --hero-level L --hero-stage S --games 6000`)

Every hero at one level, in random five-hero teams, at the stage where the average team wins about half (stage 5 at level 1, 37 at level
30, 46 at level 60, 62 at level 100). Lift over the roster average, in points; best / worst:

| level | best / worst |
|---|---|
| 1 | +2.2 / -3.4 |
| 30 | +4.7 / -5.5 |
| 60 | +5.2 / -5.7 |
| 100 | +6.4 / -5.6 |

| hero | L1 | L30 | L60 | L100 |
|---|---|---|---|---|
| Kunoichi | +1.2 | +4.7 | +5.2 | +6.4 |
| Rifle Bot | +0.9 | +2.9 | +4.1 | +4.6 |
| Barbarian | +1.4 | +4.2 | +4.2 | +4.5 |
| Reaper | -3.1 | +3.0 | +3.4 | +4.5 |
| Time Witch | +1.7 | +4.1 | +4.0 | +4.2 |
| Karasu Tengu | +0.6 | +1.7 | +2.1 | +3.3 |
| High Priestess | +0.3 | +3.5 | +2.5 | +3.2 |
| Warlock | +0.1 | +2.9 | +3.0 | +3.1 |
| Gorgon | +1.6 | +1.9 | +2.6 | +3.0 |
| Werewolf | +1.0 | +3.0 | +2.6 | +2.5 |
| Ranger | +1.6 | +2.3 | +2.8 | +2.3 |
| Lancer | -0.6 | +1.3 | +3.2 | +2.1 |
| Lightning Mage | +0.1 | +2.4 | +2.1 | +1.7 |
| Peasant | -0.7 | +2.5 | +2.5 | +1.5 |
| Kraken Mate | -0.1 | +1.1 | +1.0 | +1.4 |
| Mummy | +1.4 | -0.1 | -0.3 | +1.0 |
| Arc Blade | +1.0 | +3.5 | +2.2 | +1.0 |
| Archer | -0.8 | +0.6 | +1.3 | +1.0 |
| Queen Dragoon | +2.2 | -1.8 | -0.5 | +0.9 |
| Wolf Bard | -1.1 | +0.5 | +1.6 | +0.8 |
| Satyr | +1.3 | +1.8 | +1.1 | +0.7 |
| Buccaneer | -0.7 | -0.5 | +0.1 | +0.6 |
| Beastmaster | -1.3 | +1.0 | +1.2 | +0.6 |
| Mercenary | -0.0 | +1.2 | +0.3 | +0.5 |
| Illusionist | -0.6 | +0.8 | +1.5 | +0.4 |
| Dread Pirate | +1.1 | +0.0 | -0.1 | +0.3 |
| Ninja Monk | -1.4 | -1.1 | -0.7 | -0.1 |
| Druid | -2.2 | -0.7 | -0.8 | -0.1 |
| Kitsune | -3.4 | -1.6 | -1.2 | -0.1 |
| Yamabushi Tengu | +0.0 | +1.0 | +0.5 | -0.4 |
| Shambler | -0.0 | +0.4 | +0.0 | -0.9 |
| Tyrant | -0.7 | -2.4 | -2.7 | -1.5 |
| Great Sage | +0.6 | -0.2 | -0.8 | -1.6 |
| Samurai | -0.5 | -0.5 | -1.1 | -2.6 |
| Siege Bot | +2.1 | -3.4 | -4.0 | -2.9 |
| Samurai Commander | +1.4 | -2.1 | -1.8 | -3.1 |
| Knight | +0.5 | -3.8 | -3.8 | -4.1 |
| Juggernaut | -0.9 | -4.0 | -4.0 | -4.2 |
| Cleric | +0.9 | -3.4 | -4.5 | -4.3 |
| Paladin | -1.8 | -2.9 | -3.3 | -4.4 |
| Wanderer | -1.7 | -3.7 | -4.3 | -4.6 |
| Fire Wizard | -0.5 | -5.2 | -5.3 | -4.8 |
| Gunslinger | +1.7 | -5.5 | -5.4 | -5.3 |
| Minotaur | -1.0 | -4.8 | -5.7 | -5.6 |
| Demon Swordsman | -1.6 | -4.8 | -4.9 | -5.6 |

Nobody runs away, but the spread was already about plus or minus 5 at level 30 (before this change: the ultimates, which unlock at 15,
scale differently) and it widens by about a point to level 100 (Kunoichi +6.4, Minotaur and Demon Swordsman -5.6). Levels scale every hero's
hp and attack alike, so this is the kits, not the curve. `test/hero-balance.test.ts` (level 1, within 4) holds as it was. I did not retune
any hero: that is the director's call (Kunoichi, Rifle Bot, Barbarian, Reaper, Time Witch are the high end; Gunslinger, Minotaur, Demon
Swordsman, Fire Wizard, Wanderer the low).

### The armies at deep levels (`--deep`: the recruits' party, a maxed castle, gear dressed; mean tries to clear (clear %); 8 fresh saves a cell, at most 25 tries)

**No talents.**

```
Elite
  army                           Lv 30           Lv 40           Lv 60          Lv 100
  Orc Warband             1.0 (100.0%)    1.0 (100.0%)    1.0 (100.0%)    1.0 (100.0%)
  Undead Legion           1.4 (100.0%)    1.3 (100.0%)    1.0 (100.0%)    1.0 (100.0%)
  Beast Packs             1.1 (100.0%)    1.0 (100.0%)    1.0 (100.0%)    1.0 (100.0%)
  The Wildwood            4.4 (100.0%)    2.5 (100.0%)    1.0 (100.0%)    1.0 (100.0%)
  The Labyrinth           17.3 (50.0%)    10.8 (87.5%)    3.3 (100.0%)    1.0 (100.0%)
  Ogre Clans              2.9 (100.0%)    2.0 (100.0%)    1.4 (100.0%)    1.0 (100.0%)
  Infernal Host           22.3 (12.5%)    13.6 (62.5%)    1.9 (100.0%)    1.1 (100.0%)
  Yokai Night Parade      23.0 (25.0%)    15.5 (75.0%)    6.9 (100.0%)    1.4 (100.0%)
  Golem Forge              25.0 (0.0%)    20.6 (37.5%)    5.9 (100.0%)    1.0 (100.0%)
Legendary
  army                           Lv 30           Lv 40           Lv 60          Lv 100
  Orc Warband             1.1 (100.0%)    1.0 (100.0%)    1.0 (100.0%)    1.0 (100.0%)
  Undead Legion           3.4 (100.0%)    2.4 (100.0%)    1.3 (100.0%)    1.0 (100.0%)
  Beast Packs             12.1 (87.5%)    5.8 (100.0%)    3.1 (100.0%)    1.0 (100.0%)
  The Wildwood             25.0 (0.0%)     25.0 (0.0%)    20.6 (37.5%)    1.6 (100.0%)
  The Labyrinth            25.0 (0.0%)     25.0 (0.0%)     25.0 (0.0%)    3.3 (100.0%)
  Ogre Clans               25.0 (0.0%)     25.0 (0.0%)     25.0 (0.0%)    1.5 (100.0%)
  Infernal Host            25.0 (0.0%)     25.0 (0.0%)     25.0 (0.0%)    7.6 (100.0%)
  Yokai Night Parade       25.0 (0.0%)     25.0 (0.0%)     25.0 (0.0%)     8.6 (87.5%)
  Golem Forge              25.0 (0.0%)     25.0 (0.0%)     25.0 (0.0%)    13.4 (62.5%)
```

**With talents** (every talent row the level opens, the first of each pair; the points are the level's own):

```
Elite
  army                           Lv 30           Lv 40           Lv 60          Lv 100
  Orc Warband             1.0 (100.0%)    1.0 (100.0%)    1.0 (100.0%)    1.0 (100.0%)
  Undead Legion           1.0 (100.0%)    1.0 (100.0%)    1.0 (100.0%)    1.0 (100.0%)
  Beast Packs             1.0 (100.0%)    1.0 (100.0%)    1.0 (100.0%)    1.0 (100.0%)
  The Wildwood            1.0 (100.0%)    1.0 (100.0%)    1.0 (100.0%)    1.0 (100.0%)
  The Labyrinth           1.4 (100.0%)    1.1 (100.0%)    1.0 (100.0%)    1.0 (100.0%)
  Ogre Clans              1.1 (100.0%)    1.0 (100.0%)    1.0 (100.0%)    1.0 (100.0%)
  Infernal Host           1.3 (100.0%)    1.1 (100.0%)    1.0 (100.0%)    1.0 (100.0%)
  Yokai Night Parade      3.4 (100.0%)    1.1 (100.0%)    1.0 (100.0%)    1.0 (100.0%)
  Golem Forge             1.3 (100.0%)    1.0 (100.0%)    1.0 (100.0%)    1.0 (100.0%)
Legendary
  army                           Lv 30           Lv 40           Lv 60          Lv 100
  Orc Warband             1.0 (100.0%)    1.0 (100.0%)    1.0 (100.0%)    1.0 (100.0%)
  Undead Legion           1.0 (100.0%)    1.0 (100.0%)    1.0 (100.0%)    1.0 (100.0%)
  Beast Packs             1.1 (100.0%)    1.0 (100.0%)    1.0 (100.0%)    1.0 (100.0%)
  The Wildwood            4.6 (100.0%)    2.1 (100.0%)    1.0 (100.0%)    1.0 (100.0%)
  The Labyrinth           6.6 (100.0%)    1.8 (100.0%)    1.3 (100.0%)    1.0 (100.0%)
  Ogre Clans              5.6 (100.0%)    1.8 (100.0%)    1.0 (100.0%)    1.0 (100.0%)
  Infernal Host           22.8 (25.0%)    9.6 (100.0%)    1.1 (100.0%)    1.0 (100.0%)
  Yokai Night Parade      20.8 (25.0%)    5.3 (100.0%)    1.9 (100.0%)    1.0 (100.0%)
  Golem Forge             22.8 (12.5%)     6.8 (87.5%)    1.0 (100.0%)    1.0 (100.0%)
```

The realistic climb (`--climb`) never gets past party level 24 by the last army, so it is the same as before (the levels up to 30 did not change).

### What it means

- Without talents, level 60 makes the late Elite armies fair (2 to 7 tries) and level 100 makes Elite trivial; Legendary becomes possible only
  from 60 on the early armies and from 100 on the late ones (Golem Forge 13 tries).
- With the talents learned, **everything is trivial from level 60**, and even Elite is easy at level 30 (1 to 3 tries: this was so before this
  change, the base tree is already that strong in the auto player). A level-100 hero with talents wins every tier on the first try.
- So the top tiers lose their challenge for a deep player. A modest scale of Legendary does not fix it. Harder Legendary foes against heroes
  with talents (mean tries on Orc Warband, Wildwood, Infernal Host and Golem Forge, in that order):

| Legendary foes (hp x, atk x) | level 60 | level 100 |
|---|---|---|
| 2.8, 2.0 (today) | 1.0, 1.0, 1.1, 1.0 | 1.0 on all four |
| 3.4, 2.4 | 1.0, 1.5, 5.3, 2.5 | 1.0 on all four |
| 5, 3.5 | 1.1, 22.8 (25% clear), 25 (0%), 25 (0%) | 1.0, 1.0, 1.3, 1.4 |
| 6, 4 | (level 80: 1.0, 9.6, 25 (0%), 25 (0%)) | 1.0, 1.5, 9.5, 6.6 |
| 8, 5 | 1.9, 25 (0%), 25 (0%), 25 (0%) | 1.0, 5.4, 25 (0%), 25 (0%) |

  A tier that is a real test for level 100 is about hp x6, attack x4: a wall for level 80 and under, a few tries for 100 on the late armies.
  I did **not** scale the existing tiers (Elite at level 30 to 40 is the intended wall, and any scale big enough to matter for level 100 would
  shut the players below out of Legendary) and did **not** build a new tier. **Suggested:** a fifth tier ("Mythic", opening after the Legendary
  star; foes hp x6, attack x4, speed x1.2; pay and XP about x6), for heroes past level 60.

## Tests

- `test/levels.test.ts`: the totals up to 30 are unchanged; the deep curve (eased in, then rising); the milestones, points and badges; power at
  100 (+50 to 70%); the run cap staying at 30; the aura rules. Changed because the rule changed: "the XP curve rises" now checks each level
  rises up to 30 (past 30 the first levels are eased in), the lasting-levels test reads `OLD_MAX_LEVEL` for the old cap of 30 and checks 100,
  and the milestones test also reads the deep ones.
- `test/talents.test.ts`: "every hero has a tree of eight nodes in three tiers" became sixteen nodes in seven tiers (and the stat bound is
  per row range); new tests for the rows opening by level and in turn, the costs, a respec, a damaged save keeping a deep node only for a hero of
  the level, the effects being ones the fight knows and the names matching each kit, and a whole tree at 100. `test/more-heroes.test.ts`: the tree
  length 8 became 16.
- `test/achievements.test.ts`: "15 to 20 achievements" became 15 to 25, and a test for the three level goals.

## Screenshots (`docs/samples/level-100-*.png`, at 393 and 360)

`sheet-47` and `sheet-100` (the hero sheet), `talents-top`, `talents-deep` and `talents-tree` (the tree with the deep rows), `levelup`
(the recap past 30), `bench` (the bench cards with badges) and `roster`, `aura-battle` (rings under a level-99 and a level-70 hero).

## Bench XP (an owner add-on)

A hero of the run that did not fight earns a small share of lasting XP: `BENCH_SHARE` (a tenth) of the mean XP the fighters earned that
fight, the same for each (`benchXp` in `levels.ts`; deterministic, wins and losses alike). It applies to the lasting-level modes (armies, the
daily, auto-replays) and not to a run that levels its own heroes (the spire and the Calamity), which have their own rules. The after-fight XP
section ends with one quiet line, "Bench +12 XP each", naming any benched hero that rose a level (`showBench` in `main.ts`).

How much it is worth (`npm run level-pace`, a hero benched for every run, 13 runs a day): about 120 to 370 XP a run on Normal, rising with
the tier and the Library. Level 10 on day 2, level 20 on day 6, level 30 on day 23, level 40 on day 149, level 50 on day 240, and level 70 not
within the year: a fighter-favourite is at 30 on day 4 and 100 on day 181. So a level-1 hero kept on the bench through an army run gains a few
levels, and is a power-levelling route up to the low 30s, but never keeps pace with the fighters. After the merge of main (0.124.0, the
Calamity's changes) the pace table above is unchanged: no army or lasting-XP number moved.
