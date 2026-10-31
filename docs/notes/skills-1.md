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
