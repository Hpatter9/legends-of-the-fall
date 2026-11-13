# The Dragoon's jet: tried, and not built

The director's order: build the Queen Dragoon's Inferno Breath as a strip clip turned along her line **only if it reads as
breath** (energy, not an object). It does not, so nothing was wired and nothing ships. She keeps what she has: her strike's flames
on each spot of the line, the nearest first, each a little later and larger than the last (`lineRun`, `ULT_LINE`), which was made
so that "a breath is seen to leave the mouth and widen".

## What was tried

A scene `jet`: a stream of fire two tiles' sides long, running along the screen's right as a loop, to be turned along the line
and laid length after length (as a strand is, `strandLay`), on the ground's rows under the fighters (`rowUnder`). Three renders,
judged on the clip sheet:

1. Sixteen small tongues of flame and a hot thread through them: a flat yellow lumpy band. No orange, no shape of fire.
2. Ten larger, raggeder tongues with the flame's own shading: plainly fire, but a fat bank of fireballs with no direction.
3. Racing streaks of flame with smaller tongues among them: beads on wires
   (`docs/samples/blender-fx/dragoon-jet-rejected.png`, the third render's eight frames).

## Why it does not pass

A breath reads by its shape: narrow at the mouth, widening, its far edge licking and breaking up. A strip that must join end to
end is the same from one end to the other, so it cannot have that shape; what is left is a band of fire lying along a line,
which is what the second render was. Scaling each length larger than the last would give steps, not a cone. On a still frame a
uniform stream also has no direction: the flow only shows in motion, and at 393 wide the strip is about 30 px tall.

## What would pass, if it is wanted

One clip of the whole breath, not a strip: a cone of fire that leaves a point and widens over five or six tiles, played once
and turned to the line. It would be a large clip (about 300 by 120 px a frame; twelve frames is roughly 1.7 MB decoded) and it
belongs with the Dragoon's own ultimate atlas, not the atlases every fight holds. It was not ordered and is not built. The scene
and the clip from the three tries were taken out again, so the build is as it was.
