# The Assault: ChatGPT prompts for the Golem Forge's hold (the Iron Foundry)

Phase 4's eighth and last hold (`docs/design/assault-mode.md` on `claude/assault-design`, phase 4; the owner's name for it). The owner gave no
look for it, so it follows the camp's overlook, which already paints the Golem Forge's "War foundry" (`src/art/camp/camp-arcane.png`, its
bottom row): a foundry on cliffs at night, dark stone works and smokestacks, furnaces glowing orange, teal crystal growths, aqueduct bridges
over waterfalls and a great gear. It is built like the other holds, on the same engine and the same kinds of sheet, so these 13 prompts
mirror the Orc set sheet for sheet: the same canvases, grids, foot points, angles and formats, so the cutter (`tools/assault/cut-sheets.py`)
and the field's renderer take them as they took the Orc sheets. **They paint only what the packs and the Orc sheets cannot cover.** Until
they land, the hold is built on stand-ins: the Orc sheets' pieces, recoloured, and the kit pieces below.

**The hold.** A stone sluice where the others have their water, crossed by an iron girder bridge and two fords; a ring of riveted iron walls,
with the Piston Gate; the great steam hammers whose pounding drives the golems on (the war drums' part); an inner wall of dark stone bound
with iron bands, with the Furnace Gate; and the Great Foundry at the heart, with the Titan's anvil before it. Forge age only: iron, steam,
brass and stone, nothing electric or modern, and no writing.

**What the packs already give** (Chronos's Dwarves and Machines kits, `docs/samples/assault-art/golems-kit.jpg`; cut straight in, as the Orc
hold's kit pieces were). The Machines kit has a few modern pieces (the solar field, the searchlight, the generator); the prompts use them only
as shapes, never their electric look:

- walls and gates as decoration: `machines/iron_wall_run`, `iron_wall_corner`, `piston_gate`, `chainlink_fence`; `dwarves/stone_wall_run`,
  `stone_wall_corner`, `cliff_gate`, `chain_fence`;
- buildings: `dwarves/forge`, `great_hall`, `ale_hall`, `watchtower`, `mine_entrance`, `quarry`, `shrine`; `machines/workshop`, `longhouse`,
  `cottage`, `granary`;
- goods: `machines/metal_crates`, `oil_drums`, `coil_stack`, `scrap_heap`, `rail_cart`; `dwarves/crates`, `ore_pile`, `coal_heap`, `ore_cart`;
- lights: `dwarves/brazier`, `forge_fire`; `machines/welding_fire`;
- nature: `dwarves/boulders`, `rocks_a`, `rocks_b`, `crystals`, `dead_pine`; `machines/ore_rocks`, `iron_tree`, `dead_tree`;
- the bridges: `machines/girder_bridge`, `dwarves/stone_bridge`.

**What the Orc sheets already give every hold:** our own siege works (the ladders, the ram, the trebuchet), so no sheet here paints them.

**How to use them** (as for the other sets):

- Paste everything inside one fence into a new ChatGPT (Codex) conversation.
- Each prompt stands alone, and all of them add to the one branch, `art/assault-golems`, under `art-source/assault/golems/`, and the one pull
  request, "Assault art: the Iron Foundry".
- Each sheet is one image. If a sheet comes back wrong (the angle, the grid, a busy background), run the same prompt again. Allow two or
  three tries a sheet.
- ChatGPT adds the PNGs only. The builder cuts the sheets afterwards, credits them, and adds them to the service worker.

**The reference files the prompts name:**

- `docs/samples/assault-art/golems-kit.jpg`: the Dwarves and Machines kit pieces, labelled (on `claude/assault-2` until it is merged);
- `docs/samples/assault-art/template-*.png`: the grids (on `claude/assault-art-plan` until it is merged);
- `src/art/camp/camp-arcane.png`, its bottom row: the War foundry as the overlook paints it;
- `src/art/areas/forge/` and `src/art/areas/crystal/`: those lands' tops and sides as the game draws them today.

Each prompt says how to fetch the files from those branches if they are missing on main.

| # | Sheet | File | Canvas | Cells | The Orc sheet it matches |
| --- | --- | --- | --- | --- | --- |
| 1 | GOL-01 The ring of riveted iron walls | `gol-01-iron-wall.png` | 1024 x 1024 | 16 | ORC-01 the palisade |
| 2 | GOL-02 The ring's gates | `gol-02-gates.png` | 1536 x 1024 | 6 | ORC-02 the palisade's gates |
| 3 | GOL-03 The Furnace Gate and the towers | `gol-03-furnace-gate.png` | 1536 x 1024 | 6 | ORC-03 the Iron Gate |
| 4 | GOL-04 Cliff and wall faces | `gol-04-faces.png` | 1536 x 1024 | 12 | ORC-04 the faces |
| 5 | GOL-05 Ground textures | `gol-05-ground.png` | 1024 x 1024 | 16 | ORC-05 the ground |
| 6 | GOL-06 Ground transitions | `gol-06-transitions.png` | 1024 x 1024 | 16 | ORC-06 the transitions |
| 7 | GOL-07 The Great Foundry and the anvil | `gol-07-keep.png` | 1536 x 1024 | 3 | ORC-07 the keep |
| 8 | GOL-08 The wall's dressing and the stairs | `gol-08-wall-dressing.png` | 1024 x 1024 | 16 | ORC-08 the wall's dressing |
| 9 | GOL-09 The steam hammers and the landmarks | `gol-09-landmarks.png` | 1536 x 1024 | 6 | ORC-09 the camp's big pieces (the drums) |
| 10 | GOL-10 The foundry's props | `gol-10-props.png` | 1024 x 1024 | 16 | ORC-10 the camp's props |
| 11 | GOL-11 Ruins and the foundry's camp's burnt states | `gol-11-ruins.png` | 1536 x 1024 | 6 | ORC-11 siege works and ruins |
| 12 | GOL-12 The sluice | `gol-12-sluice.png` | 1024 x 1024 | 16 | ORC-12 bridges, fords and the river |
| 13 | GOL-13 Ground decals | `gol-13-decals.png` | 1024 x 1024 | 16 | ORC-13 the decals |

They are ordered by what the hold needs first: its walls and gates, then its ground, then its heart and dressing.

---

## Prompt 1: GOL-01, the ring of riveted iron walls, in every state of the siege

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Golem Forge's: the Iron Foundry, a war foundry on cliffs among teal crystal growths: a stone sluice crossed by an iron girder bridge, a
ring of riveted iron walls, great steam hammers whose pounding drives the golems on, an inner wall of dark stone bound with iron bands,
and at its heart the Great Foundry, a vast hall of furnaces and smokestacks glowing orange, a giant gear turning on its side.
This task paints ONE sheet: the ring of riveted iron walls, in every state of the siege.

Rules for this task:
- Branch: art/assault-golems. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/golems/gol-01-iron-wall.png. Change no other file.
- Size: the image tool's own output size does not matter (it often gives 1254 x 1254 or another size). Paint the pieces at whatever size
  it gives, then with Pillow cut each piece out, scale it so it fills its cell like the Orc sheet's matching piece, and pack the pieces
  into a new transparent canvas of exactly the size below, each in its own cell near its foot point. That is expected, not a failure:
  placement and scale only need to be close, because the game's cutter re-anchors every piece. Never stop because of the size.
- Pull request into main titled "Assault art: the Iron Foundry". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG). Each piece casts only a small soft contact shadow on its own footprint.

Open these files first and match them:
- docs/samples/assault-art/golems-kit.jpg: the Dwarves and Machines kits (Chronos Settlement's isometric kits), labelled. Your pieces
  stand beside these on the map, so match them exactly: the Dwarves' heavy stone and forges, the Machines' riveted iron, girders,
  pistons and lamps, and the orange furnace glow; keep to the forge age (iron, steam and stone), nothing electric or modern.
  Above all machines/iron_wall_run, machines/iron_wall_corner and dwarves/stone_wall_run: the same riveted plate and heavy stone.
- src/art/camp/camp-arcane.png, its bottom row: the War foundry as the camp's overlook paints it (its dark stone works and smokestacks,
  its furnaces, its teal crystals, its aqueduct bridges over waterfalls and its great gear). Match its look closely.
- src/art/areas/forge/top1.png and src/art/areas/crystal/top1.png: the forge and crystal lands' ground as the game draws them today.
- docs/samples/assault-art/template-props-1024.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/golems-kit.jpg > /tmp/golems-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

Style: detailed painted pixel art, exactly like the Dwarves and Machines kits. Crisp dark outlines, chunky readable shapes, a palette
of dark slate stone, blackened iron, brass and copper, soot, with the orange glow of furnaces and the cold teal of crystals as the
accents. It must read clearly when shown at a quarter of this size on a phone.

The angle and scale, exactly:
- True 2:1 isometric (dimetric) view, no perspective: a flat square tile on the ground is a diamond exactly twice as wide as it is
  tall, its corners pointing up, right, down and left. Vertical edges stay vertical.
- ONE TILE = a diamond 128 px wide and 64 px tall. ONE HEIGHT STEP = 24 px.
- Light from the upper left: faces turned to the lower left are lit; faces turned to the lower right are in shade.
- "Along u" means running from the upper left down to the lower right (like "\"). Every run on this sheet runs along u, passing
  through its tile from the midpoint of the diamond's upper-left edge to the midpoint of its lower-right edge, so that pieces placed on
  neighbouring tiles join seamlessly at those points. (The game mirrors them for runs going the other way.)
- The hold is drawn at night under smoke: dark stone and iron lit orange by furnaces and molten metal, with the cold teal glow of
  crystals here and there; steam and sparks drifting.
- Forge age only: iron, steam, brass and stone, never electric lights, wires or anything modern. No writing or numbers anywhere.
- The wall stands about 4 steps (96 px) tall: great riveted iron plates on a base of dark stone, iron buttresses at intervals, a row of
  blunt iron studs along its top.
- The OUTER face is the one turned to the viewer's lower left: the plates, rivets and soot streaks. The INNER face (cell 5) is the back of
  the same wall: girder bracing, an iron walkway, pipes and a lamp.

The sheet: 1024 x 1024 px, a 4 x 4 grid of 256 x 256 cells, read left to right, top to bottom. Every piece has a ONE-TILE footprint:
its diamond's centre (the foot point) is at (128, 208) inside its cell. Keep each piece inside its own cell with 8 px to spare.

1. Wall run, outer face, whole: riveted iron plates on a stone base, a buttress, soot streaks, a little steam from a vent.
2. The same run, battered: plates dented and buckled, rivets popped, scorch marks, arrows against it.
3. The same run, broken: torn open to jagged plates and a stone stump about 1.5 steps high, girders bent across. Still a barrier.
4. The breach: no wall left. A ramp of fallen stone, twisted plates and slag sloping down to the lower left, as if into a ditch. Walkable.
5. Wall run, inner face, whole: the back of cell 1. Girder bracing, an iron walkway a step and a half up, a lamp on a hook.
6. Corner, south (the corner nearest the viewer): two runs meet at the bottom of the tile, one running up-left and one up-right, both
   showing their OUTER faces, round a squat round iron bastion with a vent.
7. Corner, north (the far corner): two runs meet at the top of the tile, going down-left and down-right, both showing their INNER faces,
   round a bastion with a brazier on it.
8. Corner, east: a run coming from the upper left meets a run going down to the lower left at the tile's right corner. The first shows
   its inner face and the second its outer face. A bastion at the corner.
9. Gate post: a tall iron-banded stone pillar, taller than the wall, a brass cap and a furnace lamp. It ends a run beside a gate.
10. Sally port, one tile wide, whole: a small round-topped iron hatch-door set in the run, outer face.
11. The sally port, battered: the door dented, a hinge sheared.
12. The sally port, broken: the door torn off and lying on the ground. Passable.
13. Barricade (the girder bridge's fort): a low wall, chest-high (about 2 steps), of stacked ingots, a tipped ore cart and iron crates,
    a few iron stakes out front. Runs along u.
14. The barricade, broken: scattered ingots and crates, low enough to step over.
15. Caltrop field: a cluster of iron spikes and broken gear teeth set in the ground, leaning out to the lower left, about 1.5 steps
    high. Fills most of the tile.
16. Stake line: a single row of iron stakes across the tile along u, leaning out to the lower left, about 2 steps high.
```

## Prompt 2: GOL-02, the ring's two great gates, in their siege states, and the gate towers' tops

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Golem Forge's: the Iron Foundry, a war foundry on cliffs among teal crystal growths: a stone sluice crossed by an iron girder bridge, a
ring of riveted iron walls, great steam hammers whose pounding drives the golems on, an inner wall of dark stone bound with iron bands,
and at its heart the Great Foundry, a vast hall of furnaces and smokestacks glowing orange, a giant gear turning on its side.
This task paints ONE sheet: the ring's two great gates, in their siege states, and the gate towers' tops.

Rules for this task:
- Branch: art/assault-golems. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/golems/gol-02-gates.png. Change no other file.
- Size: the image tool's own output size does not matter (it often gives 1254 x 1254 or another size). Paint the pieces at whatever size
  it gives, then with Pillow cut each piece out, scale it so it fills its cell like the Orc sheet's matching piece, and pack the pieces
  into a new transparent canvas of exactly the size below, each in its own cell near its foot point. That is expected, not a failure:
  placement and scale only need to be close, because the game's cutter re-anchors every piece. Never stop because of the size.
- Pull request into main titled "Assault art: the Iron Foundry". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG). Each piece casts only a small soft contact shadow on its own footprint.

Open these files first and match them:
- docs/samples/assault-art/golems-kit.jpg: the Dwarves and Machines kits (Chronos Settlement's isometric kits), labelled. Your pieces
  stand beside these on the map, so match them exactly: the Dwarves' heavy stone and forges, the Machines' riveted iron, girders,
  pistons and lamps, and the orange furnace glow; keep to the forge age (iron, steam and stone), nothing electric or modern.
  Above all machines/piston_gate and dwarves/cliff_gate.
- src/art/camp/camp-arcane.png, its bottom row: the War foundry as the camp's overlook paints it (its dark stone works and smokestacks,
  its furnaces, its teal crystals, its aqueduct bridges over waterfalls and its great gear). Match its look closely.
- src/art/areas/forge/top1.png and src/art/areas/crystal/top1.png: the forge and crystal lands' ground as the game draws them today.
- docs/samples/assault-art/template-buildings-1536.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/golems-kit.jpg > /tmp/golems-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

Style: detailed painted pixel art, exactly like the Dwarves and Machines kits. Crisp dark outlines, chunky readable shapes, a palette
of dark slate stone, blackened iron, brass and copper, soot, with the orange glow of furnaces and the cold teal of crystals as the
accents. It must read clearly when shown at a quarter of this size on a phone.

The angle and scale, exactly:
- True 2:1 isometric (dimetric) view, no perspective: a flat square tile on the ground is a diamond exactly twice as wide as it is
  tall, its corners pointing up, right, down and left. Vertical edges stay vertical.
- ONE TILE = a diamond 128 px wide and 64 px tall. ONE HEIGHT STEP = 24 px.
- Light from the upper left: faces turned to the lower left are lit; faces turned to the lower right are in shade.
- The hold is drawn at night under smoke: dark stone and iron lit orange by furnaces and molten metal, with the cold teal glow of
  crystals here and there; steam and sparks drifting.
- Forge age only: iron, steam, brass and stone, never electric lights, wires or anything modern. No writing or numbers anywhere.
- The ring's wall is about 4 steps (96 px) tall; a gate's sides stand flush with it and may rise higher (a gate tower).
- The gates run along u (from the upper left down to the lower right, like "\"); the game mirrors them.

The sheet: 1536 x 1024 px, a 3 x 2 grid of 512 x 512 cells, read left to right, top to bottom. The foot point (the centre of the
footprint diamond) is at (256, 416) in every cell. Footprints: cells 1 to 4 are 2 tiles along u by 1 through (a diamond 192 x 96); cells 5 and 6 are 2 x 2 tiles (a diamond 256 x 128). Keep each piece inside its cell with 8 px to spare.

1. The Piston Gate (the south gate), whole, outer face to the lower left: a gatehouse of dark stone with a great iron door that slides
   on two huge brass pistons either side, gauges and pipes, furnace lamps, steam hissing from its vents.
2. The same Piston Gate, battered: the door dented, a piston cracked and leaking steam, arrows against the plates.
3. The same Piston Gate, broken: the door torn off and lying flat, the frame and pistons still standing, the passage open and walkable,
   rubble at the sides (not in the passage).
4. The North Gate, whole, INNER face to the lower left (it stands on the ring's far side): the same build seen from inside, with its
   winch wheel and a lamp.
5. The North Gate, broken (inner face): the winch smashed, the door hanging open, passable.
6. A gate tower's top: what stands on top of a 2 x 2 iron gate tower that the game raises: a platform with an iron rail, a steam
   whistle on a pipe, a small furnace lamp, a crane arm.
```

## Prompt 3: GOL-03, the inner wall's great Furnace Gate, the postern and the corner towers' tops

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Golem Forge's: the Iron Foundry, a war foundry on cliffs among teal crystal growths: a stone sluice crossed by an iron girder bridge, a
ring of riveted iron walls, great steam hammers whose pounding drives the golems on, an inner wall of dark stone bound with iron bands,
and at its heart the Great Foundry, a vast hall of furnaces and smokestacks glowing orange, a giant gear turning on its side.
This task paints ONE sheet: the inner wall's great Furnace Gate, the postern and the corner towers' tops.

Rules for this task:
- Branch: art/assault-golems. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/golems/gol-03-furnace-gate.png. Change no other file.
- Size: the image tool's own output size does not matter (it often gives 1254 x 1254 or another size). Paint the pieces at whatever size
  it gives, then with Pillow cut each piece out, scale it so it fills its cell like the Orc sheet's matching piece, and pack the pieces
  into a new transparent canvas of exactly the size below, each in its own cell near its foot point. That is expected, not a failure:
  placement and scale only need to be close, because the game's cutter re-anchors every piece. Never stop because of the size.
- Pull request into main titled "Assault art: the Iron Foundry". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG). Each piece casts only a small soft contact shadow on its own footprint.

Open these files first and match them:
- docs/samples/assault-art/golems-kit.jpg: the Dwarves and Machines kits (Chronos Settlement's isometric kits), labelled. Your pieces
  stand beside these on the map, so match them exactly: the Dwarves' heavy stone and forges, the Machines' riveted iron, girders,
  pistons and lamps, and the orange furnace glow; keep to the forge age (iron, steam and stone), nothing electric or modern.
  Above all dwarves/cliff_gate, dwarves/watchtower and machines/searchlight_tower (as a tower's shape; its lamp is a furnace lamp).
- src/art/camp/camp-arcane.png, its bottom row: the War foundry as the camp's overlook paints it (its dark stone works and smokestacks,
  its furnaces, its teal crystals, its aqueduct bridges over waterfalls and its great gear). Match its look closely.
- src/art/areas/forge/top1.png and src/art/areas/crystal/top1.png: the forge and crystal lands' ground as the game draws them today.
- docs/samples/assault-art/template-buildings-1536.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/golems-kit.jpg > /tmp/golems-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

Style: detailed painted pixel art, exactly like the Dwarves and Machines kits. Crisp dark outlines, chunky readable shapes, a palette
of dark slate stone, blackened iron, brass and copper, soot, with the orange glow of furnaces and the cold teal of crystals as the
accents. It must read clearly when shown at a quarter of this size on a phone.

The angle and scale, exactly:
- True 2:1 isometric (dimetric) view, no perspective: a flat square tile on the ground is a diamond exactly twice as wide as it is
  tall, its corners pointing up, right, down and left. Vertical edges stay vertical.
- ONE TILE = a diamond 128 px wide and 64 px tall. ONE HEIGHT STEP = 24 px.
- Light from the upper left: faces turned to the lower left are lit; faces turned to the lower right are in shade.
- The hold is drawn at night under smoke: dark stone and iron lit orange by furnaces and molten metal, with the cold teal glow of
  crystals here and there; steam and sparks drifting.
- Forge age only: iron, steam, brass and stone, never electric lights, wires or anything modern. No writing or numbers anywhere.
- The inner wall is a wall of dark slate stone in great blocks bound with broad iron bands. It is exactly 6 steps (144 px) tall
  from the ground to its walkway, plus a parapet. The game draws the wall itself; the gates fill gaps in it, so each gate's front must
  be exactly 144 px tall to the walkway line, flush with the wall on either side, and may rise higher above it (a gate tower).
- The gates run along u (from the upper left down to the lower right, like "\"); the game mirrors them. The wall is 2 tiles thick.

The sheet: 1536 x 1024 px, a 3 x 2 grid of 512 x 512 cells, read left to right, top to bottom. The foot point (the centre of the
footprint diamond) is at (256, 416) in every cell. Footprints: cells 1 to 3 are 2 x 2 tiles (a diamond 256 x 128); cells 4 and 5 are 1 tile along the wall by 2 tiles through it (a diamond 192 x 96); cell 6 is 3 x 3 tiles (a diamond 384 x 192). Keep each piece inside its cell with 8 px to spare.

1. The Furnace Gate, whole, seen from OUTSIDE (outer face to the lower left): a gatehouse of iron-banded stone 6 steps tall, its deep
   passage shut by a great round iron door like a furnace's, glowing orange at its rim, two smokestacks rising either side, and above
   the walkway a riveted iron tower with a crane. The strongest-looking thing on the map.
2. The same Furnace Gate, battered: the door dented and white-hot at the rim, a smokestack cracked, stones split round the passage.
3. The same Furnace Gate, broken: the door torn off and thrown aside, the passage open and walkable, rubble and twisted iron at the sides
   (not in the passage), the tower above cracked but standing.
4. The postern, whole, seen from INSIDE (inner face to the lower left): a low doorway through the 2-thick wall, an iron hatch, a lamp.
   Flush with the wall, 6 steps tall.
5. The postern, broken: the hatch torn off and lying on the stones, the opening walkable.
6. Corner tower top: the top of a stone tower that the game raises as a 3 x 3 column (draw only what stands on its top): a riveted
   iron platform ringed by a rail about 1.5 steps high, a big furnace lamp, a steam whistle, a small crane, a pile of iron shot.
```

## Prompt 4: GOL-04, the flat face textures the game shears onto every cliff, bank and wall

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Golem Forge's: the Iron Foundry, a war foundry on cliffs among teal crystal growths: a stone sluice crossed by an iron girder bridge, a
ring of riveted iron walls, great steam hammers whose pounding drives the golems on, an inner wall of dark stone bound with iron bands,
and at its heart the Great Foundry, a vast hall of furnaces and smokestacks glowing orange, a giant gear turning on its side.
This task paints ONE sheet: the flat face textures the game shears onto every cliff, bank and wall.

Rules for this task:
- Branch: art/assault-golems. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/golems/gol-04-faces.png. Change no other file.
- Size: the image tool's own output size does not matter (it often gives 1254 x 1254 or another size). Paint the pieces at whatever size
  it gives, then with Pillow cut each piece out, scale it so it fills its cell like the Orc sheet's matching piece, and pack the pieces
  into a new transparent canvas of exactly the size below, each in its own cell near its foot point. That is expected, not a failure:
  placement and scale only need to be close, because the game's cutter re-anchors every piece. Never stop because of the size.
- Pull request into main titled "Assault art: the Iron Foundry". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered column.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Opaque textures; leave only the unused bottom band of each column (y 480 to 512) transparent. Lip edges may have a transparent
  ragged top (grass, studs, parapet).

Open these files first and match them:
- docs/samples/assault-art/golems-kit.jpg: the Dwarves and Machines kits (Chronos Settlement's isometric kits), labelled. Your pieces
  stand beside these on the map, so match them exactly: the Dwarves' heavy stone and forges, the Machines' riveted iron, girders,
  pistons and lamps, and the orange furnace glow; keep to the forge age (iron, steam and stone), nothing electric or modern.
- src/art/camp/camp-arcane.png, its bottom row: the War foundry as the camp's overlook paints it (its dark stone works and smokestacks,
  its furnaces, its teal crystals, its aqueduct bridges over waterfalls and its great gear). Match its look closely.
- src/art/areas/forge/top1.png and src/art/areas/crystal/top1.png: the forge and crystal lands' ground as the game draws them today.
- src/art/areas/forge/side.png and src/art/areas/crystal/side.png: today's tiny side strips, which these replace.
- docs/samples/assault-art/template-faces-1536.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/golems-kit.jpg > /tmp/golems-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

THE VIEW IS STRAIGHT-ON, NOT ISOMETRIC: draw each face as a flat elevation, as if standing square in front of the wall, with no
perspective and no skew. The game skews it. Light from the upper left, evenly across the face (the game adds the shading for which
side it is on). Style: painted pixel art matching the Dwarves and Machines kits, chunky and readable.

The sheet: 1536 x 1024 px, 6 columns of 256 px, in two rows of 512 px: twelve columns, numbered left to right along the top row
(1 to 6), then the bottom row (7 to 12). Each column is one face set, 256 px wide (the length of one tile's edge), and must tile
seamlessly LEFT TO RIGHT with itself. Inside each column, from its top:
- the LIP, y 0 to 80 (one height step): the face's top edge, what overhangs or crowns it;
- the BODY, y 80 to 400 (four steps of 80 px): the face itself; it must tile seamlessly UP AND DOWN and left to right, because the
  game repeats it for walls of any height;
- the FOOT, y 400 to 480 (one step): where the face meets the ground;
- y 480 to 512: empty.
The lip's bottom must flow into the body's top, and the body's bottom into the foot's top, with no seam.

1. Cliff rock: dark slate in layers with soot; lip: sparse grass and moss; foot: scree.
2. Slag bank: dark earth heaped with slag and cinders; lip: cinders; foot: gravel.
3. Ditch bank: dark wet earth with old iron stakes in it; lip: trampled edge; foot: an oily water line.
4. Earth rampart faced with iron: packed earth behind riveted plates; lip: the top with iron stakes; foot: mud.
5. Iron wall skin: riveted iron plates over a stone base; lip: the row of iron studs (ragged, transparent between them); foot: stone in
   earth.
6. Inner wall: dark slate blocks bound with broad iron bands; lip: an iron-railed parapet (ragged, transparent between); foot: a plinth
   course.
7. The same inner wall, battle-damaged: split blocks, a band torn loose, soot; lip: broken parapet; foot: rubble.
8. Corner tower masonry: smaller dark blocks with an arrow slit in the body's middle, a brass band; lip: a stone ledge; foot: a sloped
   plinth.
9. Foundry terrace wall: smooth dark stone with iron pipes running along it; lip: an iron-edged flagstone; foot: flagstones.
10. Crystal cliff: dark rock with teal crystal clusters growing from it; lip: crystals at the edge; foot: crystal shards.
11. Sluice wall: dressed dark stone with a pale waterline and rust stains low down; lip: an iron kerb; foot: wet stone.
12. Waterfall rock: dark rock behind a thin falling sheet of water; lip: water spilling over; foot: white foam.
```

## Prompt 5: GOL-05, sixteen seamless ground textures, from the cliff tops to the foundry floors

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Golem Forge's: the Iron Foundry, a war foundry on cliffs among teal crystal growths: a stone sluice crossed by an iron girder bridge, a
ring of riveted iron walls, great steam hammers whose pounding drives the golems on, an inner wall of dark stone bound with iron bands,
and at its heart the Great Foundry, a vast hall of furnaces and smokestacks glowing orange, a giant gear turning on its side.
This task paints ONE sheet: sixteen seamless ground textures, from the cliff tops to the foundry floors.

Rules for this task:
- Branch: art/assault-golems. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/golems/gol-05-ground.png. Change no other file.
- Size: the image tool's own output size does not matter (it often gives 1254 x 1254 or another size). Paint the pieces at whatever size
  it gives, then with Pillow cut each piece out, scale it so it fills its cell like the Orc sheet's matching piece, and pack the pieces
  into a new transparent canvas of exactly the size below, each in its own cell near its foot point. That is expected, not a failure:
  placement and scale only need to be close, because the game's cutter re-anchors every piece. Never stop because of the size.
- Pull request into main titled "Assault art: the Iron Foundry". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Opaque image.

Open these files first and match them:
- src/art/areas/forge/top1.png, src/art/areas/forge/top2.png and src/art/areas/crystal/top1.png: today's 64 px tops, which these replace
  (keep their pixel density: 64 px a tile).
- docs/samples/assault-art/golems-kit.jpg: the kits' dwarves/rocky_tile, dwarves/flagstone_tile, machines/cobble_tile,
  machines/grate_tile and machines/iron_plate_tile give the colours to match.
- src/art/camp/camp-arcane.png, its bottom row: the War foundry as the overlook paints it.
- docs/samples/assault-art/template-textures-1024.png: the grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/golems-kit.jpg > /tmp/golems-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

THE VIEW IS STRAIGHT DOWN, NOT ISOMETRIC: draw each texture as seen from directly above, like a map, with no perspective, no horizon
and no cast shadows longer than a pebble's. Style: painted pixel art matching the kits' ground tiles; readable, not noisy; no single
feature so striking that its repeat would be noticed.

The sheet: 1024 x 1024 px, a 4 x 4 grid of 256 x 256 squares, read left to right, top to bottom. EACH SQUARE IS ONE TEXTURE COVERING
4 x 4 TILES, AND MUST TILE SEAMLESSLY WITH ITSELF ON ALL FOUR SIDES (its left edge continues its right edge, its top its bottom).
Keep the squares separate: nothing crosses from one square into the next.

1. Cliff grass: tough dark grass with grey stones and soot.
2. Cliff grass, second variant: the same, with small teal crystal chips.
3. Rock and scree: grey broken stone and boulders, for the cliffs' wild rear.
4. Trampled ground: worn grass with bare earth and heavy square footprints, round the posts.
5. Dark earth: soot-dark earth, heavy footprints.
6. Dark earth, second variant: the same, with rust flakes and bolts.
7. Oily mud: dark wet mud with ruts and oily puddles, for the lanes and the ditch floor.
8. Scorched ground: blackened earth.
9. Slag and ash: grey ash with lumps of glassy slag.
10. Packed cinder yard: the foundry's yards, trodden cinders and iron filings.
11. Dark cobbles: rough slate cobbles.
12. Foundry flags: big dark slabs with iron strips set between them.
13. Wall-walk grating: heavy iron grating seen from above, running from the top of the square to the bottom.
14. Iron plates: riveted floor plates.
15. Sluice shingle: wet dark pebbles with rust stains.
16. Shallow sluice water: dark water over stone, a faint oily sheen, a few ripples.
```

## Prompt 6: GOL-06, the overlays the game lays where two grounds meet

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Golem Forge's: the Iron Foundry, a war foundry on cliffs among teal crystal growths: a stone sluice crossed by an iron girder bridge, a
ring of riveted iron walls, great steam hammers whose pounding drives the golems on, an inner wall of dark stone bound with iron bands,
and at its heart the Great Foundry, a vast hall of furnaces and smokestacks glowing orange, a giant gear turning on its side.
This task paints ONE sheet: the overlays the game lays where two grounds meet.

Rules for this task:
- Branch: art/assault-golems. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/golems/gol-06-transitions.png. Change no other file.
- Size: the image tool's own output size does not matter (it often gives 1254 x 1254 or another size). Paint the pieces at whatever size
  it gives, then with Pillow cut each piece out, scale it so it fills its cell like the Orc sheet's matching piece, and pack the pieces
  into a new transparent canvas of exactly the size below, each in its own cell near its foot point. That is expected, not a failure:
  placement and scale only need to be close, because the game's cutter re-anchors every piece. Never stop because of the size.
- Pull request into main titled "Assault art: the Iron Foundry". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG): each overlay is the material only, and everything else is transparent.

Open these files first and match them:
- art-source/assault/golems/gol-05-ground.png on this branch, if it is there: the ground textures these overlays must match exactly in
  colour and pixel density. If it is not there yet, match the descriptions below and src/art/areas/forge/top1.png.
- docs/samples/assault-art/template-textures-1024.png: the grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/golems-kit.jpg > /tmp/golems-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

Where two grounds meet (mud beside grass, a path's edge), the game lays an overlay along the shared edge so the join is ragged and
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

1. Oily mud spreading onto grass: edge.          2. The same: outer corner.
3. Scorched ground and slag: edge.               4. The same: outer corner.
5. Dark cobbles meeting grass: edge.             6. The same: outer corner.
7. A trodden path's edge over grass: edge.       8. The same: outer corner.
9. Sluice shingle onto grass: edge.              10. The same: outer corner.
11. Foundry flags sinking into cinders: edge.    12. The same: outer corner.
13. Crystal chips scattered onto earth: edge.    14. The same: outer corner.
15. The water's edge: a thin rim of wet dark stones and rust, laid on the water side of a bank: edge.
16. The same: outer corner.
```

## Prompt 7: GOL-07, the Great Foundry, the Titan's anvil and the great banner

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Golem Forge's: the Iron Foundry, a war foundry on cliffs among teal crystal growths: a stone sluice crossed by an iron girder bridge, a
ring of riveted iron walls, great steam hammers whose pounding drives the golems on, an inner wall of dark stone bound with iron bands,
and at its heart the Great Foundry, a vast hall of furnaces and smokestacks glowing orange, a giant gear turning on its side.
This task paints ONE sheet: the Great Foundry, the Titan's anvil and the great banner.

Rules for this task:
- Branch: art/assault-golems. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/golems/gol-07-keep.png. Change no other file.
- Size: the image tool's own output size does not matter (it often gives 1254 x 1254 or another size). Paint the pieces at whatever size
  it gives, then with Pillow cut each piece out, scale it so it fills its cell like the Orc sheet's matching piece, and pack the pieces
  into a new transparent canvas of exactly the size below, each in its own cell near its foot point. That is expected, not a failure:
  placement and scale only need to be close, because the game's cutter re-anchors every piece. Never stop because of the size.
- Pull request into main titled "Assault art: the Iron Foundry". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG). Each piece casts only a small soft contact shadow on its own footprint.

Open these files first and match them:
- docs/samples/assault-art/golems-kit.jpg: the Dwarves and Machines kits (Chronos Settlement's isometric kits), labelled. Your pieces
  stand beside these on the map, so match them exactly: the Dwarves' heavy stone and forges, the Machines' riveted iron, girders,
  pistons and lamps, and the orange furnace glow; keep to the forge age (iron, steam and stone), nothing electric or modern.
  Above all dwarves/forge, dwarves/great_hall and machines/generator (as a machine's shape).
- src/art/camp/camp-arcane.png, its bottom row: the War foundry as the camp's overlook paints it (its dark stone works and smokestacks,
  its furnaces, its teal crystals, its aqueduct bridges over waterfalls and its great gear). Match its look closely.
- src/art/areas/forge/top1.png and src/art/areas/crystal/top1.png: the forge and crystal lands' ground as the game draws them today.
- docs/samples/assault-art/template-keep-1536.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/golems-kit.jpg > /tmp/golems-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

Style: detailed painted pixel art, exactly like the Dwarves and Machines kits. Crisp dark outlines, chunky readable shapes, a palette
of dark slate stone, blackened iron, brass and copper, soot, with the orange glow of furnaces and the cold teal of crystals as the
accents. It must read clearly when shown at a quarter of this size on a phone.

The angle and scale, exactly:
- True 2:1 isometric (dimetric) view, no perspective: a flat square tile on the ground is a diamond exactly twice as wide as it is
  tall, its corners pointing up, right, down and left. Vertical edges stay vertical.
- ONE TILE = a diamond 128 px wide and 64 px tall. ONE HEIGHT STEP = 24 px.
- Light from the upper left: faces turned to the lower left are lit; faces turned to the lower right are in shade.
- The hold is drawn at night under smoke: dark stone and iron lit orange by furnaces and molten metal, with the cold teal glow of
  crystals here and there; steam and sparks drifting.
- Forge age only: iron, steam, brass and stone, never electric lights, wires or anything modern. No writing or numbers anywhere.
- A doorway is about 4 steps (96 px) tall.

The sheet: 1536 x 1024 px. Three cells:
1. Cell 1, x 0 to 1024, y 0 to 1024: THE GREAT FOUNDRY. Footprint 6 tiles along u (upper left to lower right) by 4 tiles along v: a
   diamond 640 px wide and 320 px tall, centred on the foot point (512, 840). It may rise up to about 640 px above its foot.
   A vast hall of dark stone and riveted iron on a raised stone terrace, three tall smokestacks breathing smoke and sparks, a huge arched
   door facing the lower left blazing orange with furnace light, molten metal pouring from a spout into a channel down its stair, a
   giant gear turning on its side wall, brass pipes and gauges, teal crystals growing at its foot. Grander than anything else on the map.
2. Cell 2, x 1024 to 1536, y 0 to 512: THE TITAN'S ANVIL. One-tile footprint (a diamond 128 x 64) centred on the foot point (256, 440) in
   the cell. A colossal anvil on a stepped stone block, a great hammer resting across it, its back a screen of iron plates about 6 steps
   tall, two furnace lamps on the two-step dais. Facing the lower left.
3. Cell 3, x 1024 to 1536, y 512 to 1024: THE GREAT BANNER. One-tile footprint centred on (256, 440) in the cell. A tall pole (about
   14 steps) of riveted iron in a stone base, a crossbar hung with a long banner of dark iron-grey cloth painted with an orange gear,
   scorched at the bottom, a brass hammer on top.
```

## Prompt 8: GOL-08, the inner wall's dressing, the stairs and small structures

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Golem Forge's: the Iron Foundry, a war foundry on cliffs among teal crystal growths: a stone sluice crossed by an iron girder bridge, a
ring of riveted iron walls, great steam hammers whose pounding drives the golems on, an inner wall of dark stone bound with iron bands,
and at its heart the Great Foundry, a vast hall of furnaces and smokestacks glowing orange, a giant gear turning on its side.
This task paints ONE sheet: the inner wall's dressing, the stairs and small structures.

Rules for this task:
- Branch: art/assault-golems. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/golems/gol-08-wall-dressing.png. Change no other file.
- Size: the image tool's own output size does not matter (it often gives 1254 x 1254 or another size). Paint the pieces at whatever size
  it gives, then with Pillow cut each piece out, scale it so it fills its cell like the Orc sheet's matching piece, and pack the pieces
  into a new transparent canvas of exactly the size below, each in its own cell near its foot point. That is expected, not a failure:
  placement and scale only need to be close, because the game's cutter re-anchors every piece. Never stop because of the size.
- Pull request into main titled "Assault art: the Iron Foundry". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG). Each piece casts only a small soft contact shadow on its own footprint.

Open these files first and match them:
- docs/samples/assault-art/golems-kit.jpg: the Dwarves and Machines kits (Chronos Settlement's isometric kits), labelled. Your pieces
  stand beside these on the map, so match them exactly: the Dwarves' heavy stone and forges, the Machines' riveted iron, girders,
  pistons and lamps, and the orange furnace glow; keep to the forge age (iron, steam and stone), nothing electric or modern.
  Above all dwarves/brazier, machines/arc_lamp (as a lamp post's shape; a furnace lamp) and machines/gauge_signpost.
- src/art/camp/camp-arcane.png, its bottom row: the War foundry as the camp's overlook paints it (its dark stone works and smokestacks,
  its furnaces, its teal crystals, its aqueduct bridges over waterfalls and its great gear). Match its look closely.
- src/art/areas/forge/top1.png and src/art/areas/crystal/top1.png: the forge and crystal lands' ground as the game draws them today.
- docs/samples/assault-art/template-props-1024.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/golems-kit.jpg > /tmp/golems-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

Style: detailed painted pixel art, exactly like the Dwarves and Machines kits. Crisp dark outlines, chunky readable shapes, a palette
of dark slate stone, blackened iron, brass and copper, soot, with the orange glow of furnaces and the cold teal of crystals as the
accents. It must read clearly when shown at a quarter of this size on a phone.

The angle and scale, exactly:
- True 2:1 isometric (dimetric) view, no perspective: a flat square tile on the ground is a diamond exactly twice as wide as it is
  tall, its corners pointing up, right, down and left. Vertical edges stay vertical.
- ONE TILE = a diamond 128 px wide and 64 px tall. ONE HEIGHT STEP = 24 px.
- Light from the upper left: faces turned to the lower left are lit; faces turned to the lower right are in shade.
- The hold is drawn at night under smoke: dark stone and iron lit orange by furnaces and molten metal, with the cold teal glow of
  crystals here and there; steam and sparks drifting.
- Forge age only: iron, steam, brass and stone, never electric lights, wires or anything modern. No writing or numbers anywhere.
- The inner wall's walkway is 6 steps up; these pieces stand on it or against it.

The sheet: 1024 x 1024 px, a 4 x 4 grid of 256 x 256 cells, read left to right, top to bottom. Every piece has a ONE-TILE footprint:
its diamond's centre (the foot point) is at (128, 208) inside its cell. Keep each piece inside its own cell with 8 px to spare.

1. Iron merlon: one riveted iron merlon, for the wall's outer edge, along u.
2. The same merlon, broken: torn off, lying on the walk.
3. Inner rail: a low iron rail along the walk's inner edge, along u.
4. Wall brazier: an iron basket of coals on a tripod, for the walk (about 2 steps tall).
5. A furnace lamp in an iron cage on a bracket.
6. A small banner of iron-grey cloth on a short pole.
7. Archer's shield: a riveted iron shield-plate over a gap in the parapet.
8. A rack of iron spears and heavy crossbow bolts.
9. Stairs up the wall, along u: iron-edged stone steps rising 6 steps (144 px) from the ground at the lower left to the walk. One tile.
10. Stairs down, the same steps seen descending to the lower right (the game uses it where a stair goes down into a pit).
11. An iron ladder against a wall to the upper right, about 6 steps tall.
12. A crucible of molten metal on the walk over coals.
13. A stack of iron ingots.
14. A steam whistle on a pipe.
15. A pile of iron shot.
16. A drift of soot against the wall, with a broken gear.
```

## Prompt 9: GOL-09, the great steam hammers (the hold's war drums) and its landmarks

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Golem Forge's: the Iron Foundry, a war foundry on cliffs among teal crystal growths: a stone sluice crossed by an iron girder bridge, a
ring of riveted iron walls, great steam hammers whose pounding drives the golems on, an inner wall of dark stone bound with iron bands,
and at its heart the Great Foundry, a vast hall of furnaces and smokestacks glowing orange, a giant gear turning on its side.
This task paints ONE sheet: the great steam hammers (the hold's war drums) and its landmarks.

Rules for this task:
- Branch: art/assault-golems. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/golems/gol-09-landmarks.png. Change no other file.
- Size: the image tool's own output size does not matter (it often gives 1254 x 1254 or another size). Paint the pieces at whatever size
  it gives, then with Pillow cut each piece out, scale it so it fills its cell like the Orc sheet's matching piece, and pack the pieces
  into a new transparent canvas of exactly the size below, each in its own cell near its foot point. That is expected, not a failure:
  placement and scale only need to be close, because the game's cutter re-anchors every piece. Never stop because of the size.
- Pull request into main titled "Assault art: the Iron Foundry". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG). Each piece casts only a small soft contact shadow on its own footprint.

Open these files first and match them:
- docs/samples/assault-art/golems-kit.jpg: the Dwarves and Machines kits (Chronos Settlement's isometric kits), labelled. Your pieces
  stand beside these on the map, so match them exactly: the Dwarves' heavy stone and forges, the Machines' riveted iron, girders,
  pistons and lamps, and the orange furnace glow; keep to the forge age (iron, steam and stone), nothing electric or modern.
  Above all dwarves/forge_fire and machines/generator (as a machine's shape).
- src/art/camp/camp-arcane.png, its bottom row: the War foundry as the camp's overlook paints it (its dark stone works and smokestacks,
  its furnaces, its teal crystals, its aqueduct bridges over waterfalls and its great gear). Match its look closely.
- src/art/areas/forge/top1.png and src/art/areas/crystal/top1.png: the forge and crystal lands' ground as the game draws them today.
- docs/samples/assault-art/template-buildings-1536.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/golems-kit.jpg > /tmp/golems-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

Style: detailed painted pixel art, exactly like the Dwarves and Machines kits. Crisp dark outlines, chunky readable shapes, a palette
of dark slate stone, blackened iron, brass and copper, soot, with the orange glow of furnaces and the cold teal of crystals as the
accents. It must read clearly when shown at a quarter of this size on a phone.

The angle and scale, exactly:
- True 2:1 isometric (dimetric) view, no perspective: a flat square tile on the ground is a diamond exactly twice as wide as it is
  tall, its corners pointing up, right, down and left. Vertical edges stay vertical.
- ONE TILE = a diamond 128 px wide and 64 px tall. ONE HEIGHT STEP = 24 px.
- Light from the upper left: faces turned to the lower left are lit; faces turned to the lower right are in shade.
- The hold is drawn at night under smoke: dark stone and iron lit orange by furnaces and molten metal, with the cold teal glow of
  crystals here and there; steam and sparks drifting.
- Forge age only: iron, steam, brass and stone, never electric lights, wires or anything modern. No writing or numbers anywhere.
- The steam hammers play the part the orc hold's war drums do: while one pounds, the golems near it fight harder, until our troops reach
  it and break it.

The sheet: 1536 x 1024 px, a 3 x 2 grid of 512 x 512 cells, read left to right, top to bottom. The foot point (the centre of the
footprint diamond) is at (256, 416) in every cell. Footprints: cells 1 to 4 are 2 x 2 tiles (a diamond 256 x 128); cells 5 and 6 are 3 x 3 tiles (a diamond 384 x 192). Keep each piece inside its cell with 8 px to spare.

1. A great steam hammer, pounding: a towering iron frame with a huge hammer-head on a piston above an anvil, at the instant it
   strikes: orange rings of force bursting out, sparks flying, steam blasting from its valves, the ground shaken.
2. The same steam hammer, broken: after our troops reached it: the piston snapped, the hammer-head fallen on its side, the boiler split
   and leaking steam, the fire out.
3. The casting pit: a sunken pit where molten metal is poured into moulds, a crane above it.
4. The crystal well: a ring of iron round a cluster of tall teal crystals glowing in the dark.
5. The great gear: a colossal iron gear standing half buried on its edge, a ladder up its teeth.
6. The aqueduct: a short stone aqueduct of three arches carrying water from a cliff, a waterfall spilling from its end.
```

## Prompt 10: GOL-10, the foundry's small props the kits do not have

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Golem Forge's: the Iron Foundry, a war foundry on cliffs among teal crystal growths: a stone sluice crossed by an iron girder bridge, a
ring of riveted iron walls, great steam hammers whose pounding drives the golems on, an inner wall of dark stone bound with iron bands,
and at its heart the Great Foundry, a vast hall of furnaces and smokestacks glowing orange, a giant gear turning on its side.
This task paints ONE sheet: the foundry's small props the kits do not have.

Rules for this task:
- Branch: art/assault-golems. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/golems/gol-10-props.png. Change no other file.
- Size: the image tool's own output size does not matter (it often gives 1254 x 1254 or another size). Paint the pieces at whatever size
  it gives, then with Pillow cut each piece out, scale it so it fills its cell like the Orc sheet's matching piece, and pack the pieces
  into a new transparent canvas of exactly the size below, each in its own cell near its foot point. That is expected, not a failure:
  placement and scale only need to be close, because the game's cutter re-anchors every piece. Never stop because of the size.
- Pull request into main titled "Assault art: the Iron Foundry". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG). Each piece casts only a small soft contact shadow on its own footprint.

Open these files first and match them:
- docs/samples/assault-art/golems-kit.jpg: the Dwarves and Machines kits (Chronos Settlement's isometric kits), labelled. Your pieces
  stand beside these on the map, so match them exactly: the Dwarves' heavy stone and forges, the Machines' riveted iron, girders,
  pistons and lamps, and the orange furnace glow; keep to the forge age (iron, steam and stone), nothing electric or modern.
  The kits already give the barrels, the braziers, the coal and ore heaps, the crates, the metal crates, the oil drums, the ore carts,
  the scrap heaps, the rocks and the woodpiles: do not paint those again. These props go with them.
- src/art/camp/camp-arcane.png, its bottom row: the War foundry as the camp's overlook paints it (its dark stone works and smokestacks,
  its furnaces, its teal crystals, its aqueduct bridges over waterfalls and its great gear). Match its look closely.
- src/art/areas/forge/top1.png and src/art/areas/crystal/top1.png: the forge and crystal lands' ground as the game draws them today.
- docs/samples/assault-art/template-props-1024.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/golems-kit.jpg > /tmp/golems-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

Style: detailed painted pixel art, exactly like the Dwarves and Machines kits. Crisp dark outlines, chunky readable shapes, a palette
of dark slate stone, blackened iron, brass and copper, soot, with the orange glow of furnaces and the cold teal of crystals as the
accents. It must read clearly when shown at a quarter of this size on a phone.

The angle and scale, exactly:
- True 2:1 isometric (dimetric) view, no perspective: a flat square tile on the ground is a diamond exactly twice as wide as it is
  tall, its corners pointing up, right, down and left. Vertical edges stay vertical.
- ONE TILE = a diamond 128 px wide and 64 px tall. ONE HEIGHT STEP = 24 px.
- Light from the upper left: faces turned to the lower left are lit; faces turned to the lower right are in shade.
- The hold is drawn at night under smoke: dark stone and iron lit orange by furnaces and molten metal, with the cold teal glow of
  crystals here and there; steam and sparks drifting.
- Forge age only: iron, steam, brass and stone, never electric lights, wires or anything modern. No writing or numbers anywhere.

The sheet: 1024 x 1024 px, a 4 x 4 grid of 256 x 256 cells, read left to right, top to bottom. Every piece has a ONE-TILE footprint:
its diamond's centre (the foot point) is at (128, 208) inside its cell. Keep each piece inside its own cell with 8 px to spare.

1. A worker's iron shed with a smoking chimney.
2. A cooling rack of fresh-cast iron bars.
3. A bellows on a stand.
4. A pile of cogs and gears.
5. A brass gauge column with pipes.
6. An iron mould box.
7. A small crane with a hook.
8. A water barrel with a pump.
9. A rack of hammers and tongs.
10. A cage of iron bars holding a small growling iron hound (a clockwork beast).
11. A cooking fire under an iron pot.
12. A heap of coke.
13. A cluster of small teal crystals.
14. A stunted dead tree, soot-black.
15. A rusted iron post with a chain.
16. A fallen iron helm and a broken pick in the cinders.
```

## Prompt 11: GOL-11, ruins, and the burnt states of the foundry's camp

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Golem Forge's: the Iron Foundry, a war foundry on cliffs among teal crystal growths: a stone sluice crossed by an iron girder bridge, a
ring of riveted iron walls, great steam hammers whose pounding drives the golems on, an inner wall of dark stone bound with iron bands,
and at its heart the Great Foundry, a vast hall of furnaces and smokestacks glowing orange, a giant gear turning on its side.
This task paints ONE sheet: ruins, and the burnt states of the foundry's camp.

Rules for this task:
- Branch: art/assault-golems. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/golems/gol-11-ruins.png. Change no other file.
- Size: the image tool's own output size does not matter (it often gives 1254 x 1254 or another size). Paint the pieces at whatever size
  it gives, then with Pillow cut each piece out, scale it so it fills its cell like the Orc sheet's matching piece, and pack the pieces
  into a new transparent canvas of exactly the size below, each in its own cell near its foot point. That is expected, not a failure:
  placement and scale only need to be close, because the game's cutter re-anchors every piece. Never stop because of the size.
- Pull request into main titled "Assault art: the Iron Foundry". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG). Each piece casts only a small soft contact shadow on its own footprint.

Open these files first and match them:
- docs/samples/assault-art/golems-kit.jpg: the Dwarves and Machines kits (Chronos Settlement's isometric kits), labelled. Your pieces
  stand beside these on the map, so match them exactly: the Dwarves' heavy stone and forges, the Machines' riveted iron, girders,
  pistons and lamps, and the orange furnace glow; keep to the forge age (iron, steam and stone), nothing electric or modern.
- src/art/camp/camp-arcane.png, its bottom row: the War foundry as the camp's overlook paints it (its dark stone works and smokestacks,
  its furnaces, its teal crystals, its aqueduct bridges over waterfalls and its great gear). Match its look closely.
- src/art/areas/forge/top1.png and src/art/areas/crystal/top1.png: the forge and crystal lands' ground as the game draws them today.
- docs/samples/assault-art/template-buildings-1536.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/golems-kit.jpg > /tmp/golems-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

Style: detailed painted pixel art, exactly like the Dwarves and Machines kits. Crisp dark outlines, chunky readable shapes, a palette
of dark slate stone, blackened iron, brass and copper, soot, with the orange glow of furnaces and the cold teal of crystals as the
accents. It must read clearly when shown at a quarter of this size on a phone.

The angle and scale, exactly:
- True 2:1 isometric (dimetric) view, no perspective: a flat square tile on the ground is a diamond exactly twice as wide as it is
  tall, its corners pointing up, right, down and left. Vertical edges stay vertical.
- ONE TILE = a diamond 128 px wide and 64 px tall. ONE HEIGHT STEP = 24 px.
- Light from the upper left: faces turned to the lower left are lit; faces turned to the lower right are in shade.
- Our own siege works (the ladders, the ram, the trebuchet) are already painted on the Orc hold's sheets and serve every hold: do not
  paint them. The Warpath's reserve camp here is the foundry's camp on the ore road: its sheds burn when our archers loose fire arrows.
- The hold is drawn at night under smoke: dark stone and iron lit orange by furnaces and molten metal, with the cold teal glow of
  crystals here and there; steam and sparks drifting.
- Forge age only: iron, steam, brass and stone, never electric lights, wires or anything modern. No writing or numbers anywhere.

The sheet: 1536 x 1024 px, a 3 x 2 grid of 512 x 512 cells, read left to right, top to bottom. The foot point (the centre of the
footprint diamond) is at (256, 416) in every cell. Footprints: cells 1 and 2 are 2 tiles along u by 1 (a diamond 192 x 96); cells 3 to 6 are 2 x 2 tiles (a diamond 256 x 128). Keep each piece inside its cell with 8 px to spare.

1. A workers' long shed: a long shed of planks and iron sheet on posts, a stove pipe, a lamp by the door.
2. The same shed, burnt: a black heap of charred planks and buckled sheet, ash, a few embers.
3. A coal store: a tall roofed bunker heaped with coal.
4. The same coal store, burnt: its frame standing charred, the coal smouldering.
5. A ruined old mine head: stone footings, a collapsed wooden headframe and a rusted cart.
6. A collapsed chimney: a toppled smokestack lying in broken rings of brick.
```

## Prompt 12: GOL-12, the sluice, its girder bridge, fords and banks

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Golem Forge's: the Iron Foundry, a war foundry on cliffs among teal crystal growths: a stone sluice crossed by an iron girder bridge, a
ring of riveted iron walls, great steam hammers whose pounding drives the golems on, an inner wall of dark stone bound with iron bands,
and at its heart the Great Foundry, a vast hall of furnaces and smokestacks glowing orange, a giant gear turning on its side.
This task paints ONE sheet: the sluice, its girder bridge, fords and banks.

Rules for this task:
- Branch: art/assault-golems. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/golems/gol-12-sluice.png. Change no other file.
- Size: the image tool's own output size does not matter (it often gives 1254 x 1254 or another size). Paint the pieces at whatever size
  it gives, then with Pillow cut each piece out, scale it so it fills its cell like the Orc sheet's matching piece, and pack the pieces
  into a new transparent canvas of exactly the size below, each in its own cell near its foot point. That is expected, not a failure:
  placement and scale only need to be close, because the game's cutter re-anchors every piece. Never stop because of the size.
- Pull request into main titled "Assault art: the Iron Foundry". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG). Each piece casts only a small soft contact shadow on its own footprint.

Open these files first and match them:
- docs/samples/assault-art/golems-kit.jpg: the Dwarves and Machines kits (Chronos Settlement's isometric kits), labelled. Your pieces
  stand beside these on the map, so match them exactly: the Dwarves' heavy stone and forges, the Machines' riveted iron, girders,
  pistons and lamps, and the orange furnace glow; keep to the forge age (iron, steam and stone), nothing electric or modern.
  Above all machines/girder_bridge and dwarves/stone_bridge.
- src/art/camp/camp-arcane.png, its bottom row: the War foundry as the camp's overlook paints it (its dark stone works and smokestacks,
  its furnaces, its teal crystals, its aqueduct bridges over waterfalls and its great gear). Match its look closely.
- src/art/areas/forge/top1.png and src/art/areas/crystal/top1.png: the forge and crystal lands' ground as the game draws them today.
- docs/samples/assault-art/template-props-1024.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/golems-kit.jpg > /tmp/golems-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

Style: detailed painted pixel art, exactly like the Dwarves and Machines kits. Crisp dark outlines, chunky readable shapes, a palette
of dark slate stone, blackened iron, brass and copper, soot, with the orange glow of furnaces and the cold teal of crystals as the
accents. It must read clearly when shown at a quarter of this size on a phone.

The angle and scale, exactly:
- True 2:1 isometric (dimetric) view, no perspective: a flat square tile on the ground is a diamond exactly twice as wide as it is
  tall, its corners pointing up, right, down and left. Vertical edges stay vertical.
- ONE TILE = a diamond 128 px wide and 64 px tall. ONE HEIGHT STEP = 24 px.
- Light from the upper left: faces turned to the lower left are lit; faces turned to the lower right are in shade.
- The Iron Foundry has a stone sluice where the Orc hold has its river. The game draws the water as ground; these pieces stand in it or
  on its banks.
- "Along u" means running from the upper left down to the lower right (like "\"). Every run on this sheet runs along u, passing
  through its tile from the midpoint of the diamond's upper-left edge to the midpoint of its lower-right edge, so that pieces placed on
  neighbouring tiles join seamlessly at those points. (The game mirrors them for runs going the other way.)
- The hold is drawn at night under smoke: dark stone and iron lit orange by furnaces and molten metal, with the cold teal glow of
  crystals here and there; steam and sparks drifting.
- Forge age only: iron, steam, brass and stone, never electric lights, wires or anything modern. No writing or numbers anywhere.

The sheet: 1024 x 1024 px, a 4 x 4 grid of 256 x 256 cells, read left to right, top to bottom. Every piece has a ONE-TILE footprint:
its diamond's centre (the foot point) is at (128, 208) inside its cell. Keep each piece inside its own cell with 8 px to spare.

1. Girder bridge deck, whole: an iron girder deck with riveted plates crossing along u, iron railings.
2. The bridge, broken: a gap of bent girders hanging into the water. Impassable.
3. The bridge's end, where it meets the bank at the upper left, on a stone abutment.
4. A bridge post: an iron post with a furnace lamp.
5. Ford stones: a line of flat iron-capped stepping stones along u, their tops showing above the water.
6. Reeds at the water's edge, sooty.
7. A fallen girder lying across the water.
8. A water wheel turning in the stream.
9. Wet dark blocks at the water's edge.
10. A sluice gate of iron in a stone frame.
11. A small iron barge, moored.
12. Steam rising from the water where hot slag was dumped (semi-transparent).
13. A sunken ore cart sticking out of the water.
14. A cluster of teal crystals growing from the water.
15. A pipe outlet pouring water into the stream.
16. Stone steps going down into the water from the bank at the upper left.
```

## Prompt 13: GOL-13, sixteen ground decals

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Golem Forge's: the Iron Foundry, a war foundry on cliffs among teal crystal growths: a stone sluice crossed by an iron girder bridge, a
ring of riveted iron walls, great steam hammers whose pounding drives the golems on, an inner wall of dark stone bound with iron bands,
and at its heart the Great Foundry, a vast hall of furnaces and smokestacks glowing orange, a giant gear turning on its side.
This task paints ONE sheet: sixteen ground decals.

Rules for this task:
- Branch: art/assault-golems. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/golems/gol-13-decals.png. Change no other file.
- Size: the image tool's own output size does not matter (it often gives 1254 x 1254 or another size). Paint the pieces at whatever size
  it gives, then with Pillow cut each piece out, scale it so it fills its cell like the Orc sheet's matching piece, and pack the pieces
  into a new transparent canvas of exactly the size below, each in its own cell near its foot point. That is expected, not a failure:
  placement and scale only need to be close, because the game's cutter re-anchors every piece. Never stop because of the size.
- Pull request into main titled "Assault art: the Iron Foundry". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG).

Open these files first and match them:
- art-source/assault/golems/gol-05-ground.png on this branch, if it is there: the ground these lie on (match its pixel density, 64 px
  a tile at quarter size). Otherwise src/art/areas/forge/top1.png.
- docs/samples/assault-art/template-textures-1024.png: the grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/golems-kit.jpg > /tmp/golems-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

THE VIEW IS STRAIGHT DOWN, NOT ISOMETRIC, as on a map: everything lies flat on the ground, nothing stands up. Style: painted pixel
art matching the kits' ground; readable; blood is a dark red-brown, never bright or gory.

The sheet: 1024 x 1024 px, a 4 x 4 grid of 256 x 256 squares, read left to right, top to bottom. Each square holds ONE decal covering
up to 2 x 2 tiles, centred, with at least 16 px of transparency round it.

1. Blood spatter.   2. A spill of cooled molten metal (a grey-silver splash).   3. A crater where a golem's fist struck.
4. Scorch mark, round (a blast).   5. Slag and embers.
6. Stone rubble scatter.   7. Iron debris (bent plates, rivets, a broken gear).
8. Cart ruts: two parallel rail-cart tracks running straight from the square's top edge to its bottom edge (so they join end to end).
9. Heavy square footprints: a trail of a golem's huge blocky prints crossing the square.   10. Drag marks of something heavy.
11. An oily puddle.   12. Scattered iron filings and bolts.
13. Scattered crystal shards.   14. Soot smears.
15. Glowing cracks where heat leaks up.   16. Cracked flagstones (cracks and a few broken corners, to lay over a stone floor).
```
