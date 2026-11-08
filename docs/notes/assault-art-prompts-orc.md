# The Assault: ChatGPT prompts for the Orc hold (Bloodtusk Hold)

The plan, the reasons and the full asset list are in [assault-art-plan.md](assault-art-plan.md). This file holds one prompt for each of
the 13 sheets, ready to paste. **They are ordered by what phase 1 needs most.**

**How to use them:**

- Paste everything inside one fence into a new ChatGPT (Codex) conversation.
- Each prompt stands alone, and all of them add to the one branch and the one pull request.
- Each sheet is one image. If a sheet comes back wrong (the angle, the grid, a busy background), run the same prompt again. Allow two or
  three tries a sheet: about 30 to 40 images in all.
- ChatGPT adds the PNGs only. The builder cuts the sheets afterwards (`tools/assault/cut-sheets.py`, plan 2.1), credits them, and adds
  them to the service worker.

**The reference files the prompts name:**

- `docs/samples/assault-art/orc-kit.jpg`: the Chronos Orc kit pieces the sheets must sit beside;
- `docs/samples/assault-art/template-*.png`: the grids;
- `src/art/camp/camp-war.png`: the orc camp as the overlook paints it;
- `src/art/road/atlas.png`: the kit pieces as the game draws them;
- `docs/samples/assault-art/field-today-393.png`: the map as it draws today.

The `docs/samples/assault-art/` files are on `claude/assault-art-plan` until that branch is merged. Each prompt says how to fetch them.

| # | Sheet | File | Canvas | Cells |
| --- | --- | --- | --- | --- |
| 1 | ORC-01 The palisade | `orc-01-palisade.png` | 1024 x 1024 | 16 |
| 2 | ORC-02 The palisade's gates | `orc-02-gates.png` | 1536 x 1024 | 6 |
| 3 | ORC-03 The Iron Gate and the towers | `orc-03-iron-gate.png` | 1536 x 1024 | 6 |
| 4 | ORC-04 Cliff and wall faces | `orc-04-faces.png` | 1536 x 1024 | 12 |
| 5 | ORC-05 Ground textures | `orc-05-ground.png` | 1024 x 1024 | 16 |
| 6 | ORC-06 Ground transitions | `orc-06-transitions.png` | 1024 x 1024 | 16 |
| 7 | ORC-07 The keep and the throne | `orc-07-keep.png` | 1536 x 1024 | 3 |
| 8 | ORC-08 The wall's dressing and the stairs | `orc-08-wall-dressing.png` | 1024 x 1024 | 16 |
| 9 | ORC-09 The war camp's big pieces | `orc-09-camp.png` | 1536 x 1024 | 6 |
| 10 | ORC-10 The war camp's props | `orc-10-camp-props.png` | 1024 x 1024 | 16 |
| 11 | ORC-11 Siege works and ruins | `orc-11-siege-ruins.png` | 1536 x 1024 | 6 |
| 12 | ORC-12 Bridges, fords and the river | `orc-12-river.png` | 1024 x 1024 | 16 |
| 13 | ORC-13 Ground decals | `orc-13-decals.png` | 1024 x 1024 | 16 |

---

## Prompt 1: ORC-01, the palisade

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its new Assault mode is fought on a 100 x 100 tile isometric map of an orc fortress, Bloodtusk Hold.
This task paints ONE sheet of pieces for that map: the log palisade round the orc town, in every state of the siege.

Rules for this task:
- Branch: art/assault-orc. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/orc/orc-01-palisade.png. Change no other file.
- Pull request into main titled "Assault art: the Orc hold". If it is already open, push to it and add this sheet to the list in its
  body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, shadows boxes, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG). Each piece casts only a small soft contact shadow on its own footprint.

Open these files first and match them:
- docs/samples/assault-art/orc-kit.jpg: the existing orc kit (Chronos Settlement's isometric kit). Your pieces stand beside these,
  above all orcs/spiked_wall_run, orcs/spiked_wall_corner and orcs/skull_gate. Same wood, same lashings, same red cloth, same skulls.
- src/art/camp/camp-war.png: the orc war camp as painted for the camp's overlook (the palette, the black-brown timber, the blood-red
  banners with a white horned skull, the torches).
- src/art/road/atlas.png: the same kit pieces as the game draws them.
- docs/samples/assault-art/template-props-1024.png: the layout grid for this sheet (use it only as a guide; draw none of its lines).
If docs/samples/assault-art/ is missing on main: git fetch origin claude/assault-art-plan, then
git show origin/claude/assault-art-plan:docs/samples/assault-art/<file> > /tmp/<file> for each file.

Style: detailed painted pixel art, exactly like the orc kit. Crisp dark outlines, chunky readable shapes, a muted earthy palette
(dark brown timber, grey-brown mud, bone white) with blood-red cloth as the accent, light weathering, a warm torchlit feel. It must
read clearly when shown at a quarter of this size on a phone.

The angle and scale, exactly:
- True 2:1 isometric (dimetric) view, no perspective: a flat square tile on the ground is a diamond exactly twice as wide as it is
  tall, its corners pointing up, right, down and left. Vertical edges stay vertical.
- ONE TILE = a diamond 128 px wide and 64 px tall. ONE HEIGHT STEP = 24 px. The palisade's stakes stand about 4 steps (96 px) tall,
  their sharpened tips a little higher.
- Light from the upper left: faces turned to the lower left are lit; faces turned to the lower right are in shade.
- "Along u" means running from the upper left down to the lower right (like "\"). Every run on this sheet runs along u, passing
  through its tile from the midpoint of the diamond's upper-left edge to the midpoint of its lower-right edge, so that pieces placed on
  neighbouring tiles join seamlessly at those points. (The game mirrors them for runs going the other way.)
- The OUTER face of the palisade is the face turned to the viewer's lower left: bark, lashings, shields, red cloth. The INNER face
  (cell 5) is the back of the same wall: braces, a plank fighting step, rope.

The sheet: 1024 x 1024 px, a 4 x 4 grid of 256 x 256 cells, read left to right, top to bottom. Every piece has a ONE-TILE footprint:
its diamond's centre (the foot point) is at (128, 208) inside its cell. Keep each piece inside its own cell with 8 px to spare.

1. Palisade run, outer face, whole: a row of thick sharpened logs lashed with rope, a round shield and a strip of red cloth on it.
2. The same run, battered: arrows stuck in it, two tips split, the shield hanging by one strap, scorch on one log.
3. The same run, broken: the logs snapped to jagged stumps about 1.5 steps high, splinters, one log fallen across. Still a barrier.
4. The breach: no wall left. A ramp of tumbled logs, earth and splinters sloping down to the lower left, as if into a ditch. Walkable.
5. Palisade run, inner face, whole: the back of cell 1. Diagonal braces, a plank fighting step a step and a half up, a coil of rope.
6. Corner, south (the corner nearest the viewer): two runs meet at the bottom of the tile, one running up-left and one running up-right,
   both showing their OUTER faces, with a thick corner post topped by a horned skull.
7. Corner, north (the far corner): two runs meet at the top of the tile, going down-left and down-right, both showing their INNER
   faces, with a corner post and a fighting platform.
8. Corner, east: a run coming from the upper left meets a run going down to the lower left at the tile's right corner. The first shows
   its inner face and the second its outer face. Corner post with a skull.
9. Gate post: one very thick log post, taller than the wall, carved, with a horned bull skull, a torch and a hanging red banner. It
   ends a run beside a gate.
10. Sally port, one tile wide, whole: a narrow gate of lashed logs set in the run, iron bands, a small skull over it, outer face.
11. The sally port, battered: hacked, arrows in it, a bar splintered.
12. The sally port, broken: torn open, one leaf hanging from its post and the other on the ground. Passable.
13. Barricade (the bridge fort's): a low wall, chest-high (about 2 steps), of piled logs, cart wheels and shields, a few stakes out
    front. Runs along u.
14. The barricade, broken: scattered logs and shields, a smashed wheel, low enough to step over.
15. Ditch stakes: a cluster of sharpened stakes driven into the ground at an angle, leaning out to the lower left, about 1.5 steps
    high, some with old bones at their feet. Fills most of the tile.
16. Stake line: a single row of sharpened stakes across the tile along u, leaning out to the lower left, about 2 steps high, lashed to
    a log at their foot.
```

## Prompt 2: ORC-02, the palisade's gates

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its new Assault mode is fought on a 100 x 100 tile isometric map of an orc fortress, Bloodtusk Hold.
This task paints ONE sheet: the palisade's two big gates, in their siege states, and the gate towers' tops.

Rules for this task:
- Branch: art/assault-orc. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/orc/orc-02-gates.png. Change no other file.
- Pull request into main titled "Assault art: the Orc hold". If it is already open, push to it and add this sheet to the list in its
  body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG). Only a small soft contact shadow on each piece's own footprint.

Open these files first and match them:
- docs/samples/assault-art/orc-kit.jpg: the existing orc kit. Match orcs/skull_gate, orcs/spiked_wall_run and orcs/siege_tower above
  all: the same timber, horned skulls, red banners with a white horned skull, torches and iron.
- src/art/camp/camp-war.png: the orc war camp as painted for the overlook (its main gate is the look to aim for).
- docs/samples/assault-art/template-buildings-1536.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing on main: git fetch origin claude/assault-art-plan, then
git show origin/claude/assault-art-plan:docs/samples/assault-art/<file> > /tmp/<file> for each file.

Style: detailed painted pixel art, exactly like the orc kit. Crisp dark outlines, chunky readable shapes, a muted earthy palette with
blood-red cloth as the accent, bone white, light weathering, warm torchlight. It must read at a quarter of this size on a phone.

The angle and scale, exactly:
- True 2:1 isometric (dimetric), no perspective: a flat square tile is a diamond twice as wide as it is tall, corners up, right, down
  and left. Vertical edges stay vertical.
- ONE TILE = a diamond 128 px wide and 64 px tall. ONE HEIGHT STEP = 24 px. The palisade either side of a gate is about 4 steps
  (96 px) tall; the gates rise higher. A gateway's opening is about 4 steps tall and 1.5 tiles wide.
- Light from the upper left: faces turned to the lower left are lit, faces turned to the lower right in shade.
- Every gate runs along u (from the upper left down to the lower right, like "\") and joins palisade runs at the midpoints of its
  footprint's upper-left and lower-right edges. The game mirrors it for the other direction.

The sheet: 1536 x 1024 px, a 3 x 2 grid of 512 x 512 cells, read left to right, top to bottom. Each piece's footprint is a 2 x 2-tile
diamond, 256 px wide and 128 px tall, centred on the foot point (256, 416) in its cell. Keep each piece inside its cell with 8 px to
spare.

1. The South Gate, whole, seen from OUTSIDE (its outer face turned to the lower left): a heavy gatehouse of black timber on the
   palisade line, two great log doors with iron bands, a fighting gallery across the top under a hide roof, a horned bull skull over
   the doors, red banners either side, two torches. Based on orcs/skull_gate, but grander.
2. The same South Gate, battered: doors cracked and sagging, arrows and a broken spear in them, the gallery's roof half torn off,
   one banner burning, scorch marks, the skull chipped.
3. The same South Gate, broken: the doors smashed in and lying flat, the opening clear and walkable, the gallery collapsed at one end,
   splinters and fallen logs at the sides (not in the opening), the skull fallen on the ground.
4. The North Gate, whole, seen from INSIDE the fortress (its inner face turned to the lower left): a plainer, smaller gate of logs, a
   bar across the doors in iron brackets, a simple lookout platform and ladder, one torch, one red pennant.
5. The North Gate, broken: the bar snapped, the doors burst outwards and hanging open, the platform leaning. Walkable opening.
6. Gate tower top: the top of a square wooden tower that stands on a raised earth platform beside the South Gate (the platform itself
   is drawn by the game; draw only what stands on its 2 x 2 top): a timber fighting platform with a waist-high parapet of logs, four
   corner posts holding up a red-and-hide roof, a brazier, a red banner on a pole, a rack of spears.
```

## Prompt 3: ORC-03, the Iron Gate and the towers

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its new Assault mode is fought on a 100 x 100 tile isometric map of an orc fortress, Bloodtusk Hold.
Inside the log palisade stands a stone curtain wall, 6 height steps tall, with an iron gate and four corner towers. This task paints
ONE sheet: the stone wall's gates and its tower tops.

Rules for this task:
- Branch: art/assault-orc. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/orc/orc-03-iron-gate.png. Change no other file.
- Pull request into main titled "Assault art: the Orc hold". If it is already open, push to it and add this sheet to the list in its
  body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG). Only a small soft contact shadow on each piece's own footprint.

Open these files first and match them:
- docs/samples/assault-art/orc-kit.jpg: the existing orc kit (the timber, iron, skulls and red banners).
- src/art/camp/camp-war.png: the orc war camp as painted for the overlook.
- docs/samples/assault-art/template-buildings-1536.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing on main: git fetch origin claude/assault-art-plan, then
git show origin/claude/assault-art-plan:docs/samples/assault-art/<file> > /tmp/<file> for each file.

Style: detailed painted pixel art, exactly like the orc kit. The orcs took this stone fort and made it theirs: big rough-cut
dark grey stone blocks, black iron, crude orc additions (spikes, skulls, red cloth, timber hoardings). Crisp dark outlines, chunky
readable shapes, a muted palette with blood-red accents and warm torchlight. It must read at a quarter of this size on a phone.

The angle and scale, exactly:
- True 2:1 isometric (dimetric), no perspective: a flat square tile is a diamond twice as wide as it is tall, corners up, right, down
  and left. Vertical edges stay vertical.
- ONE TILE = a diamond 128 px wide and 64 px tall. ONE HEIGHT STEP = 24 px. The stone wall is exactly 6 steps (144 px) tall from the
  ground to its walkway, plus merlons. The game draws the wall itself; the gates fill gaps in it, so each gate's front must be exactly
  144 px tall to the walkway line, flush with the wall on either side, and may rise higher above it (a gate tower).
- Light from the upper left: faces turned to the lower left are lit, faces turned to the lower right in shade.
- The gates run along u (from the upper left down to the lower right, like "\"); the game mirrors them. The wall is 2 tiles thick.

The sheet: 1536 x 1024 px, a 3 x 2 grid of 512 x 512 cells, read left to right, top to bottom. The foot point (the centre of the
footprint diamond) is at (256, 416) in every cell. Footprints: cells 1 to 3 are 2 x 2 tiles (a diamond 256 x 128); cells 4 and 5 are
1 tile along the wall by 2 tiles through it (a diamond 192 x 96); cell 6 is 3 x 3 tiles (a diamond 384 x 192). Keep each piece inside
its cell with 8 px to spare.

1. The Iron Gate, whole, seen from OUTSIDE (outer face to the lower left): a stone gatehouse block 6 steps tall with a deep arched
   passage, a black iron portcullis down across it, a horned skull and chains over the arch, red banners hanging either side, and
   above the walkway a squat crenellated gate tower with a timber hoarding and a brazier. The strongest-looking thing on the map.
2. The same Iron Gate, battered: the portcullis dented and scorched, stones cracked and chipped round the arch, one banner torn, soot
   streaks, the hoarding half burnt.
3. The same Iron Gate, broken: the portcullis bent and wrenched up and to one side, the passage open and walkable, rubble at the
   sides (not in the passage), the skull fallen, the tower above cracked but standing.
4. The postern, whole, seen from INSIDE (inner face to the lower left): a narrow arched stone doorway through the 2-thick wall, a
   studded iron-bound door, a torch bracket. Flush with the wall, 6 steps tall.
5. The postern, broken: the door off its hinges on the ground, the arch open and walkable.
6. Corner tower top: the top of a round-cornered stone tower that the game raises as a 3 x 3 column (draw only what stands on its top):
   a stone platform ringed by a crenellated parapet about 1.5 steps high, a big iron brazier with fire, a tall red banner with a white
   horned skull on a pole, a timber lookout roof over one corner, a spear rack.
```

## Prompt 4: ORC-04, cliff and wall faces

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its new Assault mode is fought on a 100 x 100 tile isometric map of an orc fortress, Bloodtusk Hold.
The game builds every cliff, bank and wall from flat textures that it shears onto the sides of the ground's columns itself. This task
paints ONE sheet of those flat face textures.

Rules for this task:
- Branch: art/assault-orc. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/orc/orc-04-faces.png. Change no other file.
- Pull request into main titled "Assault art: the Orc hold". If it is already open, push to it and add this sheet to the list in its
  body; otherwise open it. In the body, list the file and what is in each numbered column.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Opaque textures; leave only the unused bottom band of each column (y 480 to 512) transparent. Lip edges may have a transparent
  ragged top (grass, merlons).

Open these files first:
- docs/samples/assault-art/orc-kit.jpg and src/art/camp/camp-war.png: the orc fortress's look and palette.
- src/art/ground/rock.png and src/art/areas/warcamp/side.png: today's tiny side strips, which these replace.
- docs/samples/assault-art/field-today-393.png: how the map draws today (the banded cliff sides are what this fixes).
- docs/samples/assault-art/template-faces-1536.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing on main: git fetch origin claude/assault-art-plan, then
git show origin/claude/assault-art-plan:docs/samples/assault-art/<file> > /tmp/<file> for each file.

THE VIEW IS STRAIGHT-ON, NOT ISOMETRIC: draw each face as a flat elevation, as if standing square in front of the wall, with no
perspective and no skew. The game skews it. Light from the upper left, evenly across the face (the game adds the shading for which
side it is on). Style: painted pixel art matching the orc kit, chunky and readable, muted earthy palette.

The sheet: 1536 x 1024 px, 6 columns of 256 px, in two rows of 512 px: twelve columns, numbered left to right along the top row
(1 to 6), then the bottom row (7 to 12). Each column is one face set, 256 px wide (the length of one tile's edge), and must tile
seamlessly LEFT TO RIGHT with itself. Inside each column, from its top:
- the LIP, y 0 to 80 (one height step): the face's top edge, what overhangs or crowns it;
- the BODY, y 80 to 400 (four steps of 80 px): the face itself; it must tile seamlessly UP AND DOWN and left to right, because the
  game repeats it for walls of any height;
- the FOOT, y 400 to 480 (one step): where the face meets the ground (dirt, roots, rubble, a damp line);
- y 480 to 512: empty.
The lip's bottom must flow into the body's top, and the body's bottom into the foot's top, with no seam.

1. Highland rock cliff: grey-brown fractured rock in rough vertical slabs, lichen; lip: turf and heather overhanging; foot: scree.
2. Highland earth bank: layered brown earth and stones, roots; lip: thick grass overhang; foot: a little scree and grass.
3. Mud bank (a ditch's side): wet dark mud, gouges, a few old stakes and bones stuck in it; lip: trampled muddy edge; foot: standing
   water line and puddles.
4. Earth rampart revetted with timber: packed earth held by horizontal logs pegged with stakes; lip: the earth top with a few
   sharpened stakes; foot: mud.
5. Palisade timber skin: tightly packed vertical logs, bark and rope lashings, old blood stains; lip: their sharpened tips (ragged,
   transparent between the points); foot: earth banked up against the logs.
6. Stone curtain wall: big rough-cut dark grey blocks in courses, thin mortar, a few iron rings; lip: a crenellated parapet (merlons
   and gaps, transparent in the gaps); foot: moss and dirt.
7. The same stone wall, battle-damaged: cracked and missing blocks, scorch and soot streaks, arrow marks, a stain of old pitch; lip:
   broken merlons; foot: fallen stone chips.
8. Corner tower masonry: smaller, rounder dressed stones, an arrow slit in the body's middle; lip: a jutting stone course with
   corbels; foot: a sloped stone plinth.
9. Mound terrace wall: dry-stacked dark stone with skulls and big tusks set into the courses, red-brown stains; lip: flagstone edge
   with a bone trim; foot: packed earth.
10. Mound earth with stakes: raw dark earth, roots and buried bones, sharpened stakes sticking out at angles; lip: torn turf; foot:
    loose earth.
11. River bank: wet dark stone and clay with a pale waterline and green weed in its lowest part; lip: grass and reeds; foot: wet
    shingle at the water.
12. Dark basalt: black-grey columnar rock in hexagonal pillars, cold and hard; lip: thin dead grass; foot: black scree.
```

## Prompt 5: ORC-05, ground textures

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its new Assault mode is fought on a 100 x 100 tile isometric map of an orc fortress, Bloodtusk Hold.
The game lays square ground textures onto the map's tiles itself (it warps them to the isometric diamonds). This task paints ONE sheet
of sixteen seamless ground textures.

Rules for this task:
- Branch: art/assault-orc. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/orc/orc-05-ground.png. Change no other file.
- Pull request into main titled "Assault art: the Orc hold". If it is already open, push to it and add this sheet to the list in its
  body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only. Opaque image.

Open these files first:
- src/art/ground/grass1.png, src/art/areas/warcamp/top1.png and src/art/areas/warcamp/high.png: today's 64 px tops, which these
  replace (keep their pixel density: 64 px a tile).
- docs/samples/assault-art/orc-kit.jpg: the kit's orcs/mud_tile, orcs/scorched_tile and orcs/bone_tile give the colours to match.
- src/art/camp/camp-war.png: the orc camp's ground (muddy lanes, packed dirt).
- docs/samples/assault-art/template-textures-1024.png: the grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing on main: git fetch origin claude/assault-art-plan, then
git show origin/claude/assault-art-plan:docs/samples/assault-art/<file> > /tmp/<file> for each file.

THE VIEW IS STRAIGHT DOWN, NOT ISOMETRIC: draw each texture as seen from directly above, like a map, with no perspective, no horizon
and no cast shadows longer than a pebble's. Style: painted pixel art matching the orc kit's ground tiles; readable, not noisy; no
single feature so striking that its repeat would be noticed.

The sheet: 1024 x 1024 px, a 4 x 4 grid of 256 x 256 squares, read left to right, top to bottom. EACH SQUARE IS ONE TEXTURE COVERING
4 x 4 TILES, AND MUST TILE SEAMLESSLY WITH ITSELF ON ALL FOUR SIDES (its left edge continues its right edge, its top its bottom).
Keep the squares separate: nothing crosses from one square into the next.

1. Highland grass: short green-olive grass, a few darker tufts and tiny stones.
2. Highland grass, second variant: the same grass, a little yellower, with clover and a few small flowers.
3. Heath: heather, dry brown grass and grey stones, for crags and the wild rear.
4. Trampled grass: worn grass with bare dirt patches and boot-flattened stalks, round the camps and posts.
5. Mud: dark brown mud, ridged and footprinted.
6. Mud, second variant: the same, with straw and a few small stones pressed in.
7. Churned wet mud: deep ruts and puddles reflecting the sky dimly, for the town's lanes and the ditch floor.
8. Scorched earth: blackened, cracked ground with ash and a few embers' orange specks.
9. Ash and cinders: grey ash, charred splinters, scattered bone fragments.
10. Packed camp dirt: hard brown earth with scattered straw and wood chips.
11. Cobbled road: rough round cobbles in mud, irregular, some missing, mud in the gaps.
12. Flagstones: big uneven dark grey flags with mud and moss in the joints, a few cracked.
13. Wall-walk stone: smoother, closely fitted grey slabs, soot stains, a drain groove.
14. Timber walkway: rough planks seen from above, running from the top of the square to the bottom, iron nails, gaps between planks.
15. River shingle: rounded grey and brown pebbles and sand, damp.
16. Shallow water over pebbles: clear brownish river water over shingle, a few light ripples, the pebbles visible through it.
```

## Prompt 6: ORC-06, ground transitions

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its new Assault mode is fought on a 100 x 100 tile isometric map of an orc fortress, Bloodtusk Hold.
The game lays square ground textures onto the tiles itself. Where two grounds meet (mud beside grass, a road's edge), it lays an
overlay along the shared edge so the join is ragged and natural instead of a straight seam. This task paints ONE sheet of those
overlays.

Rules for this task:
- Branch: art/assault-orc. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/orc/orc-06-transitions.png. Change no other file.
- Pull request into main titled "Assault art: the Orc hold". If it is already open, push to it and add this sheet to the list in its
  body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG): each overlay is the material only, and everything else is transparent.

Open these files first:
- art-source/assault/orc/orc-05-ground.png on this branch, if it is there: the ground textures these overlays must match exactly in
  colour and pixel density. If it is not there yet, match the descriptions below and src/art/areas/warcamp/top1.png.
- docs/samples/assault-art/template-textures-1024.png: the grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing on main: git fetch origin claude/assault-art-plan, then
git show origin/claude/assault-art-plan:docs/samples/assault-art/<file> > /tmp/<file> for each file.

THE VIEW IS STRAIGHT DOWN, NOT ISOMETRIC, as on a map. Style: painted pixel art matching the ground textures, with soft, ragged,
organic edges (clumps, tongues and scattered bits), never a straight line or a smooth gradient band.

The sheet: 1024 x 1024 px, a 4 x 4 grid of 256 x 256 squares, read left to right, top to bottom. Each square is ONE tile, painted at
4x. The cells come in pairs:
- an EDGE (odd cells): the material covers the square's TOP edge fully, along its whole width, and breaks up into transparency by about
  40% of the way down. It must join seamlessly with itself left to right, because the game lays it along a whole row of tiles. The
  game turns it to face each of the four sides.
- an OUTER CORNER (even cells): the material sits only in the square's TOP-LEFT corner, a ragged rounded patch reaching about 40% of
  the way along the top and left edges, fading to transparency, and meeting the edge overlay's profile where it touches the edges.

1. Mud spreading onto grass: edge.            2. The same: outer corner.
3. Scorch spreading onto any ground: edge (blackened, ash, ember specks).   4. The same: outer corner.
5. A cobbled road's edge: cobbles loosening and scattering into dirt: edge.  6. The same: outer corner.
7. A dirt path's edge over grass: bare packed earth with trodden grass stalks: edge.  8. The same: outer corner.
9. River shingle onto grass: pebbles and sand thinning into turf: edge.   10. The same: outer corner.
11. Broken flagstones into mud: flags cracked and sinking, mud between: edge.   12. The same: outer corner.
13. Grass creeping onto mud: tufts and clumps of grass encroaching: edge.   14. The same: outer corner.
15. The water's edge: a thin pale foam line with wet dark stones, laid on the water side of a bank: edge.   16. The same: outer
    corner.
```

## Prompt 7: ORC-07, the keep and the throne

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its new Assault mode is fought on a 100 x 100 tile isometric map of an orc fortress, Bloodtusk Hold.
At its heart is a stepped mound; on top stands the warlord's keep, his skull throne and the hold's great war banner, where the last
fight of the battle happens. This task paints ONE sheet with those three pieces.

Rules for this task:
- Branch: art/assault-orc. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/orc/orc-07-keep.png. Change no other file.
- Pull request into main titled "Assault art: the Orc hold". If it is already open, push to it and add this sheet to the list in its
  body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG). Only a small soft contact shadow on each piece's own footprint.

Open these files first and match them:
- docs/samples/assault-art/orc-kit.jpg: the existing orc kit, above all orcs/longhouse, orcs/tavern and orcs/skull_gate.
- src/art/camp/camp-war.png: the orc war camp as painted for the overlook. Its great red-and-black horned tent in the middle is the
  feeling to aim for, made into a permanent hall.
- docs/samples/assault-art/template-keep-1536.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing on main: git fetch origin claude/assault-art-plan, then
git show origin/claude/assault-art-plan:docs/samples/assault-art/<file> > /tmp/<file> for each file.

Style: detailed painted pixel art, exactly like the orc kit. Crisp dark outlines, chunky readable shapes, a muted palette (black-brown
timber, dark stone, bone white) with blood-red cloth as the accent, warm fire and torchlight. It must read at a quarter of this size.

The angle and scale, exactly:
- True 2:1 isometric (dimetric), no perspective: a flat square tile is a diamond twice as wide as it is tall, corners up, right, down
  and left. Vertical edges stay vertical.
- ONE TILE = a diamond 128 px wide and 64 px tall. ONE HEIGHT STEP = 24 px. A doorway is about 4 steps (96 px) tall.
- Light from the upper left: faces turned to the lower left are lit, faces turned to the lower right in shade.

The sheet: 1536 x 1024 px. Three cells:
1. Cell 1, x 0 to 1024, y 0 to 1024: THE KEEP'S HALL. Footprint 6 tiles along u (upper left to lower right) by 4 tiles along v: a
   diamond 640 px wide and 320 px tall, centred on the foot point (512, 840). The hall may rise up to about 640 px above its foot.
   A great orc longhall on a black stone plinth: walls of huge dark logs and rough stone, a steep roof of hides and red cloth over
   curved timber ribs, enormous tusks and a horned bull skull crowning the roof's front gable, a broad doorway facing the lower left
   with a stone step, red banners down the walls, braziers, smoke from a roof hole, bone trophies and shields along the eaves. Grander
   than anything else on the map.
2. Cell 2, x 1024 to 1536, y 0 to 512: THE SKULL THRONE. One-tile footprint (a diamond 128 x 64) centred on the foot point (256, 440)
   in the cell. A massive throne of black iron and bones on a two-step stone dais: a back of stacked skulls rising about 6 steps,
   crowned with tusks and a horned skull, a red pelt over the seat, two small braziers on the dais. Facing the lower left.
3. Cell 3, x 1024 to 1536, y 512 to 1024: THE GREAT WAR BANNER. One-tile footprint centred on (256, 440) in the cell. A tall pole
   (about 14 steps) of dark wood set in a cairn of stones and skulls, a crossbar hung with a long blood-red banner bearing a white
   horned bull skull with tusks, tattered at the bottom, a horned skull on top of the pole, small trophies (an axe, a helm) tied
   below the crossbar.
```

## Prompt 8: ORC-08, the wall's dressing and the stairs

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its new Assault mode is fought on a 100 x 100 tile isometric map of an orc fortress, Bloodtusk Hold.
The game builds the stone curtain wall (6 height steps tall) and the keep's mound terraces from flat face textures; this task paints
ONE sheet of the small standing pieces that dress them: crenellations, hoardings, banners, braziers and the stairs.

Rules for this task:
- Branch: art/assault-orc. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/orc/orc-08-wall-dressing.png. Change no other file.
- Pull request into main titled "Assault art: the Orc hold". If it is already open, push to it and add this sheet to the list in its
  body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG). Only a small soft contact shadow on each piece's own footprint.

Open these files first and match them:
- art-source/assault/orc/orc-03-iron-gate.png and orc-04-faces.png on this branch, if they are there: the stone and its colours.
- docs/samples/assault-art/orc-kit.jpg: the orc kit (the timber, iron, skulls and red cloth).
- docs/samples/assault-art/template-props-1024.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing on main: git fetch origin claude/assault-art-plan, then
git show origin/claude/assault-art-plan:docs/samples/assault-art/<file> > /tmp/<file> for each file.

Style: detailed painted pixel art, exactly like the orc kit: rough dark grey stone, black iron, timber, bone, blood-red cloth. Crisp
dark outlines, chunky readable shapes. It must read at a quarter of this size.

The angle and scale, exactly:
- True 2:1 isometric (dimetric), no perspective: a flat square tile is a diamond twice as wide as it is tall, corners up, right, down
  and left. Vertical edges stay vertical.
- ONE TILE = a diamond 128 px wide and 64 px tall. ONE HEIGHT STEP = 24 px.
- Light from the upper left: faces turned to the lower left are lit, faces turned to the lower right in shade.
- "Along u" means from the upper left down to the lower right ("\"). Edge pieces stand on the diamond's LOWER-LEFT edge (the edge from
  its left corner to its bottom corner), facing the viewer's lower left, and join their neighbours seamlessly at that edge's two ends.
  The game mirrors them for the other side.

The sheet: 1024 x 1024 px, a 4 x 4 grid of 256 x 256 cells, read left to right, top to bottom. Every piece has a ONE-TILE footprint
whose centre (the foot point) is at (128, 208) in its cell. Keep each piece inside its cell with 8 px to spare.

1. Crenellations, straight: a stone parapet along the lower-left edge, two merlons and a gap, about 1.5 steps high.
2. Crenellations, outer corner: the parapet turning round the tile's bottom corner (along the lower-left and lower-right edges).
3. Crenellations, inner corner: the parapet along the upper-left and upper-right edges (the far corner of a walk).
4. Crenellations, broken: the straight parapet smashed, one merlon gone, rubble on the walk.
5. Arrow-slit parapet: a solid stone parapet along the lower-left edge with two narrow arrow slits, about 2 steps high.
6. Timber hoarding: a roofed wooden gallery jutting out over the lower-left edge, hide roof, gaps in its floor to drop stones through.
7. Hanging war banner: a long blood-red banner with a white horned skull, hanging flat down the wall face below the lower-left edge,
   fixed to an iron bar at the top; about 4 steps long.
8. Skulls and chains: iron chains and three skulls on hooks, hanging down the wall face below the lower-left edge, about 3 steps long.
9. Stair, rising away: a tile of rough stone steps that climb from the diamond's lower-right edge to its upper-left edge (away from
   the viewer, towards the upper left), one height step (24 px) from the lowest tread to the highest, three treads, the risers facing
   the viewer's lower right.
10. Wall-walk brazier: a tall iron fire basket on three legs, burning.
11. Boiling-oil cauldron: a black iron cauldron on a fire, a ladle, steam.
12. Iron spikes: a row of black iron spikes along the lower-left edge, on top of a wall.
13. Stair banister: a bone-and-timber post with a horned skull and a torch, for the edge of the mound's staircase.
14. Stair, rising towards the viewer: the same stone steps climbing the other way, from the diamond's upper-left edge to its
    lower-right edge (towards the viewer's lower right), one height step in all, three treads; the risers face away, so the treads'
    tops and the steps' lit left side show.
15. Fallen stones: a few broken merlon blocks and chips lying on the walk.
16. Portcullis winch: a timber frame with a big iron-bound drum and chain, two crank handles.
```

## Prompt 9: ORC-09, the war camp's big pieces

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its new Assault mode is fought on a 100 x 100 tile isometric map of an orc fortress, Bloodtusk Hold.
This task paints ONE sheet of the war camp's bigger pieces: tents, the chieftain's pavilion, the great Bonefire and the war drum's
siege states.

Rules for this task:
- Branch: art/assault-orc. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/orc/orc-09-camp.png. Change no other file.
- Pull request into main titled "Assault art: the Orc hold". If it is already open, push to it and add this sheet to the list in its
  body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG). Only a small soft contact shadow on each piece's own footprint.

Open these files first and match them:
- docs/samples/assault-art/orc-kit.jpg: the orc kit, above all orcs/war_drum, orcs/bonfire, orcs/tavern and orcs/hide_roof.
- src/art/camp/camp-war.png: the overlook's orc camp: its red conical and ridge tents, the great horned tent and the fires are the
  look to match.
- docs/samples/assault-art/template-buildings-1536.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing on main: git fetch origin claude/assault-art-plan, then
git show origin/claude/assault-art-plan:docs/samples/assault-art/<file> > /tmp/<file> for each file.

Style: detailed painted pixel art, exactly like the orc kit. Crisp dark outlines, chunky readable shapes, blood-red and black cloth,
hides, bone white, dark timber, warm firelight. It must read at a quarter of this size.

The angle and scale, exactly:
- True 2:1 isometric (dimetric), no perspective: a flat square tile is a diamond twice as wide as it is tall, corners up, right, down
  and left. Vertical edges stay vertical.
- ONE TILE = a diamond 128 px wide and 64 px tall. ONE HEIGHT STEP = 24 px. A tent's doorway is about 3.5 steps tall.
- Light from the upper left: faces turned to the lower left are lit, faces turned to the lower right in shade.
- Doors and fronts face the viewer's lower left.

The sheet: 1536 x 1024 px, a 3 x 2 grid of 512 x 512 cells, read left to right, top to bottom. The foot point (the centre of the
footprint diamond) is at (256, 416) in every cell. Footprints: "2 x 1" is 2 tiles along u (upper left to lower right) by 1 along v (a
diamond 192 x 96); "2 x 2" is a diamond 256 x 128; "3 x 3" is a diamond 384 x 192. Keep each piece inside its cell with 8 px to spare.

1. War tent, 2 x 1: a long red ridge tent on dark poles, black trim, guy ropes to stakes, a shield and spears by the open flap.
2. Great hide yurt, 2 x 2: a round tent of patched hides and red felt on a timber frame, a smoke hole with smoke, tusks over the door.
3. The chieftain's pavilion, 3 x 3: a big red-and-black tent with three peaks, a huge horned bull skull over the entrance, banners on
   the peaks, braziers either side of the door, trophies hung on the front poles.
4. The Bonefire, 2 x 2: a great roaring fire on a mound of logs inside a ring of piled skulls and big bones, spits and a cauldron at
   the edge, sparks rising.
5. War drum, struck: exactly the kit's orcs/war_drum (the same platform, frame, drum and decoration), at the instant a beater hits:
   the drumskin pushed in, the beaters blurred mid-swing, the torches flaring. 2 x 2.
6. War drum, silenced: the same drum after our troops reached it: the skin slashed open and hanging, the frame toppled to one side,
   the beaters on the ground, the torches out and smoking. 2 x 2.
```

## Prompt 10: ORC-10, the war camp's props

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its new Assault mode is fought on a 100 x 100 tile isometric map of an orc fortress, Bloodtusk Hold.
This task paints ONE sheet of sixteen small camp props that make the orc hold look lived in and unmistakably orcish.

Rules for this task:
- Branch: art/assault-orc. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/orc/orc-10-camp-props.png. Change no other file.
- Pull request into main titled "Assault art: the Orc hold". If it is already open, push to it and add this sheet to the list in its
  body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG). Only a small soft contact shadow on each piece's own footprint.

Open these files first and match them:
- docs/samples/assault-art/orc-kit.jpg: the orc kit (orcs/shrine, orcs/spear_signpost, orcs/skull_torch, orcs/weapon_stall).
- src/art/camp/camp-war.png: the overlook's orc camp (its tents, banners and props).
- docs/samples/assault-art/template-props-1024.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing on main: git fetch origin claude/assault-art-plan, then
git show origin/claude/assault-art-plan:docs/samples/assault-art/<file> > /tmp/<file> for each file.

Style: detailed painted pixel art, exactly like the orc kit. Crisp dark outlines, chunky readable shapes, blood-red cloth, hides, bone
white, dark timber, black iron. It must read at a quarter of this size.

The angle and scale, exactly:
- True 2:1 isometric (dimetric), no perspective: a flat square tile is a diamond twice as wide as it is tall, corners up, right, down
  and left. Vertical edges stay vertical.
- ONE TILE = a diamond 128 px wide and 64 px tall. ONE HEIGHT STEP = 24 px. An orc stands about 3.5 steps tall at this scale.
- Light from the upper left: faces turned to the lower left are lit, faces turned to the lower right in shade.

The sheet: 1024 x 1024 px, a 4 x 4 grid of 256 x 256 cells, read left to right, top to bottom. Every piece has a ONE-TILE footprint
whose centre (the foot point) is at (128, 208) in its cell. Keep each piece inside its cell with 8 px to spare.

1. Conical tent: a red cone of cloth on a centre pole, black trim, the flap open to the lower left. (The game also tints it blue for
   the player's own camp, so keep its shading readable in any hue.)
2. Hide lean-to: hides stretched over two poles, a bedroll and a pot under it.
3. Boar-tusk totem: a carved post with a boar's skull and great curved tusks, red rags and feathers.
4. Wolf-skull totem pole: a tall pole stacked with wolf skulls and fur, a red pennant, about 7 steps tall.
5. Small war banner: a spear planted in the ground with a red banner bearing a white horned skull.
6. Banner pole with trophies: a tall pole with three tattered pennants and a captured helm and shield tied to it.
7. Hanging cage: a gibbet post with an iron cage hanging from its arm (empty, a few bones).
8. Prisoner cage: a wooden cage of lashed poles on the ground, door open, straw inside (empty).
9. Training dummy: a straw-stuffed dummy on a post with a battered helm, axe cuts, arrows in it.
10. Trophy rack: a timber frame hung with the shields and helms of beaten foes (plain, unmarked, varied colours), a skull on top.
11. Anvil and quench barrel: a black anvil on a stump, hammers, a water barrel, hot iron glowing.
12. Small firepit: a ring of stones with a fire and a spit.
13. Stack of shields and spears: round orc shields leaning on a rack of spears.
14. Hides on a drying frame: a timber frame with stretched hides.
15. Alarm horn on a post: a huge curved war horn on a carved post with a platform step.
16. Bolt thrower: a heavy crossbow on a timber stand, a sheaf of bolts beside it, aimed to the lower left.
```

## Prompt 11: ORC-11, siege works and ruins

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its new Assault mode is fought on a 100 x 100 tile isometric map of an orc fortress, Bloodtusk Hold.
This task paints ONE sheet: the orcs' catapult, the burnt village in front of the fortress, and three siege engines for the player's
side, which arrive in a later phase.

Rules for this task:
- Branch: art/assault-orc. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/orc/orc-11-siege-ruins.png. Change no other file.
- Pull request into main titled "Assault art: the Orc hold". If it is already open, push to it and add this sheet to the list in its
  body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG). Only a small soft contact shadow on each piece's own footprint.

Open these files first and match them:
- docs/samples/assault-art/orc-kit.jpg: the orc kit (orcs/siege_tower, orcs/war_cart, orcs/cottage, wild/ruin_1 and ruin_2).
- src/art/camp/camp-war.png: the overlook's orc camp, which has catapults.
- docs/samples/assault-art/template-buildings-1536.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing on main: git fetch origin claude/assault-art-plan, then
git show origin/claude/assault-art-plan:docs/samples/assault-art/<file> > /tmp/<file> for each file.

Style: detailed painted pixel art, exactly like the orc kit. Crisp dark outlines, chunky readable shapes. It must read at a quarter
of this size.

The angle and scale, exactly:
- True 2:1 isometric (dimetric), no perspective: a flat square tile is a diamond twice as wide as it is tall, corners up, right, down
  and left. Vertical edges stay vertical.
- ONE TILE = a diamond 128 px wide and 64 px tall. ONE HEIGHT STEP = 24 px.
- Light from the upper left: faces turned to the lower left are lit, faces turned to the lower right in shade.

The sheet: 1536 x 1024 px, a 3 x 2 grid of 512 x 512 cells, read left to right, top to bottom. The foot point (the centre of the
footprint diamond) is at (256, 416) in every cell. Footprints: "2 x 2" is a diamond 256 x 128; "2 x 1" is 2 tiles along u (upper left
to lower right) by 1 along v, a diamond 192 x 96; "1 x 1" is a diamond 128 x 64. Keep each piece inside its cell with 8 px to spare.

1. Orc catapult, 2 x 2: a crude heavy timber catapult lashed with rope, a sling arm with a boulder loaded, a pile of stones and
   skulls as ammunition, red rags, aimed to the lower left.
2. Burnt cottage shell, 2 x 2: a small human farmhouse burnt by the orcs: blackened stone walls standing about 3 steps high, charred
   roof beams fallen in, a doorway to the lower left, ash, a broken cart wheel. Desolate, not gory.
3. Burnt cottage, collapsed, 2 x 2: the same house fallen into a heap of charred beams and stones, one chimney still standing, smoke
   wisps.
4. Siege ladder (the player's side), 1 x 1: a tall wooden scaling ladder with iron hooks at its top, leaning against an unseen wall to
   the upper right, about 7 steps tall. Plain timber with a blue cloth tie.
5. Battering ram (the player's side), 2 x 1: a roofed ram on four wheels, a heavy iron-capped log under a sloped timber roof covered in
   wet hides, a blue pennant, facing the lower left.
6. Trebuchet (the player's side), 2 x 2: a tall counterweight trebuchet of pale timber, arm cocked back, a stone in its sling, a blue
   banner on its frame, facing the lower left.
```

## Prompt 12: ORC-12, bridges, fords and the river

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its new Assault mode is fought on a 100 x 100 tile isometric map of an orc fortress, Bloodtusk Hold.
A river, the Redwater, crosses the map in front of the fortress: an old timber bridge, two fords, a waterfall. This task paints ONE
sheet of the river's pieces.

Rules for this task:
- Branch: art/assault-orc. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/orc/orc-12-river.png. Change no other file.
- Pull request into main titled "Assault art: the Orc hold". If it is already open, push to it and add this sheet to the list in its
  body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG). Do not paint the water itself (the game draws it); paint only the objects. Where an object
  stands in water, end it at the waterline with a faint ripple ring.

Open these files first and match them:
- docs/samples/assault-art/orc-kit.jpg: the orc kit, above all orcs/log_bridge.
- docs/samples/assault-art/field-today-393.png: how the river and its plank bridge draw today.
- docs/samples/assault-art/template-props-1024.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing on main: git fetch origin claude/assault-art-plan, then
git show origin/claude/assault-art-plan:docs/samples/assault-art/<file> > /tmp/<file> for each file.

Style: detailed painted pixel art, exactly like the orc kit: dark weathered timber, rope, iron, wet grey stone. Crisp dark outlines,
chunky readable shapes. It must read at a quarter of this size.

The angle and scale, exactly:
- True 2:1 isometric (dimetric), no perspective: a flat square tile is a diamond twice as wide as it is tall, corners up, right, down
  and left. Vertical edges stay vertical.
- ONE TILE = a diamond 128 px wide and 64 px tall. ONE HEIGHT STEP = 24 px. The bridge deck stands 1 step above the water.
- Light from the upper left: faces turned to the lower left are lit, faces turned to the lower right in shade.
- The bridge runs along u (from the upper left down to the lower right, "\"); deck pieces fill their whole diamond and join their
  neighbours seamlessly at the diamond's upper-left and lower-right edges. The game mirrors them for the other direction.

The sheet: 1024 x 1024 px, a 4 x 4 grid of 256 x 256 cells, read left to right, top to bottom. Every piece has a ONE-TILE footprint
whose centre (the foot point) is at (128, 208) in its cell. Keep each piece inside its cell with 8 px to spare.

1. Bridge deck: a span of thick planks along u with a low log rail on both long sides, on two cross-beams.
2. Bridge end: the deck meeting the bank, its last planks resting on a crib of stones and logs, the rails ending in posts.
3. Bridge pier: two thick log piles driven into the riverbed with a cross-beam, standing in water.
4. Bridge deck, broken: the planks smashed through in the middle, a gap with jagged ends, a rail hanging into the water.
5. Ford stepping stones: four or five flat-topped stones just above the water across the tile.
6. Wet bank boulders: a clump of mossy boulders at the water's edge, half in the water.
7. Sunken log: a dead tree trunk lying half sunk in the shallows, a branch sticking up.
8. Mooring post: a stout post with a rope and an iron ring, at the water's edge.
9. Waterfall lip rocks: a row of dark wet rocks along the tile's lower-left edge, where the river pours over a ledge.
10. A broken shield stuck in the shallows, tilted, an arrow in it.
11. Drifted arrows: a few arrows and a broken spear caught against a stone.
12. A snagged banner: a torn red banner caught on a branch in the water.
13. Bridge barricade end: the bridge deck closed by a row of sharpened logs and a skull post at its far end, a one-plank gap left
    open in the middle.
14. Bridge rail, broken: the deck whole but one rail torn away and splintered.
15. Orc raft: a crude raft of lashed logs pulled up on the bank, a pole across it.
16. Fish weir: a line of short stakes in the shallows with a woven trap.
```

## Prompt 13: ORC-13, ground decals

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its new Assault mode is fought on a 100 x 100 tile isometric map of an orc fortress, Bloodtusk Hold.
The game lays flat decals on the ground itself (it warps them to the isometric tiles): blood, scorch, rubble and tracks that make the
battlefield look fought over. This task paints ONE sheet of sixteen decals.

Rules for this task:
- Branch: art/assault-orc. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/orc/orc-13-decals.png. Change no other file.
- Pull request into main titled "Assault art: the Orc hold". If it is already open, push to it and add this sheet to the list in its
  body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG): only the decal itself, with soft, ragged, natural edges that fade out.

Open these files first:
- art-source/assault/orc/orc-05-ground.png on this branch, if it is there: the ground these lie on (match its pixel density, 64 px a
  tile at quarter size). Otherwise src/art/areas/warcamp/top1.png.
- docs/samples/assault-art/template-textures-1024.png: the grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing on main: git fetch origin claude/assault-art-plan, then
git show origin/claude/assault-art-plan:docs/samples/assault-art/<file> > /tmp/<file> for each file.

THE VIEW IS STRAIGHT DOWN, NOT ISOMETRIC, as on a map: everything lies flat on the ground, nothing stands up. Style: painted pixel
art matching the orc kit's ground; dark, gritty, readable; blood is a dark red-brown, not bright or gory.

The sheet: 1024 x 1024 px, a 4 x 4 grid of 256 x 256 squares, read left to right, top to bottom. Each square holds ONE decal covering
up to 2 x 2 tiles, centred, with at least 16 px of transparency round it.

1. Blood spatter.   2. Blood smear (a dragged streak).   3. Blood pool, small and dark.
4. Scorch mark, round (a blast).   5. Scorch mark, ragged (a burnt patch with ash).
6. Stone rubble scatter (chips and broken blocks lying flat).   7. Timber debris (splinters, a broken plank, nails).
8. Cart ruts: two parallel wheel ruts running straight from the square's top edge to its bottom edge (so they join end to end).
9. Boot tracks in mud: a trail of heavy orc boot prints crossing the square.   10. Wolf tracks: a trail of big paw prints.
11. A puddle of muddy water.   12. A mud splash.
13. Ash and embers: grey ash with a few glowing orange embers.   14. Scattered bones (lying flat, a jaw, ribs, small bones).
15. Straw and hay spilled on the ground.   16. Cracked flagstones (cracks and a few broken corners, to lay over a stone floor).
```
