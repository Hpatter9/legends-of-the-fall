# Two to merge, merged by the player, four ranks (MERGE-TWO)

The owner's ask: "I want the heroes to only need two to merge and upgrade. And I don't want them to auto upgrade so there's more for
the player to do. But I want an auto merge button added. Then there will be 4 ranks now. Instead of the three we had before. With the
4th rank being harder to get to." Answers to the follow-up questions: every merge is two of a kind and rank (1+1 make 2, 2+2 make 3,
3+3 make 4, so a rank 4 holds 8 hires); a hero is dragged onto its match to merge, and heroes with a match are marked; the Auto merge
button merges every pair ready, then the pairs those make, up to rank 4, and stops (not a toggle); rank 4 gets its own skill (another
worker's `claude/rank4-skills`: until that merges a rank-4 hero casts its tier-3 skill), a power step and a look of its own.

## The rules (`src/sim/merge.ts`, new; `src/sim/run.ts`)

- `MAX_GRADE` is 4. Nothing merges on its own: `summon`, `recruit` (the tower's shop), the starting heroes and rewards only add a hero.
- `canMerge(run, a, b)`: two different owned heroes of the same kind and grade, below 4, neither a mirror's clone, in a run that is not
  over and not a Calamity (the Calamity still has no merging: its heroes rise a tier by level).
- `merge(run, a, b)`: `a` (the hero moved) merges into `b` (the target). The target keeps its id, squad place, board tile and gear and
  rises a grade; `a` leaves the roster and squad and its gear goes back to the pack (it used to be every merged hero's gear, as the merged
  hero was a new one). `paid` is the sum, and a run that levels its own heroes keeps the higher XP.
- `mergeReady(run)`: the pairs ready now, each hero in one pair at most, the lowest grade first, then the oldest ids; the target of a
  pair is the fielded one if only one is. `mergeMatches` is the set of heroes in them (the page marks them).
- `autoMerge(run)`: the Auto merge button: merges the first ready pair until none is left (so a new rank 2 that pairs with another rank 2
  merges too, up to 4), and returns each merge in order.
- A full bench (`BENCH_MAX` 10) now refuses every hire (`hireBlock` 'bench'); the button's tip and the status line say to merge a pair,
  recycle a hero or field one. It used to let through a hire that would merge three of a kind.
- `paidOf`'s fallback for an older save's hero is `SUMMON_BASE * 2^(grade-1)`. An older save with three of a kind left over loads as it
  is, and shows a pair to merge.
- The greedy player (`autoRound` in `src/sim/autoplay.ts`, the page's Auto, the balance tools and the tests) taps Auto merge before and
  after every hire, so every measurement below is a player who uses the button.

## The page (`src/main.ts`, `src/index.html`, `src/render/`)

- Between waves (the deploy phase only), drag a bench card or a fielded hero onto a matching card or a matching hero on the board: they
  merge (`mergeTargetAt`, `mergeHeroes`). Tap one, then tap its match, does the same. While dragging, the matching cards are outlined and
  the one under the finger lights up; a match on the board stands on a gold tile (the new `merge` tile mark in `boardView.ts`).
- Heroes with a match ready: a gold ring and a bobbing ⇧ badge on the bench card, and a gold tile under a fielded one.
- **Auto merge · N**: a gold pill on the bench's top-right edge, shown only while N pairs are ready.
- A merge plays the old merge moment (`showMerges`): the merged-away hero leaves the board, the target is set down again where it stood at
  its new grade and rises in light (`fx.promote`), the card flashes, the merge chime (a sparkle too for rank 3 or 4).
- Rank 4's look: four stars and a violet card (`.card.g4`), a violet halo, rim and more sparks on the board, drawn 1.14x (rank 3 is
  1.08x, gold), a violet portrait tint in the bench, hero bar (a violet glow on the ring) and recap, and a violet "Tier 4" promotion with
  a second wave of the pack's light. The units have three forms at most; rank 4 keeps the last (`formOf`).
- Tips and lines that said "three of the same hero merge" now say two (`tips.ts`, `quipData.ts`).

## Balance

Two to merge makes ranks far cheaper (rank 3 is 4 hires, not 9), and the tier skills come with them, so the stat steps were cut:
**`GRADE_BOOST` = [1, 1.3, 1.6, 2.4]** (hp and attack at grades 1 to 4; it was x1.6 a grade, so 1, 1.6, 2.56). Rank 4 is the biggest step
(x1.5 over rank 3). The hire prices, the lucky chance (5%) and the gold are as they were. Two answers elsewhere:
**`TOWER_GROWTH` 0.17 to 0.19** (the spire's foes grow faster; the Calamity has its own scale) and **`DAILY_ANSWER.ult` 0.15 to 0.17**
(`modes.ts`: a levelled save's daily foes; a fresh save's daily is untouched).

Measured against main 0.218.0 (before) on the same seeds, after main 0.221.0's tier 4 skills were merged in. The tool
`tools/merge-two/run.mjs` (new) plays single tries of army cells (army:tier:level; the recruits' party with every talent its level opens, gear
dressed, the castle a climb has, as `tools/army-pace`), `early:army:level` (the starting five, no castle, talents or gear, as
`test/armies.test.ts`) and the spire (`spire:none`, `spire:max`); `GB=1,1.3,1.6,2.4` tries other steps. A cell of 96 tries is about 5
points of noise.

| Measure | Before | After |
| --- | --- | --- |
| Single-try clears, 96 tries: first army Mythic at 55 / 60 / 65 | 8%, 28%, 30% | 10%, 34%, 39% |
| the same, Normal: Ogres 45, Infernal 55, Yokai 64, Golems 74 | 19%, 19%, 16%, 28% | 29%, 35%, 20%, 34% |
| the same, the starting five, no talents: first army at 1, Undead at 20 / 22, Beasts at 20 | 11%, 38% / 42%, 35% | 14%, 30% / 39%, 34% |
| First army's 11 stars (`army-pace stars`, 12 saves): Mythic tries and saves with all 11 at 55 / 60 / 65 | 15.2 8/12, -, 5.3 12/12 | 16.0 9/12, 6.5 12/12, 7.2 12/12 |
| Normal tries at 55 / 65 (`army-pace normal`, 8 saves, share cleared in 25): Infernal | 7.0, 1.9 | 2.3, 1.5 |
| the same: Yokai | 23.1 (25%), 14.5 (75%) | 22.1 (75%), 5.0 (100%) |
| the same: Golems | 26 (0%), 11.1 (100%) | 25.6 (25%), 7.4 (100%) |
| Daily, fresh save with hearts (`npm run daily-rate`, 112 dates) | 76% | 77% |
| Daily, levelled save at 30 / 50 (`tools/ult-charge` daily, 80 dates) | 65%, 69% | 70%, 75% (76%, 78% before the answer moved) |
| Spire, no castle (80 climbs): floors p25/median/p75, mean, first act boss | 12/12/25, 22.2, 30% | 12/12/25, 22.2, 30% |
| Spire, full castle: the same | 12/25/38, 34.2, 61% | 12/25/77, 43.3, 61% |
| Fielded grades at the last wave (g1/g2/g3/g4), the late cells | 11/87/2/0% | 6/44/48/3% |
| Tries with a rank-4 hero fielded by wave 10 / at any wave | 0% / 0% | 1-3% / 4-11% |

So the army pace holds in its shape: the Infernal Host is cleared before the first army's 11 stars, the Yokai Night Parade and the Golem
Forge after them (at 55, where 9 saves in 12 have every star, they take 22 and 26 tries; at 65 they take 5 and 7), and the first army's
stars still come between level 55 and 65. The late armies are a little easier than on main (a few levels sooner: the Yokai at 65 takes 5
tries, not 14.5), and the Infernal Host at 55 clearly so. The daily is in its 66-75% band (the fresh save was 76% on main already), the
spire's median and first boss are where they were (a full castle's long climbs go further: at 0.20 the no-castle spire turned too hard, 18%
first boss). The starting five without talents meet the second army a level or two later. Rank 4 shows up in a good run's last waves and
hardly ever by wave 10.

Tried and dropped: [1, 1.25, 1.6, 2.4] kept the late armies right but the early ones (no talents) fell 6 to 12 points; [1, 1.35, 1.6, 2.4]
fixed the early ones but made every late cell 10 to 25 points easier. The early and the late runs answer the grade-2 step very differently
(the late ones live on the tier skills), so no one curve fits both; [1, 1.3, 1.6, 2.4] is between.

**Rank-4 parity** (the coordinator's note from RANK4-SKILLS: Knight and Beastmaster beyond 6 at level 1, Dread Pirate and Siege Bot at level 30,
measured at x4.1). With x2.4, `npm run balance -- --heroes-only --hero-grade 4`, two runs of 4,000 teams (level 1 stage 25, average 33%;
level 30 stage 255, average 49%): level 1 Knight +12.1, Beastmaster +11.2, Karasu +10.7, Gunslinger +8.8, Wolf Bard +8.2, Demon Swordsman
+6.2, Dread Pirate -7.4; level 30 Siege Bot +8.5, Dread Pirate +7.5, Karasu -8.3 (spread 19.5 and 16.8 points). The same heroes stand out at
x2.4 as at x4.1, and they stood out at tier 3 too, so it is how their kits grow with power, not the size of the rank-4 step; a smaller step
does not help them. Fixing them is a kit change, outside this branch. Hero parity at grade 1 (levels 1 and 30, the owner's 6 points) is
untouched: `gradeMult(1)` is 1.

Untouched by construction: **the Last Stand** (its heroes are grade 1 and never merge; its scenario hash in `test/ailments-identical.test.ts`
is the one recorded on main) and **the Calamity** (no merging; its hash is unchanged too). The tier-3 skills now come into the armies
routinely (rank 3 was 2% of the last wave's heroes, now about half): the smaller stat steps pay for them.

## Tests

- New `test/merge.test.ts`: a pair merges (id, place, gear, gold, XP), mismatched kinds or grades, the same hero, the top grade, an ended
  run and a clone are refused, a hire never merges, Auto merge cascades to 4 and stops (16 knights make two rank 4s, lowest grades first),
  the ready pairs and their targets, a full bench refuses a hire until a pair merges, an older save with three of a kind loads and shows a
  pair, the greedy player leaves no pair, each grade is stronger and rank 4 is the biggest step.
- Changed to the owner's new rule (they pinned three of a kind merging at once): `test/run.test.ts` ("three of a kind and grade merge"
  is now "summons never merge on their own; Auto merge leaves no pair", "a merge keeps the squad place" uses `merge`, "grade raises hp
  and attack" reads `GRADE_BOOST`), `test/battle-flow.test.ts` (a full bench refuses every hire; merging frees room),
  `test/events.test.ts` (a merge hands the merged-away hero's gear back), `test/levels.test.ts` (the grade-2 step), `test/recycle.test.ts`
  (summons with Auto merge between), `test/calamity.test.ts` (no merging in a calamity, the tower merges a pair).
- `test/fixtures/ailment-logs.json`: the `army`, `daily` and `tower` scenario hashes re-recorded (they hire and merge); the other eight
  are main's.
- `test/armies.test.ts`: the starting five's check on the second army moved from level 20 to 22 (over 96 tries it was 38% at 20 before,
  and is 35% at 21 and 39% at 22 now: the merge change moved it a level or two). The owner or the director may prefer the old level back
  with a stronger grade-2 step (x1.35), at the cost of easier late armies (above).

## Files

`src/sim/merge.ts` (new), `src/sim/run.ts` (`MAX_GRADE`, `GRADE_BOOST`, `gradeMult`, `add`, `hireBlock`, `paidOf`), `src/sim/climb.ts`,
`src/sim/units.ts` (`formOf`), `src/sim/tower.ts` (`TOWER_GROWTH`), `src/sim/modes.ts` (`DAILY_ANSWER.ult`), `src/sim/autoplay.ts`, `src/main.ts`, `src/index.html`,
`src/pixel.css`, `src/battleUi.css`, `src/heroBar.ts`, `src/render/boardView.ts`, `src/render/unitView.ts`, `src/render/sheets.ts`,
`src/render/fx.ts`, `src/render/spectacle.ts`, `src/tips.ts`, `src/quipData.ts`, `tools/autoplay.ts`, `tools/balance.ts`,
`tools/merge-two/` (`pace.ts`, `run.mjs`, `shots.mjs`), the tests above, `docs/notes/battle-flow.md` and `lucky-summon.md` (a line each),
the pictures `docs/samples/merge-two-{ready,auto,rank4}-{393x852,360x780,412x915}.png` and `merge-two-{drag,dragged,rank4-close}-393x852.png`.

## For the owner

- Rank 4's numbers: x2.4 hp and attack against x1.6 at rank 3 (x1.3 at rank 2). If merging should feel stronger step by step, the steps can rise
  together with tougher foes; say if so.
- The tier-3 skill is now an ordinary sight in the armies (half the last wave's heroes). The tier 4 skills (RANK4-SKILLS) were merged in
  before the measurements above.
- The late armies come a few levels sooner than on main, the early ones (no talents) a level or two later; say which matters more.
