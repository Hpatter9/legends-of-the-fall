# The Assault: ChatGPT prompts for the Beasts' hold (the Howling Den)

Phase 4's second hold (`docs/design/assault-mode.md` on `claude/assault-design`, phase 4; the owner's name for it, and the owner's look: an
autumn moor that climbs to a snowbound den). It is built like Bloodtusk Hold and the Barrow Necropolis, on the same engine and the same
kinds of sheet, so these 13 prompts mirror the Orc set sheet for sheet: the same canvases, grids, foot points, angles and formats, so the
cutter (`tools/assault/cut-sheets.py`) and the field's renderer take them as they took the Orc sheets. **They paint only what the packs and
the Orc sheets cannot cover.** Until they land, the hold is built on stand-ins: the Orc sheets' pieces, recoloured, and the kit pieces below.

**The hold's two looks.** The moor outside the ring is autumn (russet, gold, heather, peat); the crags inside it are snow. Each prompt marks
its pieces MOOR or SNOW, and the ground sheet runs from one to the other.

**What the pack already gives** (Chronos's Moonpack kit, `docs/samples/assault-art/beasts-kit.jpg`; cut straight in, as the Orc hold's kit
pieces were):

- walls and gates as decoration: `moonpack/log_wall_run`, `log_wall_corner`, `bone_fence`, `bone_gate`;
- buildings: `moonpack/longhouse`, `cottage`, `tavern`, `granary`, `stockpile`, `pelt_stall`, `lookout_tower`, `well`, `cave_den`,
  `shrine`, `howling_stone`;
- the hunt: `moonpack/meat_racks`, `hide_bundles`, `drying_rack_tile`, `sled`, `skull_signpost`, `barrels`, `woodpile`;
- lights: `moonpack/bonfire`, `torch_post`;
- nature: `moonpack/pine_tree`, `small_pine`, `snowy_pine`, `berry_pine`, `bare_tree`, `snowy_bush`, `fallen_log`, `boulders`, `rocks_a`
  to `rocks_c`;
- the bridge: `moonpack/rope_bridge`.

**What the Orc sheets already give every hold:** our own siege works (the ladders, the ram, the trebuchet), so no sheet here paints them.

**How to use them** (as for the other sets):

- Paste everything inside one fence into a new ChatGPT (Codex) conversation.
- Each prompt stands alone, and all of them add to the one branch, `art/assault-beasts`, under `art-source/assault/beasts/`, and the one
  pull request, "Assault art: the Howling Den".
- Each sheet is one image. If a sheet comes back wrong (the angle, the grid, a busy background), run the same prompt again. Allow two or
  three tries a sheet.
- ChatGPT adds the PNGs only. The builder cuts the sheets afterwards, credits them, and adds them to the service worker.

**The reference files the prompts name:**

- `docs/samples/assault-art/beasts-kit.jpg`: the Moonpack kit pieces, labelled (on `claude/assault-2` until it is merged);
- `docs/samples/assault-art/template-*.png`: the grids (on `claude/assault-art-plan` until it is merged);
- `src/art/camp/camp-war.png`, its bottom row: the frozen hunting grounds as the overlook paints them;
- `src/art/areas/autumn/` and `src/art/areas/snow/`: those lands' tops and sides as the game draws them today.

Each prompt says how to fetch the files from those branches if they are missing on main.

| # | Sheet | File | Canvas | Cells | The Orc sheet it matches |
| --- | --- | --- | --- | --- | --- |
| 1 | BST-01 The ring of log walls | `bst-01-log-walls.png` | 1024 x 1024 | 16 | ORC-01 the palisade |
| 2 | BST-02 The ring's gates | `bst-02-gates.png` | 1536 x 1024 | 6 | ORC-02 the palisade's gates |
| 3 | BST-03 The Antler Gate and the towers | `bst-03-antler-gate.png` | 1536 x 1024 | 6 | ORC-03 the Iron Gate |
| 4 | BST-04 Cliff and wall faces | `bst-04-faces.png` | 1536 x 1024 | 12 | ORC-04 the faces |
| 5 | BST-05 Ground textures, moor to snow | `bst-05-ground.png` | 1024 x 1024 | 16 | ORC-05 the ground |
| 6 | BST-06 Ground transitions | `bst-06-transitions.png` | 1024 x 1024 | 16 | ORC-06 the transitions |
| 7 | BST-07 The alpha's den and throne | `bst-07-keep.png` | 1536 x 1024 | 3 | ORC-07 the keep |
| 8 | BST-08 The wall's dressing and the stairs | `bst-08-wall-dressing.png` | 1024 x 1024 | 16 | ORC-08 the wall's dressing |
| 9 | BST-09 The howling stones and the landmarks | `bst-09-landmarks.png` | 1536 x 1024 | 6 | ORC-09 the camp's big pieces (the drums) |
| 10 | BST-10 The den's props | `bst-10-props.png` | 1024 x 1024 | 16 | ORC-10 the camp's props |
| 11 | BST-11 Ruins and the hunters' camp's burnt states | `bst-11-ruins.png` | 1536 x 1024 | 6 | ORC-11 siege works and ruins |
| 12 | BST-12 The gorge's river | `bst-12-gorge.png` | 1024 x 1024 | 16 | ORC-12 bridges, fords and the river |
| 13 | BST-13 Ground decals | `bst-13-decals.png` | 1024 x 1024 | 16 | ORC-13 the decals |

They are ordered by what the hold needs first: its walls and gates, then its ground, then its heart and dressing.

---

## Prompt 1: BST-01, the ring of log walls lashed with hides, in every state of the siege

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Beast Packs': the Howling Den, a hunters' stronghold on an autumn moor of heather and bracken that climbs into snowbound crags: a
ring of log walls lashed with hides, a gorge with a cold river crossed by a rope bridge, howling stones, and the alpha's great cave
den under a skull arch at its frozen heart.
This task paints ONE sheet: the ring of log walls lashed with hides, in every state of the siege.

Rules for this task:
- Branch: art/assault-beasts. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/beasts/bst-01-log-walls.png. Change no other file.
- Pull request into main titled "Assault art: the Howling Den". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG). Each piece casts only a small soft contact shadow on its own footprint.

Open these files first and match them:
- docs/samples/assault-art/beasts-kit.jpg: the Moonpack kit (Chronos Settlement's isometric kit), labelled. Your pieces stand
  beside these on the map, so match them exactly: the dark weathered timber, the lashings and hides, the antlers and beast skulls, the
  grey stone dusted with snow, the warm torch and bonfire light.
  Above all moonpack/log_wall_run, moonpack/log_wall_corner and moonpack/bone_fence: the same logs, lashings, hides and skulls.
- src/art/camp/camp-war.png, its bottom row: the Beasts' frozen hunting grounds as the camp's overlook paints it.
- src/art/areas/autumn/top1.png and src/art/areas/snow/top1.png: the autumn and snow lands' ground as the game draws them today.
- docs/samples/assault-art/template-props-1024.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/beasts-kit.jpg > /tmp/beasts-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

Style: detailed painted pixel art, exactly like the Moonpack kit. Crisp dark outlines, chunky readable shapes, a palette of dark
weathered timber, tan and grey hides, bone and antler, grey stone, the moor's russet and gold, and white snow where a piece stands
in the crags, with warm firelight as the accent. It must read clearly when shown at a quarter of this size on a phone.

The angle and scale, exactly:
- True 2:1 isometric (dimetric) view, no perspective: a flat square tile on the ground is a diamond exactly twice as wide as it is
  tall, its corners pointing up, right, down and left. Vertical edges stay vertical.
- ONE TILE = a diamond 128 px wide and 64 px tall. ONE HEIGHT STEP = 24 px.
- Light from the upper left: faces turned to the lower left are lit; faces turned to the lower right are in shade.
- "Along u" means running from the upper left down to the lower right (like "\"). Every run on this sheet runs along u, passing
  through its tile from the midpoint of the diamond's upper-left edge to the midpoint of its lower-right edge, so that pieces placed on
  neighbouring tiles join seamlessly at those points. (The game mirrors them for runs going the other way.)
- The hold climbs from an autumn moor (outside the ring) into snowbound crags (inside it). Pieces marked MOOR stand in autumn: no snow,
  russet bracken and fallen leaves at their feet. Pieces marked SNOW stand in the crags: snow on every ledge and roof, icicles, frost.
- Every piece on this sheet is MOOR (the ring stands where the moor meets the crags: a little frost, no lying snow).
- The wall stands about 4 steps (96 px) tall: sharpened logs lashed with rawhide, hides stretched across the gaps, antlers and beast
  skulls nailed on.
- The OUTER face is the one turned to the viewer's lower left: hides, skulls, claw marks. The INNER face (cell 5) is the back of the
  same wall: braces, a plank fighting step, coiled rope and spears.

The sheet: 1024 x 1024 px, a 4 x 4 grid of 256 x 256 cells, read left to right, top to bottom. Every piece has a ONE-TILE footprint:
its diamond's centre (the foot point) is at (128, 208) inside its cell. Keep each piece inside its own cell with 8 px to spare.

1. Log wall run, outer face, whole: sharpened logs, a stretched wolf hide, a stag skull, rawhide lashings.
2. The same run, battered: arrows in it, a hide torn, two tips split, deep claw gouges.
3. The same run, broken: the logs snapped to jagged stumps about 1.5 steps high, splinters and torn hide, one log fallen across. Still a
   barrier.
4. The breach: no wall left. A ramp of tumbled logs, peat and torn hides sloping down to the lower left, as if into a ditch. Walkable.
5. Log wall run, inner face, whole: the back of cell 1. Diagonal braces, a plank fighting step a step and a half up, a spear rack.
6. Corner, south (the corner nearest the viewer): two runs meet at the bottom of the tile, one running up-left and one up-right, both
   showing their OUTER faces, round a thick corner post crowned with a great elk skull and antlers.
7. Corner, north (the far corner): two runs meet at the top of the tile, going down-left and down-right, both showing their INNER faces,
   with a corner post and a small lookout platform.
8. Corner, east: a run coming from the upper left meets a run going down to the lower left at the tile's right corner. The first shows
   its inner face and the second its outer face. Corner post with a wolf skull.
9. Gate post: a tall carved totem post of dark wood, taller than the wall, a snarling wolf's head at its top, a torch and hanging fangs.
   It ends a run beside a gate.
10. Sally port, one tile wide, whole: a narrow gate of lashed logs and bone set in the run, a hide hung over it, outer face.
11. The sally port, battered: hacked, clawed, a lashing cut.
12. The sally port, broken: torn open, one leaf hanging from its post and the other on the ground. Passable.
13. Barricade (the gorge bridge's fort): a low wall, chest-high (about 2 steps), of felled logs, a sled on its side and stacked hide
    bundles, a few sharpened stakes out front. Runs along u.
14. The barricade, broken: scattered logs and hides, the sled smashed, low enough to step over.
15. Antler stakes: a cluster of sharpened stakes and shed antlers driven into the ground at an angle, leaning out to the lower left,
    about 1.5 steps high. Fills most of the tile.
16. Stake line: a single row of sharpened stakes across the tile along u, leaning out to the lower left, about 2 steps high, lashed
    to a log at their foot.
```

## Prompt 2: BST-02, the ring's two great gates, in their siege states, and the gate towers' tops

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Beast Packs': the Howling Den, a hunters' stronghold on an autumn moor of heather and bracken that climbs into snowbound crags: a
ring of log walls lashed with hides, a gorge with a cold river crossed by a rope bridge, howling stones, and the alpha's great cave
den under a skull arch at its frozen heart.
This task paints ONE sheet: the ring's two great gates, in their siege states, and the gate towers' tops.

Rules for this task:
- Branch: art/assault-beasts. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/beasts/bst-02-gates.png. Change no other file.
- Pull request into main titled "Assault art: the Howling Den". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG). Each piece casts only a small soft contact shadow on its own footprint.

Open these files first and match them:
- docs/samples/assault-art/beasts-kit.jpg: the Moonpack kit (Chronos Settlement's isometric kit), labelled. Your pieces stand
  beside these on the map, so match them exactly: the dark weathered timber, the lashings and hides, the antlers and beast skulls, the
  grey stone dusted with snow, the warm torch and bonfire light.
  Above all moonpack/bone_gate, moonpack/log_wall_run and moonpack/lookout_tower.
- src/art/camp/camp-war.png, its bottom row: the Beasts' frozen hunting grounds as the camp's overlook paints it.
- src/art/areas/autumn/top1.png and src/art/areas/snow/top1.png: the autumn and snow lands' ground as the game draws them today.
- docs/samples/assault-art/template-buildings-1536.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/beasts-kit.jpg > /tmp/beasts-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

Style: detailed painted pixel art, exactly like the Moonpack kit. Crisp dark outlines, chunky readable shapes, a palette of dark
weathered timber, tan and grey hides, bone and antler, grey stone, the moor's russet and gold, and white snow where a piece stands
in the crags, with warm firelight as the accent. It must read clearly when shown at a quarter of this size on a phone.

The angle and scale, exactly:
- True 2:1 isometric (dimetric) view, no perspective: a flat square tile on the ground is a diamond exactly twice as wide as it is
  tall, its corners pointing up, right, down and left. Vertical edges stay vertical.
- ONE TILE = a diamond 128 px wide and 64 px tall. ONE HEIGHT STEP = 24 px.
- Light from the upper left: faces turned to the lower left are lit; faces turned to the lower right are in shade.
- The hold climbs from an autumn moor (outside the ring) into snowbound crags (inside it). Pieces marked MOOR stand in autumn: no snow,
  russet bracken and fallen leaves at their feet. Pieces marked SNOW stand in the crags: snow on every ledge and roof, icicles, frost.
- These are MOOR pieces.
- The ring's wall is about 4 steps (96 px) tall; a gate's sides stand flush with it and may rise higher (a gate tower).
- The gates run along u (from the upper left down to the lower right, like "\"); the game mirrors them.

The sheet: 1536 x 1024 px, a 3 x 2 grid of 512 x 512 cells, read left to right, top to bottom. The foot point (the centre of the
footprint diamond) is at (256, 416) in every cell. Footprints: cells 1 to 4 are 2 tiles along u by 1 through (a diamond 192 x 96); cells 5 and 6 are 2 x 2 tiles (a diamond 256 x 128). Keep each piece inside its cell with 8 px to spare.

1. The Fang Gate (the south gate), whole, outer face to the lower left: a double gate of heavy lashed logs under an arch of two great
   mammoth tusks crossed at the top, a bear skull over it, torches on the posts, hides hung either side.
2. The same Fang Gate, battered: the logs gouged and scorched, a tusk cracked, a hide torn away, arrows in the wood.
3. The same Fang Gate, broken: the leaves torn off and lying flat, one tusk fallen, the arch still standing on the other, the passage
   open and walkable, rubble at the sides (not in the passage).
4. The North Gate, whole, INNER face to the lower left (it stands on the ring's far side): the same build seen from inside, with its
   log bar across, a rope winch and a torch.
5. The North Gate, broken (inner face): the bar snapped, the leaves hanging open, passable.
6. A gate tower's top: what stands on top of a 2 x 2 timber gate tower that the game raises: a hide-roofed lookout platform, an alarm
   horn on a stand, a wolf-pelt banner on a pole, a brazier.
```

## Prompt 3: BST-03, the crag wall's great Antler Gate, the postern and the corner towers' tops

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Beast Packs': the Howling Den, a hunters' stronghold on an autumn moor of heather and bracken that climbs into snowbound crags: a
ring of log walls lashed with hides, a gorge with a cold river crossed by a rope bridge, howling stones, and the alpha's great cave
den under a skull arch at its frozen heart.
This task paints ONE sheet: the crag wall's great Antler Gate, the postern and the corner towers' tops.

Rules for this task:
- Branch: art/assault-beasts. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/beasts/bst-03-antler-gate.png. Change no other file.
- Pull request into main titled "Assault art: the Howling Den". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG). Each piece casts only a small soft contact shadow on its own footprint.

Open these files first and match them:
- docs/samples/assault-art/beasts-kit.jpg: the Moonpack kit (Chronos Settlement's isometric kit), labelled. Your pieces stand
  beside these on the map, so match them exactly: the dark weathered timber, the lashings and hides, the antlers and beast skulls, the
  grey stone dusted with snow, the warm torch and bonfire light.
  Above all moonpack/cave_den, moonpack/boulders and moonpack/bone_gate.
- src/art/camp/camp-war.png, its bottom row: the Beasts' frozen hunting grounds as the camp's overlook paints it.
- src/art/areas/autumn/top1.png and src/art/areas/snow/top1.png: the autumn and snow lands' ground as the game draws them today.
- docs/samples/assault-art/template-buildings-1536.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/beasts-kit.jpg > /tmp/beasts-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

Style: detailed painted pixel art, exactly like the Moonpack kit. Crisp dark outlines, chunky readable shapes, a palette of dark
weathered timber, tan and grey hides, bone and antler, grey stone, the moor's russet and gold, and white snow where a piece stands
in the crags, with warm firelight as the accent. It must read clearly when shown at a quarter of this size on a phone.

The angle and scale, exactly:
- True 2:1 isometric (dimetric) view, no perspective: a flat square tile on the ground is a diamond exactly twice as wide as it is
  tall, its corners pointing up, right, down and left. Vertical edges stay vertical.
- ONE TILE = a diamond 128 px wide and 64 px tall. ONE HEIGHT STEP = 24 px.
- Light from the upper left: faces turned to the lower left are lit; faces turned to the lower right are in shade.
- The hold climbs from an autumn moor (outside the ring) into snowbound crags (inside it). Pieces marked MOOR stand in autumn: no snow,
  russet bracken and fallen leaves at their feet. Pieces marked SNOW stand in the crags: snow on every ledge and roof, icicles, frost.
- These are SNOW pieces: the inner wall is a crag wall of frost-cracked grey stone and great timbers, snow on every ledge.
- The crag wall is exactly 6 steps (144 px) tall from the ground to its walkway, plus a parapet. The game draws the wall itself; the
  gates fill gaps in it, so each gate's front must be exactly 144 px tall to the walkway line, flush with the wall on either side, and
  may rise higher above it (a gate tower).
- The gates run along u (from the upper left down to the lower right, like "\"); the game mirrors them. The wall is 2 tiles thick.

The sheet: 1536 x 1024 px, a 3 x 2 grid of 512 x 512 cells, read left to right, top to bottom. The foot point (the centre of the
footprint diamond) is at (256, 416) in every cell. Footprints: cells 1 to 3 are 2 x 2 tiles (a diamond 256 x 128); cells 4 and 5 are 1 tile along the wall by 2 tiles through it (a diamond 192 x 96); cell 6 is 3 x 3 tiles (a diamond 384 x 192). Keep each piece inside its cell with 8 px to spare.

1. The Antler Gate, whole, seen from OUTSIDE (outer face to the lower left): a gatehouse of rough grey stone 6 steps tall with a deep
   passage, a gate of iron-bound logs, a crown of enormous antlers over the arch, icicles hanging from it, two braziers, and above the
   walkway a squat timber tower with a hide roof heavy with snow. The strongest-looking thing on the map.
2. The same Antler Gate, battered: the logs split and scorched, antler tines snapped off, stones cracked round the passage, the snow
   shaken off, soot streaks.
3. The same Antler Gate, broken: the gate torn apart and thrown aside, the passage open and walkable, rubble and broken antlers at the
   sides (not in the passage), the tower above cracked but standing.
4. The postern, whole, seen from INSIDE (inner face to the lower left): a low cave-like doorway through the 2-thick wall, a door of
   logs bound with rawhide, a torch. Flush with the wall, 6 steps tall.
5. The postern, broken: the door torn off and lying on the snow, the opening walkable.
6. Corner tower top: the top of a stone tower that the game raises as a 3 x 3 column (draw only what stands on its top): a snowy
   timber platform ringed by a log parapet about 1.5 steps high, a big brazier, a pole with a white wolf pelt, a hide roof over one
   corner, a spear rack.
```

## Prompt 4: BST-04, the flat face textures the game shears onto every cliff, bank and wall

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Beast Packs': the Howling Den, a hunters' stronghold on an autumn moor of heather and bracken that climbs into snowbound crags: a
ring of log walls lashed with hides, a gorge with a cold river crossed by a rope bridge, howling stones, and the alpha's great cave
den under a skull arch at its frozen heart.
This task paints ONE sheet: the flat face textures the game shears onto every cliff, bank and wall.

Rules for this task:
- Branch: art/assault-beasts. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/beasts/bst-04-faces.png. Change no other file.
- Pull request into main titled "Assault art: the Howling Den". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered column.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Opaque textures; leave only the unused bottom band of each column (y 480 to 512) transparent. Lip edges may have a transparent
  ragged top (grass, stakes, snow).

Open these files first and match them:
- docs/samples/assault-art/beasts-kit.jpg: the Moonpack kit (Chronos Settlement's isometric kit), labelled. Your pieces stand
  beside these on the map, so match them exactly: the dark weathered timber, the lashings and hides, the antlers and beast skulls, the
  grey stone dusted with snow, the warm torch and bonfire light.
- src/art/camp/camp-war.png, its bottom row: the Beasts' frozen hunting grounds as the camp's overlook paints it.
- src/art/areas/autumn/top1.png and src/art/areas/snow/top1.png: the autumn and snow lands' ground as the game draws them today.
- src/art/areas/autumn/side.png and src/art/areas/snow/side.png: today's tiny side strips, which these replace.
- docs/samples/assault-art/template-faces-1536.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/beasts-kit.jpg > /tmp/beasts-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

THE VIEW IS STRAIGHT-ON, NOT ISOMETRIC: draw each face as a flat elevation, as if standing square in front of the wall, with no
perspective and no skew. The game skews it. Light from the upper left, evenly across the face (the game adds the shading for which
side it is on). Style: painted pixel art matching the Moonpack kit, chunky and readable.

The sheet: 1536 x 1024 px, 6 columns of 256 px, in two rows of 512 px: twelve columns, numbered left to right along the top row
(1 to 6), then the bottom row (7 to 12). Each column is one face set, 256 px wide (the length of one tile's edge), and must tile
seamlessly LEFT TO RIGHT with itself. Inside each column, from its top:
- the LIP, y 0 to 80 (one height step): the face's top edge, what overhangs or crowns it;
- the BODY, y 80 to 400 (four steps of 80 px): the face itself; it must tile seamlessly UP AND DOWN and left to right, because the
  game repeats it for walls of any height;
- the FOOT, y 400 to 480 (one step): where the face meets the ground;
- y 480 to 512: empty.
The lip's bottom must flow into the body's top, and the body's bottom into the foot's top, with no seam.

1. Moor crag: brown-grey gritstone in rough blocks, lichen; lip: heather and bracken overhanging; foot: scree and dead leaves.
2. Peat bank: layered dark peat and earth with roots and stones; lip: thick russet moor grass; foot: wet peat.
3. Bog-mud bank (a ditch's side): wet black-brown mud, gouges, a few old stakes in it; lip: trampled edge; foot: a standing water line.
4. Earth rampart revetted with logs: packed earth held by horizontal logs and stakes; lip: the earth top with sharpened stakes; foot: mud.
5. Log wall skin: tightly packed vertical logs, rawhide lashings, a stretched hide here and there; lip: their sharpened tips (ragged,
   transparent between the points); foot: earth banked up against the logs.
6. Crag wall: big rough grey stone blocks and great horizontal timbers, frost in the cracks; lip: a log parapet with snow on it
   (ragged, transparent between the logs); foot: drifted snow.
7. The same crag wall, battle-damaged: cracked and missing blocks, a split timber, soot streaks, claw gouges; lip: broken parapet;
   foot: fallen stone and snow.
8. Corner tower masonry: smaller rounded stones, an arrow slit in the body's middle, icicles under a jutting course; lip: a snowy
   ledge; foot: a sloped stone plinth in snow.
9. Den terrace wall: dry-stacked grey stones with bones and antlers set into them; lip: a flagstone edge under snow; foot: packed snow.
10. Snowbound cliff: grey rock under thick snow and ice, frozen trickles; lip: a heavy snow cornice; foot: snow drift.
11. Gorge bank: wet dark rock with a pale waterline and green weed low down, ferns in the cracks; lip: moor grass; foot: wet shingle.
12. Frozen waterfall ice: blue-white ice in long frozen columns over dark rock; lip: snow and icicles; foot: broken ice.
```

## Prompt 5: BST-05, sixteen seamless ground textures, from the autumn moor to the snowbound crags

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Beast Packs': the Howling Den, a hunters' stronghold on an autumn moor of heather and bracken that climbs into snowbound crags: a
ring of log walls lashed with hides, a gorge with a cold river crossed by a rope bridge, howling stones, and the alpha's great cave
den under a skull arch at its frozen heart.
This task paints ONE sheet: sixteen seamless ground textures, from the autumn moor to the snowbound crags.

Rules for this task:
- Branch: art/assault-beasts. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/beasts/bst-05-ground.png. Change no other file.
- Pull request into main titled "Assault art: the Howling Den". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Opaque image.

Open these files first and match them:
- src/art/areas/autumn/top1.png, src/art/areas/autumn/top2.png and src/art/areas/snow/top1.png: today's 64 px tops, which these replace
  (keep their pixel density: 64 px a tile).
- docs/samples/assault-art/beasts-kit.jpg: the kit's moonpack/dirt_tile, moonpack/snow_tile, moonpack/pine_floor_tile and
  moonpack/scale_tile give the colours to match.
- src/art/camp/camp-war.png, its bottom row: the frozen hunting grounds as the overlook paints them.
- docs/samples/assault-art/template-textures-1024.png: the grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/beasts-kit.jpg > /tmp/beasts-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

THE VIEW IS STRAIGHT DOWN, NOT ISOMETRIC: draw each texture as seen from directly above, like a map, with no perspective, no horizon
and no cast shadows longer than a pebble's. Style: painted pixel art matching the Moonpack kit's ground tiles; readable, not noisy; no
single feature so striking that its repeat would be noticed.

The sheet: 1024 x 1024 px, a 4 x 4 grid of 256 x 256 squares, read left to right, top to bottom. EACH SQUARE IS ONE TEXTURE COVERING
4 x 4 TILES, AND MUST TILE SEAMLESSLY WITH ITSELF ON ALL FOUR SIDES (its left edge continues its right edge, its top its bottom).
Keep the squares separate: nothing crosses from one square into the next.

1. Moor grass: russet and gold autumn grass with darker tufts and a few small stones.
2. Moor grass, second variant: the same, with patches of purple heather.
3. Bracken and heather: rust-brown dead bracken, purple heather and grey stones, for the moor's wild rear.
4. Trampled moor: worn grass with bare peat patches and paw-flattened stalks, round the posts.
5. Peat: dark brown peat, footprinted and paw-printed.
6. Peat, second variant: the same, with fallen oak and birch leaves pressed in.
7. Churned bog: wet black ruts and puddles, for the lanes and the ditch floor.
8. Frosted moor: the moor grass silvered with hoarfrost, the first of the snow in thin patches (the climb's middle).
9. Snow over grass: thin snow with tufts of grass and stones showing through.
10. Deep snow: smooth white snow with soft blue shadows and a few footprints.
11. Trodden snow: packed, dirty, trampled snow with paw prints and sled runners, for the den's yards.
12. Flagstones under snow: big uneven grey flags with snow in the joints.
13. Wall-walk planks under frost: heavy timber planks seen from above, running from the top of the square to the bottom, frost on them.
14. Pine needles: a forest floor of brown needles, cones and twigs.
15. River shingle: rounded grey pebbles and coarse sand, damp.
16. Shallow cold water over pebbles: clear dark river water over shingle, a few ripples, a rim of ice at one side.
```

## Prompt 6: BST-06, the overlays the game lays where two grounds meet

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Beast Packs': the Howling Den, a hunters' stronghold on an autumn moor of heather and bracken that climbs into snowbound crags: a
ring of log walls lashed with hides, a gorge with a cold river crossed by a rope bridge, howling stones, and the alpha's great cave
den under a skull arch at its frozen heart.
This task paints ONE sheet: the overlays the game lays where two grounds meet.

Rules for this task:
- Branch: art/assault-beasts. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/beasts/bst-06-transitions.png. Change no other file.
- Pull request into main titled "Assault art: the Howling Den". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG): each overlay is the material only, and everything else is transparent.

Open these files first and match them:
- art-source/assault/beasts/bst-05-ground.png on this branch, if it is there: the ground textures these overlays must match exactly in
  colour and pixel density. If it is not there yet, match the descriptions below and src/art/areas/autumn/top1.png.
- docs/samples/assault-art/template-textures-1024.png: the grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/beasts-kit.jpg > /tmp/beasts-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

Where two grounds meet (snow beside moor, a path's edge), the game lays an overlay along the shared edge so the join is ragged and
natural instead of a straight seam.

THE VIEW IS STRAIGHT DOWN, NOT ISOMETRIC, as on a map. Style: painted pixel art matching the ground textures, with soft, ragged,
organic edges (clumps, tongues and scattered bits), never a straight line or a smooth gradient band.

The sheet: 1024 x 1024 px, a 4 x 4 grid of 256 x 256 squares, read left to right, top to bottom. Each square is ONE tile, painted at
4x. The cells come in pairs:
- an EDGE (odd cells): the material covers the square's TOP edge fully, along its whole width, and breaks up into transparency by about
  40% of the way down. It must join seamlessly with itself left to right, because the game lays it along a whole row of tiles. The
  game turns it to face each of the four sides.
- an OUTER CORNER (even cells): the material sits only in the square's TOP-LEFT corner, a ragged rounded patch reaching about 40% of
  the way along the top and left edges, fading to transparency, and meeting the edge overlay's profile where it touches the edges.

1. Snow drifting onto the moor: edge.            2. The same: outer corner.
3. Peat and mud spreading onto grass: edge.      4. The same: outer corner.
5. A trodden path's edge over moor grass: edge.  6. The same: outer corner.
7. Fallen leaves blown onto any ground: edge.    8. The same: outer corner.
9. River shingle onto grass: edge.               10. The same: outer corner.
11. Flagstones sinking into snow: edge.          12. The same: outer corner.
13. Heather creeping onto peat: edge.            14. The same: outer corner.
15. The water's edge: a thin rim of ice and foam with wet dark stones, laid on the water side of a bank: edge.
16. The same: outer corner.
```

## Prompt 7: BST-07, the alpha's den, its throne of furs and the great banner

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Beast Packs': the Howling Den, a hunters' stronghold on an autumn moor of heather and bracken that climbs into snowbound crags: a
ring of log walls lashed with hides, a gorge with a cold river crossed by a rope bridge, howling stones, and the alpha's great cave
den under a skull arch at its frozen heart.
This task paints ONE sheet: the alpha's den, its throne of furs and the great banner.

Rules for this task:
- Branch: art/assault-beasts. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/beasts/bst-07-keep.png. Change no other file.
- Pull request into main titled "Assault art: the Howling Den". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG). Each piece casts only a small soft contact shadow on its own footprint.

Open these files first and match them:
- docs/samples/assault-art/beasts-kit.jpg: the Moonpack kit (Chronos Settlement's isometric kit), labelled. Your pieces stand
  beside these on the map, so match them exactly: the dark weathered timber, the lashings and hides, the antlers and beast skulls, the
  grey stone dusted with snow, the warm torch and bonfire light.
  Above all moonpack/cave_den, moonpack/longhouse and moonpack/howling_stone.
- src/art/camp/camp-war.png, its bottom row: the Beasts' frozen hunting grounds as the camp's overlook paints it.
- src/art/areas/autumn/top1.png and src/art/areas/snow/top1.png: the autumn and snow lands' ground as the game draws them today.
- docs/samples/assault-art/template-keep-1536.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/beasts-kit.jpg > /tmp/beasts-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

Style: detailed painted pixel art, exactly like the Moonpack kit. Crisp dark outlines, chunky readable shapes, a palette of dark
weathered timber, tan and grey hides, bone and antler, grey stone, the moor's russet and gold, and white snow where a piece stands
in the crags, with warm firelight as the accent. It must read clearly when shown at a quarter of this size on a phone.

The angle and scale, exactly:
- True 2:1 isometric (dimetric) view, no perspective: a flat square tile on the ground is a diamond exactly twice as wide as it is
  tall, its corners pointing up, right, down and left. Vertical edges stay vertical.
- ONE TILE = a diamond 128 px wide and 64 px tall. ONE HEIGHT STEP = 24 px.
- Light from the upper left: faces turned to the lower left are lit; faces turned to the lower right are in shade.
- The hold climbs from an autumn moor (outside the ring) into snowbound crags (inside it). Pieces marked MOOR stand in autumn: no snow,
  russet bracken and fallen leaves at their feet. Pieces marked SNOW stand in the crags: snow on every ledge and roof, icicles, frost.
- These are SNOW pieces, at the top of the crags.
- A doorway is about 4 steps (96 px) tall.

The sheet: 1536 x 1024 px. Three cells:
1. Cell 1, x 0 to 1024, y 0 to 1024: THE ALPHA'S DEN. Footprint 6 tiles along u (upper left to lower right) by 4 tiles along v: a
   diamond 640 px wide and 320 px tall, centred on the foot point (512, 840). It may rise up to about 640 px above its foot.
   A great cave mouth in a snowbound grey crag, under an arch made of the skull and jaws of a colossal beast, its fangs hanging like a
   portcullis over the dark entrance (facing the lower left), firelight glowing inside, a timber hall built into the cave's front with
   hide roofs heavy with snow, antler crowns on its gables, pelts and trophies hung along it, icicles, a frozen waterfall down one side
   of the crag, braziers either side of the stone steps. Grander than anything else on the map.
2. Cell 2, x 1024 to 1536, y 0 to 512: THE ALPHA'S THRONE. One-tile footprint (a diamond 128 x 64) centred on the foot point (256, 440)
   in the cell. A great seat carved from one boulder, heaped with white wolf and bear furs, its back a fan of antlers about 6 steps
   tall crowned with a wolf skull, two braziers on the two-step stone dais. Facing the lower left.
3. Cell 3, x 1024 to 1536, y 512 to 1024: THE GREAT BANNER. One-tile footprint centred on (256, 440) in the cell. A tall pole (about
   14 steps) of dark wood in a cairn of stones and antlers, a crossbar hung with a long hide banner painted with a howling wolf's head,
   tattered at the bottom, a wolf skull on top of the pole, fangs and feathers tied below the crossbar.
```

## Prompt 8: BST-08, the crag wall's dressing, the stairs and small structures

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Beast Packs': the Howling Den, a hunters' stronghold on an autumn moor of heather and bracken that climbs into snowbound crags: a
ring of log walls lashed with hides, a gorge with a cold river crossed by a rope bridge, howling stones, and the alpha's great cave
den under a skull arch at its frozen heart.
This task paints ONE sheet: the crag wall's dressing, the stairs and small structures.

Rules for this task:
- Branch: art/assault-beasts. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/beasts/bst-08-wall-dressing.png. Change no other file.
- Pull request into main titled "Assault art: the Howling Den". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG). Each piece casts only a small soft contact shadow on its own footprint.

Open these files first and match them:
- docs/samples/assault-art/beasts-kit.jpg: the Moonpack kit (Chronos Settlement's isometric kit), labelled. Your pieces stand
  beside these on the map, so match them exactly: the dark weathered timber, the lashings and hides, the antlers and beast skulls, the
  grey stone dusted with snow, the warm torch and bonfire light.
  Above all moonpack/torch_post, moonpack/skull_signpost and moonpack/hide_bundles.
- src/art/camp/camp-war.png, its bottom row: the Beasts' frozen hunting grounds as the camp's overlook paints it.
- src/art/areas/autumn/top1.png and src/art/areas/snow/top1.png: the autumn and snow lands' ground as the game draws them today.
- docs/samples/assault-art/template-props-1024.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/beasts-kit.jpg > /tmp/beasts-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

Style: detailed painted pixel art, exactly like the Moonpack kit. Crisp dark outlines, chunky readable shapes, a palette of dark
weathered timber, tan and grey hides, bone and antler, grey stone, the moor's russet and gold, and white snow where a piece stands
in the crags, with warm firelight as the accent. It must read clearly when shown at a quarter of this size on a phone.

The angle and scale, exactly:
- True 2:1 isometric (dimetric) view, no perspective: a flat square tile on the ground is a diamond exactly twice as wide as it is
  tall, its corners pointing up, right, down and left. Vertical edges stay vertical.
- ONE TILE = a diamond 128 px wide and 64 px tall. ONE HEIGHT STEP = 24 px.
- Light from the upper left: faces turned to the lower left are lit; faces turned to the lower right are in shade.
- The hold climbs from an autumn moor (outside the ring) into snowbound crags (inside it). Pieces marked MOOR stand in autumn: no snow,
  russet bracken and fallen leaves at their feet. Pieces marked SNOW stand in the crags: snow on every ledge and roof, icicles, frost.
- These are SNOW pieces. The crag wall's walkway is 6 steps up; these pieces stand on it or against it.

The sheet: 1024 x 1024 px, a 4 x 4 grid of 256 x 256 cells, read left to right, top to bottom. Every piece has a ONE-TILE footprint:
its diamond's centre (the foot point) is at (128, 208) inside its cell. Keep each piece inside its own cell with 8 px to spare.

1. Log merlon: one stout log post with a snowy cap, for the wall's outer edge, along u.
2. The same merlon, broken: snapped off, the log lying on the walk.
3. Inner rail: a low log rail along the walk's inner edge, along u.
4. Wall brazier: an iron basket of fire on a stone stand, for the walk (about 2 steps tall).
5. Wall torch: a torch on a hooked antler bracket.
6. A small hanging banner: a painted hide on a short pole.
7. Archer's hide: a low roof of hides over a gap in the parapet.
8. A rack of spears and hunting bows against the rail.
9. Stairs up the wall, along u: rough stone and log steps rising 6 steps (144 px) from the ground at the lower left to the walk, snow
   on the treads. One tile.
10. Stairs down, the same steps seen descending to the lower right (the game uses it where a stair goes down into a pit).
11. A rope ladder with log rungs hanging down a wall to the upper right, about 6 steps tall.
12. A cauldron of boiling pitch on the walk over a fire, a ladle.
13. A bundle of hides and a fur bedroll by the wall.
14. An alarm horn on a carved stand.
15. A frozen wolf trap: iron jaws half buried in snow, a chain to a stake.
16. A drift of snow against the wall, with a half-buried shield.
```

## Prompt 9: BST-09, the howling stones (the hold's war drums) and its great landmarks

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Beast Packs': the Howling Den, a hunters' stronghold on an autumn moor of heather and bracken that climbs into snowbound crags: a
ring of log walls lashed with hides, a gorge with a cold river crossed by a rope bridge, howling stones, and the alpha's great cave
den under a skull arch at its frozen heart.
This task paints ONE sheet: the howling stones (the hold's war drums) and its great landmarks.

Rules for this task:
- Branch: art/assault-beasts. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/beasts/bst-09-landmarks.png. Change no other file.
- Pull request into main titled "Assault art: the Howling Den". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG). Each piece casts only a small soft contact shadow on its own footprint.

Open these files first and match them:
- docs/samples/assault-art/beasts-kit.jpg: the Moonpack kit (Chronos Settlement's isometric kit), labelled. Your pieces stand
  beside these on the map, so match them exactly: the dark weathered timber, the lashings and hides, the antlers and beast skulls, the
  grey stone dusted with snow, the warm torch and bonfire light.
  Above all moonpack/howling_stone, moonpack/shrine, moonpack/meat_racks and moonpack/rope_bridge.
- src/art/camp/camp-war.png, its bottom row: the Beasts' frozen hunting grounds as the camp's overlook paints it.
- src/art/areas/autumn/top1.png and src/art/areas/snow/top1.png: the autumn and snow lands' ground as the game draws them today.
- docs/samples/assault-art/template-buildings-1536.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/beasts-kit.jpg > /tmp/beasts-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

Style: detailed painted pixel art, exactly like the Moonpack kit. Crisp dark outlines, chunky readable shapes, a palette of dark
weathered timber, tan and grey hides, bone and antler, grey stone, the moor's russet and gold, and white snow where a piece stands
in the crags, with warm firelight as the accent. It must read clearly when shown at a quarter of this size on a phone.

The angle and scale, exactly:
- True 2:1 isometric (dimetric) view, no perspective: a flat square tile on the ground is a diamond exactly twice as wide as it is
  tall, its corners pointing up, right, down and left. Vertical edges stay vertical.
- ONE TILE = a diamond 128 px wide and 64 px tall. ONE HEIGHT STEP = 24 px.
- Light from the upper left: faces turned to the lower left are lit; faces turned to the lower right are in shade.
- The hold climbs from an autumn moor (outside the ring) into snowbound crags (inside it). Pieces marked MOOR stand in autumn: no snow,
  russet bracken and fallen leaves at their feet. Pieces marked SNOW stand in the crags: snow on every ledge and roof, icicles, frost.
- The howling stones play the part the orc hold's war drums do: while one howls, the pack near it fights harder, until our troops
  reach it and silence it.

The sheet: 1536 x 1024 px, a 3 x 2 grid of 512 x 512 cells, read left to right, top to bottom. The foot point (the centre of the
footprint diamond) is at (256, 416) in every cell. Footprints: cells 1 to 4 are 2 x 2 tiles (a diamond 256 x 128); cells 5 and 6 are 3 x 3 tiles (a diamond 384 x 192). Keep each piece inside its cell with 8 px to spare.

1. A howling stone, howling (MOOR): a tall standing stone carved with a wolf's head and spirals (no letters or runes),
   ringed by smaller stones and antlers, at the instant it howls: pale blue sound-rings bursting from its carved mouth, frost and
   leaves whirling round it, the torches at its foot flaring.
2. The same howling stone, silenced (MOOR): after our troops reached it: cracked through and toppled on its side, the small stones
   scattered, the torches out and smoking.
3. The hunting grounds' kill racks (MOOR): a frame of poles hung with a stag and boars, hides drying, a butchering block and a fire.
4. The alpha's waymark (SNOW): a cairn of skulls under a great antlered pole, bones in the snow round it.
5. The howling-stone circle (MOOR): a ring of eight tall standing stones on a low rise, a flat altar stone in the middle with old
   blood and bones.
6. The frozen waterfall (SNOW): a crag face with a great waterfall frozen in blue-white columns, a frozen pool at its foot, icicles,
   snowy pines either side.
```

## Prompt 10: BST-10, the den's small props the kit does not have

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Beast Packs': the Howling Den, a hunters' stronghold on an autumn moor of heather and bracken that climbs into snowbound crags: a
ring of log walls lashed with hides, a gorge with a cold river crossed by a rope bridge, howling stones, and the alpha's great cave
den under a skull arch at its frozen heart.
This task paints ONE sheet: the den's small props the kit does not have.

Rules for this task:
- Branch: art/assault-beasts. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/beasts/bst-10-props.png. Change no other file.
- Pull request into main titled "Assault art: the Howling Den". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG). Each piece casts only a small soft contact shadow on its own footprint.

Open these files first and match them:
- docs/samples/assault-art/beasts-kit.jpg: the Moonpack kit (Chronos Settlement's isometric kit), labelled. Your pieces stand
  beside these on the map, so match them exactly: the dark weathered timber, the lashings and hides, the antlers and beast skulls, the
  grey stone dusted with snow, the warm torch and bonfire light.
  The kit already gives the barrels, the bonfire, the boulders, the cave den, the hide bundles, the meat racks, the pelt stall, the
  pines and bushes, the sled, the torch post, the well and the woodpile: do not paint those again. These props go with them.
- src/art/camp/camp-war.png, its bottom row: the Beasts' frozen hunting grounds as the camp's overlook paints it.
- src/art/areas/autumn/top1.png and src/art/areas/snow/top1.png: the autumn and snow lands' ground as the game draws them today.
- docs/samples/assault-art/template-props-1024.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/beasts-kit.jpg > /tmp/beasts-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

Style: detailed painted pixel art, exactly like the Moonpack kit. Crisp dark outlines, chunky readable shapes, a palette of dark
weathered timber, tan and grey hides, bone and antler, grey stone, the moor's russet and gold, and white snow where a piece stands
in the crags, with warm firelight as the accent. It must read clearly when shown at a quarter of this size on a phone.

The angle and scale, exactly:
- True 2:1 isometric (dimetric) view, no perspective: a flat square tile on the ground is a diamond exactly twice as wide as it is
  tall, its corners pointing up, right, down and left. Vertical edges stay vertical.
- ONE TILE = a diamond 128 px wide and 64 px tall. ONE HEIGHT STEP = 24 px.
- Light from the upper left: faces turned to the lower left are lit; faces turned to the lower right are in shade.
- The hold climbs from an autumn moor (outside the ring) into snowbound crags (inside it). Pieces marked MOOR stand in autumn: no snow,
  russet bracken and fallen leaves at their feet. Pieces marked SNOW stand in the crags: snow on every ledge and roof, icicles, frost.

The sheet: 1024 x 1024 px, a 4 x 4 grid of 256 x 256 cells, read left to right, top to bottom. Every piece has a ONE-TILE footprint:
its diamond's centre (the foot point) is at (128, 208) inside its cell. Keep each piece inside its own cell with 8 px to spare.

1. A hunter's lean-to of branches and hides (MOOR).
2. A tripod of poles with a skin stretched to dry (MOOR).
3. A gutted stag hung from a tree branch (MOOR).
4. A bear trap and a heap of old bones (MOOR).
5. A wolf's feeding pit: a shallow pit of gnawed bones (SNOW).
6. A dog sled loaded with furs (SNOW).
7. A totem of stacked carved beast heads (MOOR).
8. A heap of antlers (SNOW).
9. A falconer's perch with a hooded hawk (MOOR).
10. A cage of lashed poles holding a snarling wolf (SNOW).
11. A smoking pit with fish on sticks (MOOR).
12. A pile of skulls of many beasts (SNOW).
13. A clump of autumn birches, gold leaves (MOOR).
14. Red and gold bracken clumps (MOOR).
15. A snow-buried cairn (SNOW).
16. A fallen hunter's spear and shield in the leaves (MOOR).
```

## Prompt 11: BST-11, ruins, and the burnt states of the hunters' camp

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Beast Packs': the Howling Den, a hunters' stronghold on an autumn moor of heather and bracken that climbs into snowbound crags: a
ring of log walls lashed with hides, a gorge with a cold river crossed by a rope bridge, howling stones, and the alpha's great cave
den under a skull arch at its frozen heart.
This task paints ONE sheet: ruins, and the burnt states of the hunters' camp.

Rules for this task:
- Branch: art/assault-beasts. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/beasts/bst-11-ruins.png. Change no other file.
- Pull request into main titled "Assault art: the Howling Den". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG). Each piece casts only a small soft contact shadow on its own footprint.

Open these files first and match them:
- docs/samples/assault-art/beasts-kit.jpg: the Moonpack kit (Chronos Settlement's isometric kit), labelled. Your pieces stand
  beside these on the map, so match them exactly: the dark weathered timber, the lashings and hides, the antlers and beast skulls, the
  grey stone dusted with snow, the warm torch and bonfire light.
- src/art/camp/camp-war.png, its bottom row: the Beasts' frozen hunting grounds as the camp's overlook paints it.
- src/art/areas/autumn/top1.png and src/art/areas/snow/top1.png: the autumn and snow lands' ground as the game draws them today.
- docs/samples/assault-art/template-buildings-1536.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/beasts-kit.jpg > /tmp/beasts-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

Style: detailed painted pixel art, exactly like the Moonpack kit. Crisp dark outlines, chunky readable shapes, a palette of dark
weathered timber, tan and grey hides, bone and antler, grey stone, the moor's russet and gold, and white snow where a piece stands
in the crags, with warm firelight as the accent. It must read clearly when shown at a quarter of this size on a phone.

The angle and scale, exactly:
- True 2:1 isometric (dimetric) view, no perspective: a flat square tile on the ground is a diamond exactly twice as wide as it is
  tall, its corners pointing up, right, down and left. Vertical edges stay vertical.
- ONE TILE = a diamond 128 px wide and 64 px tall. ONE HEIGHT STEP = 24 px.
- Light from the upper left: faces turned to the lower left are lit; faces turned to the lower right are in shade.
- Our own siege works (the ladders, the ram, the trebuchet) are already painted on the Orc hold's sheets and serve every hold: do not
  paint them. The Warpath's reserve camp here is the hunters' camp on the high moor: its hide tents burn when our archers loose fire
  arrows.
- The hold climbs from an autumn moor (outside the ring) into snowbound crags (inside it). Pieces marked MOOR stand in autumn: no snow,
  russet bracken and fallen leaves at their feet. Pieces marked SNOW stand in the crags: snow on every ledge and roof, icicles, frost.

The sheet: 1536 x 1024 px, a 3 x 2 grid of 512 x 512 cells, read left to right, top to bottom. The foot point (the centre of the
footprint diamond) is at (256, 416) in every cell. Footprints: cells 1 and 2 are 2 tiles along u by 1 (a diamond 192 x 96); cells 3 to 6 are 2 x 2 tiles (a diamond 256 x 128). Keep each piece inside its cell with 8 px to spare.

1. A hunters' hide tent (MOOR): a long tent of stitched hides on bent poles, antlers on its ridge, a fire by the flap.
2. The same tent, burnt: a black heap of charred poles and shrivelled hide, ash, a few embers.
3. A great tepee of furs (MOOR), painted with wolves, smoke from its top.
4. The same tepee, burnt: its poles standing charred, the furs gone to ash.
5. A ruined old hall (MOOR): the stone footings and two fallen roof beams of a hall long abandoned, bracken growing through.
6. A collapsed lookout (SNOW): a toppled timber watchtower lying in the snow.
```

## Prompt 12: BST-12, the gorge's cold river, its rope bridge, fords and banks

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Beast Packs': the Howling Den, a hunters' stronghold on an autumn moor of heather and bracken that climbs into snowbound crags: a
ring of log walls lashed with hides, a gorge with a cold river crossed by a rope bridge, howling stones, and the alpha's great cave
den under a skull arch at its frozen heart.
This task paints ONE sheet: the gorge's cold river, its rope bridge, fords and banks.

Rules for this task:
- Branch: art/assault-beasts. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/beasts/bst-12-gorge.png. Change no other file.
- Pull request into main titled "Assault art: the Howling Den". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG). Each piece casts only a small soft contact shadow on its own footprint.

Open these files first and match them:
- docs/samples/assault-art/beasts-kit.jpg: the Moonpack kit (Chronos Settlement's isometric kit), labelled. Your pieces stand
  beside these on the map, so match them exactly: the dark weathered timber, the lashings and hides, the antlers and beast skulls, the
  grey stone dusted with snow, the warm torch and bonfire light.
  Above all moonpack/rope_bridge: the bridge here is its style.
- src/art/camp/camp-war.png, its bottom row: the Beasts' frozen hunting grounds as the camp's overlook paints it.
- src/art/areas/autumn/top1.png and src/art/areas/snow/top1.png: the autumn and snow lands' ground as the game draws them today.
- docs/samples/assault-art/template-props-1024.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/beasts-kit.jpg > /tmp/beasts-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

Style: detailed painted pixel art, exactly like the Moonpack kit. Crisp dark outlines, chunky readable shapes, a palette of dark
weathered timber, tan and grey hides, bone and antler, grey stone, the moor's russet and gold, and white snow where a piece stands
in the crags, with warm firelight as the accent. It must read clearly when shown at a quarter of this size on a phone.

The angle and scale, exactly:
- True 2:1 isometric (dimetric) view, no perspective: a flat square tile on the ground is a diamond exactly twice as wide as it is
  tall, its corners pointing up, right, down and left. Vertical edges stay vertical.
- ONE TILE = a diamond 128 px wide and 64 px tall. ONE HEIGHT STEP = 24 px.
- Light from the upper left: faces turned to the lower left are lit; faces turned to the lower right are in shade.
- The Howling Den has a cold river at the bottom of a rocky gorge where the Orc hold has its river. The game draws the water as ground;
  these pieces stand in it or on its banks.
- "Along u" means running from the upper left down to the lower right (like "\"). Every run on this sheet runs along u, passing
  through its tile from the midpoint of the diamond's upper-left edge to the midpoint of its lower-right edge, so that pieces placed on
  neighbouring tiles join seamlessly at those points. (The game mirrors them for runs going the other way.)
- The hold climbs from an autumn moor (outside the ring) into snowbound crags (inside it). Pieces marked MOOR stand in autumn: no snow,
  russet bracken and fallen leaves at their feet. Pieces marked SNOW stand in the crags: snow on every ledge and roof, icicles, frost.
- These are MOOR pieces.

The sheet: 1024 x 1024 px, a 4 x 4 grid of 256 x 256 cells, read left to right, top to bottom. Every piece has a ONE-TILE footprint:
its diamond's centre (the foot point) is at (128, 208) inside its cell. Keep each piece inside its own cell with 8 px to spare.

1. Rope bridge deck, whole: planks on ropes crossing along u, rope rails on posts.
2. The bridge, broken: a gap of snapped planks and hanging ropes. Impassable.
3. The bridge's end, where it meets the bank at the upper left, with its anchor posts.
4. A bridge anchor post: a thick post with ropes and a skull.
5. Ford stones: a line of flat stepping stones along u, their tops showing above the water.
6. Reeds and rushes standing in the shallows, gone gold.
7. A fallen tree lying across the water.
8. A beaver dam of sticks and mud.
9. Wet dark boulders at the water's edge.
10. A salmon weir of woven branches.
11. A hide boat (a coracle), beached.
12. A spray of white water over rocks (semi-transparent).
13. A drowned stag's antlers sticking up from the water.
14. Ice floes: thin plates of ice floating at the water's edge.
15. A fishing post with a net hung to dry.
16. Rough stone steps going down into the water from the bank at the upper left.
```

## Prompt 13: BST-13, sixteen ground decals

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Beast Packs': the Howling Den, a hunters' stronghold on an autumn moor of heather and bracken that climbs into snowbound crags: a
ring of log walls lashed with hides, a gorge with a cold river crossed by a rope bridge, howling stones, and the alpha's great cave
den under a skull arch at its frozen heart.
This task paints ONE sheet: sixteen ground decals.

Rules for this task:
- Branch: art/assault-beasts. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/beasts/bst-13-decals.png. Change no other file.
- Pull request into main titled "Assault art: the Howling Den". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG).

Open these files first and match them:
- art-source/assault/beasts/bst-05-ground.png on this branch, if it is there: the ground these lie on (match its pixel density, 64 px a
  tile at quarter size). Otherwise src/art/areas/autumn/top1.png.
- docs/samples/assault-art/template-textures-1024.png: the grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/beasts-kit.jpg > /tmp/beasts-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

THE VIEW IS STRAIGHT DOWN, NOT ISOMETRIC, as on a map: everything lies flat on the ground, nothing stands up. Style: painted pixel
art matching the Moonpack kit's ground; readable; blood is a dark red-brown, never bright or gory.

The sheet: 1024 x 1024 px, a 4 x 4 grid of 256 x 256 squares, read left to right, top to bottom. Each square holds ONE decal covering
up to 2 x 2 tiles, centred, with at least 16 px of transparency round it.

1. Blood spatter.   2. Blood on snow (a spray of dark red on white).   3. Claw marks raked across the ground.
4. Scorch mark, round (a blast).   5. Ash and embers.
6. Stone rubble scatter.   7. Timber debris (splinters, a broken log, rawhide).
8. Sled ruts: two parallel runner tracks running straight from the square's top edge to its bottom edge (so they join end to end).
9. Wolf tracks: a trail of big paw prints crossing the square.   10. Boar and stag tracks crossing.
11. A puddle of cold water rimmed with ice.   12. Fallen autumn leaves blown flat.
13. Scattered bones and tufts of fur.   14. Pine needles and cones.
15. Frost cracks on ice.   16. Cracked flagstones (cracks and a few broken corners, to lay over a stone floor).
```
