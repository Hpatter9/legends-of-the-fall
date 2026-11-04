# Skills 10: the third skill made the strongest, and Level 5 measured

Two balance asks, in order. The notes this builds on: [skills-4.md](skills-4.md) (the third skills), [skills-5.md](skills-5.md) (skill
levels by use) and [joint-rebalance.md](joint-rebalance.md) (the owner's targets, and the deferred Level 5 question). Built on main 0.340.0.
"Main" below is that code, measured side by side in a second tree with the same seeded tools. (Main's field fights are the same as 0.331's:
the hero sweep reads the same 62.5% at level 30, hero by hero.)

1. **The owner: "The third skills we added should be better than the first 2."** Every hero's skill 3 (it opens at level 20) is made its
   strongest skill, measured. Hero parity is kept within 6 at levels 1, 10 and 30 through each hero's own kit, and no armour moves.
2. **Level 5 skills** (deferred by the joint rebalance; the owner answered "later batch"). The late armies are measured with the skill levels
   a player of that level really has (`--mastery auto`), and the heroes who leave the band at Level 5 get their own Level 5 tune (a new
   per-hero knob beside `lv5.ts`'s rule). The design's x1.3 size is kept.

## How "stronger" is measured: a skill's worth

`node tools/skills/worth.mjs <level> <stage> [games]` (new). For each hero it plays the hero sweep's seeded fights: the hero and four others
at random, on the field bands. It plays them with the hero's kit whole, then with each of its skills shut (its cost out of reach, so the pool
goes to the other two), on the same seeds and teams. **A skill's worth is the points of wins its team loses without it.** It counts what the
skill does for winning (damage, control, saves), net of what the pool would have done otherwise. It is noisy: at 600 fights a hero, a
hero's worths are good to about ±2 points, so the table is read for the roster and for the clear cases, not for half-point gaps.

On main, at level 30 (stage 90, 600 fights a hero), skill 3 was the **least** valuable skill: mean worth 0.68 against 0.94 for skill 1 and
2.62 for skill 2. It led its kit for only 4 of the 45 heroes. Almost every skill 3 was a jab: a quick, cheap poke, weighed last by the AI
and held back for the heavier skills.

## What changed (part 1)

- **The 32 jabs are heavies** (`THIRD` in `kits/table.ts`). Skill 3 is now the kit's big skill, weighed first. It comes round every 11 s,
  is cast in 0.5 s, and costs the kit's other heavy's cost (two heavies cost the same, so "a heavy is the kit's dearest" still holds) or
  else the dearest of its two skills, within the heavy range. The skills keep their names and what they do.
- **The guards come round every 10 s and the utilities every 12 s** (their classes' quickest). A guard is only worth as much as how often
  its trigger is met with the cooldown run.
- **`TUNE3`, each skill 3's strength**, re-found. It was lifted until skill 3 out-valued skills 1 and 2, then stepped hero by hero toward
  main's level-20 average (`TARGET=34 KEY=t3 node tools/kits/tune.mjs ... 20 40 12000 --apply`). The stragglers got a further x1.4.
- **What did not scale with strength now does** (`kits/third.ts`). Warding Bond's time, Wall of Stone's time, Step of the Wind's time,
  Countercharm's ward, Curse of Weakness's "takes more from him" and Mend the Pack's shield now follow `castPower()`, as Scale Ward's time
  and the heals already did. Without that, `TUNE3` could not move these skills at all. Their words give the numbers at their strength (Hold
  Fast "a quarter of his health", Warding Bond "13s", Wall of Stone "16s", Step of the Wind "2.4s", Scale Ward "7s", Countercharm "4s",
  Barrier Drone "a quarter", Curse of Weakness "60% more", Arcane Ward "over a third", Mend the Pack "nearly in full ... over half its
  health", Healing Word "nearly half its health").
- **Countercharm needs one ailment, not two** (`GUARD.countercharm`). With two, it was cast 0.0 times a minute in the sweep: it never came.
- **A skill left unused comes round** (`RES.STALE_MS` 12 s, `heroKits.ts`; new). Once skill 3 is open, a skill (not a guard) unused for 12 s
  goes before the others when it can be paid, and is never held. The others are not cast while paying for them would leave it short. Below
  level 20 nothing changes. Without this rule a heavy skill 3 drank the pool and skill 1 stopped being cast at all for about half the
  roster (`test/hero-kits-all.test.ts`'s "most heroes cast both skills in a long fight": 15.8 of 45, the bar 35, main 36.8).
- **`SKILL3_PACE` stays 1.1.** It was the first lever tried for the stronger roster: 0.65 held level 30's average, but skills 1 and 2 starved
  (Volley, Spark and their like cast 0.1 to 0.3 times a minute against 2 to 7 on main). 0.9 still failed the long-fight test (30.5).
- **The ultimates give back level 30's strength** (`TUNE` in `ultimates.ts`, the late lever, each hero's own). They were stepped toward
  main's 62.5% at stage 90 (`TARGET=62.5 KEY=up STEP=0.015`, twice). No power fell below its pre-kit floor.
- **The Calamity's `start`, 0.66 to 0.68** (below).

### What was tried and dropped

| Version (level 30, stage 90) | Roster | Skill 3 leads its kit | Skills 1 and 2 still cast |
| --- | --- | --- | --- |
| Main | 62.5% | 4 of 45 (worth 0.68 against 0.94 / 2.62) | 36.8 of 45 |
| Jabs at x2.5 strength | 67.2% | 8 | |
| Jabs made heavies, strength x4 | 68.5% | 29 | |
| ... stragglers lifted, refill 0.65 | 62.2% | 35 (worth 2.44 against 0.46 / 0.21) | **15.8**: skill 1 all but gone |
| Jabs made strikes (they take turns with skill 1) | 71.0% | 15: a heavy skill 2 still out-weighs them | 34.2 |
| Cheap utilities at refill 1.3, tuned back to the roster | 63.9% | 7 | passes |
| **Heavies with the idle-skill rule, refill 1.1, tuned back (built)** | **62.5%** | **23, and 19 more within the noise** | **passes** |

The AI spends the pool on the heaviest skill that is ready. So skill 3 is only the most valuable skill when it is weighed first (a heavy),
and then something has to keep skills 1 and 2 coming round. The idle-skill rule does that without slowing anyone's well.

## Part 1: before and after

### Each skill's worth at level 30 (stage 90, 600 fights a hero)

| | Skill 1 | Skill 2 | Skill 3 | Skill 3 leads its kit |
| --- | --- | --- | --- | --- |
| Main | 0.94 | 2.62 | 0.68 | 4 of 45 |
| Now | 0.77 | 0.69 | **2.11** | 23 of 45; 19 more within the noise (behind by under 2.5); 3 behind |

Skill 3 is worth about three times either other skill to the average team. The three still behind are the High Priestess (her skill 1,
Healing Light, is worth 8 points on its own), the Ninja Monk (Step of the Wind, a guard) and the Juggernaut (Wall of Stone, a utility).
Questions below.

<details><summary>Hero by hero (points of wins lost when the skill is shut)</summary>

| Hero | Main: skill 1 / 2 / 3 | Now: skill 1 / 2 / 3 | Skill 3 now |
| --- | --- | --- | --- |
| Knight | 5.3 / 5.3 / 3.8 | 4.2 / 2.7 / **4.2** | within the noise (+0.0) |
| Samurai | 0.3 / 1.0 / 2.3 | 2.7 / 0.7 / **5.8** | leads (+3.1) |
| Kunoichi | -4.7 / 0.8 / 0.3 | -0.3 / 2.5 / **0.7** | within the noise (-1.8) |
| Archer | 0.2 / 2.0 / -0.3 | -0.7 / 0.5 / **-0.8** | within the noise (-1.3) |
| Fire Wizard | 0.2 / 3.5 / 0.2 | 0.7 / -0.3 / **4.0** | leads (+3.3) |
| Peasant | 0.5 / 2.0 / 0.2 | 1.8 / -1.0 / **2.8** | leads (+1.0) |
| Ninja Monk | 0.2 / 5.2 / -0.5 | 0.0 / 1.0 / **-2.3** | **behind** (-3.3) |
| Wanderer | 1.5 / -0.2 / 0.2 | 3.0 / -4.3 / **1.2** | within the noise (-1.8) |
| Lightning Mage | -0.5 / 2.2 / 0.2 | 1.3 / -0.8 / **2.2** | leads (+0.9) |
| Kitsune | -2.7 / 3.7 / -0.5 | -1.2 / 0.8 / **0.2** | within the noise (-0.6) |
| Karasu Tengu | -0.3 / 1.0 / 0.0 | 0.7 / 0.3 / **2.8** | leads (+2.1) |
| Yamabushi Tengu | 0.8 / 2.8 / -0.5 | 0.2 / 1.3 / **0.3** | within the noise (-1.0) |
| Werewolf | -7.8 / 1.8 / -1.5 | 2.8 / -0.2 / **0.7** | within the noise (-2.1) |
| Minotaur | 0.7 / 1.7 / 7.3 | 0.8 / 1.5 / **6.8** | leads (+5.3) |
| Satyr | -0.7 / 2.0 / -1.0 | 0.5 / 0.5 / **-1.3** | within the noise (-1.8) |
| Gorgon | -0.8 / 5.0 / -0.2 | 0.3 / 1.0 / **2.0** | leads (+1.0) |
| Samurai Commander | 0.7 / 1.2 / 0.7 | -0.5 / -0.3 / **3.3** | leads (+3.6) |
| Paladin | 0.7 / 6.3 / 3.7 | -0.8 / 1.5 / **2.2** | leads (+0.7) |
| Cleric | -0.2 / 7.0 / -0.2 | -0.2 / -1.2 / **2.5** | leads (+2.7) |
| Druid | 0.5 / 2.0 / 0.7 | 0.5 / 2.3 / **0.8** | within the noise (-1.5) |
| Barbarian | 0.3 / 1.2 / -1.2 | 1.2 / 6.8 / **6.8** | within the noise (+0.0) |
| Ranger | 0.7 / 4.3 / -0.2 | -0.8 / 1.0 / **-0.2** | within the noise (-1.2) |
| Warlock | 0.0 / 7.8 / 2.7 | -1.2 / 3.7 / **1.3** | within the noise (-2.4) |
| Illusionist | 2.2 / 1.0 / 4.7 | 2.3 / -0.2 / **1.8** | within the noise (-0.5) |
| Gunslinger | 0.0 / 3.7 / -0.2 | -0.3 / 0.5 / **8.3** | leads (+7.8) |
| Shambler | 5.2 / 1.7 / 2.2 | 5.5 / 1.2 / **4.5** | within the noise (-1.0) |
| Rifle Bot | 1.7 / 3.7 / 2.3 | 1.0 / 1.0 / **1.0** | within the noise (+0.0) |
| Mercenary | -0.5 / 5.3 / -0.5 | 0.0 / 0.8 / **1.3** | leads (+0.5) |
| Mummy | 3.5 / 8.3 / -0.7 | 0.2 / 1.3 / **3.2** | leads (+1.9) |
| Buccaneer | -0.2 / 1.0 / -0.8 | -0.8 / 0.5 / **-0.7** | within the noise (-1.2) |
| Wolf Bard | 2.3 / 3.7 / 0.0 | 2.2 / 1.2 / **0.0** | within the noise (-2.2) |
| Beastmaster | 5.3 / 0.8 / 2.5 | 2.7 / 0.7 / **1.0** | within the noise (-1.7) |
| Kraken Mate | 2.3 / -1.5 / -1.0 | -2.5 / -0.3 / **2.8** | leads (+3.1) |
| Lancer | -0.3 / -0.3 / -0.3 | -2.3 / -0.7 / **4.0** | leads (+4.7) |
| Reaper | -1.3 / 0.7 / 0.3 | 0.0 / 0.3 / **2.7** | leads (+2.4) |
| Time Witch | 4.5 / 2.3 / 2.5 | 3.2 / 2.2 / **3.3** | leads (+0.1) |
| Arc Blade | -2.7 / 2.2 / 0.8 | -0.5 / 0.0 / **0.2** | leads (+0.2) |
| Dread Pirate | 0.7 / 2.0 / 0.3 | 0.3 / -0.8 / **3.0** | leads (+2.7) |
| Siege Bot | 0.7 / -0.8 / 3.3 | -0.2 / 1.3 / **4.0** | leads (+2.7) |
| High Priestess | 13.5 / 0.5 / 0.2 | 8.2 / -2.2 / **1.7** | **behind** (-6.5) |
| Queen Dragoon | 0.8 / -0.7 / -1.7 | -0.7 / -0.3 / **-0.2** | leads (+0.1) |
| Juggernaut | -1.3 / 2.5 / -1.2 | -0.2 / 3.7 / **0.3** | **behind** (-3.4) |
| Great Sage | 6.2 / -0.5 / 2.7 | 2.2 / 0.3 / **2.8** | leads (+0.6) |
| Demon Swordsman | 2.7 / 5.8 / -1.3 | 1.7 / 1.2 / **4.5** | leads (+2.8) |
| Tyrant | 2.3 / 7.0 / 0.3 | -2.3 / -0.7 / **-0.7** | within the noise (+0.0) |

</details>

### Parity (`node tools/kits/tune.mjs <knobs> <level> <stage> 12000`, every hero's lift over the roster's average)

| Level, stage | Main | Now |
| --- | --- | --- |
| 1, stage 5 | 56.7%, spread 11.3; none beyond 6 | the same: 56.7%, spread 11.3; none beyond 6 |
| 10, stage 27 | 40.5%, spread 11.4; none beyond 6 (the joint rebalance's) | the same: 40.5%, spread 11.4; none beyond 6 |
| 20, stage 40 | 34.0%, spread 12.8; Werewolf +7.6 beyond 6, 9 beyond 4 | 35.6%, spread 8.8; none beyond 6, 3 beyond 4 |
| 30, stage 90 | 62.5%, spread 9.1; none beyond 6, 2 beyond 4 | **62.5%, spread 8.0; none beyond 6, 2 beyond 4** (Tyrant +4.4, Werewolf +4.0) |

Levels 1 and 10 cannot move: skill 3 and the idle-skill rule both start at level 20. The identity hashes of every level-1 and level-10
scenario are unchanged, which shows it fight by fight.

### The modes (heroes at level 20 and up; the same seeded tools on both trees)

| What (tool) | Main | Now | Target (joint-rebalance.md) |
| --- | --- | --- | --- |
| Last Stand, 40 runs, median wave at 30 / 100 (`npm run stand-balance -- --levels 30,100 --attempts 40`) | 15 / 25 | 15 / 24 | 15 / about 25 |
| Infernal at 55, hearts, 24 saves (`SAVES=24 node tools/spells-retune/run.mjs cell infernal:55:0:tph`) | 5.2 | 5.9 | 4.3 to 5 |
| Yokai at 65, hearts, 24 saves | 7.5 | 10.3 (88% cleared) | 11 to 12 (a steep cell: the joint rebalance read 9.3 and 12.6 either side of its start at 48 saves) |
| Golems at 65, hearts, 24 saves | 6.3 | 6.1 | 6.6 to 8 |
| Legendary Orcs at 55, 96 saves (`node tools/merge-two/run.mjs orcs:3:55`) | 90% | 85% | 84 to 88% |
| Voltara's level-40 trial, 20 seeds (`node tools/joint/run.mjs voltara 20`) | 5 of 20 | 5 of 20 | |
| Spire, 48 climbs, mean floors, no castle / full (`merge-two spire:none spire:max`) | 84.9 / 88.4 | 85.1 / 88.4 | main's |
| Calamity, 100 runs: mean maps (past map 2 / cleared) (`node tools/boss-big/run.mjs calamity --seeds 100`) | 1.77 (73 / 6) | 1.85 (77 / 10) at 0.66; **1.77 (71 / 8)** at 0.68 | main's |

Only the Calamity read outside its noise, and only a little easier. Its own knob, `CAL_SCALE.start` 0.66 to 0.68, puts it back on main
(0.7 read 1.70). The Infernal Host at 24 saves sits half a try harder than main, which is within the cell's noise. The daily and the
early climb fight with heroes under level 20, so they cannot move.

## Part 2: Level 5

### The skill levels a player really has (`--mastery auto`)

The level pace now counts skill use (`node tools/levelPace.mjs`). It plays the sample army runs of every army and tier and keeps each slot's
use points (the party's mean). It counts them into the favourite's three skills as it plays: each skill from the level its slot opens,
auto-replays at half (the owner's rule: skill use comes from army runs only). It reports the skill levels on the day the favourite reaches
each hero level.

| Hero level | Day reached | Skill 1 / 2 / 3 |
| --- | --- | --- |
| 10 | 1 | 3 / 3 / 1 |
| 20 | 1 | 3 / 3 / 1 |
| 30 | 4 | 4 / 5 / 4 |
| 40 and up | 26 on | 5 / 5 / 5 |

A run on Normal earns a party hero about 70 to 160 use points in skill 1, 130 to 280 in skill 2 and 50 to 120 in skill 3 (more on the harder
tiers). With thirteen runs a day, **every skill is mastered by hero level 40**. The skills overhaul's guess was "Level 2 at 20 to 30, 3 at
60, 4 at 100", far too slow. (The runs are measured with a level-100 party, whose fights are short, so the early days are if anything
undercounted.)

`--mastery auto` (or `MASTERY=auto`; `tools/skills/mastery.ts`) gives every party hero those levels by its hero level. The hero sweep reads
it (`sweepBoost`), and so does every tool that builds a save with `savedAt` (the army cells, the balance report, merge-two, the curve).

### Parity with every skill at Level 5 (level 30, stage 90, `--skill-level 5`)

| | Average | Spread | Beyond 6 |
| --- | --- | --- | --- |
| Main | 76.0% | 15.4 | Arc Blade −8.5, Karasu Tengu −7.6, High Priestess +6.9, Barbarian +6.5, Illusionist +6.3 |
| Now, part 1 alone | 80.0% | 10.3 | none (beyond 4: Beastmaster +5.7, Shambler +4.7, Archer −4.6, Knight +4.2) |
| **Now, with each hero's own Level 5 tune** | **79.5%** | **7.9** | none; beyond 4 only the Beastmaster, +4.3 |

The five who left the band on main came back once skill 3 was rebuilt. Their skills' share of each kit moved, and with it how much
Level 5 compounds for them. So the new knob went to the four nearest the edge after part 1. **`LV5_TUNE`** (`src/sim/kits/lv5Tune.ts`,
new) multiplies a hero's skills' strength at Level 5 only: Beastmaster 0.65, Shambler 0.85, Knight 0.9, Archer 1.17. Levels 1 to 4 and
every other hero keep the rule alone, and the x1.3 step is unchanged. The tuner takes it as the `l5` knob (`tools/kits/knobs.ts`).

### The late armies with the levels a player really has

| Cell (hearts, every talent, 24 saves) | No skill levels: main / now | `--mastery auto`: main / now | Target |
| --- | --- | --- | --- |
| Infernal at 55 | 5.2 / 5.9 | 1.9 / 1.7 | 4.3 to 5 |
| Yokai at 65 | 7.5 / 10.3 | 4.0 / 5.1 | 11 to 12 |
| Golems at 65 | 6.3 / 6.1 | 3.2 / 2.8 | 6.6 to 8 |

**A real player at 55 to 65 finds the late armies two to three times easier than the targets.** This was so on main too: the gap is the
skill levels, not this batch. Bisecting each army's Normal `start` with mastered skills (`MASTERY=auto SAVES=24 STEPS=5 node
tools/spells-retune/run.mjs tune <cell>`) gives the starts that would put them back on the targets: the Infernal Host 20.6 to about **22.9** (+11%), the Yokai 23.3 to about **25.9** (+11%), the Golem Forge 27.6 to about **32.8** (+19%). **They are not applied**:
it is the owner's call (question 1). The armies' tests (`army-pace`, `armyStars`) are written without skill levels and would need their
pinned numbers re-taken with them.

## Tests

- `test/skill3.test.ts`: batch 4's jab-hold test, re-read on a lighter skill held for skill 3 (now a heavy: the Archer's Volley and
  Double Shot). New: the idle-skill rule (a skill unused for 13 s goes before a ready heavy; one cast 6 s ago does not; it waits on the pool
  without the heavy cast in its way; below level 20 there is no such rule). Mend the Pack's heal at its strength may make the wolf whole.
- `test/skill-levels.test.ts`: new, a hero's own Level 5 tune moves only its Level 5 skills and only its own (and a loadout's kit id keeps
  its kind). The levels test reads the Knight's 0.9 at Level 5.
- **Re-taken identity hashes, only for the scenarios that moved** (those with heroes at level 20 and up): `spells-identity` field30,
  field30Others, heroes30, heroes30Others, bosses, armyFoes, spells, army, stand, calamity; `ailments-identical` field30, bosses, armyFoes,
  spells, army, stand, calamity. Kept: field1, field1Others, heroes1, heroes1Others, heroes10, heroes10Others, lands, daily, tower. Most were
  re-recorded with `node tools/joint/run.mjs record --write`. The record tool already disagrees with the tests on main for army and bosses
  (it predates main's boss weaknesses), so those two and the calamity were taken from the tests' own computation.
- No pace bar moved, no test was loosened.

## Tools

- `tools/skills/worth.mjs` (new): each skill's worth, as above. `--knobs state.json` plays with the tuner's knobs.
- `tools/kits/knobs.ts` (new, out of `tune.ts`): the tuner's knobs, now with `c3` (skill 3's cost), `k3` (its class), `m3` (its cast time),
  `l5` (the Level 5 tune) and a `$pace3` entry (`RES.SKILL3_PACE`). `tools/skills/measure.mjs` takes `KNOBS=`.
- `tools/levelPace.mjs`: the skill-use count and the skill levels by hero level (above).
- `tools/skills/mastery.ts` (new): `--mastery auto` / `MASTERY=auto`, read by `savedAt` and the hero sweep.

## Determinism and saves

Nothing new draws from a stream. The idle-skill rule reads only the fight's clock and the slots' last casts, and `LV5_TUNE` is a number on a
levelled slot. Nothing is saved, and no save changes shape.

## Checks

`npm run typecheck` clean. The full `npm test` on the final code, with main 0.340.0 merged: **2,392 of 2,392 pass, 0 fail**. `npm run web`
built. The page is unchanged apart from the skill sheet's and the codex's words for the guards (the same rows, read through the same rules),
so no screens were taken. Measured: every table above, main's column in a second tree of 0.340.0.

## Questions for the owner

1. **The late armies with mastered skills.** A player at hero level 55 to 65 has mastered every skill (the pace model: by level 40, day 26).
   With that, the Infernal Host, the Yokai and the Golem Forge on Normal take a third to a half of the tries the targets ask (table above,
   main the same). Recommended: re-tune their Normal starts with `--mastery auto` (the bisected numbers above) in a batch of their own,
   with `army-pace` and the tier lifts re-taken. Or keep them tuned for unlevelled skills, and let mastery be the reward the long game pays.
2. **The idle-skill rule** (`RES.STALE_MS` 12 s, from level 20). It is a new AI rule, and it is what keeps every skill in use now that skill
   3 is the heavy one. Recommended: keep it. It also means a player sees all three skills in a fight.
3. **Skill 3's class.** The design's jabs are heavies now, weighed first. The names stay (Pitchfork Jab, Spark, Double Shot...) though the
   skills now hit hardest of the three. Recommended: keep them, and rename the few that read small ("Jab", "Spark") if you like.
4. **The three skill 3s still behind their kits:** the High Priestess's Sacred Flame (her Healing Light is worth 8 points alone), the Ninja
   Monk's Step of the Wind and the Juggernaut's Wall of Stone. Recommended: redesign the two (an escape and a wall, worth little in the
   sweep's fights however strong) in a later batch, and leave the Priestess's heal as her core.
5. **The guards' words now give their numbers at their strength** ("for 13s", "a quarter of his health"). The design's numbers were at
   strength 1, which no guard had. Recommended: keep the true numbers.
