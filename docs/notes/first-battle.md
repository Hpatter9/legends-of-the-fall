## The first battle (0.1.0)

The game's first playable setup: five heroes against one band of skeletons, King God Castle's place-then-watch fight
on an FF Tactics height grid.

**The board** (`src/sim/board.ts`): `W` 7 tiles across by `D` 9 deep; the heroes deploy on the near `DEPLOY_ROWS` (3),
the foes stand on the far three. Heights 0 to `TOP` (4) come from a smooth value noise of the seed (`relief`, from
Chronos's tactics.ts), and `easeRelief` caps any step between neighbours at `CLIMB_MAX` (2). One to three boulders
stand in the middle ground, kept only if `boardOk` still finds every tile reachable. Bushes are only for looks.
`canStep` costs a climb 1 more a step; a face over the fighter's `jump` (or over 2) is a cliff both ways.
`sightClear` lets a ridge or boulder block a shot.

**The fighters** (`src/sim/units.ts`): Knight (tank), Samurai (heavy blade), Kunoichi (quick, jump 3), Archer
(range 4, arrows) and Fire Wizard (range 3, splash at `SPLASH_SHARE` 0.5 on the target's neighbours); the foes are
two Skeletons, two Skeleton Spearmen (reach 2) and a Skeleton Archer (range 4). Stats are hp, atk, def, range,
`moveMs`, `atkMs`, jump.

**The fight** (`src/sim/battle.ts`): deploy with `canPlace`/`place`/`unplace`, then `fight`. `stepBattle` runs
`TICK_MS` (100 ms) ticks. A free fighter strikes the weakest foe in reach (`canStrike`), else walks one tile
(`walkFrom` and `firstStep`, `src/sim/path.ts`) toward the cheapest tile it can strike its nearest reachable foe from
(high ground breaks ties), else closes in. Blows land after a wind-up; shots are released, then fly
(120 ms + 110 ms a tile) and land wherever the target is. Damage is `max(1, atk - def)` x `blowMult` (+10% a step
above, up to 3; side x1.25, behind x1.5) x 0.9 to 1.1. Shooters' reach grows by `shotReach` (+0.7 a step above).
Melee needs the height difference within the fighter's jump. The fight ends when a side is gone, or is lost at
`TIME_LIMIT_MS` (2 minutes). With the heroes placed plainly, they win about half their fights (the test checks
8 to 34 of 40).

**The page** (`src/main.ts`, `src/render/`): Chronos's isometric columns (`TW` 64, `TH` 32, `HH` 12) with Fields
tileset grass (cobbles from height 3), tufts, boulders and bushes; the Craftpix sheets Chronos already cut, mirrored
to face the way they go, hopping between tiles; arrows, fire, sparks, popping numbers and a shake (`juiceRules.ts`).
The bench is at the bottom upright and down the right side sideways. The backdrop is the Autumn Pixel Backgrounds'
first scene.
