# HIT-SPARKS: where a blow lands, a rendered spark

The director's order after the skills survey: keep the 168 painted skill pictures, and start where rendered clips clearly gain.
First, the hit sparks.

## What plays

`hitSpark(kind, el, share)` in `src/render/blenderFxRules.ts` (pure; `test/hit-sparks.test.ts`):

| Landing | Clip | Element | Size | Lasts |
| --- | --- | --- | --- | --- |
| a plain blow | a small star of sparks (`hit-blow`) | light | 0.8 to 1.3 with the share of health taken | 200 ms |
| a shot's burst | the same star | the shot's own | 1.0 to 1.5 | 220 ms |
| a block (a raised guard) | the same star | ice (pale blue) | 1.1 | 220 ms |
| a killing backstab | two crossed strokes (`hit-cut`) | dark | 1.0 | 260 ms |
| a crit | two crossed strokes | light (gold) | 1.3 to 1.6 | 280 ms |

A crit's picture is the larger clip at the larger size, so the least crit is plainly bigger than the greatest plain blow (a test).
Every one is over in under 300 ms. `Fx.bfxHit` plays it; where its clip is not held the painted spark plays as before (the
fallback the king's spells have).

Over a fighter it follows ON-FIGHTER: its first frames, no longer than the rule's 150 ms flash, are drawn as they are (a new
`bare` option on a particle: no thinning, no copy under); the rest is thin over the body and whole behind it.

Not changed: a skill's own hit (its signature's painted steps), the dust or blood puff, the debris, the ailments' ticks, a big
foe's death burst, the swing's slash, the fan of sparkles that shows a blow's direction.

## The clips, and what they cost

Twenty new clips, `hit-blow-<el>` and `hit-cut-<el>` in the ten elements (`HITS` in `tools/blender-fx/effects.py`: the `sparks` and
`cross` scenes, small). They lie in the atlases every fight holds (the core), so a fight asks for nothing more.

Memory, the same staged fight (the Samurai's party, 393x852) on main 0.559.0 and on this build:

| | Before | After |
| --- | --- | --- |
| Fight-loaded atlases, decoded | 40.07 MB | 40.07 MB |
| Fight-loaded atlases, on the graphics card | 10.17 MB | 10.17 MB |
| Core atlas 1 (pinned) | 2030 x 750 px, 5.8 MB | 2048 x 908 px, 7.1 MB |

So 1.3 MB more, fixed, in the core; nothing more loaded in a fight.

## Photographs

`docs/samples/blender-fx/hit-sparks-393.png`: the Knight, the Samurai, the Archer, the Wizard and the Kunoichi against the same
wave, cut close and doubled, 0.559.0 above and this build below, six moments. The rendered sparks are small bright stars at the
point of the blow (the second, fourth and fifth moments below); the fighters are not covered.

## A test changed to the order

`test/blender-fx.test.ts` held that every clip plays 400 ms or more. A blow's spark is ordered to land in under 300 ms, so
`hit-*` clips are held to 150 to 300 ms there and everything else to 400 ms and more, as before.

## The Shield's dome (ON-FIGHTER)

A king's spell's clip wider than a tile and a half lies over more fighters than the one it was measured on (a dome over a
party); its copy over the fighters is at the 15% ceiling itself. The copy under the bodies, with the rim and the ground ring, is
at full strength. `docs/samples/blender-fx/on-fighter-shield-393.png`: the dome is a faint wash over the party, who are plain inside it.
