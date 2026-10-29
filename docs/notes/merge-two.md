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
- Heroes with a match ready: a pulsing gold ring and a ⇧ badge on the bench card, and a gold tile under a fielded one.
- **Auto merge · N**: a gold pill on the bench's top-right edge, shown only while N pairs are ready.
- A merge plays the old merge moment (`showMerges`): the merged-away hero leaves the board, the target is set down again where it stood at
  its new grade and rises in light (`fx.promote`), the card flashes, the merge chime (a sparkle too for rank 3 or 4).
- Rank 4's look: four stars and a violet card (`.card.g4`), a violet halo, rim and more sparks on the board, drawn 1.14x (rank 3 is
  1.08x, gold), a violet portrait tint in the bench, hero bar (a violet glow on the ring) and recap, and a violet "Tier 4" promotion with
  a second wave of the pack's light. The units have three forms at most; rank 4 keeps the last (`formOf`).
- Tips and lines that said "three of the same hero merge" now say two (`tips.ts`, `quipData.ts`).

## Balance

Two to merge makes ranks far cheaper (rank 3 is 4 hires, not 9), and the tier skills come with them, so the stat steps were cut:
**`GRADE_BOOST` = [1, 1.25, 1.6, 2.4]** (hp and attack at grades 1 to 4; it was 1.6 a grade, so 1, 1.6, 2.56). Rank 4 is the biggest step
(x1.5 over rank 3). The hire prices, lucky chance (5%) and gold are as they were. A long spire climb still came out stronger, so the
spire's foes grow faster: **`TOWER_GROWTH` 0.17 to 0.19** (the spire only; the Calamity has its own scale).

Measured against main 0.218.0 (before) on the same seeds. The tool `tools/merge-two/run.mjs` (new) plays single tries of army cells
(army:tier:level; the recruits' party with every talent its level opens, gear dressed, the castle a climb has, as `tools/army-pace`) and
the spire (`spire:none`, `spire:max`); `GB=1,1.25,1.6,2.4` tries other steps.

| Measure | Before | After |
| --- | --- | --- |
| First army Normal at level 1: waves won (48 tries) | 10.6 / 15 | 11.0 / 15 |
| Single-try clears (48): first army Legendary 45, Mythic 55, Mythic 65 | 25%, 13%, 35% | 38%, 6%, 33% |
| Single-try clears (48): Ogres 45, Infernal 55, Yokai 64, Golems 74 (Normal) | 19%, 19%, 10%, 27% | 15%, 29%, 8%, 23% |
| First army's 11 stars (`army-pace stars`): Mythic tries, saves with all 11, at 55 / 60 / 65 | 12.8 6/8, 10.0 11/12, 6.0 8/8 | 19.6 3/8, 6.4 12/12, 7.4 8/8 |
| Normal tries at 55 / 65 (`army-pace normal`, 8 saves): Infernal | 7.0, 1.9 | 2.5, 1.6 |
| the same: Yokai (share cleared in 25) | 23.1 (25%), 14.5 (75%) | 25.5 (13%), 9.1 (88%) |
| the same: Golems | 26 (0%), 11.1 (100%) | 22 (25%), 10.0 (88%) |
| Daily, fresh save with hearts (`npm run daily-rate`, 112 dates) | 76% | 74% |
| Daily, levelled save at 30 / 50 (`tools/ult-charge` daily, 80 dates) | 65%, 69% | 73%, 71% |
| Spire, no castle (80 climbs): floors p25/median/p75, mean, first act boss | 12/12/25, 22.2, 30% | 12/12/25, 19.6, 28% |
| Spire, full castle: the same | 12/25/38, 34.2, 61% | 12/25/51, 35.3, 60% |
| Fielded grades at the last wave (g1/g2/g3/g4) | 11/86/3/0% | 11/31/54/3% |
| Tries with a rank-4 hero fielded by wave 10 / at any wave | 0% / 0% | 0-4% / 4-13% |

(With `TOWER_GROWTH` left at 0.17 the full-castle spire's median went from 25 to 38 floors and its mean to 48.5.)

So the army pace holds: the Infernal Host is still cleared before the first army's 11 stars, the Yokai and the Golem Forge after them,
and the first army's stars still come between level 55 and 65 (a little harder at 55, a little easier at 60: within the noise of 8 to 12
saves). The daily stays in its 66-75% band, the spire's median and first boss are where they were. Rank 4 shows up in a good run's
last waves and almost never by wave 10.

Untouched by construction: **hero parity** (measured at grade 1, `gradeMult(1)` is 1), **the Last Stand** (its heroes are grade 1 and
never merge; its scenario hash in `test/ailments-identical.test.ts` is the one recorded on main) and **the Calamity** (no merging; its
hash is unchanged too). The tier-3 skills now come into the armies routinely (rank 3 was 3% of the last wave's heroes, now about half):
the smaller stat steps pay for them.

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

## Files

`src/sim/merge.ts` (new), `src/sim/run.ts` (`MAX_GRADE`, `GRADE_BOOST`, `gradeMult`, `add`, `hireBlock`, `paidOf`), `src/sim/climb.ts`,
`src/sim/units.ts` (`formOf`), `src/sim/tower.ts` (`TOWER_GROWTH`), `src/sim/autoplay.ts`, `src/main.ts`, `src/index.html`,
`src/pixel.css`, `src/battleUi.css`, `src/heroBar.ts`, `src/render/boardView.ts`, `src/render/unitView.ts`, `src/render/sheets.ts`,
`src/render/fx.ts`, `src/render/spectacle.ts`, `src/tips.ts`, `src/quipData.ts`, `tools/autoplay.ts`, `tools/balance.ts`,
`tools/merge-two/` (`pace.ts`, `run.mjs`, `shots.mjs`), the tests above, `docs/notes/battle-flow.md` and `lucky-summon.md` (a line each),
the pictures `docs/samples/merge-two-{ready,auto,rank4}-{393x852,360x780,412x915}.png` and `merge-two-{drag,dragged}-393x852.png`.

## For the owner

- Rank 4's numbers: x2.4 hp and attack against x1.6 at rank 3. If merging should feel stronger step by step, the steps can rise
  together with tougher foes; say if so.
- The tier-3 skill is now an ordinary sight in the armies (half the last wave's heroes). Rank 4's own skill comes with
  `claude/rank4-skills`; it was not measured here and adds a little for the few runs that reach rank 4.
