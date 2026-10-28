# Idle heroes go to help in the Last Stand (STAND-004)

The owner: "When all the units are on the map and heroes aren't engaged with them, they need to go help in the last stand."

## Why they stood still

Since the overhaul (0.189.0) a hero guards its post: `heroDecide` (`src/sim/standAi.ts`) only looks at foes within its leash plus its reach
of the post, and walks home when that zone is clear. A room has two or three breaches, so the heroes posted on the quiet sides (and the
fighters between them) had nothing in their zone for a whole wave and stood at their posts while the others fought. Only the hunt
(`StandMode.hunt`, a wave's last `HUNT_AT` foes) lifted the leash.

## What it does now

`src/sim/standHelp.ts` (new), called once a tick of a wave from `stepStand` (`planHelp`), writes `Battle.stand.help` (a helper's unit
id to the foe it goes for; optional on `StandMode` in `battle.ts`).

- **When:** only with every foe of the wave in (`s.queue` empty), outside the hunt, and only for a hero with no foe in its own zone
  (`zoneOf`: its leash, its reach, and `ZONE_PAD` (2) tiles, measured round its post, not where it stands) for `HELP_IDLE_MS` (1 s).
- **Who stays (the king is never left bare):** `guardOf`: a hero posted on the dais's inner ring (`INNER_RING`, 2 tiles from the king: the
  shooters and healers by default) never leaves; at least `GUARD_MIN` (2) standing heroes always stay (the inner ring, then tanks, then
  the nearest posted). Tanks are the last to go: they must be idle `TANK_IDLE_MS` (3 s), and the non-tanks are sent first.
- **One at a time:** at most one hero sets off every `HELP_GAP_MS` (600 ms).
- **Where to:** the foe with the lowest `needOf`: its distance from the king, less 1.5 for each foe within 2 tiles of it (up to 6: the breach
  under the most pressure), less 4 if a hero below `HURT_SHARE` (half) of its health stands beside it, plus half the helper's walk to it.
  When that foe falls, the helper takes the next one.
- **Going home:** when a foe comes into the helper's own zone (it is called back and rests `HELP_REST_MS`, 3 s, before it may go again),
  when the wave's last foes are hunted (the hunt takes over), and when the wave clears or the next begins (`help` is emptied in
  `beginWave` and `clearWave`). Home is the usual walk back to the post (`heroDecide`'s stray rule).
- **The walk** (`standAi.ts`): a helper casts its skills freely (as in the hunt) and `huntDecide` takes a `focus`: the foe it was sent to
  is struck first when in reach; `helpWalk` makes one search a step: while far off, the first step on the way to the foe's own tile, near
  it, the nearest tile from which it, or one of the four foes nearest it, can be struck. (The hunt itself is unchanged.)
- **On screen** (`src/standView.ts`, `aids`): a helper's coloured ring gets an arrowhead of its colour pointing at its foe, a faint line
  along the floor to it, and a thin ring of its colour under that foe; the hero walks there.

No randomness: the choices go by distance, health and id. The bookkeeping (`HelpBook`: since when each hero has been idle, who is
resting, when the last set off) lives on the `Stand`, not in the save; a run rebuilt at a break starts it afresh.

## Pace

Helping made the Last Stand easier, as expected. `npm run stand-balance -- --levels ... --attempts 30` (the greedy buyer, eight heroes,
nothing worn, no castle), the median wave the king fell in (mean, min-max):

| Hero level | Target | Before (main 0.200) | Helping, old levers | Helping, retuned |
| --- | --- | --- | --- | --- |
| 1 | about 4 | 4 (3.5, 3-4) | 4 (3.7, 3-4) | 4 (3.6, 3-4) |
| 10 | about 9 | 9 (9.2, 7-11) | 10 (9.5, 8-11) | 9 (9.1, 7-10) |
| 20 | about 10 | 11 (10.9, 10-13) | 11 (10.8, 9-12) | 10 (10.5, 9-12) |
| 30 | about 14 | 15 (15.6, 12-22) | 17 (17.7, 13-28) | 14 (15.1, 11-22) |
| 60 | about 20 | 20 (20.0, 12-28) | 23 (22.2, 13-31) | 20 (19.9, 13-27) |
| 100 | about 25 | 26 (25.4, 14-35) | 28 (27.4, 15-35) | 25 (25.4, 18-43) |

The levers (`src/sim/stand.ts`; the crown pay untouched): `HALL_EASE` 0.85 to 0.88, `WAVE_GROWTH_LATE` 0.1 to 0.14, `WAVE_DEEP` 22 to 18,
`WAVE_GROWTH_DEEP` 0.6 to 0.35. Every row is now on its target. The sim's time a tick is unchanged (about 0.24 ms against main's 0.29 at
level 60, run alone).

## Tests

`test/stand-help.test.ts`: with the wave all in, an idle hero leaves its post, walks towards the fight and strikes; nobody helps while foes
are still to come in; a hero with a foe in its own zone stays; over real waves the inner ring never leaves and never fewer than
`GUARD_MIN` stay; `guardOf`'s order (inner ring, tanks); nobody is out helping in the break; two plays of a seed are the same.
`test/stand.test.ts`, the leash test: a hero out helping is now let past its leash, as in the hunt, and must be home within 40 s after
(the owner's new rule; the test was not loosened otherwise). The pace test's levels still hold.

## Screens

`node tools/stand/help-shots.mjs` (after `npm run web`; port 8220): a wave played on until a hero has gone to help, the camera on the
helpers and the foes they went for: `docs/samples/stand-help-393x852.png`, `-360x780.png`, `-412x915.png`; no page errors.
