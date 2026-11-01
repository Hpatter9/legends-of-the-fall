# STATS batch 4: AC and the blow

The fourth batch of the owner-approved D&D stats design ([rpg-stats-design.md](rpg-stats-design.md), section 14 batch 4, sections 3.2 and
3.4, and the owner's answers of 31 October 2026: ordinary blows roll a d20 against AC, with glancing blows; foes use family blocks). Batch 2
(scores driving damage and health) is being built beside it, so this batch touches only the hit roll and leaves the scores' damage and
health scaling alone.

## What it does

- **The d20 against Armour Class** (`src/sim/blow.ts`, hooked into `swing` and `settle` in `battle.ts`). Every ordinary blow rolls d20 + its
  striker's to hit against the target's AC: a natural 20 crits (x1.5, or the kit's own crit size); meeting the AC hits; missing by 1 to 5
  **glances** for half damage; missing by 6 or more, or a natural 1, **misses**. The roll is made as the blow is swung and carried on the
  pending blow (`Pending.res`), so a shot in flight lands as it was rolled. Armour (`def`) still soaks what lands. Skills, damage over time,
  terrain and the Eidolons' strike never roll.
- **Crits.** Besides the natural 20, a blow that lands (a hit or a glance) crits at the striker's DEX crit (1% a point of DEX from +1) plus
  its kit's, traits' and gear's crit chance (`critOf`); a keen glance strikes home as a full crit. (At first only hits could crit, which
  cut every crit item's worth by about two fifths, since only about 60% of blows hit.)
- **Initiative.** As the fight starts every fighter rolls d20 + DEX (`initiativeRoll`) and waits 30 ms a point behind the best roll, at most
  0.6 s, before it first acts (`rollInitiative`; on top of any wait it already has, such as the Siege Drum's).
- **Blow speed by DEX.** A hero's blows are 2% quicker a point of DEX it has gained since level 1 (`BlowStats.quick`, the batch 1 fit's
  ratio, so every hero's level-1 blow time is today's).
- **The dodges are AC.** A kit's, a trait's, gear's and the relics' dodge shares are no longer a separate roll (`onStrike`'s dodge is gone):
  each **7%** of a share is +1 AC (`DODGE_PER_AC`), and a part of a point is a whole point that part of the time, so a 3% gear dodge still
  counts. **Tall grass is cover, +2 AC** (`TALL_AC`, in place of its 12% dodge; the codex's tip says so). **Height is cover**, +1 AC a
  level the target stands above the striker, to three (`HIGH_AC`; this replaces `guardMult`'s 3% a level, which is gone).
- **A miss** shows as the existing "Miss" pop (`dodge` event). It builds the target's pool as the old dodge did and the striker's as a blow
  does (`onDodged`). A yokai's spirit wisp comes only on a miss its dodge or cover turned, one that would not have missed without them
  (`Pending.turned`), as the old dodge called it.
- **"Glance" on the fight's numbers** (`src/render/fx.ts`): a glancing blow's number is smaller (8 against 9) and grey, with the word
  "Glance" above it in the labels' style.
- **The foes' blocks** (`foeStatsOf`, batch 1's family table): each foe's to hit, AC, DEX crit and initiative come from its family block.
  A boss's +2 to hit and +2 AC are switched off for this batch (`BOSS_BLOCK`; see the numbers). `foeStatsOf` takes an optional `boss` to say
  so.
- **`BLOW_SCALE` 1.23** puts the average blow back where it was. Glancing blows' share is `GLANCE_SHARE` (0.5).

### Three rules that are mine, not the design's (questions for the owner below)

1. **Today's numbers are each hero's level 1, for the roll as well.** As batch 1 fitted each hero's health and attack so that level 1 is
   today, each hero's blows and the blows it takes are fitted (`fit`, `guard`): at level 1 its average blow against AC 13, and a +5 foe's
   average blow on it, are the roster's average. Its to hit and AC still decide how often it misses, glances and is missed, and everything
   they gain with levels shows in full. Without this, the to hit and AC spread at level 1 broke hero parity (`test/hero-balance*.test.ts`):
   heavy-armoured heroes came out up to +9 points (the Minotaur at level 30), the Beastmaster (blows with STR 10) −6. Heavy AC 15 (the
   design's own answer for tanks that come out too strong) helped only a little, so heavy is back at the design's 16.
2. **The foes are matched to the heroes they fight, for this batch.** Rather than proficiency by tier (+2 Normal to +6 Mythic), a foe's AC
   rises by as much as the placed heroes' to hit has grown since level 1, and its to hit by as much as their AC has (`matchOf`, fixed when
   the fight starts). At level 1 the blocks are as written. So the d20 adds nothing to levelling yet and moves no mode; tier proficiency is
   one switch away for the joint rebalance.
3. **The dodges at 7% a point, not 5%.** With glances, a point of AC takes about 7% off a blow's average; at the design's 5% every hero with
   a dodge came out stronger than before.

One kit number moved: the Wanderer's skill 1 `tune` (`TUNE1.wanderer` in `kits/table.ts`, 1.059 to 1.25), the design's first answer for a
single hero out of the band: it was 6.3 points under the roster at level 30.

## Determinism and saves

Every roll is a hash of the fight's seed and the moment (`STATS_SALT` with salts 1 for the crit and 2 for the part of a point of AC;
`INIT_SALT` for initiative), never a draw from `b.rng` or `b.skillRng`; the old dodge's and crit's draws from the skill stream are gone,
so the streams draw less than before, and a fight replays from its seed, placing and orders (a test). Nothing new is saved: `Pending.res`,
`Pending.turned` and `Battle.blowMatch` live only in a fight.

## The numbers

Measured against main **0.320.0, with stats batch 2 merged in** (the director's ask: heroes' power by score is live), on the merged code,
with the same seeded tools.

| What | Main 0.320.0 | This batch (merged) |
| --- | --- | --- |
| Fight length, 135 fights a level, level 1 / 10 / 30 (the test's own) | 20.5 / 23.2 / 12.4 s | 21.8 / 23.2 / 12.4 s (+6.4%, +0.0%, +0.4%) |
| Armies, single tries, 96 saves (clear, waves of 15): Undead 8 | 3%, 10.7 | 7%, 10.8 |
| Beasts 15 | 61%, 11.2 | 60%, 11.3 |
| Wildwood 22 | 91%, 13.9 | 90%, 13.9 |
| Labyrinth 30 | 30%, 5.5 | 24%, 4.5 |
| Ogres 38 | 8%, 4.7 | 7%, 3.9 |
| Golems 52 | 0%, 4.8 | 0%, 4.2 |
| Orcs Legendary 55 | 88%, 14.8 | 91%, 14.9 |
| Daily, 120 dates, fresh save (with hearts / none) | 78% / 59% | 81% / 66% |
| Last Stand, 40 runs, median wave at 1 / 10 / 30 / 100 (mean) | 4 / 8 / 15 / 25 (3.6, 8.4, 15.9, 27.2) | 4 / 8 / 15 / 24 (3.7, 8.3, 15.7, 26.1) |
| Calamity, 100 runs, mean maps (map 2 / map 3) | 1.80 (76% / 4%) | 1.81 (75% / 6%) |
| Spire, 96 runs, mean floors, castle full / none | 89.5 / 80.9 | 88.4 / 78.9 |
| Hero parity, 12,000 teams, spread at level 1 (stage 5) | +3.7 to −4.0 | +3.8 to −5.3 |
| Hero parity at level 30 (stage 78) | +4.5 to −5.2 | +5.4 to −4.5 |

Before the merge, against main 0.313.0, the same cells were as close (Beasts 61% / 57%, the daily 74% / 79%, the Last Stand at 30 15 / 15,
the Calamity 1.82 / 1.83; parity at 30 +3.7 to −4.7 against +4.4 to −4.9).

A blow at level 1 now hits about 59% of the time, glances 24% and misses 17% (field fights), and the mean blow that lands is about 12%
bigger (`BLOW_SCALE` and the crits), so each side's total blow damage is within 2% of main's.

**How it got here** (each step measured on the same cells): with the bosses' +2 to hit and +2 AC the armies came out about a wave harder
than main (Beasts 58% to 48%, Golems 4.5 to 3.1 waves), so `BOSS_BLOCK` is off; a +1 to the foes' to hit matched the daily and the Last
Stand but left the armies half a wave hard, so it went too once the pool rule and the fits were in.

## The merge with stats batch 2

`origin/main` (0.320.0) was merged in (a merge commit). The blow's scores now read a hero's rank and its talents' and gear's score points
as batch 2 does (`Unit.rank`, `statInputOf`), so a rank's +1 to two scores reaches its to hit. Three tests that came with main follow
single seeded fights the d20 moves, and were re-pinned on the same rule batch 2 used:
- **Voltara's trial** (`eidolon-chain-4`): she takes her second form in nine of the ten seeds 2003 to 2012, as on main; 2004 is now the one
  that misses, so the test is on 2003 again.
- **A lost technique cast on its own** (`lost-techniques`): every reader casts in 12 of 12 seeds but the Wizard's Words of Unmaking in slot
  1, 11 of 12, and seed 11 was the miss: the test is on seed 12.
- **A Last Stand hero within its leash** (`stand`): the Kunoichi's Smoke Bomb blinked her 6 tiles from her post (leash 4). A real gap, not
  noise: the toolkit's `safeTile` (the blinks' landing) now keeps a posted hero within its leash, as its charges already did
  (`toolkit/blink.ts`). Only the Last Stand reads a post, so no other fight moves.

## Tests

- **`test/stats-blow.test.ts`** (new, 13 tests): the design's odds table over 10,000 hashed rolls (needs 6 to 14: hit, glance and miss
  within 1.5 points of 75/20/5 ... 35/25/40); a fighter's blow numbers (a hero's from its scores, a foe's from its block, a boss's block
  without its bonus, DEX's quicker blows and crit); the fits (every hero deals and takes the roster's average at level 1, the roster's
  total kept, the fit kept as a hero grows); cover (tall grass, height to three, 7% of dodge a point); the crits (a natural 20 always, a miss
  never, any blow that lands at the DEX and kit chance, 15% measured); a part of a point of AC; a miss turned by cover marked as such; a
  glance is half a hit; a fight's events tag glances and show misses as dodges; initiative's waits; the foes' match at level 1 and 30; **a
  fight replays the same**; **fights last within 10% of main's** at levels 1, 10 and 30.
- Changed to the new rules (none loosened): the Kunoichi's Evasion and a summon's team dodge are AC now (`abilities`, `class-heroes`); tall
  grass is +2 AC, its miss share measured against the open over forty fights (`terrain`); a barrel test runs long enough for a blow to land;
  the Siege Drum's wait comes on top of initiative (`relics`); the dodge case of SIM-001 is a missed blow; the ruler's tests run long enough
  for a blow to land past its d20 (`stand-ruler`); Demon Form is run past its whole length (it used to end only because the swordsman fell);
  the height test drops `guardMult`.
- **Re-recorded:** every identity scenario (`spells-identity`, `ailments-identical`; the new hashes are in each test's header), and the
  Last Stand's pinned ordinary fights (`stand-regression`). With the bosses' signatures on, `calamity` now reaches a boss, so it joins
  that test's scenarios with a boss.

## Not in this batch

- **The cards.** The unit card still shows "Dodge 20%" (`statRows`) and the kit passives say "Slips 20% of blows": they are AC now. The
  page batch (3) shows AC; I left the cards to it.
- Tier proficiency for the foes, the bosses' blocks, and every mode's retune: the joint rebalance (batch 7).

## Checks

`npm run typecheck` clean. The affected tests while working; the full `npm test` on the merged code at the end: **2,208 of 2,212 pass, 4
fail** (below). `npm run web` built. The renderer change is a label and a number's size and colour in a fight; I did not take phone
screenshots of it (a glance can't be set up on demand in the page). The identity fixtures and the Last Stand's pinned fights were re-taken
on the merged code.

### The four failing tests

I have not loosened them. Two are noise on a fixed sample; two look real and are the joint rebalance's:

1. **`armies`: the Orc Warlord is a wall at level 1** (at most 2 of 8 clears): 3 of 8. Over 24 tries main and this batch are about the same
   (main 4 to 5, this batch 5 to 6); main's own first 8 sit on the line. Noise.
2. **`armies`: each army needs more levels than the one before, "beasts at 20"** (at least 30% of 16 tries): over 48 tries the starting five
   at level 20 clear the Beasts 5 times here against 13 on main, while at the Undead at 22 they clear 24 of 32 against 18. Real: the beasts
   are skirmishers (AC 14, DEX 16) and the family blocks make some armies harder for this party and others easier. The recruits' party at
   the Beasts' own level (15) clears 60% against 61%.
3. **`new-heroes`: a team of new heroes is about as strong as the starting five** (at least 0.6 of the five's wins against skeletons): 9.8
   against 18. Over 90 seeds main is 0.61 and this batch 0.52: the starting five do better in easy fights and against skeletons (armoured,
   AC 15). I could not pin the cause down: it is not the AC conversion (the old dodge roll gives the same), initiative or the to-hit spread.
4. **`stand-retreat`: a strong party falls back room by room** to the fourth room by wave 16: this seed's level-100 party falls first. Over 40
   runs at level 100, main's median is 25 waves, this batch's 24. Noise.

## Questions for the owner

1. **The fits** (rule 1 above): is fitting each hero's level-1 blow and guard to the roster's average, as batch 1 did for health and attack,
   all right? Without it heavy armour and STR 17 heroes ran away with parity.
2. **The foes matched to the heroes** (rule 2), for now, rather than proficiency by tier: all right until the joint rebalance?
3. **7% of dodge a point of AC**, not 5%?
4. **The four failing tests**: retune now (the beasts and the starting five look real), leave them to the joint rebalance, or re-sample the two
   noisy ones (more tries, same thresholds)?
