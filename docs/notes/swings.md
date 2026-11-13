# SWINGS: rendered strokes, falls and the gun's shot

The third replacement after the hit sparks (`hit-sparks.md`) and the orbs and strands (`shots.md`): a melee blow's stroke, what a
fighter leaves as it falls, and a gun's flash and bullet are frame clips from the Blender pipeline.

## What changed

- **A blow's stroke**, by the slash its weapon draws (`slashOf`; `SWING`, `swingClip`): `swing-blade` (a sword's pale crescent),
  `swing-heavy` (a club's broad arc in earth), `swing-thrust` (a spear's straight line), `swing-claw` (three raking cuts in
  shadow). The new `swipe` scene is one stroke travelling to the screen's right; `Fx.slash` turns it to the blow and mirrors it for
  a blow to the left. It goes on the struck fighter as a hit's spark does (`bfxFlash`, which the sparks now share): whole over the
  body for the rule's 150 ms flash, then by the ON-FIGHTER rule.
- **A fall**, by its kind (`deathKind`; `deathClip`): `death-burn` (a ball of flame tearing apart), `death-thud` (the new `dust`
  scene: a ring of small puffs pushed out along the ground, never one mass), `death-stone` (shards flung out), `death-blood` (a
  spray), `death-light` (motes rising from a ring), `death-bones` (a puff of dust; the bones themselves stay painted sprites,
  `boneBits`). Each stands on the ground at the fallen fighter's feet.
- **A gun's shot**: `shot-muzzle` (the new `muzzle` scene: a short cone of flare thrown along the shot) and `shot-tracer` (the
  bullet with its streak, flown and turned as an orb is; `shotClip`). An orb's leaving keeps its painted puff.
- **Fallbacks**: the painted slash, the painted death burst, the painted flash and the streak drawn by hand all remain where a
  clip is not held. Reduced motion holds each clip's one still frame.
- **Not done**: the painted streak and crossed cut of a blink that strikes (`PAINT.slash`, `PAINT.slashHit`) and the strokes inside
  the ultimates' own shows are as they were.

## Tests changed, and why

- `test/blender-fx.test.ts` held that every clip but a hit's spark plays 400 ms or more. A weapon's stroke and a gun's flash are of
  the spark's quick kind (150 to 300 ms), so the exception now names `swing-` and `shot-muzzle` too. The new clips were otherwise
  made to fit the manifest's limits (six frames at least), not the limits to them.
- `test/shots.test.ts` held that only an orb takes a rendered clip. The tracer was ordered next, so it now holds an orb and a
  bullet; arrows and bones still must not.
- `test/hit-sparks.test.ts` matched the text of the spark's two spawns, which moved into `bfxFlash` unchanged in what they do.

## Memory

All in the two atlases every fight already holds; nothing more is asked for at a fight's start.

| | before | after |
| --- | --- | --- |
| core atlas 0 | 2041 x 2045, 16,695,380 bytes decoded | 2045 x 2045, 16,728,100 |
| core atlas 1 | 2042 x 984, 8,037,312 bytes decoded | 2043 x 1041, 8,507,052 |

502,460 bytes more decoded (about 0.48 MB); on disc `src/art/fx/blender` 4,896,442 to 4,914,904 bytes.

## Verdict

`docs/samples/blender-fx/swings-before-after-393.png` (before above, after below: the Gunslinger's shot, the Knight's, the
Minotaur's, the Peasant's and the Kunoichi's blows, a fall) and `docs/samples/blender-fx/swings-clips.png` (every new clip).

- The strokes now say which weapon struck: a thrust is a line, claws are claws, a club's arc is broad. That is the gain; each is
  small and over in under 300 ms, as before.
- The club's arc is a flat tan stroke. It was first a wide wedge and was narrowed once; it is the plainest of the four.
- The tracer is a short gold streak, a little bolder than the hand-drawn line. The muzzle flash is small; at 393 wide it is a
  few pixels and I cannot claim it reads better than the painted flash, only that it is in the board's pixels.
- Of the falls only the blood spray was caught in a fight photograph. The burning, the dust ring, the stone, the light and the
  bones' dust are judged on the clip sheet, not in a fight.

`SEE=swing:knight,fall:,shot:gunslinger WATCH=1 node tools/blender-fx/ult-shots.mjs --picks ...` catches each in a fight.
