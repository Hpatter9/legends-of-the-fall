# The Assault: ChatGPT prompts for the Labyrinth's hold (the Heart of the Maze)

Phase 4's fourth hold (`docs/design/assault-mode.md` on `claude/assault-design`, phase 4; the owner's name for it). The owner gave no look for
it, so it follows the camp's overlook, which already paints the Labyrinth's "stone labyrinth" (`src/art/camp/camp-wild.png`, its middle row):
a sandstone maze at evening, braziers and red banners on its walls, and a horned temple at its heart. It is built like the other holds, on the
same engine and the same kinds of sheet, so prompts 1 to 13 mirror the Orc set sheet for sheet: the same canvases, grids, foot points, angles
and formats, so the cutter (`tools/assault/cut-sheets.py`) and the field's renderer take them as they took the Orc sheets. **Prompt 14 is the
one sheet with no Orc twin**: the maze walls of the approaches, which only this hold has. **They paint only what the packs and the Orc sheets
cannot cover.** Until they land, the hold is built on stand-ins: the Orc sheets' pieces, recoloured, and the kit pieces below.

**The hold.** A dark stone-lined canal where the others have their water, crossed by an old stone bridge and two fords; a maze of sandstone
walls on the approaches between the canal and the ring; a ring of bronze-capped sandstone walls, with the Horned Gate; the horned altars,
where the minotaurs' great horns are blown (the war drums' part); an inner wall of massive pale limestone, with the Bronze Gate; and the Bull
Temple at the heart, with the champion's throne before it.

**What the packs already give** (Chronos's Knights and Nomads kits, `docs/samples/assault-art/labyrinth-kit.jpg`; cut straight in, as the Orc
hold's kit pieces were). The Knights kit is drawn for a northern kingdom (blue banners, slate roofs), so it lends this hold its stone and its
drawing, not its colours:

- walls and gates as decoration: `knights/stone_wall_run`, `stone_wall_corner`, `gatehouse`, `iron_fence`; `nomads/banner_gate`,
  `rope_fence`;
- buildings: `knights/barracks`, `chapel`, `watchtower`, `granary`, `stable`, `workshop`, `market_stall`; `nomads/scaffold_tower`,
  `shrine`, `carpet_stall`;
- goods: `knights/barrels`, `crates`, `hay_bales`, `cart`, `stockpile`, `woodpile`; `nomads/chests`, `water_skins`, `covered_wagon`;
- lights: `knights/campfire`, `lamp_post`; `nomads/campfire`, `tassel_lantern`, `standard`;
- nature: `knights/rocks`, `bush`, `oak_tree`; `nomads/red_rocks`, `red_rocks_small`, `acacia_tree`, `dead_shrub`, `tumbleweed`;
- the bridges: `knights/stone_bridge`, `nomads/plank_bridge`.

**What the Orc sheets already give every hold:** our own siege works (the ladders, the ram, the trebuchet), so no sheet here paints them.

**How to use them** (as for the other sets):

- Paste everything inside one fence into a new ChatGPT (Codex) conversation.
- Each prompt stands alone, and all of them add to the one branch, `art/assault-labyrinth`, under `art-source/assault/labyrinth/`, and the
  one pull request, "Assault art: the Heart of the Maze".
- Each sheet is one image. If a sheet comes back wrong (the angle, the grid, a busy background), run the same prompt again. Allow two or
  three tries a sheet.
- ChatGPT adds the PNGs only. The builder cuts the sheets afterwards, credits them, and adds them to the service worker.

**The reference files the prompts name:**

- `docs/samples/assault-art/labyrinth-kit.jpg`: the Knights and Nomads kit pieces, labelled (on `claude/assault-2` until it is merged);
- `docs/samples/assault-art/template-*.png`: the grids (on `claude/assault-art-plan` until it is merged);
- `src/art/camp/camp-wild.png`, its middle row: the stone labyrinth as the overlook paints it;
- `src/art/areas/temple/` and `src/art/areas/ruins/`: those lands' tops and sides as the game draws them today.

Each prompt says how to fetch the files from those branches if they are missing on main.

| # | Sheet | File | Canvas | Cells | The Orc sheet it matches |
| --- | --- | --- | --- | --- | --- |
| 1 | LAB-01 The ring of bronze-capped walls | `lab-01-ring-wall.png` | 1024 x 1024 | 16 | ORC-01 the palisade |
| 2 | LAB-02 The ring's gates | `lab-02-gates.png` | 1536 x 1024 | 6 | ORC-02 the palisade's gates |
| 3 | LAB-03 The Bronze Gate and the towers | `lab-03-bronze-gate.png` | 1536 x 1024 | 6 | ORC-03 the Iron Gate |
| 4 | LAB-04 Cliff and wall faces | `lab-04-faces.png` | 1536 x 1024 | 12 | ORC-04 the faces |
| 5 | LAB-05 Ground textures | `lab-05-ground.png` | 1024 x 1024 | 16 | ORC-05 the ground |
| 6 | LAB-06 Ground transitions | `lab-06-transitions.png` | 1024 x 1024 | 16 | ORC-06 the transitions |
| 7 | LAB-07 The Bull Temple and the throne | `lab-07-keep.png` | 1536 x 1024 | 3 | ORC-07 the keep |
| 8 | LAB-08 The wall's dressing and the stairs | `lab-08-wall-dressing.png` | 1024 x 1024 | 16 | ORC-08 the wall's dressing |
| 9 | LAB-09 The horned altars and the landmarks | `lab-09-landmarks.png` | 1536 x 1024 | 6 | ORC-09 the camp's big pieces (the drums) |
| 10 | LAB-10 The labyrinth's props | `lab-10-props.png` | 1024 x 1024 | 16 | ORC-10 the camp's props |
| 11 | LAB-11 Ruins and the herders' camp's burnt states | `lab-11-ruins.png` | 1536 x 1024 | 6 | ORC-11 siege works and ruins |
| 12 | LAB-12 The canal | `lab-12-canal.png` | 1024 x 1024 | 16 | ORC-12 bridges, fords and the river |
| 13 | LAB-13 Ground decals | `lab-13-decals.png` | 1024 x 1024 | 16 | ORC-13 the decals |
| 14 | LAB-14 The maze walls | `lab-14-maze-walls.png` | 1024 x 1024 | 16 | (none: this hold's own) |

They are ordered by what the hold needs first: its walls and gates, then its ground, then its heart and dressing; the maze walls last, as
the kit's stone wall stands in for them until they land.

---

## Prompt 1: LAB-01, the ring of bronze-capped sandstone walls, in every state of the siege

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Labyrinth's: the Heart of the Maze, a sun-baked stone labyrinth at evening: a dark canal crossed by an old stone bridge, a maze of
sandstone walls on the approaches, a ring of bronze-capped walls, great horned altars where the minotaurs' horns are blown, an inner wall
of massive pale stone blocks, and at its heart the Bull Temple, a stepped temple of columns under a colossal pair of bull's horns.
This task paints ONE sheet: the ring of bronze-capped sandstone walls, in every state of the siege.

Rules for this task:
- Branch: art/assault-labyrinth. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/labyrinth/lab-01-ring-wall.png. Change no other file.
- Pull request into main titled "Assault art: the Heart of the Maze". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG). Each piece casts only a small soft contact shadow on its own footprint.

Open these files first and match them:
- docs/samples/assault-art/labyrinth-kit.jpg: the Knights and Nomads kits (Chronos Settlement's isometric kits), labelled. Your pieces
  stand beside these on the map, so match their drawing exactly (the outlines, the shading, the scale of a stone block or a brazier), but
  not their colours: this hold is warm sandstone, bronze and red cloth, never the Knights' blue.
  Above all knights/stone_wall_run, knights/stone_wall_corner and nomads/banner_gate: the same block size and outline, in sandstone.
- src/art/camp/camp-wild.png, its middle row: the stone labyrinth as the camp's overlook paints it (its sandstone walls, its braziers, its
  red banners and the horned temple at its heart). Match its look closely.
- src/art/areas/temple/top1.png and src/art/areas/ruins/top1.png: the temple and ruins lands' ground as the game draws them today.
- docs/samples/assault-art/template-props-1024.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/labyrinth-kit.jpg > /tmp/labyrinth-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

Style: detailed painted pixel art, drawn exactly like the Knights and Nomads kits. Crisp dark outlines, chunky readable shapes, a
palette of warm sandstone and ochre, pale limestone, weathered bronze, deep red cloth and dark olive scrub, with the orange glow of
braziers at evening as the accent. It must read clearly when shown at a quarter of this size on a phone.

The angle and scale, exactly:
- True 2:1 isometric (dimetric) view, no perspective: a flat square tile on the ground is a diamond exactly twice as wide as it is
  tall, its corners pointing up, right, down and left. Vertical edges stay vertical.
- ONE TILE = a diamond 128 px wide and 64 px tall. ONE HEIGHT STEP = 24 px.
- Light from the upper left: faces turned to the lower left are lit; faces turned to the lower right are in shade.
- "Along u" means running from the upper left down to the lower right (like "\"). Every run on this sheet runs along u, passing
  through its tile from the midpoint of the diamond's upper-left edge to the midpoint of its lower-right edge, so that pieces placed on
  neighbouring tiles join seamlessly at those points. (The game mirrors them for runs going the other way.)
- The hold is drawn at evening: warm low light, long soft shade, and every brazier, torch and lit doorway glowing orange.
- Any carving is a pattern only (meanders, spirals, double axes, bulls' heads), never letters or numbers.
- The wall stands about 4 steps (96 px) tall: courses of warm sandstone blocks, a coping of green-weathered bronze along its top with
  short bronze spikes, a carved meander band under the coping.
- The OUTER face is the one turned to the viewer's lower left: the meander band and a red cloth banner here and there. The INNER face
  (cell 5) is the back of the same wall: a timber fighting step, a ladder and a torch.

The sheet: 1024 x 1024 px, a 4 x 4 grid of 256 x 256 cells, read left to right, top to bottom. Every piece has a ONE-TILE footprint:
its diamond's centre (the foot point) is at (128, 208) inside its cell. Keep each piece inside its own cell with 8 px to spare.

1. Wall run, outer face, whole: sandstone courses, the bronze coping and spikes, the meander band, a hanging red banner.
2. The same run, battered: chipped and cracked blocks, a bent spike, arrows against it, the banner torn.
3. The same run, broken: knocked down to a jagged stump about 1.5 steps high, blocks and bronze fallen across. Still a barrier.
4. The breach: no wall left. A ramp of tumbled sandstone blocks and earth sloping down to the lower left, as if into a ditch. Walkable.
5. Wall run, inner face, whole: the back of cell 1. A timber fighting step a step and a half up, a torch in a bracket.
6. Corner, south (the corner nearest the viewer): two runs meet at the bottom of the tile, one running up-left and one up-right, both
   showing their OUTER faces, round a square pier topped with a pair of stone bull's horns.
7. Corner, north (the far corner): two runs meet at the top of the tile, going down-left and down-right, both showing their INNER faces,
   round a pier with a brazier on it.
8. Corner, east: a run coming from the upper left meets a run going down to the lower left at the tile's right corner. The first shows
   its inner face and the second its outer face. A pier at the corner.
9. Gate post: a tall square pillar, taller than the wall, painted red at its top and crowned with stone horns, a brazier beside it. It
   ends a run beside a gate.
10. Sally port, one tile wide, whole: a narrow doorway with a bronze-sheathed door set in the run, outer face.
11. The sally port, battered: the bronze dented and split.
12. The sally port, broken: the door torn off and lying on the ground. Passable.
13. Barricade (the canal bridge's fort): a low wall, chest-high (about 2 steps), of piled sandstone blocks, a cart on its side and
    bronze shields, a few spears planted out front. Runs along u.
14. The barricade, broken: scattered blocks and shields, the cart smashed, low enough to step over.
15. Spear pit: a cluster of sharpened stakes and old bronze spears set in the ground, leaning out to the lower left, about 1.5 steps
    high. Fills most of the tile.
16. Stake line: a single row of sharpened stakes across the tile along u, leaning out to the lower left, about 2 steps high.
```

## Prompt 2: LAB-02, the ring's two great gates, in their siege states, and the gate towers' tops

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Labyrinth's: the Heart of the Maze, a sun-baked stone labyrinth at evening: a dark canal crossed by an old stone bridge, a maze of
sandstone walls on the approaches, a ring of bronze-capped walls, great horned altars where the minotaurs' horns are blown, an inner wall
of massive pale stone blocks, and at its heart the Bull Temple, a stepped temple of columns under a colossal pair of bull's horns.
This task paints ONE sheet: the ring's two great gates, in their siege states, and the gate towers' tops.

Rules for this task:
- Branch: art/assault-labyrinth. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/labyrinth/lab-02-gates.png. Change no other file.
- Pull request into main titled "Assault art: the Heart of the Maze". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG). Each piece casts only a small soft contact shadow on its own footprint.

Open these files first and match them:
- docs/samples/assault-art/labyrinth-kit.jpg: the Knights and Nomads kits (Chronos Settlement's isometric kits), labelled. Your pieces
  stand beside these on the map, so match their drawing exactly (the outlines, the shading, the scale of a stone block or a brazier), but
  not their colours: this hold is warm sandstone, bronze and red cloth, never the Knights' blue.
  Above all knights/gatehouse and nomads/banner_gate.
- src/art/camp/camp-wild.png, its middle row: the stone labyrinth as the camp's overlook paints it (its sandstone walls, its braziers, its
  red banners and the horned temple at its heart). Match its look closely.
- src/art/areas/temple/top1.png and src/art/areas/ruins/top1.png: the temple and ruins lands' ground as the game draws them today.
- docs/samples/assault-art/template-buildings-1536.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/labyrinth-kit.jpg > /tmp/labyrinth-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

Style: detailed painted pixel art, drawn exactly like the Knights and Nomads kits. Crisp dark outlines, chunky readable shapes, a
palette of warm sandstone and ochre, pale limestone, weathered bronze, deep red cloth and dark olive scrub, with the orange glow of
braziers at evening as the accent. It must read clearly when shown at a quarter of this size on a phone.

The angle and scale, exactly:
- True 2:1 isometric (dimetric) view, no perspective: a flat square tile on the ground is a diamond exactly twice as wide as it is
  tall, its corners pointing up, right, down and left. Vertical edges stay vertical.
- ONE TILE = a diamond 128 px wide and 64 px tall. ONE HEIGHT STEP = 24 px.
- Light from the upper left: faces turned to the lower left are lit; faces turned to the lower right are in shade.
- The hold is drawn at evening: warm low light, long soft shade, and every brazier, torch and lit doorway glowing orange.
- Any carving is a pattern only (meanders, spirals, double axes, bulls' heads), never letters or numbers.
- The ring's wall is about 4 steps (96 px) tall; a gate's sides stand flush with it and may rise higher (a gate tower).
- The gates run along u (from the upper left down to the lower right, like "\"); the game mirrors them.

The sheet: 1536 x 1024 px, a 3 x 2 grid of 512 x 512 cells, read left to right, top to bottom. The foot point (the centre of the
footprint diamond) is at (256, 416) in every cell. Footprints: cells 1 to 4 are 2 tiles along u by 1 through (a diamond 192 x 96); cells 5 and 6 are 2 x 2 tiles (a diamond 256 x 128). Keep each piece inside its cell with 8 px to spare.

1. The Horned Gate (the south gate), whole, outer face to the lower left: a gateway of great sandstone blocks under a lintel crowned by
   a colossal pair of stone bull's horns, a double door of bronze-sheathed timber, red columns either side, braziers burning.
2. The same Horned Gate, battered: the bronze dented and scorched, a horn chipped, arrows against the doors.
3. The same Horned Gate, broken: the doors torn off and lying flat, the lintel and horns still standing, the passage open and walkable,
   rubble at the sides (not in the passage).
4. The North Gate, whole, INNER face to the lower left (it stands on the ring's far side): the same build seen from inside, with its
   bronze bar across and a torch.
5. The North Gate, broken (inner face): the bar snapped, the doors hanging open, passable.
6. A gate tower's top: what stands on top of a 2 x 2 stone gate tower that the game raises: a flat roof with a stepped parapet, a
   striped red and ochre awning over one corner, a great bronze horn on a stand, a brazier.
```

## Prompt 3: LAB-03, the inner wall's great Bronze Gate, the postern and the corner towers' tops

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Labyrinth's: the Heart of the Maze, a sun-baked stone labyrinth at evening: a dark canal crossed by an old stone bridge, a maze of
sandstone walls on the approaches, a ring of bronze-capped walls, great horned altars where the minotaurs' horns are blown, an inner wall
of massive pale stone blocks, and at its heart the Bull Temple, a stepped temple of columns under a colossal pair of bull's horns.
This task paints ONE sheet: the inner wall's great Bronze Gate, the postern and the corner towers' tops.

Rules for this task:
- Branch: art/assault-labyrinth. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/labyrinth/lab-03-bronze-gate.png. Change no other file.
- Pull request into main titled "Assault art: the Heart of the Maze". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG). Each piece casts only a small soft contact shadow on its own footprint.

Open these files first and match them:
- docs/samples/assault-art/labyrinth-kit.jpg: the Knights and Nomads kits (Chronos Settlement's isometric kits), labelled. Your pieces
  stand beside these on the map, so match their drawing exactly (the outlines, the shading, the scale of a stone block or a brazier), but
  not their colours: this hold is warm sandstone, bronze and red cloth, never the Knights' blue.
  Above all knights/gatehouse and knights/watchtower.
- src/art/camp/camp-wild.png, its middle row: the stone labyrinth as the camp's overlook paints it (its sandstone walls, its braziers, its
  red banners and the horned temple at its heart). Match its look closely.
- src/art/areas/temple/top1.png and src/art/areas/ruins/top1.png: the temple and ruins lands' ground as the game draws them today.
- docs/samples/assault-art/template-buildings-1536.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/labyrinth-kit.jpg > /tmp/labyrinth-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

Style: detailed painted pixel art, drawn exactly like the Knights and Nomads kits. Crisp dark outlines, chunky readable shapes, a
palette of warm sandstone and ochre, pale limestone, weathered bronze, deep red cloth and dark olive scrub, with the orange glow of
braziers at evening as the accent. It must read clearly when shown at a quarter of this size on a phone.

The angle and scale, exactly:
- True 2:1 isometric (dimetric) view, no perspective: a flat square tile on the ground is a diamond exactly twice as wide as it is
  tall, its corners pointing up, right, down and left. Vertical edges stay vertical.
- ONE TILE = a diamond 128 px wide and 64 px tall. ONE HEIGHT STEP = 24 px.
- Light from the upper left: faces turned to the lower left are lit; faces turned to the lower right are in shade.
- The hold is drawn at evening: warm low light, long soft shade, and every brazier, torch and lit doorway glowing orange.
- Any carving is a pattern only (meanders, spirals, double axes, bulls' heads), never letters or numbers.
- The inner wall is a wall of massive pale limestone blocks, fitted without mortar (as the oldest palaces were). It is exactly 6 steps
  (144 px) tall from the ground to its walkway, plus a parapet. The game draws the wall itself; the gates fill gaps in it, so each gate's
  front must be exactly 144 px tall to the walkway line, flush with the wall on either side, and may rise higher above it (a gate tower).
- The gates run along u (from the upper left down to the lower right, like "\"); the game mirrors them. The wall is 2 tiles thick.

The sheet: 1536 x 1024 px, a 3 x 2 grid of 512 x 512 cells, read left to right, top to bottom. The foot point (the centre of the
footprint diamond) is at (256, 416) in every cell. Footprints: cells 1 to 3 are 2 x 2 tiles (a diamond 256 x 128); cells 4 and 5 are 1 tile along the wall by 2 tiles through it (a diamond 192 x 96); cell 6 is 3 x 3 tiles (a diamond 384 x 192). Keep each piece inside its cell with 8 px to spare.

1. The Bronze Gate, whole, seen from OUTSIDE (outer face to the lower left): a gatehouse of massive limestone 6 steps tall with a deep
   passage, a great double gate of bronze worked with a bull's head and meanders, two red columns tapering downward either side, and
   above the walkway a columned lookout with a red-and-ochre roof. The strongest-looking thing on the map.
2. The same Bronze Gate, battered: the bronze dented and blackened, a column cracked, stones chipped round the passage.
3. The same Bronze Gate, broken: the gate torn apart and thrown aside, the passage open and walkable, rubble and bronze at the sides
   (not in the passage), the lookout above cracked but standing.
4. The postern, whole, seen from INSIDE (inner face to the lower left): a low doorway through the 2-thick wall, a bronze-sheathed door, a
   torch. Flush with the wall, 6 steps tall.
5. The postern, broken: the door torn off and lying on the flagstones, the opening walkable.
6. Corner tower top: the top of a limestone tower that the game raises as a 3 x 3 column (draw only what stands on its top): a flat
   roof ringed by a stepped parapet about 1.5 steps high, a big brazier, a red banner on a pole, an awning over one corner, stone horns
   on the corners.
```

## Prompt 4: LAB-04, the flat face textures the game shears onto every cliff, bank and wall

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Labyrinth's: the Heart of the Maze, a sun-baked stone labyrinth at evening: a dark canal crossed by an old stone bridge, a maze of
sandstone walls on the approaches, a ring of bronze-capped walls, great horned altars where the minotaurs' horns are blown, an inner wall
of massive pale stone blocks, and at its heart the Bull Temple, a stepped temple of columns under a colossal pair of bull's horns.
This task paints ONE sheet: the flat face textures the game shears onto every cliff, bank and wall.

Rules for this task:
- Branch: art/assault-labyrinth. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/labyrinth/lab-04-faces.png. Change no other file.
- Pull request into main titled "Assault art: the Heart of the Maze". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered column.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Opaque textures; leave only the unused bottom band of each column (y 480 to 512) transparent. Lip edges may have a transparent
  ragged top (grass, spikes, parapet).

Open these files first and match them:
- docs/samples/assault-art/labyrinth-kit.jpg: the Knights and Nomads kits (Chronos Settlement's isometric kits), labelled. Your pieces
  stand beside these on the map, so match their drawing exactly (the outlines, the shading, the scale of a stone block or a brazier), but
  not their colours: this hold is warm sandstone, bronze and red cloth, never the Knights' blue.
- src/art/camp/camp-wild.png, its middle row: the stone labyrinth as the camp's overlook paints it (its sandstone walls, its braziers, its
  red banners and the horned temple at its heart). Match its look closely.
- src/art/areas/temple/top1.png and src/art/areas/ruins/top1.png: the temple and ruins lands' ground as the game draws them today.
- src/art/areas/temple/side.png and src/art/areas/ruins/side.png: today's tiny side strips, which these replace.
- docs/samples/assault-art/template-faces-1536.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/labyrinth-kit.jpg > /tmp/labyrinth-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

THE VIEW IS STRAIGHT-ON, NOT ISOMETRIC: draw each face as a flat elevation, as if standing square in front of the wall, with no
perspective and no skew. The game skews it. Light from the upper left, evenly across the face (the game adds the shading for which
side it is on). Style: painted pixel art matching the kits' drawing, in this hold's warm sandstone palette, chunky and readable.
Any carving is a pattern only, never letters or numbers.

The sheet: 1536 x 1024 px, 6 columns of 256 px, in two rows of 512 px: twelve columns, numbered left to right along the top row
(1 to 6), then the bottom row (7 to 12). Each column is one face set, 256 px wide (the length of one tile's edge), and must tile
seamlessly LEFT TO RIGHT with itself. Inside each column, from its top:
- the LIP, y 0 to 80 (one height step): the face's top edge, what overhangs or crowns it;
- the BODY, y 80 to 400 (four steps of 80 px): the face itself; it must tile seamlessly UP AND DOWN and left to right, because the
  game repeats it for walls of any height;
- the FOOT, y 400 to 480 (one step): where the face meets the ground;
- y 480 to 512: empty.
The lip's bottom must flow into the body's top, and the body's bottom into the foot's top, with no seam.

1. Ochre earth bank: dry ochre earth with stones and a few roots; lip: dry grass and thyme; foot: scree.
2. Terraced earth: earth held in rough dry-stone terraces; lip: olive scrub; foot: dust.
3. Ditch bank: dry cracked clay, old stakes in it; lip: trampled edge; foot: a dark damp line.
4. Earth rampart faced with stone: packed earth behind a facing of rough blocks; lip: the earth top with stakes; foot: rubble.
5. Ring wall skin: courses of warm sandstone blocks with a carved meander band; lip: the bronze coping and spikes (ragged, transparent
   between the spikes); foot: blocks bedded in earth.
6. Inner wall: massive pale limestone blocks fitted without mortar; lip: a stepped parapet (ragged, transparent between); foot: a
   plinth course.
7. The same inner wall, battle-damaged: cracked and missing blocks, soot; lip: broken parapet; foot: fallen stone.
8. Corner tower masonry: smaller dressed limestone, an arrow slit in the body's middle, a red-painted band; lip: a stone ledge; foot:
   a sloped plinth.
9. Temple terrace wall: smooth dressed blocks with a frieze of running spirals; lip: a flagstone edge; foot: flagstones.
10. Sandstone cliff: layered red-ochre rock with ledges; lip: scrub overhanging; foot: scree.
11. Canal wall: dark wet dressed stone with a pale waterline and green weed low down; lip: a stone kerb; foot: wet stone.
12. Maze wall skin: plain plastered sandstone, faded red and ochre bands, cracks; lip: a flat coping with a few weeds; foot: dust.
```

## Prompt 5: LAB-05, sixteen seamless ground textures, from the dry hills to the temple floors

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Labyrinth's: the Heart of the Maze, a sun-baked stone labyrinth at evening: a dark canal crossed by an old stone bridge, a maze of
sandstone walls on the approaches, a ring of bronze-capped walls, great horned altars where the minotaurs' horns are blown, an inner wall
of massive pale stone blocks, and at its heart the Bull Temple, a stepped temple of columns under a colossal pair of bull's horns.
This task paints ONE sheet: sixteen seamless ground textures, from the dry hills to the temple floors.

Rules for this task:
- Branch: art/assault-labyrinth. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/labyrinth/lab-05-ground.png. Change no other file.
- Pull request into main titled "Assault art: the Heart of the Maze". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Opaque image.

Open these files first and match them:
- src/art/areas/temple/top1.png, src/art/areas/temple/top2.png and src/art/areas/ruins/top1.png: today's 64 px tops, which these replace
  (keep their pixel density: 64 px a tile).
- docs/samples/assault-art/labyrinth-kit.jpg: the kits' knights/cobble_tile, knights/dirt_tile, nomads/dry_grass_tile, nomads/dust_tile
  and nomads/path_tile give the drawing to match.
- src/art/camp/camp-wild.png, its middle row: the stone labyrinth as the overlook paints it.
- docs/samples/assault-art/template-textures-1024.png: the grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/labyrinth-kit.jpg > /tmp/labyrinth-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

THE VIEW IS STRAIGHT DOWN, NOT ISOMETRIC: draw each texture as seen from directly above, like a map, with no perspective, no horizon
and no cast shadows longer than a pebble's. Style: painted pixel art matching the kits' ground tiles; readable, not noisy; no single
feature so striking that its repeat would be noticed.

The sheet: 1024 x 1024 px, a 4 x 4 grid of 256 x 256 squares, read left to right, top to bottom. EACH SQUARE IS ONE TEXTURE COVERING
4 x 4 TILES, AND MUST TILE SEAMLESSLY WITH ITSELF ON ALL FOUR SIDES (its left edge continues its right edge, its top its bottom).
Keep the squares separate: nothing crosses from one square into the next.

1. Dry grass: sun-bleached golden grass with darker tufts and small stones.
2. Dry grass, second variant: the same, with thyme and small purple flowers.
3. Scrub: low olive-green scrub and grey rocks, for the hills' wild rear.
4. Trampled ground: worn dry grass with bare earth and hoofprints, round the posts.
5. Ochre earth: dry red-ochre earth, hoofprinted.
6. Ochre earth, second variant: the same, with pebbles and dried olive leaves.
7. Dried clay: cracked dry clay with ruts, for the lanes and the ditch floor.
8. Scorched earth: blackened earth and ash.
9. Ash: grey ash with a few embers.
10. Packed sand: pale packed sand and grit, for the yards between the maze walls.
11. Cobbles: rounded sandstone cobbles.
12. Temple flagstones: big pale limestone flags, worn, with a faint meander border pattern here and there (not repeating noticeably).
13. Wall-walk planks: heavy timber planks seen from above, running from the top of the square to the bottom.
14. Bridge stones: big dressed bridge-deck stones.
15. Canal shingle: wet pebbles and grit at the water's edge.
16. Shallow canal water over stone: still green-blue water over dressed stone, a few leaves floating.
```

## Prompt 6: LAB-06, the overlays the game lays where two grounds meet

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Labyrinth's: the Heart of the Maze, a sun-baked stone labyrinth at evening: a dark canal crossed by an old stone bridge, a maze of
sandstone walls on the approaches, a ring of bronze-capped walls, great horned altars where the minotaurs' horns are blown, an inner wall
of massive pale stone blocks, and at its heart the Bull Temple, a stepped temple of columns under a colossal pair of bull's horns.
This task paints ONE sheet: the overlays the game lays where two grounds meet.

Rules for this task:
- Branch: art/assault-labyrinth. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/labyrinth/lab-06-transitions.png. Change no other file.
- Pull request into main titled "Assault art: the Heart of the Maze". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG): each overlay is the material only, and everything else is transparent.

Open these files first and match them:
- art-source/assault/labyrinth/lab-05-ground.png on this branch, if it is there: the ground textures these overlays must match exactly in
  colour and pixel density. If it is not there yet, match the descriptions below and src/art/areas/temple/top1.png.
- docs/samples/assault-art/template-textures-1024.png: the grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/labyrinth-kit.jpg > /tmp/labyrinth-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

Where two grounds meet (sand beside grass, a path's edge), the game lays an overlay along the shared edge so the join is ragged and
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

1. Dried clay spreading onto grass: edge.        2. The same: outer corner.
3. Scorched earth and ash: edge.                 4. The same: outer corner.
5. Cobbles meeting grass: edge.                  6. The same: outer corner.
7. A trodden path's edge over dry grass: edge.   8. The same: outer corner.
9. Canal shingle onto grass: edge.               10. The same: outer corner.
11. Flagstones sinking into sand: edge.          12. The same: outer corner.
13. Dry grass creeping onto earth: edge.         14. The same: outer corner.
15. The water's edge: a thin rim of wet dark stone and a little weed, laid on the water side of a bank: edge.
16. The same: outer corner.
```

## Prompt 7: LAB-07, the Bull Temple, the champion's throne and the great banner

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Labyrinth's: the Heart of the Maze, a sun-baked stone labyrinth at evening: a dark canal crossed by an old stone bridge, a maze of
sandstone walls on the approaches, a ring of bronze-capped walls, great horned altars where the minotaurs' horns are blown, an inner wall
of massive pale stone blocks, and at its heart the Bull Temple, a stepped temple of columns under a colossal pair of bull's horns.
This task paints ONE sheet: the Bull Temple, the champion's throne and the great banner.

Rules for this task:
- Branch: art/assault-labyrinth. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/labyrinth/lab-07-keep.png. Change no other file.
- Pull request into main titled "Assault art: the Heart of the Maze". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG). Each piece casts only a small soft contact shadow on its own footprint.

Open these files first and match them:
- docs/samples/assault-art/labyrinth-kit.jpg: the Knights and Nomads kits (Chronos Settlement's isometric kits), labelled. Your pieces
  stand beside these on the map, so match their drawing exactly (the outlines, the shading, the scale of a stone block or a brazier), but
  not their colours: this hold is warm sandstone, bronze and red cloth, never the Knights' blue.
  Above all knights/chapel and knights/gatehouse, for the drawing; the overlook's horned temple, for the look.
- src/art/camp/camp-wild.png, its middle row: the stone labyrinth as the camp's overlook paints it (its sandstone walls, its braziers, its
  red banners and the horned temple at its heart). Match its look closely.
- src/art/areas/temple/top1.png and src/art/areas/ruins/top1.png: the temple and ruins lands' ground as the game draws them today.
- docs/samples/assault-art/template-keep-1536.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/labyrinth-kit.jpg > /tmp/labyrinth-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

Style: detailed painted pixel art, drawn exactly like the Knights and Nomads kits. Crisp dark outlines, chunky readable shapes, a
palette of warm sandstone and ochre, pale limestone, weathered bronze, deep red cloth and dark olive scrub, with the orange glow of
braziers at evening as the accent. It must read clearly when shown at a quarter of this size on a phone.

The angle and scale, exactly:
- True 2:1 isometric (dimetric) view, no perspective: a flat square tile on the ground is a diamond exactly twice as wide as it is
  tall, its corners pointing up, right, down and left. Vertical edges stay vertical.
- ONE TILE = a diamond 128 px wide and 64 px tall. ONE HEIGHT STEP = 24 px.
- Light from the upper left: faces turned to the lower left are lit; faces turned to the lower right are in shade.
- The hold is drawn at evening: warm low light, long soft shade, and every brazier, torch and lit doorway glowing orange.
- Any carving is a pattern only (meanders, spirals, double axes, bulls' heads), never letters or numbers.
- A doorway is about 4 steps (96 px) tall.

The sheet: 1536 x 1024 px. Three cells:
1. Cell 1, x 0 to 1024, y 0 to 1024: THE BULL TEMPLE. Footprint 6 tiles along u (upper left to lower right) by 4 tiles along v: a
   diamond 640 px wide and 320 px tall, centred on the foot point (512, 840). It may rise up to about 640 px above its foot.
   A stepped temple-palace of pale limestone on a broad stair, rows of red columns tapering downward, a deep dark doorway facing the
   lower left glowing orange within, red and ochre painted friezes of bulls and spirals, red banners hung between the columns, braziers
   on the steps, and on its roof a colossal pair of stone bull's horns rising against the sky. Grander than anything else on the map.
2. Cell 2, x 1024 to 1536, y 0 to 512: THE CHAMPION'S THRONE. One-tile footprint (a diamond 128 x 64) centred on the foot point
   (256, 440) in the cell. A massive stone seat with a high back carved as a bull's head and horns about 6 steps tall, a red cloth over
   it, two braziers on the two-step dais. Facing the lower left.
3. Cell 3, x 1024 to 1536, y 512 to 1024: THE GREAT BANNER. One-tile footprint centred on (256, 440) in the cell. A tall pole (about
   14 steps) in a stone base, a crossbar hung with a long red banner painted with a black bull's head, tattered at the bottom, a bronze
   double axe on top of the pole.
```

## Prompt 8: LAB-08, the inner wall's dressing, the stairs and small structures

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Labyrinth's: the Heart of the Maze, a sun-baked stone labyrinth at evening: a dark canal crossed by an old stone bridge, a maze of
sandstone walls on the approaches, a ring of bronze-capped walls, great horned altars where the minotaurs' horns are blown, an inner wall
of massive pale stone blocks, and at its heart the Bull Temple, a stepped temple of columns under a colossal pair of bull's horns.
This task paints ONE sheet: the inner wall's dressing, the stairs and small structures.

Rules for this task:
- Branch: art/assault-labyrinth. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/labyrinth/lab-08-wall-dressing.png. Change no other file.
- Pull request into main titled "Assault art: the Heart of the Maze". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG). Each piece casts only a small soft contact shadow on its own footprint.

Open these files first and match them:
- docs/samples/assault-art/labyrinth-kit.jpg: the Knights and Nomads kits (Chronos Settlement's isometric kits), labelled. Your pieces
  stand beside these on the map, so match their drawing exactly (the outlines, the shading, the scale of a stone block or a brazier), but
  not their colours: this hold is warm sandstone, bronze and red cloth, never the Knights' blue.
  Above all knights/lamp_post, nomads/tassel_lantern and nomads/standard.
- src/art/camp/camp-wild.png, its middle row: the stone labyrinth as the camp's overlook paints it (its sandstone walls, its braziers, its
  red banners and the horned temple at its heart). Match its look closely.
- src/art/areas/temple/top1.png and src/art/areas/ruins/top1.png: the temple and ruins lands' ground as the game draws them today.
- docs/samples/assault-art/template-props-1024.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/labyrinth-kit.jpg > /tmp/labyrinth-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

Style: detailed painted pixel art, drawn exactly like the Knights and Nomads kits. Crisp dark outlines, chunky readable shapes, a
palette of warm sandstone and ochre, pale limestone, weathered bronze, deep red cloth and dark olive scrub, with the orange glow of
braziers at evening as the accent. It must read clearly when shown at a quarter of this size on a phone.

The angle and scale, exactly:
- True 2:1 isometric (dimetric) view, no perspective: a flat square tile on the ground is a diamond exactly twice as wide as it is
  tall, its corners pointing up, right, down and left. Vertical edges stay vertical.
- ONE TILE = a diamond 128 px wide and 64 px tall. ONE HEIGHT STEP = 24 px.
- Light from the upper left: faces turned to the lower left are lit; faces turned to the lower right are in shade.
- The hold is drawn at evening: warm low light, long soft shade, and every brazier, torch and lit doorway glowing orange.
- Any carving is a pattern only (meanders, spirals, double axes, bulls' heads), never letters or numbers.
- The inner wall's walkway is 6 steps up; these pieces stand on it or against it.

The sheet: 1024 x 1024 px, a 4 x 4 grid of 256 x 256 cells, read left to right, top to bottom. Every piece has a ONE-TILE footprint:
its diamond's centre (the foot point) is at (128, 208) inside its cell. Keep each piece inside its own cell with 8 px to spare.

1. Stepped merlon: one stone merlon with a stepped top, for the wall's outer edge, along u.
2. The same merlon, broken: knocked off, lying on the walk.
3. Inner rail: a low stone kerb along the walk's inner edge, along u.
4. Wall brazier: a bronze tripod brazier of fire, for the walk (about 2 steps tall).
5. Wall torch: a torch in a bronze bracket.
6. A small hanging banner: a red cloth on a short pole.
7. Archer's awning: a striped red and ochre awning over a gap in the parapet.
8. A rack of spears and bronze shields against the kerb.
9. Stairs up the wall, along u: stone steps rising 6 steps (144 px) from the ground at the lower left to the walk. One tile.
10. Stairs down, the same steps seen descending to the lower right (the game uses it where a stair goes down into a pit).
11. A timber ladder against a wall to the upper right, about 6 steps tall.
12. A cauldron of boiling oil on the walk over a fire.
13. Tall clay storage jars, a few broken.
14. A great bronze horn on a stand.
15. A pile of sling stones and a heap of spears.
16. A fallen red banner and a bronze helmet on the stones.
```

## Prompt 9: LAB-09, the horned altars (the hold's war drums) and its great landmarks

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Labyrinth's: the Heart of the Maze, a sun-baked stone labyrinth at evening: a dark canal crossed by an old stone bridge, a maze of
sandstone walls on the approaches, a ring of bronze-capped walls, great horned altars where the minotaurs' horns are blown, an inner wall
of massive pale stone blocks, and at its heart the Bull Temple, a stepped temple of columns under a colossal pair of bull's horns.
This task paints ONE sheet: the horned altars (the hold's war drums) and its great landmarks.

Rules for this task:
- Branch: art/assault-labyrinth. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/labyrinth/lab-09-landmarks.png. Change no other file.
- Pull request into main titled "Assault art: the Heart of the Maze". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG). Each piece casts only a small soft contact shadow on its own footprint.

Open these files first and match them:
- docs/samples/assault-art/labyrinth-kit.jpg: the Knights and Nomads kits (Chronos Settlement's isometric kits), labelled. Your pieces
  stand beside these on the map, so match their drawing exactly (the outlines, the shading, the scale of a stone block or a brazier), but
  not their colours: this hold is warm sandstone, bronze and red cloth, never the Knights' blue.
  Above all nomads/shrine and knights/well.
- src/art/camp/camp-wild.png, its middle row: the stone labyrinth as the camp's overlook paints it (its sandstone walls, its braziers, its
  red banners and the horned temple at its heart). Match its look closely.
- src/art/areas/temple/top1.png and src/art/areas/ruins/top1.png: the temple and ruins lands' ground as the game draws them today.
- docs/samples/assault-art/template-buildings-1536.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/labyrinth-kit.jpg > /tmp/labyrinth-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

Style: detailed painted pixel art, drawn exactly like the Knights and Nomads kits. Crisp dark outlines, chunky readable shapes, a
palette of warm sandstone and ochre, pale limestone, weathered bronze, deep red cloth and dark olive scrub, with the orange glow of
braziers at evening as the accent. It must read clearly when shown at a quarter of this size on a phone.

The angle and scale, exactly:
- True 2:1 isometric (dimetric) view, no perspective: a flat square tile on the ground is a diamond exactly twice as wide as it is
  tall, its corners pointing up, right, down and left. Vertical edges stay vertical.
- ONE TILE = a diamond 128 px wide and 64 px tall. ONE HEIGHT STEP = 24 px.
- Light from the upper left: faces turned to the lower left are lit; faces turned to the lower right are in shade.
- The hold is drawn at evening: warm low light, long soft shade, and every brazier, torch and lit doorway glowing orange.
- Any carving is a pattern only (meanders, spirals, double axes, bulls' heads), never letters or numbers.
- The horned altars play the part the orc hold's war drums do: while the great horn on one is blown, the garrison near it fights harder,
  until our troops reach it and break it.

The sheet: 1536 x 1024 px, a 3 x 2 grid of 512 x 512 cells, read left to right, top to bottom. The foot point (the centre of the
footprint diamond) is at (256, 416) in every cell. Footprints: cells 1 to 4 are 2 x 2 tiles (a diamond 256 x 128); cells 5 and 6 are 3 x 3 tiles (a diamond 384 x 192). Keep each piece inside its cell with 8 px to spare.

1. A horned altar, sounding: a stepped stone altar crowned with great stone bull's horns, a huge curled bronze horn on a stand before
   it, at the instant it is blown: orange rings of sound bursting from its mouth, the braziers either side flaring, dust shaken up.
2. The same horned altar, broken: after our troops reached it: the horns snapped off and fallen, the bronze horn crushed, the braziers
   out and smoking.
3. The bull ring: a small sand arena ringed by a low wall, a post in the middle, hoof-churned sand.
4. A sacred spring: a square stone basin of clear water under a columned canopy, offerings round it.
5. The double-axe shrine: a stone platform with two tall bronze double axes on poles, an altar between them, painted red.
6. The fallen colossus: the huge broken stone head and horns of a toppled bull statue lying on the ground, olive scrub round it.
```

## Prompt 10: LAB-10, the labyrinth's small props the kits do not have

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Labyrinth's: the Heart of the Maze, a sun-baked stone labyrinth at evening: a dark canal crossed by an old stone bridge, a maze of
sandstone walls on the approaches, a ring of bronze-capped walls, great horned altars where the minotaurs' horns are blown, an inner wall
of massive pale stone blocks, and at its heart the Bull Temple, a stepped temple of columns under a colossal pair of bull's horns.
This task paints ONE sheet: the labyrinth's small props the kits do not have.

Rules for this task:
- Branch: art/assault-labyrinth. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/labyrinth/lab-10-props.png. Change no other file.
- Pull request into main titled "Assault art: the Heart of the Maze". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG). Each piece casts only a small soft contact shadow on its own footprint.

Open these files first and match them:
- docs/samples/assault-art/labyrinth-kit.jpg: the Knights and Nomads kits (Chronos Settlement's isometric kits), labelled. Your pieces
  stand beside these on the map, so match their drawing exactly (the outlines, the shading, the scale of a stone block or a brazier), but
  not their colours: this hold is warm sandstone, bronze and red cloth, never the Knights' blue.
  The kits already give the barrels, the carts, the crates, the hay bales, the lamp posts, the market stalls, the rocks, the standards,
  the tassel lanterns, the water skins and the wells: do not paint those again. These props go with them.
- src/art/camp/camp-wild.png, its middle row: the stone labyrinth as the camp's overlook paints it (its sandstone walls, its braziers, its
  red banners and the horned temple at its heart). Match its look closely.
- src/art/areas/temple/top1.png and src/art/areas/ruins/top1.png: the temple and ruins lands' ground as the game draws them today.
- docs/samples/assault-art/template-props-1024.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/labyrinth-kit.jpg > /tmp/labyrinth-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

Style: detailed painted pixel art, drawn exactly like the Knights and Nomads kits. Crisp dark outlines, chunky readable shapes, a
palette of warm sandstone and ochre, pale limestone, weathered bronze, deep red cloth and dark olive scrub, with the orange glow of
braziers at evening as the accent. It must read clearly when shown at a quarter of this size on a phone.

The angle and scale, exactly:
- True 2:1 isometric (dimetric) view, no perspective: a flat square tile on the ground is a diamond exactly twice as wide as it is
  tall, its corners pointing up, right, down and left. Vertical edges stay vertical.
- ONE TILE = a diamond 128 px wide and 64 px tall. ONE HEIGHT STEP = 24 px.
- Light from the upper left: faces turned to the lower left are lit; faces turned to the lower right are in shade.
- The hold is drawn at evening: warm low light, long soft shade, and every brazier, torch and lit doorway glowing orange.
- Any carving is a pattern only (meanders, spirals, double axes, bulls' heads), never letters or numbers.

The sheet: 1024 x 1024 px, a 4 x 4 grid of 256 x 256 cells, read left to right, top to bottom. Every piece has a ONE-TILE footprint:
its diamond's centre (the foot point) is at (128, 208) inside its cell. Keep each piece inside its own cell with 8 px to spare.

1. A row of tall clay jars (pithoi).
2. An olive tree, gnarled.
3. A cypress tree, tall and dark.
4. A broken column lying on the ground.
5. A standing column with a red capital.
6. A bronze tripod brazier, lit.
7. A stone bull's head on a plinth.
8. A heap of horns and bones.
9. A weapon rack of bronze swords and figure-of-eight shields.
10. A cage of bronze bars holding a snorting bull.
11. A cooking fire with an amphora.
12. A loom with red cloth.
13. A clump of thyme and rock roses.
14. A thorny scrub bush.
15. A small stone stele carved with a spiral.
16. A fallen spear and a horned helmet in the dust.
```

## Prompt 11: LAB-11, ruins, and the burnt states of the herders' camp

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Labyrinth's: the Heart of the Maze, a sun-baked stone labyrinth at evening: a dark canal crossed by an old stone bridge, a maze of
sandstone walls on the approaches, a ring of bronze-capped walls, great horned altars where the minotaurs' horns are blown, an inner wall
of massive pale stone blocks, and at its heart the Bull Temple, a stepped temple of columns under a colossal pair of bull's horns.
This task paints ONE sheet: ruins, and the burnt states of the herders' camp.

Rules for this task:
- Branch: art/assault-labyrinth. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/labyrinth/lab-11-ruins.png. Change no other file.
- Pull request into main titled "Assault art: the Heart of the Maze". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG). Each piece casts only a small soft contact shadow on its own footprint.

Open these files first and match them:
- docs/samples/assault-art/labyrinth-kit.jpg: the Knights and Nomads kits (Chronos Settlement's isometric kits), labelled. Your pieces
  stand beside these on the map, so match their drawing exactly (the outlines, the shading, the scale of a stone block or a brazier), but
  not their colours: this hold is warm sandstone, bronze and red cloth, never the Knights' blue.
- src/art/camp/camp-wild.png, its middle row: the stone labyrinth as the camp's overlook paints it (its sandstone walls, its braziers, its
  red banners and the horned temple at its heart). Match its look closely.
- src/art/areas/temple/top1.png and src/art/areas/ruins/top1.png: the temple and ruins lands' ground as the game draws them today.
- docs/samples/assault-art/template-buildings-1536.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/labyrinth-kit.jpg > /tmp/labyrinth-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

Style: detailed painted pixel art, drawn exactly like the Knights and Nomads kits. Crisp dark outlines, chunky readable shapes, a
palette of warm sandstone and ochre, pale limestone, weathered bronze, deep red cloth and dark olive scrub, with the orange glow of
braziers at evening as the accent. It must read clearly when shown at a quarter of this size on a phone.

The angle and scale, exactly:
- True 2:1 isometric (dimetric) view, no perspective: a flat square tile on the ground is a diamond exactly twice as wide as it is
  tall, its corners pointing up, right, down and left. Vertical edges stay vertical.
- ONE TILE = a diamond 128 px wide and 64 px tall. ONE HEIGHT STEP = 24 px.
- Light from the upper left: faces turned to the lower left are lit; faces turned to the lower right are in shade.
- Our own siege works (the ladders, the ram, the trebuchet) are already painted on the Orc hold's sheets and serve every hold: do not
  paint them. The Warpath's reserve camp here is the herders' camp on the hill road: its tents burn when our archers loose fire arrows.
- The hold is drawn at evening: warm low light, long soft shade, and every brazier, torch and lit doorway glowing orange.
- Any carving is a pattern only (meanders, spirals, double axes, bulls' heads), never letters or numbers.

The sheet: 1536 x 1024 px, a 3 x 2 grid of 512 x 512 cells, read left to right, top to bottom. The foot point (the centre of the
footprint diamond) is at (256, 416) in every cell. Footprints: cells 1 and 2 are 2 tiles along u by 1 (a diamond 192 x 96); cells 3 to 6 are 2 x 2 tiles (a diamond 256 x 128). Keep each piece inside its cell with 8 px to spare.

1. A herders' tent: a long tent of striped red and ochre cloth over poles, a jar by the flap.
2. The same tent, burnt: a black heap of charred poles and cloth, ash, a few embers.
3. A great pavilion: a square canopy of red cloth on four poles, rugs and jars under it.
4. The same pavilion, burnt: its poles standing charred, the cloth gone to ash.
5. A ruined old palace room: the stone footings, a broken stair and two fallen columns, a faded fresco on a fragment of wall (shapes
   only).
6. A collapsed watchtower: a toppled stone tower lying in rubble.
```

## Prompt 12: LAB-12, the canal, its stone bridge, fords and banks

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Labyrinth's: the Heart of the Maze, a sun-baked stone labyrinth at evening: a dark canal crossed by an old stone bridge, a maze of
sandstone walls on the approaches, a ring of bronze-capped walls, great horned altars where the minotaurs' horns are blown, an inner wall
of massive pale stone blocks, and at its heart the Bull Temple, a stepped temple of columns under a colossal pair of bull's horns.
This task paints ONE sheet: the canal, its stone bridge, fords and banks.

Rules for this task:
- Branch: art/assault-labyrinth. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/labyrinth/lab-12-canal.png. Change no other file.
- Pull request into main titled "Assault art: the Heart of the Maze". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG). Each piece casts only a small soft contact shadow on its own footprint.

Open these files first and match them:
- docs/samples/assault-art/labyrinth-kit.jpg: the Knights and Nomads kits (Chronos Settlement's isometric kits), labelled. Your pieces
  stand beside these on the map, so match their drawing exactly (the outlines, the shading, the scale of a stone block or a brazier), but
  not their colours: this hold is warm sandstone, bronze and red cloth, never the Knights' blue.
  Above all knights/stone_bridge: the bridge here is its style, in sandstone.
- src/art/camp/camp-wild.png, its middle row: the stone labyrinth as the camp's overlook paints it (its sandstone walls, its braziers, its
  red banners and the horned temple at its heart). Match its look closely.
- src/art/areas/temple/top1.png and src/art/areas/ruins/top1.png: the temple and ruins lands' ground as the game draws them today.
- docs/samples/assault-art/template-props-1024.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/labyrinth-kit.jpg > /tmp/labyrinth-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

Style: detailed painted pixel art, drawn exactly like the Knights and Nomads kits. Crisp dark outlines, chunky readable shapes, a
palette of warm sandstone and ochre, pale limestone, weathered bronze, deep red cloth and dark olive scrub, with the orange glow of
braziers at evening as the accent. It must read clearly when shown at a quarter of this size on a phone.

The angle and scale, exactly:
- True 2:1 isometric (dimetric) view, no perspective: a flat square tile on the ground is a diamond exactly twice as wide as it is
  tall, its corners pointing up, right, down and left. Vertical edges stay vertical.
- ONE TILE = a diamond 128 px wide and 64 px tall. ONE HEIGHT STEP = 24 px.
- Light from the upper left: faces turned to the lower left are lit; faces turned to the lower right are in shade.
- The Heart of the Maze has a dark stone-lined canal where the Orc hold has its river. The game draws the water as ground; these pieces
  stand in it or on its banks.
- "Along u" means running from the upper left down to the lower right (like "\"). Every run on this sheet runs along u, passing
  through its tile from the midpoint of the diamond's upper-left edge to the midpoint of its lower-right edge, so that pieces placed on
  neighbouring tiles join seamlessly at those points. (The game mirrors them for runs going the other way.)
- The hold is drawn at evening: warm low light, long soft shade, and every brazier, torch and lit doorway glowing orange.
- Any carving is a pattern only (meanders, spirals, double axes, bulls' heads), never letters or numbers.

The sheet: 1024 x 1024 px, a 4 x 4 grid of 256 x 256 cells, read left to right, top to bottom. Every piece has a ONE-TILE footprint:
its diamond's centre (the foot point) is at (128, 208) inside its cell. Keep each piece inside its own cell with 8 px to spare.

1. Stone bridge deck, whole: a sandstone arch deck crossing along u, a low parapet each side.
2. The bridge, broken: a gap of fallen blocks. Impassable.
3. The bridge's end, where it meets the bank at the upper left, with a horned pier.
4. A bridge pier: a square pier with a brazier.
5. Ford stones: a line of flat stepping stones along u, their tops showing above the water.
6. Reeds standing in the shallows.
7. A sunken column lying across the water.
8. Water lilies.
9. Wet dark blocks at the water's edge.
10. A mooring post with a rope.
11. A small reed boat, beached.
12. Evening mist over the water (semi-transparent).
13. A sunken stone bull's head, half out of the water.
14. A floating garland of flowers (an offering).
15. A water jar left on the steps.
16. Stone steps going down into the water from the bank at the upper left.
```

## Prompt 13: LAB-13, sixteen ground decals

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Labyrinth's: the Heart of the Maze, a sun-baked stone labyrinth at evening: a dark canal crossed by an old stone bridge, a maze of
sandstone walls on the approaches, a ring of bronze-capped walls, great horned altars where the minotaurs' horns are blown, an inner wall
of massive pale stone blocks, and at its heart the Bull Temple, a stepped temple of columns under a colossal pair of bull's horns.
This task paints ONE sheet: sixteen ground decals.

Rules for this task:
- Branch: art/assault-labyrinth. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/labyrinth/lab-13-decals.png. Change no other file.
- Pull request into main titled "Assault art: the Heart of the Maze". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG).

Open these files first and match them:
- art-source/assault/labyrinth/lab-05-ground.png on this branch, if it is there: the ground these lie on (match its pixel density, 64 px
  a tile at quarter size). Otherwise src/art/areas/temple/top1.png.
- docs/samples/assault-art/template-textures-1024.png: the grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/labyrinth-kit.jpg > /tmp/labyrinth-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

THE VIEW IS STRAIGHT DOWN, NOT ISOMETRIC, as on a map: everything lies flat on the ground, nothing stands up. Style: painted pixel
art matching the kits' ground; readable; blood is a dark red-brown, never bright or gory.

The sheet: 1024 x 1024 px, a 4 x 4 grid of 256 x 256 squares, read left to right, top to bottom. Each square holds ONE decal covering
up to 2 x 2 tiles, centred, with at least 16 px of transparency round it.

1. Blood spatter.   2. A spilt amphora of wine (a dark red stain, sherds).   3. A gorgon's mark: a ring of grey stone dust (a petrified
   patch).
4. Scorch mark, round (a blast).   5. Ash and embers.
6. Stone rubble scatter.   7. Timber debris (splinters, a broken spear shaft).
8. Cart ruts: two parallel wheel tracks running straight from the square's top edge to its bottom edge (so they join end to end).
9. Cloven hoofprints: a trail of big bull's hoofprints crossing the square.   10. Charge marks: deep gouges where a bull dug in.
11. A puddle of water.   12. Scattered dried olive leaves.
13. Scattered bones.   14. Broken pottery sherds.
15. A thread of red yarn laid along the ground in a winding line (the way through the maze).   16. Cracked flagstones (cracks and a
    few broken corners, to lay over a stone floor).
```

## Prompt 14: LAB-14, the maze walls of the approaches

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Labyrinth's: the Heart of the Maze, a sun-baked stone labyrinth at evening: a dark canal crossed by an old stone bridge, a maze of
sandstone walls on the approaches, a ring of bronze-capped walls, great horned altars where the minotaurs' horns are blown, an inner wall
of massive pale stone blocks, and at its heart the Bull Temple, a stepped temple of columns under a colossal pair of bull's horns.
This task paints ONE sheet: the maze walls of the approaches.

Rules for this task:
- Branch: art/assault-labyrinth. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/labyrinth/lab-14-maze-walls.png. Change no other file.
- Pull request into main titled "Assault art: the Heart of the Maze". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG). Each piece casts only a small soft contact shadow on its own footprint.

Open these files first and match them:
- docs/samples/assault-art/labyrinth-kit.jpg: the Knights and Nomads kits (Chronos Settlement's isometric kits), labelled. Your pieces
  stand beside these on the map, so match their drawing exactly (the outlines, the shading, the scale of a stone block or a brazier), but
  not their colours: this hold is warm sandstone, bronze and red cloth, never the Knights' blue.
  Above all knights/stone_wall_run and knights/stone_wall_corner, for the drawing.
- src/art/camp/camp-wild.png, its middle row: the stone labyrinth as the camp's overlook paints it (its sandstone walls, its braziers, its
  red banners and the horned temple at its heart). Match its look closely.
- src/art/areas/temple/top1.png and src/art/areas/ruins/top1.png: the temple and ruins lands' ground as the game draws them today.
- docs/samples/assault-art/template-props-1024.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/labyrinth-kit.jpg > /tmp/labyrinth-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

Style: detailed painted pixel art, drawn exactly like the Knights and Nomads kits. Crisp dark outlines, chunky readable shapes, a
palette of warm sandstone and ochre, pale limestone, weathered bronze, deep red cloth and dark olive scrub, with the orange glow of
braziers at evening as the accent. It must read clearly when shown at a quarter of this size on a phone.

The angle and scale, exactly:
- True 2:1 isometric (dimetric) view, no perspective: a flat square tile on the ground is a diamond exactly twice as wide as it is
  tall, its corners pointing up, right, down and left. Vertical edges stay vertical.
- ONE TILE = a diamond 128 px wide and 64 px tall. ONE HEIGHT STEP = 24 px.
- Light from the upper left: faces turned to the lower left are lit; faces turned to the lower right are in shade.
- This sheet has no Orc twin: the Heart of the Maze alone has a maze on its approaches, between the canal and the ring. Its walls are
  built tile by tile (the game lays one piece a tile along each wall), so every run must join its neighbours seamlessly.
- "Along u" means running from the upper left down to the lower right (like "\"). Every run on this sheet runs along u, passing
  through its tile from the midpoint of the diamond's upper-left edge to the midpoint of its lower-right edge, so that pieces placed on
  neighbouring tiles join seamlessly at those points. (The game mirrors them for runs going the other way.)
- The hold is drawn at evening: warm low light, long soft shade, and every brazier, torch and lit doorway glowing orange.
- Any carving is a pattern only (meanders, spirals, double axes, bulls' heads), never letters or numbers.
- A maze wall is about 3 steps (72 px) tall and thin (it fills a strip through the tile's middle, not the whole diamond): plain
  plastered sandstone with faded red and ochre bands, a flat coping with weeds on it.

The sheet: 1024 x 1024 px, a 4 x 4 grid of 256 x 256 cells, read left to right, top to bottom. Every piece has a ONE-TILE footprint:
its diamond's centre (the foot point) is at (128, 208) inside its cell. Keep each piece inside its own cell with 8 px to spare.

1. Maze wall run, whole.
2. The same run, cracked and weathered, plaster fallen in patches.
3. The same run with a red banner hung on it.
4. The same run with a torch in a bracket.
5. Corner: a run from the upper left turning to run down to the lower left (a right-angle corner).
6. Corner: a run from the upper right turning to run down to the lower right.
7. T-junction: a run along u with a branch going up to the upper right.
8. End: a run ending in a square pier with a brazier on it.
9. The run, broken: knocked down to a stump about 1 step high, blocks fallen. Still in the way.
10. A gap: two pier ends facing each other across the tile, the middle open (a doorway in the maze). Walkable through the middle.
11. A dead end's shrine: a run with a small niche holding a clay figure and a lamp.
12. A run overgrown with a creeping caper plant.
13. A run with a painted bull fresco (shapes only), faded.
14. A run with a bronze grille window.
15. A run with spears and shields leaning on it.
16. A run with a broken amphora at its foot.
```
