# Height: platforms, jumps and fights won from above

The owner's ask: more height variety on the battlegrounds, height that matters (more damage, and heroes that use it), and a
jump stat so that some places are harder to get to. Pure rules are in `src/sim/` (`board.ts`, `battle.ts`, `chain.ts`); the
page shows the stat and marks a blow from above.

## The boards

`makeBoard(seed, area)` (`src/sim/board.ts`) now lays, from the seed alone:

- **Hills** as before (the noise of the seed), but eased to a ramp (`RAMP`, 1 level between neighbours), so the land itself can
  be walked by anyone. The land reaches 4 (`HILL_TOP`); platforms reach 6 (`TOP`).
- **Two or three platforms** (1x2 up to 3x3) set 2 to 4 levels above the lowest land round them, and **one or two pits** in the
  middle ground 2 or 3 below the highest. Each has a **staircase** down one side (a single file of tiles, one level a step,
  that ends where it meets the land), so every platform and pit can be walked into by a fighter that climbs a single level.
  The other sides are cliffs of 2 to 4: a good jumper takes them straight, the rest go round by the stairs.
  A side stream of the seed (`mixSeed(seed, 0xf3a7)`) lays them, so boulders, bushes and ground are laid from the same
  streams as before.
- The border ring (the outer tiles) stays plain hills, so a section laid against another on the long map meets gentle ground on
  whichever side it joins. Features keep to the inner 5x7 tiles, and platforms may stand on the deploy rows (a perch for a
  shooter on either side).
- Every board has a cliff of 2 or more (1800 sampled across the six areas), about 40% a face of 3 and nearly half a face of 4;
  an average board has 5 or 6 distinct levels.
- **Fairness**: `boardOk` now asks that every standable tile be reachable from the heroes' rows by a fighter that climbs one
  level (before: jump 2), so no deploy tile, perch or pocket is reachable by a jumper only; boulders are kept only where this
  holds. A board that somehow fails it falls back to plain hills (it never happened over 1800 boards).
- **The long map** (`chain.ts`): a joined section's edge is held to within a ramp (`RAMP`) of its neighbour, its border ring is
  smoothed to ramps (`smoothRing`) and the land inside is eased to a face of `CLIMB_MAX` (4), not 2. If the join cuts a
  staircase off, the section is eased to ramps all through (it keeps the hills, loses the platforms); about 91% of joined
  sections keep a face of 3 or more.

## Jump

- Every unit has had a `jump` since the start; it now means something. `canStep(from, to, jump)`: climb at most `jump`, drop at most
  `jump + DROP_EXTRA` (1), as in FF Tactics; fliers (`jump >= FLY_JUMP`) ignore heights. Before, every jump was clamped to 2.
- Jumps: heavy 1 (Juggernaut, Treant, and the foes' ogres, golems and the Forge Titan), most 2, agile 3 (Werewolf, Satyr,
  Kunoichi's old 3...), the two quickest **4** (Kunoichi, Ninja Monk), fliers go over anything (Karasu, Reaper, Queen Dragoon, demons).
- Melee reach across a gap uses it: a blade reaches up as far as the fighter jumps and down as far as it could drop (`canStrike`).
- The hero sheet (and the codex) shows **Jump** beside Attack speed and Walk ("Flies" for a flier). Power (`powerOf`) counts it
  lightly: +2% a level over 2 (to 4).
- Codex tips: a jump of 3+ "leaps ledges"; a jump of 1 "cannot climb a ledge".

## Height matters

- `blowMult`: +15% per level above, -15% per level below, to three either way (before 10%): x1.45 at +3, x0.55 at -3.
  The skills that use `blowMult` follow.
- `guardMult`: a defender takes 3% less per level it stands above the attacker (to 9%).
- `shotReach`: a shooter gains 0.9 tiles per level above its target (before 0.7); a hero's own `heightReach` (Archer 1.4, the
  gunners 0.7) is unchanged.
- **Shown**: a blow struck from higher ground than its target's carries a small green arrow (an up-triangle, drawn, no flashing)
  beside its damage number (`BattleEvent` `hit` has `high`; `fx.ts` `number`).

## The AI

All in `battle.ts` `decide`, for both sides:

- **Where to stand** (walking up to a foe): each tile it can strike from is scored by the walk to it, minus what the height over
  the foe is worth (1.6 steps a level for a shooter, 1.2 for a blade, to three levels), plus a little for each brute that could
  reach a shooter there; it looks no further than 4 steps past the nearest such tile ("not far for a small gain").
- **Stepping up when already in reach** (`perchFor`): a fighter that could strike now first steps to a higher tile within 3
  steps' cost that still holds its target, if that is worth it by the same scoring. It never steps down, so it comes to rest.
  A blade standing below its foe takes an equal or higher tile that is as close.
- **Foes**: a band's shooters take the higher ground of the three back rows (a level of height weighs more than a row), its
  fighters the highest tile of their front row (`startBattle`).
- **Auto** (`autoplay.ts` `tileScore`): a shooter's tile is worth 1.3 a level (was 0.7), a fighter's 0.4 (was 0.35).
- Cost: a walking fighter does one `walkFrom` (a 63-tile search) per step, as before; a fighter in reach does one more only when a
  higher tile lies within two steps. A 10-tick-a-second fight of 20 units is not noticeably slower (see below).

## Balance, before and after

The tools of `docs/notes/balance.md`; "before" is 0.130.0 unchanged, "after" this branch. Fixed seeds; the climb tool's own noise
is about 0.15 tries, the Calamity's 2 to 3 points a map.

**Tries to clear each army** (`--climb --saves 240`, Normal):

| Army | Before | After |
|---|---|---|
| Orc Warband | 2.7 | 2.7 |
| Undead Legion | 2.4 | 2.5 |
| Beast Packs | 2.1 | 2.1 |
| The Wildwood | 3.2 | 3.0 |
| **The Labyrinth** | **3.6** | **3.6** |
| Ogre Clans | 1.8 | 1.6 |
| Infernal Host | 1.6 | 1.7 |
| Yokai Night Parade | 1.7 | 2.0 |
| Golem Forge | 1.3 | 1.3 |

(the heights alone, with nothing else changed, made every army 0.1 to 0.3 tries easier: the heroes use the stairs and the
perches well, and the foes were placed by the old rules. The foes taking the higher ground at the start (`startBattle`) put it
back.)

**Calamity** (`--calamity --attempts 600`, share of runs felling each map's boss): the note 88 / 84 / 62 / 45 / 35 / 14.
The height alone made it far harder (90 / 78 / 53 / 35 / 23 / 9: a lone hero with a few hires, against huge bosses on the high
ground). `CAL_SCALE.step` 0.381 to **0.352** (the foes' growth a map) puts it back:

| | map 1 | map 2 | map 3 | map 4 | map 5 | map 6 |
|---|---|---|---|---|---|---|
| the note | 88 | 84 | 62 | 45 | 35 | 14 |
| before (400 attempts) | 89 | 85 | 63 | 46 | 37 | 15 |
| height alone | 90 | 78 | 53 | 35 | 23 | 9 |
| after (600 attempts) | 89 | 81 | 61 | 43 | 32 | 16 |

(within 3 of the note on every map; the sweep of `step` was 0.381: 53 / 35 / 23 / 9 on maps 3 to 6, 0.34: 65 / 50 / 38 / 19,
0.35: 63 / 48 / 34 / 16: it is steep, a hundredth moves the late maps ten points.)

**The spire** (`--tower --levels 3,8,14 --attempts 200`): median 12 floors, mean 15.9 before and 15.2 after, bosses 17 / 10 / 7%
before and 16 / 8 / 6% after.

**The daily** (`daily-rate --days 336`): about 69% before. Height alone made it 63 to 65% (200 dates, against 67% before);
`DAILY_START` 0.57 to **0.56** gives **68%** over 336 dates.

**Hero parity** (`--heroes-only`, 12000 games, lift over the roster average in points; the tests hold it to 4):

| | before | after |
|---|---|---|
| stage 5, level 1: lowest / highest | Peasant -2.3 / Wizard +1.9 | Peasant -2.5 / Lightning Mage +2.3 |
| stage 27, level 15: lowest / highest | Siege Bot -3.6 / Wolf Bard +3.3 | Samurai Commander -3.1 / Druid +3.5 |

Without the nudges below the spread was -4.3 to +4.3 (the heavy, slow fighters did worst, the shooters and the agile best:
it is a fight on stairs and perches now). Base hp nudges, nothing else: Tyrant 242 to 262, Minotaur 280 to 300, Shambler
280 to 295, Knight 270 to 285, Beastmaster 184 to 200, Juggernaut 335 to 350; Warlock 182 to 172, Rifle Bot 155 to 138, Wolf
Bard 231 to 222, Kunoichi 190 to 184, Mercenary 205 to 198, Karasu 200 to 194.

## Tests

`test/board.test.ts` (faces, reach from every deploy tile at every jump in every area, a cliff a short jumper cannot climb, a
drop one further than a climb), `test/battle.test.ts` (the height bonus at -3..+3 and the guard), `test/height.test.ts` (a shooter
takes a nearby high tile over a flat one just as good, steps up when already in range, does not walk far for a small gain;
every unit has a jump; power), and the old ones with their numbers moved by the rules (`blowMult`, `canStep`).
One test now tries a few seeds, where it had one: the War Drum's (`equipment.test.ts`) needs the pair of heroes beside each
other when the drum beats, and on some boards they walk apart first.

## For the owner

- The foe jump 1 on ogres, golems and the Forge Titan, and the 4 for Kunoichi and Ninja Monk, are my reading of "heavy" and
  "agile"; they are one number each in `foes.ts` / `units.ts`.
- 15% a level and 3% guard are the "felt but not dominant" point I found; the numbers are `HEIGHT_BLOW`, `HIGH_GUARD` and
  `HIGH_REACH` at the top of `battle.ts`.
- `CAL_SCALE.step`, `DAILY_START` and twelve heroes' hp moved to hold the balance; the armies needed nothing.
- The screenshots are in `docs/samples/height-*.png` (`tools/height/shots.mjs`; `tools/height/compat.mjs` plays an old save
  and a new one to the end).
