# Skills overhaul, batches 0 to 2: the measure, the rules as data, cooldowns by class

The owner-approved design is [skills-overhaul-design.md](skills-overhaul-design.md) (copied here from `claude/skills-design`); this note
covers its build plan's batches 0, 1 and 2 (section 11). Batches 3 on (ranks without skills, the third skills, skill levels by use, the
timers, the page, the full rebalance) are not built.

## Batch 0: main measured

On main 0.284.0 (`489f736`), with the game's own seeded tools; the same commands were run again after batch 2 (below). Level 20 had no
stage of its own: stage 30 is where a team of level-20 heroes wins about half (`node tools/skills/measure.mjs 20:26 20:30 20:34`: 87%, 52%,
21%).

**Parity** (`node tools/kits/tune.mjs <knobs> <level> <stage> 12000`, every hero in 12,000 random five-hero teams; the lift is its win rate
against the roster's average):

| Level, stage | Average | Spread | Largest lift | Beyond 6 | Beyond 4 |
| --- | --- | --- | --- | --- | --- |
| 1, stage 5 | 54.1% | 9.6 | 5.0 (Knight) | none | 3 |
| 10, stage 24 | 35.9% | 11.4 | 5.9 | none | 6 |
| 20, stage 30 | 51.9% | 14.6 | 7.4 | Minotaur, Wolf Bard | 8 |
| 30, stage 78 | 55.6% | 8.0 | 4.2 | none | 1 |

**The pools and the fights** (`GAMES=4000 node tools/skills/measure.mjs 1:5 10:24 20:30 30:78`; casts a minute of standing, the mean of
the 28 stamina and 17 mana heroes):

| Level, stage | Won | Fight | Time a fight | Income SP/s, MP/s | Stamina casts s1/s2 | Mana casts s1/s2 |
| --- | --- | --- | --- | --- | --- | --- |
| 1, 5 | 53.2% | 32.5 s | 32 ms | 2.64, 2.62 | 5.5 / 0 | 3.2 / 0 |
| 10, 24 | 35.2% | 28.5 s | 35 ms | 3.05, 4.17 | 4.2 / 1.4 | 3.1 / 1.4 |
| 20, 30 | 51.6% | 29.0 s | 33 ms | 3.02, 4.17 | 4.0 / 1.5 | 3.1 / 1.5 |
| 30, 78 | 55.3% | 25.4 s | 39 ms | 3.00, 4.93 | 4.1 / 1.5 | 3.2 / 1.9 |

The design's reference income at level 20 (about 3.5 SP and 4.5 MP a second) measured as **3.0 SP and 4.2 MP**: `INCOME` in
`skillRules.ts` holds the measured numbers. (The time a fight is with the machine shared by other work: read it as a ratio between runs on
the same day, not as a number.)

**Each grade** (`npm run balance -- --heroes-only --hero-grade G --hero-stage S --hero-level L`, 4,000 teams, tier-promises' stages):

| Grade, level, stage | Average | Lifts | Beyond 6 |
| --- | --- | --- | --- |
| 2, 1, 9 | 36.3% | -6.4..+13.5 | Knight +9.5, Minotaur -6.1, Beastmaster +13.5, Juggernaut -6.4 |
| 3, 1, 12 | 62.5% | -9.3..+14.9 | 13 heroes (Beastmaster +14.9, Arc Blade +12.8, Knight +12.7, Minotaur -9.3, Buccaneer -8.4...) |
| 4, 1, 24 | 45.9% | -11.1..+10.2 | 10 heroes (Lightning Mage -11.1, Beastmaster +10.2, Kitsune -8.5...) |
| 2, 30, 140 | 19.3% | -5.0..+8.5 | Fire Wizard +8.5, Paladin +7.6, Cleric +7.5 |
| 3, 30, 173 | 35.9% | -10.1..+11.8 | 13 heroes (Paladin +11.8, Archer +10.8, Siege Bot +10.2, Minotaur -10.1...) |
| 4, 30, 260 | 50.8% | -8.2..+10.6 | 9 heroes (Paladin +10.6, Archer +8.3, Karasu Tengu -8.2...) |

**The modes:**

- Daily (`npm run daily-rate`, 60 dates, fresh save): 65% cleared with the two hearts, 42% with none; mean battle 154 s.
- Armies and the spire (`SAVES=48 node tools/merge-two/run.mjs ...`, single tries): the starting five at Orcs 1 21%, Undead 20 8%; Orcs
  Legendary at 55 8% (12.1 waves of 15); Ogres 45 48%; Infernal 55 15%; Yokai 64 4%; Golems 74 63%; the spire with no castle: floors
  12/12/25 (p25/median/p75), mean 21.6, first act boss 33%; with a full castle 12/19/38, mean 28.5, first boss 50%.
- The Last Stand (`npm run stand-balance -- --levels 1,10,20,30,60,100 --attempts 60`): median wave 4, 9, 10, 14, 19, 20 (mean 3.6, 8.8,
  10.4, 14.5, 17.6, 22.1).
- The Calamity (`node tools/balance.mjs --no-tables --calamity --attempts 150`): median 1 map, mean 1.37; map 1 99%, map 2 37%, map 3 1%.

## Batch 1: the rules as data, no fight changed

- `src/sim/skillRules.ts` (new): `SkillClass` (`jab`, `strike`, `heavy`, `utility`, `guard`), each class's ranges (`CLASS_RANGE`: cost in
  stamina and mana, cooldown, cast time), the AI's weights (`CLASS_WEIGHT`), the cast-time exemptions the design lists (`CAST_EXEMPT`),
  the reference income (`INCOME`) and a kit's demand (`slotDemand`, `kitDemand`).
- `src/sim/heroKits.ts`: `Slot.cls` (its class) and `Slot.cd` (its cooldown, which replaced the optional `gap`); `HeroKit.slots` (the skills
  in slot order; `s1` and `s2` are kept as the same objects, so every old read stays valid); `SLOT_LEVELS` and `slotOpen`; `canPay`,
  `fire`, `holding` and `reserve` take any slot number; `castHero` weighs the open slots from the highest down, with today's order kept;
  `KitState` gains `at3`, `idle1`, `idle3` and `breath`; `RES.BREATH_MS` (0 in this batch: no breath is kept).
- `src/sim/kits/table.ts`: `CLASSES` (each hero's skill 1 and skill 2 class, from the design's section 3), and every slot's `cd` set to
  the gap it had (its own, or its pool's 3 s or 5 s).
- `src/fightHudRules.ts` (`gapOf` reads `cd`), `tools/kits/table.ts`; `test/fight-hud.test.ts` and `test/hero-kits.test.ts` read `cd`
  where they read `gap` (a rename, the same numbers).
- `tools/skills/measure.ts` (new, `node tools/skills/measure.mjs <level>:<stage> ...`): the hero sweep's fights, measuring each pool's
  income, casts a minute of each skill, the mean fight length and the time a fight.
- Tests: `test/skill-rules.test.ts` (new: slots, classes, cooldowns, the slots' levels, a slot that is not open is never cast). The
  identity fixtures (`test/spells-identity.test.ts`, `test/ailments-identical.test.ts`) did not move.

## Batch 2: cooldowns and costs by class

**The rules** (the design's section 3):

- Every skill 1 and skill 2 costs and cools by its class (`COSTS` in `kits/table.ts`, `[cost 1, cooldown 1, cost 2, cooldown 2]`): the design's
  starting numbers, with the tuning pass's moves below. The pools' own gaps (`RES.GAP_STAM_MS` 3 s, `RES.GAP_MANA_MS` 5 s) are gone.
- **The breath** (`RES.BREATH_MS` 800): after a cast ends, 0.8 s before the hero casts another of its skills. The ultimate, a healer's
  revive and a guard's emergency ignore it; another skill's emergency waits for it.
- **The AI** (`castHero`, `pickOrder`, `holding`): emergencies first, guards before the rest; then the open skills by class, heavy, utility,
  strike, jab, guard, the one cast longest ago first among equals (two utilities or two strikes take turns), then the higher slot. **Saving:**
  a lighter skill is passed over when a heavier one has something to do (its `SKILL2_WHEN` look, and it did not just find nothing), its
  cooldown ends within the hold (`HOLD_STAM_MS` 1.5 s, `HOLD_MANA_MS` 3 s), and paying for the lighter one now would leave it short when it
  comes round. So a heavy skill is saved for (the design: "its cost holds it back"). A jab is never held while its demand is under the
  income (no jabs yet: they come with skill 3). A first cut also asked that saving would see the heavy one paid within the hold; that
  starved the heavies of the stamina strikers (the Archer, Ranger, Gunslinger, Rifle Bot and Dread Pirate never cast skill 2 in
  `hero-kits-all`'s long fight), so it was dropped, as the design's words have it.
- The old rule that held skill 1 back for skill 2 after every skill 1 (the "turns" between them) went: turns are now among equals only.

**The tuning** (the design's order: strength first, then cost and cooldown within the class, the global knobs last):

- `TUNE1` re-tuned at level 1 (stage 5) and `TUNE2` at level 10 (stage 24), each stepped towards main's average (`TARGET`), so the roster's
  win rate at each level stayed where it was; the ultimates' `power` (`TUNE` in `ultimates.ts`) at level 30 (stage 78), the late lever as
  `tools/kits/tune.mjs` has it, by a few per cent each (none below its pre-kit floor). Cheaper, quicker skills made every hero stronger at
  the same strength: `TUNE1` came down to about 0.7 of what it was (the geometric mean), `TUNE2` to about 0.56.
- `RES.SKILL2_PACE_MANA` 1.6 to **1.45** and `RES.SKILL2_PACE_STAM` 1.15 to **1.05** (the refill once skill 2 is open): with skill 2 at a
  utility's or heavy's cost and the saving rule, a level-10 team had grown by 8 points, and `TUNE2` alone had run several skills down to
  the tuner's floor. The reference income at level 20 is now 2.8 SP and 3.8 MP a second (`INCOME`).
- Costs and cooldowns moved from the design's starting numbers, each within its class, where a skill's strength was at its floor and its
  hero still stood out (or a tank's heavy starved its guard): the Knight (Shield Wall 24 to 20; Shield Rush 32 SP 9 s to 28 SP 12 s), the
  Archer (Aimed Shot 30/10 to 34/12), the Ranger (Snare 22 to 26; Spike Growth 32/12 to 36/14), the Queen Dragoon (Dragon Dive 34/11 to
  36/13), the Warlock (Drain Life 46/12 to 50/14), the Time Witch (Slow 38/14 to 46/16), the Illusionist (Mirror Image 32/16 to 44/20), the
  High Priestess (Death Ward 38/14 to 44/16), the Druid (Conjure Treant 42/16 to 50/20; Wild Shape 42 to 48), the Samurai Commander (War
  Banner 22/14 to 28/18), the Wolf Bard (Vicious Mockery 32/7 to 38/8), the Beastmaster (Summon Beast 24/14 to 28/18; Pack Tactics 24 to 28),
  the Kitsune (Charm Monster 38/14 to 44/16; Alter Self 42 to 50), the Satyr (Pipes of Pan 30/14 to 38/18; Irresistible Dance 46/12 to
  50/14), the Shambler (Devour 18/10 to 20/18), the Mummy (Dominate Monster 46 to 50).
- `tools/kits/tune.ts`: a knob may now rise to 10 (it was capped at 3, which had cut the Fire Wizard's Wall of Fire from 8 and the
  Mercenary's Hunter's Mark from 4 on the first step).

**Tests:** `test/skill-rules.test.ts` gains the class rules (every skill in its class's cost, cooldown and cast-time ranges, the design's
eight cast-time exemptions kept; no pool gap left; a heavy is its kit's dearest skill; no kit's demand above 3.5 (the floor of 1.4 waits for
the third skills, as rule 2 waits for the jabs); the AI's class order, the breath, a guard's emergency through the breath, the saving rule,
turns among equals). Moved to the owner's new rules, and said so in each: `hero-kits-all` (the cost bands are the classes'), `hero-kits`
(the wait after a cast is the breath, not the pool's gap), `fight-hud` and `more-heroes` (Summon Beast's 18 s and the breath), `revive`
(the Cleric's revive costs 66, Prayer of Healing's 46 and 20), `class-heroes` (Benediction's mend follows its strength) and `new-heroes`
(Sanctuary held by what it healed). **Re-recorded:** `test/fixtures/spells-identity.json` (every scenario: field1, field30, bosses,
armyFoes, spells, lands, army, daily, tower, stand, calamity, heroes1, heroes10, heroes30 and the five `...Others`),
`test/fixtures/ailment-logs.json` (every scenario) and `stand-regression`'s twelve pins: every fight with a hero in it moves, as the batch
means it to.

**Before (main) and after (this branch)**, the same commands as batch 0:

| Measure | Main | Batch 2 |
| --- | --- | --- |
| Parity, level 1 stage 5: average, spread, largest lift, beyond 4 | 54.1%, 9.6, 5.0, 3 | 54.4%, 7.5, 3.9, 0 |
| Parity, level 10 stage 24 | 35.9%, 11.4, 5.9, 6 | 36.7%, 10.3, 6.0, 4 |
| Parity, level 20 stage 30 (not tuned: skill 3 comes at 20 in batch 4) | 51.9%, 14.6, 7.4 (Minotaur, Wolf Bard beyond 6) | 54.1%, 12.8, 6.5 (Shambler, Siege Bot beyond 6) |
| Parity, level 30 stage 78 | 55.6%, 8.0, 4.2, 1 | 57.3%, 9.3, 4.8, 3 |
| Mean fight, levels 1 / 10 / 20 / 30 | 32.5 / 28.5 / 29.0 / 25.4 s | 32.9 / 28.8 / 29.1 / 25.6 s |
| Time a fight (machine shared; the load was about 8 for main's run, about 40 for this one) | 32 / 35 / 33 / 39 ms | 40 / 42 / 40 / 41 ms |
| Income at level 20, SP/s and MP/s | 3.02, 4.17 | 2.78, 3.78 |
| Stamina casts a minute s1/s2, level 10 / 30 | 4.2/1.4, 4.1/1.5 | 3.7/3.5, 3.5/3.5 |
| Mana casts a minute s1/s2, level 10 / 30 | 3.1/1.4, 3.2/1.9 | 2.7/2.3, 2.9/2.5 |
| Grade 2, level 1 stage 9: average, lifts | 36.3%, -6.4..+13.5 | 38.8%, -5.2..+19.3 |
| Grade 3, level 1 stage 12 | 62.5%, -9.3..+14.9 | 68.8%, -9.1..+16.7 |
| Grade 4, level 1 stage 24 | 45.9%, -11.1..+10.2 | **61.7%**, -11.2..+16.8 |
| Grade 2, level 30 stage 140 | 19.3%, -5.0..+8.5 | 21.3%, -4.7..+9.0 |
| Grade 3, level 30 stage 173 | 35.9%, -10.1..+11.8 | 39.0%, -11.4..+11.6 |
| Grade 4, level 30 stage 260 | 50.8%, -8.2..+10.6 | 56.0%, -16.4..+12.9 |
| Daily, with hearts / none | 65% / 42% | 65% / 42% |
| Starting five: Orcs 1, Undead 20 | 21%, 8% | 17%, 17% |
| Orcs Legendary 55; Ogres 45; Infernal 55; Yokai 64; Golems 74 | 8%, 48%, 15%, 4%, 63% | 23%, 50%, 10%, 6%, 54% |
| Spire, no castle: floors p25/median/p75, mean, first boss | 12/12/25, 21.6, 33% | 12/12/25, 18.4, 27% |
| Spire, full castle | 12/19/38, 28.5, 50% | 12/38/77, **41.6**, 58% |
| Last Stand median wave at 1, 10, 20, 30, 60, 100 | 4, 9, 10, 14, 19, 20 | 3, 9, 10, 13, 16, 20 |
| Calamity: mean maps, map 1 / 2 / 3 | 1.37, 99% / 37% / 1% | 1.45, 100% / 43% / 2% |

(The armies' cells are 48 single tries, about 7 points of noise.) **What moved:** parity at levels 1, 10 and 30 is inside the 6-point
band and no wider than main's, and the fights are as long. Skill 2 now comes more than twice as often and skill 1 a little less. The
**merged grades** grew most: a grade-4 party at level 1 wins 62% where it won 46%, and the spire with a full castle (whose long climbs are
fought by merged parties) goes much further. The tier skills (still in play until batch 3) are skill 1's upgrades, and skill 1 now costs
less: a grade-3 or grade-4 hero casts its tier skill more often. Batch 3 removes the tier skills and sets `GRADE_BOOST` against these grade
targets, so it is left for that batch rather than answered here. The Last Stand's later levels are a wave or so shorter (its eight heroes
cast more, each weaker), the Calamity and the daily are where they were.

**After merging main** (0.291.0 with the summon timers and the skill books, then 0.293.0): parity at level 1 54.4% (spread 7.7, none beyond
4), level 10 37.0% (10.6, none beyond 6), level 30 57.6% (10.0, none beyond 6). The identity fixtures were re-recorded on the merged code;
0.293.0 moved none of them. Two merge fixes: a skill-book loadout's kit (`kitWithLoadout`, `books.ts`) now carries its `slots`, which the AI
reads; `summon-timers.test.ts`'s carried wolf keeps the Beastmaster's call on its cooldown (Summon Beast's 28 stamina could otherwise be paid
within the test's five seconds, calling a second wolf).

## Checks

`npm run typecheck`; the affected tests (`skill-rules`, `hero-kits`, `hero-kits-all`, `fight-hud`, `revive`, `more-heroes`, `class-heroes`,
`new-heroes`, `summon-timers`, `stand-regression`, `spells-identity`, `ailments-identical`, `hero-balance`, `hero-balance-ultimates`); the full
`npm test` after each batch and after each merge; `npm run web`. No page changed, so no screenshots.

## The answers (after batch 2)

The slower level-10 refill and the sixteen in-class cost and cooldown moves were accepted, and batch 4's jabs are to be set against the
measured income (2.8 SP, 3.8 MP). The merged grades' growth was answered by shipping batch 3 with batch 2 (below).

## Batch 3: ranks stop upgrading skills

The owner's rule (the design's section 4): a rank, the stars from merging in a run, gives more health and attack and nothing else. Batches
2 and 3 ship together (the coordinator's call: batch 2 alone left merged heroes far too strong).

**What went:**

- `src/sim/tierSkills.ts` (the 135 tier skills, their modifiers, riders and echoes, `promoteUnit`) is deleted. `battle.ts` no longer merges a
  grade's modifiers into a hero's talents (`applyTierMods`), `abilities.ts`'s `began` no longer runs riders, and `costOf` has no tier 3
  discount (`TIER3_DISCOUNT` is gone). `echoSkill` and the `echo` pending stay, unused, for a battle saved with one pending.
- The words: a skill's sheet (`fightHudRules.ts`, also read by the unit card) shows one rank line, "Every rank: the same at every rank: a rank
  gives more health and attack, never a better skill" (`EVERY_RANK`), for each skill and the ultimate. The hero sheet's Skills tab
  (`menuHeroes.ts`) and the codex (`codexView.ts`) no longer list Tier 2, 3 and 4. The promotion banner (`fx.ts`) reads "Rank N" over "<name> ·
  more health and attack".
- Tools: `tools/rank4/` and `--tier-cap` are gone; `tools/fxlab/audit.ts` no longer writes the tier table. `tools/balance.ts` gains two tuning
  knobs, `GB=1,1.38,1.85,3.0` (the grade steps) and `CALTIER=1.28` (the Calamity's tier step).

**What replaced their power** (stats only, set against main's grade numbers from batch 0):

- `GRADE_BOOST` **[1, 1.38, 1.85, 3.0]** (was [1, 1.3, 1.6, 2.4]). The tier skills were worth far more than the design's estimate of about 5%
  of hp and attack: with them gone at the old steps, a grade-4 party at level 1 won 7.8% (main 45.9%), grade 3 26.3% (62.5%). One step a grade
  cannot meet level 1 and level 30 at once (the tier skills were worth relatively more at 30), so the steps sit between:

| Grade, level, stage | Main | Batch 2 | Batch 3, old steps | **Batch 3** |
| --- | --- | --- | --- | --- |
| 2, 1, 9 | 36.3% | 38.8% | 24.9% | **42.1%** |
| 3, 1, 12 | 62.5% | 68.8% | 26.3% | **71.0%** |
| 4, 1, 24 | 45.9% | 61.7% | 7.8% | **48.5%** |
| 2, 30, 140 | 19.3% | 21.3% | 12.4% | **18.2%** |
| 3, 30, 173 | 35.9% | 39.0% | 12.9% | **30.8%** |
| 4, 30, 260 | 50.8% | 56.0% | 13.9% | **45.7%** |

  The spread of the lifts narrowed with the tier skills gone: grade 4 at level 1 had ten heroes beyond 6 points on main and 13 after batch 2;
  now three (Samurai -6.6, Fire Wizard -7.1, Yamabushi -6.4). At grade 4, level 30, three (Samurai Commander +8.2, Cleric +7.4, Great Sage
  -6.5).
- `CAL_TIER.mult` **1.28** (was 1.2): the Calamity's tiers by level are stats only too. 150 runs: a mean of 1.38 maps, map 2 39% (main 1.37,
  37%; 1.24 and 26% at the old step).
- `SPIRE_ACT_STEP` **0.04** (new, `tower.ts`: the spire's foes grow this much more each act after the first; a Calamity keeps its own step).
  96 climbs of `tools/merge-two/run.mjs`: with a full castle, a mean of 36.0 floors (main 35.8; 43.6 without the step), first act boss 68%
  (main 56%); with no castle, 18.7 floors (main 21.1), first boss 26% (main 29%). (The batch 0 figures were 48 climbs; these are 96, on main
  0.293.0 and this branch.)
- `DAILY_START` **0.53** (was 0.565): a fresh save cleared the daily 55% of the time; now 73% (main 70%, band 66 to 75%). With 60 dates the
  rate moves a few points from one start to the next (0.535 gave 65%).

**Left for batch 8** (the full rebalance, as the design plans): the armies. 48 single tries a cell, main 0.293.0 against this branch: starting
five Orcs 1 17% / 17%, Undead 20 8% / 15%; Orcs Legendary 55 8% / 10%; Ogres 45 48% / 40%; Infernal 55 15% / 2%; Yokai 64 4% / 10%; Golems 74
63% / 48%. The Infernal Host and the Golem Forge are harder at their single-try levels; their `start` is the knob. One army was answered now, because a test holds it: the
Undead Legion's `start` 1.48 to **1.34** (`armies.test.ts` wants the starting five, merged in the run, to clear it at least 35% of the time at
level 22; without the tier skills it was 19% over 48 tries, and 35% at 1.34; `army-pace.test.ts`'s pinned value moved with it, and the
identity's `army` scenario was recorded again). The Last Stand (no merging)
is as after batch 2.

**Tests:** `test/tier-skills.test.ts` is retired (the owner's rule removes what it held) and replaced by `test/grade-stats.test.ts`: a grade
changes health and attack by its step and nothing else (the same kit, costs and talents), and a grade-4 party casts no tier rings or echoes.
`fight-hud.test.ts`'s tier-lines test became the rank line; `signatures.test.ts` runs the ring check over every hero. `merge.test.ts`'s
"each grade stronger, rank 4 the biggest step" holds (1.38, x1.34, x1.62). Re-recorded: `spells-identity.json`'s army, daily, tower and the
six hero scenarios (they place grades 1 to 3), and `ailment-logs.json`'s army, daily and tower; every grade-1 scenario kept its hash.

**Checks (batch 3):** `npm run typecheck`; `grade-stats`, `fight-hud`, `signatures`, `merge`, `armies`, `army-pace` and the identity tests; the
full `npm test` before and after merging main 0.298.0 (1,986 pass, 0 fail); `npm run web`; the skill sheet with its rank line at 393x852,
360x780 and 412x915 (`PORT=8982 node tools/battle-hud/shots.mjs skills-1 sheet`: `docs/samples/skills-1-sheet-*.png`, no page errors).

## On SPELLS-RETUNE (main 0.301.0 to 0.303.0)

SPELLS-RETUNE re-tuned the armies, the daily, the Last Stand and the Calamity for a bot that casts the king's spells. Its values are the base;
batches 2 and 3 re-apply only what they need on top, measured with the casting bot:

| Knob | SPELLS-RETUNE | Now | Measure (target: SPELLS-RETUNE's figure) |
| --- | --- | --- | --- |
| `DAILY_START` | 0.76 | **0.74** | fresh save 65% at 0.76, **72%** at 0.74 (band 66 to 75%; SPELLS-RETUNE 72%) |
| Undead Legion `start` | 1.7 | 1.7 (kept) | `armies.test.ts`'s level 22: 69% over 16 tries (needs 35%) |
| Ogre Clans `start` | 12.2 | **11.4** | `ogres:45:0:tp` 4.5 tries at 12.2, **2.2** now (2.3) |
| Infernal Host `start` | 16.2 | **15.65** | `infernal:55:0:tph`, 24 saves: **4.4** (the owner's answer, 4.3); 3.7 at 15.4, 5.5 at 15.7 |
| Yokai Night Parade `start` | 18.3 | **18** | `yokai:65:0:tph`, 24 saves: **11.5 (88%)** (the owner's answer, 11.7, 83%) |
| Golem Forge `start` | 19.8 | **19.1** | `golems:65:0:tph`, 24 saves: **8.0 (96%)** (the owner's answer, 6.6; 6.0 at 19.03, 11.3 at 19.8) |
| `CAL_TIER.mult` | 1.2 | **1.32** | 150 runs: a mean of 1.52 maps at 1.28, **1.65** at 1.32 (main 1.65); `calamity.test.ts`'s full clear holds |
| `HALL_EASE`, `CAL_SCALE.start` | 1.2, 0.6 | kept | |

(`node tools/spells-retune/run.mjs cell ...`; the late three as SPELLS-RETUNE's "The owner's answers" measured them, hearts on 24 saves at levels 55, 65 and 65, kept hard as the owner asked; the Ogres on 12 saves; the starts bisected with its `tune`. The tier lifts above Normal multiply
the Normal start, so the harder tiers of these four eased with it; they were not re-measured here.) The grade table does not use the king's
spells and is unchanged (above). Identity fixtures: every scenario differs from main's, from batch 2, and each test's own computation was
written back. Checks: typecheck; the affected tests (armies, army-pace, calamity, daily, difficulty, stand-retreat, grade-stats, skill-rules,
hero-kits, fight-hud, merge, relics, both identity tests: 237 pass); `npm run web`.
