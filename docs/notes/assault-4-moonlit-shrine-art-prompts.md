# The Assault: ChatGPT prompts for the Yokai Night Parade's hold (the Moonlit Shrine)

Phase 4's seventh hold (`docs/design/assault-mode.md` on `claude/assault-design`, phase 4; the owner's name for it). The owner gave no look for
it, so it follows the camp's overlook, which already paints the Yokai's "Haunted shrine" (`src/art/camp/camp-arcane.png`, its middle row): a
mountain shrine under a full moon, vermilion halls and gates among blossoming trees and lanterns, a pond under a red arched bridge,
waterfalls, and violet spirit fire. It is built like the other holds, on the same engine and the same kinds of sheet, so these 13 prompts
mirror the Orc set sheet for sheet: the same canvases, grids, foot points, angles and formats, so the cutter (`tools/assault/cut-sheets.py`)
and the field's renderer take them as they took the Orc sheets. **They paint only what the packs and the Orc sheets cannot cover.** Until
they land, the hold is built on stand-ins: the Orc sheets' pieces, recoloured, and the kit pieces below.

**The hold.** A dark pond and stream where the others have their water, crossed by a vermilion arched bridge and two fords of stepping
stones; a ring of white plastered walls under dark tiled roofs, with the Vermilion Gate; the great war drums the night parade beats (the war
drums' part, here drums in earnest); a castle wall of fitted grey stone, with the Moon Gate; and the Shrine of the Moon at the heart, with
the Oni King's seat before it. No writing anywhere: lanterns, banners and plaques are plain or patterned.

**What the packs already give** (Chronos's Fae and Liches kits, `docs/samples/assault-art/yokai-kit.jpg`; cut straight in, as the Orc hold's
kit pieces were). Neither kit is drawn for this hold's buildings, so they lend it its trees, lanterns, glow and haunted stone, and the sheets
paint its halls:

- walls and gates as decoration: `fae/rose_hedge_run`, `twig_fence`, `flower_arch_gate`; `liches/iron_fence`, `gatehouse`;
- buildings: `fae/longhouse`, `cottage`, `tavern`, `spiral_watchtower`, `shrine`; `liches/chapel`, `watchtower`, `mausoleum`;
- goods: `fae/baskets`, `flower_bales`, `honey_jars`, `stockpile`; `liches/barrels`, `coffin_stack`;
- lights: `fae/light_lantern_post`, `blue_campfire`, `glow_bush`; `liches/lantern_post`, `witch_fire`;
- nature: `fae/weeping_willow`, `silver_birch`, `crystal_rocks`, `fairy_ring`; `liches/dead_pine`, `rocks`;
- the bridges: `fae/root_bridge`, `liches/stone_bridge`.

**What the Orc sheets already give every hold:** our own siege works (the ladders, the ram, the trebuchet), so no sheet here paints them.

**How to use them** (as for the other sets):

- Paste everything inside one fence into a new ChatGPT (Codex) conversation.
- Each prompt stands alone, and all of them add to the one branch, `art/assault-yokai`, under `art-source/assault/yokai/`, and the one pull
  request, "Assault art: the Moonlit Shrine".
- Each sheet is one image. If a sheet comes back wrong (the angle, the grid, a busy background), run the same prompt again. Allow two or
  three tries a sheet.
- ChatGPT adds the PNGs only. The builder cuts the sheets afterwards, credits them, and adds them to the service worker.

**The reference files the prompts name:**

- `docs/samples/assault-art/yokai-kit.jpg`: the Fae and Liches kit pieces, labelled (on `claude/assault-2` until it is merged);
- `docs/samples/assault-art/template-*.png`: the grids (on `claude/assault-art-plan` until it is merged);
- `src/art/camp/camp-arcane.png`, its middle row: the Haunted shrine as the overlook paints it;
- `src/art/areas/shrine/` and `src/art/areas/forest/`: those lands' tops and sides as the game draws them today.

Each prompt says how to fetch the files from those branches if they are missing on main.

| # | Sheet | File | Canvas | Cells | The Orc sheet it matches |
| --- | --- | --- | --- | --- | --- |
| 1 | YOK-01 The ring of plastered walls | `yok-01-tiled-wall.png` | 1024 x 1024 | 16 | ORC-01 the palisade |
| 2 | YOK-02 The ring's gates | `yok-02-gates.png` | 1536 x 1024 | 6 | ORC-02 the palisade's gates |
| 3 | YOK-03 The Moon Gate and the towers | `yok-03-moon-gate.png` | 1536 x 1024 | 6 | ORC-03 the Iron Gate |
| 4 | YOK-04 Cliff and wall faces | `yok-04-faces.png` | 1536 x 1024 | 12 | ORC-04 the faces |
| 5 | YOK-05 Ground textures | `yok-05-ground.png` | 1024 x 1024 | 16 | ORC-05 the ground |
| 6 | YOK-06 Ground transitions | `yok-06-transitions.png` | 1024 x 1024 | 16 | ORC-06 the transitions |
| 7 | YOK-07 The Shrine of the Moon and the seat | `yok-07-keep.png` | 1536 x 1024 | 3 | ORC-07 the keep |
| 8 | YOK-08 The wall's dressing and the stairs | `yok-08-wall-dressing.png` | 1024 x 1024 | 16 | ORC-08 the wall's dressing |
| 9 | YOK-09 The great war drums and the landmarks | `yok-09-landmarks.png` | 1536 x 1024 | 6 | ORC-09 the camp's big pieces (the drums) |
| 10 | YOK-10 The shrine's props | `yok-10-props.png` | 1024 x 1024 | 16 | ORC-10 the camp's props |
| 11 | YOK-11 Ruins and the parade's camp's burnt states | `yok-11-ruins.png` | 1536 x 1024 | 6 | ORC-11 siege works and ruins |
| 12 | YOK-12 The pond and stream | `yok-12-pond.png` | 1024 x 1024 | 16 | ORC-12 bridges, fords and the river |
| 13 | YOK-13 Ground decals | `yok-13-decals.png` | 1024 x 1024 | 16 | ORC-13 the decals |

They are ordered by what the hold needs first: its walls and gates, then its ground, then its heart and dressing.

---

## Prompt 1: YOK-01, the ring of white plastered walls under tiled roofs, in every state of the siege

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Yokai Night Parade's: the Moonlit Shrine, a haunted mountain shrine under a full moon: a dark pond and stream crossed by a vermilion
arched bridge, a ring of white plastered walls under dark tiled roofs, the great war drums the parade beats, a castle wall of fitted
grey stone, and at its heart the Shrine of the Moon, a many-roofed vermilion hall among blossoming trees and spirit lanterns.
This task paints ONE sheet: the ring of white plastered walls under tiled roofs, in every state of the siege.

Rules for this task:
- Branch: art/assault-yokai. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/yokai/yok-01-tiled-wall.png. Change no other file.
- Size: the image tool's own output size does not matter (it often gives 1254 x 1254 or another size). Paint the pieces at whatever size
  it gives, then with Pillow cut each piece out, scale it so it fills its cell like the Orc sheet's matching piece, and pack the pieces
  into a new transparent canvas of exactly the size below, each in its own cell near its foot point. That is expected, not a failure:
  placement and scale only need to be close, because the game's cutter re-anchors every piece. Never stop because of the size.
- Pull request into main titled "Assault art: the Moonlit Shrine". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG). Each piece casts only a small soft contact shadow on its own footprint.

Open these files first and match them:
- docs/samples/assault-art/yokai-kit.jpg: the Fae and Liches kits (Chronos Settlement's isometric kits), labelled. Your pieces stand
  beside these on the map, so match their drawing exactly (the outlines, the shading, the scale of a lantern or a tree), but not their
  buildings' style: this hold's buildings are vermilion halls with dark curved tiled roofs, white plaster walls and fitted grey stone.
  Above all fae/rose_hedge_run and liches/iron_fence, for the drawing: the wall itself is this hold's own.
- src/art/camp/camp-arcane.png, its middle row: the Haunted shrine as the camp's overlook paints it (its vermilion halls and gates, its
  blossom, its lanterns, its pond under a red arched bridge and its violet spirit fire). Match its look closely.
- src/art/areas/shrine/top1.png and src/art/areas/forest/top1.png: the shrine and forest lands' ground as the game draws them today.
- docs/samples/assault-art/template-props-1024.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/yokai-kit.jpg > /tmp/yokai-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

Style: detailed painted pixel art, drawn exactly like the Fae and Liches kits. Crisp dark outlines, chunky readable shapes, a palette
of night blues, dark pine green, grey stone, white plaster, vermilion red and dark roof tiles, pink blossom, with warm paper-lantern
light and a little violet spirit fire as the accents. It must read clearly when shown at a quarter of this size on a phone.

The angle and scale, exactly:
- True 2:1 isometric (dimetric) view, no perspective: a flat square tile on the ground is a diamond exactly twice as wide as it is
  tall, its corners pointing up, right, down and left. Vertical edges stay vertical.
- ONE TILE = a diamond 128 px wide and 64 px tall. ONE HEIGHT STEP = 24 px.
- Light from the upper left: faces turned to the lower left are lit; faces turned to the lower right are in shade.
- "Along u" means running from the upper left down to the lower right (like "\"). Every run on this sheet runs along u, passing
  through its tile from the midpoint of the diamond's upper-left edge to the midpoint of its lower-right edge, so that pieces placed on
  neighbouring tiles join seamlessly at those points. (The game mirrors them for runs going the other way.)
- The hold is drawn at night under a full moon: cool blue light, mist in the hollows, and every paper lantern and doorway glowing warm,
  with here and there a small violet spirit flame.
- No writing anywhere: lanterns, banners and plaques are plain or patterned (waves, clouds, foxes' tails), never letters or characters.
- The wall stands about 4 steps (96 px) tall: a base of fitted grey stone, white plastered wall above with dark timber posts, and a
  little roof of dark curved tiles along its top.
- The OUTER face is the one turned to the viewer's lower left: plaster, posts and a paper lantern here and there. The INNER face (cell 5)
  is the back of the same wall: a timber walkway, a ladder and a lantern.

The sheet: 1024 x 1024 px, a 4 x 4 grid of 256 x 256 cells, read left to right, top to bottom. Every piece has a ONE-TILE footprint:
its diamond's centre (the foot point) is at (128, 208) inside its cell. Keep each piece inside its own cell with 8 px to spare.

1. Wall run, outer face, whole: grey stone base, white plaster, dark posts, the tiled roof along its top, a paper lantern.
2. The same run, battered: plaster cracked and fallen in patches, tiles knocked off, arrows stuck in the posts.
3. The same run, broken: smashed down to the stone base and splintered posts about 1.5 steps high, tiles strewn. Still a barrier.
4. The breach: no wall left. A ramp of fallen stone, plaster and tiles sloping down to the lower left, as if into a ditch. Walkable.
5. Wall run, inner face, whole: the back of cell 1. A timber walkway a step and a half up, a lantern on a post.
6. Corner, south (the corner nearest the viewer): two runs meet at the bottom of the tile, one running up-left and one up-right, both
   showing their OUTER faces, the tiled roof turning up at the corner.
7. Corner, north (the far corner): two runs meet at the top of the tile, going down-left and down-right, both showing their INNER faces,
   with a lantern at the corner.
8. Corner, east: a run coming from the upper left meets a run going down to the lower left at the tile's right corner. The first shows
   its inner face and the second its outer face.
9. Gate post: a tall vermilion pillar on a stone base, taller than the wall, a small tiled cap and a lantern. It ends a run beside a
   gate.
10. Sally port, one tile wide, whole: a small roofed doorway with a dark wooden door, set in the run, outer face.
11. The sally port, battered: the door split.
12. The sally port, broken: the door torn off and lying on the ground. Passable.
13. Barricade (the red bridge's fort): a low wall, chest-high (about 2 steps), of sandbags of straw, a cart on its side and wooden
    shields, a few spears planted out front. Runs along u.
14. The barricade, broken: scattered bags and shields, low enough to step over.
15. Bamboo stakes: a cluster of sharpened bamboo stakes set in the ground, leaning out to the lower left, about 1.5 steps high. Fills
    most of the tile.
16. Stake line: a single row of sharpened bamboo stakes across the tile along u, leaning out to the lower left, about 2 steps high.
```

## Prompt 2: YOK-02, the ring's two great gates, in their siege states, and the gate towers' tops

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Yokai Night Parade's: the Moonlit Shrine, a haunted mountain shrine under a full moon: a dark pond and stream crossed by a vermilion
arched bridge, a ring of white plastered walls under dark tiled roofs, the great war drums the parade beats, a castle wall of fitted
grey stone, and at its heart the Shrine of the Moon, a many-roofed vermilion hall among blossoming trees and spirit lanterns.
This task paints ONE sheet: the ring's two great gates, in their siege states, and the gate towers' tops.

Rules for this task:
- Branch: art/assault-yokai. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/yokai/yok-02-gates.png. Change no other file.
- Size: the image tool's own output size does not matter (it often gives 1254 x 1254 or another size). Paint the pieces at whatever size
  it gives, then with Pillow cut each piece out, scale it so it fills its cell like the Orc sheet's matching piece, and pack the pieces
  into a new transparent canvas of exactly the size below, each in its own cell near its foot point. That is expected, not a failure:
  placement and scale only need to be close, because the game's cutter re-anchors every piece. Never stop because of the size.
- Pull request into main titled "Assault art: the Moonlit Shrine". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG). Each piece casts only a small soft contact shadow on its own footprint.

Open these files first and match them:
- docs/samples/assault-art/yokai-kit.jpg: the Fae and Liches kits (Chronos Settlement's isometric kits), labelled. Your pieces stand
  beside these on the map, so match their drawing exactly (the outlines, the shading, the scale of a lantern or a tree), but not their
  buildings' style: this hold's buildings are vermilion halls with dark curved tiled roofs, white plaster walls and fitted grey stone.
  Above all fae/flower_arch_gate and liches/gatehouse, for the drawing.
- src/art/camp/camp-arcane.png, its middle row: the Haunted shrine as the camp's overlook paints it (its vermilion halls and gates, its
  blossom, its lanterns, its pond under a red arched bridge and its violet spirit fire). Match its look closely.
- src/art/areas/shrine/top1.png and src/art/areas/forest/top1.png: the shrine and forest lands' ground as the game draws them today.
- docs/samples/assault-art/template-buildings-1536.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/yokai-kit.jpg > /tmp/yokai-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

Style: detailed painted pixel art, drawn exactly like the Fae and Liches kits. Crisp dark outlines, chunky readable shapes, a palette
of night blues, dark pine green, grey stone, white plaster, vermilion red and dark roof tiles, pink blossom, with warm paper-lantern
light and a little violet spirit fire as the accents. It must read clearly when shown at a quarter of this size on a phone.

The angle and scale, exactly:
- True 2:1 isometric (dimetric) view, no perspective: a flat square tile on the ground is a diamond exactly twice as wide as it is
  tall, its corners pointing up, right, down and left. Vertical edges stay vertical.
- ONE TILE = a diamond 128 px wide and 64 px tall. ONE HEIGHT STEP = 24 px.
- Light from the upper left: faces turned to the lower left are lit; faces turned to the lower right are in shade.
- The hold is drawn at night under a full moon: cool blue light, mist in the hollows, and every paper lantern and doorway glowing warm,
  with here and there a small violet spirit flame.
- No writing anywhere: lanterns, banners and plaques are plain or patterned (waves, clouds, foxes' tails), never letters or characters.
- The ring's wall is about 4 steps (96 px) tall; a gate's sides stand flush with it and may rise higher (a gate tower).
- The gates run along u (from the upper left down to the lower right, like "\"); the game mirrors them.

The sheet: 1536 x 1024 px, a 3 x 2 grid of 512 x 512 cells, read left to right, top to bottom. The foot point (the centre of the
footprint diamond) is at (256, 416) in every cell. Footprints: cells 1 to 4 are 2 tiles along u by 1 through (a diamond 192 x 96); cells 5 and 6 are 2 x 2 tiles (a diamond 256 x 128). Keep each piece inside its cell with 8 px to spare.

1. The Vermilion Gate (the south gate), whole, outer face to the lower left: a great gatehouse of vermilion pillars under a two-tiered
   roof of dark curved tiles, heavy wooden doors studded with iron, big paper lanterns hung either side, stone guardian foxes on plinths.
2. The same Vermilion Gate, battered: the doors split and scorched, tiles knocked from the roof, a lantern torn.
3. The same Vermilion Gate, broken: the doors torn off and lying flat, the pillars and roof still standing, the passage open and walkable,
   splinters at the sides (not in the passage).
4. The North Gate, whole, INNER face to the lower left (it stands on the ring's far side): the same build seen from inside, with its
   wooden bar across and a lantern.
5. The North Gate, broken (inner face): the bar snapped, the doors hanging open, passable.
6. A gate tower's top: what stands on top of a 2 x 2 gate tower that the game raises: a small hall with a curved tiled roof, open sides,
   a great drum on a stand, a lantern.
```

## Prompt 3: YOK-03, the castle wall's great Moon Gate, the postern and the corner towers' tops

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Yokai Night Parade's: the Moonlit Shrine, a haunted mountain shrine under a full moon: a dark pond and stream crossed by a vermilion
arched bridge, a ring of white plastered walls under dark tiled roofs, the great war drums the parade beats, a castle wall of fitted
grey stone, and at its heart the Shrine of the Moon, a many-roofed vermilion hall among blossoming trees and spirit lanterns.
This task paints ONE sheet: the castle wall's great Moon Gate, the postern and the corner towers' tops.

Rules for this task:
- Branch: art/assault-yokai. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/yokai/yok-03-moon-gate.png. Change no other file.
- Size: the image tool's own output size does not matter (it often gives 1254 x 1254 or another size). Paint the pieces at whatever size
  it gives, then with Pillow cut each piece out, scale it so it fills its cell like the Orc sheet's matching piece, and pack the pieces
  into a new transparent canvas of exactly the size below, each in its own cell near its foot point. That is expected, not a failure:
  placement and scale only need to be close, because the game's cutter re-anchors every piece. Never stop because of the size.
- Pull request into main titled "Assault art: the Moonlit Shrine". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG). Each piece casts only a small soft contact shadow on its own footprint.

Open these files first and match them:
- docs/samples/assault-art/yokai-kit.jpg: the Fae and Liches kits (Chronos Settlement's isometric kits), labelled. Your pieces stand
  beside these on the map, so match their drawing exactly (the outlines, the shading, the scale of a lantern or a tree), but not their
  buildings' style: this hold's buildings are vermilion halls with dark curved tiled roofs, white plaster walls and fitted grey stone.
  Above all liches/gatehouse and liches/watchtower, for the drawing.
- src/art/camp/camp-arcane.png, its middle row: the Haunted shrine as the camp's overlook paints it (its vermilion halls and gates, its
  blossom, its lanterns, its pond under a red arched bridge and its violet spirit fire). Match its look closely.
- src/art/areas/shrine/top1.png and src/art/areas/forest/top1.png: the shrine and forest lands' ground as the game draws them today.
- docs/samples/assault-art/template-buildings-1536.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/yokai-kit.jpg > /tmp/yokai-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

Style: detailed painted pixel art, drawn exactly like the Fae and Liches kits. Crisp dark outlines, chunky readable shapes, a palette
of night blues, dark pine green, grey stone, white plaster, vermilion red and dark roof tiles, pink blossom, with warm paper-lantern
light and a little violet spirit fire as the accents. It must read clearly when shown at a quarter of this size on a phone.

The angle and scale, exactly:
- True 2:1 isometric (dimetric) view, no perspective: a flat square tile on the ground is a diamond exactly twice as wide as it is
  tall, its corners pointing up, right, down and left. Vertical edges stay vertical.
- ONE TILE = a diamond 128 px wide and 64 px tall. ONE HEIGHT STEP = 24 px.
- Light from the upper left: faces turned to the lower left are lit; faces turned to the lower right are in shade.
- The hold is drawn at night under a full moon: cool blue light, mist in the hollows, and every paper lantern and doorway glowing warm,
  with here and there a small violet spirit flame.
- No writing anywhere: lanterns, banners and plaques are plain or patterned (waves, clouds, foxes' tails), never letters or characters.
- The inner wall is a sloping castle wall of big fitted grey stones topped by a white plastered parapet with a tiled roof. It is exactly 6 steps
  (144 px) tall from the ground to its walkway, plus a parapet. The game draws the wall itself; the gates fill gaps in it, so each gate's
  front must be exactly 144 px tall to the walkway line, flush with the wall on either side, and may rise higher above it (a gate tower).
- The gates run along u (from the upper left down to the lower right, like "\"); the game mirrors them. The wall is 2 tiles thick.

The sheet: 1536 x 1024 px, a 3 x 2 grid of 512 x 512 cells, read left to right, top to bottom. The foot point (the centre of the
footprint diamond) is at (256, 416) in every cell. Footprints: cells 1 to 3 are 2 x 2 tiles (a diamond 256 x 128); cells 4 and 5 are 1 tile along the wall by 2 tiles through it (a diamond 192 x 96); cell 6 is 3 x 3 tiles (a diamond 384 x 192). Keep each piece inside its cell with 8 px to spare.

1. The Moon Gate, whole, seen from OUTSIDE (outer face to the lower left): a gatehouse in the fitted stone wall, 6 steps tall, its deep
   passage under a round moon-shaped arch, heavy iron-bound doors, and above the walkway a gate hall of white plaster and dark timber
   under sweeping tiled roofs, lanterns at its eaves. The strongest-looking thing on the map.
2. The same Moon Gate, battered: the doors split and scorched, stones cracked round the arch, tiles fallen from the hall.
3. The same Moon Gate, broken: the doors torn apart and thrown aside, the passage open and walkable, rubble and splinters at the sides
   (not in the passage), the hall above cracked but standing.
4. The postern, whole, seen from INSIDE (inner face to the lower left): a low doorway through the 2-thick wall, a wooden door, a lantern.
   Flush with the wall, 6 steps tall.
5. The postern, broken: the door torn off and lying on the stones, the opening walkable.
6. Corner tower top: the top of a stone tower that the game raises as a 3 x 3 column (draw only what stands on its top): a small two-
   storey turret of white plaster and dark timber under curved tiled roofs, lanterns at its eaves, a drum.
```

## Prompt 4: YOK-04, the flat face textures the game shears onto every cliff, bank and wall

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Yokai Night Parade's: the Moonlit Shrine, a haunted mountain shrine under a full moon: a dark pond and stream crossed by a vermilion
arched bridge, a ring of white plastered walls under dark tiled roofs, the great war drums the parade beats, a castle wall of fitted
grey stone, and at its heart the Shrine of the Moon, a many-roofed vermilion hall among blossoming trees and spirit lanterns.
This task paints ONE sheet: the flat face textures the game shears onto every cliff, bank and wall.

Rules for this task:
- Branch: art/assault-yokai. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/yokai/yok-04-faces.png. Change no other file.
- Size: the image tool's own output size does not matter (it often gives 1254 x 1254 or another size). Paint the pieces at whatever size
  it gives, then with Pillow cut each piece out, scale it so it fills its cell like the Orc sheet's matching piece, and pack the pieces
  into a new transparent canvas of exactly the size below, each in its own cell near its foot point. That is expected, not a failure:
  placement and scale only need to be close, because the game's cutter re-anchors every piece. Never stop because of the size.
- Pull request into main titled "Assault art: the Moonlit Shrine". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered column.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Opaque textures; leave only the unused bottom band of each column (y 480 to 512) transparent. Lip edges may have a transparent
  ragged top (grass, roof tiles, parapet).

Open these files first and match them:
- docs/samples/assault-art/yokai-kit.jpg: the Fae and Liches kits (Chronos Settlement's isometric kits), labelled. Your pieces stand
  beside these on the map, so match their drawing exactly (the outlines, the shading, the scale of a lantern or a tree), but not their
  buildings' style: this hold's buildings are vermilion halls with dark curved tiled roofs, white plaster walls and fitted grey stone.
- src/art/camp/camp-arcane.png, its middle row: the Haunted shrine as the camp's overlook paints it (its vermilion halls and gates, its
  blossom, its lanterns, its pond under a red arched bridge and its violet spirit fire). Match its look closely.
- src/art/areas/shrine/top1.png and src/art/areas/forest/top1.png: the shrine and forest lands' ground as the game draws them today.
- src/art/areas/shrine/side.png and src/art/areas/forest/side.png: today's tiny side strips, which these replace.
- docs/samples/assault-art/template-faces-1536.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/yokai-kit.jpg > /tmp/yokai-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

THE VIEW IS STRAIGHT-ON, NOT ISOMETRIC: draw each face as a flat elevation, as if standing square in front of the wall, with no
perspective and no skew. The game skews it. Light from the upper left, evenly across the face (the game adds the shading for which
side it is on). Style: painted pixel art matching the kits' drawing, in this hold's moonlit palette, chunky and readable.
No writing anywhere.

The sheet: 1536 x 1024 px, 6 columns of 256 px, in two rows of 512 px: twelve columns, numbered left to right along the top row
(1 to 6), then the bottom row (7 to 12). Each column is one face set, 256 px wide (the length of one tile's edge), and must tile
seamlessly LEFT TO RIGHT with itself. Inside each column, from its top:
- the LIP, y 0 to 80 (one height step): the face's top edge, what overhangs or crowns it;
- the BODY, y 80 to 400 (four steps of 80 px): the face itself; it must tile seamlessly UP AND DOWN and left to right, because the
  game repeats it for walls of any height;
- the FOOT, y 400 to 480 (one step): where the face meets the ground;
- y 480 to 512: empty.
The lip's bottom must flow into the body's top, and the body's bottom into the foot's top, with no seam.

1. Mountain bank: dark earth and roots with mossy stones; lip: ferns and moss; foot: fallen needles.
2. Mossy earth: earth under moss and small ferns; lip: grass with small blossoms; foot: moss.
3. Ditch bank: dark wet earth, old bamboo stakes in it; lip: trampled edge; foot: a water line.
4. Earth rampart faced with stone: packed earth behind a facing of rough stones; lip: the earth top with bamboo stakes; foot: mud.
5. Ring wall skin: a grey stone base below white plaster and dark timber posts; lip: the little tiled roof (ragged, transparent above
   it); foot: stones in earth.
6. Castle wall: big fitted grey stones, sloping; lip: a white plastered parapet with a tiled roof (ragged, transparent above); foot: a
   plinth course.
7. The same castle wall, battle-damaged: missing stones, soot, cracks; lip: broken parapet; foot: fallen stone.
8. Corner tower masonry: smaller fitted stones with an arrow slit in the body's middle; lip: a tiled eave; foot: a sloped plinth.
9. Shrine terrace wall: smooth grey stones with moss in the joints; lip: a flagstone edge; foot: flagstones.
10. Mountain cliff: dark grey rock with pines clinging to it; lip: moss and roots; foot: scree.
11. Pond wall: dark wet stones with a pale waterline and weed low down; lip: a stone kerb; foot: wet stone.
12. Waterfall rock: dark rock behind a thin falling sheet of moonlit water; lip: water spilling over; foot: white foam.
```

## Prompt 5: YOK-05, sixteen seamless ground textures, from the mountain moss to the shrine floors

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Yokai Night Parade's: the Moonlit Shrine, a haunted mountain shrine under a full moon: a dark pond and stream crossed by a vermilion
arched bridge, a ring of white plastered walls under dark tiled roofs, the great war drums the parade beats, a castle wall of fitted
grey stone, and at its heart the Shrine of the Moon, a many-roofed vermilion hall among blossoming trees and spirit lanterns.
This task paints ONE sheet: sixteen seamless ground textures, from the mountain moss to the shrine floors.

Rules for this task:
- Branch: art/assault-yokai. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/yokai/yok-05-ground.png. Change no other file.
- Size: the image tool's own output size does not matter (it often gives 1254 x 1254 or another size). Paint the pieces at whatever size
  it gives, then with Pillow cut each piece out, scale it so it fills its cell like the Orc sheet's matching piece, and pack the pieces
  into a new transparent canvas of exactly the size below, each in its own cell near its foot point. That is expected, not a failure:
  placement and scale only need to be close, because the game's cutter re-anchors every piece. Never stop because of the size.
- Pull request into main titled "Assault art: the Moonlit Shrine". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Opaque image.

Open these files first and match them:
- src/art/areas/shrine/top1.png, src/art/areas/shrine/top2.png and src/art/areas/forest/top1.png: today's 64 px tops, which these replace
  (keep their pixel density: 64 px a tile).
- docs/samples/assault-art/yokai-kit.jpg: the kits' fae/moss_forest_tile, fae/meadow_tile and fae/pebble_path_tile give the drawing to
  match.
- src/art/camp/camp-arcane.png, its middle row: the Haunted shrine as the overlook paints it.
- docs/samples/assault-art/template-textures-1024.png: the grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/yokai-kit.jpg > /tmp/yokai-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

THE VIEW IS STRAIGHT DOWN, NOT ISOMETRIC: draw each texture as seen from directly above, like a map, with no perspective, no horizon
and no cast shadows longer than a pebble's. Style: painted pixel art matching the kits' ground tiles; readable, not noisy; no single
feature so striking that its repeat would be noticed.

The sheet: 1024 x 1024 px, a 4 x 4 grid of 256 x 256 squares, read left to right, top to bottom. EACH SQUARE IS ONE TEXTURE COVERING
4 x 4 TILES, AND MUST TILE SEAMLESSLY WITH ITSELF ON ALL FOUR SIDES (its left edge continues its right edge, its top its bottom).
Keep the squares separate: nothing crosses from one square into the next.

1. Night grass: dark blue-green grass with darker tufts and small stones.
2. Night grass, second variant: the same, with fallen pink petals.
3. Ferns and moss: low ferns over moss, for the mountain's wild rear.
4. Trampled grass: worn grass with bare earth and pawprints, round the posts.
5. Dark earth: soft dark earth with pawprints.
6. Dark earth, second variant: the same, with fallen petals and pine needles.
7. Muddy path: wet dark earth with ruts and puddles, for the lanes and the ditch floor.
8. Scorched earth: blackened earth and ash.
9. Ash: grey ash with a few embers.
10. Raked gravel: pale gravel raked in long parallel lines (they run from the square's top to its bottom), for the shrine's yards.
11. Stepping stones in moss: flat grey stones set in moss.
12. Shrine flagstones: big grey stone slabs, worn, moss in the joints.
13. Wall-walk planks: heavy dark timber planks seen from above, running from the top of the square to the bottom.
14. Bridge planks painted vermilion: red-lacquered boards seen from above.
15. Pond shingle: wet dark pebbles at the water's edge.
16. Shallow pond water: still dark water over pebbles, a few lily pads and floating petals, moonlight glints.
```

## Prompt 6: YOK-06, the overlays the game lays where two grounds meet

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Yokai Night Parade's: the Moonlit Shrine, a haunted mountain shrine under a full moon: a dark pond and stream crossed by a vermilion
arched bridge, a ring of white plastered walls under dark tiled roofs, the great war drums the parade beats, a castle wall of fitted
grey stone, and at its heart the Shrine of the Moon, a many-roofed vermilion hall among blossoming trees and spirit lanterns.
This task paints ONE sheet: the overlays the game lays where two grounds meet.

Rules for this task:
- Branch: art/assault-yokai. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/yokai/yok-06-transitions.png. Change no other file.
- Size: the image tool's own output size does not matter (it often gives 1254 x 1254 or another size). Paint the pieces at whatever size
  it gives, then with Pillow cut each piece out, scale it so it fills its cell like the Orc sheet's matching piece, and pack the pieces
  into a new transparent canvas of exactly the size below, each in its own cell near its foot point. That is expected, not a failure:
  placement and scale only need to be close, because the game's cutter re-anchors every piece. Never stop because of the size.
- Pull request into main titled "Assault art: the Moonlit Shrine". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG): each overlay is the material only, and everything else is transparent.

Open these files first and match them:
- art-source/assault/yokai/yok-05-ground.png on this branch, if it is there: the ground textures these overlays must match exactly in
  colour and pixel density. If it is not there yet, match the descriptions below and src/art/areas/shrine/top1.png.
- docs/samples/assault-art/template-textures-1024.png: the grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/yokai-kit.jpg > /tmp/yokai-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

Where two grounds meet (gravel beside grass, a path's edge), the game lays an overlay along the shared edge so the join is ragged and
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

1. Mud spreading onto grass: edge.               2. The same: outer corner.
3. Scorched earth and ash: edge.                 4. The same: outer corner.
5. Gravel meeting grass: edge.                   6. The same: outer corner.
7. A trodden path's edge over grass: edge.       8. The same: outer corner.
9. Pond shingle onto grass: edge.                10. The same: outer corner.
11. Flagstones sinking into moss: edge.          12. The same: outer corner.
13. Fallen petals drifting over any ground: edge. 14. The same: outer corner.
15. The water's edge: a thin rim of wet dark stones, reeds and petals, laid on the water side of a bank: edge.
16. The same: outer corner.
```

## Prompt 7: YOK-07, the Shrine of the Moon, the oni's seat and the great banner

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Yokai Night Parade's: the Moonlit Shrine, a haunted mountain shrine under a full moon: a dark pond and stream crossed by a vermilion
arched bridge, a ring of white plastered walls under dark tiled roofs, the great war drums the parade beats, a castle wall of fitted
grey stone, and at its heart the Shrine of the Moon, a many-roofed vermilion hall among blossoming trees and spirit lanterns.
This task paints ONE sheet: the Shrine of the Moon, the oni's seat and the great banner.

Rules for this task:
- Branch: art/assault-yokai. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/yokai/yok-07-keep.png. Change no other file.
- Size: the image tool's own output size does not matter (it often gives 1254 x 1254 or another size). Paint the pieces at whatever size
  it gives, then with Pillow cut each piece out, scale it so it fills its cell like the Orc sheet's matching piece, and pack the pieces
  into a new transparent canvas of exactly the size below, each in its own cell near its foot point. That is expected, not a failure:
  placement and scale only need to be close, because the game's cutter re-anchors every piece. Never stop because of the size.
- Pull request into main titled "Assault art: the Moonlit Shrine". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG). Each piece casts only a small soft contact shadow on its own footprint.

Open these files first and match them:
- docs/samples/assault-art/yokai-kit.jpg: the Fae and Liches kits (Chronos Settlement's isometric kits), labelled. Your pieces stand
  beside these on the map, so match their drawing exactly (the outlines, the shading, the scale of a lantern or a tree), but not their
  buildings' style: this hold's buildings are vermilion halls with dark curved tiled roofs, white plaster walls and fitted grey stone.
  Above all fae/shrine and liches/chapel, for the drawing; the overlook's great vermilion hall, for the look.
- src/art/camp/camp-arcane.png, its middle row: the Haunted shrine as the camp's overlook paints it (its vermilion halls and gates, its
  blossom, its lanterns, its pond under a red arched bridge and its violet spirit fire). Match its look closely.
- src/art/areas/shrine/top1.png and src/art/areas/forest/top1.png: the shrine and forest lands' ground as the game draws them today.
- docs/samples/assault-art/template-keep-1536.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/yokai-kit.jpg > /tmp/yokai-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

Style: detailed painted pixel art, drawn exactly like the Fae and Liches kits. Crisp dark outlines, chunky readable shapes, a palette
of night blues, dark pine green, grey stone, white plaster, vermilion red and dark roof tiles, pink blossom, with warm paper-lantern
light and a little violet spirit fire as the accents. It must read clearly when shown at a quarter of this size on a phone.

The angle and scale, exactly:
- True 2:1 isometric (dimetric) view, no perspective: a flat square tile on the ground is a diamond exactly twice as wide as it is
  tall, its corners pointing up, right, down and left. Vertical edges stay vertical.
- ONE TILE = a diamond 128 px wide and 64 px tall. ONE HEIGHT STEP = 24 px.
- Light from the upper left: faces turned to the lower left are lit; faces turned to the lower right are in shade.
- The hold is drawn at night under a full moon: cool blue light, mist in the hollows, and every paper lantern and doorway glowing warm,
  with here and there a small violet spirit flame.
- No writing anywhere: lanterns, banners and plaques are plain or patterned (waves, clouds, foxes' tails), never letters or characters.
- A doorway is about 4 steps (96 px) tall.

The sheet: 1536 x 1024 px. Three cells:
1. Cell 1, x 0 to 1024, y 0 to 1024: THE SHRINE OF THE MOON. Footprint 6 tiles along u (upper left to lower right) by 4 tiles along v:
   a diamond 640 px wide and 320 px tall, centred on the foot point (512, 840). It may rise up to about 640 px above its foot.
   A great hall of vermilion pillars and white plaster on a raised stone terrace, three tiers of sweeping dark tiled roofs curving up at
   the corners, a wide stair to its open front facing the lower left (warm light inside), rows of paper lanterns at its eaves, blossoming
   trees either side, a little violet spirit fire floating round its roof, a full moon's light on its tiles. Grander than anything else
   on the map.
2. Cell 2, x 1024 to 1536, y 0 to 512: THE ONI'S SEAT. One-tile footprint (a diamond 128 x 64) centred on the foot point (256, 440) in
   the cell. A massive lacquered chair of black and vermilion with a high back of carved clouds about 6 steps tall, a huge iron club
   leaning on it, two lanterns on the two-step dais. Facing the lower left.
3. Cell 3, x 1024 to 1536, y 512 to 1024: THE GREAT BANNER. One-tile footprint centred on (256, 440) in the cell. A tall pole (about
   14 steps) in a stone base, a long narrow vertical banner of deep blue painted with a white fox's tail curling up its length (no
   writing), tattered at the bottom, a small lantern at the top.
```

## Prompt 8: YOK-08, the inner wall's dressing, the stairs and small structures

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Yokai Night Parade's: the Moonlit Shrine, a haunted mountain shrine under a full moon: a dark pond and stream crossed by a vermilion
arched bridge, a ring of white plastered walls under dark tiled roofs, the great war drums the parade beats, a castle wall of fitted
grey stone, and at its heart the Shrine of the Moon, a many-roofed vermilion hall among blossoming trees and spirit lanterns.
This task paints ONE sheet: the inner wall's dressing, the stairs and small structures.

Rules for this task:
- Branch: art/assault-yokai. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/yokai/yok-08-wall-dressing.png. Change no other file.
- Size: the image tool's own output size does not matter (it often gives 1254 x 1254 or another size). Paint the pieces at whatever size
  it gives, then with Pillow cut each piece out, scale it so it fills its cell like the Orc sheet's matching piece, and pack the pieces
  into a new transparent canvas of exactly the size below, each in its own cell near its foot point. That is expected, not a failure:
  placement and scale only need to be close, because the game's cutter re-anchors every piece. Never stop because of the size.
- Pull request into main titled "Assault art: the Moonlit Shrine". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG). Each piece casts only a small soft contact shadow on its own footprint.

Open these files first and match them:
- docs/samples/assault-art/yokai-kit.jpg: the Fae and Liches kits (Chronos Settlement's isometric kits), labelled. Your pieces stand
  beside these on the map, so match their drawing exactly (the outlines, the shading, the scale of a lantern or a tree), but not their
  buildings' style: this hold's buildings are vermilion halls with dark curved tiled roofs, white plaster walls and fitted grey stone.
  Above all fae/light_lantern_post and liches/lantern_post.
- src/art/camp/camp-arcane.png, its middle row: the Haunted shrine as the camp's overlook paints it (its vermilion halls and gates, its
  blossom, its lanterns, its pond under a red arched bridge and its violet spirit fire). Match its look closely.
- src/art/areas/shrine/top1.png and src/art/areas/forest/top1.png: the shrine and forest lands' ground as the game draws them today.
- docs/samples/assault-art/template-props-1024.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/yokai-kit.jpg > /tmp/yokai-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

Style: detailed painted pixel art, drawn exactly like the Fae and Liches kits. Crisp dark outlines, chunky readable shapes, a palette
of night blues, dark pine green, grey stone, white plaster, vermilion red and dark roof tiles, pink blossom, with warm paper-lantern
light and a little violet spirit fire as the accents. It must read clearly when shown at a quarter of this size on a phone.

The angle and scale, exactly:
- True 2:1 isometric (dimetric) view, no perspective: a flat square tile on the ground is a diamond exactly twice as wide as it is
  tall, its corners pointing up, right, down and left. Vertical edges stay vertical.
- ONE TILE = a diamond 128 px wide and 64 px tall. ONE HEIGHT STEP = 24 px.
- Light from the upper left: faces turned to the lower left are lit; faces turned to the lower right are in shade.
- The hold is drawn at night under a full moon: cool blue light, mist in the hollows, and every paper lantern and doorway glowing warm,
  with here and there a small violet spirit flame.
- No writing anywhere: lanterns, banners and plaques are plain or patterned (waves, clouds, foxes' tails), never letters or characters.
- The inner wall's walkway is 6 steps up; these pieces stand on it or against it.

The sheet: 1024 x 1024 px, a 4 x 4 grid of 256 x 256 cells, read left to right, top to bottom. Every piece has a ONE-TILE footprint:
its diamond's centre (the foot point) is at (128, 208) inside its cell. Keep each piece inside its own cell with 8 px to spare.

1. Parapet piece: a short length of white plastered parapet with a tiled cap, for the wall's outer edge, along u.
2. The same parapet, broken: knocked down, lying on the walk.
3. Inner rail: a low dark timber rail along the walk's inner edge, along u.
4. Wall lantern: a tall stone lantern with a warm light, for the walk (about 2 steps tall).
5. A paper lantern hung from a bracket.
6. A small vertical banner on a short pole, plain blue with a white wave pattern.
7. Archer's screen: a wooden shield-screen over a gap in the parapet.
8. A rack of long bows and spears against the rail.
9. Stairs up the wall, along u: stone steps rising 6 steps (144 px) from the ground at the lower left to the walk. One tile.
10. Stairs down, the same steps seen descending to the lower right (the game uses it where a stair goes down into a pit).
11. A bamboo ladder against a wall to the upper right, about 6 steps tall.
12. A pot of hot oil over a brazier.
13. Stacked straw bales and a barrel.
14. A great drum on a low stand.
15. A heap of arrows in quivers.
16. A fallen banner and a lacquered helmet on the stones.
```

## Prompt 9: YOK-09, the great war drums and the shrine's landmarks

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Yokai Night Parade's: the Moonlit Shrine, a haunted mountain shrine under a full moon: a dark pond and stream crossed by a vermilion
arched bridge, a ring of white plastered walls under dark tiled roofs, the great war drums the parade beats, a castle wall of fitted
grey stone, and at its heart the Shrine of the Moon, a many-roofed vermilion hall among blossoming trees and spirit lanterns.
This task paints ONE sheet: the great war drums and the shrine's landmarks.

Rules for this task:
- Branch: art/assault-yokai. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/yokai/yok-09-landmarks.png. Change no other file.
- Size: the image tool's own output size does not matter (it often gives 1254 x 1254 or another size). Paint the pieces at whatever size
  it gives, then with Pillow cut each piece out, scale it so it fills its cell like the Orc sheet's matching piece, and pack the pieces
  into a new transparent canvas of exactly the size below, each in its own cell near its foot point. That is expected, not a failure:
  placement and scale only need to be close, because the game's cutter re-anchors every piece. Never stop because of the size.
- Pull request into main titled "Assault art: the Moonlit Shrine". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG). Each piece casts only a small soft contact shadow on its own footprint.

Open these files first and match them:
- docs/samples/assault-art/yokai-kit.jpg: the Fae and Liches kits (Chronos Settlement's isometric kits), labelled. Your pieces stand
  beside these on the map, so match their drawing exactly (the outlines, the shading, the scale of a lantern or a tree), but not their
  buildings' style: this hold's buildings are vermilion halls with dark curved tiled roofs, white plaster walls and fitted grey stone.
  Above all fae/fairy_ring, fae/weeping_willow and liches/shrine, for the drawing.
- src/art/camp/camp-arcane.png, its middle row: the Haunted shrine as the camp's overlook paints it (its vermilion halls and gates, its
  blossom, its lanterns, its pond under a red arched bridge and its violet spirit fire). Match its look closely.
- src/art/areas/shrine/top1.png and src/art/areas/forest/top1.png: the shrine and forest lands' ground as the game draws them today.
- docs/samples/assault-art/template-buildings-1536.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/yokai-kit.jpg > /tmp/yokai-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

Style: detailed painted pixel art, drawn exactly like the Fae and Liches kits. Crisp dark outlines, chunky readable shapes, a palette
of night blues, dark pine green, grey stone, white plaster, vermilion red and dark roof tiles, pink blossom, with warm paper-lantern
light and a little violet spirit fire as the accents. It must read clearly when shown at a quarter of this size on a phone.

The angle and scale, exactly:
- True 2:1 isometric (dimetric) view, no perspective: a flat square tile on the ground is a diamond exactly twice as wide as it is
  tall, its corners pointing up, right, down and left. Vertical edges stay vertical.
- ONE TILE = a diamond 128 px wide and 64 px tall. ONE HEIGHT STEP = 24 px.
- Light from the upper left: faces turned to the lower left are lit; faces turned to the lower right are in shade.
- The hold is drawn at night under a full moon: cool blue light, mist in the hollows, and every paper lantern and doorway glowing warm,
  with here and there a small violet spirit flame.
- No writing anywhere: lanterns, banners and plaques are plain or patterned (waves, clouds, foxes' tails), never letters or characters.
- The great drums play the part the orc hold's war drums do: while the parade beats one, the garrison near it fights harder, until our
  troops reach it and break it.

The sheet: 1536 x 1024 px, a 3 x 2 grid of 512 x 512 cells, read left to right, top to bottom. The foot point (the centre of the
footprint diamond) is at (256, 416) in every cell. Footprints: cells 1 to 4 are 2 x 2 tiles (a diamond 256 x 128); cells 5 and 6 are 3 x 3 tiles (a diamond 384 x 192). Keep each piece inside its cell with 8 px to spare.

1. A great war drum, beating: a huge drum on a tall lacquered stand under a little tiled roof, at the instant it is struck: violet and
   blue rings of sound bursting from its face, lanterns swinging, petals and mist whirling round it.
2. The same drum, broken: after our troops reached it: the drumhead split, the stand toppled, the lanterns out and smoking.
3. The fox shrine: a small shrine with two stone foxes, rows of little red gates leading to it (small, low), offerings of rice cakes.
4. The stone lantern garden: five tall stone lanterns on a mossy rise, their lights glowing.
5. The moon pond pavilion: a small open pavilion on stilts over a pond corner, lanterns, a moonlit reflection.
6. The waterfall: a mossy crag with a thin waterfall falling into a pool, blossom trees round it, a little violet spirit fire.
```

## Prompt 10: YOK-10, the shrine's small props the kits do not have

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Yokai Night Parade's: the Moonlit Shrine, a haunted mountain shrine under a full moon: a dark pond and stream crossed by a vermilion
arched bridge, a ring of white plastered walls under dark tiled roofs, the great war drums the parade beats, a castle wall of fitted
grey stone, and at its heart the Shrine of the Moon, a many-roofed vermilion hall among blossoming trees and spirit lanterns.
This task paints ONE sheet: the shrine's small props the kits do not have.

Rules for this task:
- Branch: art/assault-yokai. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/yokai/yok-10-props.png. Change no other file.
- Size: the image tool's own output size does not matter (it often gives 1254 x 1254 or another size). Paint the pieces at whatever size
  it gives, then with Pillow cut each piece out, scale it so it fills its cell like the Orc sheet's matching piece, and pack the pieces
  into a new transparent canvas of exactly the size below, each in its own cell near its foot point. That is expected, not a failure:
  placement and scale only need to be close, because the game's cutter re-anchors every piece. Never stop because of the size.
- Pull request into main titled "Assault art: the Moonlit Shrine". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG). Each piece casts only a small soft contact shadow on its own footprint.

Open these files first and match them:
- docs/samples/assault-art/yokai-kit.jpg: the Fae and Liches kits (Chronos Settlement's isometric kits), labelled. Your pieces stand
  beside these on the map, so match their drawing exactly (the outlines, the shading, the scale of a lantern or a tree), but not their
  buildings' style: this hold's buildings are vermilion halls with dark curved tiled roofs, white plaster walls and fitted grey stone.
  The kits already give the baskets, the flower bales, the honey jars, the lantern posts, the glow bushes, the crystal rocks, the
  willows, the birches, the barrels and the wells: do not paint those again. These props go with them.
- src/art/camp/camp-arcane.png, its middle row: the Haunted shrine as the camp's overlook paints it (its vermilion halls and gates, its
  blossom, its lanterns, its pond under a red arched bridge and its violet spirit fire). Match its look closely.
- src/art/areas/shrine/top1.png and src/art/areas/forest/top1.png: the shrine and forest lands' ground as the game draws them today.
- docs/samples/assault-art/template-props-1024.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/yokai-kit.jpg > /tmp/yokai-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

Style: detailed painted pixel art, drawn exactly like the Fae and Liches kits. Crisp dark outlines, chunky readable shapes, a palette
of night blues, dark pine green, grey stone, white plaster, vermilion red and dark roof tiles, pink blossom, with warm paper-lantern
light and a little violet spirit fire as the accents. It must read clearly when shown at a quarter of this size on a phone.

The angle and scale, exactly:
- True 2:1 isometric (dimetric) view, no perspective: a flat square tile on the ground is a diamond exactly twice as wide as it is
  tall, its corners pointing up, right, down and left. Vertical edges stay vertical.
- ONE TILE = a diamond 128 px wide and 64 px tall. ONE HEIGHT STEP = 24 px.
- Light from the upper left: faces turned to the lower left are lit; faces turned to the lower right are in shade.
- The hold is drawn at night under a full moon: cool blue light, mist in the hollows, and every paper lantern and doorway glowing warm,
  with here and there a small violet spirit flame.
- No writing anywhere: lanterns, banners and plaques are plain or patterned (waves, clouds, foxes' tails), never letters or characters.

The sheet: 1024 x 1024 px, a 4 x 4 grid of 256 x 256 cells, read left to right, top to bottom. Every piece has a ONE-TILE footprint:
its diamond's centre (the foot point) is at (128, 208) inside its cell. Keep each piece inside its own cell with 8 px to spare.

1. A cherry tree in full pink blossom.
2. A dark pine, wind-bent.
3. A clump of tall bamboo.
4. A tall stone lantern.
5. A small red gate (knee-high), two posts and a crossbeam.
6. A stone fox on a plinth.
7. A sake barrel stack.
8. A paper lantern on a pole.
9. A weapon rack of long spears and a curved sword.
10. A cage of bamboo holding a snarling spirit fox.
11. A cooking fire with an iron kettle.
12. A wishing tree hung with white paper strips (blank).
13. A clump of irises.
14. A mossy boulder with a rope round it.
15. A small floating violet spirit flame.
16. A fallen tengu mask and a broken spear in the moss.
```

## Prompt 11: YOK-11, ruins, and the burnt states of the parade's camp

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Yokai Night Parade's: the Moonlit Shrine, a haunted mountain shrine under a full moon: a dark pond and stream crossed by a vermilion
arched bridge, a ring of white plastered walls under dark tiled roofs, the great war drums the parade beats, a castle wall of fitted
grey stone, and at its heart the Shrine of the Moon, a many-roofed vermilion hall among blossoming trees and spirit lanterns.
This task paints ONE sheet: ruins, and the burnt states of the parade's camp.

Rules for this task:
- Branch: art/assault-yokai. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/yokai/yok-11-ruins.png. Change no other file.
- Size: the image tool's own output size does not matter (it often gives 1254 x 1254 or another size). Paint the pieces at whatever size
  it gives, then with Pillow cut each piece out, scale it so it fills its cell like the Orc sheet's matching piece, and pack the pieces
  into a new transparent canvas of exactly the size below, each in its own cell near its foot point. That is expected, not a failure:
  placement and scale only need to be close, because the game's cutter re-anchors every piece. Never stop because of the size.
- Pull request into main titled "Assault art: the Moonlit Shrine". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG). Each piece casts only a small soft contact shadow on its own footprint.

Open these files first and match them:
- docs/samples/assault-art/yokai-kit.jpg: the Fae and Liches kits (Chronos Settlement's isometric kits), labelled. Your pieces stand
  beside these on the map, so match their drawing exactly (the outlines, the shading, the scale of a lantern or a tree), but not their
  buildings' style: this hold's buildings are vermilion halls with dark curved tiled roofs, white plaster walls and fitted grey stone.
- src/art/camp/camp-arcane.png, its middle row: the Haunted shrine as the camp's overlook paints it (its vermilion halls and gates, its
  blossom, its lanterns, its pond under a red arched bridge and its violet spirit fire). Match its look closely.
- src/art/areas/shrine/top1.png and src/art/areas/forest/top1.png: the shrine and forest lands' ground as the game draws them today.
- docs/samples/assault-art/template-buildings-1536.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/yokai-kit.jpg > /tmp/yokai-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

Style: detailed painted pixel art, drawn exactly like the Fae and Liches kits. Crisp dark outlines, chunky readable shapes, a palette
of night blues, dark pine green, grey stone, white plaster, vermilion red and dark roof tiles, pink blossom, with warm paper-lantern
light and a little violet spirit fire as the accents. It must read clearly when shown at a quarter of this size on a phone.

The angle and scale, exactly:
- True 2:1 isometric (dimetric) view, no perspective: a flat square tile on the ground is a diamond exactly twice as wide as it is
  tall, its corners pointing up, right, down and left. Vertical edges stay vertical.
- ONE TILE = a diamond 128 px wide and 64 px tall. ONE HEIGHT STEP = 24 px.
- Light from the upper left: faces turned to the lower left are lit; faces turned to the lower right are in shade.
- Our own siege works (the ladders, the ram, the trebuchet) are already painted on the Orc hold's sheets and serve every hold: do not
  paint them. The Warpath's reserve camp here is the night parade's camp on the mountain path: its tents burn when our archers loose fire
  arrows.
- The hold is drawn at night under a full moon: cool blue light, mist in the hollows, and every paper lantern and doorway glowing warm,
  with here and there a small violet spirit flame.
- No writing anywhere: lanterns, banners and plaques are plain or patterned (waves, clouds, foxes' tails), never letters or characters.

The sheet: 1536 x 1024 px, a 3 x 2 grid of 512 x 512 cells, read left to right, top to bottom. The foot point (the centre of the
footprint diamond) is at (256, 416) in every cell. Footprints: cells 1 and 2 are 2 tiles along u by 1 (a diamond 192 x 96); cells 3 to 6 are 2 x 2 tiles (a diamond 256 x 128). Keep each piece inside its cell with 8 px to spare.

1. A parade's tent: a long tent of indigo cloth with a white wave pattern over poles, a lantern by the flap.
2. The same tent, burnt: a black heap of charred poles and cloth, ash, a few embers.
3. A curtained pavilion: a square canopy with hanging curtains on four poles, cushions and lanterns under it.
4. The same pavilion, burnt: its poles standing charred, the cloth gone to ash.
5. A ruined old shrine: the stone base and fallen pillars of a little shrine, its roof collapsed, moss over it.
6. A collapsed watchtower: a toppled wooden tower lying in the grass.
```

## Prompt 12: YOK-12, the pond and stream, the vermilion bridge, the fords and banks

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Yokai Night Parade's: the Moonlit Shrine, a haunted mountain shrine under a full moon: a dark pond and stream crossed by a vermilion
arched bridge, a ring of white plastered walls under dark tiled roofs, the great war drums the parade beats, a castle wall of fitted
grey stone, and at its heart the Shrine of the Moon, a many-roofed vermilion hall among blossoming trees and spirit lanterns.
This task paints ONE sheet: the pond and stream, the vermilion bridge, the fords and banks.

Rules for this task:
- Branch: art/assault-yokai. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/yokai/yok-12-pond.png. Change no other file.
- Size: the image tool's own output size does not matter (it often gives 1254 x 1254 or another size). Paint the pieces at whatever size
  it gives, then with Pillow cut each piece out, scale it so it fills its cell like the Orc sheet's matching piece, and pack the pieces
  into a new transparent canvas of exactly the size below, each in its own cell near its foot point. That is expected, not a failure:
  placement and scale only need to be close, because the game's cutter re-anchors every piece. Never stop because of the size.
- Pull request into main titled "Assault art: the Moonlit Shrine". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG). Each piece casts only a small soft contact shadow on its own footprint.

Open these files first and match them:
- docs/samples/assault-art/yokai-kit.jpg: the Fae and Liches kits (Chronos Settlement's isometric kits), labelled. Your pieces stand
  beside these on the map, so match their drawing exactly (the outlines, the shading, the scale of a lantern or a tree), but not their
  buildings' style: this hold's buildings are vermilion halls with dark curved tiled roofs, white plaster walls and fitted grey stone.
  Above all fae/root_bridge and liches/stone_bridge, for the drawing.
- src/art/camp/camp-arcane.png, its middle row: the Haunted shrine as the camp's overlook paints it (its vermilion halls and gates, its
  blossom, its lanterns, its pond under a red arched bridge and its violet spirit fire). Match its look closely.
- src/art/areas/shrine/top1.png and src/art/areas/forest/top1.png: the shrine and forest lands' ground as the game draws them today.
- docs/samples/assault-art/template-props-1024.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/yokai-kit.jpg > /tmp/yokai-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

Style: detailed painted pixel art, drawn exactly like the Fae and Liches kits. Crisp dark outlines, chunky readable shapes, a palette
of night blues, dark pine green, grey stone, white plaster, vermilion red and dark roof tiles, pink blossom, with warm paper-lantern
light and a little violet spirit fire as the accents. It must read clearly when shown at a quarter of this size on a phone.

The angle and scale, exactly:
- True 2:1 isometric (dimetric) view, no perspective: a flat square tile on the ground is a diamond exactly twice as wide as it is
  tall, its corners pointing up, right, down and left. Vertical edges stay vertical.
- ONE TILE = a diamond 128 px wide and 64 px tall. ONE HEIGHT STEP = 24 px.
- Light from the upper left: faces turned to the lower left are lit; faces turned to the lower right are in shade.
- The Moonlit Shrine has a dark pond and stream where the Orc hold has its river. The game draws the water as ground; these pieces stand
  in it or on its banks.
- "Along u" means running from the upper left down to the lower right (like "\"). Every run on this sheet runs along u, passing
  through its tile from the midpoint of the diamond's upper-left edge to the midpoint of its lower-right edge, so that pieces placed on
  neighbouring tiles join seamlessly at those points. (The game mirrors them for runs going the other way.)
- The hold is drawn at night under a full moon: cool blue light, mist in the hollows, and every paper lantern and doorway glowing warm,
  with here and there a small violet spirit flame.
- No writing anywhere: lanterns, banners and plaques are plain or patterned (waves, clouds, foxes' tails), never letters or characters.

The sheet: 1024 x 1024 px, a 4 x 4 grid of 256 x 256 cells, read left to right, top to bottom. Every piece has a ONE-TILE footprint:
its diamond's centre (the foot point) is at (128, 208) inside its cell. Keep each piece inside its own cell with 8 px to spare.

1. Vermilion bridge deck, whole: an arched deck of red-lacquered timber crossing along u, red railings with round black post caps.
2. The bridge, broken: a gap of smashed boards and railings. Impassable.
3. The bridge's end, where it meets the bank at the upper left, a stone lantern beside it.
4. A bridge post: a red post with a paper lantern.
5. Ford stones: a line of flat stepping stones along u, their tops showing above the water.
6. Irises and reeds in the shallows.
7. A fallen log across the water.
8. Lotus leaves and flowers.
9. Mossy boulders at the water's edge.
10. A floating lantern (a small paper lantern on the water).
11. A small wooden boat, moored.
12. Mist over the water (semi-transparent).
13. Koi under the surface (semi-transparent orange shapes).
14. Floating cherry petals on the water.
15. A bamboo water pipe dripping into the pond.
16. Stone steps going down into the water from the bank at the upper left.
```

## Prompt 13: YOK-13, sixteen ground decals

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Yokai Night Parade's: the Moonlit Shrine, a haunted mountain shrine under a full moon: a dark pond and stream crossed by a vermilion
arched bridge, a ring of white plastered walls under dark tiled roofs, the great war drums the parade beats, a castle wall of fitted
grey stone, and at its heart the Shrine of the Moon, a many-roofed vermilion hall among blossoming trees and spirit lanterns.
This task paints ONE sheet: sixteen ground decals.

Rules for this task:
- Branch: art/assault-yokai. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/yokai/yok-13-decals.png. Change no other file.
- Size: the image tool's own output size does not matter (it often gives 1254 x 1254 or another size). Paint the pieces at whatever size
  it gives, then with Pillow cut each piece out, scale it so it fills its cell like the Orc sheet's matching piece, and pack the pieces
  into a new transparent canvas of exactly the size below, each in its own cell near its foot point. That is expected, not a failure:
  placement and scale only need to be close, because the game's cutter re-anchors every piece. Never stop because of the size.
- Pull request into main titled "Assault art: the Moonlit Shrine". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG).

Open these files first and match them:
- art-source/assault/yokai/yok-05-ground.png on this branch, if it is there: the ground these lie on (match its pixel density, 64 px
  a tile at quarter size). Otherwise src/art/areas/shrine/top1.png.
- docs/samples/assault-art/template-textures-1024.png: the grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/yokai-kit.jpg > /tmp/yokai-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

THE VIEW IS STRAIGHT DOWN, NOT ISOMETRIC, as on a map: everything lies flat on the ground, nothing stands up. Style: painted pixel
art matching the kits' ground; readable; blood is a dark red-brown, never bright or gory.

The sheet: 1024 x 1024 px, a 4 x 4 grid of 256 x 256 squares, read left to right, top to bottom. Each square holds ONE decal covering
up to 2 x 2 tiles, centred, with at least 16 px of transparency round it.

1. Blood spatter.   2. Spilt sake (a dark stain, a broken cup).   3. Foxfire scorch: a ring of violet-black burn.
4. Scorch mark, round (a blast).   5. Ash and embers.
6. Stone rubble scatter.   7. Timber debris (splinters, broken bamboo, roof tiles).
8. Cart ruts: two parallel wheel tracks running straight from the square's top edge to its bottom edge (so they join end to end).
9. Fox prints: a trail of pawprints crossing the square.   10. Crow feathers scattered.
11. A puddle reflecting the moon.   12. Fallen cherry petals.
13. Torn paper lantern pieces.   14. Pine needles and cones.
15. A scatter of tiny glowing spirit motes (semi-transparent).   16. Cracked flagstones (cracks and a few broken corners, to lay over a
    stone floor).
```
