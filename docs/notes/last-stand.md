# The Last Stand

The Last Stand replaces the endless Tower (the spire climb). It was too like the Calamity: both were a map of fights. The
Last Stand is one endless battle on a big square field. A king stands on a raised keep in the middle; the foes come in from
all four edges, wave after wave, bigger each time; the run ends when the king falls. The camp's Tower spot keeps its
building art and its unlock (15 stars); it is now called **The Last Stand** (the camp's plate says "Last Stand") and shows
the best wave.

Status: **plan** (this section is the plan; the "What was built" section below is filled in as each step lands).

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
