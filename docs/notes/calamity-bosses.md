# Calamity ascension and boss phases

Two features on the boss fights: a ladder of harder Calamities, and a second form for the big bosses.

## Boss phases (`src/sim/bossPhases.ts`)

- **Who**: the final boss of each of the nine armies (the Orc Warlord, Lich King, Boar King, Grove Spearlord, Minotaur Champion, Horned Ogre, Demon Lord, Oni King, Forge Titan) and the Calamity's six map bosses. A boss changes form only when its fight was started with the phase flag (`Boost.phase`, the share of health it happens at): `waveBoost` sets it on an army's final wave, `calBossBoost` on a Calamity boss floor. The same fighters elsewhere (the endless tower's bosses, mid-bosses) are unchanged.
- **When**: the first tick its health is at or under the share (50%; 65% at ascension 3). It happens once (`unit.phase.done`). `stepBattle` checks after the tick's blows and casts, calls `enterPhase`, and emits `{ kind: 'phase', by, phase: 2, line, ms }`.
- **The hold**: `enterPhase` sets `Battle.pause` to `PHASE_PAUSE_MS` (1.5 s). While it runs down, `stepBattle` returns at once: time does not advance, nothing acts, no blow lands, statuses do not tick. So it is deterministic and costs the fight nothing but a 15-tick pause (the 120 s limit is unaffected).
- **The second form** is data, `PHASE2` by fighter id: `atk` (a multiplier on its attack, the surge), and any of `heal`, `shield` (10 s), `haste`, `adds` (called up beside it, at the foes' strength), `skill` / `ultimate` (a `KITS` id whose skill it uses from now on; stored as `unit.kit`, which `kitOf` reads first), `primed` (the ultimate is full), `teleport` (it leaps beside the hero farthest from it) and `passive` (traits merged into its kit's). Each boss has its own line and a different mix; a test checks no two kits are alike.
- **The page** (`main.ts` `startPhase`, `fx.ts` `phaseShock`): the camera pushes in on the boss, a "Phase 2" banner shows its name and line over the held fight, a single shockwave (`dark-wave`, `blood-circle`) rolls out and the screen shakes once; one white flash at most 0.35 alpha for 110 ms (the existing `flash` caps). Nothing loops. The banner goes when the pause ends (so at x2 speed it is shorter). Reduced motion: no banner animation, no shake or flash (the fx `calm()` rule).

## Ascension (`src/sim/ascension.ts`)

Each full Calamity clear opens the next ascension level, up to 10. A level adds one rule on top of the ones before (`ascRules(level)` gives them all together; level 0 changes nothing):

| Level | Rule |
| --- | --- |
| 1 | foes have 20% more health |
| 2 | heroes for hire in the shops cost 40% more (it was "the longer maps lose their second recruit camp"; a map now has the one recruit spot, `docs/notes/cal-map.md`) |
| 3 | bosses change form at 65% health, not 50% |
| 4 | elites turn up twice as often (weight x2 on a map) |
| 5 | shops charge 25% more |
| 6 | all healing is halved (a win's mending, a campfire, a draught, a healer's heal in the fight; an elixir still heals whole) |
| 7 | start with 15 less gold |
| 8 | every boss floor carries a curse twist (Narrow pass, Cursed, Ambush or Fortified, from its own stream) |
| 9 | foes hit 15% harder |
| 10 | bosses begin the fight behind a shield of 10% of their health |

(The brief said "start with 1 less gold"; I read it as a real cost and used 15. It is `startGold` in `ascRules`.)

- **Reward**: crowns for the maps cleared are multiplied by `1 + 0.2 x level` (a loss too), and a full clear pays `1 + floor((level + 1) / 3)` gold chests (1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4 for levels 0 to 10).
- **Save**: `meta.calamity.asc` (optional) is the highest level cleared whole. An old save with clears but no `asc` counts as level 0 cleared, so level 1 is open. The run keeps its level in `run.mode.ascension` (absent at 0, so the old shape is unchanged). `calamityRun(seed, meta, hero, level)` never plays a level not yet opened. Losing or abandoning never changes the best level.
- **Pick screen** (`calamityView.ts` `pickHero`): a stepper (‹ Ascension N ›, up to one past the best cleared), the rules in force (newest first, in red), the reward line and the best cleared level. It starts on the highest open level.
- Everything is deterministic: maps and twists come from the seed's side streams, and `calamityMap` still draws the same random numbers when a rule is on so the rest of a map is as it was.

## Balance

The phase adds a second half to each boss fight, so the final bosses' stats were lowered to keep the climbs where they were (`tools/finalboss.ts` plays only an army's last wave with the campaign's gold and heroes; `tools/finalboss.mjs` runs it; `npm run balance -- --no-tables --calamity --attempts N --asc L` and `--bossk` for the Calamity).

Armies' final bosses (`last` in `armies.ts`, hp / attack): Orcs 3500/85 to 2630/74, Undead 2600/70 to 2080/63, Beasts 3400/80 to 2890/74, Wildwood 3000/72 to 2400/65, Labyrinth 2500/60 to 2125/55, Ogres 2600/52 to 2080/47, Infernal 2300/45 to 1840/41, Yokai 3000/55 to 2550/51, Golems 2400/60 to 2040/55. Calamity bosses (`calamityBosses.ts`): 3000/68 to 2280/60, 3800/78 to 3270/73, 4200/80 to 3350/72, 3800/62 to 3210/57, 3400/56 to 2780/51, 2800/46 to 1700/36.

**Before and after** (same seeds; greedy bot, no castle):

- Armies, table 5b, 100 fresh saves of the starting five, mean tries to clear (cleared %): Orcs 3.0 / 3.0 (100 / 100), Undead 3.9 / 3.7 (100 / 100), Beasts 5.2 / 4.9 (100 / 100), Wildwood 13.0 / 13.6 (94 / 96), Labyrinth 11.5 / 10.3 (90 / 89), Ogres 9.7 / 10.3 (79 / 71), Infernal 12.7 / 11.7 (52 / 49), Yokai 10.3 / 12.2 (12 / 13), Golems unchanged (1 clear in 100 either way, so its mean is noise). The final waves alone (`finalboss.mjs --castle 0.5`, 60 attempts, hero levels 14/20/26/30) match to within a few points in every army, for example Wildwood 13/43/85/98 before, 13/42/83/98 after.
- Calamity (1000 runs; share felling each map's boss): 84 / 79 / 64 / 44 / 32 / 12 before, 86 / 80 / 64 / 45 / 33 / 14 after (the note's older 86 / 78 / 64 / 44 / 36 / 16 was at 100 runs).
- Ascension (300 runs a level, the same bot; share felling each boss, and the full clear): level 0 87 / 80 / 65 / 44 / 31 / 13; level 1 83 / 75 / 50 / 30 / 18 / 8; level 3 83 / 70 / 48 / 32 / 23 / 12; level 5 82 / 70 / 49 / 33 / 26 / 13; level 6 80 / 62 / 35 / 16 / 11 / 4; level 8 66 / 48 / 31 / 18 / 12 / 4; level 10 52 / 33 / 11 / 3 / 2 / 1. The levels get steadily harder (not strictly every step: the bot's luck with each level's different maps is noisy); the bot cannot play the top levels, and a human with the shops and relics should do better.

Tests: `test/bossPhases.test.ts` (each boss enters phase 2 once at 50%, the hold, the kit's parts, determinism, the flags on armies' waves) and `test/ascension.test.ts` (each level adds one rule, rewards, unlocking, old saves, the map, shop and heal rules, pay). Shots: `docs/samples/calamity-bosses-*.png` (`tools/calamity-bosses/shots.mjs`).
