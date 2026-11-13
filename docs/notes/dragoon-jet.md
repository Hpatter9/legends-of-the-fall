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

## Since: the cone breath, built, judged in a fight, and not shipped

The director then ordered the cone described above: one clip of the whole breath, in the Dragoon's own ultimate atlas, judged on
a fight photograph, with the instruction to say so and stop if it did not read as breath. It did not.

**What was built.** A scene `breath`: fire leaving a point and widening to the screen's right over five tiles' sides (a narrow
white-hot jet at the mouth, eighty ragged tongues thrown down the cone and swelling as they go, streaks racing out among them,
embers), played once in 1.1 s: it shoots out, roars, and tears apart. The clip `ult-dragoon-breath` was 179 x 77 px, 14 frames
(about 0.77 MB decoded), in her own atlas group. The renderer laid it from her mouth towards the last foe of her line
(`breathLay`: turned, mirrored for a breath to the left so its flames still lift, scaled to the line between 0.7 and 1.3 of its
size) under the ON-FIGHTER rule: whole on the ground's rows under the fighters, whole over them for the 150 ms flash, then over
them only at the ceiling.

**On the sheet it passes.** It is plainly a cone of fire from a point (the lower strip of
`docs/samples/blender-fx/dragoon-breath-rejected.png`).

**In a fight it does not** (the upper two rows of the same picture: before above, with the cone below; five moments of the strike).

1. Laid under her existing strike (a wall of flames on each spot of the same line) it could not be seen at all: before and after
   were the same picture.
2. With those flames left out so that the cone was the strike, it showed as a few yellow puffs on the ground beside her, weaker
   than what she had. Three reasons, none of them a tuning matter: it must lie under the fighters of the line, who stand on the
   very thing it is, so their bodies cover most of it; her line in an ordinary fight is often two or three tiles, where the clip
   is drawn at seven tenths and its narrow end is all that fits; and the moment it plays is already full (her showcase's beam and
   ball before it, the line alight after it).

A breath that read would have to be drawn over the foes it burns, which the owner's rule forbids. So the clip, the scene, the
rules and the wiring were taken out again; the build is as it was, and she keeps the flames down her line. What stays from the
work is in the photograph tool: `HOOK=<method>` writes out each call of one of the effects' methods through a show, and
`ROWS=<ms>` lists what is on the ground's rows at a moment, which is how the cone's timing (it begins 2.5 s into the strike's
stage, after the showcase) was found.
