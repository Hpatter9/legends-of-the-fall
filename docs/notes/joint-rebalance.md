# The joint rebalance

The D&D stats design's batch 7 ([rpg-stats-design.md](rpg-stats-design.md), section 14, and its owner's answers) with the skills overhaul's
batch 8 ([skills-overhaul-design.md](skills-overhaul-design.md), section 11, and [skills-1.md](skills-1.md), [skills-4.md](skills-4.md),
[skills-5.md](skills-5.md), [skills-7.md](skills-7.md), [skills-9.md](skills-9.md)): what stats batches 4 to 6 held back is switched on, and
every mode is retuned once, global knobs last. Built on stats batch 6 ([stats-6.md](stats-6.md), released as 0.325.0) with main merged (to
0.327.0, whose only sim change is the opening's scenes). "Before" below is batch 6's code, run side by side with this branch with the same seeded
tools; where a batch-6 figure was not measured here, it is its note's.

## The owner's decisions (1 November 2026, through the director)

1. Switch on what was held back, then retune every mode once, global knobs last.
2. Targets: the owner's pace in every mode (the late armies' figures, the early climb as 0.321.0 set it, the daily, the spire and the Calamity as
   main, the Last Stand's medians), hero parity within 6 at levels 1, 10 and 30 (laggards lifted and leaders trimmed by their own kits, armour
   never reduced, the Lancer's 24 to 22 kept).
3. Fix the watch items (Vuk's kit, Voltara's trial, the lightest new-hero team, the Labyrinth at 30, the Legendary Orcs at 55, the Calamity's map
   2, a fresh party's first wave, the Beasts at 15, the Golem Forge's 18.7, and the Level 5 and skill 3 lifts the skills notes deferred).

## What was switched on (`JOINT` in `src/sim/stats.ts`; each a switch for measuring, `JOINT_OFF=...` in the tools)

- **`tierProf`: the foes' own proficiency** in place of being matched to the heroes' growth (`matchOf` now only grows a hero's summon). A fight's
  foes carry it in their boost (`Boost.prof`, set by `foeProfOf` in `run.ts`): an army's tier's, Normal +2 to Mythic +6 (`TIER_PROFICIENCY`;
  the daily and the quests fight at Normal's); **by depth** where there is no tier (the design's section 9, `depthProficiency`): the spire +1
  every two acts (`SPIRE_PROF_PER`), the Calamity every two maps (`CAL_PROF_PER`), the Last Stand every four waves (`STAND_PROF_PER`), from +2
  to +8 at most. (A point an act left the spire's deep acts at +7 and +8 against heroes who stop at level 30's +5.) Anything else (a trial,
  a field fight) is Normal's +2. So the d20 now leans with level: a level-30 hero (+5) against a Normal foe (+2) hits more and is hit less than a
  level-1 one, and the late armies, fought on Normal at levels 55 and 65, needed much more health and attack to stay as hard.
- **`bossBlock`, `bossSaves`: the bosses' blocks.** A boss fights with +2 proficiency, +2 to its two best scores and +2 AC, and makes saving
  throws with every save trained; its Legendary Resistance (the old ladder, `hardGate`) still follows a failed or a made save, and it still
  shrugs off fear. Its shoves keep their old halving.
- **`families`: the families show** (no `blowFit`): a skeleton's AC 15 turns blows that an orc's AC 12 does not.
- **`saves`: the saves are felt** (no `saveFit`): a lay is its written length, halved on a save.
- **`pools`, `cooldown`, `ultFill`: the scores counted from +0**, not against the roster's mean: a CON 17 Knight's pool is 69 SP and fills 12%
  faster, an INT 20 Wizard's skills come round 10% sooner, a CHA 8 hero's ultimate fills 3% slower. Every hero gains on average, as the design
  meant, and the modes answer it.

Each switch alone, the hero sweep at level 10, stage 24, 6,000 teams (the average team's wins): all off (batch 6) 39.7%; all on 68.0%; on but
the tier proficiency 49.2%; but the pools, cooldowns and fill 63.6%; but the families 61.4%; but the saves 72.2% (a felt save costs the heroes
more than the foes).

Three page readouts were wrong once a pool could be bigger than written, and now read the hero's own top (`topOf`): the fight's bars
(`barNumbers`), the unit card's Pool row and the Last Stand's pause sheet ("31/125 MP" for a level-12 Wizard, where it said "/100").

## The heroes (the owner's rule: by their own kits; no armour moved)

Measured with `node tools/kits/tune.mjs <knobs> <level> <stage> 12000` (12,000 random teams). **The yardsticks moved with the heroes:** with the
field's foes at +2 instead of matched, a level-10 team won 68% at stage 24 and a level-30 one 84% at stage 78, where the tables are meant to sit
near half (the level-30 test asks 35 to 65%). Level 10 is read at stage 27 (41%, batch 6's 40% at 24) and level 30 at stage 90 (60%, batch 6's
at 78); `test/hero-balance-ultimates.test.ts` moved to stage 90 with it, as it moved from 39 to 78 in ULT-CHARGE. The band is the same 6.

- **Level 10** was already outside the band on batch 6 (spread 16.4: the Yamabushi, Gorgon, Ranger and Reaper) and nobody's test held it.
  Skill 2 was spent for some (the Ranger's, Shambler's and Reaper's `TUNE2` at the tuner's floor, the Siege Bot's near its cap) and their edge
  came from their scores at level 8, so the levers were their kits' other numbers: the **Ranger**'s Long Shot 35% to 15% and Spike Growth 6 s
  to 4 s; the **Reaper**'s Wraith Form dodge 20% to 12%; the **Siege Bot**'s Reinforced Chassis a fifth to 35%, skill 1 0.163 to 0.27; the
  **Gorgon**'s Flesh to Stone 2 s to 3 s, 46 MP 12 s to 42 MP 9 s (the heavy class's cheapest and quickest), `TUNE2` 1.638 to 2.4 and
  `TUNE1` 0.343 to 0.55; the **Shambler**'s `TUNE1` 2.713 to 2.17 and Devour 18 s to 20 s; `TUNE2` the Ninja Monk 1.72 to 1.332, the Cleric
  0.592 to 0.84, the Mercenary 0.887 to 0.688, the Kraken 0.343 to 0.7.
- **Level 1**: the Paladin's `TUNE1` 0.578 to 0.5, the Samurai Commander's 0.046 to 0.042 and his Plant the Standard 18 s to 20 s, the
  Beastmaster's `TUNE1` 0.154 to 0.19.
- **Level 30** (`TUNE` in `ultimates.ts`): the Kitsune 2.953 to 2.169, the Shambler 0.709 to 0.933, the Arc Blade 1.878 to 2.403, the Dread
  Pirate 1.376 to 1.86.
- **Vuk (the Werewolf)**: his own kit rises and his ultimate takes it back: `TUNE1` 0.787 to 0.85, the Hunter's quickness 1.25 to 1.35, its
  bleed 0.12 to 0.18, the Brute's splash 0.4 to 0.5 (`KIT`, `kits/effects.ts`), Full Moon 2.208 to 1.1. (`TUNE2` does not reach
  Shapechange, measured, and was left.)
- **The Knight**: Shield Wall 20 to 22 SP and Shield Rush 28 to 30, so his kit asks at least 1.4 times his own, bigger CON 17 income (rule 3).

| | Batch 6 | Switched on, before the kits | After |
| --- | --- | --- | --- |
| Level 1 (stage 5): average, spread | 53.1%, +5.2 to −5.8 | 58.5%, 10.5 (+5.6 Paladin to −4.9 Beastmaster) | 56.7%, 11.3 (+5.7 Samurai Commander to −5.6 Beastmaster) |
| Level 10 (stage 24; 27 for this branch) | 39.7%, 16.4, four beyond 6 | 41.7%, 18.0, six beyond 6 (Reaper +10.0, Ranger +9.5; Siege Bot −7.9, Gorgon −7.5) | 40.5%, 11.4 (+5.6 Werewolf to −5.8 Gorgon) |
| Level 30 (stage 78; 90 for this branch) | 60.0%, +4.3 to −4.8 | 60.3%, 12.2, three beyond 6 (Kitsune +6.2, Werewolf +6.1; Dread Pirate −6.0) | 62.5%, 9.1 (+4.8 Shambler to −4.3 Kraken) |

**Vuk's Old Hunger** (`STAGE=90 node tools/lost/measure.mjs 1200 oldHunger werewolf`, his team's wins over his own two skills, slot 1 / slot
2): +7.3 / +10.0 in its note (stage 78); +5.0 / +6.8 on this branch before his kit moved; **+3.7 / +6.2** after, his own loadout 65.3% to
68.5%. Not +2: the Hunger's leap, pin and healing simply suit him, and swapping out Shapechange (slot 2) still gains most.

## The modes against batch 6 (the same seeded tools, both trees)

| What (tool) | Batch 6 | Switched on, untuned | After | Target |
| --- | --- | --- | --- | --- |
| The realistic climb, mean tries: Orcs / Undead / Beasts / Wildwood (`npm run balance -- --no-tables --climb --saves 120`) | 2.0 / 2.6 / 3.8 / 2.3 | 1.8 / 1.8 / 4.3 / 2.1 | 2.0 / 2.6 / 4.1 / 2.2 | 2.0 / 2.9 / 4.3 / 2.0 |
| Infernal at 55, hearts (`spells-retune cell infernal:55:0:tph`) | 2.6 | 1.4 | 4.6 (48 saves) | 4.3 to 5 |
| Yokai at 65, hearts | 6.8 | 1.8 | about 11 (9.3 and 12.6 either side, 48 saves) | 11 to 12 |
| Golems at 65, hearts | 3.8 | 1.4 | 7.2 (48 saves) | 6.6 to 8 |
| Mythic at 100, every talent, full castle (12 saves): Golems / Yokai / Infernal | 5.1 / 4.4 / 3.1 | | 3.2 / 4.5 / 2.4 | 3 to 4 (difficulty.md) |
| Single tries, 96 saves (`merge-two`): Undead 8 | 3% | | 1% | |
| Beasts 15 | 53% | | 60% | main 50 to 58% |
| Wildwood 22 | 73% | | 86% | |
| Labyrinth 30 | 21% | 51% | 26% | main 0.321's 28% |
| Ogres 38 | 11% | 19% | 6% (15% at 12.2, 13% at 12.4) | main's 8% |
| Golems 52 | 1% | | 0% | |
| Legendary Orcs 55 | 86% | 94% | 86% | 84 to 88% |
| A fresh party's first wave lost (`node tools/joint/run.mjs first`) | 7 of 500 | 5 of 500 | 3 of 800 | about 1 in 400 |
| Daily, 120 dates, fresh save, hearts / none (`npm run daily-rate -- --days 120`) | 83% / 63% | 90% / 78% | 79% / 63% | main's |
| Last Stand, 40 runs, median wave at 1 / 10 / 30 / 100 (`npm run stand-balance -- --levels 1,10,30,100 --attempts 40`) | 4 / 9 / 15 (100: 25 on 0.321) | 4 / 9 / 17 / 25 | 4 / 9 / 15 / 26 | 4 / 9 / 15 / about 25 |
| Calamity, 100 runs: mean maps (past map 2 / cleared) (`node tools/boss-big/run.mjs calamity --seeds 100`) | 1.84 (79 / 6) | 1.94 (86 / 10) | 1.80 (74 / 7) | main 0.321's 1.78 (74 / 4) |
| Spire, 96 climbs, mean floors, no castle / full (`merge-two spire:none spire:max`) | 83.0 / 88.6 | 86.2 / 89.7 | 85.5 / 89.2 | main's 82.7 / 89.3 |
| Voltara's level-40 trial (`node tools/joint/run.mjs voltara 20`), seeds 2003 to 2012 (of 2003 to 2022) | 2 of 10 (8 of 20) | 1 (8) | 5 of 10 (13 of 20) | 6 of 10 before the scores |

(The Calamity's figures are as its earlier notes read the tool: the mean counts a cleared run as three maps, and "past map 2" is the runs that
beat the second map's boss. The spire's climbs mostly reach the tool's 90-floor cap, so its mean moves little with any knob: the act step,
0.04 to 0.05 and 0.08, moved it under a floor.)

**The knobs** (the design's order: the heroes' kits first, above; each mode's own knobs next; the global ones last):

- **The armies' Normal `start`** (each keeps its `xpStart`, so a run pays the XP it did): the Orcs 0.58 to 0.62, the Undead 1.74 to 2.02, the
  Beasts 2.27 to 2.39, the Wildwood 2.7 to 2.8 (the climb, `--set` runs of 120 saves: 2.0 / 2.8 / 2.6 / 2.0 at Undead 2.0, 2.0 / 2.8 / 7.6 /
  1.5 at Beasts 2.6, 2.0 / 2.8 / 5.1 / 2.2 at Beasts 2.45, 2.0 / 2.8 / 4.5 / 2.1 at these); the Labyrinth 7 to 7.9 (26% at 8, 16% at 8.8);
  the Ogres 11.4 to 12.5 (15% at 12.2, 13% at 12.4, 6% at 12.5 and at 13.5: steep and noisy over 96 saves); the Infernal Host 15.65 to 20.6 (bisected, `spells-retune tune`); the Yokai 18 to 23.3; the
  Golem Forge 18.7 to 27.6 (the skills overhaul's 18.7 stopgap is gone: `army-pace`'s strong party at level 80 still clears it).
- **The harder tiers kept over the tougher Normals.** Each tier's last wave must stay over the one below in health and attack
  (`armyStars.test.ts`); with the late Normals so much tougher, the late armies' lifts rose just enough to keep half a per cent over in each
  (`tierLift`, the attack's being the tighter): the Labyrinth's Hard 1.86 to 2.048; the Infernal Host's Hard, Elite and Legendary to 4.448,
  3.325, 0.933; the Yokai's to 5.404, 4.039, 1.133, Mythic 0.79 to 0.901; the Golem Forge's to 5.926, 4.429, 1.242, Mythic 0.79 to 0.988.
  (At SPELLS-RETUNE's 3% the Mythics came out 7.9 and 12.1 tries at level 100; at half a per cent, 3.2 and 4.5.)
- **The Legendary Orcs**: the Orcs' `tierStart` 0.5 to 0.59 (x1.18 on all its harder tiers; the first four armies have no tier lift by rule).
  Measured as the Legendary tier's `answer` x1.1 (91%), x1.18 (86%) and x1.2 (80%) on the army alone.
- **A fresh party's first wave** (`FIRST_WAVE_EASE` 0.87, `armies.ts`, new): a campaign army's first Normal wave is eased by this. The same
  seeds lose it on both codes (8, 310, 313, 428, 472: close fights the D&D stats made a little closer); 0.92 lost 5 of 500, 0.88 2, 0.85 none.
  Every other wave, the bosses, the harder tiers and the daily's army are as they were, and the quest battles take the curve's strength.
- **The orc band** (`FOE_BANDS.orcs`, one of the nine field bands of the hero sweep, the spire's fights and the Last Stand's waves): a grunt
  became a brute, so the starting five win it 75% of the time again (86% once the brutes' AC 12 showed; 73% on batch 6; `foes.test.ts` asks
  20 to 80%).
- **The daily**: `DAILY_START` 0.74 to 0.785 (0.84 read 68% / 51%).
- **The Last Stand** (its own knobs, the pace bars untouched): the late climb 0.35 to 0.39 a wave (`WAVE_GROWTH_LATE`; it must stay under the
  early climb's 0.4, the stand's own test), the deep climb 0.24 to 0.22 (`WAVE_GROWTH_DEEP`), the foes' proficiency +1 every four waves (every
  five read 4 / 9 / 16 / 25; four with a gentler deep climb 4 / 9 / 15 / 27).
- **The Calamity**: `CAL_SCALE.start` 0.6 to 0.66 and `bossStep` 0.06 to 0.12 (each map's boss tougher than the last); the depth's step a map
  (in place of two) moved it no more than the noise.
- **The spire**: `SPIRE_ACT_STEP` 0.04 to 0.05.
- **Voltara's trial**: her own `lift` 1 to 0.88 (0.85 won 15 of 20, 0.9 10 of 20).
- **The global knobs** (`BLOW_SCALE`, the foes' AC by family, the curve trim) did not need to move: every mode came back on its own knobs.

On the final code (with the first wave's ease, added after the starts were found) the climb reads 2.0 / 2.6 / 4.1 / 2.2: the Undead at batch
6's 2.6 rather than 0.321's 2.9 (the ease took about 0.2 off it; 2.8 without it), the rest within the climb's noise of the target.

## The watch items

- **Vuk**: above. **Voltara**: above. **The Golem Forge's 18.7**: gone, above.
- **The lightest new-hero team** (`node tools/joint/run.mjs teams 180`, the starting five's wins against each team's, level 1, 180 seeds):
  the Mummy, Karasu Tengu, Wizard, Kraken and Satyr won 0.45 of the five's in batch 4 and **0.56** now. But the first team (the Peasant,
  Kitsune, Wolf Bard, Kraken and Gorgon) fell from 0.49 (batch 6's rules) to **0.28**: four control casters against armoured skeletons whose
  saves and AC 15 now show. `new-heroes`' own seeds (21 to 50) pass its 0.35 bar; a question below.
- **The Labyrinth at 30, the Ogres at 38, the Legendary Orcs at 55, the Beasts at 15, the Calamity's map 2, the first wave**: the table.
- **The skill 3 lift** (skills-4: a level-20 team about 6 points stronger): answered by the modes' own knobs above, which were tuned with every
  skill 3 in play; `SKILL3_PACE` stays 1.1.
- **The Level 5 lift** (skills-5): with every skill at Level 5, a level-30 team wins **75.7%** at stage 90 against 62.5% at Level 1 (+13; the
  skills note had +15 at stage 78), and the spread widens to 17.0, five heroes beyond 6: the Beastmaster +7.6, the Barbarian +6.8, the
  Shambler +6.6; the Arc Blade −9.4, the Karasu Tengu −7.4 (`PARTS=1 node tools/kits/tune.mjs <empty> 30 90 6000 --skill-level 5`). The modes
  are tuned for a fresh save's Level 1 skills (the yardsticks have no skill use, and the spire and the Calamity ignore it by the owner's
  answer), so a long-played save is that much stronger in the armies, the daily and the Last Stand. Left as built; a question below.

## Tests

- **`test/joint-rebalance.test.ts`** (new, 3 tests): every switch is on; the foes' proficiency by tier for each army tier (in the fight's boost
  and a foe's to hit), the depths' steps, the spire's and the Calamity's by act and map; the first wave eased on Normal only, every later wave
  and the harder tiers by their curve.
- **Moved to the design's rule, where the bar was a stand-in for the held-back rules:**
  - `stats-blow`: the blow numbers (no fit; a boss's block +2 AC and +2 to hit), the families show (the skeleton is struck less than the
    brute), and "the foes answer the heroes' growth" became "the foes fight at their tier's proficiency" (the summons still grow), each with
    the switch off showing batch 6's rule;
  - `stats-saves`: "the fit" became "no fit" (a lay is whole or halved), "the foes stay matched" became their tier's proficiency (a Mythic
    skeleton's DC and trained saves +4), "bosses as before" became "a boss saves, every save trained, and its ladder follows";
  - `stats-rest`: the pools, cooldowns and fill counted from +0 (the mean hero's pool is no longer the written one; the Wizard's cooldowns 10%
    under, the Peasant's 2% over), and the Wall of Fire's DEX save read by its save, not its fit;
  - `skill-rules`: a hero's own income is the reference times its own fill (it sat within a tenth of the reference only while counted against
    the mean).
- **The yardsticks moved with the stronger roster** (the bars did not): `hero-balance-ultimates` stage 78 to 90 (its own 35 to 65% check
  asks it); `stats-blow`'s fight lengths are held at the stages where the heroes win what they won before, level 10 at 27 (24) and level 30 at
  45 (39): 20,660, 22,759 and 12,253 ms against main's 20,469, 23,174 and 12,386 (+0.9%, −1.8%, −1.1%; at the old stages level 10 and 30 were
  about a tenth shorter); `ult-charge`'s fights stage 56 to 65 (no fight lasted 35 s any more).
- **The retune's own records**: `army-pace`'s pinned starts of the first four armies; `class-heroes`' Long Shot (1.15); `fight-hud`'s and
  `unit-info`'s pool readouts (the hero's own top); `quest-battles` reads its army's wave without the first wave's ease.
- **Re-recorded:** every identity scenario (`spells-identity`: field1 81b0369e, field30 3f9b2a5e, bosses 11c33a36, armyFoes e3c7011a, spells
  69b1d534, lands 99da4981, army d78fb13d, daily d00ddcc9, tower d1468e2a, stand 69c8c642, calamity 18f58bc9, heroes1 58aac7f4, heroes10
  9c513279, heroes30 526f4f47, field1Others f1bc7c9d, field30Others dd370f3f, heroes1Others d75813fa, heroes10Others c7f3b928, heroes30Others
  1e0ab73b; `ailments-identical`: field1 4c43d569, field30 79b0a95f, bosses c0166803, armyFoes 3be4bc73, spells c281071e, lands 776aabc7, army
  74abcbbd, daily fc542939, tower 7f01a490, stand 49a206c8, calamity 6d82a760), by the tests' own computation (`node tools/joint/run.mjs record
  --write`), and the Last Stand's twelve pinned fights (`stand-regression`: nine moved; the seventh, a close loss, is now won).
- No pace bar moved: the Last Stand's, the armies', the daily's and the trials' tests pass on their own seeds.

## Tools

`tools/joint/` (new): `off.ts` (the `JOINT_OFF` switch, read by the hero tuner, the balance tool, the daily rate, the Last Stand, the
merge-two and spells-retune cells and the Calamity's run); `run.mjs` runs `voltara`, `first`, `teams`, `bands` and `record`. `tools/kits/tune.mjs`
takes cooldown knobs (`d1`, `d2`, `d3`); `tools/lost/measure.mjs` a `STAGE`; the climb `CLIMB_ARMIES=4` to stop after the Wildwood (the rest
are never cleared there, and took most of the hour).

## Determinism and saves

Nothing new draws from a fight's streams: the proficiency is a number on the foes' boost, the first wave's ease a multiplier. Nothing new is
saved, and no save changes shape: `Boost.prof` lives only in a fight.

## Checks

`npm run typecheck` clean. The full `npm test` on the final code, after merging main: **2,254 of 2,254 pass, 0 fail**. `npm run web` built
(0.327.0). The page: the fight HUD's pool numbers now read each hero's own top; `CHROME=/opt/pw-browsers/chromium node tools/battle-hud/shots.mjs
joint-rebalance fight kits` at 393x852, 360x780 and 412x915 (`docs/samples/joint-rebalance-*.png`): "51/72 SP" and "130/130 MP" sit inside
their bars at every width, no page errors (the tool now takes a `CHROME` path). Measured: every table above, batch 6's code run side by side
in a second tree for its column.

## Questions for the owner

1. **The first team of new heroes** (the Peasant, Kitsune, Wolf Bard, Kraken and Gorgon) wins 0.28 of the starting five's fights against
   skeletons over 180 seeds (0.49 before; `new-heroes` asks 0.35 on its 30 seeds and passes). Recommended: leave it: the armoured skeletons'
   saves and AC are the families showing, as you decided, and the same five fare as before against the other bands; if you want it lifted, the
   Gorgon and the Kitsune (both under the average at level 1) are the ones to lift by kit.
2. **Level 5 skills** make a level-30 team about 13 points stronger and spread the roster to 17 (five beyond 6). Recommended: keep the size
   (the design's x1.3), and in a later batch measure the late armies with the skill levels a player of that level has (`--mastery auto`, the
   design's plan) and give the five their own Level 5 tune; the Level 5 table is written by rule from the probe (`lv5.ts`), so a per-hero fix
   is a new knob, not an edit.
3. **The first wave's ease** (0.87 on a campaign army's first Normal wave) is a new rule. Recommended: keep it; the other way is the Orcs' own
   curve (a lower `start` with a steeper `growth`), which moves their whole climb and `army-pace`'s pinned curve.
4. **The depths' proficiency**: the spire and the Calamity +1 every two acts or maps, the Last Stand every four waves (the design said "by
   their depth, +2 to +8" without a step). Recommended: keep (each tracks how far the heroes' own proficiency has grown there).
5. **Vuk's Old Hunger** is +3.7 / +6.2 for him, not +2. Recommended: accept it as the book finding its owner (the lost-techniques note's own
   reading); getting it to +2 would mean a weaker Hunger for every reader.
6. **The harder tiers' order rule** (each tier's last wave over the one below in raw health and attack) no longer says what it meant once the
   tiers have their own proficiency (a Normal foe at +2 needs more health to be as hard as a Mythic one at +6). It held this batch with half a
   per cent; recommended: keep it as a floor, but measure the tiers by tries (the difficulty note's tables), not by it.

## The owner's answers (at release)

1. Level 5 skills: keep their size; a later batch measures the late armies at realistic skill levels and tunes the five who leave the band.
2. The lightest new-hero team against skeletons: leave it (the families showing, as decided).
3. **The first wave's ease: removed.** `FIRST_WAVE_EASE` is gone; a fresh party's first wave is as the curve has it (about 1 loss in 70 on this
   code). `test/joint-rebalance.test.ts` now checks that no wave is eased; the quest battles take the curve's strength as before. The
   first-wave test's seeds (100 to 123) still win all 24.
4. Vuk's Old Hunger at +3.7 / +6.2: accepted.
