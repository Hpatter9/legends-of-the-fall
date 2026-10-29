# FIGHT-FIXES: four of the owner's fight fixes

Branch `claude/fight-fixes`, worktree `/home/user/fight-fixes` (from main 0.200.0). Nothing merged; the version is not bumped.

## 1. The boss stands in the middle of its arena

The owner: "The bosses should stand in the middle of the boss arena."

- `planScenario` (`src/sim/scenario.ts`) now writes each boss section's arena middle on its board: `Board.arenaMid` (new, optional, in
  `src/sim/board.ts`), the rounded `arena.centre` of `arenaMask` (`armyRoad.ts`).
- `startBattle` (`src/sim/battle.ts`) places a band whose first foe is a boss (`isBoss`) on such a board with the new `arenaSpots`
  (`src/sim/arenaDeploy.ts`): the boss on the startable floor tile nearest the middle; each foe after it within `ESCORT_REACH` (3) tiles of the
  boss, nearest first, fighters on the heroes' side of it or at its flanks, shooters behind or beside it on the higher ground. A startable tile is
  standable and holds no ground that acts each second (a shrine, lava, coals) and no powder barrel, so the boss never starts on the grove's or the
  shrine court's healing heart. Ties are broken on the same placement stream as before (`mixSeed(seed, 0xf0e5)`); every other fight places its
  foes exactly as it did (no `arenaMid`, or no boss first in the band). If nothing fits, the foe falls back to the usual rows.
- Every army's mid-boss (8; the Wildwood's 5 and 10) and final (15) arena is covered, on every tier's band (the extra foes of the harder tiers
  stand round the boss too).
- Tests: `test/arena-boss.test.ts` (every army, five seeds, tiers 0 to 2: the boss within 1.5 tiles of the middle, off the edge rows and off
  shrine or lava, its band within three tiles, no shared tiles; the same seed places the same way; fighters in front and shooters behind; a
  board with no arena keeps the old rows).

### Balance (`node tools/curve/run.mjs cell <army>:<level>`, the established measure, 24 saves a cell)

Mean tries to clear Normal with the recruits' party at each army's recommended level (`docs/notes/army-curve.md`), main 0.200.0 and this
branch, the same saves:

| Army (level) | main 0.200.0 | boss in the middle |
| --- | --- | --- |
| Orc Warband (1) | 2.2 | 2.3 |
| Undead Legion (8) | 3.7 | 4.5 |
| Beast Packs (15) | 1.3 | 1.3 |
| The Wildwood (22) | 3.8 | 2.9 |
| The Labyrinth (30) | 13.5 | 9.5 |
| Ogre Clans (38) | 3.7 | 3.5 |
| Infernal Host (40) | 1.5 | 1.5 |
| Yokai Night Parade (46) | 2.5 | 2.5 |
| Golem Forge (52) | 3.0 | 4.3 |

A boss further forward reaches the heroes sooner, alone in front of its shooters: harder where the boss is a heavy hitter (the Undead, the
Golems), easier where it used to sit behind cover at the back (the Labyrinth's maze heart, the Wildwood's grove). The armies' `start` values
were **not** retuned here (another worker owns army difficulty, `armies.ts`); the full `npm test`, the army tuning tests among it, passes. If the
owner wants these back to main's numbers, a retune of the Undead, Wildwood, Labyrinth and Golem `start` with `tools/curve/run.mjs tune` would do it.

## 2. The camera is the player's during a wave

The owner: "Don't lock camera in each wave. Allow free movement and zooming during the wave."

What locked it: a drag panned the board but only paused the fight camera's follow for `PAUSE_MS` (4 s), after which it took the view back to
the fighters; and there was no zoom at all in a normal fight (no pinch, no wheel).

- New `src/render/fightCam.ts` (pure, tested in `test/fight-cam.test.ts`): `zoomLimits` (out to a little past the whole board, in to about
  four screen px an art px), `pinchZoom`, `wheelZoom` and `zoomAbout` (a zoom about the fingers that also pans as they move), the same ideas as
  the Last Stand's `standCam.ts`.
- `src/main.ts`: a second finger on the board starts a pinch (a hero being dragged in the deploy stays where it was); a mouse wheel zooms about
  the pointer. A pan, pinch or wheel in a fight sets `manualCam`: the follow (`follow`), the effects' pushes (`leanIn`) and the boss's form
  change push (`pushOnPhase`) leave the camera alone, and a resize keeps it (clamped over the board). The boss card or a destination reveal in
  progress ends when the player takes the camera. `manualCam` is cleared when a new wave's deploy is set up and when the fight starts, so the
  opening framing and the auto-follow are as they were until the player moves the camera. Zoom and pan are applied at once (no easing), so
  reduced motion is unaffected.

## 3. A heart's revive: the fallen get up

The owner: "The units get up off the ground, not a new spawn look, when a heart is burnt for another try. Maybe it's the death animation in
reverse?"

- `UnitSprite.getUp()` (`src/render/unitView.ts`): for `RISE_MS` (720 ms) the hero plays its `dead` row backwards where it lay, and a burnt or
  stony hero's colour comes back over the same time; then it stands. With reduced motion it stands at once (no get-up frames).
- `stepRevive` (`src/main.ts`) calls `getUp` on the heroes that had fallen (not the evolve burst and light pillar they had before, which read
  as a new spawn), and holds the fight until they are up (`RISE_MS` + 80 ms; 200 ms with reduced motion). A tap during the burn still hurries
  it, but not past the get-up (they would slide about lying down).
- The sim is unchanged (`reviveParty`); `test/heart-revive.test.ts` still covers it.

## 4. The trophy wall no longer locks the castle

The owner: "Trophy wall comes up and locks castle screen."

Cause: `.twOverlay` (`src/trophyWall.css`) is laid out with `display: flex`, which beats the `hidden` attribute. Both the castle and the
tavern build a `TrophyWallModal` at start, hidden, so both walls stood over their pages from the first frame, over every tap (the Trophies chip
itself could not be reached), and ✕ only set `hidden` again. Reproduced on main at 393x852 (`docs/samples/fight-fixes-castle-before.png`:
the wall over the castle on arrival).

- Fix: `.twOverlay[hidden] { display: none; }`. The wall now opens only from the castle's Trophies chip, the castle hall's trophy rack and the
  tavern's Trophies button, and closes with ✕, a tap on its backdrop or Escape. The app has no back-gesture handling (no history entries) for any
  sheet, so none was added here.
- Found on the way: the castle hall's `drawVfx` (`src/castle.ts`) could take a negative frame index and throw ("reading 'frame'") on its
  first frames; the index is now kept in range.
- Test: `test/trophy-wall-hidden.test.ts` (the `[hidden]` rule is in the sheet; the modal starts hidden).

## Checks

- `npm run typecheck`; `npm test -- arena-boss fight-cam trophy-wall heart-revive army`; the full `npm test`; `npm run web`.
- Browser (`node tools/fight-fixes/shots.mjs out/web 8203 docs/samples/fight-fixes`, Chromium with SwiftShader) at 393x852, 360x780 and
  412x915: the castle and the tavern with the wall closed, opened by the chip, closed by ✕, a backdrop tap and Escape; a pinch, a drag and a
  wheel during a fight, and the camera still where the player left it six seconds later; a controlled defeat with a heart left, the squad getting
  up and the fight resuming. Boss shots at 393x852.

Pictures: `docs/samples/fight-fixes-boss-orcs-8.png`, `-boss-undead-15.png`, `-boss-wildwood-5.png`, `-boss-infernal-15.png` (the deploy:
the boss in its arena's middle, its band round it); `-revive-getting-up.png`; `-camera-zoomed.png`; `-castle-closed.png`, `-castle-open.png`,
`-tavern-closed.png`, and `-castle-before.png` (main, the bug).
