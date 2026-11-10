# Duel show: the duel made a show, and longer

The owner: "We should make the duel visually more interesting. Like they both walk into the ring from the outside, the rest of the party
and enemies watch from just outside and cheer it on. 1 battle bar that fills green if the hero is winning and red the other way if the
enemy is winning. Also the duels are so short."

Built on phase 4's duels (`docs/notes/nemesis-4.md`). Frame strips at 393 x 852, 360 x 780 and 412 x 915 are in `docs/samples/duel-show/`
(`node tools/duel-show/shots.mjs`).

## What it plays as

1. **The walk-in.**
   - When the duel's fight begins, the ring is empty. The champion walks in from its own side, three tiles out past the ring's edge along
     its starting column, and the challenger from the other side. Each uses its walk row, eased to a stop, and they end facing each other
     (1.7 s).
   - Then a beat (1.1 s): a horn, and the two names over the board, the champion's in green, "vs", the challenger's in red.
   - Then the first blow. The fight is held through all of it, before its first tick, so the walk-in changes nothing in the battle.
   - A tap anywhere skips it.
   - With reduced motion they stand in place, the names show still, and the beat is 0.9 s.
2. **The crowd.**
   - The rest of the party as it was placed, and the rest of the wave (its foes, not its summons or its big ones), stand just outside the
     ring on their own sides, facing in. They fill the row past the ring's edge from its middle outwards, then the row past that, then the
     ring's flanks on their own half.
   - The two columns the duellists walk in along are left open.
   - Only ground a fighter can stand on is used; never a tile twice; fewer places than fighters when the board runs out.
   - What they do:
     - watching: they bob now and then;
     - at a big blow (8% of the struck one's health or more), the striker's side cheers (jumping, its attack row) and the other groans
       (a flinch);
     - now and then a shout: "Yes!", "Again!", "Ooh!", "Get up!", through the quips' bubble, at most one every 2.6 s, silenced with Hero
       quips off.
   - They take no part and can't be hit: they are copies of the wave's fighters drawn beside the board's, never in the battle (`startDuel`
     leaves only the two). They show no health bar.
   - The camera keeps them in the picture, each too light to pull it off the two.
   - Reduced motion: no hops.
3. **One duel bar** in the boss bar's place:
   - the champion's face at its left end and the challenger's at its right, both names, and the ring's clock between them;
   - green fills from the champion's end and red from the challenger's;
   - the meeting point (a gilt knot) slides with each side's share of health left, shields counted. It is the champion's share of the
     two shares (`tugPoint`), so it is half and half at the start, all green when the challenger is down, and all red the other way;
   - the side ahead lights its face;
   - a big swing (the point moving 8% of the bar within 1.2 s) pulses the bar and sounds;
   - still for reduced motion.
4. **Longer duels** (below): a duel now lasts about 20 to 28 s at x1 (median and mean), where it lasted 9 to 12 s; the ring's clock is two
   and a half minutes.
5. **The end.**
   - The winner's side erupts (the highest jumps, its attack row, a shout: "Victory!", "Huzzah!") and the loser's slumps (sunk and dimmed,
     "No…", "Fallen…").
   - Out of time, the challenger's side cheers it off and the party groans.
   - The outcome waits 1.8 s for this, then plays as before.

**Sound** (`soundRules.ts`, `audioProcessors.ts`, levelled as `docs/notes/hold-sound.md` sets out; targets in `tools/audio-mix/targets.mjs`):

| Cue | What | Target (momentary max) | Measured |
| --- | --- | --- | --- |
| `duelWalk` | heavy footfalls closing in, a drum roll under the last | -28 LUFS | -28.1 |
| `crowdCheer` | a swell of many voices and clapping, at a big blow and a win | -29 | -29.6 |
| `tugSwing` | a rope drawn tight, at a big swing (and a loss) | -31 | -31.4 |

The beat's horn is the existing `horn` cue. The walk-in's cue is skipped for reduced motion.

## Where it lives

- `src/duelShowRules.ts` (pure, tested in `test/duel-show.test.ts`):
  - `crowdSpots`: where the crowd stands;
  - `walkFrom` and `walkAt`: the walk-in's path and timing;
  - `tugPoint`, `tugLeader` and `bigSwing`: the bar;
  - `hitMoods`, `endMoods`, `hopOf`, `SHOUTS` and `shoutFor`: the crowd's moods and shouts.
- `src/duelShow.ts`: the page.
  - It makes the crowd's sprites (`UnitSprite.bystander`: no health bar), stages the two duellists' sprites through the walk-in
    (`UnitSprite.stage`) and poses the crowd.
  - It also builds the bar inside `#bossBar` (`#bossBar.duel`), the veil a tap skips through, and the names.
  - `main.ts` holds the fight while `holding`, holds the outcome while `ending`, feeds it each tick's events, and adds the crowd to the
    follow camera.
  - In a duel the opening foe grumble is not said: its crowd does the shouting.
- **The camera's safe area** (CAM-SAFE, `camSafe.ts`, from 0.463.0): the bar is drawn inside `#bossBar`, already a cover, and is registered in its
  own right too (`registerCamCover('#bossBar .dsTug')`). Checked at the three sizes: the two and the crowd stand clear below it.
- `src/duelShow.css`: the bar, the veil and the names.
- `src/quips.ts`: `crowdSays`.
- `src/duelRules.ts`: `clockWords`. The card's "alone in the ring for two and a half minutes" and the timeout's line follow the ring's
  clock.

**Art.** The bar's frame is the painted plaque (`pbPlaque`), the closest piece of the HUD kit. Its track, fills, knot and face rings are
CSS. `docs/notes/duel-show-art-prompts.md` has the ChatGPT prompt for a painted tug-of-war bar: its frame, the two fills, the knot and the
swing's flare. Nothing new is loaded by URL, so the service worker's list is unchanged.

## Longer duels without changing who wins

Measured with `npm run balance -- --no-tables --duel --duel-seeds 4 --only orcs,undead,beasts,wildwood,labyrinth,ogres`, which now also
prints each run's lengths and outcome shares (`--duel-soften`, `--duel-clock`, `--duel-nem-hp`, `--duel-length` and `--duel-heal` try
others). That is every hero kind alone at its army's level, against six armies' captain and boss nemeses, at Might 1, 5 and 10, four
seeds, plain and with its Dread: 20,160 duels a run. "In all" is the plain duels. One run's binomial noise is about half a point overall,
and about a point an army.

**The lever.** Every blow in the ring lands softer by one factor (`DUEL_LENGTH.soften`, `Battle.duel.soften`, in `hurt`), and the ring's
clock is longer to match (`DUEL_LENGTH.clock`, `duelMs()`).

**Two corrections were needed** to keep who wins, each measured:

1. **A boss's great blows.**
   - A boss nemesis's signature blows run on the battle's clock: the first 5 s after it acts, then every 9 s, and the rage version after
     40 s.
   - In a fight 2.2 times as long it would fire 2.2 times as many relative to the health at stake, and it would rage in most long duels.
   - So in a duel they come that much slower and the rage that much later (`bossAttacks.ts`, `duelSlow`).
   - Without this, the bosses' duels fell from 55.9% to 50.7%.
2. **The champion's stuns and other fixed-length effects** count for less in a longer fight, and a hero has far more of them than a
   nemesis. A trim on the nemesis's health in the longer ring (`DUEL_LENGTH.nemHp`, x0.95, part of `duelShare`) gives that back.

**Set aside.**

- **Raising both duellists' health** (the other lever the director named, `--duel-length`), even with their healing raised with it
  (`--duel-heal`), took the bosses' duels to 42 to 45%. Their signatures, on the battle's clock, did the damage.
- **Softening heals with the blows** (`--duel-heal` with `--duel-soften`) cost the champions too much: 60.2% in all.

| | in all | with its Dread | captain | boss | won / lost / out of time | length: mean, quartiles (s) |
| --- | --- | --- | --- | --- | --- | --- |
| **Before** (x1) | **63.6%** | **74.0%** | 71.3% | 55.9% | 68.8 / 29.0 / 2.2% | **12.0**; 6.6 / 9.3 / 13.6 |
| Both healths x2.2 | 55.2% | 66.5% | 67.9% | 42.5% | 60.9 / 35.7 / 3.4% | 27.5; 14.4 / 20.0 / 29.2 |
| Both healths x2.5 | 54.0% | 64.9% | 67.6% | 40.3% | 59.4 / 36.8 / 3.8% | 31.4; 16.3 / 22.6 / 33.3 |
| Healths and heals x2.2 | 55.4% | 66.0% | 66.3% | 44.5% | 60.7 / 35.0 / 4.3% | 29.7; 14.7 / 20.8 / 31.5 |
| Blows /2.2 | 60.3% | 70.4% | 69.9% | 50.7% | 65.4 / 30.8 / 3.8% | 28.8; 14.7 / 20.7 / 30.5 |
| Blows /2.2, signatures slowed | 61.6% | 70.8% | 69.9% | 53.3% | 66.2 / 30.1 / 3.7% | 27.9; 14.3 / 20.3 / 29.6 |
| ... clock x2.5 | 61.7% | 70.9% | 70.0% | 53.4% | 66.3 / 30.2 / 3.5% | 28.6; 14.3 / 20.3 / 29.6 |
| ... heals softened too | 60.2% | 70.4% | 68.0% | 52.4% | 65.3 / 31.6 / 3.1% | 27.3; 14.1 / 19.8 / 28.4 |
| ... nemesis health x0.93 | 64.7% | 73.3% | 73.3% | 56.2% | 69.0 / 27.8 / 3.2% | 27.1; 13.5 / 19.3 / 27.9 |
| ... nemesis health x0.95 | 63.7% | 72.4% | 72.2% | 55.2% | 68.1 / 28.6 / 3.4% | 27.6; 13.7 / 19.6 / 28.5 |
| **... and the two armies re-tuned (shipped)** | **63.5%** | **73.3%** | 71.2% | 55.8% | 68.4 / 28.2 / 3.4% | **27.3; 13.5 / 19.2 / 28.1** |

**The armies.** Two armies moved far further than the rest, whatever the lever:

- the Undead Legion fell in every stretched run (to 45 to 50%): a longer fight helps its nemeses;
- the Beast Packs rose once their bosses' signatures were slowed (to 76 to 80%).

Their own duel factors (`DUEL_ARMY`, which phase 4 tuned the same way) are re-tuned for the longer duel, each measured on its own army:

- the Undead Legion x1 to **x0.8**: 62.3%;
- the Beast Packs x1.35 to **x1.46**: 64.8% (x1.7 gave 39.1%).

| | Before (x1) | After (shipped) |
| --- | --- | --- |
| Orc Warband / Undead Legion / Beast Packs | 55.8% / 62.4% / 65.8% | 54.2% / 62.3% / 64.8% |
| The Wildwood / the Labyrinth / Ogre Clans | 71.4% / 65.8% / 60.4% | 71.6% / 68.2% / 60.1% |
| Front-liners / strikers / back-liners / support | 57.2% / 62.2% / 68.8% / 66.1% | 56.5% / 60.4% / 68.9% / 68.9% |
| Captains / boss nemeses | 71.3% / 55.9% | 71.2% / 55.8% |
| In all / with its Dread | 63.6% / 74.0% | 63.5% / 73.3% |
| Won / lost / out of time | 68.8% / 29.0% / 2.2% | 68.4% / 28.2% / 3.4% |
| Length, mean / median (s at x1) | 12.0 / 9.3 | **27.3 / 19.2** |
| ... quartiles, 10th to 90th | 6.6 to 13.6, 5.0 to 19.8 | 13.5 to 28.1, 10.1 to 44.9 |

**Where it reads narrowly:**

- **The aim was 20 to 30 s.** The mean is 27 s and the median 19 s: half the duels last 13 to 28 s, and a long tail runs to 45 s and more.
- **The outcome shares are within a point** but for time, 2.2% to 3.4%. The new clock is long enough that this is the stalemates
  (neither side able to wear the other down), which softer blows lengthen more than the rest.
- **The single kinds move more than the whole does.** For example the Knight goes from 47% to 55% and the Wanderer from 43% to 60%; the
  Lightning Mage from 82% to 77% and the Dhampir from 85% to 72%. The Knight's timeouts fall from 37 to 21, with the clock now longer than
  its slow fights. The kinds outside 40 to 75% are much the same set as before: 21 now, 22 before.

**Recordings.** No recording moved. The pinned fights (`nemesis-regression`, `stand-regression`, `ailments-identical`) play no duel, and the
War's bot takes none unless asked (`WAR_BOT.duels`). The only tests that changed are the duel's own:

- `test/duel.test.ts`: the ring's clock is `duelMs()` where it was `DUEL_MS`, and the Vain test expects a Vain blow's tenth and then the
  ring's softening.
- `test/duel-show.test.ts`: new, the softening, the clock, the signatures' rage and the card's words.

## Checks

- `npm run typecheck`: clean.
- `npm run web`: builds.
- **The full `npm test`: 3,056 tests, all passing** on 0.460.0, and again after main (0.466.0) was merged in: **3,093 tests, all
  passing**, with `tools/duel-show/shots.mjs`'s checks passing there too. That includes:
  - `test/duel-show.test.ts` (6 tests): the crowd's places (its side, facing in, one to a tile, the lanes open, standing ground only, the same
    every time); the walk-in's way and time, and reduced motion's beat; the bar's point, leader and swing; the moods and shouts; the
    softened blows, the clock, the signatures' later rage, the trim in the share, and the card's words;
  - `test/duel.test.ts` (as above);
  - `test/painted-buttons.test.ts`: `duelShow.css` comes before the painted buttons' sheets, which stay last.
- `node tools/duel-show/shots.mjs` (all checks passed at 393 x 852, 360 x 780 and 412 x 915):
  - the walk-in holds the fight before its first tick;
  - the crowd stands round the ring (seven, at Hask's wave), with only the two in the battle;
  - the fight begins after the walk-in;
  - one bar with two faces, on the screen;
  - the bar's point moves;
  - the end's show plays before the outcome;
  - reduced motion holds a short beat, then fights;
  - a tap skips the walk-in;
  - no page errors.
  - Frames: `strip-walk-<w>.jpg` (0 to 2.3 s), `strip-fight-end-<w>.jpg` (the fight at 1.5 and 4 s, the end at 0.2, 0.9 and 1.6 s, the
    result), `beat-393.jpg`, `fight-393.jpg` and `still-300-393.jpg` (reduced motion).
- The three cues measured with `node tools/audio-mix/measure.mjs --only cues` (above).
- The duel table: the runs above, about five minutes each at x1 and ten stretched.
