# A rune for the first wave (RUNE-WAVE-ONE)

The owner said yes to "should the first wave give a rune?". Under FEWER-RUNES ([fewer-runes.md](fewer-runes.md)) a won wave gave a rune
only every fourth wave and on the last, so a run's heroes fought waves 1 to 4 bare. Now **winning wave 1 gives a rune too**
(`waveGivesRune` in `src/sim/runes.ts`: the first wave, every fourth, and the last). Everything else FEWER-RUNES set is as it was: the
runes' strengths (`RUNE_STATS`, `RUNE_SCALE.k` 1, untouched), the Calamity's one-in-three, the bosses' runes, the road, the merging.

- **No new randomness.** Wave 1's rune comes from the same side stream every won wave's rune always did (`waveRune`: `RUNE_SALT`, the
  wave's stage, `WAVE_SOURCE`), so no other roll of the run moves. The identity fixtures agree: only `daily`, the one recorded scenario
  whose heroes wear runes from a wave's rune, was re-recorded (`spells-identity` e42643a5, `ailment-logs` 43fa1cd4); every other keeps its
  hash. The Calamity has no waves and does not change.
- **A run gives one more rune.** (`node tools/fewer-runes/count.mjs --runs 30`, main 0.571.0 against this branch.) Nothing was taken away
  elsewhere to pay for it (the director's call).

  | Run | runes before | runes now | worn strength a fight, before / now |
  | --- | --- | --- | --- |
  | Orc Warband, Lv 12 | 6.2 | 7.2 | 10.0 / 13.5 |
  | Undead Legion, Lv 18 | 5.4 | 6.3 | 9.6 / 13.1 |
  | The Wildwood, Lv 28 | 6.2 | 7.5 | 13.4 / 17.3 |
  | The daily | 3.9 | 5.3 | 5.9 / 9.5 |
  | A quest battle | 0.9 | 1.6 | 0.0 / 2.1 |
  | The Calamity | 3.1 | 3.1 | (no waves) |

  (The daily and the Wildwood gain more than one because more runs now go further. "Worn" is the strength the heroes wear at a fight's
  start, in old level-I runes: one rune worn from wave 2 is worn for most of the run, so it counts for more than its share of the total.)
  Against the old game before FEWER-RUNES, an army run now has about 7 runes where it had 17.
- **Balance** (main 0.571.0 against this branch, the same seeds):
  - The climb (`CLIMB_ARMIES=4 npm run balance -- --no-tables --climb --saves 120`), mean tries: Orc Warband 1.8 and 1.8, Undead Legion
    3.6 and 3.5, Beast Packs 4.1 and 3.6, The Wildwood 2.1 and 1.9; all cleared both ways.
  - The daily (`npm run daily-rate -- --days 120`): with the run's lives 99% both ways; with no lives 72% to 77% (Boar King 30% to 39%,
    Lich King 69% to 81%, Orc Warlord 81% to 88%). Before FEWER-RUNES it was 66%.
  - So the first rune makes the opening a little easier, most of all the no-lives daily. If that is too much, the knob is not the runes'
    strength (the owner keeps it) but the count: e.g. dropping the fourth wave's rune (`RUNE_EVERY`) to keep the total as it was.
- **The page.** The wave card lists wave 1's rune as it lists any find; the empty bag's line now says "the first wave, every fourth, the
  last and the bosses bring runes".
- **The first rune is always one a hero can wear** (the director's call: an unwearable opener defeats the point). One rune in ten is a
  Keystone, never worn; a Keystone rolled for wave 1 is carved again as one of the seven kinds, from its own side stream
  (`openerKind`: `mixSeed(seed, RUNE_SALT, OPENER_SALT)`), so no other roll moves. Later waves' runes may still be Keystones. No recorded
  identity scenario opened on a Keystone, so no hash moved for this.

## Checks

- `npm run typecheck`: clean.
- `npm test -- runes rune-bench run-gear events recap-reveal tips spells-identity ailments-identical first-hour calamity tower mystery calMapRewards`:
  all pass. `test/runes.test.ts` checks the rule (wave 1 gives a rune and the wave card lists it, wave 2 does not, an army of fifteen gives
  five: waves 1, 4, 8, 12 and 15; over 600 runs wave 1's rune is never a Keystone, while the fourth wave's still can be). `test/events.test.ts`'s cursed path, won on wave 1, now finds its prize and the wave's rune.
- `npm run web`; `node tools/rune-wave-one/shots.mjs` at 393x852, 360x780 and 412x915: an Orc Warband run's wave 1 won, its card listing
  the rune, and the rune bench before wave 2 holding it; no sideways scroll and no page errors. Pictures in
  [docs/samples/rune-wave-one/](../samples/rune-wave-one/).
