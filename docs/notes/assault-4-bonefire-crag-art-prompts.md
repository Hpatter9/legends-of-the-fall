# The Assault: ChatGPT prompts for the Ogre Clans' hold (Bonefire Crag)

Phase 4's fifth hold (`docs/design/assault-mode.md` on `claude/assault-design`, phase 4; the owner's name for it). The owner gave no look for
it, so it follows the camp's overlook, which already paints the Ogre Clans' "Bonefire clan camp" (`src/art/camp/camp-wild.png`, its bottom
row): a war camp on a rocky highland plateau at night, a great hall framed by mammoth tusks, hide domes, bone heaps and fires, waterfalls down
its cliffs. It is built like the other holds, on the same engine and the same kinds of sheet, so these 13 prompts mirror the Orc set sheet for
sheet: the same canvases, grids, foot points, angles and formats, so the cutter (`tools/assault/cut-sheets.py`) and the field's renderer take
them as they took the Orc sheets. **They paint only what the packs and the Orc sheets cannot cover.** Until they land, the hold is built on
stand-ins: the Orc sheets' pieces, recoloured, and the kit pieces below.

**The hold.** A torrent in a rocky ravine where the others have their water, crossed by a bridge of mammoth bones and two fords; a ring wall
of piled boulders bristling with tusks, with the Tusk Gate; the great bonefires, where the clans burn their foes' bones (the war drums'
part); a wall of black basalt crags, with the Skull Gate; and the Hall of Tusks at the heart, with the giant's seat before it.

**What the packs already give** (Chronos's Orcs and Dwarves kits, `docs/samples/assault-art/ogres-kit.jpg`; cut straight in, as the Orc
hold's kit pieces were; Bloodtusk Hold uses the Orcs kit too, so here the Dwarves' stone carries the hold's own look):

- walls and gates as decoration: `orcs/spiked_wall_run`, `spiked_wall_corner`, `skull_gate`, `stake_fence`; `dwarves/stone_wall_run`,
  `stone_wall_corner`, `cliff_gate`, `chain_fence`;
- buildings: `orcs/longhouse`, `tavern`, `cottage`, `granary`, `workshop`, `siege_tower`, `warg_pen`; `dwarves/great_hall`, `ale_hall`,
  `forge`, `watchtower`, `mine_entrance`, `quarry`, `shrine`;
- goods: `orcs/barrels`, `loot_chests`, `meat_pile`, `stockpile`, `woodpile`, `war_cart`; `dwarves/crates`, `ore_pile`, `coal_heap`;
- lights: `orcs/bonfire`, `skull_torch`; `dwarves/brazier`, `forge_fire`;
- nature: `orcs/dark_rocks`, `gnarled_tree`, `burnt_tree`, `thorn_bush`; `dwarves/boulders`, `rocks_a`, `rocks_b`, `dead_pine`, `crystals`;
- the bridges: `orcs/log_bridge`, `dwarves/stone_bridge`.

**What the Orc sheets already give every hold:** our own siege works (the ladders, the ram, the trebuchet), so no sheet here paints them.

**How to use them** (as for the other sets):

- Paste everything inside one fence into a new ChatGPT (Codex) conversation.
- Each prompt stands alone, and all of them add to the one branch, `art/assault-ogres`, under `art-source/assault/ogres/`, and the one pull
  request, "Assault art: Bonefire Crag".
- Each sheet is one image. If a sheet comes back wrong (the angle, the grid, a busy background), run the same prompt again. Allow two or
  three tries a sheet.
- ChatGPT adds the PNGs only. The builder cuts the sheets afterwards, credits them, and adds them to the service worker.

**The reference files the prompts name:**

- `docs/samples/assault-art/ogres-kit.jpg`: the Orcs and Dwarves kit pieces, labelled (on `claude/assault-2` until it is merged);
- `docs/samples/assault-art/template-*.png`: the grids (on `claude/assault-art-plan` until it is merged);
- `src/art/camp/camp-wild.png`, its bottom row: the Bonefire clan camp as the overlook paints it;
- `src/art/areas/plains/` and `src/art/areas/snow/`: those lands' tops and sides as the game draws them today (the highlands have none).

Each prompt says how to fetch the files from those branches if they are missing on main.

| # | Sheet | File | Canvas | Cells | The Orc sheet it matches |
| --- | --- | --- | --- | --- | --- |
| 1 | OGR-01 The ring wall of boulders and tusks | `ogr-01-tusk-wall.png` | 1024 x 1024 | 16 | ORC-01 the palisade |
| 2 | OGR-02 The ring's gates | `ogr-02-gates.png` | 1536 x 1024 | 6 | ORC-02 the palisade's gates |
| 3 | OGR-03 The Skull Gate and the towers | `ogr-03-skull-gate.png` | 1536 x 1024 | 6 | ORC-03 the Iron Gate |
| 4 | OGR-04 Cliff and wall faces | `ogr-04-faces.png` | 1536 x 1024 | 12 | ORC-04 the faces |
| 5 | OGR-05 Ground textures | `ogr-05-ground.png` | 1024 x 1024 | 16 | ORC-05 the ground |
| 6 | OGR-06 Ground transitions | `ogr-06-transitions.png` | 1024 x 1024 | 16 | ORC-06 the transitions |
| 7 | OGR-07 The Hall of Tusks and the seat | `ogr-07-keep.png` | 1536 x 1024 | 3 | ORC-07 the keep |
| 8 | OGR-08 The wall's dressing and the stairs | `ogr-08-wall-dressing.png` | 1024 x 1024 | 16 | ORC-08 the wall's dressing |
| 9 | OGR-09 The great bonefires and the landmarks | `ogr-09-landmarks.png` | 1536 x 1024 | 6 | ORC-09 the camp's big pieces (the drums) |
| 10 | OGR-10 The camp's props | `ogr-10-props.png` | 1024 x 1024 | 16 | ORC-10 the camp's props |
| 11 | OGR-11 Ruins and the clans' camp's burnt states | `ogr-11-ruins.png` | 1536 x 1024 | 6 | ORC-11 siege works and ruins |
| 12 | OGR-12 The torrent | `ogr-12-torrent.png` | 1024 x 1024 | 16 | ORC-12 bridges, fords and the river |
| 13 | OGR-13 Ground decals | `ogr-13-decals.png` | 1024 x 1024 | 16 | ORC-13 the decals |

They are ordered by what the hold needs first: its walls and gates, then its ground, then its heart and dressing.

---

## Prompt 1: OGR-01, the ring wall of piled boulders and tusks, in every state of the siege

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Ogre Clans': Bonefire Crag, a war camp on a cold highland plateau at night: a torrent in a rocky ravine crossed by a bridge of mammoth
bones, a ring wall of piled boulders bristling with great tusks, the great bonefires where the clans burn their dead foes' bones, a wall
of black basalt crags, and at its heart the Hall of Tusks, a vast hide-roofed hall framed by colossal curving mammoth tusks.
This task paints ONE sheet: the ring wall of piled boulders and tusks, in every state of the siege.

Rules for this task:
- Branch: art/assault-ogres. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/ogres/ogr-01-tusk-wall.png. Change no other file.
- Pull request into main titled "Assault art: Bonefire Crag". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG). Each piece casts only a small soft contact shadow on its own footprint.

Open these files first and match them:
- docs/samples/assault-art/ogres-kit.jpg: the Orcs and Dwarves kits (Chronos Settlement's isometric kits), labelled. Your pieces
  stand beside these on the map, so match them exactly: the crude timber, hides, tusks and skulls of the Orcs kit, the rough grey
  stone and heavy blocks of the Dwarves kit, and the hot orange firelight.
  Above all orcs/spiked_wall_run, orcs/spiked_wall_corner and dwarves/boulders: the same crude build, in boulders and tusks.
- src/art/camp/camp-wild.png, its bottom row: the Bonefire clan camp as the camp's overlook paints it (its tusked great hall, its hide
  domes, its bone heaps and bonfires on a rocky plateau). Match its look closely.
- src/art/areas/plains/top1.png and src/art/areas/snow/top1.png: the open highland and snow lands' ground as the game draws them today.
- docs/samples/assault-art/template-props-1024.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/ogres-kit.jpg > /tmp/ogres-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

Style: detailed painted pixel art, exactly like the Orcs and Dwarves kits. Crisp dark outlines, chunky readable shapes, a palette of
cold grey and black stone, frost, dark pine green, brown hides and old ivory bone, with the hot orange of fires at night as the accent.
Everything is built big and crude, as ogres would build it. It must read clearly when shown at a quarter of this size on a phone.

The angle and scale, exactly:
- True 2:1 isometric (dimetric) view, no perspective: a flat square tile on the ground is a diamond exactly twice as wide as it is
  tall, its corners pointing up, right, down and left. Vertical edges stay vertical.
- ONE TILE = a diamond 128 px wide and 64 px tall. ONE HEIGHT STEP = 24 px.
- Light from the upper left: faces turned to the lower left are lit; faces turned to the lower right are in shade.
- "Along u" means running from the upper left down to the lower right (like "\"). Every run on this sheet runs along u, passing
  through its tile from the midpoint of the diamond's upper-left edge to the midpoint of its lower-right edge, so that pieces placed on
  neighbouring tiles join seamlessly at those points. (The game mirrors them for runs going the other way.)
- The hold is drawn at night on a cold plateau: frost on the stone, the dark lit by orange fires, braziers and glowing doorways.
- Everything is ogre-sized and crude: boulders as big as huts, timbers whole tree trunks, tusks of mammoths, skulls of giant beasts.
- The wall stands about 4 steps (96 px) tall: huge rough boulders piled and chinked with earth, whole mammoth tusks rammed between them
  pointing outward, a beast skull here and there.
- The OUTER face is the one turned to the viewer's lower left: the tusks and skulls. The INNER face (cell 5) is the back of the same
  wall: an earth ramp to a fighting step, a heap of throwing stones and a torch.

The sheet: 1024 x 1024 px, a 4 x 4 grid of 256 x 256 cells, read left to right, top to bottom. Every piece has a ONE-TILE footprint:
its diamond's centre (the foot point) is at (128, 208) inside its cell. Keep each piece inside its own cell with 8 px to spare.

1. Wall run, outer face, whole: piled boulders, two great tusks jutting out, a mammoth skull.
2. The same run, battered: boulders cracked and shifted, a tusk snapped, arrows stuck in the earth chinking.
3. The same run, broken: knocked down to a jagged heap about 1.5 steps high, a tusk fallen across. Still a barrier.
4. The breach: no wall left. A ramp of tumbled boulders and earth sloping down to the lower left, as if into a ditch. Walkable.
5. Wall run, inner face, whole: the back of cell 1. An earth ramp to a fighting step a step and a half up, a heap of throwing stones.
6. Corner, south (the corner nearest the viewer): two runs meet at the bottom of the tile, one running up-left and one up-right, both
   showing their OUTER faces, round a standing boulder crowned with a giant's skull.
7. Corner, north (the far corner): two runs meet at the top of the tile, going down-left and down-right, both showing their INNER faces,
   with a fire burning on the corner.
8. Corner, east: a run coming from the upper left meets a run going down to the lower left at the tile's right corner. The first shows
   its inner face and the second its outer face. A standing boulder at the corner.
9. Gate post: a tall standing stone, taller than the wall, two crossed tusks lashed to its top, a skull and a torch. It ends a run
   beside a gate.
10. Sally port, one tile wide, whole: a low gap through the boulders shut by a door of lashed logs, outer face.
11. The sally port, battered: the logs split.
12. The sally port, broken: the door torn out and lying on the ground. Passable.
13. Barricade (the bone bridge's fort): a low wall, chest-high (about 2 steps), of boulders, a smashed cart and great bones, a few
    sharpened stakes out front. Runs along u.
14. The barricade, broken: scattered boulders and bones, low enough to step over.
15. Tusk thicket: a cluster of sharpened stakes and broken tusks driven into the ground, leaning out to the lower left, about 1.5 steps
    high. Fills most of the tile.
16. Stake line: a single row of sharpened stakes across the tile along u, leaning out to the lower left, about 2 steps high.
```

## Prompt 2: OGR-02, the ring's two great gates, in their siege states, and the gate towers' tops

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Ogre Clans': Bonefire Crag, a war camp on a cold highland plateau at night: a torrent in a rocky ravine crossed by a bridge of mammoth
bones, a ring wall of piled boulders bristling with great tusks, the great bonefires where the clans burn their dead foes' bones, a wall
of black basalt crags, and at its heart the Hall of Tusks, a vast hide-roofed hall framed by colossal curving mammoth tusks.
This task paints ONE sheet: the ring's two great gates, in their siege states, and the gate towers' tops.

Rules for this task:
- Branch: art/assault-ogres. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/ogres/ogr-02-gates.png. Change no other file.
- Pull request into main titled "Assault art: Bonefire Crag". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG). Each piece casts only a small soft contact shadow on its own footprint.

Open these files first and match them:
- docs/samples/assault-art/ogres-kit.jpg: the Orcs and Dwarves kits (Chronos Settlement's isometric kits), labelled. Your pieces
  stand beside these on the map, so match them exactly: the crude timber, hides, tusks and skulls of the Orcs kit, the rough grey
  stone and heavy blocks of the Dwarves kit, and the hot orange firelight.
  Above all orcs/skull_gate and dwarves/cliff_gate.
- src/art/camp/camp-wild.png, its bottom row: the Bonefire clan camp as the camp's overlook paints it (its tusked great hall, its hide
  domes, its bone heaps and bonfires on a rocky plateau). Match its look closely.
- src/art/areas/plains/top1.png and src/art/areas/snow/top1.png: the open highland and snow lands' ground as the game draws them today.
- docs/samples/assault-art/template-buildings-1536.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/ogres-kit.jpg > /tmp/ogres-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

Style: detailed painted pixel art, exactly like the Orcs and Dwarves kits. Crisp dark outlines, chunky readable shapes, a palette of
cold grey and black stone, frost, dark pine green, brown hides and old ivory bone, with the hot orange of fires at night as the accent.
Everything is built big and crude, as ogres would build it. It must read clearly when shown at a quarter of this size on a phone.

The angle and scale, exactly:
- True 2:1 isometric (dimetric) view, no perspective: a flat square tile on the ground is a diamond exactly twice as wide as it is
  tall, its corners pointing up, right, down and left. Vertical edges stay vertical.
- ONE TILE = a diamond 128 px wide and 64 px tall. ONE HEIGHT STEP = 24 px.
- Light from the upper left: faces turned to the lower left are lit; faces turned to the lower right are in shade.
- The hold is drawn at night on a cold plateau: frost on the stone, the dark lit by orange fires, braziers and glowing doorways.
- Everything is ogre-sized and crude: boulders as big as huts, timbers whole tree trunks, tusks of mammoths, skulls of giant beasts.
- The ring's wall is about 4 steps (96 px) tall; a gate's sides stand flush with it and may rise higher (a gate tower).
- The gates run along u (from the upper left down to the lower right, like "\"); the game mirrors them.

The sheet: 1536 x 1024 px, a 3 x 2 grid of 512 x 512 cells, read left to right, top to bottom. The foot point (the centre of the
footprint diamond) is at (256, 416) in every cell. Footprints: cells 1 to 4 are 2 tiles along u by 1 through (a diamond 192 x 96); cells 5 and 6 are 2 x 2 tiles (a diamond 256 x 128). Keep each piece inside its cell with 8 px to spare.

1. The Tusk Gate (the south gate), whole, outer face to the lower left: two colossal mammoth tusks curving up and meeting over a gateway
   between piled boulders, a double gate of whole tree trunks bound with hide, a giant's skull at the crown, fires burning either side.
2. The same Tusk Gate, battered: the trunks split and scorched, a tusk cracked, arrows in the wood.
3. The same Tusk Gate, broken: the gate torn off and lying flat, the tusk arch still standing, the passage open and walkable, rubble at
   the sides (not in the passage).
4. The North Gate, whole, INNER face to the lower left (it stands on the ring's far side): the same build seen from inside, with its
   bar of a whole trunk across and a torch.
5. The North Gate, broken (inner face): the bar snapped, the gate hanging open, passable.
6. A gate tower's top: what stands on top of a 2 x 2 boulder tower that the game raises: a rough platform with a hide shelter, a great
   horn made from a tusk on a stand, a skull banner on a pole, a fire.
```

## Prompt 3: OGR-03, the basalt wall's great Skull Gate, the postern and the corner towers' tops

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Ogre Clans': Bonefire Crag, a war camp on a cold highland plateau at night: a torrent in a rocky ravine crossed by a bridge of mammoth
bones, a ring wall of piled boulders bristling with great tusks, the great bonefires where the clans burn their dead foes' bones, a wall
of black basalt crags, and at its heart the Hall of Tusks, a vast hide-roofed hall framed by colossal curving mammoth tusks.
This task paints ONE sheet: the basalt wall's great Skull Gate, the postern and the corner towers' tops.

Rules for this task:
- Branch: art/assault-ogres. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/ogres/ogr-03-skull-gate.png. Change no other file.
- Pull request into main titled "Assault art: Bonefire Crag". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG). Each piece casts only a small soft contact shadow on its own footprint.

Open these files first and match them:
- docs/samples/assault-art/ogres-kit.jpg: the Orcs and Dwarves kits (Chronos Settlement's isometric kits), labelled. Your pieces
  stand beside these on the map, so match them exactly: the crude timber, hides, tusks and skulls of the Orcs kit, the rough grey
  stone and heavy blocks of the Dwarves kit, and the hot orange firelight.
  Above all dwarves/cliff_gate, dwarves/watchtower and orcs/skull_gate.
- src/art/camp/camp-wild.png, its bottom row: the Bonefire clan camp as the camp's overlook paints it (its tusked great hall, its hide
  domes, its bone heaps and bonfires on a rocky plateau). Match its look closely.
- src/art/areas/plains/top1.png and src/art/areas/snow/top1.png: the open highland and snow lands' ground as the game draws them today.
- docs/samples/assault-art/template-buildings-1536.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/ogres-kit.jpg > /tmp/ogres-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

Style: detailed painted pixel art, exactly like the Orcs and Dwarves kits. Crisp dark outlines, chunky readable shapes, a palette of
cold grey and black stone, frost, dark pine green, brown hides and old ivory bone, with the hot orange of fires at night as the accent.
Everything is built big and crude, as ogres would build it. It must read clearly when shown at a quarter of this size on a phone.

The angle and scale, exactly:
- True 2:1 isometric (dimetric) view, no perspective: a flat square tile on the ground is a diamond exactly twice as wide as it is
  tall, its corners pointing up, right, down and left. Vertical edges stay vertical.
- ONE TILE = a diamond 128 px wide and 64 px tall. ONE HEIGHT STEP = 24 px.
- Light from the upper left: faces turned to the lower left are lit; faces turned to the lower right are in shade.
- The hold is drawn at night on a cold plateau: frost on the stone, the dark lit by orange fires, braziers and glowing doorways.
- Everything is ogre-sized and crude: boulders as big as huts, timbers whole tree trunks, tusks of mammoths, skulls of giant beasts.
- The inner wall is a wall of black basalt crags and great stacked blocks, frost in the cracks. It is exactly 6 steps (144 px) tall
  from the ground to its walkway, plus a parapet. The game draws the wall itself; the gates fill gaps in it, so each gate's front must
  be exactly 144 px tall to the walkway line, flush with the wall on either side, and may rise higher above it (a gate tower).
- The gates run along u (from the upper left down to the lower right, like "\"); the game mirrors them. The wall is 2 tiles thick.

The sheet: 1536 x 1024 px, a 3 x 2 grid of 512 x 512 cells, read left to right, top to bottom. The foot point (the centre of the
footprint diamond) is at (256, 416) in every cell. Footprints: cells 1 to 3 are 2 x 2 tiles (a diamond 256 x 128); cells 4 and 5 are 1 tile along the wall by 2 tiles through it (a diamond 192 x 96); cell 6 is 3 x 3 tiles (a diamond 384 x 192). Keep each piece inside its cell with 8 px to spare.

1. The Skull Gate, whole, seen from OUTSIDE (outer face to the lower left): a gatehouse of black basalt 6 steps tall, its passage
   through the open jaws of a colossal giant's skull set into the rock, a gate of iron-bound trunks behind the teeth, fires in the eye
   sockets, and above the walkway a crude tower of stacked blocks under a hide roof. The strongest-looking thing on the map.
2. The same Skull Gate, battered: the gate split and scorched, teeth broken out of the skull, stones cracked round the passage.
3. The same Skull Gate, broken: the gate torn apart and thrown aside, the passage open and walkable, rubble and broken teeth at the sides
   (not in the passage), the tower above cracked but standing.
4. The postern, whole, seen from INSIDE (inner face to the lower left): a low cave-like doorway through the 2-thick wall, a door of
   logs, a torch. Flush with the wall, 6 steps tall.
5. The postern, broken: the door torn off and lying on the stones, the opening walkable.
6. Corner tower top: the top of a basalt tower that the game raises as a 3 x 3 column (draw only what stands on its top): a rough
   platform ringed by a parapet of boulders about 1.5 steps high, a big fire pit, a skull banner, a heap of throwing boulders.
```

## Prompt 4: OGR-04, the flat face textures the game shears onto every cliff, bank and wall

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Ogre Clans': Bonefire Crag, a war camp on a cold highland plateau at night: a torrent in a rocky ravine crossed by a bridge of mammoth
bones, a ring wall of piled boulders bristling with great tusks, the great bonefires where the clans burn their dead foes' bones, a wall
of black basalt crags, and at its heart the Hall of Tusks, a vast hide-roofed hall framed by colossal curving mammoth tusks.
This task paints ONE sheet: the flat face textures the game shears onto every cliff, bank and wall.

Rules for this task:
- Branch: art/assault-ogres. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/ogres/ogr-04-faces.png. Change no other file.
- Pull request into main titled "Assault art: Bonefire Crag". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered column.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Opaque textures; leave only the unused bottom band of each column (y 480 to 512) transparent. Lip edges may have a transparent
  ragged top (grass, boulders, parapet).

Open these files first and match them:
- docs/samples/assault-art/ogres-kit.jpg: the Orcs and Dwarves kits (Chronos Settlement's isometric kits), labelled. Your pieces
  stand beside these on the map, so match them exactly: the crude timber, hides, tusks and skulls of the Orcs kit, the rough grey
  stone and heavy blocks of the Dwarves kit, and the hot orange firelight.
- src/art/camp/camp-wild.png, its bottom row: the Bonefire clan camp as the camp's overlook paints it (its tusked great hall, its hide
  domes, its bone heaps and bonfires on a rocky plateau). Match its look closely.
- src/art/areas/plains/top1.png and src/art/areas/snow/top1.png: the open highland and snow lands' ground as the game draws them today.
- src/art/areas/snow/side.png and src/art/areas/plains/side.png: today's tiny side strips, which these replace.
- docs/samples/assault-art/template-faces-1536.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/ogres-kit.jpg > /tmp/ogres-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

THE VIEW IS STRAIGHT-ON, NOT ISOMETRIC: draw each face as a flat elevation, as if standing square in front of the wall, with no
perspective and no skew. The game skews it. Light from the upper left, evenly across the face (the game adds the shading for which
side it is on). Style: painted pixel art matching the Orcs and Dwarves kits, chunky and readable.

The sheet: 1536 x 1024 px, 6 columns of 256 px, in two rows of 512 px: twelve columns, numbered left to right along the top row
(1 to 6), then the bottom row (7 to 12). Each column is one face set, 256 px wide (the length of one tile's edge), and must tile
seamlessly LEFT TO RIGHT with itself. Inside each column, from its top:
- the LIP, y 0 to 80 (one height step): the face's top edge, what overhangs or crowns it;
- the BODY, y 80 to 400 (four steps of 80 px): the face itself; it must tile seamlessly UP AND DOWN and left to right, because the
  game repeats it for walls of any height;
- the FOOT, y 400 to 480 (one step): where the face meets the ground;
- y 480 to 512: empty.
The lip's bottom must flow into the body's top, and the body's bottom into the foot's top, with no seam.

1. Highland crag: grey granite in rough blocks with lichen and frost; lip: tough grass and heather; foot: scree.
2. Stony earth: dark earth with many stones; lip: frosted grass; foot: gravel.
3. Ditch bank: frozen mud with old stakes in it; lip: trampled edge; foot: a line of ice.
4. Earth rampart: packed earth held by boulders; lip: the earth top with stakes; foot: mud.
5. Tusk wall skin: piled boulders chinked with earth, a tusk end jutting here and there; lip: rough boulder tops (ragged, transparent
   between them); foot: earth.
6. Basalt wall: black basalt in great stacked blocks, frost in the cracks; lip: a parapet of boulders (ragged, transparent between);
   foot: fallen stones.
7. The same basalt wall, battle-damaged: split and missing blocks, soot; lip: broken parapet; foot: rubble.
8. Corner tower masonry: smaller basalt blocks, an arrow slit in the body's middle, skulls set in the stone; lip: a stone ledge; foot:
   a sloped plinth.
9. Hall terrace wall: dry-stacked grey stone with bones set into it; lip: a flagstone edge with frost; foot: packed earth.
10. Black cliff: dark basalt columns, icicles under ledges; lip: snow on the edge; foot: scree.
11. Ravine wall: wet dark rock streaked with spray, moss low down; lip: frosted grass; foot: wet boulders.
12. Waterfall rock: dark rock behind thin falling water, white spray; lip: water spilling over the edge; foot: foam.
```

## Prompt 5: OGR-05, sixteen seamless ground textures, from the highland grass to the frozen yards

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Ogre Clans': Bonefire Crag, a war camp on a cold highland plateau at night: a torrent in a rocky ravine crossed by a bridge of mammoth
bones, a ring wall of piled boulders bristling with great tusks, the great bonefires where the clans burn their dead foes' bones, a wall
of black basalt crags, and at its heart the Hall of Tusks, a vast hide-roofed hall framed by colossal curving mammoth tusks.
This task paints ONE sheet: sixteen seamless ground textures, from the highland grass to the frozen yards.

Rules for this task:
- Branch: art/assault-ogres. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/ogres/ogr-05-ground.png. Change no other file.
- Pull request into main titled "Assault art: Bonefire Crag". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Opaque image.

Open these files first and match them:
- src/art/areas/plains/top1.png, src/art/areas/plains/top2.png and src/art/areas/snow/top1.png: today's 64 px tops, which these replace
  (keep their pixel density: 64 px a tile).
- docs/samples/assault-art/ogres-kit.jpg: the kits' orcs/bone_tile, orcs/mud_tile, orcs/scorched_tile, dwarves/rocky_tile,
  dwarves/flagstone_tile and dwarves/stone_floor_tile give the colours to match.
- src/art/camp/camp-wild.png, its bottom row: the Bonefire clan camp as the overlook paints it.
- docs/samples/assault-art/template-textures-1024.png: the grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/ogres-kit.jpg > /tmp/ogres-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

THE VIEW IS STRAIGHT DOWN, NOT ISOMETRIC: draw each texture as seen from directly above, like a map, with no perspective, no horizon
and no cast shadows longer than a pebble's. Style: painted pixel art matching the kits' ground tiles; readable, not noisy; no single
feature so striking that its repeat would be noticed.

The sheet: 1024 x 1024 px, a 4 x 4 grid of 256 x 256 squares, read left to right, top to bottom. EACH SQUARE IS ONE TEXTURE COVERING
4 x 4 TILES, AND MUST TILE SEAMLESSLY WITH ITSELF ON ALL FOUR SIDES (its left edge continues its right edge, its top its bottom).
Keep the squares separate: nothing crosses from one square into the next.

1. Highland grass: tough dark green grass, cold-tinted, with small grey stones.
2. Highland grass, second variant: the same, with heather and frost in the hollows.
3. Heather and rock: purple-brown heather and grey stones, for the plateau's wild rear.
4. Trampled ground: worn grass with bare earth and huge footprints, round the posts.
5. Frozen mud: dark hard mud with frost, huge footprints.
6. Frozen mud, second variant: the same, with gnawed bones pressed in.
7. Churned slush: wet brown slush and ruts, for the lanes and the ditch floor.
8. Scorched earth: blackened earth round the bonefires.
9. Bone ash: grey-white ash scattered with charred bone.
10. Packed earth and bones: the camp's yards, earth trodden hard, bone fragments everywhere.
11. Rough cobbles: big rounded stones set in earth.
12. Basalt flags: big black basalt slabs with frost in the joints.
13. Wall-walk planks: heavy timber planks seen from above, running from the top of the square to the bottom, frost on them.
14. Gravel and scree: grey broken stone.
15. Ravine shingle: wet rounded pebbles.
16. Shallow cold water over stones: clear fast water over pebbles, white ripples.
```

## Prompt 6: OGR-06, the overlays the game lays where two grounds meet

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Ogre Clans': Bonefire Crag, a war camp on a cold highland plateau at night: a torrent in a rocky ravine crossed by a bridge of mammoth
bones, a ring wall of piled boulders bristling with great tusks, the great bonefires where the clans burn their dead foes' bones, a wall
of black basalt crags, and at its heart the Hall of Tusks, a vast hide-roofed hall framed by colossal curving mammoth tusks.
This task paints ONE sheet: the overlays the game lays where two grounds meet.

Rules for this task:
- Branch: art/assault-ogres. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/ogres/ogr-06-transitions.png. Change no other file.
- Pull request into main titled "Assault art: Bonefire Crag". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG): each overlay is the material only, and everything else is transparent.

Open these files first and match them:
- art-source/assault/ogres/ogr-05-ground.png on this branch, if it is there: the ground textures these overlays must match exactly in
  colour and pixel density. If it is not there yet, match the descriptions below and src/art/areas/plains/top1.png.
- docs/samples/assault-art/template-textures-1024.png: the grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/ogres-kit.jpg > /tmp/ogres-kit.jpg, and
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

1. Frozen mud spreading onto grass: edge.       2. The same: outer corner.
3. Scorched earth and bone ash: edge.           4. The same: outer corner.
5. Rough cobbles meeting grass: edge.           6. The same: outer corner.
7. A trodden path's edge over grass: edge.      8. The same: outer corner.
9. Ravine shingle onto grass: edge.             10. The same: outer corner.
11. Basalt flags sinking into earth: edge.      12. The same: outer corner.
13. Heather creeping onto mud: edge.            14. The same: outer corner.
15. The water's edge: a thin rim of foam and wet dark stones, laid on the water side of a bank: edge.
16. The same: outer corner.
```

## Prompt 7: OGR-07, the Hall of Tusks, the giant's seat and the great banner

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Ogre Clans': Bonefire Crag, a war camp on a cold highland plateau at night: a torrent in a rocky ravine crossed by a bridge of mammoth
bones, a ring wall of piled boulders bristling with great tusks, the great bonefires where the clans burn their dead foes' bones, a wall
of black basalt crags, and at its heart the Hall of Tusks, a vast hide-roofed hall framed by colossal curving mammoth tusks.
This task paints ONE sheet: the Hall of Tusks, the giant's seat and the great banner.

Rules for this task:
- Branch: art/assault-ogres. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/ogres/ogr-07-keep.png. Change no other file.
- Pull request into main titled "Assault art: Bonefire Crag". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG). Each piece casts only a small soft contact shadow on its own footprint.

Open these files first and match them:
- docs/samples/assault-art/ogres-kit.jpg: the Orcs and Dwarves kits (Chronos Settlement's isometric kits), labelled. Your pieces
  stand beside these on the map, so match them exactly: the crude timber, hides, tusks and skulls of the Orcs kit, the rough grey
  stone and heavy blocks of the Dwarves kit, and the hot orange firelight.
  Above all orcs/longhouse, orcs/tavern and dwarves/great_hall.
- src/art/camp/camp-wild.png, its bottom row: the Bonefire clan camp as the camp's overlook paints it (its tusked great hall, its hide
  domes, its bone heaps and bonfires on a rocky plateau). Match its look closely.
- src/art/areas/plains/top1.png and src/art/areas/snow/top1.png: the open highland and snow lands' ground as the game draws them today.
- docs/samples/assault-art/template-keep-1536.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/ogres-kit.jpg > /tmp/ogres-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

Style: detailed painted pixel art, exactly like the Orcs and Dwarves kits. Crisp dark outlines, chunky readable shapes, a palette of
cold grey and black stone, frost, dark pine green, brown hides and old ivory bone, with the hot orange of fires at night as the accent.
Everything is built big and crude, as ogres would build it. It must read clearly when shown at a quarter of this size on a phone.

The angle and scale, exactly:
- True 2:1 isometric (dimetric) view, no perspective: a flat square tile on the ground is a diamond exactly twice as wide as it is
  tall, its corners pointing up, right, down and left. Vertical edges stay vertical.
- ONE TILE = a diamond 128 px wide and 64 px tall. ONE HEIGHT STEP = 24 px.
- Light from the upper left: faces turned to the lower left are lit; faces turned to the lower right are in shade.
- The hold is drawn at night on a cold plateau: frost on the stone, the dark lit by orange fires, braziers and glowing doorways.
- Everything is ogre-sized and crude: boulders as big as huts, timbers whole tree trunks, tusks of mammoths, skulls of giant beasts.
- A doorway is about 4 steps (96 px) tall, and an ogre's hall has doors twice that.

The sheet: 1536 x 1024 px. Three cells:
1. Cell 1, x 0 to 1024, y 0 to 1024: THE HALL OF TUSKS. Footprint 6 tiles along u (upper left to lower right) by 4 tiles along v: a
   diamond 640 px wide and 320 px tall, centred on the foot point (512, 840). It may rise up to about 640 px above its foot.
   A vast domed hall of stitched hides over a frame of whole trunks, its great doorway (facing the lower left, glowing with firelight)
   framed by two colossal curving mammoth tusks that meet high above it, more tusks ribbing its roof, a giant beast's skull over the door,
   red-painted hide banners, smoke rising from a hole in the dome, fires in great stone bowls either side of a stair of boulders, bone
   heaps against its walls. Grander than anything else on the map.
2. Cell 2, x 1024 to 1536, y 0 to 512: THE GIANT'S SEAT. One-tile footprint (a diamond 128 x 64) centred on the foot point (256, 440)
   in the cell. A huge rough stone chair heaped with furs, its back a fan of tusks about 6 steps tall, a horned skull on top, two fire
   bowls on the two-step boulder dais. Facing the lower left.
3. Cell 3, x 1024 to 1536, y 512 to 1024: THE GREAT BANNER. One-tile footprint centred on (256, 440) in the cell. A tall pole (about
   14 steps) of a whole pine trunk in a cairn of boulders, a crossbar hung with a long hide banner painted red with a giant's handprint,
   tattered at the bottom, a giant's skull on top.
```

## Prompt 8: OGR-08, the basalt wall's dressing, the stairs and small structures

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Ogre Clans': Bonefire Crag, a war camp on a cold highland plateau at night: a torrent in a rocky ravine crossed by a bridge of mammoth
bones, a ring wall of piled boulders bristling with great tusks, the great bonefires where the clans burn their dead foes' bones, a wall
of black basalt crags, and at its heart the Hall of Tusks, a vast hide-roofed hall framed by colossal curving mammoth tusks.
This task paints ONE sheet: the basalt wall's dressing, the stairs and small structures.

Rules for this task:
- Branch: art/assault-ogres. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/ogres/ogr-08-wall-dressing.png. Change no other file.
- Pull request into main titled "Assault art: Bonefire Crag". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG). Each piece casts only a small soft contact shadow on its own footprint.

Open these files first and match them:
- docs/samples/assault-art/ogres-kit.jpg: the Orcs and Dwarves kits (Chronos Settlement's isometric kits), labelled. Your pieces
  stand beside these on the map, so match them exactly: the crude timber, hides, tusks and skulls of the Orcs kit, the rough grey
  stone and heavy blocks of the Dwarves kit, and the hot orange firelight.
  Above all orcs/skull_torch, dwarves/brazier and orcs/spear_signpost.
- src/art/camp/camp-wild.png, its bottom row: the Bonefire clan camp as the camp's overlook paints it (its tusked great hall, its hide
  domes, its bone heaps and bonfires on a rocky plateau). Match its look closely.
- src/art/areas/plains/top1.png and src/art/areas/snow/top1.png: the open highland and snow lands' ground as the game draws them today.
- docs/samples/assault-art/template-props-1024.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/ogres-kit.jpg > /tmp/ogres-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

Style: detailed painted pixel art, exactly like the Orcs and Dwarves kits. Crisp dark outlines, chunky readable shapes, a palette of
cold grey and black stone, frost, dark pine green, brown hides and old ivory bone, with the hot orange of fires at night as the accent.
Everything is built big and crude, as ogres would build it. It must read clearly when shown at a quarter of this size on a phone.

The angle and scale, exactly:
- True 2:1 isometric (dimetric) view, no perspective: a flat square tile on the ground is a diamond exactly twice as wide as it is
  tall, its corners pointing up, right, down and left. Vertical edges stay vertical.
- ONE TILE = a diamond 128 px wide and 64 px tall. ONE HEIGHT STEP = 24 px.
- Light from the upper left: faces turned to the lower left are lit; faces turned to the lower right are in shade.
- The hold is drawn at night on a cold plateau: frost on the stone, the dark lit by orange fires, braziers and glowing doorways.
- Everything is ogre-sized and crude: boulders as big as huts, timbers whole tree trunks, tusks of mammoths, skulls of giant beasts.
- The basalt wall's walkway is 6 steps up; these pieces stand on it or against it.

The sheet: 1024 x 1024 px, a 4 x 4 grid of 256 x 256 cells, read left to right, top to bottom. Every piece has a ONE-TILE footprint:
its diamond's centre (the foot point) is at (128, 208) inside its cell. Keep each piece inside its own cell with 8 px to spare.

1. Boulder merlon: one big rough boulder on the wall's outer edge, along u.
2. The same merlon, broken: split, half of it fallen on the walk.
3. Inner rail: a low line of stones along the walk's inner edge, along u.
4. Wall fire bowl: a great stone bowl of fire, for the walk (about 2 steps tall).
5. Wall torch: a torch on a tusk bracket.
6. A small hanging banner: a red-painted hide on a short pole.
7. Thrower's shelter: a lean-to of hides over a gap in the parapet.
8. A heap of throwing boulders.
9. Stairs up the wall, along u: rough boulder steps rising 6 steps (144 px) from the ground at the lower left to the walk. One tile.
10. Stairs down, the same steps seen descending to the lower right (the game uses it where a stair goes down into a pit).
11. A crude ladder of whole saplings against a wall to the upper right, about 6 steps tall.
12. A cauldron the size of a hut over a fire.
13. A heap of furs and a great club leaning on the wall.
14. A horn made from a mammoth tusk on a stand.
15. A pile of gnawed giant bones.
16. A drift of snow against the wall, with a broken shield.
```

## Prompt 9: OGR-09, the great bonefires (the hold's war drums) and its landmarks

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Ogre Clans': Bonefire Crag, a war camp on a cold highland plateau at night: a torrent in a rocky ravine crossed by a bridge of mammoth
bones, a ring wall of piled boulders bristling with great tusks, the great bonefires where the clans burn their dead foes' bones, a wall
of black basalt crags, and at its heart the Hall of Tusks, a vast hide-roofed hall framed by colossal curving mammoth tusks.
This task paints ONE sheet: the great bonefires (the hold's war drums) and its landmarks.

Rules for this task:
- Branch: art/assault-ogres. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/ogres/ogr-09-landmarks.png. Change no other file.
- Pull request into main titled "Assault art: Bonefire Crag". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG). Each piece casts only a small soft contact shadow on its own footprint.

Open these files first and match them:
- docs/samples/assault-art/ogres-kit.jpg: the Orcs and Dwarves kits (Chronos Settlement's isometric kits), labelled. Your pieces
  stand beside these on the map, so match them exactly: the crude timber, hides, tusks and skulls of the Orcs kit, the rough grey
  stone and heavy blocks of the Dwarves kit, and the hot orange firelight.
  Above all orcs/bonfire and orcs/war_drum.
- src/art/camp/camp-wild.png, its bottom row: the Bonefire clan camp as the camp's overlook paints it (its tusked great hall, its hide
  domes, its bone heaps and bonfires on a rocky plateau). Match its look closely.
- src/art/areas/plains/top1.png and src/art/areas/snow/top1.png: the open highland and snow lands' ground as the game draws them today.
- docs/samples/assault-art/template-buildings-1536.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/ogres-kit.jpg > /tmp/ogres-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

Style: detailed painted pixel art, exactly like the Orcs and Dwarves kits. Crisp dark outlines, chunky readable shapes, a palette of
cold grey and black stone, frost, dark pine green, brown hides and old ivory bone, with the hot orange of fires at night as the accent.
Everything is built big and crude, as ogres would build it. It must read clearly when shown at a quarter of this size on a phone.

The angle and scale, exactly:
- True 2:1 isometric (dimetric) view, no perspective: a flat square tile on the ground is a diamond exactly twice as wide as it is
  tall, its corners pointing up, right, down and left. Vertical edges stay vertical.
- ONE TILE = a diamond 128 px wide and 64 px tall. ONE HEIGHT STEP = 24 px.
- Light from the upper left: faces turned to the lower left are lit; faces turned to the lower right are in shade.
- The hold is drawn at night on a cold plateau: frost on the stone, the dark lit by orange fires, braziers and glowing doorways.
- Everything is ogre-sized and crude: boulders as big as huts, timbers whole tree trunks, tusks of mammoths, skulls of giant beasts.
- The great bonefires play the part the orc hold's war drums do: while one burns high, the clans near it fight harder, until our troops
  reach it and put it out.

The sheet: 1536 x 1024 px, a 3 x 2 grid of 512 x 512 cells, read left to right, top to bottom. The foot point (the centre of the
footprint diamond) is at (256, 416) in every cell. Footprints: cells 1 to 4 are 2 x 2 tiles (a diamond 256 x 128); cells 5 and 6 are 3 x 3 tiles (a diamond 384 x 192). Keep each piece inside its cell with 8 px to spare.

1. A great bonefire, roaring: a huge pyre of bones, skulls and whole trunks in a ring of boulders and tusks, flames twice an ogre's
   height, sparks and embers swirling up, war clubs planted round it.
2. The same bonefire, put out: after our troops reached it: a black smoking heap of charred bones and scattered logs, the ring broken,
   thin smoke rising.
3. The butchering ground: a giant carcass on a frame, a chopping block of a stump, bones and hides.
4. The champions' stones: a few great standing boulders with clubs and skulls hung on them.
5. The mammoth graveyard: a heap of colossal skeletons, ribs and tusks half sunk in frozen earth.
6. The crag spring: a rocky pool fed by a small waterfall, ice at its edges, pines round it.
```

## Prompt 10: OGR-10, the camp's small props the kits do not have

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Ogre Clans': Bonefire Crag, a war camp on a cold highland plateau at night: a torrent in a rocky ravine crossed by a bridge of mammoth
bones, a ring wall of piled boulders bristling with great tusks, the great bonefires where the clans burn their dead foes' bones, a wall
of black basalt crags, and at its heart the Hall of Tusks, a vast hide-roofed hall framed by colossal curving mammoth tusks.
This task paints ONE sheet: the camp's small props the kits do not have.

Rules for this task:
- Branch: art/assault-ogres. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/ogres/ogr-10-props.png. Change no other file.
- Pull request into main titled "Assault art: Bonefire Crag". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG). Each piece casts only a small soft contact shadow on its own footprint.

Open these files first and match them:
- docs/samples/assault-art/ogres-kit.jpg: the Orcs and Dwarves kits (Chronos Settlement's isometric kits), labelled. Your pieces
  stand beside these on the map, so match them exactly: the crude timber, hides, tusks and skulls of the Orcs kit, the rough grey
  stone and heavy blocks of the Dwarves kit, and the hot orange firelight.
  The kits already give the barrels, the bonfires, the dark rocks, the gnarled and burnt trees, the meat piles, the war carts, the
  boulders, the braziers, the crates, the ore piles and the woodpiles: do not paint those again. These props go with them.
- src/art/camp/camp-wild.png, its bottom row: the Bonefire clan camp as the camp's overlook paints it (its tusked great hall, its hide
  domes, its bone heaps and bonfires on a rocky plateau). Match its look closely.
- src/art/areas/plains/top1.png and src/art/areas/snow/top1.png: the open highland and snow lands' ground as the game draws them today.
- docs/samples/assault-art/template-props-1024.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/ogres-kit.jpg > /tmp/ogres-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

Style: detailed painted pixel art, exactly like the Orcs and Dwarves kits. Crisp dark outlines, chunky readable shapes, a palette of
cold grey and black stone, frost, dark pine green, brown hides and old ivory bone, with the hot orange of fires at night as the accent.
Everything is built big and crude, as ogres would build it. It must read clearly when shown at a quarter of this size on a phone.

The angle and scale, exactly:
- True 2:1 isometric (dimetric) view, no perspective: a flat square tile on the ground is a diamond exactly twice as wide as it is
  tall, its corners pointing up, right, down and left. Vertical edges stay vertical.
- ONE TILE = a diamond 128 px wide and 64 px tall. ONE HEIGHT STEP = 24 px.
- Light from the upper left: faces turned to the lower left are lit; faces turned to the lower right are in shade.
- The hold is drawn at night on a cold plateau: frost on the stone, the dark lit by orange fires, braziers and glowing doorways.
- Everything is ogre-sized and crude: boulders as big as huts, timbers whole tree trunks, tusks of mammoths, skulls of giant beasts.

The sheet: 1024 x 1024 px, a 4 x 4 grid of 256 x 256 cells, read left to right, top to bottom. Every piece has a ONE-TILE footprint:
its diamond's centre (the foot point) is at (128, 208) inside its cell. Keep each piece inside its own cell with 8 px to spare.

1. A hide dome hut, small, smoke from its top.
2. A drying frame of hides.
3. A great club and a stone axe leaning on a boulder.
4. A heap of skulls of giant beasts.
5. A tusk arch, two tusks planted in the ground.
6. A spit with a whole boar over a fire.
7. A totem of stacked boulders with a painted face.
8. A cage of lashed logs holding a snarling bear.
9. A hide drum the size of a cart.
10. A sled loaded with boulders.
11. A rack of huge spears.
12. A frozen puddle with a bone sticking out.
13. A snowy pine, stunted by the wind.
14. A clump of heather and stones.
15. A small cairn with a skull on top.
16. A fallen giant's helm and broken club in the snow.
```

## Prompt 11: OGR-11, ruins, and the burnt states of the clans' camp

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Ogre Clans': Bonefire Crag, a war camp on a cold highland plateau at night: a torrent in a rocky ravine crossed by a bridge of mammoth
bones, a ring wall of piled boulders bristling with great tusks, the great bonefires where the clans burn their dead foes' bones, a wall
of black basalt crags, and at its heart the Hall of Tusks, a vast hide-roofed hall framed by colossal curving mammoth tusks.
This task paints ONE sheet: ruins, and the burnt states of the clans' camp.

Rules for this task:
- Branch: art/assault-ogres. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/ogres/ogr-11-ruins.png. Change no other file.
- Pull request into main titled "Assault art: Bonefire Crag". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG). Each piece casts only a small soft contact shadow on its own footprint.

Open these files first and match them:
- docs/samples/assault-art/ogres-kit.jpg: the Orcs and Dwarves kits (Chronos Settlement's isometric kits), labelled. Your pieces
  stand beside these on the map, so match them exactly: the crude timber, hides, tusks and skulls of the Orcs kit, the rough grey
  stone and heavy blocks of the Dwarves kit, and the hot orange firelight.
- src/art/camp/camp-wild.png, its bottom row: the Bonefire clan camp as the camp's overlook paints it (its tusked great hall, its hide
  domes, its bone heaps and bonfires on a rocky plateau). Match its look closely.
- src/art/areas/plains/top1.png and src/art/areas/snow/top1.png: the open highland and snow lands' ground as the game draws them today.
- docs/samples/assault-art/template-buildings-1536.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/ogres-kit.jpg > /tmp/ogres-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

Style: detailed painted pixel art, exactly like the Orcs and Dwarves kits. Crisp dark outlines, chunky readable shapes, a palette of
cold grey and black stone, frost, dark pine green, brown hides and old ivory bone, with the hot orange of fires at night as the accent.
Everything is built big and crude, as ogres would build it. It must read clearly when shown at a quarter of this size on a phone.

The angle and scale, exactly:
- True 2:1 isometric (dimetric) view, no perspective: a flat square tile on the ground is a diamond exactly twice as wide as it is
  tall, its corners pointing up, right, down and left. Vertical edges stay vertical.
- ONE TILE = a diamond 128 px wide and 64 px tall. ONE HEIGHT STEP = 24 px.
- Light from the upper left: faces turned to the lower left are lit; faces turned to the lower right are in shade.
- Our own siege works (the ladders, the ram, the trebuchet) are already painted on the Orc hold's sheets and serve every hold: do not
  paint them. The Warpath's reserve camp here is the clans' camp on the mountain track: its hide domes burn when our archers loose fire
  arrows.
- The hold is drawn at night on a cold plateau: frost on the stone, the dark lit by orange fires, braziers and glowing doorways.
- Everything is ogre-sized and crude: boulders as big as huts, timbers whole tree trunks, tusks of mammoths, skulls of giant beasts.

The sheet: 1536 x 1024 px, a 3 x 2 grid of 512 x 512 cells, read left to right, top to bottom. The foot point (the centre of the
footprint diamond) is at (256, 416) in every cell. Footprints: cells 1 and 2 are 2 tiles along u by 1 (a diamond 192 x 96); cells 3 to 6 are 2 x 2 tiles (a diamond 256 x 128). Keep each piece inside its cell with 8 px to spare.

1. A clan's long hide tent: stitched hides over bent trunks, tusks on its ridge, a fire by the flap.
2. The same tent, burnt: a black heap of charred trunks and shrivelled hides, ash, a few embers.
3. A great hide dome: a big round hut of hides over a frame, red-painted, smoke from its top.
4. The same dome, burnt: its frame standing charred, the hides gone to ash.
5. A ruined giants' ring: a ring of toppled great stones, one still standing, frost and moss.
6. A collapsed lookout: a toppled tower of stacked boulders lying in a heap.
```

## Prompt 12: OGR-12, the ravine's torrent, its bridge of bones, fords and banks

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Ogre Clans': Bonefire Crag, a war camp on a cold highland plateau at night: a torrent in a rocky ravine crossed by a bridge of mammoth
bones, a ring wall of piled boulders bristling with great tusks, the great bonefires where the clans burn their dead foes' bones, a wall
of black basalt crags, and at its heart the Hall of Tusks, a vast hide-roofed hall framed by colossal curving mammoth tusks.
This task paints ONE sheet: the ravine's torrent, its bridge of bones, fords and banks.

Rules for this task:
- Branch: art/assault-ogres. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/ogres/ogr-12-torrent.png. Change no other file.
- Pull request into main titled "Assault art: Bonefire Crag". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG). Each piece casts only a small soft contact shadow on its own footprint.

Open these files first and match them:
- docs/samples/assault-art/ogres-kit.jpg: the Orcs and Dwarves kits (Chronos Settlement's isometric kits), labelled. Your pieces
  stand beside these on the map, so match them exactly: the crude timber, hides, tusks and skulls of the Orcs kit, the rough grey
  stone and heavy blocks of the Dwarves kit, and the hot orange firelight.
  Above all orcs/log_bridge and dwarves/stone_bridge, for the build.
- src/art/camp/camp-wild.png, its bottom row: the Bonefire clan camp as the camp's overlook paints it (its tusked great hall, its hide
  domes, its bone heaps and bonfires on a rocky plateau). Match its look closely.
- src/art/areas/plains/top1.png and src/art/areas/snow/top1.png: the open highland and snow lands' ground as the game draws them today.
- docs/samples/assault-art/template-props-1024.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/ogres-kit.jpg > /tmp/ogres-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

Style: detailed painted pixel art, exactly like the Orcs and Dwarves kits. Crisp dark outlines, chunky readable shapes, a palette of
cold grey and black stone, frost, dark pine green, brown hides and old ivory bone, with the hot orange of fires at night as the accent.
Everything is built big and crude, as ogres would build it. It must read clearly when shown at a quarter of this size on a phone.

The angle and scale, exactly:
- True 2:1 isometric (dimetric) view, no perspective: a flat square tile on the ground is a diamond exactly twice as wide as it is
  tall, its corners pointing up, right, down and left. Vertical edges stay vertical.
- ONE TILE = a diamond 128 px wide and 64 px tall. ONE HEIGHT STEP = 24 px.
- Light from the upper left: faces turned to the lower left are lit; faces turned to the lower right are in shade.
- Bonefire Crag has a torrent in a rocky ravine where the Orc hold has its river. The game draws the water as ground; these pieces stand
  in it or on its banks.
- "Along u" means running from the upper left down to the lower right (like "\"). Every run on this sheet runs along u, passing
  through its tile from the midpoint of the diamond's upper-left edge to the midpoint of its lower-right edge, so that pieces placed on
  neighbouring tiles join seamlessly at those points. (The game mirrors them for runs going the other way.)
- The hold is drawn at night on a cold plateau: frost on the stone, the dark lit by orange fires, braziers and glowing doorways.
- Everything is ogre-sized and crude: boulders as big as huts, timbers whole tree trunks, tusks of mammoths, skulls of giant beasts.

The sheet: 1024 x 1024 px, a 4 x 4 grid of 256 x 256 cells, read left to right, top to bottom. Every piece has a ONE-TILE footprint:
its diamond's centre (the foot point) is at (128, 208) inside its cell. Keep each piece inside its own cell with 8 px to spare.

1. Bone bridge deck, whole: great mammoth bones and whole trunks lashed into a deck crossing along u, rib bones for a rail.
2. The bridge, broken: a gap of snapped bones. Impassable.
3. The bridge's end, where it meets the bank at the upper left, two tusks planted as posts.
4. A bridge post: a tusk planted in a cairn, a torch on it.
5. Ford stones: a line of big flat boulders along u, their tops showing above the water.
6. Rushes in the shallows, frosted.
7. A fallen pine lying across the water.
8. A great skull half in the water.
9. Wet dark boulders at the water's edge.
10. A fish trap of woven branches.
11. Ice plates at the water's edge.
12. White spray over rocks (semi-transparent).
13. A mammoth rib cage sticking out of the water.
14. A small waterfall over a ledge, along u (semi-transparent spray).
15. A fishing post with a net hung to dry.
16. Rough boulder steps going down into the water from the bank at the upper left.
```

## Prompt 13: OGR-13, sixteen ground decals

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Ogre Clans': Bonefire Crag, a war camp on a cold highland plateau at night: a torrent in a rocky ravine crossed by a bridge of mammoth
bones, a ring wall of piled boulders bristling with great tusks, the great bonefires where the clans burn their dead foes' bones, a wall
of black basalt crags, and at its heart the Hall of Tusks, a vast hide-roofed hall framed by colossal curving mammoth tusks.
This task paints ONE sheet: sixteen ground decals.

Rules for this task:
- Branch: art/assault-ogres. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/ogres/ogr-13-decals.png. Change no other file.
- Pull request into main titled "Assault art: Bonefire Crag". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG).

Open these files first and match them:
- art-source/assault/ogres/ogr-05-ground.png on this branch, if it is there: the ground these lie on (match its pixel density, 64 px a
  tile at quarter size). Otherwise src/art/areas/plains/top1.png.
- docs/samples/assault-art/template-textures-1024.png: the grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/ogres-kit.jpg > /tmp/ogres-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

THE VIEW IS STRAIGHT DOWN, NOT ISOMETRIC, as on a map: everything lies flat on the ground, nothing stands up. Style: painted pixel
art matching the kits' ground; readable; blood is a dark red-brown, never bright or gory.

The sheet: 1024 x 1024 px, a 4 x 4 grid of 256 x 256 squares, read left to right, top to bottom. Each square holds ONE decal covering
up to 2 x 2 tiles, centred, with at least 16 px of transparency round it.

1. Blood spatter.   2. Blood on snow.   3. A crater where a thrown boulder struck.
4. Scorch mark, round (a blast).   5. Bone ash and embers.
6. Stone rubble scatter.   7. Timber debris (splinters, a broken trunk end, hide strips).
8. Sled ruts: two parallel runner tracks running straight from the square's top edge to its bottom edge (so they join end to end).
9. Giant footprints: a trail of huge bare footprints crossing the square.   10. Drag marks where something heavy was hauled.
11. A frozen puddle.   12. Scattered pine needles and cones.
13. Scattered gnawed bones.   14. Tufts of fur and torn hide.
15. Frost cracks.   16. Cracked basalt flags (cracks and a few broken corners, to lay over a stone floor).
```
