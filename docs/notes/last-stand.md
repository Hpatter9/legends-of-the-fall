# The Last Stand

The Last Stand replaces the endless Tower (the spire climb). It was too like the Calamity: both were a map of fights. The
Last Stand is one endless battle on a big square field. A king stands on a raised keep in the middle; the foes come in from
all four edges, wave after wave, bigger each time; the run ends when the king falls. The camp's Tower spot keeps its
building art and its unlock (15 stars); it is now called **The Last Stand** (the camp's plate says "Last Stand") and shows
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
- **Fallen heroes** rise at their posts at the next wave clear (half hp); the others mend 35%. The king is not healed by it.
- **Pooling and cost.** Foe sprites are reused by kind and size (`UnitSprite.rebind`); health bars of units with no skill meter redraw only
  when they change; sprites far off the screen are hidden and looked at every eighth frame; the field is one baked texture
  (`BoardView.bakeField`); corpses are dropped from the unit list unless something still points at them.
- **Sound.** New cues `standBoss` (a boss wave begins) and `kingHit` (throttled); the rest is the usual fight sound.
- **King's sprite**: composed from the packs (see CREDITS).
- **Start**: the party and meta levels as the armies use them (rank, level, equipment, talents); run levels come on top.

### The old tower

Gone from the game: the Tower's entry, its saved climb (`legends.tower` and the very old ordinary-slot case are closed on load by
`migrateOldClimb`, which pays the climb's chests and equipment once and shows a line on the home screen), `tools/tower-balance`'s tower
table, the camp's "Tower" name (now "Last Stand", best wave on its plate; unlock still 15 stars). `legends.stand` is the new save (in
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
