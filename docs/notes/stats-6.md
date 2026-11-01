# STATS batch 6: the rest

The sixth batch of the owner-approved D&D stats design ([rpg-stats-design.md](rpg-stats-design.md), section 14 batch 6, sections 3.1, 3.4,
6, 7 and 11, and the owner's answers of 31 October 2026). Built on batch 5 ([stats-5.md](stats-5.md)), released as 0.324.0; every number
below is measured against that code, run side by side with this branch.

## What it does

All of it is in `src/sim/statRest.ts` (pure), with one switch per rule (`REST`) for measuring and for the tests that stage a skill's
written numbers.

- **Pools by score** (`heroKits.ts`: `poolNumbers`, `topOf`, `fillOf`). A stamina hero's pool follows its CON, a mana hero's its casting
  ability: each point of modifier is +3 SP (+5 MP) on the top and fills the pool 4% faster (its refill and its gains from blows). The
  pool is still kept as a share in `Unit.charge`, so saves and carried pools read as before; a fight still starts with the written 20
  points.
- **INT's quick wits** (`cdOf`): every skill's cooldown 2% shorter a point of INT, at most 10% either way, after the class's cooldown and
  the skill level's cut, and never moved out of its class's range.
- **CHA's inspiration** (`ultFillOf`): the ultimate's meter fills 3% faster a point of CHA.
- **The herald** (`heraldOf`, `eidolons.ts`): an Eidolon's rider lasts 5% longer a point of the highest CHA modifier among the living
  heroes (the Eidolon's strike stays fixed, the owner's rule). Auto never calls an Eidolon, so no sweep moves.
- **WIS's perception** (`perceptionOf`): a hero sees through 10% a point of WIS of tall grass's cover (its +2 AC counts that much less) and of
  the misses from smoke, ink and sand (the Kunoichi's smoke, the Mercenary's Dirty Trick, the Kraken's Ink Cloud; a WIS 8 hero is fooled
  10% more). The smoke's roll is the same draw as before, only its threshold moves.
- **STR's Athletics** (`athleticsOf`, `strikeDef`): a hero of STR +4 or more climbs a step higher (`jump` +1), so it walks up to, and strikes,
  a foe a level further up. STR 17 heroes have it from level 4; most STR-second heroes by about level 12.
- **The AI** (`battle.ts`; heroes only):
  - **Flanking** (`flankValue`, `flankStep`): a melee hero of DEX +3 or more, walking to a foe, values a tile at its back as 4.5 steps and
    at its side as 2.5 (enough to go round a foe facing it); one already beside a foe's front steps round to its side or back, a step or
    two away, while that foe is busy with someone else (one fighting it turns to face it anyway), at most once in 3 s.
  - **Kiting** (`kiteStep`): a shooter of DEX +3 or more with a brute beside it that is striking it steps one tile back, to a free tile out
    of every such brute's reach from which it can still shoot, at most once in 3 s. The Siege Bot (DEX 15) holds its ground. (A first cut
    that stepped back from any brute beside it turned a few close first waves; see the tests.)
  - **Saves-aware control** (`saveAware`, `saves.ts`): a control skill choosing among targets it values within 15% of its best picks the one
    with the weakest save against it (a boss, whose Legendary Resistance is its save, last): Fox Charm, Petrifying Gaze, Nine-Tailed Dream,
    the Shield Bash, Hold Person, Puppet Strings, Mass Polymorph and the Curse of Weakness.
- **DEX saves on more areas** (`DEX_SAVES`, from batch 5's question 4): a fire wall's burn (the Wall of Fire, the Inferno Breath's line) is
  saved with DEX in place of CON, and a breath (Dragon Breath, Inferno Breath) is halved on a DEX save as a volley is (`blastSave`). The Dread
  Pirate's keg already took a DEX save through `landArea` in batch 5 (that note's list was wrong on it); the powder barrels it sets off are
  the land's, and the land does not save.
- **The page** (`statLines.ts`): `LIVE.crit`, `initiative`, `blowSpeed` (batch 4's, as batch 5's question 5 recommended), `cooldown`,
  `ultFill`, `pools`, `perception` and the new `climb` are on. The Stats panel's figures are eight in three rows (AC, To hit, Skill DC, Crit,
  Initiative, Proficiency, SP or MP, Ultimate); a tile's tap line names its effects in this hero's numbers (the Knight at level 12: "Constitution 20
  (+5): health +25% · SP 66 (+8% refill) · CON save +8 (trained)"; the Wizard: "skills +9% sooner · MP 100"; the Druid: "sees through 30% of
  cover and smoke"); STR's line says "climbs a
  step higher (Athletics)" again, or "climbs a step higher at +4" below it. DEX's blow speed is shown as what it gained since level 1, which
  is what a fight does.
- **The skills overhaul's rule tests read each hero's own income** (`heroIncome` in `skillRules.ts`: the reference income at level 20 times
  the hero's own fill, as the design's section 11 asks).

### Measured against the roster's mean (as batch 2's power is)

The scores show from level 1 (the owner's rule: no level-1 fit on the heroes): a CHA 8 hero waits longer for its ultimate than a CHA 17 one
from its first fight, a CON 12 Kunoichi has a smaller, slower pool than a CON 17 Knight. But the pools, the cooldowns and the ultimate's fill
are each counted against the roster's mean at the same level (the stamina heroes' mean for stamina, the mana heroes' for mana), as batch 2
does for power (`trimOf`): the mean hero's pool, cooldowns and fill are the written ones, and only how the 45 differ moves. Without it every
hero gains on average (the roster's mean CON, casting ability and CHA are all above +0, more so with level), and every mode would get easier
before the joint rebalance. Ranks, grades, talents and gear are not counted against the mean: they are earned. Perception, Athletics and the
herald are small and kept whole, as D&D has them.

### The foes

Their families are evened (the owner's rule until the joint rebalance), so a foe has no pool, cooldown, fill, perception or climb from its
block; nor does a summon. The AI's new picks are the heroes' only.

## The heroes lifted and trimmed (the owner's rule: by their own kit)

- **The rule tests** (a jab asks less than its hero's own income; a kit asks 1.4 to 3.5 times it): three low-CON stamina heroes asked too
  much of their own, smaller income: the Gunslinger's skill 1 cooldown 6000 → 7000 ms (her kit asked 3.72), the Kunoichi's Shuriken Fan and
  the Reaper's Soul Snare 3500 → 3600 ms (2.57 a second against 2.55).
- **Level 30 parity** (only their ultimates' `TUNE` in `ultimates.ts`, from level 30, so level 1 is untouched): lifted the **Kraken** 1.079 →
  1.3 (−6.6: a WIS caster with CHA 12 fills slowly) and the **Time Witch** 0.85 → 0.95 (−5.9); trimmed the **Minotaur** 2.7 → 2.45 (+6.3:
  Athletics from level 4) and the **Samurai Commander**'s fill rate 0.95 → 0.85 (+6.2: CHA 17 fills it sooner, and his banner does not
  scale with power).

### Parity (12,000 random teams; `test/hero-balance*.test.ts`, the band is 6)

| | Batch 5 | This batch, before | This batch, after |
| --- | --- | --- | --- |
| Level 1 (stage 5): spread | +5.5 to −4.5 | +5.2 to −5.8 (Dragoon; Peasant) | the same (nothing moved at level 1) |
| Level 1: the average team wins | 53.3% | 53.1% | 53.1% |
| Level 30 (stage 78): spread | +5.8 to −5.3 | +6.3 to −6.6 (Minotaur, Samurai Commander +6.2; Kraken, Time Witch −5.9) | +4.3 to −4.8 (Paladin; Kraken) |
| Level 30: the average team wins | 58.8% | 60.0% | 60.0% |

## The numbers against batch 5 (0.324.0; the same seeded tools, both trees run side by side)

| What | Batch 5 | This batch |
| --- | --- | --- |
| Armies, single tries, 96 saves (clear, waves of 15): Undead 8 | 4%, 10.1 | 3%, 10.0 |
| Beasts 15 (96 saves; 288 saves) | 58%, 10.7; 55%, 10.7 | 53%, 10.2; 53%, 10.5 |
| Wildwood 22 | 76%, 12.2 | 73%, 11.7 |
| Labyrinth 30 | 18%, 3.6 | 21%, 4.2 |
| Ogres 38 | 5%, 3.6 | 11%, 4.0 |
| Golems 52 | 0%, 4.8 | 1%, 4.6 |
| Orcs Legendary 55 | 84%, 14.8 | 86%, 14.9 |
| A fresh party's first wave lost, 500 saves | 6 | 7 |
| Daily, 120 dates, fresh save (with hearts / none) | 83% / 63% | 83% / 63% |
| Last Stand, 40 runs, median wave at 1 / 10 / 30 (mean) | 4 / 9 / 15 (3.9, 8.6, 15.5) | 4 / 9 / 15 (3.7, 8.8, 16.0) |
| Calamity, 100 runs, mean maps (reached map 2 / cleared) | 1.84 (80 / 4) | 1.84 (79 / 6) |
| Spire, 96 runs, mean floors, castle full / none | 89.3 / 82.7 | 88.6 / 83.0 |

(The armies' and spire's cells are `SAVES=96 node tools/merge-two/run.mjs`, as batches 4 and 5; the daily `npm run daily-rate -- --days 120`;
the Last Stand `npm run stand-balance -- --levels 1,10,30 --attempts 40`; the Calamity `node tools/boss-big/run.mjs calamity --seeds 100`. The
armies' party (Knight, Paladin, Archer, Warlock, Cleric) has none of the four retuned ultimates. The Last Stand's pace bars did not move.)

The two DEX saves measured one at a time (level-30 parity, 12,000 teams; the Fire Wizard has the Wall of Fire, the Queen Dragoon the breaths):
with both on the Wizard sits at −2.4 and the Dragoon at +2.7; with the fire wall's DEX save off (its burn a CON save, as in batch 5) −2.5 and
+2.8; with the breaths' DEX save off −1.9 and +2.5. Each moves its hero by under half a point, within the sweep's noise, and the spread is
the same (+4.2 to +4.4, −4.5 to −4.8).

## Tests

- **`test/stats-rest.test.ts`** (new, 13 tests), one a rule: the pools (a CON 17 Knight's pool deeper and quicker than a CON 12 Kunoichi's,
  the mean hero's the written one at levels 1, 20 and 60; a mana hero's by its casting ability; its points, start and refill); INT's
  cooldowns (sooner for the Wizard, later for the Peasant, within 10% and the class); CHA's fill; the herald; perception (tall grass and the
  smoke); Athletics (a level-4 Werewolf strikes up a ledge a level-1 one cannot); the AI's flank (the Kunoichi strikes a skeleton from its
  side, the Knight from its front), kite (the Archer steps back from a brute striking it, not again within 3 s, the Siege Bot holds) and
  weakest save (the Kitsune charms the dim orc, not the witch); the DEX saves; a fight replays the same.
- **The rule tests read each hero's own income** (`skill-rules`): each hero's income is within a tenth of the reference, and the jabs and
  kits are read against it.
- **Held off where a test stages written numbers**, as batch 5 held the saves: the pools, cooldowns and fill in `hero-kits` and
  `skill-rules`' AI tests; the pools, flank and kite in `abilities` (the old kits in a fixed arena); the herald in `eidolons`' riders test.
- **The page** (`stats-3`, `stats-saves`): every `LIVE` flag on; eight figures; the tap lines name crit, initiative, the climb, the pool, the
  cooldowns, the fill and perception; STR's "climbs a step higher" is back.
- **The first wave** (`armies`): seeds 100 to 123 (both codes win all 24). Over 500 saves a fresh party loses its first wave 7 times here and
  6 on batch 5's code; seed 36, in the old window, is one of the seven, a close fight that the Archer's step back turns.
- **Re-recorded:** every identity scenario (`spells-identity`: army f76ccfc3, armyFoes f36c8b82, bosses dae9a64f, calamity 3aa3b446, daily 4254748f, field1 392597b5, field1Others 5828b6e0, field30 12598187, field30Others c96281c2, heroes10 260564c4, heroes10Others 17eed86d, heroes1 923e83d2, heroes1Others 4718f845, heroes30 24a11513, heroes30Others 46987872, lands ca4f1ce0, spells 0445658a, stand 1e9391a7, tower 07522e4a; `ailments-identical`: army d7da8ae8, armyFoes 29d733d0, bosses 85bc0f6e, calamity 8638915a, daily be916c2e, field1 0fbf64a7, field30 e9196ebf, lands 0a1bce75, spells b4a3a947, stand fb295e70, tower 7874beb1), each fight with a hero moving, and the Last Stand's twelve pinned ordinary fights (`stand-regression`; the third, a close win, is now lost).

## Determinism and saves

No rule draws from `b.rng` or `b.skillRng`: the AI's picks are fixed orders over the fight's state (ties by tile and id), the smoke's roll is
the draw it always was, and the saves' d20s are batch 5's hashes. A fight replays from its seed, placing and orders (a test). Nothing new is
saved: `Unit.kiteAt` and `Unit.flankAt` live only in a fight, and a hero's pool is still a share in `charge`.

## Checks

CHECKS

## Open for the owner

1. **Counted against the roster's mean.** The pools, cooldowns and ultimate fill are counted against the heroes' average at each level, so
   the mean hero is as before and only the differences show (the scores show from level 1). Recommended: keep it until the joint rebalance,
   which can then let the scores lift every hero on purpose with the modes retuned (one knob each, `rosterMean`'s tags).
2. **INT's cooldowns and the rule tests.** The rule tests read each hero's own income, as the design says, not its own cooldowns. Read with
   its INT cooldowns too, the INT casters' kits ask up to 3.7 times their income at level 20 (the Wizard), over the 3.5 bar. Recommended: leave
   the bar on written cooldowns; the joint rebalance can fold INT in.
3. **Flanking and kiting are the heroes' only.** The foes' skirmishers (DEX 16) could flank too. Recommended: leave the foes as they are
   until the joint rebalance (their families are evened).
4. **Perception is kept whole** (not counted against the mean): the heroes, mostly WIS +0 to +3, see through a little of tall grass and of
   the smoke the foes never lay on them. Recommended: keep it (D&D's own rule, and small).
5. **The herald**: CHA's effect on an Eidolon's rider is untrimmed and uses the highest CHA on the field (a CHA 17 hero makes it 15% longer,
   a party of CHA 8 heroes 5% shorter). Recommended: keep it.
6. **The watch item**: the Beasts at 15 (53% against 58% over 96 saves; 53% against 55% over 288, within noise).
