# The daily has a goal

The owner's ask: "The daily should have a goal. Not just be endless." Chosen: a fixed run with a boss of the day, and a daily
chest for clearing it.

## The run

- **Ten waves** (`src/sim/daily.ts`, `DAILY_WAVES`): eight field waves, a mid-boss at wave 5 (`DAILY_MID`) and **the boss of the day
  at wave 10**. Clearing the boss wins the daily; the run is over and `run.cleared` is set, as an army's is.
- **The boss of the day** is chosen from the date alone, by a side stream of it (`mixSeed(date, 0xb055)`), from the early armies'
  bosses (`DAILY_ARMIES`: Orc Warlord, Lich King, Boar King, Grove Spearlord, Minotaur Champion, Horned Ogre). That army is the day's
  *host*: its field waves (thinned from 13 to 8, so they ramp from three foes to six), its mid-boss and its last boss. Every boss
  has the same hp and attack (`DAILY_LAST_STATS`) times a small per-army ease (`BOSS_SCALE`: the lich's kit is the harshest, the
  ogre's the mildest), so a day is only as hard as its boss's skills.
- **It is an `Army` in shape** (`dailyArmy(date)`, id `daily<date>`, in no list): `waveArmyOf(run)` in `run.ts` returns it for a
  daily run (and the army for an army run), and the wave boosts, the boss and its intro, the long map between waves, "Wave 4/10",
  the walk across and the mid-boss gear drop are all the armies' own code. `armyOfRun` still means a real army only, so a daily keeps
  no army record, no army stars and no auto-replay.
- **Kept as it was**: the starting five, the starting gold, no castle, the day's land (`dailyArea`), hiring, events, the two
  hearts (retries; `docs/notes/lives.md`). The foes are the daily's own strength: `DAILY_START` 0.56 at wave 1 (0.57 before the height pass: `docs/notes/height.md`) and +15.5% a wave.
- A daily's wins no longer count towards the endless climb's furthest stage (`bestStage`) or its per-stage stars: its ten waves are
  its own.

## Win or lose

- **Clear**: banner "Daily cleared!", the waves' crowns, a daily chest in the stash, the bonus stars.
- **Loss** once the hearts are spent: "Daily over" with "wave 6/10" under it, and the crowns of the waves cleared before it
  (`dailyCrowns(n)`; each wave pays `6 + 2 x wave`: a clear pays 170, a fall at wave 6 pays 60).
- **The first play of the date counts** for rewards and for the record; later plays are **practice**: they pay nothing (no crowns, no
  chest, no record, no achievements), and say "(practice)" on the card. (Heroes still gain their fight XP.)
- Progress reads "Wave 4/10 · Boss" in the status line, "daily · wave 4/10" on the Continue card; the result is "Daily cleared!" or
  "Daily over · wave 6/10".

## The daily chest

`rollDailyChest(seed, bonus)` in `armyStars.ts`; the seed is the save's seed and the date (`dailyChestSeed`), fixed when it is earned.
It goes into the stash (`StashChest` with `daily: <date>` and `bonus`) and opens through the same `openChest` and `lootOf` as an army's:

| | Contents |
| --- | --- |
| Crowns | 240, +60 for each bonus star (x 0.85 to 1.15) |
| Shards | 3, +1 for each bonus star: unlock shards for a hero not owned, rank shards for one owned (`swapContent`: a content hero not owned is swapped for a pullable one; no chest gives a content hero whole) |
| Hero draw | 30%: 2 unlock shards of a hero not owned, or 2 rank shards of one owned |
| Gear | 45%, +15% for each bonus star; bronze quality, silver with both stars; item level of the second army's chests |

Bonus stars (`dailyBonus`, kept in `Meta.daily[date].stars`): **no heart spent**, and **cleared in 2:20 of battle** (`DAILY_TIME_MS`,
14 s a wave; about half of the greedy player's clears come in under it). I used "no heart spent" rather than "no hero lost": the
greedy player loses about six heroes in a clear (they are cheap to hire back), so a no-loss star would never be earned.

Next to the army chests: a daily chest is about a bronze chest of the first army plus half again (150 crowns, 2 shards, 35% gear),
and a clear's 170 crowns of waves on top; an Orc Warband replay (all fifteen waves) pays about 50. It has its own picture (`src/art/ui/chest-daily.png`,
the silver chest with its wood hue-shifted to violet; `CREDITS.md`), a violet glow and rays when opened, and "Daily" under it on the
camp's cart. It ranks with a silver chest on the cart (`bestChest`).

## Measured

`npm run daily-rate` (`tools/dailyRate.ts`, with `playDaily` in `tools/autoplay.ts`) plays the daily as the greedy player does for the
armies: a fresh save (every hero level 1, no castle, no gear from the meta), summoning with all its gold, the five strongest in
`autoFormation`, gear dressed from the run's drops, and on a lost wave it spends a heart (a retry with the extra gold) as a player would.
Over **336 dates** (every boss 46 to 65 times):

| | Clear rate |
| --- | --- |
| With the two hearts | **69%** (Boar King 69, Grove Spearlord 75, Horned Ogre 70, Lich King 67, Minotaur Champion 71, Orc Warlord 62) |
| First loss ends it | 49% |

A run spends 0.9 hearts on average; of the clears, 72% spend none, 55% are under 2:20, 36% get both stars, 54% one and 10% none.
The numbers were set by `DAILY_START`, `DAILY_GROWTH`, `DAILY_LAST_STATS` and `BOSS_SCALE`; the cliff is the boss (the field waves
are won nearly always), so a small change moves the rate a lot. A stronger save (levels, ranks, gear) clears more: the bot is the
floor. `test/daily.test.ts` holds the greedy player's rate between 50% and 85% over 56 dates.

## The unlock pace (`npm run unlock-pace`, 30 seeds)

The model now plays the daily at a 70% clear rate: a clear pays 170 crowns and a daily chest (a random 0 to 2 bonus stars), a fall at
wave 8 pays the waves before it (it used to pay a flat 300 crowns).

| Heroes | Before | After |
| --- | --- | --- |
| 10 | day 10 | day 8 |
| 20 | 40 | 36 |
| 30 | 75 | 70 |
| 40 | 125 | 112 |
| 45 | 186 | **186** |

The 45th hero is as late as before (the last bar is 100 shards, filled by pulls, which the crowns decide); the middle of the roster
comes a few days sooner, from the chest's shards.

## Records, achievements and the camp

- `Meta.daily[date]`: `best` (the old score, still written: waves cleared x 100 + stars x 10) and `plays`, and the new optional
  `cleared`, `wave` (the furthest wave fought), `over` (the counted run has ended) and `stars` (the bonus stars, 0 to 2). Old records
  load as they were; `dailyStatus` reads one with a score and no wave as a fall at wave `best / 100 + 1`.
- **"Daily Champion"** (`daily1000`, id kept): "Score 1000 in a daily challenge" became **"Clear 5 daily challenges"** (a bar,
  0/5). **"Daily Devotee"** (`daily`): "Finish a daily challenge" became **"Clear a daily challenge"**. Neither counts a practice run.
- The camp's notice board names the day: the plate's heading is the boss ("Orc Warlord", wrapping to two lines for "Minotaur
  Champion") with the standing under it ("not tried", "wave 4/10", "fell at 6/10", "cleared ✓"); `dailyLine` gives the whole line,
  "Today: Orc Warlord · not tried", for the screen reader. A plate holds three 12px lines and no more (`PLACE.plate`; the camp test
  keeps the plates above the fire), so "Daily" and "Today:" are left to the signpost and the aria label. A new daily wears the red
  dot, a cleared one the green check.
- Tapping the board opens the **start card** (`src/dailyView.ts`, `src/daily.css`): the boss's face and name, the land, the run, the
  hearts, the chest, and Fight! (or Practice for a date already played). A daily going on is resumed without it.

## Tests

`test/daily.test.ts` (new): the fixed length and boss waves, the boss of the day by date, a clear (crowns, the stash chest, once) and a loss
(consolation, no chest), practice pays nothing, the bonus stars, the chest against the shard rules over 120 saves (no content hero given,
unlock shards or rank shards), the chest's seed, the stash through a save, old records, determinism, and the greedy player's clear rate.
Updated because they encoded the endless daily: `modes.test.ts` (first play and practice, resuming, the camp line, the saved record;
the score test now notes it is only kept for old records), `achievements.test.ts` (the two daily achievements), `armies.test.ts` (the
daily's stage-10 foes are the boss of the day, not the endless tower's), `long-map.test.ts` (a daily has a long map; a tower has none).
Nothing was loosened.

## Screenshots

`docs/samples/daily-goal-<scene>[-360x780].png`, from `node tools/daily/shots-daily.mjs out/web [WxH]`: `board` (the camp's notice board), `start`
(the start card), `wave` (wave 4 laid out) and `wave-fight`, `boss` (the boss intro), `cleared` (Daily cleared! with the chest), `recap`,
`camp-chest` (the daily chest on the cart), `chest-open` and `chest` (opening it), `loss` and `loss-recap`.

## Not sure about

- Practice pays nothing at all (the owner said "no reward"); today a practice run paid the stage crowns. Easy to give a small share back.
- Hero levels and ranks from the meta still apply to the daily's squad (as before), so a late save clears it more easily; the daily is
  tuned for a fresh save as asked. A flat-power daily (levels ignored) would be fairer, but is a change to the rule.
