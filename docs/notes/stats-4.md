# STATS batch 4: AC and the blow

The fourth batch of the owner-approved D&D stats design ([rpg-stats-design.md](rpg-stats-design.md), section 14 batch 4, sections 3.2 and
3.4, and the owner's answers of 31 October 2026: ordinary blows roll a d20 against AC, with glancing blows; foes use family blocks). Built on
main 0.321.0, with stats batch 2 (scores drive damage and health, [stats-2.md](stats-2.md)) merged in; every number below is measured
against that main.

## The owner's answers (1 November 2026, through the director)

1. **No level-1 fits: armour and aim show.** The heavily armoured and the sure-handed feel their AC and to hit from level 1. The heroes who
   fall behind are lifted by their own kit tunes; a tank is trimmed only if it is still far outside the band after the others are lifted,
   and its armour is never taken away. (An earlier version of this batch fitted every hero's level-1 blow and guard to the roster's average;
   it is gone.)
2. **The foes stay matched to the heroes** for now; proficiency by tier waits for the joint rebalance.
3. **The dodges at 7% a point of AC.**
4. **The failing tests** (the director's call, the owner asleep): new-hero teams against the starting five is the owner's "armour shows", a
   requirement change, so its bar follows the measured rate; the Last Stand's pace is the owner's own target, so its bar stays and the stand
   is brought back with its own knobs; the others, if noise on a larger sample, are pinned to seeds that sit at the measured rate, as batch 2
   did.

## What it does

- **The d20 against Armour Class** (`src/sim/blow.ts`, hooked into `swing` and `settle` in `battle.ts`). Every ordinary blow rolls d20 + its
  striker's to hit against the target's AC: a natural 20 crits (x1.5, or the kit's own crit size); meeting the AC hits; missing by 1 to 5
  **glances** for half damage; missing by 6 or more, or a natural 1, **misses**. The roll is made as the blow is swung and carried on the
  pending blow (`Pending.res`), so a shot in flight lands as it was rolled. Armour (`def`) still soaks what lands. Skills, damage over time,
  terrain and the Eidolons' strike never roll.
- **Crits.** Besides the natural 20, any blow that lands crits at the striker's DEX crit (1% a point of DEX from +1) plus its kit's, traits'
  and gear's chance (`critOf`); a keen glance strikes home as a full crit.
- **Initiative.** As the fight starts every fighter rolls d20 + DEX and waits 30 ms a point behind the best roll, at most 0.6 s, on top of any
  wait it has (the Siege Drum's).
- **Blow speed by DEX.** A hero's blows are 2% quicker a point of DEX it has gained since level 1, so every level-1 blow time is today's.
- **The dodges are AC.** A kit's, a trait's, gear's and the relics' dodge shares are no longer a roll of their own: each 7% is +1 AC
  (`DODGE_PER_AC`), and a part of a point is a whole one that part of the time. **Tall grass is cover, +2 AC** (`TALL_AC`, in place of its
  12% dodge; the codex says so). **Height is cover**, +1 AC a level above the striker, to three (in place of `guardMult`, gone).
- **A miss** shows as the "Miss" pop; it builds the target's pool as the old dodge did and the striker's as a blow does (`onDodged`; without
  it every skill came round a fifth slower). A yokai's spirit wisp comes only on a miss its dodge or cover turned (`Pending.turned`).
- **"Glance" on the fight's numbers** (`src/render/fx.ts`): the number smaller (8 against 9) and grey, the word above it in the labels' style.
- **The blow's scores** read a hero's level, rank, grade and its talents' and gear's score points, as batch 2 does (`Unit.rank`,
  `statInputOf`).
- **The foes**: each foe's to hit, AC, DEX crit and initiative from its family block (`foeStatsOf`). A boss's +2 to hit and +2 AC are off in
  this batch (`BOSS_BLOCK`): with them the armies came out about a wave harder. The foes are **matched to the heroes** (the owner's answer 2):
  a foe's AC rises by as much as the placed heroes' to hit has grown since level 1 and its to hit by as much as their AC has (`matchOf`, kept
  exact), so at level 1 the blocks are as written.
- **The foes' families are evened (`blowFit`; open, for the owner to confirm).** A family's block moves how often it hits and is hit, not how
  much an army deals or takes on average: a foe's blow is fitted for its block's to hit against an ordinary hero (AC 13, `HERO_AC`), a blow on
  a foe for its block's AC against an ordinary hero's aim (+5, `HERO_AIM`, as if the foe were AC 14, `FOE_AC`). The heroes are not fitted.
  Without this, whole armies moved by their family: the Beasts' skirmishers (AC 14, +5) came out harder than main and the skeletons (+4)
  easier, and no single knob could put both back.
- **`BLOW_SCALE` 1.28** puts the average blow back where it was.

## The heroes lifted and trimmed (the owner's answer 1)

Only the heroes' own kits moved, except the Lancer's attack. No armour changed.

- **Lifted** (they fell behind once armour and aim showed): skill 1 (`TUNE1`) the Sage 0.538 → 0.807, Warlock 0.368 → 0.552, Lightning Mage
  0.406 → 0.731, Mummy 0.59 → 1.003, Druid 0.629 → 0.944, Shambler 2.087 → 2.713, Beastmaster 0.077 → 0.154, Wizard 0.211 → 0.317 (also so
  that a fresh save's first fight, the starter Wizard alone, is won every time), Wanderer 1.059 → 1.25; skill 2 (`TUNE2`, level 10 up) the
  Beastmaster, Time Witch, Lightning Mage and Warlock; skill 3 (`TUNE3`, level 20 up) the Beastmaster, Druid, Time Witch, Kraken, Gunslinger,
  Wizard, Warlock and Lightning Mage; the Beastmaster's Pack Tactics, each wolf's leap strike 1.2 → 3 (`SIC_STRIKE`); the Illusionist's
  Sleight of Hand 25% → 35% and the Time Witch's Stutter 20% → 30% (both AC now).
- **Trimmed, by kit** (still outside the band once the others were lifted): skill 1 Arc Blade 0.153 → 0.107, Samurai 0.671 → 0.57, Samurai
  Commander 0.061 → 0.046, Queen Dragoon 0.553 → 0.487; Arc Blade's Static Discharge 25% → 10%; the hero Minotaur's Trample a quarter → 15%
  and his skills 2 and 3 (the maze minotaurs, foes, keep their quarter); the Lancer's Couched Lance 1.4 → 1.1.
- **The Lancer's attack 24 → 22.** His edge is plate and a STR 17 aim, which his kit's knobs did not reach (Lance Charge and Couched Lance
  moved him by a tenth of a point); a body trim was the one left that keeps his armour.

### Parity before and after (12,000 random teams; `test/hero-balance*.test.ts`, the band is 6)

| | Main 0.321.0 | This batch, before the lifts and trims | This batch, after |
| --- | --- | --- | --- |
| Level 1 (stage 5): spread | +3.7 to −4.0 | +7.4 to −5.7 (Arc Blade 7.4, Lancer 7.0, Queen Dragoon 6.8, Samurai 6.6, Samurai Commander 6.2) | +5.6 to −4.5 |
| Level 1: the average team wins | 54.4% | | 54.6% |
| Level 30 (stage 78): spread | +4.5 to −5.2 | +7.7 to −7.0 (Minotaur 7.7, Beastmaster −7.0) | +5.3 to −4.8 |
| Level 30: the average team wins | 61.3% | | 60.1% |

## The numbers against main 0.321.0 (the same seeded tools)

| What | Main | This batch |
| --- | --- | --- |
| Fight length, 135 fights a level, level 1 / 10 / 30 (the test's own) | 20.5 / 23.2 / 12.4 s | 21.0 / 23.6 / 12.6 s (+2.8%, +1.7%, +2.1%) |
| Armies, single tries, 96 saves (clear, waves of 15): Undead 8 | 3%, 10.2 | 5%, 10.3 |
| Beasts 15 | 50%, 10.5 | 56%, 10.5 |
| Wildwood 22 | 78%, 12.7 | 80%, 12.7 |
| Labyrinth 30 | 28%, 5.5 | 19%, 4.0 |
| Ogres 38 | 8%, 4.6 | 9%, 3.8 |
| Golems 52 | 1%, 4.8 | 0%, 4.9 |
| Orcs Legendary 55 | 91%, 14.9 | 84%, 14.8 |
| The starting five: Orcs at 1 / Beasts at 23 / Undead at 22 / Orcs at 14 | 11/48, 15/48, 17/32, 16/16 | 11/48, 17/48, 17/32, 16/16 |
| Daily, 120 dates, fresh save (with hearts / none) | 81% / 60% | 83% / 64% |
| Last Stand, 40 runs, median wave at 1 / 10 / 30 / 100 (mean) | 4 / 8 / 15 / 25 (3.6, 8.4, 15.9, 27.2) | 4 / 9 / 15 / 26 (3.7, 8.7, 15.9, 27.1) |
| Calamity, 100 runs, mean maps (map 2 / map 3) | 1.78 (74% / 4%) | 1.90 (81% / 9%) |
| Spire, 96 runs, mean floors, castle full / none | 89.3 / 79.8 | 87.6 / 82.0 |

Watch items for the joint rebalance: the Labyrinth at 30 (19% against 28%) and the Calamity's map 2 (81% against 74%).

## The Last Stand

- **Its pace** (the owner's target): the late climb from wave 11 is 0.35 a wave (`WAVE_GROWTH_LATE`, 0.32), the knob 0.312 used, so the medians
  are main's at every level. The pace test's bar did not move; its five runs are seeds 29 to 33 (seeds 1 to 5 read 19 at level 30 while 40
  seeds read 15, as on main; seeds 29 to 33 sit at the 40 seeds' medians, 4, 8 and 15).
- **The leash.** A posted hero's blinks land inside its leash, as its charges already did (`toolkit/blink.ts`, `safeTile`: the Kunoichi's
  Smoke Bomb took her 6 tiles out, leash 4), and a hero still inside its leash walks home inside it (`standAi.ts`: a way round others had taken
  the Samurai 6 out). Only the Last Stand reads a post.

## Determinism and saves

Every roll is a hash of the fight's seed and the moment (`STATS_SALT`, salts 1 for the crit and 2 for a part of a point; `INIT_SALT`), never a
draw from `b.rng` or `b.skillRng`; the old dodge's and crit's draws from the skill stream are gone. A fight replays from its seed, placing and
orders (a test). Nothing new is saved: `Pending.res`, `Pending.turned`, `Battle.blowMatch` and `Unit.rank` live only in a fight.

## Tests

- **`test/stats-blow.test.ts`** (new, 13 tests): the design's odds table over 10,000 hashed rolls; a fighter's blow numbers (a hero's from
  its scores, a foe's from its block, a boss's block without its bonus, DEX's quicker blows and crit); the heroes' armour and aim show (the
  plated Knight takes less than the robed Wizard, the STR 10 Beastmaster deals less than the Gunslinger) and the foes' families are evened;
  cover; the crits; a part of a point of AC; a miss turned by cover; a glance is half a hit; the fight's events; initiative; the foes'
  match; **a fight replays the same**; **fights last within 10% of main's**.
- **Changed to the new rules**: the Kunoichi's Evasion and a summon's team dodge are AC (`abilities`, `class-heroes`); tall grass is +2 AC
  (`terrain`), and a barrel test runs long enough for a blow to land; the Siege Drum's wait comes on top of initiative (`relics`); the dodge
  case of SIM-001 is a missed blow; the ruler's tests run long enough for a blow to land past its d20 (`stand-ruler`); the height test drops
  `guardMult`; Trample is 15% for the hero Minotaur and a quarter for the maze minotaurs (`monster-heroes`).
- **New-hero teams against the starting five** (`new-heroes`, the owner's "armour shows", a requirement change): the starting five are well
  armoured, so against the armoured skeletons they now win more than the lighter teams. Over 180 seeds the six teams win 47, 94, 47, 51, 76 and
  50 against the five's 104 (on main 53, 63, 80, 59, 58 and 42 against 88): on average 0.58 of the five's wins, the lightest 0.45 (main 0.67 and
  0.48). The bars follow with main's margins, 0.5 and 0.35 (0.6 and 0.4), on seeds 21 to 50, which sit at the 180 seeds' rate on both codes
  (seeds 1 to 30 read 0.43 here). **Watch item:** the lightest team, the Mummy, Karasu Tengu, Wizard, Kraken and Satyr, fell from 80 to 47 of 180.
- **Pinned to seeds at the measured rate** (noise on a fixed sample, confirmed on a larger one; bars unchanged):
  - the Orc Warlord wall at level 1 (`armies`): 19 of 96 clears on both codes (20%); the first eight tries cleared 3 here; tries 16 to 23 clear
    2 on both;
  - every hero casting both skills (`hero-kits-all`): over eighteen seasons 35.1 here and 35.3 on main, the same heroes missing; the first six
    read 34.7 (main 35.5); the six now used, offsets 100, 300, 600, 900, 1200 and 1700, average 35.2;
  - the Last Stand's pace (`stand`), above.
- **Re-pinned after main's merge** (single seeded fights the d20 moves, as batch 2 did): Voltara's trial is on seed 2003 again (she takes her
  second form in nine of the ten seeds 2003 to 2012, as on main); a lost technique's test is on seed 12 (the Wizard's Words of Unmaking is cast
  in 11 of 12 seeds, seed 11 the miss).
- **Re-recorded:** every identity scenario (`spells-identity`, `ailments-identical`) and the Last Stand's pinned ordinary fights
  (`stand-regression`). With the bosses' signatures on, `calamity` reaches a boss, so it joins that test's scenarios with a boss.

## Not in this batch

- **The cards.** The unit card still shows "Dodge 20%" (`statRows`) and the kit passives say "Slips 20% of blows": they are AC now. Left to the
  page batch (3).
- Tier proficiency for the foes, the bosses' blocks, and every mode's retune: the joint rebalance (batch 7).

## Checks

`npm run typecheck` clean. The full `npm test` on the final code: **2,225 of 2,225 pass, 0 fail**. `npm run web` built. The renderer change is
a label and a number's size and colour in a fight; no phone screenshots (a glance can't be set up on demand in the page).

## Open for the owner

1. **The foes' families evened** (`blowFit`): a family's block moves how often it hits and is hit, not how much an army deals. Recommended:
   keep it until the joint rebalance, which can let the families show (Beasts harder, skeletons easier) on purpose with the modes retuned.
2. **The bosses' blocks off** (`BOSS_BLOCK`): recommended for the joint rebalance with the modes.
3. **The Lancer's attack 24 → 22**, the one body trim: recommended to keep (his kit could not do it, and his armour stays).
4. **The watch items**: the lightest new-hero team against skeletons, the Labyrinth at 30, the Calamity's map 2.
