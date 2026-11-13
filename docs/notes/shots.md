# SHOTS: rendered orbs and strands

The second of the three replacements the skills survey chose (after the hit sparks, `hit-sparks.md`): a shot's orb and its
trail, and the lines that run between two fighters, are frame clips from the Blender pipeline in place of the painted orb with
its puffs and the lines drawn by hand.

## What changed

- **Orbs.** `shot-orb-<el>` in the ten elements (the `projectile` scene: a ball with its tail behind it, a loop of six
  frames). The clip flies to the screen's right; `Fx.shot` turns it to its heading each frame, so the tail always trails. The
  painted puffs dropped behind an orb are not spawned for a rendered one: the tail is in the clip. `shotOrb(el)` names the clip
  and `SHOT_ORB_SIZE` its size.
- **Arrows and bones stay painted sprites**, and a bullet keeps its tracer (a test holds that only an orb takes a clip).
- **Strands.** A new scene, `strand`: a thin bright core in a narrow glow, lying along the screen's right. `arc-bolt` (chain
  lightning and a shock's jump: a jagged line that takes a new path every frame, a short fork off its middle), `arc-charm` (the
  Kitsune's thread, a slow wave) and `arc-hex` (the Warlock's). `Fx.arc` lays one with `bfxStrand`: `strandLay` turns it to the
  line between the two fighters and stretches it along the line, and where the line is longer than `STRAND_STRETCH` (1.35)
  lengths it lays more lengths end to end, every other one turned over and a frame apart, so no two beside each other match.
  The sparks at a bolt's ends, the hearts and the thread's motes are as they were.
- **Fallback.** Where a clip is not held (the atlas not yet decoded), the painted orb with its puffs flies and the line is
  drawn by hand, as before.
- Reduced motion: an orb and a strand hold their one still frame.

## The block's own spark

With the same push (the director's order): a block no longer borrows the blow's star in ice. `hit-block` is a scene of its own,
`guard`: a short, bright, shallow arc in pale blue-steel (the edge a guard is held along; no shield is modelled), flaring where
the blow met it and widening as it thins. `docs/samples/blender-fx/block-before-after-393.png`.

## Memory

The new clips lie in the two atlases every fight already holds; nothing more is asked for at a fight's start.

| | before | after |
| --- | --- | --- |
| core atlas 0 | 2041 x 2045, 16,695,380 bytes decoded | the same |
| core atlas 1 | 2042 x 917, 7,490,056 bytes decoded | 2042 x 963, 7,865,784 bytes decoded |

That is 375,728 bytes more decoded (about 0.36 MB, the block's arc below included), and 15,320 bytes more on disc
(`src/art/fx/blender`: 4,879,448 to 4,894,768).

## Verdict

`docs/samples/blender-fx/shots-before-after-393.png` (before above, after below; the Fire Wizard's orb, the Lightning Mage's,
chain lightning, the Warlock's hex).

- The orbs are the clear gain: a comet with a tail in the element's colour, readable against the board where the painted orb
  was a small spark.
- The bolt is a little softer and a little thicker than the drawn zig-zag, in the board's pixels; about even.
- The threads were first rendered as wide bands that covered the fighters and were thinned twice; they now sit about even with
  the drawn threads. Their gain is that they are in the board's pixels, not that they are grander.
- A strand crosses the two bodies at its ends for a third to half a second. It is thin, but it is not put under the ON-FIGHTER
  rule (a line cannot go under one fighter and over another in one piece).

`SEE=shot:wizard,arc:warlock WATCH=1 node tools/blender-fx/ult-shots.mjs --picks ...` steps a fight until that fighter looses a
shot or an arc and photographs it in flight.
