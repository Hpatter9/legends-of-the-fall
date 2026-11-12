# The Eidolons' ground show, staged in Blender (EIDOLON-BLENDER)

The owner, after the trial below: **the hybrid**. Each Eidolon keeps its painting for the figure, its name stamp and its line; Blender
stages everything round it (the sigil, the pillar, the strike across the ground, the scorch, the aftermath). Askel the Cinderhound is
the first; the other five follow in his style and to his bar, one push each: Nivra, Gorm, Voltara, Aurelan and Vaelkhar. All six are done; each has its own section below.
Each has its own element's show, not Askel's recoloured, in the same places in the call (`STAGED` in `src/eidolonStage.ts`).

## The polish pass over all six

After all six were in, the director's list, done in one push:

- **Gorm's flash has a shape.** The amber flash was a flattened ball. It is now a ragged core (torn at its edge) throwing 34 amber
  rays low and wide, the longest nearest the ground, with pale hearts rather than white. His show is now **447,596 bytes** (the
  explosion 237,032; a re-finish shifts the shared palette, so his other sheets changed by a few hundred bytes each).
- **Voltara's white-out is shorter.** Her blow's white flash is 0.5 where the others' is 0.95 (`flash` on her entry in `STAGED`,
  a new optional number), so the forks' lines show through from the first frame after the freeze. Her sheets are unchanged.
- **Aurelan's light has a grain.** His beams are now wide beams of threads: a noise across each beam's width gives bright threads
  and see-through gaps, amber at the edges, with thin riders beside them (`beam_mat` in `aurelan_parts.py`), in the shaft of dawn
  and the tile beams too. His sunburst has a shape: a torn disc, a ragged crown of 40 short rays turning one way, and the long rays
  turning the other as they lengthen. More motes rise in the beams. His flash is 0.55. His explosion ships 14 of 16 frames (the last
  two were nearly empty). His show is now **461,350 bytes** (the explosion 248,704, the pillar 99,172): 11 KB over the 450 KB mark,
  because threads pack less well than flat bars.
- **Under main's camera** (0.505.0: the push-in on the summoning, the strike frame on the foes' side): all six were captured again
  and the samples in `docs/samples/eidolon-blender/` replaced. Nothing is cut off: each sigil, pillar and painting stays in the
  summoning's frame (the pillars' tops run off the top by design) and each blow, its second and third detonations and its aftermath
  stay in the strike's.
- All six together: 60 sheets, **2,529,400 bytes**.

## For the camera: where each show is

All in the board's own pixels (a sheet pixel is 1.414 of them), the same for every staged Eidolon unless its section says otherwise:

- **The summoning** is at the sigil's tile: the board tile nearest the point 30% (a painting that comes from the left: Nivra, Gorm, Voltara, Aurelan) or 70%
  (from the right: Askel, Vaelkhar) across the screen on the foes' ground line, kept between 24% and 76% across (`sigilSpot`). The sigil is
  226 x 136 about that tile; the pillar stands on it, 204 wide and 498 tall (452 above the tile, 46 below); the painting comes out of
  it and leaves by its usual way.
- **The strike's centre** is the foes' middle: the mean of the living foes' tiles' ground points as the blow lands
  (`EidolonCall.foeMid`). The blow is drawn about it 566 wide (283 each side, along the screen, whichever way the board lies) and
  530 tall (442 above the centre, 88 below); it is meant to run off the screen's sides. The ground break is 362 x 192 about the tile
  nearest the centre. The second and third detonations are 27% of the screen's width to the left and to the right of the centre, at
  0.72 and 0.78 of the blow's size. The lead-in's tile pieces stand on the foes' tiles and up to two tiles round them.

## Nivra in the game (ice)

Her kit: the Frozen Deep strikes every foe and leaves them frozen 5 s (a boss slowed), so her show is ice that seizes the field
and breaks: solid crystal, not Askel's fire in blue. `tools/blender-fx/eidolons/nivra_parts.py` renders faceted spires (flat-shaded,
lit by a white sun and a blue rim, with pale veins and bright tips inside so a large face is never one flat blue), cold white-blue
light for the flashes, and pale mist. Her call is **6.6 s** (`EIDOLON_MS`, unchanged); the longer wind-up is used to build more.

| Stage | Main's, kept | Blender's |
|---|---|---|
| The horn (0 to 0.61 s) | the horn blown, the dim | her **sigil**, a six-armed rune, freezes onto the ground round its ring and inward, crystals growing along it |
| The pass (0.61 to 2.75 s) | the painted wyrm, her name, title and line, gliding out to the right | a cold white burst and a **cluster of ice spires driven up twelve tiles in two frames**, the ground freezing under it; the painting slides out of it; the cluster stands, then shatters |
| The sprite and the build-up (2.75 to 4.35 s) | the wyrm comes onto the board and breathes | **the freezing front** races out over the ground under the foes (a ring, frost ferns spreading behind it: the extra beat a longer call has room for), then **small spires burst up** tile by tile from her jaws to the foes; the field darkens hard |
| The strike (4.35 s, with the 0.28 s freeze) | the hit-stop, the snap zoom, the painted spears of ice under each foe and their shatter, the frost nova, the creeping frost and mist | a hard white flash; a **cold white core** blown out in the frozen frame, then **a wall of ice spires racing out across the foes' whole side**, behind the painted spears; it **stands** a moment, glinting; the ground freezes again under the foes; a second and third burst to either side; a harder, longer shake |
| The aftermath (5.52 s on) | the painted ice left standing, the wash | **the shatter**: every spire breaks at once, shards thrown, **mist** rolling up along the line; ice motes and snow fall; sheets of ice are left on the tiles, melting back from their edges under the fight |

**Bytes: 393,812** for her ten files (the explosion 187,296 and its glow 38,820; the pillar 67,522 and its glow 19,224; the sigil
32,472; the freezing front 28,944; the rest under 10 KB each).

**Three passes against main** (`nivra-game-before-after.webp`). One: the pieces wired in; the ice was pale and washed, the spires
thin as grass. Two: deeper blue with real contrast between lit and shaded faces, thicker spires, bigger shards, and the freezing
front added to the build-up. Three: veins of light and bright tips inside the crystal, so the wall's large faces have detail. Bigger
and harder than main from the pillar on.

**Honestly.** The wall's spires are plain faceted cones: they read as crystal and catch the light, but they are simpler shapes than
the painted spears, which stand in front and carry the fine detail. The mist is flat pale puffs. Her shatter is the best beat.

**Samples** (`docs/samples/eidolon-blender/`): `nivra-game-393.webp`, `-360`, `-412` (animated), their `-strip.webp`,
`nivra-game-before-after.webp`, `nivra-game-short-strip.webp`, `nivra-game-reduced-strip.webp`. Re-render:
`python3 tools/blender-fx/eidolons/nivra_parts.py <parts>` then `ID=nivra python3 tools/blender-fx/eidolons/parts_finish.py <parts>`;
the captures as Askel's with `--picks nivra`, and `ID=nivra SPAN=1.32` for `cast_samples.py`.

## Gorm in the game (stone)

His kit: the Landslide strikes every foe, turns the heroes' skin to stone (half damage for 10 s) and stuns a boss, so his show is
the ground itself rising: heavy, hard-edged, a frame slower to rise than fire and loud to land. `gorm_parts.py` renders solid rock
(flat-shaded slabs and boulders with a blocky grain, lit warm from the upper left, amber deep in their seams while they are fresh
from the ground), amber light from under the ground for the flashes, and tan dust. His call is **8.6 s** (`EIDOLON_MS`, unchanged);
the extra length carries two beats the shorter calls do not have.

| Stage | Main's, kept | Blender's |
|---|---|---|
| The horn (0 to 0.8 s) | the horn blown, the dim | his **quarry mark** is cut into the ground (a six-sided ring, chisel strokes, wedges), standing stones rising along it |
| The pass (0.8 to 3.61 s) | the painted titan, his name, title and line, stomping out to the right | the ground bursts and **great slabs are thrust up twelve tiles**, amber in their seams, rock thrown; the painting strides out of them; they grind, **tilt apart and fall** into rubble and dust |
| The sprite and the build-up (3.61 to 5.71 s) | the golem walks on and slams the ground | **the ground splits** under the foes (wide fissures racing out with a shock ring, amber inside: the first extra beat), then **slabs drive up tile by tile** from his fists to the foes; the field darkens hard |
| The strike (5.71 s, with the 0.31 s freeze) | the hit-stop, the snap zoom, the painted stone spires under each foe, the shattering ground, the fault line, the falling boulders | a hard white flash (his painted blow had none); **an amber flash from under the ground**, low and wide, in the frozen frame; **a ridge of slabs heaved up across the foes' whole side**, rolling out from the middle, behind the painted spires; boulders thrown high; the ground splits again; a second and third burst to either side; a harder shake |
| The aftermath (7.24 s on) | the painted fissure left glowing, the dust | **the aftershock** (the second extra beat): slabs heave up once more across the foes' ground, far tiles first, with a rumble and a new split; the ridge **topples outward**; dust rolls up along it; grit falls; broken ground and rubble are left on the tiles |

**Bytes: 438,320** for his ten files (the explosion 223,594 and its glow 36,856; the pillar 99,528 and its glow 16,014; the sigil
18,738; the split 18,508; the tile slab 11,254; the rest under 8 KB each). Rock with a grain packs less well than fire or ice (his
first render was 522 KB), so his two big sheets ship 14 of their 16 frames: the two dropped are ones in which the slabs only stand.

**Three passes against main** (`gorm-game-before-after.webp`). One: wired in; the slabs were streaked like timber (the grain
stretched with them) and their glowing seams covered them like a net. Two: the grain squeezed back to blocky stone, only the deepest
of each seam glowing and only while the slab is fresh, fewer and bigger slabs. Three: the rock warmed toward the painted spires'
brown so the two sit together. Bigger and harder than main from the slabs' entry on.

**Honestly.** His slabs are four-sided blocks: they read as quarried stone, but the painted spires in front are craggier and carry
the fine detail. With two frames dropped, his ridge stands a little less long than the others' walls. The aftershock is his own best
beat; the amber flash is the weakest (a flattened ball).

**Samples**: `gorm-game-393.webp`, `-360`, `-412`, their `-strip.webp`, `gorm-game-before-after.webp`,
`gorm-game-short-strip.webp`, `gorm-game-reduced-strip.webp`. Re-render: `gorm_parts.py <parts>` then `ID=gorm parts_finish.py
<parts>`; the captures with `--picks gorm` and `END=10500`, and `ID=gorm SPAN=1.72` for `cast_samples.py`.

## Voltara in the game (lightning)

Her kit: the Overload strikes every foe and half fills every hero's ultimate, so her show is a discharge: nothing solid and nothing
that lingers. `voltara_parts.py` draws jagged bolts as strips of light that are **redrawn every frame**, so they flicker and fork
anew (white down the middle, a blue rim kept solid so it survives the hard pixels), a ball of blue-white discharge, and copper and
blue sparks. Her call is **5.8 s** (`EIDOLON_MS`, unchanged), the shortest after Askel's, so she has no extra beats.

| Stage | Main's, kept | Blender's |
|---|---|---|
| The horn (0 to 0.53 s) | the horn blown, the dim | her **coil and cog** is cut in light on the ground (copper where it is dull, blue-white where it is live), arcs hopping along its ring |
| The pass (0.53 to 2.41 s) | the painted goddess floating across, her name, title and line | **the sky splits**: a trunk of four braided bolts from above the screen to the ground, forking, the ground burnt in a branching figure under it, sparks thrown; she comes out of it; it flickers thinner and is gone |
| The sprite and the build-up (2.41 to 3.81 s) | her sprite and its bolt, the charge | **small bolts strike tile by tile** from her hands to the foes, arcs crackling over each; the field darkens hard |
| The strike (3.81 s, with the 0.27 s freeze) | the hit-stop, the snap zoom, the painted bolts out of the sky onto each foe, the discharge, the chain arc | a hard white flash; **the thunderclap**, a ball of discharge with arcs flung from it, in the frozen frame; then **forks walking out across the foes' whole side**, each a bolt from the sky with a thinner twin, re-forked for four frames, a flash where it lands; the ground burnt again; a second and third thunderclap to either side; a harder shake |
| The aftermath (4.83 s on) | the painted sparks, the wash | the ground **crackling** between where the forks landed, fewer arcs each frame; sparks falling; thin wisps of smoke; burnt stars on the tiles with sparks in them, fading |

**Bytes: 390,122** for her ten files (the explosion 178,322 and its glow 45,474; the pillar 82,238 and its glow 24,376; the sigil
24,776; the burn 24,462; the rest under 6 KB each).

**Three passes against main** (`voltara-game-before-after.webp`). One: wired in; the bolts were thin and washed to white (their
blue edges fell below the hard-alpha cut). Two: bolts thicker with a solid blue rim, a twin beside each fork, the discharge ball
given blue turbulence so it is not a plain white disc, more ground crackle. Three: the walking forks thinned a little so the curtain
keeps its lines. Bigger and harder than main from the sky splitting on.

**Honestly** (her flash was softened in the polish pass above). Her strike is very bright: main's painted bolts, the flash and her forks stack to near white for about a quarter of a
second, which is the thunderclap but leaves little to read in that moment. Her aftermath is the thinnest of the four (lightning
leaves little behind): crackle, sparks and a wisp. The pillar is her best beat.

**Samples**: `voltara-game-393.webp`, `-360`, `-412`, their `-strip.webp`, `voltara-game-before-after.webp`,
`voltara-game-short-strip.webp`, `voltara-game-reduced-strip.webp`. Re-render: `voltara_parts.py <parts>` then `ID=voltara
parts_finish.py <parts>`; the captures with `--picks voltara` and `END=7600`, and `ID=voltara SPAN=1.16` for `cast_samples.py`.

## Aurelan in the game (light)

His kit: the Dawnbreak Roar strikes every foe, raises the fallen and heals, cleanses and shields the heroes, so his show is dawn
breaking: straight, clean and golden where Voltara's is jagged and blue, and nothing burns. `aurelan_parts.py` draws rays as straight
strips of light (white down the middle, gold to amber at the edge) that turn and lengthen, beams that come down from above the screen
and stand, and motes that climb. His call is **7.4 s** (`EIDOLON_MS`, unchanged); the extra length carries one more beat.

| Stage | Main's, kept | Blender's |
|---|---|---|
| The horn (0 to 0.7 s) | the horn blown, the dim | his **sun** is cut in light on the ground, lit from its middle outward as a sun rises (a disc, twelve rays, two rings, a mane of points), small rays standing up along it |
| The pass (0.7 to 3.1 s) | the painted lion striding across and leaping into the sky, his name, title and line | **a shaft of dawn** from above the screen, many rays wide, rings of light running down it, a sunburst where it lands and a sun of rays on the ground; he strides out of it; it narrows to a thread |
| The sprite and the build-up (3.1 to 4.9 s) | the lion on the board roars, the light falls from where he vanished | **a sun of rays and rings races out** on the ground under the foes (the extra beat), then **small beams come down tile by tile** to the foes; the field darkens hard |
| The strike (4.9 s, with the 0.29 s freeze) | the hit-stop, the snap zoom, the painted lances of light onto each foe, the sunburst, the dome and rays, the starbursts | a hard white flash; **the sunburst** (a white-gold disc throwing long rays that turn) in the frozen frame; **beams descending across the foes' whole side** from the middle outward, each standing a moment; **the radiant shock**, two low domes of light racing out along the ground; a second and third sunburst to either side; a harder shake |
| The aftermath (6.2 s on) | the painted curtain of light left glowing, the wash | the beams thin to threads; **motes of gold drift up** across the field; soft columns of light climb; discs of gold light are left on the tiles, thinning away |

**Bytes: 434,224** for his ten files (the explosion 205,772 and its glow 35,432; the pillar 110,614 and its glow 19,236; the sigil
22,662; the ground sun 22,422; the tile beam 11,552; the rest under 3 KB each). His shaft of rays is busy in every frame, so his
pillar ships 14 of its 16 frames (it was 460 KB with all 16).

**Three passes against main** (`aurelan-game-before-after.webp`). One (the sheets alone): the gold was washed to pale yellow and
the radiant shock barely showed. Two: richer gold with amber edges, the shock a solid low dome, the shaft's rings wider. Three: the
beams striated (a narrower core with more, wider riders) so they are not flat bars. Bigger than main from the shaft of dawn on.

**Honestly** (before the polish pass above, which gave his beams a grain and his sunburst a shape). His was the flattest of the five so far: light has no texture, so the beams are clean gold bars with pale cores, and
the sunburst's disc is a plain bright ball. At the blow the screen is mostly gold for about half a second. The painted lances and
curtain in front carry what detail there is. The sun racing out on the ground is his best beat.

**Samples**: `aurelan-game-393.webp`, `-360`, `-412`, their `-strip.webp`, `aurelan-game-before-after.webp`,
`aurelan-game-short-strip.webp`, `aurelan-game-reduced-strip.webp`. Re-render: `aurelan_parts.py <parts>` then `ID=aurelan
parts_finish.py <parts>`; the captures with `--picks aurelan` and `END=9400`, and `ID=aurelan SPAN=1.48` for `cast_samples.py`.

## Vaelkhar in the game (shadow)

His kit: the Crown of Night strikes every foe, strips the shields and boons from bosses and elites, and lets the heroes drain what
they deal, so where the others throw light out, his show takes it in. `vaelkhar_parts.py` renders black fire with a violet edge (its
core is the dark, its rim the light), tears in the air and the ground, and a maw that ends the blow by pulling everything back into
itself. His call is **9.8 s** (`EIDOLON_MS`, unchanged), the longest, with both extra beats.

| Stage | Main's, kept | Blender's |
|---|---|---|
| The horn (0 to 0.91 s) | the horn blown, the dim | his **crown of horns and slit eye** is cut in violet on the ground, black flames standing along it |
| The pass (0.91 to 4.12 s) | the painted dragon diving in and sweeping over the field, his name, title and line | **a tear in the air** twelve tiles tall rips upward, opens to a black lens with violet fire along its lips, shadow pouring from its foot and the ground torn under it, motes drawn in; he comes out of it; it snaps shut |
| The sprite and the build-up (4.12 to 6.52 s) | the dragon comes down and pours his torrent | **the rift** tears across the ground under the foes (jagged tears with a violet ring, left lying black: extra beat one), then **black tongues** catch tile by tile; the field darkens hard |
| The strike (6.52 s, with the 0.33 s freeze) | the hit-stop, the snap zoom, the painted black fire round each foe, the void and the maw, the pouring streams | a hard flash; **a maw opens** on the foes' middle, violet fire thrown from its rim, in the frozen frame; **two wings of dark sweep up and out across the foes' whole side**, the leading fingers first, behind the painted fire, and stand; a second and third maw to either side; a harder shake |
| The aftermath (8.27 s on) | the painted violet fire left burning, the wash | **the maw drains** (the blow's own ending): the fire on its rim bends inward, streaks of violet are pulled in from everywhere, the wings are dragged back into it and it closes on a last violet spark; then **the aftershock** (extra beat two): black tongues flare once more across the foes' ground with a new tear; dark smoke climbs; violet motes are drawn upward; blight is left on the tiles |

**Bytes: 376,678** for his ten files (the explosion 198,168 and its glow 14,408; the pillar 98,980 and its glow 1,642; the sigil
22,486; the rift 16,126; the tile tongues 10,894; the rest under 9 KB each). His glow sheets are small because little of him is
bright. His tear ships 14 of its 16 frames.

**Three passes against main** (`vaelkhar-game-before-after.webp`). One: wired in; the wings were low and spread flat, and all of
it one mid-violet. Two: wings taller and more upright, the fire's colours shifted so most of it is black and only the thin edge
violet. Three: a little violet given back to the wings' rims so they do not go dull against a dark field. Bigger than main from the
tear on.

**Honestly.** Dark on a darkened field is the hardest thing to make hit: his blow is the biggest shape of the six but the least
bright, and it leans on the page's flash and shake for its impact. The wings are fans of long cones and read as spines or a crown
as much as wings. The white flash is the same as the others' (main gave him none): if the owner wants his blow to stay dark, that
is one number (`BLOW_FEEL.flash`, which would need to become per Eidolon). The drain, the maw closing on a spark, is his best beat
and the one thing no other Eidolon has.

**Samples**: `vaelkhar-game-393.webp`, `-360`, `-412`, their `-strip.webp`, `vaelkhar-game-before-after.webp`,
`vaelkhar-game-short-strip.webp`, `vaelkhar-game-reduced-strip.webp`. Re-render: `vaelkhar_parts.py <parts>` then `ID=vaelkhar
parts_finish.py <parts>`; the captures with `--picks vaelkhar` and `END=11500`, and `ID=vaelkhar SPAN=1.96` for `cast_samples.py`.

## Askel in the game

The owner, on the first wiring: "remake the blender effects for the eidolon if needed. make it have force. make it epic." So the
Blender pieces were remade as large hero pieces and laid with main's painted strike, not instead of it. Judged against main side by
side over three full passes (`docs/samples/eidolon-blender/askel-game-before-after.webp`): bigger and harder than main at every beat
from the pillar on.

The show is cut into sheets the page lays by the board's own tiles, so it follows a board that is turned or not flat, in two layers
(`tools/blender-fx/eidolons/parts.py`, finished by `parts_finish.py`: the heroes' pixels, 32 colours shared by all, hard alpha, and a
soft glow sheet under the two big pieces):

| Sheet | Frames | What it is | Layer |
|---|---|---|---|
| `askel-stage-sigil` | 22 of 160 x 96 | burns on round its ring and inward, glows, cools and fades | the ground, under the fighters |
| `askel-stage-cracks` | 12 of 256 x 136 | a shock ring racing out and the ground cracking open white-hot, then red, then dark | the ground, under the fighters |
| `askel-stage-scorch` | 8 of 88 x 48 | a patch of burnt ground, its coals cooling, then fading | the ground, under the fighters |
| `askel-stage-pillar` (+ glow) | 16 of 144 x 352 | the pillar: the ground bursts, a white core, ragged tongues twisting up 12 tiles, rock thrown, torn away | over the fighters |
| `askel-stage-explosion` (+ glow) | 16 of 320 x 300 | the blow: a white-hot core blown out with spikes of flame, a wall of fire wider than the screen in three ranks of tongues, rock and embers thrown, heavy smoke rolling off it | over the fighters |
| `askel-stage-fire` | 14 of 64 x 112 | a tile catching fire: thin pointed tongues | over the fighters |
| `askel-stage-smoke` | 16 of 128 x 176 | a heavy column of smoke | over the fighters |
| `askel-stage-embers` | 12 of 160 x 200 | embers falling, a loop | over the fighters |

**459,842 bytes** in all (the explosion 246,542 and its glow 32,430; the pillar 92,128 and its glow 16,832; the sigil 35,158; the
cracks 16,528; the rest under 10 KB each). The largest sheet is 2560 x 600, inside any phone's texture limit. They load by URL from
`src/art/eidolons/fx/`, which `build.mjs` already copies and lists in the service worker's `FILES`, so they play offline.

**Making it smaller** (after 0.501.0, which shipped 520,144 bytes). Two things were tried on the explosion, the largest sheet:
- **Lossy WebP: not kept.** The sheet is 32 flat colours, which lossless packs well and lossy does not: at quality 90 the file is
  larger (365,172 bytes against 299,452), at 85 barely smaller (283,426), and only at 75 a real saving (203,538), where the flames'
  hard pixels visibly soften (`docs/samples/eidolon-blender/askel-explosion-lossless-q90-q75.webp`: lossless, 90 and 75, top to
  bottom, at twice the size).
- **Fewer frames: kept.** It is rendered as 20 frames and shipped as 16: every frame of the blast itself, two in three of the long
  burn and the smoke after it, where one frame is much like the next. 60,314 bytes off (the sheet and its glow), and matched stills
  of the cast cannot be told apart (`askel-explosion-20-vs-16-frames.webp`: 20 above, 16 below). The palette is still taken from all
  20, so no other sheet changed by a byte.

**What plays.** Askel's call stays **5.0 s** (`EIDOLON_MS`, unchanged: the show fits, and its smoke, embers, cracks and coals carry on
over the fight after it; nothing in its beats, the sim or the speed rule changed):

| Stage | Main's, kept | Blender's |
|---|---|---|
| The horn (0 to 0.46 s) | the horn blown, the dim | the **sigil** burns onto the ground where the hound will come on, under the fighters |
| The pass (0.46 to 2.06 s) | the painted Askel, its name, title and line, its bounding run, out to the left | the **pillar** bursts out of the sigil (0.95 s, with its glow, the ground **cracking** under it and a rumble) and the painting **leaps out of it**, white-hot then itself |
| The sprite and the build-up (2.06 to 3.26 s) | the sprite hound runs on and breathes, the charge closes | **fire crosses the foes' ground** tile by tile from its jaws; the field is **darkened hard** just before the blow |
| The strike (3.26 s, with the 0.26 s freeze) | the hit-stop, the snap zoom, the shockwave ring, the painted great burst, the painted walls of fire, the wave and firestorm, the aftershocks, the embers flung | a **hard white flash** (0.95, was 0.55 tinted), the **explosion**: its white core already blown out in the frozen frame, then its wall of fire behind the painted walls, wider and taller than them; the ground **cracks open** and glows under the foes; a harder, longer **shake** (1.5 for 0.76 s, was 0.8 for 0.52 s); a **second and third detonation** to either side on the attack's later beats, each with a thud |
| The aftermath (4.13 s on) | the painted wall left burning, the wash | **heavy smoke** rolls up along the wall (five columns), **embers fall** across the field, the ground is left **scorched** with coals cooling, the cracks go dark, the sigil cools; all of it fades over the fight running again |

**Two layers, following the board.** The sigil and the cracks are laid like the game's painted ground loops (`GroundPaint`): once for
each diagonal row of tiles they cover, cut to that row's tile tops and drawn just after them, so the fighters stand over them. New
here (`render/groundSheet.ts`): tiles of another height take their own copy, moved by their height, so they bend over a hill or a pit.
Each scorch patch lies on its tile's own ground layer. The standing pieces are strips on the call's own layer (`stageSheet.ts`), each
on its tile's place on the page. Nothing has a facing baked in: the wall runs across the screen, the fire crosses whichever way the
foes lie.

**The short call** (2.2 s, on Auto or with full calls off): the sigil is there from the start, the pillar burns in 0.57 s, the blow
and one more detonation, fewer burning tiles and smoke columns. **Battery saver**: fewer tiles, two smoke columns, one fall of embers.
**Reduced motion**: every strip holds its steady frame and fades (the layer's own rule), the sigil and the cracks are one steady frame,
the painting fades in held still; no smoke, embers, flames before the painting, shake or rumble, and the field is not darkened hard
before the blow (it keeps the lighter dim every call has, so nothing goes nearly black and comes back:
`askel-reduced-dim-before-after.webp`).

**Where things are.** `src/eidolonStage.ts` (pure: the sheets' shapes, `sigilFrame`, `sigilSpot`, `risePass`, `wavePlan`,
`scorchFrame`, `cracksFrame`, `BLOW`, `BLOW_FEEL`, `DETONATIONS`, the budgets; `STAGED` has Askel only, so the other five play exactly
as before). `src/render/groundSheet.ts` (the ground player) and `src/stageSheet.ts` (the strip player, rows of frames and glow sheets
too): small and apart, so the general frame-sheet player (`claude/blender-fx`) can take them over. `src/eidolonCall.ts`: `stageFor`,
`stepStage`, `stagedLead`, `stagedStrike`, `stagedBlow`, `stagedDetonation`, `layCracks`, `dropStage`, and the painting's rise in
`pass`. `src/render/fx.ts`: the Eidolons' riders show their names over the heroes ("Kindled", "Stone skin", "Life drain") where the
raw keys ("eidolonWarm"...) showed. `test/eidolon-stage.test.ts` (eleven tests).

**The three passes.** One: the explosion, cracks, pillar, smoke and embers wired in; the glow sheets showed as dark boxes (they were
black-backed light on a layer that could not blend) and the wall was a row of big clean cones. Two: the glow made see-through light,
the wall rebuilt from three ranks of thinner tongues; bigger than main everywhere but still clean-edged. Three: the fire's cut raised
so its turbulence tears the outlines ragged, and the wall moved behind the painted walls so their detail shows against it.

**Honestly.**
- The Blender fire is tongues built from cones with turbulent, torn edges. It is large, sharp and bright, but it is streakier than
  painted fire; up close a tongue still reads as a spike. The painted walls in front carry the fine detail.
- 460 KB is a lot beside the first version's 120 KB; the explosion is most of it, and lossy packing does not help it (above).
- The blow lays more at once than main's (the explosion and its glow, two detonations, five smokes, three ember falls, the lead-in
  fires) on top of the painted strike. It ran without trouble in the captures; a slow phone has battery saver.
- The sigil is dim while the horn sounds: it lies under the call's dim, with a glow put back over it.
- The Last Stand's hall has no tile ground layers, so there the sigil, cracks and scorch are left out and the standing pieces play.

**Checked.** `npm run typecheck`, the full suite, `npm run web`, and the whole cast captured in a real fight (the Orc Warband's last
wave) at 393 x 852, 360 x 780 and 412 x 915, with the short call and reduced motion at 393 x 852 (`docs/samples/eidolon-blender/`):

- `askel-game-393.webp`, `-360`, `-412`: the whole cast, animated; `askel-game-<size>-strip.webp`: twelve stills of each.
- `askel-game-before-after.webp`: main's call above, the staged one below, at the same moments.
- `askel-game-short-strip.webp`, `askel-game-reduced-strip.webp`.

```bash
pip install bpy
python3 tools/blender-fx/eidolons/parts.py <parts>                     # the pieces, about five minutes (PART=explosion picks one)
python3 tools/blender-fx/eidolons/parts_finish.py <parts>              # the sheets, into src/art/eidolons/fx/
npm run web && STEP=84 END=6720 PORT=9071 OUT=<shots> node tools/blender-fx/eidolons/shots.mjs [--size 360x780] [--short] [--reduced]
python3 tools/blender-fx/eidolons/cast_samples.py <shots> <main's shots> docs/samples/eidolon-blender
```

**For the next five.** Each needs its own sheets (its sigil's design, its element's pillar, blow, ground break, tile piece, ground
mark and what drifts off it) and one entry in `STAGED`; the page's side is shared, and each keeps its painted strike. Ice, stone and
light need a second material beside the fire's (solid shards and rock that catch the light; the prototype has both).

---

# The trial that led to it: the fire Eidolon as one Blender scene

The owner: "lets try a pass with the eidolons in blender too to see if we can improve them. start with the fire one." And the casts are
to feel epic and last 4 to 10 seconds (the timing and the slow-down are another builder's, ULT-EPIC; nothing here touches them).

**This was a trial to look at.** Nothing in it is wired into the game; the hybrid above is what shipped.
Branch `claude/eidolon-blender`, from `claude/blender-fx` (the Blender prototype and the pixelated finish the owner chose).

## What to look at (`docs/samples/eidolon-blender/`)

- `askel-cast.webp`: the whole cast, 8 seconds at 12 frames a second, laid over a real fight at 393 x 852 (the Orc Warband's last wave).
- `askel-stages.png`: eight stills of its stages, at twice the size so the pixels show.
- `askel-today-vs-blender.png`: today's Askel against this one, the figure and the strike.
- `askel-today-frames.png`: today's cast frame by frame (every 300 ms of its 4 seconds), for reference; `plate.png` is the fight the
  frames are laid over.
- `askel-sheet.webp` and `askel-glow-sheet.webp`: what would ship (below).

## Today's fire Eidolon

Askel the Cinderhound (`docs/notes/eidolons.md`, `eidolon-call-2.md`, `eidolon-fx.md`): about 4 seconds. The horn, the painted figure
passing over the board with its name and line, a small sprite of the hound running in, its breath, then the great burst, the walls of
fire over each foe and the fire left on their ground. Its pieces are a painting (900 px), a 24-frame sprite sheet and painted spell
sheets, moved by the page.

## The Blender show (8 seconds, one scene)

`tools/blender-fx/eidolons/askel.py` stages it all in one scene, from the game's camera (orthographic, 30 degrees down, turned 45), in the
game's tiles, so everything lies on the ground as the board does:

| Time | Stage |
|---|---|
| 0.15 to 2.25 s | **The wind-up.** A sigil (two rings, runes, three fangs, a hound's eye) burns onto the ground round its ring and inward, white-hot where it is being drawn; small flames catch along it; embers spiral in to the middle; the ground's glow grows. |
| 2.25 to 3.45 s | **The arrival.** A pillar of flame nine tiles tall with a ring of force; the hound comes up out of the ground inside it, rearing, as the pillar thins. |
| 3.45 s | **The slam.** Its forefeet come down: a white flash, a second ring, sparks thrown. |
| 3.65 to 4.3 s | **The howl.** Head thrown back, jaws open, the cracks in its hide blazing. |
| 4.45 to 5.8 s | **The strike.** It braces and breathes a torrent of fire, swept across the foes' ground from one side to the other; the ground blackens under it and catches fire behind it. |
| 6.15 to 8 s | **The aftermath.** The hound burns away to embers from the edges in; smoke climbs off the burnt ground; embers fall; the fires die, the coals cool and the sigil dulls and fades. The last frame is empty. |

The hound is modelled from simple shapes (about four and a half tiles to its ears, so it towers over the heroes): black rock, cracked,
the cracks running with lava and blazing harder as it howls and breathes (lit from within), a mane and a tail of flame, burning eyes,
fangs and a fire in its throat.

**The finish** (`finish.py`, the owner's choice from `tools/blender-fx/README.md`): frames are rendered at 450 x 630 and shrunk to
300 x 420, the heroes' pixel size (a hero's pixel is about 1.4 of the board's); cut to 24 colours shared by the whole show; the alpha
hardened (bright pixels are there or not; the dark smoke and scorch keep three flat steps of see-through so the ground shows); and the
brightest parts keep a soft glow underneath, as light on the screen.

**Looked at and redone** (the first render is never the good one): three quick passes of ten frames and two full renders. What changed
between them: the hound was a third of its size and its hide a mesh of white cracks (a giraffe); it stood with its jaws already over
the foes, so the breath left the screen; the scorched ground was a hard wedge and showed before the breath; the ground's glow became a
solid disc that hid the heroes; the rock speckled (the render is now denoised); the head was too small to read; the smoke was peppered.

## Honestly: better and worse than today's

**Better**
- **It is a show with a shape.** Wind-up, arrival, slam, howl, strike, aftermath: eight seconds that build, where today's four are
  separate pieces cut together. This is what the owner asked the casts to be.
- **It belongs to the board.** The sigil, the rings, the breath, the burnt fan and the fires all lie on the ground at the board's own
  angle, and the fire lights the hound. Today's figure and bursts are flat pictures laid over the screen.
- **One hound.** The same creature rises, howls, breathes and burns away. Today a painting passes and a small sprite does the work.
- **Things today's has none of:** the sigil being drawn, the rising out of the pillar, the hound burning away, the scorch and coals.
- **Cheap to change.** A time or a size is a number in the script; all 96 frames re-render in about ten minutes on four CPU cores.

**Worse**
- **The hound is a worse drawing.** Today's painted Askel is a far better picture of a hound: fur of cinders, a real snarl, weight.
  This one is built from balls and cones; it reads as a great beast with ears, jaws and a tail of flame, but closer to a hyena or a big
  cat, and its hide is busier than the painting's (too much orange line, not enough black). At hero pixel size its face is a few pixels.
- **The strike has less force.** Today's blow fills the foes' half with a white flash, a bloom, a great burst, walls of fire and
  numbers. The Blender breath is a rolling cloud that reads as soft, lumpy fire, and it has no flash, hit-stop, shake or snap zoom
  (those are the page's, and would be added when wired).
- **No close-up, name or line.** The name stamp and the spoken line are today's best beat; this trial does not replace them, and the
  painting should stay for them.
- **Fire made of noisy shells, not simulated flame.** Good as pixels, but the pillar and breath are blobby in places.
- **It hides the heroes.** The sigil lies under the heroes' feet and the hound stands just behind them, drawn over everything as
  today's cast is. Wired in properly it would be two layers (the ground's under the fighters, the hound and fire over them).
- **The ground is flat.** The scene assumes level ground; this battlefield is a low dome, so the far edge of the sigil floats a few
  pixels. A tall hill or a pit under it would show.
- **One facing.** It is rendered for this fight's lie (the foes down and to the right). An army section turned another way would need
  the sheet mirrored, or a second render.

## If it shipped

- `askel-sheet.webp`: the 96 pixel frames, 3600 x 3360, lossless: **818,260 bytes**. `askel-glow-sheet.webp`: the glow at a quarter
  size: **30,626 bytes**. About 849 KB together, against about 523 KB for today's six Askel files, and about 1.1 MB for everything
  under `src/art/eidolons/` today. Six Eidolons at this size would be about 5 MB more for the offline cache.
- Ways to make it smaller: 10 frames a second (a sixth off), cropping each stage to its own box (the wind-up and aftermath are mostly
  empty), or splitting the hound (a small loop) from the ground effects.
- A 3600 x 3360 texture is large for a phone's GPU; it would be cut into two or three sheets or drawn on a 2D canvas.
- Wiring is its own job (and needs ULT-EPIC's timing): the frames drawn at the hound's tile through the board's projection in two
  layers, the page's flash, hit-stop and shake at 3.45 s and 4.45 s, the sim's strike let through at the breath, the name and line kept
  over the howl, a short version for the setting, and a still one for reduced motion.

## What the other five would take

The stage (camera, sigil, embers, rings, scorch, smoke, the finish and the samples) is shared; each Eidolon needs its own figure, its own
element's material and its own strike. Roughly a half to a full day each at this quality, most of it on the figure:

- **Nivra the Rime Wyrm** (ice): a long body along a curve is easy; ice is solid and catches light, which Cycles does well (the
  prototype's ice spikes were its best effect). Likely the strongest of the six.
- **Gorm the Quarry Titan** (earth): blocks of rock are what simple shapes do best; stone spires and dust. Easy and should look good.
- **Voltara the Copper Goddess** (lightning): bolts are easy (the prototype has them); a human figure is the hardest thing to model
  from simple shapes. The risk is the figure.
- **Aurelan the Lion of Dawn** (light): a lion has the hound's problem (a face and a mane to read at a few pixels); light shafts are easy.
- **Vaelkhar the Dragon King** (dark): wings, horns and a long neck: the most modelling. Dark fire is the fire here recoloured.

**A suggestion.** The weak part is the modelled figure and the strong part is the staged ground show. A mix may be the best of both:
keep each Eidolon's painting (and its sprite) for the figure, the name and the line, and use Blender for what it does well: the sigil,
the pillar, the breath on the ground, the scorch and the aftermath, lit and laid at the board's angle. Or have the figures painted
(a ChatGPT sheet per Eidolon from the game's camera angle) and the ground show rendered round them.

## Re-rendering

```bash
pip install bpy
npm run web && PORT=9071 OUT=<shots> node tools/blender-fx/eidolons/shots.mjs      # today's cast, the plate and plate.json
python3 tools/blender-fx/eidolons/askel.py <frames>                                 # about ten minutes; STEP=8 SS=1 for a quick look
python3 tools/blender-fx/eidolons/finish.py <frames> <shots> docs/samples/eidolon-blender
```

What ran for this trial: the three scripts above (two full renders and three quick passes), and the samples looked at by eye. No
typecheck, build check or tests were needed: nothing in `src/` changed (`npm run web` was run only to take today's pictures).
