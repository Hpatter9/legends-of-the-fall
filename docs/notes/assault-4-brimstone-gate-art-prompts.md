# The Assault: ChatGPT prompts for the Infernal Host's hold (Brimstone Gate)

Phase 4's sixth hold (`docs/design/assault-mode.md` on `claude/assault-design`, phase 4; the owner's name for it). The owner gave no look for
it, so it follows the camp's overlook, which already paints the Infernal Host's "Infernal mustering grounds" (`src/art/camp/camp-arcane.png`,
its top row): a fortress of the pit among volcanic crags, rivers of lava, spiked black walls and towers, a glowing horned gate and circles of
fire. It is built like the other holds, on the same engine and the same kinds of sheet, so these 13 prompts mirror the Orc set sheet for
sheet: the same canvases, grids, foot points, angles and formats, so the cutter (`tools/assault/cut-sheets.py`) and the field's renderer take
them as they took the Orc sheets. **They paint only what the packs and the Orc sheets cannot cover.** Until they land, the hold is built on
stand-ins: the Orc sheets' pieces, recoloured, and the kit pieces below.

**The hold.** A river of lava where the others have their water, crossed by a bridge of black iron and chains and two crust fords; a ring of
spiked obsidian walls, with the Brimstone Gate itself; the fire circles, where imps chant up the host's fury (the war drums' part); an inner
wall of black basalt veined with glowing cracks, with the Infernal Gate; and the Demon Spire at the heart, with the burning throne before it.
Nothing is holy or written: every carving is a jagged pattern, horns or spikes, never a real-world symbol.

**What the packs already give** (Chronos's Blood Court and Dwarves kits, `docs/samples/assault-art/infernal-kit.jpg`; cut straight in, as
the Orc hold's kit pieces were):

- walls and gates as decoration: `bloodcourt/stone_wall_run`, `stone_wall_corner`, `gatehouse`, `iron_fence`; `dwarves/chain_fence`,
  `cliff_gate`;
- buildings: `bloodcourt/longhouse`, `tavern`, `cottage`, `chapel`, `crypt`, `watchtower`, `granary`, `workshop`; `dwarves/forge`,
  `great_hall`, `mine_entrance`, `quarry`;
- goods: `bloodcourt/barrels`, `stockpile`, `carriage`, `coffins`; `dwarves/crates`, `ore_pile`, `coal_heap`, `ore_cart`;
- lights: `bloodcourt/brazier`, `lantern_post`, `banner`; `dwarves/brazier`, `forge_fire`;
- nature: `bloodcourt/dead_oak`, `thorn_bush`, `rocks`; `dwarves/boulders`, `rocks_a`, `rocks_b`, `dead_pine`, `crystals`;
- the bridges: `bloodcourt/stone_bridge`, `dwarves/stone_bridge`.

**What the Orc sheets already give every hold:** our own siege works (the ladders, the ram, the trebuchet), so no sheet here paints them.

**How to use them** (as for the other sets):

- Paste everything inside one fence into a new ChatGPT (Codex) conversation.
- Each prompt stands alone, and all of them add to the one branch, `art/assault-infernal`, under `art-source/assault/infernal/`, and the one
  pull request, "Assault art: Brimstone Gate".
- Each sheet is one image. If a sheet comes back wrong (the angle, the grid, a busy background), run the same prompt again. Allow two or
  three tries a sheet.
- ChatGPT adds the PNGs only. The builder cuts the sheets afterwards, credits them, and adds them to the service worker.

**The reference files the prompts name:**

- `docs/samples/assault-art/infernal-kit.jpg`: the Blood Court and Dwarves kit pieces, labelled (on `claude/assault-2` until it is merged);
- `docs/samples/assault-art/template-*.png`: the grids (on `claude/assault-art-plan` until it is merged);
- `src/art/camp/camp-arcane.png`, its top row: the Infernal mustering grounds as the overlook paints them;
- `src/art/areas/volcano/`: that land's tops and sides as the game draws them today.

Each prompt says how to fetch the files from those branches if they are missing on main.

| # | Sheet | File | Canvas | Cells | The Orc sheet it matches |
| --- | --- | --- | --- | --- | --- |
| 1 | INF-01 The ring of spiked obsidian walls | `inf-01-spike-wall.png` | 1024 x 1024 | 16 | ORC-01 the palisade |
| 2 | INF-02 The ring's gates | `inf-02-gates.png` | 1536 x 1024 | 6 | ORC-02 the palisade's gates |
| 3 | INF-03 The Infernal Gate and the towers | `inf-03-infernal-gate.png` | 1536 x 1024 | 6 | ORC-03 the Iron Gate |
| 4 | INF-04 Cliff and wall faces | `inf-04-faces.png` | 1536 x 1024 | 12 | ORC-04 the faces |
| 5 | INF-05 Ground textures | `inf-05-ground.png` | 1024 x 1024 | 16 | ORC-05 the ground |
| 6 | INF-06 Ground transitions | `inf-06-transitions.png` | 1024 x 1024 | 16 | ORC-06 the transitions |
| 7 | INF-07 The Demon Spire and the throne | `inf-07-keep.png` | 1536 x 1024 | 3 | ORC-07 the keep |
| 8 | INF-08 The wall's dressing and the stairs | `inf-08-wall-dressing.png` | 1024 x 1024 | 16 | ORC-08 the wall's dressing |
| 9 | INF-09 The fire circles and the landmarks | `inf-09-landmarks.png` | 1536 x 1024 | 6 | ORC-09 the camp's big pieces (the drums) |
| 10 | INF-10 The pit's props | `inf-10-props.png` | 1024 x 1024 | 16 | ORC-10 the camp's props |
| 11 | INF-11 Ruins and the host's camp's burnt states | `inf-11-ruins.png` | 1536 x 1024 | 6 | ORC-11 siege works and ruins |
| 12 | INF-12 The lava river | `inf-12-lava.png` | 1024 x 1024 | 16 | ORC-12 bridges, fords and the river |
| 13 | INF-13 Ground decals | `inf-13-decals.png` | 1024 x 1024 | 16 | ORC-13 the decals |

They are ordered by what the hold needs first: its walls and gates, then its ground, then its heart and dressing.

---

## Prompt 1: INF-01, the ring of spiked obsidian walls, in every state of the siege

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Infernal Host's: Brimstone Gate, a fortress of the pit among volcanic crags: a river of lava crossed by a bridge of black iron and
chains, a ring of spiked obsidian walls, circles of fire where imps chant up the host's fury, an inner wall of black basalt veined with
glowing cracks, and at its heart the Demon Spire, a tower of jagged black stone crowned with horns and lit red from within.
This task paints ONE sheet: the ring of spiked obsidian walls, in every state of the siege.

Rules for this task:
- Branch: art/assault-infernal. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/infernal/inf-01-spike-wall.png. Change no other file.
- Size: the image tool's own output size does not matter (it often gives 1254 x 1254 or another size). Paint the pieces at whatever size
  it gives, then with Pillow cut each piece out, scale it so it fills its cell like the Orc sheet's matching piece, and pack the pieces
  into a new transparent canvas of exactly the size below, each in its own cell near its foot point. That is expected, not a failure:
  placement and scale only need to be close, because the game's cutter re-anchors every piece. Never stop because of the size.
- Pull request into main titled "Assault art: Brimstone Gate". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG). Each piece casts only a small soft contact shadow on its own footprint.

Open these files first and match them:
- docs/samples/assault-art/infernal-kit.jpg: the Blood Court and Dwarves kits (Chronos Settlement's isometric kits), labelled. Your
  pieces stand beside these on the map, so match them exactly: the Blood Court's black stone, wrought iron and deep red, the Dwarves'
  heavy forges and rough rock, and the red and orange glow of fire and lava.
  Above all bloodcourt/stone_wall_run, bloodcourt/stone_wall_corner and bloodcourt/iron_fence: the same black stone and iron.
- src/art/camp/camp-arcane.png, its top row: the Infernal mustering grounds as the camp's overlook paints it (its lava rivers, its
  spiked black walls and towers, its glowing horned gate and its circles of fire). Match its look closely.
- src/art/areas/volcano/top1.png and src/art/areas/volcano/side.png: the volcano land's ground and cliffs as the game draws them today.
- docs/samples/assault-art/template-props-1024.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/infernal-kit.jpg > /tmp/infernal-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

Style: detailed painted pixel art, exactly like the Blood Court and Dwarves kits. Crisp dark outlines, chunky readable shapes, a
palette of black obsidian, charcoal basalt, ash grey, dark iron and deep red, with the orange and yellow glow of lava and fire as the
accent. It must read clearly when shown at a quarter of this size on a phone.

The angle and scale, exactly:
- True 2:1 isometric (dimetric) view, no perspective: a flat square tile on the ground is a diamond exactly twice as wide as it is
  tall, its corners pointing up, right, down and left. Vertical edges stay vertical.
- ONE TILE = a diamond 128 px wide and 64 px tall. ONE HEIGHT STEP = 24 px.
- Light from the upper left: faces turned to the lower left are lit; faces turned to the lower right are in shade.
- "Along u" means running from the upper left down to the lower right (like "\"). Every run on this sheet runs along u, passing
  through its tile from the midpoint of the diamond's upper-left edge to the midpoint of its lower-right edge, so that pieces placed on
  neighbouring tiles join seamlessly at those points. (The game mirrors them for runs going the other way.)
- The hold is drawn under a smoky red sky: the black stone lit from below by lava, fire and glowing cracks; ash drifting.
- Nothing is holy or written: any carving is a jagged pattern, horns or spikes, never letters, numbers or real-world symbols.
- The wall stands about 4 steps (96 px) tall: courses of black obsidian blocks with glowing red cracks between them, a crest of long
  iron spikes, jagged horn-like points at intervals.
- The OUTER face is the one turned to the viewer's lower left: the spikes and a hanging red banner. The INNER face (cell 5) is the back
  of the same wall: an iron walkway on brackets, chains and a brazier.

The sheet: 1024 x 1024 px, a 4 x 4 grid of 256 x 256 cells, read left to right, top to bottom. Every piece has a ONE-TILE footprint:
its diamond's centre (the foot point) is at (128, 208) inside its cell. Keep each piece inside its own cell with 8 px to spare.

1. Wall run, outer face, whole: black obsidian courses, glowing cracks, the iron spike crest, a red banner.
2. The same run, battered: blocks chipped and split, spikes bent, the cracks glowing brighter, arrows against it.
3. The same run, broken: smashed down to a jagged stump about 1.5 steps high, blocks and spikes fallen across, embers. Still a barrier.
4. The breach: no wall left. A ramp of tumbled obsidian and cinders sloping down to the lower left, as if into a ditch. Walkable.
5. Wall run, inner face, whole: the back of cell 1. An iron walkway on brackets a step and a half up, chains, a brazier.
6. Corner, south (the corner nearest the viewer): two runs meet at the bottom of the tile, one running up-left and one up-right, both
   showing their OUTER faces, round a spiked pier crowned with a pair of black horns.
7. Corner, north (the far corner): two runs meet at the top of the tile, going down-left and down-right, both showing their INNER faces,
   round a pier with a brazier on it.
8. Corner, east: a run coming from the upper left meets a run going down to the lower left at the tile's right corner. The first shows
   its inner face and the second its outer face. A spiked pier at the corner.
9. Gate post: a tall jagged obsidian spire, taller than the wall, glowing cracks up it and fire at its tip. It ends a run beside a gate.
10. Sally port, one tile wide, whole: a narrow doorway with an iron door studded with spikes, set in the run, outer face.
11. The sally port, battered: the iron dented and glowing hot.
12. The sally port, broken: the door torn off and lying on the ground. Passable.
13. Barricade (the chain bridge's fort): a low wall, chest-high (about 2 steps), of black blocks, iron spikes and a wrecked cart, a
    few spears planted out front. Runs along u.
14. The barricade, broken: scattered blocks and iron, low enough to step over.
15. Spike field: a cluster of iron spikes and jagged obsidian shards set in the ground, leaning out to the lower left, about 1.5 steps
    high. Fills most of the tile.
16. Stake line: a single row of sharpened stakes across the tile along u, leaning out to the lower left, about 2 steps high.
```

## Prompt 2: INF-02, the ring's two great gates, in their siege states, and the gate towers' tops

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Infernal Host's: Brimstone Gate, a fortress of the pit among volcanic crags: a river of lava crossed by a bridge of black iron and
chains, a ring of spiked obsidian walls, circles of fire where imps chant up the host's fury, an inner wall of black basalt veined with
glowing cracks, and at its heart the Demon Spire, a tower of jagged black stone crowned with horns and lit red from within.
This task paints ONE sheet: the ring's two great gates, in their siege states, and the gate towers' tops.

Rules for this task:
- Branch: art/assault-infernal. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/infernal/inf-02-gates.png. Change no other file.
- Size: the image tool's own output size does not matter (it often gives 1254 x 1254 or another size). Paint the pieces at whatever size
  it gives, then with Pillow cut each piece out, scale it so it fills its cell like the Orc sheet's matching piece, and pack the pieces
  into a new transparent canvas of exactly the size below, each in its own cell near its foot point. That is expected, not a failure:
  placement and scale only need to be close, because the game's cutter re-anchors every piece. Never stop because of the size.
- Pull request into main titled "Assault art: Brimstone Gate". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG). Each piece casts only a small soft contact shadow on its own footprint.

Open these files first and match them:
- docs/samples/assault-art/infernal-kit.jpg: the Blood Court and Dwarves kits (Chronos Settlement's isometric kits), labelled. Your
  pieces stand beside these on the map, so match them exactly: the Blood Court's black stone, wrought iron and deep red, the Dwarves'
  heavy forges and rough rock, and the red and orange glow of fire and lava.
  Above all bloodcourt/gatehouse and bloodcourt/iron_fence.
- src/art/camp/camp-arcane.png, its top row: the Infernal mustering grounds as the camp's overlook paints it (its lava rivers, its
  spiked black walls and towers, its glowing horned gate and its circles of fire). Match its look closely.
- src/art/areas/volcano/top1.png and src/art/areas/volcano/side.png: the volcano land's ground and cliffs as the game draws them today.
- docs/samples/assault-art/template-buildings-1536.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/infernal-kit.jpg > /tmp/infernal-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

Style: detailed painted pixel art, exactly like the Blood Court and Dwarves kits. Crisp dark outlines, chunky readable shapes, a
palette of black obsidian, charcoal basalt, ash grey, dark iron and deep red, with the orange and yellow glow of lava and fire as the
accent. It must read clearly when shown at a quarter of this size on a phone.

The angle and scale, exactly:
- True 2:1 isometric (dimetric) view, no perspective: a flat square tile on the ground is a diamond exactly twice as wide as it is
  tall, its corners pointing up, right, down and left. Vertical edges stay vertical.
- ONE TILE = a diamond 128 px wide and 64 px tall. ONE HEIGHT STEP = 24 px.
- Light from the upper left: faces turned to the lower left are lit; faces turned to the lower right are in shade.
- The hold is drawn under a smoky red sky: the black stone lit from below by lava, fire and glowing cracks; ash drifting.
- Nothing is holy or written: any carving is a jagged pattern, horns or spikes, never letters, numbers or real-world symbols.
- The ring's wall is about 4 steps (96 px) tall; a gate's sides stand flush with it and may rise higher (a gate tower).
- The gates run along u (from the upper left down to the lower right, like "\"); the game mirrors them.

The sheet: 1536 x 1024 px, a 3 x 2 grid of 512 x 512 cells, read left to right, top to bottom. The foot point (the centre of the
footprint diamond) is at (256, 416) in every cell. Footprints: cells 1 to 4 are 2 tiles along u by 1 through (a diamond 192 x 96); cells 5 and 6 are 2 x 2 tiles (a diamond 256 x 128). Keep each piece inside its cell with 8 px to spare.

1. The Brimstone Gate (the south gate), whole, outer face to the lower left: a gateway of black obsidian under a great arch of two curved
   horns meeting at the top, a portcullis of red-hot iron glowing in the passage, braziers of green-yellow brimstone fire either side, red
   banners, spikes along its top.
2. The same Brimstone Gate, battered: the portcullis bent and dimmed, a horn chipped, blocks cracked, arrows against the iron.
3. The same Brimstone Gate, broken: the portcullis torn down and lying flat, the horned arch still standing, the passage open and walkable,
   rubble at the sides (not in the passage).
4. The North Gate, whole, INNER face to the lower left (it stands on the ring's far side): the same build seen from inside, with its
   chain winch and a brazier.
5. The North Gate, broken (inner face): the chains snapped, the gate hanging open, passable.
6. A gate tower's top: what stands on top of a 2 x 2 obsidian gate tower that the game raises: a spiked parapet, a great iron horn on a
   stand, a red banner on a pole, a brazier of fire.
```

## Prompt 3: INF-03, the basalt wall's great Infernal Gate, the postern and the corner towers' tops

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Infernal Host's: Brimstone Gate, a fortress of the pit among volcanic crags: a river of lava crossed by a bridge of black iron and
chains, a ring of spiked obsidian walls, circles of fire where imps chant up the host's fury, an inner wall of black basalt veined with
glowing cracks, and at its heart the Demon Spire, a tower of jagged black stone crowned with horns and lit red from within.
This task paints ONE sheet: the basalt wall's great Infernal Gate, the postern and the corner towers' tops.

Rules for this task:
- Branch: art/assault-infernal. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/infernal/inf-03-infernal-gate.png. Change no other file.
- Size: the image tool's own output size does not matter (it often gives 1254 x 1254 or another size). Paint the pieces at whatever size
  it gives, then with Pillow cut each piece out, scale it so it fills its cell like the Orc sheet's matching piece, and pack the pieces
  into a new transparent canvas of exactly the size below, each in its own cell near its foot point. That is expected, not a failure:
  placement and scale only need to be close, because the game's cutter re-anchors every piece. Never stop because of the size.
- Pull request into main titled "Assault art: Brimstone Gate". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG). Each piece casts only a small soft contact shadow on its own footprint.

Open these files first and match them:
- docs/samples/assault-art/infernal-kit.jpg: the Blood Court and Dwarves kits (Chronos Settlement's isometric kits), labelled. Your
  pieces stand beside these on the map, so match them exactly: the Blood Court's black stone, wrought iron and deep red, the Dwarves'
  heavy forges and rough rock, and the red and orange glow of fire and lava.
  Above all bloodcourt/gatehouse, bloodcourt/watchtower and dwarves/forge_fire.
- src/art/camp/camp-arcane.png, its top row: the Infernal mustering grounds as the camp's overlook paints it (its lava rivers, its
  spiked black walls and towers, its glowing horned gate and its circles of fire). Match its look closely.
- src/art/areas/volcano/top1.png and src/art/areas/volcano/side.png: the volcano land's ground and cliffs as the game draws them today.
- docs/samples/assault-art/template-buildings-1536.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/infernal-kit.jpg > /tmp/infernal-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

Style: detailed painted pixel art, exactly like the Blood Court and Dwarves kits. Crisp dark outlines, chunky readable shapes, a
palette of black obsidian, charcoal basalt, ash grey, dark iron and deep red, with the orange and yellow glow of lava and fire as the
accent. It must read clearly when shown at a quarter of this size on a phone.

The angle and scale, exactly:
- True 2:1 isometric (dimetric) view, no perspective: a flat square tile on the ground is a diamond exactly twice as wide as it is
  tall, its corners pointing up, right, down and left. Vertical edges stay vertical.
- ONE TILE = a diamond 128 px wide and 64 px tall. ONE HEIGHT STEP = 24 px.
- Light from the upper left: faces turned to the lower left are lit; faces turned to the lower right are in shade.
- The hold is drawn under a smoky red sky: the black stone lit from below by lava, fire and glowing cracks; ash drifting.
- Nothing is holy or written: any carving is a jagged pattern, horns or spikes, never letters, numbers or real-world symbols.
- The inner wall is a wall of black basalt in great blocks, veined with glowing orange cracks. It is exactly 6 steps (144 px) tall
  from the ground to its walkway, plus a parapet. The game draws the wall itself; the gates fill gaps in it, so each gate's front must
  be exactly 144 px tall to the walkway line, flush with the wall on either side, and may rise higher above it (a gate tower).
- The gates run along u (from the upper left down to the lower right, like "\"); the game mirrors them. The wall is 2 tiles thick.

The sheet: 1536 x 1024 px, a 3 x 2 grid of 512 x 512 cells, read left to right, top to bottom. The foot point (the centre of the
footprint diamond) is at (256, 416) in every cell. Footprints: cells 1 to 3 are 2 x 2 tiles (a diamond 256 x 128); cells 4 and 5 are 1 tile along the wall by 2 tiles through it (a diamond 192 x 96); cell 6 is 3 x 3 tiles (a diamond 384 x 192). Keep each piece inside its cell with 8 px to spare.

1. The Infernal Gate, whole, seen from OUTSIDE (outer face to the lower left): a gatehouse of black basalt 6 steps tall, its deep passage
   shut by twin doors of dark iron worked with jagged patterns, glowing red-hot at their seams, a horned face of stone above the arch
   with fire in its eyes, lava trickling down channels either side, and above the walkway a jagged spiked tower. The strongest-looking
   thing on the map.
2. The same Infernal Gate, battered: the doors dented and white-hot at the seams, the stone face cracked, blocks split round the passage.
3. The same Infernal Gate, broken: the doors torn apart and thrown aside, the passage open and walkable, rubble and twisted iron at the
   sides (not in the passage), the tower above cracked but standing.
4. The postern, whole, seen from INSIDE (inner face to the lower left): a low doorway through the 2-thick wall, an iron door, a brazier.
   Flush with the wall, 6 steps tall.
5. The postern, broken: the door torn off and lying on the stones, the opening walkable.
6. Corner tower top: the top of a basalt tower that the game raises as a 3 x 3 column (draw only what stands on its top): a platform
   ringed by a spiked parapet about 1.5 steps high, a big brazier of fire, a red banner, jagged horns on the corners.
```

## Prompt 4: INF-04, the flat face textures the game shears onto every cliff, bank and wall

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Infernal Host's: Brimstone Gate, a fortress of the pit among volcanic crags: a river of lava crossed by a bridge of black iron and
chains, a ring of spiked obsidian walls, circles of fire where imps chant up the host's fury, an inner wall of black basalt veined with
glowing cracks, and at its heart the Demon Spire, a tower of jagged black stone crowned with horns and lit red from within.
This task paints ONE sheet: the flat face textures the game shears onto every cliff, bank and wall.

Rules for this task:
- Branch: art/assault-infernal. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/infernal/inf-04-faces.png. Change no other file.
- Size: the image tool's own output size does not matter (it often gives 1254 x 1254 or another size). Paint the pieces at whatever size
  it gives, then with Pillow cut each piece out, scale it so it fills its cell like the Orc sheet's matching piece, and pack the pieces
  into a new transparent canvas of exactly the size below, each in its own cell near its foot point. That is expected, not a failure:
  placement and scale only need to be close, because the game's cutter re-anchors every piece. Never stop because of the size.
- Pull request into main titled "Assault art: Brimstone Gate". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered column.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Opaque textures; leave only the unused bottom band of each column (y 480 to 512) transparent. Lip edges may have a transparent
  ragged top (cinders, spikes, parapet).

Open these files first and match them:
- docs/samples/assault-art/infernal-kit.jpg: the Blood Court and Dwarves kits (Chronos Settlement's isometric kits), labelled. Your
  pieces stand beside these on the map, so match them exactly: the Blood Court's black stone, wrought iron and deep red, the Dwarves'
  heavy forges and rough rock, and the red and orange glow of fire and lava.
- src/art/camp/camp-arcane.png, its top row: the Infernal mustering grounds as the camp's overlook paints it (its lava rivers, its
  spiked black walls and towers, its glowing horned gate and its circles of fire). Match its look closely.
- src/art/areas/volcano/top1.png and src/art/areas/volcano/side.png: the volcano land's ground and cliffs as the game draws them today.
- src/art/areas/volcano/side.png: today's tiny side strip, which these replace.
- docs/samples/assault-art/template-faces-1536.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/infernal-kit.jpg > /tmp/infernal-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

THE VIEW IS STRAIGHT-ON, NOT ISOMETRIC: draw each face as a flat elevation, as if standing square in front of the wall, with no
perspective and no skew. The game skews it. Light from the upper left, evenly across the face (the game adds the shading for which
side it is on). Style: painted pixel art matching the Blood Court and Dwarves kits, chunky and readable.

The sheet: 1536 x 1024 px, 6 columns of 256 px, in two rows of 512 px: twelve columns, numbered left to right along the top row
(1 to 6), then the bottom row (7 to 12). Each column is one face set, 256 px wide (the length of one tile's edge), and must tile
seamlessly LEFT TO RIGHT with itself. Inside each column, from its top:
- the LIP, y 0 to 80 (one height step): the face's top edge, what overhangs or crowns it;
- the BODY, y 80 to 400 (four steps of 80 px): the face itself; it must tile seamlessly UP AND DOWN and left to right, because the
  game repeats it for walls of any height;
- the FOOT, y 400 to 480 (one step): where the face meets the ground;
- y 480 to 512: empty.
The lip's bottom must flow into the body's top, and the body's bottom into the foot's top, with no seam.

1. Volcanic crag: dark grey rock in rough layers with ash in the cracks; lip: a crust of cinders; foot: scree and ash.
2. Cinder bank: loose black cinders and pumice; lip: ash; foot: gravel of cinders.
3. Ditch bank: hard black crust with old iron stakes in it; lip: trampled edge; foot: a line of dull embers.
4. Earth rampart faced with slag: packed ash and earth held by slabs of slag; lip: the top with spikes; foot: cinders.
5. Spike wall skin: black obsidian courses with glowing red cracks; lip: the iron spike crest (ragged, transparent between the spikes);
   foot: blocks bedded in cinders.
6. Basalt wall: great black basalt blocks veined with glowing orange cracks; lip: a spiked parapet (ragged, transparent between); foot:
   a plinth course.
7. The same basalt wall, battle-damaged: split and missing blocks, the cracks flaring, soot; lip: broken parapet; foot: rubble.
8. Corner tower masonry: smaller black blocks, an arrow slit in the body's middle, a band of jagged pattern; lip: a stone ledge; foot: a
   sloped plinth.
9. Spire terrace wall: smooth black stone with a red-lit seam along it; lip: a flagstone edge; foot: flagstones.
10. Obsidian cliff: glassy black rock in sharp facets catching red light; lip: jagged edge; foot: shards.
11. Lava channel wall: dark rock scorched orange at its base, a crust of cooling lava low down; lip: cinders; foot: glowing crust.
12. Lavafall rock: dark rock behind a thin falling sheet of glowing lava; lip: lava spilling over the edge; foot: bright splash.
```

## Prompt 5: INF-05, sixteen seamless ground textures, from the cinder fields to the lava

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Infernal Host's: Brimstone Gate, a fortress of the pit among volcanic crags: a river of lava crossed by a bridge of black iron and
chains, a ring of spiked obsidian walls, circles of fire where imps chant up the host's fury, an inner wall of black basalt veined with
glowing cracks, and at its heart the Demon Spire, a tower of jagged black stone crowned with horns and lit red from within.
This task paints ONE sheet: sixteen seamless ground textures, from the cinder fields to the lava.

Rules for this task:
- Branch: art/assault-infernal. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/infernal/inf-05-ground.png. Change no other file.
- Size: the image tool's own output size does not matter (it often gives 1254 x 1254 or another size). Paint the pieces at whatever size
  it gives, then with Pillow cut each piece out, scale it so it fills its cell like the Orc sheet's matching piece, and pack the pieces
  into a new transparent canvas of exactly the size below, each in its own cell near its foot point. That is expected, not a failure:
  placement and scale only need to be close, because the game's cutter re-anchors every piece. Never stop because of the size.
- Pull request into main titled "Assault art: Brimstone Gate". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Opaque image.

Open these files first and match them:
- src/art/areas/volcano/top1.png and src/art/areas/volcano/top2.png: today's 64 px tops, which these replace (keep their pixel density:
  64 px a tile).
- docs/samples/assault-art/infernal-kit.jpg: the kits' bloodcourt/cobble_tile, bloodcourt/dirt_tile, dwarves/rocky_tile and
  dwarves/flagstone_tile give the colours to match.
- src/art/camp/camp-arcane.png, its top row: the Infernal mustering grounds as the overlook paints them.
- docs/samples/assault-art/template-textures-1024.png: the grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/infernal-kit.jpg > /tmp/infernal-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

THE VIEW IS STRAIGHT DOWN, NOT ISOMETRIC: draw each texture as seen from directly above, like a map, with no perspective, no horizon
and no cast shadows longer than a pebble's. Style: painted pixel art matching the kits' ground tiles; readable, not noisy; no single
feature so striking that its repeat would be noticed.

The sheet: 1024 x 1024 px, a 4 x 4 grid of 256 x 256 squares, read left to right, top to bottom. EACH SQUARE IS ONE TEXTURE COVERING
4 x 4 TILES, AND MUST TILE SEAMLESSLY WITH ITSELF ON ALL FOUR SIDES (its left edge continues its right edge, its top its bottom).
Keep the squares separate: nothing crosses from one square into the next.

1. Ash field: grey volcanic ash with dark grains and small stones.
2. Ash field, second variant: the same, with a few tough black thorny weeds.
3. Cinders and rock: loose black cinders and jagged rocks, for the waste behind the hold.
4. Trampled ash: ash trodden with clawed and hoofed prints, round the posts.
5. Dark crust: hard black volcanic crust, cracked.
6. Dark crust, second variant: the same, with thin glowing cracks here and there.
7. Churned cinder mud: dark wet cinders and ruts, for the lanes and the ditch floor.
8. Scorched ground: blackened, smoking earth.
9. Hot ash: grey ash with orange embers.
10. Packed black earth: the yards, trodden hard, flecked with sulphur yellow.
11. Black cobbles: rough dark cobbles.
12. Basalt flags: big black basalt slabs with red-lit joints.
13. Wall-walk grating: heavy iron grating seen from above, running from the top of the square to the bottom, a glow beneath it.
14. Obsidian shards: broken glassy black stone.
15. Cooling crust: a dark crust over lava, glowing orange in a web of cracks (the lava river's edge and its fords).
16. Molten lava: bright orange and yellow lava with darker floating crust, slow swirls (the river itself).
```

## Prompt 6: INF-06, the overlays the game lays where two grounds meet

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Infernal Host's: Brimstone Gate, a fortress of the pit among volcanic crags: a river of lava crossed by a bridge of black iron and
chains, a ring of spiked obsidian walls, circles of fire where imps chant up the host's fury, an inner wall of black basalt veined with
glowing cracks, and at its heart the Demon Spire, a tower of jagged black stone crowned with horns and lit red from within.
This task paints ONE sheet: the overlays the game lays where two grounds meet.

Rules for this task:
- Branch: art/assault-infernal. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/infernal/inf-06-transitions.png. Change no other file.
- Size: the image tool's own output size does not matter (it often gives 1254 x 1254 or another size). Paint the pieces at whatever size
  it gives, then with Pillow cut each piece out, scale it so it fills its cell like the Orc sheet's matching piece, and pack the pieces
  into a new transparent canvas of exactly the size below, each in its own cell near its foot point. That is expected, not a failure:
  placement and scale only need to be close, because the game's cutter re-anchors every piece. Never stop because of the size.
- Pull request into main titled "Assault art: Brimstone Gate". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG): each overlay is the material only, and everything else is transparent.

Open these files first and match them:
- art-source/assault/infernal/inf-05-ground.png on this branch, if it is there: the ground textures these overlays must match exactly in
  colour and pixel density. If it is not there yet, match the descriptions below and src/art/areas/volcano/top1.png.
- docs/samples/assault-art/template-textures-1024.png: the grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/infernal-kit.jpg > /tmp/infernal-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

Where two grounds meet (crust beside ash, a path's edge), the game lays an overlay along the shared edge so the join is ragged and
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

1. Cinder mud spreading onto ash: edge.         2. The same: outer corner.
3. Scorched ground and hot ash: edge.           4. The same: outer corner.
5. Black cobbles meeting ash: edge.             6. The same: outer corner.
7. A trodden path's edge over ash: edge.        8. The same: outer corner.
9. Obsidian shards onto ash: edge.              10. The same: outer corner.
11. Basalt flags sinking into crust: edge.      12. The same: outer corner.
13. Cinders creeping onto crust: edge.          14. The same: outer corner.
15. The lava's edge: a thin rim of dark cooling crust glowing at its cracks, laid on the lava side of a bank: edge.
16. The same: outer corner.
```

## Prompt 7: INF-07, the Demon Spire, the burning throne and the great banner

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Infernal Host's: Brimstone Gate, a fortress of the pit among volcanic crags: a river of lava crossed by a bridge of black iron and
chains, a ring of spiked obsidian walls, circles of fire where imps chant up the host's fury, an inner wall of black basalt veined with
glowing cracks, and at its heart the Demon Spire, a tower of jagged black stone crowned with horns and lit red from within.
This task paints ONE sheet: the Demon Spire, the burning throne and the great banner.

Rules for this task:
- Branch: art/assault-infernal. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/infernal/inf-07-keep.png. Change no other file.
- Size: the image tool's own output size does not matter (it often gives 1254 x 1254 or another size). Paint the pieces at whatever size
  it gives, then with Pillow cut each piece out, scale it so it fills its cell like the Orc sheet's matching piece, and pack the pieces
  into a new transparent canvas of exactly the size below, each in its own cell near its foot point. That is expected, not a failure:
  placement and scale only need to be close, because the game's cutter re-anchors every piece. Never stop because of the size.
- Pull request into main titled "Assault art: Brimstone Gate". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG). Each piece casts only a small soft contact shadow on its own footprint.

Open these files first and match them:
- docs/samples/assault-art/infernal-kit.jpg: the Blood Court and Dwarves kits (Chronos Settlement's isometric kits), labelled. Your
  pieces stand beside these on the map, so match them exactly: the Blood Court's black stone, wrought iron and deep red, the Dwarves'
  heavy forges and rough rock, and the red and orange glow of fire and lava.
  Above all bloodcourt/chapel, bloodcourt/gatehouse and bloodcourt/watchtower.
- src/art/camp/camp-arcane.png, its top row: the Infernal mustering grounds as the camp's overlook paints it (its lava rivers, its
  spiked black walls and towers, its glowing horned gate and its circles of fire). Match its look closely.
- src/art/areas/volcano/top1.png and src/art/areas/volcano/side.png: the volcano land's ground and cliffs as the game draws them today.
- docs/samples/assault-art/template-keep-1536.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/infernal-kit.jpg > /tmp/infernal-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

Style: detailed painted pixel art, exactly like the Blood Court and Dwarves kits. Crisp dark outlines, chunky readable shapes, a
palette of black obsidian, charcoal basalt, ash grey, dark iron and deep red, with the orange and yellow glow of lava and fire as the
accent. It must read clearly when shown at a quarter of this size on a phone.

The angle and scale, exactly:
- True 2:1 isometric (dimetric) view, no perspective: a flat square tile on the ground is a diamond exactly twice as wide as it is
  tall, its corners pointing up, right, down and left. Vertical edges stay vertical.
- ONE TILE = a diamond 128 px wide and 64 px tall. ONE HEIGHT STEP = 24 px.
- Light from the upper left: faces turned to the lower left are lit; faces turned to the lower right are in shade.
- The hold is drawn under a smoky red sky: the black stone lit from below by lava, fire and glowing cracks; ash drifting.
- Nothing is holy or written: any carving is a jagged pattern, horns or spikes, never letters, numbers or real-world symbols.
- A doorway is about 4 steps (96 px) tall.

The sheet: 1536 x 1024 px. Three cells:
1. Cell 1, x 0 to 1024, y 0 to 1024: THE DEMON SPIRE. Footprint 6 tiles along u (upper left to lower right) by 4 tiles along v: a
   diamond 640 px wide and 320 px tall, centred on the foot point (512, 840). It may rise up to about 640 px above its foot.
   A fortress-tower of jagged black obsidian rising in sharp tiers to a spire crowned with two vast curving horns, a tall arched doorway
   facing the lower left blazing red from within, glowing cracks running up its walls, lava pouring from spouts into channels round its
   base, iron spikes on every edge, red banners, braziers of fire on the stair before it. Grander than anything else on the map.
2. Cell 2, x 1024 to 1536, y 0 to 512: THE BURNING THRONE. One-tile footprint (a diamond 128 x 64) centred on the foot point (256, 440)
   in the cell. A great seat of black iron and obsidian, its high back a fan of spikes and horns about 6 steps tall, flames licking up
   from its base, two braziers on the two-step dais. Facing the lower left.
3. Cell 3, x 1024 to 1536, y 512 to 1024: THE GREAT BANNER. One-tile footprint centred on (256, 440) in the cell. A tall pole (about
   14 steps) of black iron in a base of obsidian, a crossbar hung with a long red banner painted with a black horned shape (no symbol),
   tattered and scorched at the bottom, a spiked crown on top.
```

## Prompt 8: INF-08, the basalt wall's dressing, the stairs and small structures

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Infernal Host's: Brimstone Gate, a fortress of the pit among volcanic crags: a river of lava crossed by a bridge of black iron and
chains, a ring of spiked obsidian walls, circles of fire where imps chant up the host's fury, an inner wall of black basalt veined with
glowing cracks, and at its heart the Demon Spire, a tower of jagged black stone crowned with horns and lit red from within.
This task paints ONE sheet: the basalt wall's dressing, the stairs and small structures.

Rules for this task:
- Branch: art/assault-infernal. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/infernal/inf-08-wall-dressing.png. Change no other file.
- Size: the image tool's own output size does not matter (it often gives 1254 x 1254 or another size). Paint the pieces at whatever size
  it gives, then with Pillow cut each piece out, scale it so it fills its cell like the Orc sheet's matching piece, and pack the pieces
  into a new transparent canvas of exactly the size below, each in its own cell near its foot point. That is expected, not a failure:
  placement and scale only need to be close, because the game's cutter re-anchors every piece. Never stop because of the size.
- Pull request into main titled "Assault art: Brimstone Gate". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG). Each piece casts only a small soft contact shadow on its own footprint.

Open these files first and match them:
- docs/samples/assault-art/infernal-kit.jpg: the Blood Court and Dwarves kits (Chronos Settlement's isometric kits), labelled. Your
  pieces stand beside these on the map, so match them exactly: the Blood Court's black stone, wrought iron and deep red, the Dwarves'
  heavy forges and rough rock, and the red and orange glow of fire and lava.
  Above all bloodcourt/brazier, bloodcourt/lantern_post and bloodcourt/banner.
- src/art/camp/camp-arcane.png, its top row: the Infernal mustering grounds as the camp's overlook paints it (its lava rivers, its
  spiked black walls and towers, its glowing horned gate and its circles of fire). Match its look closely.
- src/art/areas/volcano/top1.png and src/art/areas/volcano/side.png: the volcano land's ground and cliffs as the game draws them today.
- docs/samples/assault-art/template-props-1024.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/infernal-kit.jpg > /tmp/infernal-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

Style: detailed painted pixel art, exactly like the Blood Court and Dwarves kits. Crisp dark outlines, chunky readable shapes, a
palette of black obsidian, charcoal basalt, ash grey, dark iron and deep red, with the orange and yellow glow of lava and fire as the
accent. It must read clearly when shown at a quarter of this size on a phone.

The angle and scale, exactly:
- True 2:1 isometric (dimetric) view, no perspective: a flat square tile on the ground is a diamond exactly twice as wide as it is
  tall, its corners pointing up, right, down and left. Vertical edges stay vertical.
- ONE TILE = a diamond 128 px wide and 64 px tall. ONE HEIGHT STEP = 24 px.
- Light from the upper left: faces turned to the lower left are lit; faces turned to the lower right are in shade.
- The hold is drawn under a smoky red sky: the black stone lit from below by lava, fire and glowing cracks; ash drifting.
- Nothing is holy or written: any carving is a jagged pattern, horns or spikes, never letters, numbers or real-world symbols.
- The basalt wall's walkway is 6 steps up; these pieces stand on it or against it.

The sheet: 1024 x 1024 px, a 4 x 4 grid of 256 x 256 cells, read left to right, top to bottom. Every piece has a ONE-TILE footprint:
its diamond's centre (the foot point) is at (128, 208) inside its cell. Keep each piece inside its own cell with 8 px to spare.

1. Spiked merlon: one black merlon with an iron spike, for the wall's outer edge, along u.
2. The same merlon, broken: snapped off, lying on the walk.
3. Inner rail: a low iron rail along the walk's inner edge, along u.
4. Wall brazier: an iron basket of fire on a spiked stand, for the walk (about 2 steps tall).
5. Wall torch: a torch in a horned iron bracket.
6. A small hanging banner: a red cloth on a short iron pole.
7. Archer's hood: a spiked iron shelter over a gap in the parapet.
8. A rack of barbed spears and pitchforks.
9. Stairs up the wall, along u: black stone steps rising 6 steps (144 px) from the ground at the lower left to the walk. One tile.
10. Stairs down, the same steps seen descending to the lower right (the game uses it where a stair goes down into a pit).
11. An iron ladder against a wall to the upper right, about 6 steps tall.
12. A cauldron of bubbling lava on the walk.
13. A heap of chains and shackles.
14. A great iron horn on a stand.
15. A pile of glowing coals in an iron cradle.
16. A drift of ash against the wall, with a broken shield.
```

## Prompt 9: INF-09, the fire circles (the hold's war drums) and its landmarks

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Infernal Host's: Brimstone Gate, a fortress of the pit among volcanic crags: a river of lava crossed by a bridge of black iron and
chains, a ring of spiked obsidian walls, circles of fire where imps chant up the host's fury, an inner wall of black basalt veined with
glowing cracks, and at its heart the Demon Spire, a tower of jagged black stone crowned with horns and lit red from within.
This task paints ONE sheet: the fire circles (the hold's war drums) and its landmarks.

Rules for this task:
- Branch: art/assault-infernal. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/infernal/inf-09-landmarks.png. Change no other file.
- Size: the image tool's own output size does not matter (it often gives 1254 x 1254 or another size). Paint the pieces at whatever size
  it gives, then with Pillow cut each piece out, scale it so it fills its cell like the Orc sheet's matching piece, and pack the pieces
  into a new transparent canvas of exactly the size below, each in its own cell near its foot point. That is expected, not a failure:
  placement and scale only need to be close, because the game's cutter re-anchors every piece. Never stop because of the size.
- Pull request into main titled "Assault art: Brimstone Gate". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG). Each piece casts only a small soft contact shadow on its own footprint.

Open these files first and match them:
- docs/samples/assault-art/infernal-kit.jpg: the Blood Court and Dwarves kits (Chronos Settlement's isometric kits), labelled. Your
  pieces stand beside these on the map, so match them exactly: the Blood Court's black stone, wrought iron and deep red, the Dwarves'
  heavy forges and rough rock, and the red and orange glow of fire and lava.
  Above all bloodcourt/brazier and dwarves/forge_fire.
- src/art/camp/camp-arcane.png, its top row: the Infernal mustering grounds as the camp's overlook paints it (its lava rivers, its
  spiked black walls and towers, its glowing horned gate and its circles of fire). Match its look closely.
- src/art/areas/volcano/top1.png and src/art/areas/volcano/side.png: the volcano land's ground and cliffs as the game draws them today.
- docs/samples/assault-art/template-buildings-1536.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/infernal-kit.jpg > /tmp/infernal-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

Style: detailed painted pixel art, exactly like the Blood Court and Dwarves kits. Crisp dark outlines, chunky readable shapes, a
palette of black obsidian, charcoal basalt, ash grey, dark iron and deep red, with the orange and yellow glow of lava and fire as the
accent. It must read clearly when shown at a quarter of this size on a phone.

The angle and scale, exactly:
- True 2:1 isometric (dimetric) view, no perspective: a flat square tile on the ground is a diamond exactly twice as wide as it is
  tall, its corners pointing up, right, down and left. Vertical edges stay vertical.
- ONE TILE = a diamond 128 px wide and 64 px tall. ONE HEIGHT STEP = 24 px.
- Light from the upper left: faces turned to the lower left are lit; faces turned to the lower right are in shade.
- The hold is drawn under a smoky red sky: the black stone lit from below by lava, fire and glowing cracks; ash drifting.
- Nothing is holy or written: any carving is a jagged pattern, horns or spikes, never letters, numbers or real-world symbols.
- The fire circles play the part the orc hold's war drums do: while the imps chant in one, the host near it fights harder, until our
  troops reach it and break it.

The sheet: 1536 x 1024 px, a 3 x 2 grid of 512 x 512 cells, read left to right, top to bottom. The foot point (the centre of the
footprint diamond) is at (256, 416) in every cell. Footprints: cells 1 to 4 are 2 x 2 tiles (a diamond 256 x 128); cells 5 and 6 are 3 x 3 tiles (a diamond 384 x 192). Keep each piece inside its cell with 8 px to spare.

1. A fire circle, burning: a ring of black stones with iron braziers, a circle of fire burning on the ground inside it (a plain ring,
   no symbols), at the instant it flares: a column of orange flame and red rings of heat rising, embers whirling.
2. The same fire circle, broken: after our troops reached it: the stones scattered, the braziers kicked over, the ring of fire out and
   smoking.
3. The brimstone pit: a crater of yellow sulphur crystals and smoke, iron hooks round its edge.
4. The chain pillars: two tall black pillars hung with heavy chains and shackles.
5. The forge of the pit: a great anvil and forge glowing white-hot under a spiked iron hood, weapons cooling in a lava trough.
6. The lavafall: a black crag with a fall of lava pouring into a glowing pool, steam and sparks rising.
```

## Prompt 10: INF-10, the pit's small props the kits do not have

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Infernal Host's: Brimstone Gate, a fortress of the pit among volcanic crags: a river of lava crossed by a bridge of black iron and
chains, a ring of spiked obsidian walls, circles of fire where imps chant up the host's fury, an inner wall of black basalt veined with
glowing cracks, and at its heart the Demon Spire, a tower of jagged black stone crowned with horns and lit red from within.
This task paints ONE sheet: the pit's small props the kits do not have.

Rules for this task:
- Branch: art/assault-infernal. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/infernal/inf-10-props.png. Change no other file.
- Size: the image tool's own output size does not matter (it often gives 1254 x 1254 or another size). Paint the pieces at whatever size
  it gives, then with Pillow cut each piece out, scale it so it fills its cell like the Orc sheet's matching piece, and pack the pieces
  into a new transparent canvas of exactly the size below, each in its own cell near its foot point. That is expected, not a failure:
  placement and scale only need to be close, because the game's cutter re-anchors every piece. Never stop because of the size.
- Pull request into main titled "Assault art: Brimstone Gate". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG). Each piece casts only a small soft contact shadow on its own footprint.

Open these files first and match them:
- docs/samples/assault-art/infernal-kit.jpg: the Blood Court and Dwarves kits (Chronos Settlement's isometric kits), labelled. Your
  pieces stand beside these on the map, so match them exactly: the Blood Court's black stone, wrought iron and deep red, the Dwarves'
  heavy forges and rough rock, and the red and orange glow of fire and lava.
  The kits already give the barrels, the braziers, the carriages, the coffins, the dead oaks, the lantern posts, the rocks, the thorn
  bushes, the crates, the ore piles and the woodpiles: do not paint those again. These props go with them.
- src/art/camp/camp-arcane.png, its top row: the Infernal mustering grounds as the camp's overlook paints it (its lava rivers, its
  spiked black walls and towers, its glowing horned gate and its circles of fire). Match its look closely.
- src/art/areas/volcano/top1.png and src/art/areas/volcano/side.png: the volcano land's ground and cliffs as the game draws them today.
- docs/samples/assault-art/template-props-1024.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/infernal-kit.jpg > /tmp/infernal-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

Style: detailed painted pixel art, exactly like the Blood Court and Dwarves kits. Crisp dark outlines, chunky readable shapes, a
palette of black obsidian, charcoal basalt, ash grey, dark iron and deep red, with the orange and yellow glow of lava and fire as the
accent. It must read clearly when shown at a quarter of this size on a phone.

The angle and scale, exactly:
- True 2:1 isometric (dimetric) view, no perspective: a flat square tile on the ground is a diamond exactly twice as wide as it is
  tall, its corners pointing up, right, down and left. Vertical edges stay vertical.
- ONE TILE = a diamond 128 px wide and 64 px tall. ONE HEIGHT STEP = 24 px.
- Light from the upper left: faces turned to the lower left are lit; faces turned to the lower right are in shade.
- The hold is drawn under a smoky red sky: the black stone lit from below by lava, fire and glowing cracks; ash drifting.
- Nothing is holy or written: any carving is a jagged pattern, horns or spikes, never letters, numbers or real-world symbols.

The sheet: 1024 x 1024 px, a 4 x 4 grid of 256 x 256 cells, read left to right, top to bottom. Every piece has a ONE-TILE footprint:
its diamond's centre (the foot point) is at (128, 208) inside its cell. Keep each piece inside its own cell with 8 px to spare.

1. An imp's hovel: a small hut of black stone and iron, a red glow at its door.
2. A cage of black iron, empty, its door hanging open.
3. A heap of horned skulls.
4. A smoking vent in the ground, a ring of yellow sulphur round it.
5. A jagged obsidian spike, as tall as a man.
6. A pitchfork rack.
7. A black iron cauldron over a fire.
8. A pile of slag and cinders.
9. A chained boulder.
10. A charred, leafless tree glowing at its cracks.
11. A heap of sulphur crystals.
12. A cracked crust with lava showing through.
13. A clump of black thorny weed.
14. A small pile of ash and bones.
15. An iron post with a hanging lantern of red fire.
16. A fallen horned helm and a broken trident in the ash.
```

## Prompt 11: INF-11, ruins, and the burnt states of the host's camp

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Infernal Host's: Brimstone Gate, a fortress of the pit among volcanic crags: a river of lava crossed by a bridge of black iron and
chains, a ring of spiked obsidian walls, circles of fire where imps chant up the host's fury, an inner wall of black basalt veined with
glowing cracks, and at its heart the Demon Spire, a tower of jagged black stone crowned with horns and lit red from within.
This task paints ONE sheet: ruins, and the burnt states of the host's camp.

Rules for this task:
- Branch: art/assault-infernal. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/infernal/inf-11-ruins.png. Change no other file.
- Size: the image tool's own output size does not matter (it often gives 1254 x 1254 or another size). Paint the pieces at whatever size
  it gives, then with Pillow cut each piece out, scale it so it fills its cell like the Orc sheet's matching piece, and pack the pieces
  into a new transparent canvas of exactly the size below, each in its own cell near its foot point. That is expected, not a failure:
  placement and scale only need to be close, because the game's cutter re-anchors every piece. Never stop because of the size.
- Pull request into main titled "Assault art: Brimstone Gate". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG). Each piece casts only a small soft contact shadow on its own footprint.

Open these files first and match them:
- docs/samples/assault-art/infernal-kit.jpg: the Blood Court and Dwarves kits (Chronos Settlement's isometric kits), labelled. Your
  pieces stand beside these on the map, so match them exactly: the Blood Court's black stone, wrought iron and deep red, the Dwarves'
  heavy forges and rough rock, and the red and orange glow of fire and lava.
- src/art/camp/camp-arcane.png, its top row: the Infernal mustering grounds as the camp's overlook paints it (its lava rivers, its
  spiked black walls and towers, its glowing horned gate and its circles of fire). Match its look closely.
- src/art/areas/volcano/top1.png and src/art/areas/volcano/side.png: the volcano land's ground and cliffs as the game draws them today.
- docs/samples/assault-art/template-buildings-1536.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/infernal-kit.jpg > /tmp/infernal-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

Style: detailed painted pixel art, exactly like the Blood Court and Dwarves kits. Crisp dark outlines, chunky readable shapes, a
palette of black obsidian, charcoal basalt, ash grey, dark iron and deep red, with the orange and yellow glow of lava and fire as the
accent. It must read clearly when shown at a quarter of this size on a phone.

The angle and scale, exactly:
- True 2:1 isometric (dimetric) view, no perspective: a flat square tile on the ground is a diamond exactly twice as wide as it is
  tall, its corners pointing up, right, down and left. Vertical edges stay vertical.
- ONE TILE = a diamond 128 px wide and 64 px tall. ONE HEIGHT STEP = 24 px.
- Light from the upper left: faces turned to the lower left are lit; faces turned to the lower right are in shade.
- Our own siege works (the ladders, the ram, the trebuchet) are already painted on the Orc hold's sheets and serve every hold: do not
  paint them. The Warpath's reserve camp here is the host's camp on the ash road: its tents burn when our archers loose fire arrows.
- The hold is drawn under a smoky red sky: the black stone lit from below by lava, fire and glowing cracks; ash drifting.
- Nothing is holy or written: any carving is a jagged pattern, horns or spikes, never letters, numbers or real-world symbols.

The sheet: 1536 x 1024 px, a 3 x 2 grid of 512 x 512 cells, read left to right, top to bottom. The foot point (the centre of the
footprint diamond) is at (256, 416) in every cell. Footprints: cells 1 and 2 are 2 tiles along u by 1 (a diamond 192 x 96); cells 3 to 6 are 2 x 2 tiles (a diamond 256 x 128). Keep each piece inside its cell with 8 px to spare.

1. A war tent of the host: a long tent of dark red cloth over iron poles, spikes on its ridge, a brazier by the flap.
2. The same tent, burnt: a black heap of charred poles and cloth, ash, a few embers.
3. A great pavilion: a tall tent of black and red cloth with a spiked crown, lit from within.
4. The same pavilion, burnt: its iron frame standing, the cloth gone to ash.
5. A ruined old temple: black stone footings, a broken stair and two fallen pillars half sunk in cooled lava.
6. A collapsed watchtower: a toppled spiked tower lying in rubble.
```

## Prompt 12: INF-12, the lava river, its chain bridge, crust fords and banks

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Infernal Host's: Brimstone Gate, a fortress of the pit among volcanic crags: a river of lava crossed by a bridge of black iron and
chains, a ring of spiked obsidian walls, circles of fire where imps chant up the host's fury, an inner wall of black basalt veined with
glowing cracks, and at its heart the Demon Spire, a tower of jagged black stone crowned with horns and lit red from within.
This task paints ONE sheet: the lava river, its chain bridge, crust fords and banks.

Rules for this task:
- Branch: art/assault-infernal. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/infernal/inf-12-lava.png. Change no other file.
- Size: the image tool's own output size does not matter (it often gives 1254 x 1254 or another size). Paint the pieces at whatever size
  it gives, then with Pillow cut each piece out, scale it so it fills its cell like the Orc sheet's matching piece, and pack the pieces
  into a new transparent canvas of exactly the size below, each in its own cell near its foot point. That is expected, not a failure:
  placement and scale only need to be close, because the game's cutter re-anchors every piece. Never stop because of the size.
- Pull request into main titled "Assault art: Brimstone Gate". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG). Each piece casts only a small soft contact shadow on its own footprint.

Open these files first and match them:
- docs/samples/assault-art/infernal-kit.jpg: the Blood Court and Dwarves kits (Chronos Settlement's isometric kits), labelled. Your
  pieces stand beside these on the map, so match them exactly: the Blood Court's black stone, wrought iron and deep red, the Dwarves'
  heavy forges and rough rock, and the red and orange glow of fire and lava.
  Above all bloodcourt/stone_bridge and dwarves/stone_bridge, for the build.
- src/art/camp/camp-arcane.png, its top row: the Infernal mustering grounds as the camp's overlook paints it (its lava rivers, its
  spiked black walls and towers, its glowing horned gate and its circles of fire). Match its look closely.
- src/art/areas/volcano/top1.png and src/art/areas/volcano/side.png: the volcano land's ground and cliffs as the game draws them today.
- docs/samples/assault-art/template-props-1024.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/infernal-kit.jpg > /tmp/infernal-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

Style: detailed painted pixel art, exactly like the Blood Court and Dwarves kits. Crisp dark outlines, chunky readable shapes, a
palette of black obsidian, charcoal basalt, ash grey, dark iron and deep red, with the orange and yellow glow of lava and fire as the
accent. It must read clearly when shown at a quarter of this size on a phone.

The angle and scale, exactly:
- True 2:1 isometric (dimetric) view, no perspective: a flat square tile on the ground is a diamond exactly twice as wide as it is
  tall, its corners pointing up, right, down and left. Vertical edges stay vertical.
- ONE TILE = a diamond 128 px wide and 64 px tall. ONE HEIGHT STEP = 24 px.
- Light from the upper left: faces turned to the lower left are lit; faces turned to the lower right are in shade.
- Brimstone Gate has a river of lava where the Orc hold has its river. The game draws the lava as ground; these pieces stand in it or
  on its banks. The fords are where the lava has crusted over enough to cross.
- "Along u" means running from the upper left down to the lower right (like "\"). Every run on this sheet runs along u, passing
  through its tile from the midpoint of the diamond's upper-left edge to the midpoint of its lower-right edge, so that pieces placed on
  neighbouring tiles join seamlessly at those points. (The game mirrors them for runs going the other way.)
- The hold is drawn under a smoky red sky: the black stone lit from below by lava, fire and glowing cracks; ash drifting.
- Nothing is holy or written: any carving is a jagged pattern, horns or spikes, never letters, numbers or real-world symbols.

The sheet: 1024 x 1024 px, a 4 x 4 grid of 256 x 256 cells, read left to right, top to bottom. Every piece has a ONE-TILE footprint:
its diamond's centre (the foot point) is at (128, 208) inside its cell. Keep each piece inside its own cell with 8 px to spare.

1. Chain bridge deck, whole: plates of black iron hung on great chains, crossing along u, chain rails.
2. The bridge, broken: a gap of snapped chains and fallen plates. Impassable.
3. The bridge's end, where it meets the bank at the upper left, two spiked iron posts with the chains wound round them.
4. A bridge post: a spiked iron post with a brazier.
5. Crust stones: a line of dark crusted lava slabs along u, their tops above the glowing flow.
6. Sulphur crystals at the lava's edge.
7. A fallen black pillar lying across the lava, glowing where it touches.
8. A horned skull half sunk in the lava.
9. Scorched dark boulders at the edge.
10. A cage hung over the lava from a gibbet.
11. Cooled crust plates at the edge.
12. A burst of sparks and smoke rising from the lava (semi-transparent).
13. A sunken iron gate sticking out of the lava.
14. A small lavafall over a ledge, along u.
15. A steam vent.
16. Rough black steps going down to the lava from the bank at the upper left.
```

## Prompt 13: INF-13, sixteen ground decals

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Infernal Host's: Brimstone Gate, a fortress of the pit among volcanic crags: a river of lava crossed by a bridge of black iron and
chains, a ring of spiked obsidian walls, circles of fire where imps chant up the host's fury, an inner wall of black basalt veined with
glowing cracks, and at its heart the Demon Spire, a tower of jagged black stone crowned with horns and lit red from within.
This task paints ONE sheet: sixteen ground decals.

Rules for this task:
- Branch: art/assault-infernal. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/infernal/inf-13-decals.png. Change no other file.
- Size: the image tool's own output size does not matter (it often gives 1254 x 1254 or another size). Paint the pieces at whatever size
  it gives, then with Pillow cut each piece out, scale it so it fills its cell like the Orc sheet's matching piece, and pack the pieces
  into a new transparent canvas of exactly the size below, each in its own cell near its foot point. That is expected, not a failure:
  placement and scale only need to be close, because the game's cutter re-anchors every piece. Never stop because of the size.
- Pull request into main titled "Assault art: Brimstone Gate". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG).

Open these files first and match them:
- art-source/assault/infernal/inf-05-ground.png on this branch, if it is there: the ground these lie on (match its pixel density, 64 px
  a tile at quarter size). Otherwise src/art/areas/volcano/top1.png.
- docs/samples/assault-art/template-textures-1024.png: the grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/infernal-kit.jpg > /tmp/infernal-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

THE VIEW IS STRAIGHT DOWN, NOT ISOMETRIC, as on a map: everything lies flat on the ground, nothing stands up. Style: painted pixel
art matching the kits' ground; readable; blood is a dark red-brown, never bright or gory.

The sheet: 1024 x 1024 px, a 4 x 4 grid of 256 x 256 squares, read left to right, top to bottom. Each square holds ONE decal covering
up to 2 x 2 tiles, centred, with at least 16 px of transparency round it.

1. Blood spatter.   2. A pool of cooling lava (a small glowing splash).   3. A burnt crater.
4. Scorch mark, round (a blast).   5. Hot ash and embers.
6. Obsidian rubble scatter.   7. Iron debris (bent spikes, a broken chain).
8. Cart ruts: two parallel wheel tracks running straight from the square's top edge to its bottom edge (so they join end to end).
9. Clawed footprints: a trail of three-toed clawed prints crossing the square.   10. Burnt hoofprints.
11. A puddle of sulphur-yellow water.   12. Scattered sulphur crystals.
13. Scattered charred bones.   14. A dropped pitchfork's scorch line.
15. Glowing cracks.   16. Cracked basalt flags (cracks and a few broken corners, to lay over a stone floor).
```
