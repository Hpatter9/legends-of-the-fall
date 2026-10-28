# Last Stand

Last Stand replaces the endless Tower (the spire climb). It was too like the Calamity: both were a map of fights. The
Last Stand is one endless battle on a big square field. A king stands on a raised keep in the middle; the foes come in from
all four edges, wave after wave, bigger each time; the run ends when the king falls. The camp's Tower spot keeps its
building art and its unlock (the stars `MODE_NEED.tower` asks for, read from `modeUnlock.ts`, never written into the Last Stand's code); it is now called **Last Stand** (the camp's plate says "Last Stand") and shows
the best wave.

Status: **built** (plan first, results after it).

## Plan

### Pieces

| File | What it holds |
| --- | --- |
| `src/sim/standField.ts` | the field: a 24x24 board from the seed (`makeBoard` for the land, then the keep set into the middle), the king's tile, the guard spots, the edge tiles the foes enter by |
| `src/sim/stand.ts` | the run: waves, the break, gold and purchases, XP and in-fight level-ups, the king's hp, rewards, the save |
| `src/sim/standAi.ts` | the AI of a stand battle: leashed heroes, foes that go for the king (a flow field, not a walk per foe) |
| `src/sim/battle.ts` | one flag, `Battle.stand`; `decide` hands over to `standAi` when it is set, and `stepBattle` ends the fight on the king's fall. Nothing else changes: an ordinary fight takes the same branches it did |
| `src/standView.ts` + `src/stand.css` | the page: its own Pixi canvas over the page, the bottom shop bar, the top bar (wave, king hp, gold), arrows, the countdown, the end screen |
| `tools/stand-balance.ts` | the headless runner (`npm run balance -- --no-tables --stand`) |
| `test/stand.test.ts`, `test/stand-regression.test.ts` | the rules; and the pinned outcomes of twelve ordinary fights from before the flag |

### The rules in one place

- **Field.** 24x24, the land is one of the seventeen (`AREAS`), drawn from the seed. `makeBoard(seed, area, 24, 24)` lays the
  hills, platforms, pits, boulders and ground; `standField` then clears a plaza and raises the keep: a 3x3 top at height 4 with
  a ring of steps (3, then 2) so every side can be climbed, and the king on the middle tile. The result is checked with
  `boardOk` (every tile reachable by a one-step climber); if a seed fails, the plain land is used round the keep.
- **King.** A unit of side `hero` (`UNITS.standKing`, a `summon` so it is not one of the placed heroes), never moves, never
  strikes. Foes strike him like anyone. His hp is `KING_HP`, shown over his head and in the top bar. The run ends when he falls.
  He casts the owner's equipped king spells (the same mana and cooldowns as a normal fight); the spells are tapped onto the field.
- **Waves.** Endless. Wave `n` has `count(n)` foes (capped at `FIELD_CAP` alive at once); what would be past the cap is paid
  in strength instead (`strength(n)`). Every 5th wave is a boss wave (the boss band, the boss drawn big). The foe band changes
  every 3 waves, drawn from `FIELD_BANDS`, with the army kinds (`foes.ts`) mixed in later. The edges a wave comes from
  (`waveEdges`) are shown by arrows during the break before it. Foes come on over the first seconds of the wave, not all at once.
- **Break.** When the last foe falls the wave pays its gold, the heroes gain wave XP, and a 5 second break begins (50 ticks, a
  visible countdown). `Go` ends it early. The next wave starts when it runs out.
- **Gold and shop.** Gold comes from kills (`killGold`) and wave clears. Four one-tap buys: hire a hero (to the nearest free
  guard spot, or the bench when the field is full), level up a hero (the lowest-level hero, or a tapped one), a relic from a small
  offer of three (drawn once per break), heal the king. All of it works any time, not only in the break.
- **Levels.** Each hero keeps a run level (`lv`) on top of its lasting level and gear. Kills give XP (the killer fully, the
  others a share); a wave clear gives every hero XP. A level-up happens in the fight, at once: stats rise by `LV_HP` and
  `LV_ATK` a level, the hero is healed by the gain, a burst plays and "Lv N" pops. No choices, no pauses.
- **Hero AI** (`standAi.ts`). Each hero has a post (the tile it was placed on) and a leash (`LEASH`, a few tiles). It strikes
  what is in reach from where it stands; it walks only to a tile within its leash from which it can strike; with nothing left
  in its zone it walks back to its post. Tanks (melee, high defence) choose the foe nearest the king and have the longest
  leash; shooters have a short one and stay near the post. A hero never chases past its leash, so it cannot run off into the horde.
- **Foe AI.** Foes follow a flow field to the king (one Dijkstra from the king per jump class, built once; a 50-foe wave
  costs one table look-up a step, not fifty path searches). A foe strikes the king if he is in reach, else a hero in reach
  (the one that blocks it), else steps along the field, round whoever stands in the way. Shooters stop and shoot what is in range.
- **Time limit.** A wave that drags on (nobody can finish it: 75 s) enrages its foes (attack up each ten seconds), so a run cannot last forever.
- **Score and pay.** The score is the best wave reached (`Meta.stand`). A run pays, by waves cleared, what the old tower paid for
  floors: the crowns of each cleared wave (`stageCrowns`), chests into the stash (bronze every 8 waves, silver every 13, gold
  every 39), and a chance of a piece of equipment (`gearChance`). Shards ride in the chests, as before.
- **Save.** `legends.stand`, written at the start of every break. It is a small record (seed, wave, gold, relics, heroes with
  levels and posts), not the battle; a resume starts at that break's end, with every hero whole. It is in `SAVE_KEYS`.
- **Old saves.** A spire run in `legends.tower` (and one still in `legends.run` with mode `tower`) is dropped on load, and the
  run's progress is paid once at its worth: the crowns of the floors it had cleared, in the next menu's note. `Meta.tower` (best
  floor) stays as the old record, and the old achievements keep what they paid.
- **Removed.** The spire's map page, nodes, shop, campfire, mystery and elite screens, as entries to a run; and the mode `tower`.
  Kept because the Calamity (and its tests) use them: `run.tower`, `TowerView` for the Calamity's map, the shared tower rules (`tower.ts`).

### Performance

A wave-30 field is about 50 foes and 5 to 10 heroes. The field is drawn as one baked texture (`BoardView.bakeField`), not 576
containers. Foe sprites are pooled and reused; health bars are drawn only for hurt or near-the-king foes; the flow field is
built once; the heroes' leashed walks search only the tiles near the post; dead foes are dropped from the unit list after
1.5 s; nothing allocates per frame in the page's loop. Numbers are in the section "Performance" below.

### Order of work

1. The plan, and the pinned outcomes of ordinary fights (this note, `test/stand-regression.test.ts`).
2. The sim: field, flag in `battle.ts`, AI, waves, shop, XP, rewards, save, with tests.
3. The balance runner and its table.
4. The page.
5. The spire's removal, the migration, the camp's rename.
6. Screenshots (`docs/samples/last-stand-*.png`), the performance numbers, this note's tables.

## What was built, and what differs from the plan

- Everything in the plan table exists. The page draws into the page's own Pixi canvas (not a second one): the ordinary board is hidden
  while the Stand is up (`body[data-stand]`, `Game.hideBoard`). Pan is one finger, pinch is two; the camera frames the king, the heroes
  and the foes within 10 tiles and eases out as a wave grows. Zoom is in whole device pixels (`n / devicePixelRatio`: 1/3, 2/3, 1,
  4/3, 5/3 on a 3x phone; 1 on a 1x screen). Heroes move by tapping one then a tile, or by dragging it, in the deploy phase, in a break or
  mid-wave (its post moves and it walks there).
- **Skills and the leash.** A hero's skill is cast as if no foe outside its zone existed, and a dash or blink that would end past the
  leash stops on the last tile of its way inside it (`castInZone`). The test holds every hero on the field to its leash every tick.
- **Fallen heroes** stay down for the rest of the run (STAND-003, `docs/notes/stand-overhaul.md`; before, they rose at their posts at the next wave clear); the others mend 35%. The king is not healed by it.
- **Pooling and cost.** Foe sprites are reused by kind and size (`UnitSprite.rebind`); health bars of units with no skill meter redraw only
  when they change; sprites far off the screen are hidden and looked at every eighth frame; the field is one baked texture
  (`BoardView.bakeField`); corpses are dropped from the unit list unless something still points at them.
- **Sound.** New cues `standBoss` (a boss wave begins) and `kingHit` (throttled); the rest is the usual fight sound.
- **King's sprite**: composed from the packs (see CREDITS).
- **Start**: the party and meta levels as the armies use them (rank, level, equipment, talents); run levels come on top.

### The old tower

Gone from the game: the Tower's entry, its saved climb (`legends.tower` and the very old ordinary-slot case are closed on load by
`migrateOldClimb`, which pays the climb's chests and equipment once and shows a line on the home screen), `tools/tower-balance`'s tower
table, the camp's "Tower" name (now "Last Stand", best wave on its plate; the unlock is still `MODE_NEED.tower`). `legends.stand` is the new save (in
`SAVE_KEYS`; `legends.tower` stays there for old saves). The tower achievements now count Last Stand waves too.
**Kept, because the Calamity and its tests run on them:** `run.tower`, `tower.ts` (maps, elites, twists, mystery, healing, `settleTower`),
`TowerView` (the Calamity's map), and `towerRun` (a run-with-tower-state used by many Calamity-side tests as a fixture; no page starts it
now). I did not rewrite those ~100 test uses; say if you want `towerRun` folded into a test helper.

### Pay (compared with the old tower)

Crowns: the sum of `stageCrowns(w)` for each wave cleared plus `runCrowns(best)` at the end: the old tower's per-floor pay with waves
for floors. Chests: bronze every 8 waves, silver every 13, gold every 39 (the old act boss rhythm); equipment chance `gearChance`.
A level-1 run of about 5 waves pays about 150 crowns, about the old tower's median.

### Balance

`npm run stand-balance` (or `npm run balance -- --no-tables --stand`): 30 greedy runs a row, eight heroes (knight, paladin, samurai,
kunoichi, archer, ranger, wizard, cleric) all at the level, nothing worn, no castle; the greedy player buys the first relic offered, levels
the weakest hero, and heals the king under 55%. Wave the king fell in:

| Hero level | Median | Mean | Min | Max |
| --- | --- | --- | --- | --- |
| 1 | 5 | 5.3 | 5 | 6 |
| 10 | 15 | 15.9 | 13 | 19 |
| 20 | 21 | 21.2 | 14 | 32 |
| 30 | 30 | 29.8 | 20 | 40 |
| 40 | 32 | 32.0 | 20 | 46 |
| 60 | 33 | 34.3 | 20 | 62 |
| 80 | 40 | 39.0 | 20 | 75 |
| 100 | 40 | 40.8 | 27 | 85 |

Targets: level 1 about 5-8 (6), level 30 about 20 (30: a little high, the milestone levels are strong), maxed 40 or more (median 40, mean
about 40). Boss waves are the walls (the maxed medians sit on the wave-40 boss). The table is from the code merged with main 0.150. The levers are `WAVE_GROWTH` (0.21), `WAVE_STEP` (2),
`bossShare` and the prices. No run lasts for ever: a wave left alone is enraged after 75 s, and the longest run here ended in the 60s-70s.

### Performance

A wave-30 field is about 50 foes and 5 to 10 heroes. The field is drawn as one baked texture (`BoardView.bakeField`), not 576
containers. Foe sprites are pooled and reused; health bars are drawn only for hurt or near-the-king foes; the flow field is
built once; the heroes' leashed walks search only the tiles near the post; dead foes are dropped from the unit list after
1.5 s; nothing allocates per frame in the page's loop. Numbers are in the section "Performance" below.

### Order of work

1. The plan, and the pinned outcomes of ordinary fights (this note, `test/stand-regression.test.ts`).
2. The sim: field, flag in `battle.ts`, AI, waves, shop, XP, rewards, save, with tests.
3. The balance runner and its table.
4. The page.
5. The spire's removal, the migration, the camp's rename.
6. Screenshots (`docs/samples/last-stand-*.png`), the performance numbers, this note's tables.

## What was built, and what differs from the plan

- Everything in the plan table exists. The page draws into the page's own Pixi canvas (not a second one): the ordinary board is hidden
  while the Stand is up (`body[data-stand]`, `Game.hideBoard`). Pan is one finger, pinch is two; the camera frames the king, the heroes
  and the foes within 10 tiles and eases out as a wave grows. Zoom is in whole device pixels (`n / devicePixelRatio`: 1/3, 2/3, 1,
  4/3, 5/3 on a 3x phone; 1 on a 1x screen). Heroes move by tapping one then a tile, or by dragging it, in the deploy phase, in a break or
  mid-wave (its post moves and it walks there).
- **Skills and the leash.** A hero's skill is cast as if no foe outside its zone existed, and a dash or blink that would end past the
  leash stops on the last tile of its way inside it (`castInZone`). The test holds every hero on the field to its leash every tick.
- **Fallen heroes** stay down for the rest of the run (STAND-003, `docs/notes/stand-overhaul.md`; before, they rose at their posts at the next wave clear); the others mend 35%. The king is not healed by it.
- **Pooling and cost.** Foe sprites are reused by kind and size (`UnitSprite.rebind`); health bars of units with no skill meter redraw only
  when they change; sprites far off the screen are hidden and looked at every eighth frame; the field is one baked texture
  (`BoardView.bakeField`); corpses are dropped from the unit list unless something still points at them.
- **Sound.** New cues `standBoss` (a boss wave begins) and `kingHit` (throttled); the rest is the usual fight sound.
- **King's sprite**: composed from the packs (see CREDITS).
- **Start**: the party and meta levels as the armies use them (rank, level, equipment, talents); run levels come on top.

### The old tower

Gone from the game: the Tower's entry, its saved climb (`legends.tower` and the very old ordinary-slot case are closed on load by
`migrateOldClimb`, which pays the climb's chests and equipment once and shows a line on the home screen), `tools/tower-balance`'s tower
table, the camp's "Tower" name (now "Last Stand", best wave on its plate; the unlock is still `MODE_NEED.tower`). `legends.stand` is the new save (in
`SAVE_KEYS`; `legends.tower` stays there for old saves). The tower achievements now count Last Stand waves too.
**Kept, because the Calamity and its tests run on them:** `run.tower`, `tower.ts` (maps, elites, twists, mystery, healing, `settleTower`),
`TowerView` (the Calamity's map), and `towerRun` (a run-with-tower-state used by many Calamity-side tests as a fixture; no page starts it
now). I did not rewrite those ~100 test uses; say if you want `towerRun` folded into a test helper.

### Pay (compared with the old tower)

Crowns: the sum of `stageCrowns(w)` for each wave cleared plus `runCrowns(best)` at the end: the old tower's per-floor pay with waves
for floors. Chests: bronze every 8 waves, silver every 13, gold every 39 (the old act boss rhythm); equipment chance `gearChance`.
A level-1 run of about 5 waves pays about 150 crowns, about the old tower's median.

### Balance

`npm run stand-balance` (or `npm run balance -- --no-tables --stand`): 30 greedy runs a row, the starting five at the level, nothing
worn, no castle; the greedy player hires up to seven heroes, buys the first relic offered, levels the weakest, heals the king under 55%.
Wave the king fell in:

| Hero level | Median | Mean | Min | Max |
| --- | --- | --- | --- | --- |
| 1 | 6 | 5.6 | 3 | 8 |
| 10 | 15 | 16.6 | 13 | 21 |
| 20 | 21 | 20.7 | 15 | 27 |
| 30 | 27 | 31.4 | 15 | 77 |
| 40 | 26 | 28.6 | 15 | 50 |
| 60 | 32 | 33.9 | 20 | 75 |
| 80 | 40 | 41.3 | 20 | 70 |
| 100 | 40 | 46.5 | 24 | 78 |

Targets: level 1 about 5-8 (6), level 30 about 20 (27, a little high), maxed 40+ (40-46). Boss waves are the walls (medians sit at 15,
20, 30, 40). The levers are `WAVE_GROWTH` (0.12), `WAVE_STEP`, `bossShare` and the prices. No run lasts for ever: a wave left alone is
enraged after 75 s, and the longest run of 240 here ended at wave 78.

### Performance

`node tools/stand/perf.mjs 30 60` (wave 30, ten heroes, about 45 foes at once, headless Chromium with software GL, 393x852): the page's own
JavaScript per frame averages 0.9 ms (sim 0.13 ms, sprites 0.14 ms), worst 6 ms; the sim runs 0.03 ms a tick in the balance runner. The
drawing is on the GPU on a phone; this machine cannot measure that, so a real-phone check is still owed.

### Screenshots

`docs/samples/last-stand-{deploy,wave3,wave25,boss-banner,boss,break,end}-{393x852,360x780,412x915}.png`, from `tools/stand/shots.mjs`
(`tools/stand/touch.mjs` checks the touch, `look.mjs` takes one view).

### Open points for the owner

- The mode's name ("The Last Stand") is mine; the camp plate reads "Last Stand".
- A run is saved at each break, not mid-wave: closing the page mid-wave resumes at the start of that wave.
- Flicker: the heroes' full skill meter still pulses as in ordinary fights (the flicker worker's area).

## The owner's refinement (eight heroes, no hiring)

- **Name:** "Last Stand", no "The", everywhere in the game's text.
- **Eight heroes from the start, none to manage.** A screen before the run picks the eight from the owned heroes (the party first, `Auto
  fill` takes the strongest left by level; `pickEight`). `ringPlan` sets them out round the keep: tanks out front, one to a side; fighters
  on the diagonals; shooters, casters and healers on the keep's steps near the king. They may be moved before wave 1 (tap a hero, then a
  tile) and, if wanted, later; nobody has to be. **No hiring and no bench** (`hire` is gone).
- **Support each other.** Leashes are a little longer for fighters (4) and tanks (5); shooters and healers (class `support`) keep 1, so
  they stay with the ring they were set in; a foe striking an ally inside a hero's zone is engaged by it. The leash is still strict, so no hero runs off into the horde.
- **Buying any time:** the bar is always up and works in the fight as in the break: level up (the weakest hero, or the one tapped), heal the king,
  and the three relics on offer (a new offer each wave). Two buttons and three chips: about a quarter of the screen at 393x852.
- **Re-aimed balance:** see the table above (eight heroes are much stronger than five; `WAVE_GROWTH` rose from 0.12 to 0.21 and `WAVE_STEP` from 1.5 to 2).
- The camera now never zooms out past about eight tiles across a phone (`SCALE_MIN`), framing the king, the heroes and the foes within 7 tiles.

## After merging main 0.150

- The field uses `makeBoard(..., 'classic')`: the new river and canyon layouts, deep water, walls and barrels would cut a 24x24 field; the plaza round the keep is cleared of walls, barrels and deep pools, and any left that would block a way in are removed.
- A hero in the Last Stand never slides on ice (the slide could carry it a tile past its leash). A hero shoved past its leash by a foe walks back, or fights where it stands if foes shut the way.
- The ordinary fights' pinned outcomes were re-pinned on main 0.150 (computed on a clean checkout of origin/main, not on this branch): the flag changes none of them.

## After merging main 0.153

- **Music:** the Last Stand uses `fightTrack` and `fightLevel` (`epicMusic.ts`): the boss track on a boss wave, else one of the three battle tracks by depth (waves 1-9, 10-24, 25 up); the track changes only when a wave asks for another. Leaving mid-wave calls `endFight()` (new in `sound.ts`) so the place's music returns.
- **Scenes:** the tower's talking scenes (the `spire` moments at 10, 25 and 50) now fire from the Last Stand's waves 10, 25 and 50, in the break after the wave, and the run waits while one plays. `eliteMet` and the other elite scenes belong to the Calamity's elites and are left as they are.
- Screenshots use `--use-angle=swiftshader` (`tools/stand/lib.mjs`).

## Making it harder (the owner: "Make Last Stand harder")

The medians had run too deep: a level-10 party got to wave 15 and a maxed one to 40. The aim: every wave past about 10 is a fight, and a
stronger party still goes further. Measured by `npm run stand-balance -- --levels 1,10,20,30,60,100 --attempts 30 [--smart]` (eight heroes,
nothing worn, no castle, from main 0.169). The wave the king fell in:

| Hero level | Before (greedy) | After (greedy) | After (attentive) | Target |
| --- | --- | --- | --- | --- |
| 1 | 5 | 4 (4-5) | 4 (4-5) | 4-5 |
| 10 | 15 | 10 (9-13) | 10 (9-10) | 9-10 |
| 20 | 21 | 13 (10-14) | 10 (9-14) | about 14 |
| 30 | 30 | 22 (10-40) | 18 (10-39) | 18-20 |
| 60 | 33 | 26 (10-40) | 24 (15-40) | 26-28 |
| 100 | 40 | 35 (15-79) | 40 (16-65) | 35-40 |

(medians, min-max in brackets; "before" is the table above.) The attentive buyer (`--smart`, `spendSmart` in `tools/stand-balance.ts`) takes a
relic when one is affordable, keeps the knight and paladin a level ahead of the rest, and heals the king below 40%. It lands within a few waves of the greedy
one (behind it at 20 to 60, ahead at 100: the medians sit on the boss waves, so a few waves either way is one wall), so paying attention is no shortcut. I did not re-run the attentive buyer on the old numbers. Level 30 is a little high and level 100 at the low end of its target; the spread of a row is wide (the maxed row runs from the 20s to the 70s) because a run lives or dies on a boss wave.

What changed (all in `src/sim/stand.ts`):

- **Waves grow faster, then ease.** `strength(n)` climbs `WAVE_GROWTH` 0.4 a wave to wave `WAVE_KNEE` (10), then `WAVE_GROWTH_LATE` 0.11. Before it was a straight 0.21 a wave. A steep start is what stops a level-10 party; a gentle late climb is what lets a level-100 party still pay for its levels (a straight steeper line flattened the high levels to the same wave as the middle ones in the sweeps). `WAVE_STEP` stays 2.
- **Boss waves are walls.** `bossShare` runs 0.5 to 1.0 (was 0.35 to 0.9).
- **Gold buys less.** `killGold` is halved (1 gold a kill at first; the wave clear and boss gold are as they were), and a level costs `25 + 11 * lv` (was `18 + 8 * lv`).
- **The king** is as he was (1000 hp, a heal gives 40%, price as before): the tighter waves came without making him a glass king, and the sweeps never ended a run on one stray hit. I left the heal alone because the attentive buyer already uses it at 40%.
- **Pay.** A cleared wave now pays `waveCrowns(n) = 8 + 16 * min(n, 8)` and the end's `runCrowns` share is gone (`meta.ts` is untouched; the Calamity still uses `stageCrowns`/`runCrowns`). Crowns of a run to the median wave, old rule at the old median against new rule at the new median:

| Hero level | Old median, old pay | New median, new pay |
| --- | --- | --- |
| 1 | wave 5, 125 | wave 4, 120 |
| 10 | wave 15, 715 | wave 10, 776 |
| 20 | wave 21, 1261 | wave 13, 1184 |
| 30 | wave 30, 2350 | wave 21, 2272 |
| 60 | wave 33, 2785 | wave 26, 2952 |
| 100 | wave 40, 3940 | wave 35, 4176 |

  Chests and gear still ride on waves cleared (bronze every 8, silver every 13, gold every 39), so they come a little less often at the same level; what they hold is unchanged.
- **Tests** (`test/stand.test.ts`, "how hard it is"): the knee and the boss walls, a level-1 party's median in 3-6 and a level-10 one's in 8-12 (five seeds each, through the balance runner), and the pay of the six rows within 15% of the old pay. Nothing else pinned the balance, so nothing was loosened.

## The targets after STAND-003 (the fallen stay down)

The owner kept the run harder when fallen heroes stopped rising (`docs/notes/stand-overhaul.md`): the medians measured then are the targets
now, not the "Making it harder" ones above. `npm run stand-balance -- --levels 1,10,20,30,60,100 --attempts 30` (greedy), the wave the king fell in:

| Hero level | Target now | Measured (median, min-max) | The old target |
| --- | --- | --- | --- |
| 1 | about 4 | 4 (3-4) | 4 |
| 10 | about 9 | 9 (7-10) | 10 |
| 20 | about 10 | 10 (9-12) | 13 |
| 30 | about 14 | 14 (12-21) | 22 |
| 60 | about 20 | 20 (13-92) | 26 |
| 100 | about 25 | 25 (15-86) | 35 |

`test/stand.test.ts` pins levels 1, 10 and 30 (five seeds each: 3-5, 7-10, 11-18). The pay per wave was not changed, so a run at the new
medians pays fewer crowns than one at the old (a question for the owner in the overhaul's note).
