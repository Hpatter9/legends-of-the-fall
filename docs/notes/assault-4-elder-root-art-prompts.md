# The Assault: ChatGPT prompts for the Wildwood's hold (Elder Root)

Phase 4's third hold (`docs/design/assault-mode.md` on `claude/assault-design`, phase 4; the owner's name for it). The owner gave no look for
it, so it follows the camp's overlook, which already paints the Wildwood's "Elder-root stronghold" (`src/art/camp/camp-wild.png`, its top
row): an ancient forest grown into a fortress at dusk, its heart a vast hollow tree with a lit door. It is built like the other holds, on
the same engine and the same kinds of sheet, so these 13 prompts mirror the Orc set sheet for sheet: the same canvases, grids, foot points,
angles and formats, so the cutter (`tools/assault/cut-sheets.py`) and the field's renderer take them as they took the Orc sheets. **They
paint only what the packs and the Orc sheets cannot cover.** Until they land, the hold is built on stand-ins: the Orc sheets' pieces,
recoloured, and the kit pieces below.

**The hold.** A black mire where the others have their water, crossed by a bridge of living roots and two fords; a ring of thorn hedge woven
through stakes, with the Bramble Gate; the pipers' rings, stone circles where the satyrs pipe the grove into a frenzy (the war drums' part);
a wall of colossal braided roots over old stone, with the Heartwood Gate; and the Elder Root at the heart, with a throne of roots before it.

**What the packs already give** (Chronos's Druids and Fae kits, `docs/samples/assault-art/wildwood-kit.jpg`; cut straight in, as the Orc
hold's kit pieces were):

- walls and gates as decoration: `druids/hedge_wall_run`, `hedge_wall_corner`, `wattle_fence`, `tree_gate`; `fae/rose_hedge_run`,
  `twig_fence`, `flower_arch_gate`;
- buildings: `druids/longhouse`, `cottage`, `tavern`, `granary`, `workshop`, `market_stall`, `watch_platform`, `shrine`, `stone_circle`;
  `fae/spiral_watchtower`, `cottage`, `tavern`, `shrine`;
- the grove's goods: `druids/baskets`, `clay_pots`, `hay_bales`, `log_pile`, `woodpile`, `cart`, `stockpile`, `animal_pen`; `fae/honey_jars`;
- lights: `druids/campfire`, `mushroom_lantern`, `totem_signpost`; `fae/blue_campfire`, `light_lantern_post`, `glow_bush`;
- nature: `druids/great_oak`, `birch_tree`, `berry_bush`, `mossy_rocks`, `flower_patch`; `fae/weeping_willow`, `silver_birch`,
  `crystal_rocks`, `fairy_ring`;
- the bridges: `druids/log_bridge`, `fae/root_bridge`.

**What the Orc sheets already give every hold:** our own siege works (the ladders, the ram, the trebuchet), so no sheet here paints them.

**How to use them** (as for the other sets):

- Paste everything inside one fence into a new ChatGPT (Codex) conversation.
- Each prompt stands alone, and all of them add to the one branch, `art/assault-wildwood`, under `art-source/assault/wildwood/`, and the one
  pull request, "Assault art: Elder Root".
- Each sheet is one image. If a sheet comes back wrong (the angle, the grid, a busy background), run the same prompt again. Allow two or
  three tries a sheet.
- ChatGPT adds the PNGs only. The builder cuts the sheets afterwards, credits them, and adds them to the service worker.

**The reference files the prompts name:**

- `docs/samples/assault-art/wildwood-kit.jpg`: the Druids and Fae kit pieces, labelled (on `claude/assault-2` until it is merged);
- `docs/samples/assault-art/template-*.png`: the grids (on `claude/assault-art-plan` until it is merged);
- `src/art/camp/camp-wild.png`, its top row: the Elder-root stronghold as the overlook paints it;
- `src/art/areas/forest/` and `src/art/areas/swamp/`: those lands' tops and sides as the game draws them today.

Each prompt says how to fetch the files from those branches if they are missing on main.

| # | Sheet | File | Canvas | Cells | The Orc sheet it matches |
| --- | --- | --- | --- | --- | --- |
| 1 | WLD-01 The ring of thorn hedge | `wld-01-thorn-hedge.png` | 1024 x 1024 | 16 | ORC-01 the palisade |
| 2 | WLD-02 The ring's gates | `wld-02-gates.png` | 1536 x 1024 | 6 | ORC-02 the palisade's gates |
| 3 | WLD-03 The Heartwood Gate and the towers | `wld-03-heartwood-gate.png` | 1536 x 1024 | 6 | ORC-03 the Iron Gate |
| 4 | WLD-04 Cliff and wall faces | `wld-04-faces.png` | 1536 x 1024 | 12 | ORC-04 the faces |
| 5 | WLD-05 Ground textures | `wld-05-ground.png` | 1024 x 1024 | 16 | ORC-05 the ground |
| 6 | WLD-06 Ground transitions | `wld-06-transitions.png` | 1024 x 1024 | 16 | ORC-06 the transitions |
| 7 | WLD-07 The Elder Root and the throne | `wld-07-keep.png` | 1536 x 1024 | 3 | ORC-07 the keep |
| 8 | WLD-08 The wall's dressing and the stairs | `wld-08-wall-dressing.png` | 1024 x 1024 | 16 | ORC-08 the wall's dressing |
| 9 | WLD-09 The pipers' rings and the landmarks | `wld-09-landmarks.png` | 1536 x 1024 | 6 | ORC-09 the camp's big pieces (the drums) |
| 10 | WLD-10 The grove's props | `wld-10-props.png` | 1024 x 1024 | 16 | ORC-10 the camp's props |
| 11 | WLD-11 Ruins and the satyrs' camp's burnt states | `wld-11-ruins.png` | 1536 x 1024 | 6 | ORC-11 siege works and ruins |
| 12 | WLD-12 The mire | `wld-12-mire.png` | 1024 x 1024 | 16 | ORC-12 bridges, fords and the river |
| 13 | WLD-13 Ground decals | `wld-13-decals.png` | 1024 x 1024 | 16 | ORC-13 the decals |

They are ordered by what the hold needs first: its walls and gates, then its ground, then its heart and dressing.

---

## Prompt 1: WLD-01, the ring of thorn hedge woven through sharpened stakes, in every state of the siege

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Wildwood's: Elder Root, an ancient forest grown into a fortress at dusk: a black mire crossed by a bridge of living roots, a ring
of thorn hedge woven through sharpened stakes, standing-stone circles where satyrs pipe the grove into a frenzy, a wall of colossal
braided roots and old mossy stone, and at its heart the Elder Root itself, a vast hollow tree with a lit door in its trunk.
This task paints ONE sheet: the ring of thorn hedge woven through sharpened stakes, in every state of the siege.

Rules for this task:
- Branch: art/assault-wildwood. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/wildwood/wld-01-thorn-hedge.png. Change no other file.
- Size: the image tool's own output size does not matter (it often gives 1254 x 1254 or another size). Paint the pieces at whatever size
  it gives, then with Pillow cut each piece out, scale it so it fills its cell like the Orc sheet's matching piece, and pack the pieces
  into a new transparent canvas of exactly the size below, each in its own cell near its foot point. That is expected, not a failure:
  placement and scale only need to be close, because the game's cutter re-anchors every piece. Never stop because of the size.
- Pull request into main titled "Assault art: Elder Root". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG). Each piece casts only a small soft contact shadow on its own footprint.

Open these files first and match them:
- docs/samples/assault-art/wildwood-kit.jpg: the Druids and Fae kits (Chronos Settlement's isometric kits), labelled. Your pieces
  stand beside these on the map, so match them exactly: the mossy timber and turf roofs, the living hedges and woven wattle, the grey
  standing stones, the gnarled roots, and the soft glow of mushroom lanterns, fireflies and blue fae fire.
  Above all druids/hedge_wall_run, druids/hedge_wall_corner and druids/wattle_fence: the same leaves, woven withies and stakes.
- src/art/camp/camp-wild.png, its top row: the Elder-root stronghold as the camp's overlook paints it (its great hollow tree, its root
  walkways, its stone circle and lanterns). Match its look closely.
- src/art/areas/forest/top1.png and src/art/areas/swamp/top1.png: the forest and swamp lands' ground as the game draws them today.
- docs/samples/assault-art/template-props-1024.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/wildwood-kit.jpg > /tmp/wildwood-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

Style: detailed painted pixel art, exactly like the Druids and Fae kits. Crisp dark outlines, chunky readable shapes, a palette of
deep forest greens, moss, dark bark and grey stone, the mire's black water, with warm amber lantern light and a little blue-green
fae glow as the accents. It must read clearly when shown at a quarter of this size on a phone.

The angle and scale, exactly:
- True 2:1 isometric (dimetric) view, no perspective: a flat square tile on the ground is a diamond exactly twice as wide as it is
  tall, its corners pointing up, right, down and left. Vertical edges stay vertical.
- ONE TILE = a diamond 128 px wide and 64 px tall. ONE HEIGHT STEP = 24 px.
- Light from the upper left: faces turned to the lower left are lit; faces turned to the lower right are in shade.
- "Along u" means running from the upper left down to the lower right (like "\"). Every run on this sheet runs along u, passing
  through its tile from the midpoint of the diamond's upper-left edge to the midpoint of its lower-right edge, so that pieces placed on
  neighbouring tiles join seamlessly at those points. (The game mirrors them for runs going the other way.)
- The hold is drawn at dusk under a thick canopy: lit pieces glow warm amber (lanterns, hearths, windows) and here and there a soft
  blue-green fae glow (mushrooms, fireflies, runes that are only spirals, never letters).
- The wall stands about 4 steps (96 px) tall: a dense hedge of dark holly and bramble grown through a frame of sharpened stakes and
  woven withies, long thorns bristling outward.
- The OUTER face is the one turned to the viewer's lower left: the thorns and the stake points. The INNER face (cell 5) is the back of the
  same wall: the woven withies, a plank fighting step and a few hanging lanterns.

The sheet: 1024 x 1024 px, a 4 x 4 grid of 256 x 256 cells, read left to right, top to bottom. Every piece has a ONE-TILE footprint:
its diamond's centre (the foot point) is at (128, 208) inside its cell. Keep each piece inside its own cell with 8 px to spare.

1. Hedge run, outer face, whole: bramble and holly through sharpened stakes, long thorns, a few red berries.
2. The same run, battered: hacked and torn, stakes split, leaves scorched brown, arrows caught in it.
3. The same run, broken: cut down to a tangle of stumps and torn bramble about 1.5 steps high, a stake fallen across. Still a barrier.
4. The breach: no wall left. A ramp of torn bramble, broken stakes and earth sloping down to the lower left, as if into a ditch. Walkable.
5. Hedge run, inner face, whole: the back of cell 1. Woven withies, a plank fighting step a step and a half up, a mushroom lantern.
6. Corner, south (the corner nearest the viewer): two runs meet at the bottom of the tile, one running up-left and one up-right, both
   showing their OUTER faces, round a thick living tree trunk grown into the hedge.
7. Corner, north (the far corner): two runs meet at the top of the tile, going down-left and down-right, both showing their INNER faces,
   round a trunk with a small platform and a lantern.
8. Corner, east: a run coming from the upper left meets a run going down to the lower left at the tile's right corner. The first shows
   its inner face and the second its outer face. A trunk at the corner.
9. Gate post: a tall carved post of living wood, taller than the wall, its top grown into a horned satyr's face, ivy and a lantern.
   It ends a run beside a gate.
10. Sally port, one tile wide, whole: a narrow gate of woven thorn on a frame of withies, set in the run, outer face.
11. The sally port, battered: hacked, the weave torn.
12. The sally port, broken: torn open, the woven leaf hanging from its post. Passable.
13. Barricade (the root bridge's fort): a low wall, chest-high (about 2 steps), of felled logs, a cart on its side and bramble piled
    over, a few sharpened stakes out front. Runs along u.
14. The barricade, broken: scattered logs and bramble, the cart smashed, low enough to step over.
15. Thorn thicket: a cluster of sharpened stakes and briars driven into the ground, leaning out to the lower left, about 1.5 steps high.
    Fills most of the tile.
16. Stake line: a single row of sharpened stakes across the tile along u, leaning out to the lower left, about 2 steps high, bramble
    wound between them.
```

## Prompt 2: WLD-02, the ring's two great gates, in their siege states, and the gate towers' tops

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Wildwood's: Elder Root, an ancient forest grown into a fortress at dusk: a black mire crossed by a bridge of living roots, a ring
of thorn hedge woven through sharpened stakes, standing-stone circles where satyrs pipe the grove into a frenzy, a wall of colossal
braided roots and old mossy stone, and at its heart the Elder Root itself, a vast hollow tree with a lit door in its trunk.
This task paints ONE sheet: the ring's two great gates, in their siege states, and the gate towers' tops.

Rules for this task:
- Branch: art/assault-wildwood. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/wildwood/wld-02-gates.png. Change no other file.
- Size: the image tool's own output size does not matter (it often gives 1254 x 1254 or another size). Paint the pieces at whatever size
  it gives, then with Pillow cut each piece out, scale it so it fills its cell like the Orc sheet's matching piece, and pack the pieces
  into a new transparent canvas of exactly the size below, each in its own cell near its foot point. That is expected, not a failure:
  placement and scale only need to be close, because the game's cutter re-anchors every piece. Never stop because of the size.
- Pull request into main titled "Assault art: Elder Root". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG). Each piece casts only a small soft contact shadow on its own footprint.

Open these files first and match them:
- docs/samples/assault-art/wildwood-kit.jpg: the Druids and Fae kits (Chronos Settlement's isometric kits), labelled. Your pieces
  stand beside these on the map, so match them exactly: the mossy timber and turf roofs, the living hedges and woven wattle, the grey
  standing stones, the gnarled roots, and the soft glow of mushroom lanterns, fireflies and blue fae fire.
  Above all druids/tree_gate, fae/flower_arch_gate and druids/watch_platform.
- src/art/camp/camp-wild.png, its top row: the Elder-root stronghold as the camp's overlook paints it (its great hollow tree, its root
  walkways, its stone circle and lanterns). Match its look closely.
- src/art/areas/forest/top1.png and src/art/areas/swamp/top1.png: the forest and swamp lands' ground as the game draws them today.
- docs/samples/assault-art/template-buildings-1536.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/wildwood-kit.jpg > /tmp/wildwood-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

Style: detailed painted pixel art, exactly like the Druids and Fae kits. Crisp dark outlines, chunky readable shapes, a palette of
deep forest greens, moss, dark bark and grey stone, the mire's black water, with warm amber lantern light and a little blue-green
fae glow as the accents. It must read clearly when shown at a quarter of this size on a phone.

The angle and scale, exactly:
- True 2:1 isometric (dimetric) view, no perspective: a flat square tile on the ground is a diamond exactly twice as wide as it is
  tall, its corners pointing up, right, down and left. Vertical edges stay vertical.
- ONE TILE = a diamond 128 px wide and 64 px tall. ONE HEIGHT STEP = 24 px.
- Light from the upper left: faces turned to the lower left are lit; faces turned to the lower right are in shade.
- The hold is drawn at dusk under a thick canopy: lit pieces glow warm amber (lanterns, hearths, windows) and here and there a soft
  blue-green fae glow (mushrooms, fireflies, runes that are only spirals, never letters).
- The ring's hedge is about 4 steps (96 px) tall; a gate's sides stand flush with it and may rise higher (a gate tower).
- The gates run along u (from the upper left down to the lower right, like "\"); the game mirrors them.

The sheet: 1536 x 1024 px, a 3 x 2 grid of 512 x 512 cells, read left to right, top to bottom. The foot point (the centre of the
footprint diamond) is at (256, 416) in every cell. Footprints: cells 1 to 4 are 2 tiles along u by 1 through (a diamond 192 x 96); cells 5 and 6 are 2 x 2 tiles (a diamond 256 x 128). Keep each piece inside its cell with 8 px to spare.

1. The Bramble Gate (the south gate), whole, outer face to the lower left: two great trees grown together into an arch over a double gate
   of woven thorn on heavy timber, roots gripping the ground either side, lanterns hung in the branches, long thorns all over.
2. The same Bramble Gate, battered: the weave hacked and scorched, a bough torn away, arrows in the wood, leaves fallen.
3. The same Bramble Gate, broken: the leaves torn off and lying flat, the arch of trees still standing, the passage open and walkable,
   splintered thorn at the sides (not in the passage).
4. The North Gate, whole, INNER face to the lower left (it stands on the ring's far side): the same build seen from inside, with its
   bar of a single log across and a lantern.
5. The North Gate, broken (inner face): the bar snapped, the leaves hanging open, passable.
6. A gate tower's top: what stands on top of a 2 x 2 timber gate tower that the game raises: a platform in a tree's crown with a turf
   roof, a horn on a stand, a green banner on a pole, a mushroom lantern.
```

## Prompt 3: WLD-03, the root wall's great Heartwood Gate, the postern and the corner towers' tops

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Wildwood's: Elder Root, an ancient forest grown into a fortress at dusk: a black mire crossed by a bridge of living roots, a ring
of thorn hedge woven through sharpened stakes, standing-stone circles where satyrs pipe the grove into a frenzy, a wall of colossal
braided roots and old mossy stone, and at its heart the Elder Root itself, a vast hollow tree with a lit door in its trunk.
This task paints ONE sheet: the root wall's great Heartwood Gate, the postern and the corner towers' tops.

Rules for this task:
- Branch: art/assault-wildwood. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/wildwood/wld-03-heartwood-gate.png. Change no other file.
- Size: the image tool's own output size does not matter (it often gives 1254 x 1254 or another size). Paint the pieces at whatever size
  it gives, then with Pillow cut each piece out, scale it so it fills its cell like the Orc sheet's matching piece, and pack the pieces
  into a new transparent canvas of exactly the size below, each in its own cell near its foot point. That is expected, not a failure:
  placement and scale only need to be close, because the game's cutter re-anchors every piece. Never stop because of the size.
- Pull request into main titled "Assault art: Elder Root". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG). Each piece casts only a small soft contact shadow on its own footprint.

Open these files first and match them:
- docs/samples/assault-art/wildwood-kit.jpg: the Druids and Fae kits (Chronos Settlement's isometric kits), labelled. Your pieces
  stand beside these on the map, so match them exactly: the mossy timber and turf roofs, the living hedges and woven wattle, the grey
  standing stones, the gnarled roots, and the soft glow of mushroom lanterns, fireflies and blue fae fire.
  Above all druids/tree_gate, druids/great_oak and druids/mossy_rocks.
- src/art/camp/camp-wild.png, its top row: the Elder-root stronghold as the camp's overlook paints it (its great hollow tree, its root
  walkways, its stone circle and lanterns). Match its look closely.
- src/art/areas/forest/top1.png and src/art/areas/swamp/top1.png: the forest and swamp lands' ground as the game draws them today.
- docs/samples/assault-art/template-buildings-1536.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/wildwood-kit.jpg > /tmp/wildwood-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

Style: detailed painted pixel art, exactly like the Druids and Fae kits. Crisp dark outlines, chunky readable shapes, a palette of
deep forest greens, moss, dark bark and grey stone, the mire's black water, with warm amber lantern light and a little blue-green
fae glow as the accents. It must read clearly when shown at a quarter of this size on a phone.

The angle and scale, exactly:
- True 2:1 isometric (dimetric) view, no perspective: a flat square tile on the ground is a diamond exactly twice as wide as it is
  tall, its corners pointing up, right, down and left. Vertical edges stay vertical.
- ONE TILE = a diamond 128 px wide and 64 px tall. ONE HEIGHT STEP = 24 px.
- Light from the upper left: faces turned to the lower left are lit; faces turned to the lower right are in shade.
- The hold is drawn at dusk under a thick canopy: lit pieces glow warm amber (lanterns, hearths, windows) and here and there a soft
  blue-green fae glow (mushrooms, fireflies, runes that are only spirals, never letters).
- The inner wall is a wall of colossal braided roots grown over old mossy stone. It is exactly 6 steps (144 px) tall from the ground to
  its walkway, plus a parapet. The game draws the wall itself; the gates fill gaps in it, so each gate's front must be exactly 144 px tall
  to the walkway line, flush with the wall on either side, and may rise higher above it (a gate tower).
- The gates run along u (from the upper left down to the lower right, like "\"); the game mirrors them. The wall is 2 tiles thick.

The sheet: 1536 x 1024 px, a 3 x 2 grid of 512 x 512 cells, read left to right, top to bottom. The foot point (the centre of the
footprint diamond) is at (256, 416) in every cell. Footprints: cells 1 to 3 are 2 x 2 tiles (a diamond 256 x 128); cells 4 and 5 are 1 tile along the wall by 2 tiles through it (a diamond 192 x 96); cell 6 is 3 x 3 tiles (a diamond 384 x 192). Keep each piece inside its cell with 8 px to spare.

1. The Heartwood Gate, whole, seen from OUTSIDE (outer face to the lower left): a gatehouse of mossy stone 6 steps tall, swallowed by
   enormous roots, a deep passage closed by a gate of dark heartwood bound with living vines, two stone satyr heads either side, glowing
   spiral carvings, and above the walkway a tree's crown with a turf-roofed lookout. The strongest-looking thing on the map.
2. The same Heartwood Gate, battered: the gate split and scorched, roots hacked, stones cracked round the passage, the glow flickering.
3. The same Heartwood Gate, broken: the gate torn apart and thrown aside, the passage open and walkable, split roots and stone at the
   sides (not in the passage), the crown above torn but standing.
4. The postern, whole, seen from INSIDE (inner face to the lower left): a low doorway through the 2-thick wall between two great roots,
   a round door of planks, a lantern. Flush with the wall, 6 steps tall.
5. The postern, broken: the door torn off and lying on the moss, the opening walkable.
6. Corner tower top: the top of a root-and-stone tower that the game raises as a 3 x 3 column (draw only what stands on its top): a
   timber platform in the crown of a tree grown up through the tower, ringed by a woven parapet about 1.5 steps high, a lantern, a
   banner, a turf roof over one corner.
```

## Prompt 4: WLD-04, the flat face textures the game shears onto every cliff, bank and wall

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Wildwood's: Elder Root, an ancient forest grown into a fortress at dusk: a black mire crossed by a bridge of living roots, a ring
of thorn hedge woven through sharpened stakes, standing-stone circles where satyrs pipe the grove into a frenzy, a wall of colossal
braided roots and old mossy stone, and at its heart the Elder Root itself, a vast hollow tree with a lit door in its trunk.
This task paints ONE sheet: the flat face textures the game shears onto every cliff, bank and wall.

Rules for this task:
- Branch: art/assault-wildwood. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/wildwood/wld-04-faces.png. Change no other file.
- Size: the image tool's own output size does not matter (it often gives 1254 x 1254 or another size). Paint the pieces at whatever size
  it gives, then with Pillow cut each piece out, scale it so it fills its cell like the Orc sheet's matching piece, and pack the pieces
  into a new transparent canvas of exactly the size below, each in its own cell near its foot point. That is expected, not a failure:
  placement and scale only need to be close, because the game's cutter re-anchors every piece. Never stop because of the size.
- Pull request into main titled "Assault art: Elder Root". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered column.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Opaque textures; leave only the unused bottom band of each column (y 480 to 512) transparent. Lip edges may have a transparent
  ragged top (grass, stakes, leaves).

Open these files first and match them:
- docs/samples/assault-art/wildwood-kit.jpg: the Druids and Fae kits (Chronos Settlement's isometric kits), labelled. Your pieces
  stand beside these on the map, so match them exactly: the mossy timber and turf roofs, the living hedges and woven wattle, the grey
  standing stones, the gnarled roots, and the soft glow of mushroom lanterns, fireflies and blue fae fire.
- src/art/camp/camp-wild.png, its top row: the Elder-root stronghold as the camp's overlook paints it (its great hollow tree, its root
  walkways, its stone circle and lanterns). Match its look closely.
- src/art/areas/forest/top1.png and src/art/areas/swamp/top1.png: the forest and swamp lands' ground as the game draws them today.
- src/art/areas/forest/side.png and src/art/areas/swamp/side.png: today's tiny side strips, which these replace.
- docs/samples/assault-art/template-faces-1536.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/wildwood-kit.jpg > /tmp/wildwood-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

THE VIEW IS STRAIGHT-ON, NOT ISOMETRIC: draw each face as a flat elevation, as if standing square in front of the wall, with no
perspective and no skew. The game skews it. Light from the upper left, evenly across the face (the game adds the shading for which
side it is on). Style: painted pixel art matching the Druids and Fae kits, chunky and readable.

The sheet: 1536 x 1024 px, 6 columns of 256 px, in two rows of 512 px: twelve columns, numbered left to right along the top row
(1 to 6), then the bottom row (7 to 12). Each column is one face set, 256 px wide (the length of one tile's edge), and must tile
seamlessly LEFT TO RIGHT with itself. Inside each column, from its top:
- the LIP, y 0 to 80 (one height step): the face's top edge, what overhangs or crowns it;
- the BODY, y 80 to 400 (four steps of 80 px): the face itself; it must tile seamlessly UP AND DOWN and left to right, because the
  game repeats it for walls of any height;
- the FOOT, y 400 to 480 (one step): where the face meets the ground;
- y 480 to 512: empty.
The lip's bottom must flow into the body's top, and the body's bottom into the foot's top, with no seam.

1. Forest bank: dark loam with roots and stones through it; lip: ferns and moss overhanging; foot: leaf litter.
2. Mossy earth: earth under a thick green moss skin; lip: grass and small flowers; foot: moss.
3. Mire bank (a ditch's side): black wet peat, roots and old stakes in it; lip: rushes; foot: a dark water line.
4. Earth rampart held by woven withies: packed earth behind wattle and stakes; lip: the earth top with sharpened stakes; foot: mud.
5. Hedge skin: dense holly and bramble on stakes, thorns outward; lip: the stake tips and leaves (ragged, transparent between them);
   foot: roots and earth.
6. Root wall: colossal braided roots over old mossy stone blocks; lip: a woven parapet with leaves (ragged, transparent between);
   foot: roots spreading into moss.
7. The same root wall, battle-damaged: roots hacked through, stones fallen out, scorch marks; lip: broken parapet; foot: rubble and wood.
8. Corner tower masonry: rounded mossy stones in roots, an arrow slit in the body's middle, glowing spirals carved; lip: a mossy ledge;
   foot: a stone plinth in ferns.
9. Grove terrace wall: dry-stacked grey stones with moss and small ferns; lip: a flagstone edge with grass; foot: moss.
10. Bark cliff: the bark of a colossal tree, deep ridges, moss and shelf fungus; lip: roots arching over; foot: roots and leaf litter.
11. Mire's edge: wet dark rock and peat with a pale waterline and green weed low down; lip: rushes; foot: wet mud.
12. Waterfall rock: dark wet stone streaked by thin falling water, ferns in the cracks; lip: moss and water spilling over; foot: foam.
```

## Prompt 5: WLD-05, sixteen seamless ground textures, from the forest floor to the mire

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Wildwood's: Elder Root, an ancient forest grown into a fortress at dusk: a black mire crossed by a bridge of living roots, a ring
of thorn hedge woven through sharpened stakes, standing-stone circles where satyrs pipe the grove into a frenzy, a wall of colossal
braided roots and old mossy stone, and at its heart the Elder Root itself, a vast hollow tree with a lit door in its trunk.
This task paints ONE sheet: sixteen seamless ground textures, from the forest floor to the mire.

Rules for this task:
- Branch: art/assault-wildwood. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/wildwood/wld-05-ground.png. Change no other file.
- Size: the image tool's own output size does not matter (it often gives 1254 x 1254 or another size). Paint the pieces at whatever size
  it gives, then with Pillow cut each piece out, scale it so it fills its cell like the Orc sheet's matching piece, and pack the pieces
  into a new transparent canvas of exactly the size below, each in its own cell near its foot point. That is expected, not a failure:
  placement and scale only need to be close, because the game's cutter re-anchors every piece. Never stop because of the size.
- Pull request into main titled "Assault art: Elder Root". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Opaque image.

Open these files first and match them:
- src/art/areas/forest/top1.png, src/art/areas/forest/top2.png and src/art/areas/swamp/top1.png: today's 64 px tops, which these replace
  (keep their pixel density: 64 px a tile).
- docs/samples/assault-art/wildwood-kit.jpg: the kits' druids/forest_floor_tile, druids/moss_grass_tile, druids/stone_path_tile,
  fae/moss_forest_tile, fae/meadow_tile and fae/pebble_path_tile give the colours to match.
- src/art/camp/camp-wild.png, its top row: the Elder-root stronghold as the overlook paints it.
- docs/samples/assault-art/template-textures-1024.png: the grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/wildwood-kit.jpg > /tmp/wildwood-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

THE VIEW IS STRAIGHT DOWN, NOT ISOMETRIC: draw each texture as seen from directly above, like a map, with no perspective, no horizon
and no cast shadows longer than a pebble's. Style: painted pixel art matching the kits' ground tiles; readable, not noisy; no single
feature so striking that its repeat would be noticed.

The sheet: 1024 x 1024 px, a 4 x 4 grid of 256 x 256 squares, read left to right, top to bottom. EACH SQUARE IS ONE TEXTURE COVERING
4 x 4 TILES, AND MUST TILE SEAMLESSLY WITH ITSELF ON ALL FOUR SIDES (its left edge continues its right edge, its top its bottom).
Keep the squares separate: nothing crosses from one square into the next.

1. Forest grass: deep green grass in shade with darker tufts and a few small stones.
2. Forest grass, second variant: the same, with clover and tiny white flowers.
3. Ferns and moss: low ferns over thick moss, for the forest's wild rear.
4. Trampled grass: worn grass with bare earth and hoofprints (the satyrs' cloven hooves), round the posts.
5. Dark loam: rich dark earth, hoofprinted.
6. Leaf litter: the loam under fallen brown and gold leaves and twigs.
7. Black mire mud: wet black ruts and puddles, for the lanes and the ditch floor.
8. Root-tangled floor: a forest floor crossed by small roots and moss.
9. Moss carpet: soft thick moss with tiny glowing blue-green specks.
10. Mushroom ring floor: dark moss scattered with small pale mushrooms (not a ring; spread evenly).
11. Trodden grove floor: packed earth and moss worn by many feet, for the grove's yards.
12. Mossy flagstones: big uneven grey flags with moss in the joints.
13. Wall-walk planks: heavy timber planks seen from above, running from the top of the square to the bottom, moss at the edges.
14. Pine needles: a floor of brown needles, cones and twigs.
15. Mire shingle: dark wet pebbles and silt.
16. Shallow mire water over silt: still dark brown-green water over mud, a few lily pads and duckweed.
```

## Prompt 6: WLD-06, the overlays the game lays where two grounds meet

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Wildwood's: Elder Root, an ancient forest grown into a fortress at dusk: a black mire crossed by a bridge of living roots, a ring
of thorn hedge woven through sharpened stakes, standing-stone circles where satyrs pipe the grove into a frenzy, a wall of colossal
braided roots and old mossy stone, and at its heart the Elder Root itself, a vast hollow tree with a lit door in its trunk.
This task paints ONE sheet: the overlays the game lays where two grounds meet.

Rules for this task:
- Branch: art/assault-wildwood. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/wildwood/wld-06-transitions.png. Change no other file.
- Size: the image tool's own output size does not matter (it often gives 1254 x 1254 or another size). Paint the pieces at whatever size
  it gives, then with Pillow cut each piece out, scale it so it fills its cell like the Orc sheet's matching piece, and pack the pieces
  into a new transparent canvas of exactly the size below, each in its own cell near its foot point. That is expected, not a failure:
  placement and scale only need to be close, because the game's cutter re-anchors every piece. Never stop because of the size.
- Pull request into main titled "Assault art: Elder Root". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG): each overlay is the material only, and everything else is transparent.

Open these files first and match them:
- art-source/assault/wildwood/wld-05-ground.png on this branch, if it is there: the ground textures these overlays must match exactly in
  colour and pixel density. If it is not there yet, match the descriptions below and src/art/areas/forest/top1.png.
- docs/samples/assault-art/template-textures-1024.png: the grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/wildwood-kit.jpg > /tmp/wildwood-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

Where two grounds meet (moss beside loam, a path's edge), the game lays an overlay along the shared edge so the join is ragged and
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

1. Black mire mud spreading onto grass: edge.   2. The same: outer corner.
3. Scorched earth and ash (fire arrows): edge.   4. The same: outer corner.
5. Mossy flagstones meeting grass: edge.        6. The same: outer corner.
7. A trodden path's edge over grass: edge.      8. The same: outer corner.
9. Mire shingle onto grass: edge.               10. The same: outer corner.
11. Flagstones sinking into moss: edge.         12. The same: outer corner.
13. Ferns creeping onto loam: edge.             14. The same: outer corner.
15. The water's edge: a thin rim of rushes, duckweed and wet dark stones, laid on the water side of a bank: edge.
16. The same: outer corner.
```

## Prompt 7: WLD-07, the Elder Root, the throne of roots and the great banner

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Wildwood's: Elder Root, an ancient forest grown into a fortress at dusk: a black mire crossed by a bridge of living roots, a ring
of thorn hedge woven through sharpened stakes, standing-stone circles where satyrs pipe the grove into a frenzy, a wall of colossal
braided roots and old mossy stone, and at its heart the Elder Root itself, a vast hollow tree with a lit door in its trunk.
This task paints ONE sheet: the Elder Root, the throne of roots and the great banner.

Rules for this task:
- Branch: art/assault-wildwood. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/wildwood/wld-07-keep.png. Change no other file.
- Size: the image tool's own output size does not matter (it often gives 1254 x 1254 or another size). Paint the pieces at whatever size
  it gives, then with Pillow cut each piece out, scale it so it fills its cell like the Orc sheet's matching piece, and pack the pieces
  into a new transparent canvas of exactly the size below, each in its own cell near its foot point. That is expected, not a failure:
  placement and scale only need to be close, because the game's cutter re-anchors every piece. Never stop because of the size.
- Pull request into main titled "Assault art: Elder Root". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG). Each piece casts only a small soft contact shadow on its own footprint.

Open these files first and match them:
- docs/samples/assault-art/wildwood-kit.jpg: the Druids and Fae kits (Chronos Settlement's isometric kits), labelled. Your pieces
  stand beside these on the map, so match them exactly: the mossy timber and turf roofs, the living hedges and woven wattle, the grey
  standing stones, the gnarled roots, and the soft glow of mushroom lanterns, fireflies and blue fae fire.
  Above all druids/great_oak, fae/weeping_willow and druids/shrine.
- src/art/camp/camp-wild.png, its top row: the Elder-root stronghold as the camp's overlook paints it (its great hollow tree, its root
  walkways, its stone circle and lanterns). Match its look closely.
- src/art/areas/forest/top1.png and src/art/areas/swamp/top1.png: the forest and swamp lands' ground as the game draws them today.
- docs/samples/assault-art/template-keep-1536.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/wildwood-kit.jpg > /tmp/wildwood-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

Style: detailed painted pixel art, exactly like the Druids and Fae kits. Crisp dark outlines, chunky readable shapes, a palette of
deep forest greens, moss, dark bark and grey stone, the mire's black water, with warm amber lantern light and a little blue-green
fae glow as the accents. It must read clearly when shown at a quarter of this size on a phone.

The angle and scale, exactly:
- True 2:1 isometric (dimetric) view, no perspective: a flat square tile on the ground is a diamond exactly twice as wide as it is
  tall, its corners pointing up, right, down and left. Vertical edges stay vertical.
- ONE TILE = a diamond 128 px wide and 64 px tall. ONE HEIGHT STEP = 24 px.
- Light from the upper left: faces turned to the lower left are lit; faces turned to the lower right are in shade.
- The hold is drawn at dusk under a thick canopy: lit pieces glow warm amber (lanterns, hearths, windows) and here and there a soft
  blue-green fae glow (mushrooms, fireflies, runes that are only spirals, never letters).
- A doorway is about 4 steps (96 px) tall.

The sheet: 1536 x 1024 px. Three cells:
1. Cell 1, x 0 to 1024, y 0 to 1024: THE ELDER ROOT. Footprint 6 tiles along u (upper left to lower right) by 4 tiles along v: a
   diamond 640 px wide and 320 px tall, centred on the foot point (512, 840). It may rise up to about 640 px above its foot.
   A vast ancient hollow tree, its trunk as broad as a hall, great roots spilling down over a mossy stone terrace; a tall arched door in
   the trunk facing the lower left, glowing amber from within, round windows above it and a timber gallery wound round the trunk,
   lanterns hung from the boughs, glowing spiral carvings in the bark, a thin waterfall spilling from a hollow in the roots into a pool,
   and a dense dark canopy above (cut off by the cell's top edge if need be). Grander than anything else on the map.
2. Cell 2, x 1024 to 1536, y 0 to 512: THE THRONE OF ROOTS. One-tile footprint (a diamond 128 x 64) centred on the foot point (256, 440)
   in the cell. A great seat grown from living roots, its back a fan of antlers and branches about 6 steps tall, moss cushions, two
   mushroom lanterns on the two-step stone dais. Facing the lower left.
3. Cell 3, x 1024 to 1536, y 512 to 1024: THE GREAT BANNER. One-tile footprint centred on (256, 440) in the cell. A tall pole (about
   14 steps) of pale birch in a cairn of mossy stones, a crossbar hung with a long green banner painted with a great tree, tattered at the
   bottom, a horned skull on top of the pole, ribbons and feathers tied below the crossbar.
```

## Prompt 8: WLD-08, the root wall's dressing, the stairs and small structures

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Wildwood's: Elder Root, an ancient forest grown into a fortress at dusk: a black mire crossed by a bridge of living roots, a ring
of thorn hedge woven through sharpened stakes, standing-stone circles where satyrs pipe the grove into a frenzy, a wall of colossal
braided roots and old mossy stone, and at its heart the Elder Root itself, a vast hollow tree with a lit door in its trunk.
This task paints ONE sheet: the root wall's dressing, the stairs and small structures.

Rules for this task:
- Branch: art/assault-wildwood. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/wildwood/wld-08-wall-dressing.png. Change no other file.
- Size: the image tool's own output size does not matter (it often gives 1254 x 1254 or another size). Paint the pieces at whatever size
  it gives, then with Pillow cut each piece out, scale it so it fills its cell like the Orc sheet's matching piece, and pack the pieces
  into a new transparent canvas of exactly the size below, each in its own cell near its foot point. That is expected, not a failure:
  placement and scale only need to be close, because the game's cutter re-anchors every piece. Never stop because of the size.
- Pull request into main titled "Assault art: Elder Root". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG). Each piece casts only a small soft contact shadow on its own footprint.

Open these files first and match them:
- docs/samples/assault-art/wildwood-kit.jpg: the Druids and Fae kits (Chronos Settlement's isometric kits), labelled. Your pieces
  stand beside these on the map, so match them exactly: the mossy timber and turf roofs, the living hedges and woven wattle, the grey
  standing stones, the gnarled roots, and the soft glow of mushroom lanterns, fireflies and blue fae fire.
  Above all druids/mushroom_lantern, druids/totem_signpost and fae/light_lantern_post.
- src/art/camp/camp-wild.png, its top row: the Elder-root stronghold as the camp's overlook paints it (its great hollow tree, its root
  walkways, its stone circle and lanterns). Match its look closely.
- src/art/areas/forest/top1.png and src/art/areas/swamp/top1.png: the forest and swamp lands' ground as the game draws them today.
- docs/samples/assault-art/template-props-1024.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/wildwood-kit.jpg > /tmp/wildwood-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

Style: detailed painted pixel art, exactly like the Druids and Fae kits. Crisp dark outlines, chunky readable shapes, a palette of
deep forest greens, moss, dark bark and grey stone, the mire's black water, with warm amber lantern light and a little blue-green
fae glow as the accents. It must read clearly when shown at a quarter of this size on a phone.

The angle and scale, exactly:
- True 2:1 isometric (dimetric) view, no perspective: a flat square tile on the ground is a diamond exactly twice as wide as it is
  tall, its corners pointing up, right, down and left. Vertical edges stay vertical.
- ONE TILE = a diamond 128 px wide and 64 px tall. ONE HEIGHT STEP = 24 px.
- Light from the upper left: faces turned to the lower left are lit; faces turned to the lower right are in shade.
- The hold is drawn at dusk under a thick canopy: lit pieces glow warm amber (lanterns, hearths, windows) and here and there a soft
  blue-green fae glow (mushrooms, fireflies, runes that are only spirals, never letters).
- The root wall's walkway is 6 steps up; these pieces stand on it or against it.

The sheet: 1024 x 1024 px, a 4 x 4 grid of 256 x 256 cells, read left to right, top to bottom. Every piece has a ONE-TILE footprint:
its diamond's centre (the foot point) is at (128, 208) inside its cell. Keep each piece inside its own cell with 8 px to spare.

1. Woven merlon: a stout stake bound with withies and leaves, for the wall's outer edge, along u.
2. The same merlon, broken: snapped off, lying on the walk.
3. Inner rail: a low rail of a single root along the walk's inner edge, along u.
4. Wall brazier: a stone bowl of amber fire on a root stand, for the walk (about 2 steps tall).
5. Wall lantern: a lantern hung from a curled branch.
6. A small hanging banner: a green cloth on a short pole.
7. Archer's bower: a low roof of leaves over a gap in the parapet.
8. A rack of spears and short bows against the rail.
9. Stairs up the wall, along u: steps cut in a great root and stone, rising 6 steps (144 px) from the ground at the lower left to the
   walk. One tile.
10. Stairs down, the same steps seen descending to the lower right (the game uses it where a stair goes down into a pit).
11. A vine ladder hanging down a wall to the upper right, about 6 steps tall.
12. A cauldron of bubbling green brew on the walk over a fire.
13. A heap of baskets and a bedroll of moss by the wall.
14. A great horn of curled wood on a carved stand.
15. A snare: a bent sapling and a noose of vine.
16. A drift of fallen leaves against the wall, with a half-buried shield.
```

## Prompt 9: WLD-09, the pipers' rings (the hold's war drums) and its great landmarks

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Wildwood's: Elder Root, an ancient forest grown into a fortress at dusk: a black mire crossed by a bridge of living roots, a ring
of thorn hedge woven through sharpened stakes, standing-stone circles where satyrs pipe the grove into a frenzy, a wall of colossal
braided roots and old mossy stone, and at its heart the Elder Root itself, a vast hollow tree with a lit door in its trunk.
This task paints ONE sheet: the pipers' rings (the hold's war drums) and its great landmarks.

Rules for this task:
- Branch: art/assault-wildwood. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/wildwood/wld-09-landmarks.png. Change no other file.
- Size: the image tool's own output size does not matter (it often gives 1254 x 1254 or another size). Paint the pieces at whatever size
  it gives, then with Pillow cut each piece out, scale it so it fills its cell like the Orc sheet's matching piece, and pack the pieces
  into a new transparent canvas of exactly the size below, each in its own cell near its foot point. That is expected, not a failure:
  placement and scale only need to be close, because the game's cutter re-anchors every piece. Never stop because of the size.
- Pull request into main titled "Assault art: Elder Root". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG). Each piece casts only a small soft contact shadow on its own footprint.

Open these files first and match them:
- docs/samples/assault-art/wildwood-kit.jpg: the Druids and Fae kits (Chronos Settlement's isometric kits), labelled. Your pieces
  stand beside these on the map, so match them exactly: the mossy timber and turf roofs, the living hedges and woven wattle, the grey
  standing stones, the gnarled roots, and the soft glow of mushroom lanterns, fireflies and blue fae fire.
  Above all druids/stone_circle, druids/shrine, fae/fairy_ring and fae/root_bridge.
- src/art/camp/camp-wild.png, its top row: the Elder-root stronghold as the camp's overlook paints it (its great hollow tree, its root
  walkways, its stone circle and lanterns). Match its look closely.
- src/art/areas/forest/top1.png and src/art/areas/swamp/top1.png: the forest and swamp lands' ground as the game draws them today.
- docs/samples/assault-art/template-buildings-1536.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/wildwood-kit.jpg > /tmp/wildwood-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

Style: detailed painted pixel art, exactly like the Druids and Fae kits. Crisp dark outlines, chunky readable shapes, a palette of
deep forest greens, moss, dark bark and grey stone, the mire's black water, with warm amber lantern light and a little blue-green
fae glow as the accents. It must read clearly when shown at a quarter of this size on a phone.

The angle and scale, exactly:
- True 2:1 isometric (dimetric) view, no perspective: a flat square tile on the ground is a diamond exactly twice as wide as it is
  tall, its corners pointing up, right, down and left. Vertical edges stay vertical.
- ONE TILE = a diamond 128 px wide and 64 px tall. ONE HEIGHT STEP = 24 px.
- Light from the upper left: faces turned to the lower left are lit; faces turned to the lower right are in shade.
- The hold is drawn at dusk under a thick canopy: lit pieces glow warm amber (lanterns, hearths, windows) and here and there a soft
  blue-green fae glow (mushrooms, fireflies, runes that are only spirals, never letters).
- The pipers' rings play the part the orc hold's war drums do: while satyrs pipe in one, the garrison near it fights harder, until our
  troops reach it and break it.

The sheet: 1536 x 1024 px, a 3 x 2 grid of 512 x 512 cells, read left to right, top to bottom. The foot point (the centre of the
footprint diamond) is at (256, 416) in every cell. Footprints: cells 1 to 4 are 2 x 2 tiles (a diamond 256 x 128); cells 5 and 6 are 3 x 3 tiles (a diamond 384 x 192). Keep each piece inside its cell with 8 px to spare.

1. A pipers' ring, piping: a small circle of mossy standing stones round a great hollow tree stump hung with pan-pipes and bells, at the
   instant it sounds: green-gold rings of music (shapes, never notes or letters) bursting from it, leaves and fireflies whirling, the
   lanterns on the stones flaring.
2. The same pipers' ring, silenced: after our troops reached it: the stump split, the stones toppled, the pipes broken and the lanterns
   out and smoking.
3. The satyrs' revel: a ring of logs round a fire, wine casks, garlands of flowers, an overturned cup.
4. A wishing well of the grove: an old round well of mossy stone under a hawthorn, ribbons and charms tied in its branches.
5. The grove's stone circle: a ring of eight tall standing stones on a low rise, a flat altar stone in the middle with offerings of
   flowers and fruit, faint spiral carvings glowing.
6. The waterfall pool: a mossy rock face with a thin waterfall falling into a clear pool ringed by ferns, a fallen log across it.
```

## Prompt 10: WLD-10, the grove's small props the kits do not have

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Wildwood's: Elder Root, an ancient forest grown into a fortress at dusk: a black mire crossed by a bridge of living roots, a ring
of thorn hedge woven through sharpened stakes, standing-stone circles where satyrs pipe the grove into a frenzy, a wall of colossal
braided roots and old mossy stone, and at its heart the Elder Root itself, a vast hollow tree with a lit door in its trunk.
This task paints ONE sheet: the grove's small props the kits do not have.

Rules for this task:
- Branch: art/assault-wildwood. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/wildwood/wld-10-props.png. Change no other file.
- Size: the image tool's own output size does not matter (it often gives 1254 x 1254 or another size). Paint the pieces at whatever size
  it gives, then with Pillow cut each piece out, scale it so it fills its cell like the Orc sheet's matching piece, and pack the pieces
  into a new transparent canvas of exactly the size below, each in its own cell near its foot point. That is expected, not a failure:
  placement and scale only need to be close, because the game's cutter re-anchors every piece. Never stop because of the size.
- Pull request into main titled "Assault art: Elder Root". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG). Each piece casts only a small soft contact shadow on its own footprint.

Open these files first and match them:
- docs/samples/assault-art/wildwood-kit.jpg: the Druids and Fae kits (Chronos Settlement's isometric kits), labelled. Your pieces
  stand beside these on the map, so match them exactly: the mossy timber and turf roofs, the living hedges and woven wattle, the grey
  standing stones, the gnarled roots, and the soft glow of mushroom lanterns, fireflies and blue fae fire.
  The kits already give the baskets, the berry bushes, the birches, the campfires, the carts, the clay pots, the hay bales, the honey
  jars, the lanterns, the log piles, the market stalls, the mossy rocks, the shrines, the wells and the woodpiles: do not paint those
  again. These props go with them.
- src/art/camp/camp-wild.png, its top row: the Elder-root stronghold as the camp's overlook paints it (its great hollow tree, its root
  walkways, its stone circle and lanterns). Match its look closely.
- src/art/areas/forest/top1.png and src/art/areas/swamp/top1.png: the forest and swamp lands' ground as the game draws them today.
- docs/samples/assault-art/template-props-1024.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/wildwood-kit.jpg > /tmp/wildwood-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

Style: detailed painted pixel art, exactly like the Druids and Fae kits. Crisp dark outlines, chunky readable shapes, a palette of
deep forest greens, moss, dark bark and grey stone, the mire's black water, with warm amber lantern light and a little blue-green
fae glow as the accents. It must read clearly when shown at a quarter of this size on a phone.

The angle and scale, exactly:
- True 2:1 isometric (dimetric) view, no perspective: a flat square tile on the ground is a diamond exactly twice as wide as it is
  tall, its corners pointing up, right, down and left. Vertical edges stay vertical.
- ONE TILE = a diamond 128 px wide and 64 px tall. ONE HEIGHT STEP = 24 px.
- Light from the upper left: faces turned to the lower left are lit; faces turned to the lower right are in shade.
- The hold is drawn at dusk under a thick canopy: lit pieces glow warm amber (lanterns, hearths, windows) and here and there a soft
  blue-green fae glow (mushrooms, fireflies, runes that are only spirals, never letters).

The sheet: 1024 x 1024 px, a 4 x 4 grid of 256 x 256 cells, read left to right, top to bottom. Every piece has a ONE-TILE footprint:
its diamond's centre (the foot point) is at (128, 208) inside its cell. Keep each piece inside its own cell with 8 px to spare.

1. A satyr's lean-to of branches and leaves.
2. A rack of drying herbs and roots.
3. A wine cask on its side, spilling.
4. A snare trap and a heap of old bones.
5. A cluster of tall glowing mushrooms.
6. A hollow log full of moss.
7. A totem of stacked carved faces of boars, stags and satyrs.
8. A heap of antlers wound with ivy.
9. A pan-pipe stand with garlands.
10. A cage of woven withies holding a snarling boar.
11. A cooking fire with a spit.
12. A stump with an axe in it.
13. A clump of foxgloves and ferns.
14. A thorn bush with red berries.
15. A small mossy cairn with a glowing spiral.
16. A fallen spear and a horned helm in the moss.
```

## Prompt 11: WLD-11, ruins, and the burnt states of the satyrs' camp

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Wildwood's: Elder Root, an ancient forest grown into a fortress at dusk: a black mire crossed by a bridge of living roots, a ring
of thorn hedge woven through sharpened stakes, standing-stone circles where satyrs pipe the grove into a frenzy, a wall of colossal
braided roots and old mossy stone, and at its heart the Elder Root itself, a vast hollow tree with a lit door in its trunk.
This task paints ONE sheet: ruins, and the burnt states of the satyrs' camp.

Rules for this task:
- Branch: art/assault-wildwood. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/wildwood/wld-11-ruins.png. Change no other file.
- Size: the image tool's own output size does not matter (it often gives 1254 x 1254 or another size). Paint the pieces at whatever size
  it gives, then with Pillow cut each piece out, scale it so it fills its cell like the Orc sheet's matching piece, and pack the pieces
  into a new transparent canvas of exactly the size below, each in its own cell near its foot point. That is expected, not a failure:
  placement and scale only need to be close, because the game's cutter re-anchors every piece. Never stop because of the size.
- Pull request into main titled "Assault art: Elder Root". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG). Each piece casts only a small soft contact shadow on its own footprint.

Open these files first and match them:
- docs/samples/assault-art/wildwood-kit.jpg: the Druids and Fae kits (Chronos Settlement's isometric kits), labelled. Your pieces
  stand beside these on the map, so match them exactly: the mossy timber and turf roofs, the living hedges and woven wattle, the grey
  standing stones, the gnarled roots, and the soft glow of mushroom lanterns, fireflies and blue fae fire.
- src/art/camp/camp-wild.png, its top row: the Elder-root stronghold as the camp's overlook paints it (its great hollow tree, its root
  walkways, its stone circle and lanterns). Match its look closely.
- src/art/areas/forest/top1.png and src/art/areas/swamp/top1.png: the forest and swamp lands' ground as the game draws them today.
- docs/samples/assault-art/template-buildings-1536.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/wildwood-kit.jpg > /tmp/wildwood-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

Style: detailed painted pixel art, exactly like the Druids and Fae kits. Crisp dark outlines, chunky readable shapes, a palette of
deep forest greens, moss, dark bark and grey stone, the mire's black water, with warm amber lantern light and a little blue-green
fae glow as the accents. It must read clearly when shown at a quarter of this size on a phone.

The angle and scale, exactly:
- True 2:1 isometric (dimetric) view, no perspective: a flat square tile on the ground is a diamond exactly twice as wide as it is
  tall, its corners pointing up, right, down and left. Vertical edges stay vertical.
- ONE TILE = a diamond 128 px wide and 64 px tall. ONE HEIGHT STEP = 24 px.
- Light from the upper left: faces turned to the lower left are lit; faces turned to the lower right are in shade.
- Our own siege works (the ladders, the ram, the trebuchet) are already painted on the Orc hold's sheets and serve every hold: do not
  paint them. The Warpath's reserve camp here is the satyrs' camp on the forest trail: its tents burn when our archers loose fire
  arrows.
- The hold is drawn at dusk under a thick canopy: lit pieces glow warm amber (lanterns, hearths, windows) and here and there a soft
  blue-green fae glow (mushrooms, fireflies, runes that are only spirals, never letters).

The sheet: 1536 x 1024 px, a 3 x 2 grid of 512 x 512 cells, read left to right, top to bottom. The foot point (the centre of the
footprint diamond) is at (256, 416) in every cell. Footprints: cells 1 and 2 are 2 tiles along u by 1 (a diamond 192 x 96); cells 3 to 6 are 2 x 2 tiles (a diamond 256 x 128). Keep each piece inside its cell with 8 px to spare.

1. A satyrs' tent: a long tent of leaf-green cloth over bent poles, garlands on its ridge, a lantern by the flap.
2. The same tent, burnt: a black heap of charred poles and shrivelled cloth, ash, a few embers.
3. A great leaf pavilion: broad leaves over a frame of branches, lanterns inside.
4. The same pavilion, burnt: its frame standing charred, the leaves gone to ash.
5. A ruined old shrine: the mossy stone footings and two fallen columns of a shrine long overgrown, ferns growing through.
6. A fallen giant tree: a colossal trunk lying across the ground, roots torn up, moss and fungus on it.
```

## Prompt 12: WLD-12, the black mire, its bridge of roots, fords and banks

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Wildwood's: Elder Root, an ancient forest grown into a fortress at dusk: a black mire crossed by a bridge of living roots, a ring
of thorn hedge woven through sharpened stakes, standing-stone circles where satyrs pipe the grove into a frenzy, a wall of colossal
braided roots and old mossy stone, and at its heart the Elder Root itself, a vast hollow tree with a lit door in its trunk.
This task paints ONE sheet: the black mire, its bridge of roots, fords and banks.

Rules for this task:
- Branch: art/assault-wildwood. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/wildwood/wld-12-mire.png. Change no other file.
- Size: the image tool's own output size does not matter (it often gives 1254 x 1254 or another size). Paint the pieces at whatever size
  it gives, then with Pillow cut each piece out, scale it so it fills its cell like the Orc sheet's matching piece, and pack the pieces
  into a new transparent canvas of exactly the size below, each in its own cell near its foot point. That is expected, not a failure:
  placement and scale only need to be close, because the game's cutter re-anchors every piece. Never stop because of the size.
- Pull request into main titled "Assault art: Elder Root". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG). Each piece casts only a small soft contact shadow on its own footprint.

Open these files first and match them:
- docs/samples/assault-art/wildwood-kit.jpg: the Druids and Fae kits (Chronos Settlement's isometric kits), labelled. Your pieces
  stand beside these on the map, so match them exactly: the mossy timber and turf roofs, the living hedges and woven wattle, the grey
  standing stones, the gnarled roots, and the soft glow of mushroom lanterns, fireflies and blue fae fire.
  Above all fae/root_bridge and druids/log_bridge: the bridge here is their style.
- src/art/camp/camp-wild.png, its top row: the Elder-root stronghold as the camp's overlook paints it (its great hollow tree, its root
  walkways, its stone circle and lanterns). Match its look closely.
- src/art/areas/forest/top1.png and src/art/areas/swamp/top1.png: the forest and swamp lands' ground as the game draws them today.
- docs/samples/assault-art/template-props-1024.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/wildwood-kit.jpg > /tmp/wildwood-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

Style: detailed painted pixel art, exactly like the Druids and Fae kits. Crisp dark outlines, chunky readable shapes, a palette of
deep forest greens, moss, dark bark and grey stone, the mire's black water, with warm amber lantern light and a little blue-green
fae glow as the accents. It must read clearly when shown at a quarter of this size on a phone.

The angle and scale, exactly:
- True 2:1 isometric (dimetric) view, no perspective: a flat square tile on the ground is a diamond exactly twice as wide as it is
  tall, its corners pointing up, right, down and left. Vertical edges stay vertical.
- ONE TILE = a diamond 128 px wide and 64 px tall. ONE HEIGHT STEP = 24 px.
- Light from the upper left: faces turned to the lower left are lit; faces turned to the lower right are in shade.
- Elder Root has a black mire where the Orc hold has its river. The game draws the water as ground; these pieces stand in it or on its
  banks.
- "Along u" means running from the upper left down to the lower right (like "\"). Every run on this sheet runs along u, passing
  through its tile from the midpoint of the diamond's upper-left edge to the midpoint of its lower-right edge, so that pieces placed on
  neighbouring tiles join seamlessly at those points. (The game mirrors them for runs going the other way.)
- The hold is drawn at dusk under a thick canopy: lit pieces glow warm amber (lanterns, hearths, windows) and here and there a soft
  blue-green fae glow (mushrooms, fireflies, runes that are only spirals, never letters).

The sheet: 1024 x 1024 px, a 4 x 4 grid of 256 x 256 cells, read left to right, top to bottom. Every piece has a ONE-TILE footprint:
its diamond's centre (the foot point) is at (128, 208) inside its cell. Keep each piece inside its own cell with 8 px to spare.

1. Root bridge deck, whole: living roots grown into a walkway crossing along u, a rail of roots.
2. The bridge, broken: a gap of hacked roots hanging into the water. Impassable.
3. The bridge's end, where it meets the bank at the upper left, the roots diving into the earth.
4. A bridge post: a thick root post with a lantern.
5. Ford stones: a line of flat mossy stepping stones along u, their tops showing above the water.
6. Bulrushes and reeds standing in the shallows.
7. A drowned tree lying across the water.
8. Lily pads with pale flowers.
9. Wet dark boulders at the water's edge.
10. A cypress knee cluster: knobbly roots standing out of the water.
11. A small boat of bark, beached.
12. Marsh mist curling over the water (semi-transparent).
13. A sunken stone head of a satyr, half out of the water.
14. Will-o'-the-wisps: three small floating blue-green lights (semi-transparent).
15. A fishing post with a net hung to dry.
16. Rough stone steps going down into the water from the bank at the upper left.
```

## Prompt 13: WLD-13, sixteen ground decals

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Wildwood's: Elder Root, an ancient forest grown into a fortress at dusk: a black mire crossed by a bridge of living roots, a ring
of thorn hedge woven through sharpened stakes, standing-stone circles where satyrs pipe the grove into a frenzy, a wall of colossal
braided roots and old mossy stone, and at its heart the Elder Root itself, a vast hollow tree with a lit door in its trunk.
This task paints ONE sheet: sixteen ground decals.

Rules for this task:
- Branch: art/assault-wildwood. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/wildwood/wld-13-decals.png. Change no other file.
- Size: the image tool's own output size does not matter (it often gives 1254 x 1254 or another size). Paint the pieces at whatever size
  it gives, then with Pillow cut each piece out, scale it so it fills its cell like the Orc sheet's matching piece, and pack the pieces
  into a new transparent canvas of exactly the size below, each in its own cell near its foot point. That is expected, not a failure:
  placement and scale only need to be close, because the game's cutter re-anchors every piece. Never stop because of the size.
- Pull request into main titled "Assault art: Elder Root". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG).

Open these files first and match them:
- art-source/assault/wildwood/wld-05-ground.png on this branch, if it is there: the ground these lie on (match its pixel density, 64 px
  a tile at quarter size). Otherwise src/art/areas/forest/top1.png.
- docs/samples/assault-art/template-textures-1024.png: the grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/wildwood-kit.jpg > /tmp/wildwood-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

THE VIEW IS STRAIGHT DOWN, NOT ISOMETRIC, as on a map: everything lies flat on the ground, nothing stands up. Style: painted pixel
art matching the kits' ground; readable; blood is a dark red-brown, never bright or gory.

The sheet: 1024 x 1024 px, a 4 x 4 grid of 256 x 256 squares, read left to right, top to bottom. Each square holds ONE decal covering
up to 2 x 2 tiles, centred, with at least 16 px of transparency round it.

1. Blood spatter.   2. Spilt wine (a dark purple pool).   3. Torn bramble and thorns scattered.
4. Scorch mark, round (a blast).   5. Ash and embers.
6. Stone rubble scatter.   7. Timber debris (splinters, a broken stake, withies).
8. Cart ruts: two parallel wheel tracks running straight from the square's top edge to its bottom edge (so they join end to end).
9. Cloven hoofprints: a trail of satyrs' hoofprints crossing the square.   10. Boar tracks crossing.
11. A puddle of dark water with duckweed.   12. Fallen leaves blown flat.
13. Scattered bones and moss.   14. A loose ring of small pale mushrooms.
15. Glowing spores: a soft scatter of tiny blue-green lights on the ground (semi-transparent).   16. Cracked flagstones (cracks and a
    few broken corners, to lay over a stone floor).
```
