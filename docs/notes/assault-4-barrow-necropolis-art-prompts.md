# The Assault: ChatGPT prompts for the Undead hold (the Barrow Necropolis)

Phase 4's first hold (`docs/design/assault-mode.md` on `claude/assault-design`, phase 4; the owner's name for it). It is built like
Bloodtusk Hold, on the same engine and the same kinds of sheet, so these 13 prompts mirror the Orc set
([assault-art-prompts-orc.md](https://github.com/hpatter9/legends-of-the-fall/blob/claude/assault-art-plan/docs/notes/assault-art-prompts-orc.md)) sheet for sheet:
the same canvases, grids, foot points, angles and formats, so the cutter (`tools/assault/cut-sheets.py`) and the field's renderer take
them as they took the Orc sheets. **They paint only what the packs and the Orc sheets cannot cover.** Until they land, the hold is built
on stand-ins: the Orc sheets' pieces, tinted, and the kit pieces below.

**What the packs already give** (Chronos's Liches and Blood Court kits, `docs/samples/assault-art/undead-kit.jpg`; cut straight in, as
the Orc hold's kit pieces were):

- walls and gates as decoration: `liches/bone_wall_run`, `bone_wall_corner`, `iron_fence`, `gatehouse`; `bloodcourt/stone_wall_run`,
  `stone_wall_corner`, `gatehouse`, `iron_fence`;
- buildings: `liches/chapel`, `mausoleum`, `watchtower`, `longhouse`, `cottage`, `tavern`, `workshop`, `granary`, `stockpile`, `well`,
  `market_stall`; `bloodcourt/crypt`, `chapel`, `cottage`;
- the dead: `liches/coffin_stack`, `bone_pit`, `skull_pile`, `bone_crates`, `hearse`; `bloodcourt/coffin`, `coffins`, `gravestones`;
- lights and life: `liches/witch_fire`, `lantern_post`, `signpost`; `bloodcourt/brazier`, `banner`, `lantern_post`;
- nature: `liches/dead_oak`, `dead_pine`, `thorn_bush`, `rocks`; `bloodcourt/dead_oak`, `rose_bush`, `thorn_bush`, `rocks`;
- bridges: `liches/stone_bridge`, `bloodcourt/stone_bridge`.

**What the Orc sheets already give every hold:** our own siege works (the ladders, the ram, the trebuchet), so no sheet here paints
them.

**How to use them** (as for the Orc set):

- Paste everything inside one fence into a new ChatGPT (Codex) conversation.
- Each prompt stands alone, and all of them add to the one branch, `art/assault-undead`, under `art-source/assault/undead/`, and the
  one pull request, "Assault art: the Barrow Necropolis".
- Each sheet is one image. If a sheet comes back wrong (the angle, the grid, a busy background), run the same prompt again. Allow two or
  three tries a sheet.
- ChatGPT adds the PNGs only. The builder cuts the sheets afterwards, credits them, and adds them to the service worker.

**The reference files the prompts name:**

- `docs/samples/assault-art/undead-kit.jpg`: the Liches and Blood Court kit pieces, labelled (on `claude/assault-2` until it is merged);
- `docs/samples/assault-art/template-*.png`: the grids (on `claude/assault-art-plan` until it is merged);
- `src/art/camp/camp-war.png`, its middle row: the Necropolis graveyard as the overlook paints it;
- `src/art/areas/graveyard/`: the graveyard land's tops and sides as the game draws them today.

Each prompt says how to fetch the files from those branches if they are missing on main.

| # | Sheet | File | Canvas | Cells | The Orc sheet it matches |
| --- | --- | --- | --- | --- | --- |
| 1 | UND-01 The outer ring of railings | `und-01-railings.png` | 1024 x 1024 | 16 | ORC-01 the palisade |
| 2 | UND-02 The ring's gates | `und-02-gates.png` | 1536 x 1024 | 6 | ORC-02 the palisade's gates |
| 3 | UND-03 The Bone Gate and the towers | `und-03-bone-gate.png` | 1536 x 1024 | 6 | ORC-03 the Iron Gate |
| 4 | UND-04 Cliff and wall faces | `und-04-faces.png` | 1536 x 1024 | 12 | ORC-04 the faces |
| 5 | UND-05 Ground textures | `und-05-ground.png` | 1024 x 1024 | 16 | ORC-05 the ground |
| 6 | UND-06 Ground transitions | `und-06-transitions.png` | 1024 x 1024 | 16 | ORC-06 the transitions |
| 7 | UND-07 The ossuary keep and the Lich's throne | `und-07-keep.png` | 1536 x 1024 | 3 | ORC-07 the keep |
| 8 | UND-08 The wall's dressing and the stairs | `und-08-wall-dressing.png` | 1024 x 1024 | 16 | ORC-08 the wall's dressing |
| 9 | UND-09 The bone-bell belfries and the landmarks | `und-09-landmarks.png` | 1536 x 1024 | 6 | ORC-09 the camp's big pieces (the drums) |
| 10 | UND-10 The necropolis's props | `und-10-props.png` | 1024 x 1024 | 16 | ORC-10 the camp's props |
| 11 | UND-11 Ruins and the charnel camp's burnt states | `und-11-ruins.png` | 1536 x 1024 | 6 | ORC-11 siege works and ruins |
| 12 | UND-12 The still grey lake | `und-12-lake.png` | 1024 x 1024 | 16 | ORC-12 bridges, fords and the river |
| 13 | UND-13 Ground decals | `und-13-decals.png` | 1024 x 1024 | 16 | ORC-13 the decals |

They are ordered by what the hold needs first: its walls and gates, then its ground, then its heart and dressing.

---

## Prompt 1: UND-01, the outer ring of iron railings on bone footings, in every state of the siege

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Undead Legion's: the Barrow Necropolis, a walled city of the dead on grey barrow downs, ringed by iron railings on bone footings,
with mausoleum rows, an ossuary keep on a stepped barrow at its heart, open belfries of bone bells, and a still grey lake.
This task paints ONE sheet: the outer ring of iron railings on bone footings, in every state of the siege.

Rules for this task:
- Branch: art/assault-undead. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/undead/und-01-railings.png. Change no other file.
- Size: the image tool's own output size does not matter (it often gives 1254 x 1254 or another size). Paint the pieces at whatever size
  it gives, then with Pillow cut each piece out, scale it so it fills its cell like the Orc sheet's matching piece, and pack the pieces
  into a new transparent canvas of exactly the size below, each in its own cell near its foot point. That is expected, not a failure:
  placement and scale only need to be close, because the game's cutter re-anchors every piece. Never stop because of the size.
- Pull request into main titled "Assault art: the Barrow Necropolis". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG). Each piece casts only a small soft contact shadow on its own footprint.

Open these files first and match them:
- docs/samples/assault-art/undead-kit.jpg: the Liches and Blood Court kits (Chronos Settlement's isometric kits), labelled. Your
  pieces stand beside these on the map, so match them exactly: the blue-grey slate, the bone-white trim and spikes, the cold teal
  witch-fire glow in windows and lanterns, the black iron, the dead grass.
  Above all liches/iron_fence, liches/bone_wall_run and liches/bone_wall_corner: the same iron, the same bone, the same spikes.
- src/art/camp/camp-war.png, its middle row: the Necropolis graveyard as the camp's overlook paints it (the palette and the mood).
- src/art/areas/graveyard/top1.png and side.png: the graveyard land's ground and sides as the game draws them today.
- docs/samples/assault-art/template-props-1024.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/undead-kit.jpg > /tmp/undead-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

Style: detailed painted pixel art, exactly like the Liches kit. Crisp dark outlines, chunky readable shapes, a cold muted palette
(blue-grey slate and stone, bone white, black iron, dead olive grass) with teal-green witch fire as the accent, a little Blood Court
red only where a piece says so, light weathering, moonlit. It must read clearly when shown at a quarter of this size on a phone.

The angle and scale, exactly:
- True 2:1 isometric (dimetric) view, no perspective: a flat square tile on the ground is a diamond exactly twice as wide as it is
  tall, its corners pointing up, right, down and left. Vertical edges stay vertical.
- ONE TILE = a diamond 128 px wide and 64 px tall. ONE HEIGHT STEP = 24 px.
- Light from the upper left: faces turned to the lower left are lit; faces turned to the lower right are in shade.
- "Along u" means running from the upper left down to the lower right (like "\"). Every run on this sheet runs along u, passing
  through its tile from the midpoint of the diamond's upper-left edge to the midpoint of its lower-right edge, so that pieces placed on
  neighbouring tiles join seamlessly at those points. (The game mirrors them for runs going the other way.)
- The ring stands about 4 steps (96 px) tall: a footing of stacked stone and long bones about 1 step high, iron railings above it
  with spear-point finials, a bone-and-iron post every half tile.
- The OUTER face is the one turned to the viewer's lower left: skull bosses on the posts, chains, teal lanterns. The INNER face (cell 5)
  is the back of the same railing: iron braces, a narrow stone step for archers, hanging bones.

The sheet: 1024 x 1024 px, a 4 x 4 grid of 256 x 256 cells, read left to right, top to bottom. Every piece has a ONE-TILE footprint:
its diamond's centre (the foot point) is at (128, 208) inside its cell. Keep each piece inside its own cell with 8 px to spare.

1. Railing run, outer face, whole: the footing, the railings, two bone posts with skull bosses, a hanging iron lantern with teal fire.
2. The same run, battered: two railings bent outwards, a finial snapped, arrows caught in the bars, a crack in the footing, scorch.
3. The same run, broken: the railings torn and twisted down to stubs about 1.5 steps high, bones spilled from the footing, one bar
   fallen across. Still a barrier.
4. The breach: no railing left. A ramp of tumbled footing stones, bones, grave earth and bent iron sloping down to the lower left,
   as if into a ditch. Walkable.
5. Railing run, inner face, whole: the back of cell 1. Iron braces, a stone step a step and a half up, a chain of hanging bones.
6. Corner, south (the corner nearest the viewer): two runs meet at the bottom of the tile, one running up-left and one up-right,
   both showing their OUTER faces, round a thick bone-and-stone corner post topped by a horned skull and a teal witch-fire cage.
7. Corner, north (the far corner): two runs meet at the top of the tile, going down-left and down-right, both showing their INNER
   faces, with a corner post and a small archer's platform.
8. Corner, east: a run coming from the upper left meets a run going down to the lower left at the tile's right corner. The first
   shows its inner face and the second its outer face. Corner post with a skull.
9. Gate post: a tall pillar of stacked skulls in iron bands, taller than the railing, a teal lantern on an arm and a tattered grey
   banner with a black crown. It ends a run beside a gate.
10. Sally port, one tile wide, whole: a narrow iron gate of bars and bone set in the run, a small skull arch over it, outer face.
11. The sally port, battered: bars bent, a hinge torn, scorch.
12. The sally port, broken: torn open, one leaf hanging from its post and the other on the ground. Passable.
13. Barricade (the lake causeway's fort): a low wall, chest-high (about 2 steps), of stacked coffins, broken headstones and a hearse
    wheel, a few grave spikes out front. Runs along u.
14. The barricade, broken: scattered coffins and headstone pieces, low enough to step over.
15. Grave spikes: a cluster of black iron spikes and sharpened bones driven into the ground at an angle, leaning out to the lower
    left, about 1.5 steps high, old skulls at their feet. Fills most of the tile.
16. Spike line: a single row of iron grave spikes across the tile along u, leaning out to the lower left, about 2 steps high, bound
    to a bone rail at their foot.
```

## Prompt 2: UND-02, the ring's two great gates, in their siege states, and the gate towers' tops

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Undead Legion's: the Barrow Necropolis, a walled city of the dead on grey barrow downs, ringed by iron railings on bone footings,
with mausoleum rows, an ossuary keep on a stepped barrow at its heart, open belfries of bone bells, and a still grey lake.
This task paints ONE sheet: the ring's two great gates, in their siege states, and the gate towers' tops.

Rules for this task:
- Branch: art/assault-undead. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/undead/und-02-gates.png. Change no other file.
- Size: the image tool's own output size does not matter (it often gives 1254 x 1254 or another size). Paint the pieces at whatever size
  it gives, then with Pillow cut each piece out, scale it so it fills its cell like the Orc sheet's matching piece, and pack the pieces
  into a new transparent canvas of exactly the size below, each in its own cell near its foot point. That is expected, not a failure:
  placement and scale only need to be close, because the game's cutter re-anchors every piece. Never stop because of the size.
- Pull request into main titled "Assault art: the Barrow Necropolis". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG). Each piece casts only a small soft contact shadow on its own footprint.

Open these files first and match them:
- docs/samples/assault-art/undead-kit.jpg: the Liches and Blood Court kits (Chronos Settlement's isometric kits), labelled. Your
  pieces stand beside these on the map, so match them exactly: the blue-grey slate, the bone-white trim and spikes, the cold teal
  witch-fire glow in windows and lanterns, the black iron, the dead grass.
  Above all liches/gatehouse and liches/bone_wall_run: the same slate, bone spikes and teal-lit windows.
- src/art/camp/camp-war.png, its middle row: the Necropolis graveyard as the camp's overlook paints it (the palette and the mood).
- src/art/areas/graveyard/top1.png and side.png: the graveyard land's ground and sides as the game draws them today.
- docs/samples/assault-art/template-buildings-1536.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/undead-kit.jpg > /tmp/undead-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

Style: detailed painted pixel art, exactly like the Liches kit. Crisp dark outlines, chunky readable shapes, a cold muted palette
(blue-grey slate and stone, bone white, black iron, dead olive grass) with teal-green witch fire as the accent, a little Blood Court
red only where a piece says so, light weathering, moonlit. It must read clearly when shown at a quarter of this size on a phone.

The angle and scale, exactly:
- True 2:1 isometric (dimetric) view, no perspective: a flat square tile on the ground is a diamond exactly twice as wide as it is
  tall, its corners pointing up, right, down and left. Vertical edges stay vertical.
- ONE TILE = a diamond 128 px wide and 64 px tall. ONE HEIGHT STEP = 24 px.
- Light from the upper left: faces turned to the lower left are lit; faces turned to the lower right are in shade.
- The ring's railing is about 4 steps (96 px) tall; a gate's sides stand flush with it and may rise higher (a gate tower).
- The gates run along u (from the upper left down to the lower right, like "\"); the game mirrors them.

The sheet: 1536 x 1024 px, a 3 x 2 grid of 512 x 512 cells, read left to right, top to bottom. The foot point (the centre of the
footprint diamond) is at (256, 416) in every cell. Footprints: cells 1 to 4 are 2 tiles along u by 1 through (a diamond 192 x 96); cells 5 and 6 are 2 x 2 tiles (a diamond 256 x 128). Keep each piece inside its cell with 8 px to spare.

1. The Lych Gate (the south gate), whole, outer face to the lower left: a roofed gate of black timber and slate over an iron double
   gate, bone pillars either side with skull lanterns of teal fire, a carved bone arch over it with a black crown, chains across.
2. The same Lych Gate, battered: the iron gate dented and scorched, a lantern smashed, slates fallen from its roof, arrows in the
   timber, a chain snapped.
3. The same Lych Gate, broken: the gate leaves torn off and lying flat, the arch cracked but standing, the passage open and walkable,
   rubble at the sides (not in the passage).
4. The North Gate, whole, INNER face to the lower left (it stands on the ring's far side): the same build seen from inside, with
   its iron bar across, a winch and a brazier of teal fire.
5. The North Gate, broken (inner face): the bar snapped, the leaves hanging open, passable.
6. A gate tower's top: what stands on top of a 2 x 2 stone gate tower that the game raises: a slate-roofed open belfry with a
   small cracked bell, bone finials on the roof corners, a teal lantern and a grey banner with a black crown.
```

## Prompt 3: UND-03, the inner wall's great Bone Gate, the postern and the corner towers' tops

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Undead Legion's: the Barrow Necropolis, a walled city of the dead on grey barrow downs, ringed by iron railings on bone footings,
with mausoleum rows, an ossuary keep on a stepped barrow at its heart, open belfries of bone bells, and a still grey lake.
This task paints ONE sheet: the inner wall's great Bone Gate, the postern and the corner towers' tops.

Rules for this task:
- Branch: art/assault-undead. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/undead/und-03-bone-gate.png. Change no other file.
- Size: the image tool's own output size does not matter (it often gives 1254 x 1254 or another size). Paint the pieces at whatever size
  it gives, then with Pillow cut each piece out, scale it so it fills its cell like the Orc sheet's matching piece, and pack the pieces
  into a new transparent canvas of exactly the size below, each in its own cell near its foot point. That is expected, not a failure:
  placement and scale only need to be close, because the game's cutter re-anchors every piece. Never stop because of the size.
- Pull request into main titled "Assault art: the Barrow Necropolis". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG). Each piece casts only a small soft contact shadow on its own footprint.

Open these files first and match them:
- docs/samples/assault-art/undead-kit.jpg: the Liches and Blood Court kits (Chronos Settlement's isometric kits), labelled. Your
  pieces stand beside these on the map, so match them exactly: the blue-grey slate, the bone-white trim and spikes, the cold teal
  witch-fire glow in windows and lanterns, the black iron, the dead grass.
  Above all liches/gatehouse, liches/chapel and bloodcourt/stone_wall_run: crypt stone, slate, bone and iron.
- src/art/camp/camp-war.png, its middle row: the Necropolis graveyard as the camp's overlook paints it (the palette and the mood).
- src/art/areas/graveyard/top1.png and side.png: the graveyard land's ground and sides as the game draws them today.
- docs/samples/assault-art/template-buildings-1536.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/undead-kit.jpg > /tmp/undead-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

Style: detailed painted pixel art, exactly like the Liches kit. Crisp dark outlines, chunky readable shapes, a cold muted palette
(blue-grey slate and stone, bone white, black iron, dead olive grass) with teal-green witch fire as the accent, a little Blood Court
red only where a piece says so, light weathering, moonlit. It must read clearly when shown at a quarter of this size on a phone.

The angle and scale, exactly:
- True 2:1 isometric (dimetric) view, no perspective: a flat square tile on the ground is a diamond exactly twice as wide as it is
  tall, its corners pointing up, right, down and left. Vertical edges stay vertical.
- ONE TILE = a diamond 128 px wide and 64 px tall. ONE HEIGHT STEP = 24 px.
- Light from the upper left: faces turned to the lower left are lit; faces turned to the lower right are in shade.
- The inner crypt-stone wall is exactly 6 steps (144 px) tall from the ground to its walkway, plus merlons. The game draws the wall
  itself; the gates fill gaps in it, so each gate's front must be exactly 144 px tall to the walkway line, flush with the wall on
  either side, and may rise higher above it (a gate tower).
- The gates run along u (from the upper left down to the lower right, like "\"); the game mirrors them. The wall is 2 tiles thick.

The sheet: 1536 x 1024 px, a 3 x 2 grid of 512 x 512 cells, read left to right, top to bottom. The foot point (the centre of the
footprint diamond) is at (256, 416) in every cell. Footprints: cells 1 to 3 are 2 x 2 tiles (a diamond 256 x 128); cells 4 and 5 are 1 tile along the wall by 2 tiles through it (a diamond 192 x 96); cell 6 is 3 x 3 tiles (a diamond 384 x 192). Keep each piece inside its cell with 8 px to spare.

1. The Bone Gate, whole, seen from OUTSIDE (outer face to the lower left): a gatehouse of dark crypt stone 6 steps tall with a
   deep pointed arch whose voussoirs are long thigh bones, a black iron portcullis down across it, a ribcage of iron over the arch
   and a great horned skull keystone with teal fire in its eyes, and above the walkway a slate-roofed gate tower with a bone
   belfry. The strongest-looking thing on the map.
2. The same Bone Gate, battered: the portcullis dented and scorched, bones cracked out of the arch, the skull keystone chipped and
   its fire guttering, soot streaks, slates missing from the tower.
3. The same Bone Gate, broken: the portcullis bent and wrenched up and to one side, the passage open and walkable, bones and stone
   rubble at the sides (not in the passage), the skull fallen, the tower above cracked but standing.
4. The postern, whole, seen from INSIDE (inner face to the lower left): a narrow pointed crypt doorway through the 2-thick wall, an
   iron-bound door with a coffin-lid shape, a teal lantern bracket. Flush with the wall, 6 steps tall.
5. The postern, broken: the door off its hinges on the ground, the arch open and walkable.
6. Corner tower top: the top of a crypt-stone tower that the game raises as a 3 x 3 column (draw only what stands on its top): a
   stone platform ringed by a crenellated parapet about 1.5 steps high with bone merlons, an iron cage of teal witch fire, a tall grey
   banner with a black crown on a pole, a small slate roof over one corner, a rack of black spears.
```

## Prompt 4: UND-04, the flat face textures the game shears onto every cliff, bank and wall

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Undead Legion's: the Barrow Necropolis, a walled city of the dead on grey barrow downs, ringed by iron railings on bone footings,
with mausoleum rows, an ossuary keep on a stepped barrow at its heart, open belfries of bone bells, and a still grey lake.
This task paints ONE sheet: the flat face textures the game shears onto every cliff, bank and wall.

Rules for this task:
- Branch: art/assault-undead. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/undead/und-04-faces.png. Change no other file.
- Size: the image tool's own output size does not matter (it often gives 1254 x 1254 or another size). Paint the pieces at whatever size
  it gives, then with Pillow cut each piece out, scale it so it fills its cell like the Orc sheet's matching piece, and pack the pieces
  into a new transparent canvas of exactly the size below, each in its own cell near its foot point. That is expected, not a failure:
  placement and scale only need to be close, because the game's cutter re-anchors every piece. Never stop because of the size.
- Pull request into main titled "Assault art: the Barrow Necropolis". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered column.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Opaque textures; leave only the unused bottom band of each column (y 480 to 512) transparent. Lip edges may have a transparent
  ragged top (grass, merlons, railings).

Open these files first and match them:
- docs/samples/assault-art/undead-kit.jpg: the Liches and Blood Court kits (Chronos Settlement's isometric kits), labelled. Your
  pieces stand beside these on the map, so match them exactly: the blue-grey slate, the bone-white trim and spikes, the cold teal
  witch-fire glow in windows and lanterns, the black iron, the dead grass.
- src/art/camp/camp-war.png, its middle row: the Necropolis graveyard as the camp's overlook paints it (the palette and the mood).
- src/art/areas/graveyard/top1.png and side.png: the graveyard land's ground and sides as the game draws them today.
- src/art/ground/rock.png and src/art/areas/graveyard/side.png: today's tiny side strips, which these replace.
- docs/samples/assault-art/template-faces-1536.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/undead-kit.jpg > /tmp/undead-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

THE VIEW IS STRAIGHT-ON, NOT ISOMETRIC: draw each face as a flat elevation, as if standing square in front of the wall, with no
perspective and no skew. The game skews it. Light from the upper left, evenly across the face (the game adds the shading for which
side it is on). Style: painted pixel art matching the Liches kit, chunky and readable, a cold muted palette.

The sheet: 1536 x 1024 px, 6 columns of 256 px, in two rows of 512 px: twelve columns, numbered left to right along the top row
(1 to 6), then the bottom row (7 to 12). Each column is one face set, 256 px wide (the length of one tile's edge), and must tile
seamlessly LEFT TO RIGHT with itself. Inside each column, from its top:
- the LIP, y 0 to 80 (one height step): the face's top edge, what overhangs or crowns it;
- the BODY, y 80 to 400 (four steps of 80 px): the face itself; it must tile seamlessly UP AND DOWN and left to right, because the
  game repeats it for walls of any height;
- the FOOT, y 400 to 480 (one step): where the face meets the ground;
- y 480 to 512: empty.
The lip's bottom must flow into the body's top, and the body's bottom into the foot's top, with no seam.

1. Barrow-down chalk cliff: pale grey chalk and flint in rough slabs, thin dead grass streaks; lip: grey turf overhanging; foot: scree.
2. Barrow earth bank: dark grey-brown earth with old bones and coffin corners showing in it, roots; lip: dead grass; foot: loose earth.
3. Grave-mud bank (a ditch's side): wet black mud, gouges, a broken headstone and bones stuck in it; lip: trampled edge; foot: a
   standing water line.
4. Ossuary revetment: earth held behind a lattice of stacked skulls and long bones; lip: grave spikes; foot: bone dust.
5. Railing footing: stacked rough stones and long bones in mortar; lip: the iron railing's foot and spear points (ragged,
   transparent between the bars); foot: earth banked against it.
6. Crypt-stone curtain wall: big dark blue-grey blocks in courses, carved here and there with small skull reliefs, iron rings; lip:
   a crenellated parapet with bone merlons (transparent in the gaps); foot: moss and grave dirt.
7. The same crypt wall, battle-damaged: cracked and missing blocks, soot streaks, a teal stain of spent witch fire; lip: broken
   merlons; foot: fallen stone chips.
8. Corner tower masonry: smaller dressed stones, a narrow arrow slit in the body's middle with a faint teal glow; lip: a jutting
   course with skull corbels; foot: a sloped stone plinth.
9. Barrow terrace wall: dry-stacked flat stones with niches holding skulls and grave candles; lip: flagstone edge with a bone trim;
   foot: packed earth.
10. Burial-mound earth: raw dark earth with roots, buried bones and the edge of a stone burial slab; lip: torn grey turf; foot:
    loose earth.
11. Lake bank: wet black stone and grey clay with a pale waterline and dead weed in its lowest part; lip: dead reeds; foot: wet
    shingle at the water.
12. Black slate cliff: layered black slate splitting in sheets, cold and sharp; lip: thin dead grass; foot: slate shards.
```

## Prompt 5: UND-05, sixteen seamless ground textures

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Undead Legion's: the Barrow Necropolis, a walled city of the dead on grey barrow downs, ringed by iron railings on bone footings,
with mausoleum rows, an ossuary keep on a stepped barrow at its heart, open belfries of bone bells, and a still grey lake.
This task paints ONE sheet: sixteen seamless ground textures.

Rules for this task:
- Branch: art/assault-undead. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/undead/und-05-ground.png. Change no other file.
- Size: the image tool's own output size does not matter (it often gives 1254 x 1254 or another size). Paint the pieces at whatever size
  it gives, then with Pillow cut each piece out, scale it so it fills its cell like the Orc sheet's matching piece, and pack the pieces
  into a new transparent canvas of exactly the size below, each in its own cell near its foot point. That is expected, not a failure:
  placement and scale only need to be close, because the game's cutter re-anchors every piece. Never stop because of the size.
- Pull request into main titled "Assault art: the Barrow Necropolis". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Opaque image.

Open these files first and match them:
- src/art/areas/graveyard/top1.png, top2.png and high.png, and src/art/areas/dungeon/top1.png: today's 64 px tops, which these
  replace (keep their pixel density: 64 px a tile).
- docs/samples/assault-art/undead-kit.jpg: the kit's liches/cracked_earth_tile, liches/dead_grass_tile, liches/grave_plot_tile,
  liches/cobble_tile and bloodcourt/dark_grass_tile give the colours to match.
- src/art/camp/camp-war.png, its middle row: the Necropolis's ground as the overlook paints it.
- docs/samples/assault-art/template-textures-1024.png: the grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/undead-kit.jpg > /tmp/undead-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

THE VIEW IS STRAIGHT DOWN, NOT ISOMETRIC: draw each texture as seen from directly above, like a map, with no perspective, no horizon
and no cast shadows longer than a pebble's. Style: painted pixel art matching the Liches kit's ground tiles; readable, not noisy; no
single feature so striking that its repeat would be noticed.

The sheet: 1024 x 1024 px, a 4 x 4 grid of 256 x 256 squares, read left to right, top to bottom. EACH SQUARE IS ONE TEXTURE COVERING
4 x 4 TILES, AND MUST TILE SEAMLESSLY WITH ITSELF ON ALL FOUR SIDES (its left edge continues its right edge, its top its bottom).
Keep the squares separate: nothing crosses from one square into the next.

1. Barrow-down grass: short grey-green grass, dry, a few darker tufts and chalk pebbles.
2. Barrow-down grass, second variant: the same, a little paler, with sparse white grave flowers.
3. Dead heath: withered grass, black thistles and grey stones, for the downs' wild rear.
4. Trampled dead grass: worn grass with bare grey earth patches, round the posts.
5. Grave mud: dark grey-brown mud, footprinted, a bone fragment or two.
6. Grave mud, second variant: the same, with scattered dead leaves and small stones.
7. Churned wet grave earth: ruts and puddles reflecting the sky dimly, for the lanes and the ditch floor.
8. Cracked dry earth: pale cracked ground, like the kit's cracked earth tile, for the plague pits' rims.
9. Bone dust and ash: grey-white dust, crushed bone fragments, a few small teeth.
10. Packed graveyard earth: hard dark earth with dead grass at its edges, for the camps.
11. Cobbled lane: dark blue-grey cobbles, irregular, moss and grave dirt in the gaps.
12. Crypt flagstones: big uneven blue-grey flags with worn carved marks (scratches only, no letters), moss in the joints,
    a few cracked.
13. Wall-walk stone: smoother, closely fitted slate slabs, wax drips from candles, a drain groove.
14. Old coffin-plank walkway: grey weathered planks seen from above, running from the top of the square to the bottom, iron nails.
15. Lake shingle: rounded grey and black pebbles and grey sand, damp.
16. Shallow still water over pebbles: grey, glassy lake water over shingle, a faint mist sheen, the pebbles dim through it.
```

## Prompt 6: UND-06, the overlays the game lays where two grounds meet

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Undead Legion's: the Barrow Necropolis, a walled city of the dead on grey barrow downs, ringed by iron railings on bone footings,
with mausoleum rows, an ossuary keep on a stepped barrow at its heart, open belfries of bone bells, and a still grey lake.
This task paints ONE sheet: the overlays the game lays where two grounds meet.

Rules for this task:
- Branch: art/assault-undead. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/undead/und-06-transitions.png. Change no other file.
- Size: the image tool's own output size does not matter (it often gives 1254 x 1254 or another size). Paint the pieces at whatever size
  it gives, then with Pillow cut each piece out, scale it so it fills its cell like the Orc sheet's matching piece, and pack the pieces
  into a new transparent canvas of exactly the size below, each in its own cell near its foot point. That is expected, not a failure:
  placement and scale only need to be close, because the game's cutter re-anchors every piece. Never stop because of the size.
- Pull request into main titled "Assault art: the Barrow Necropolis". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG): each overlay is the material only, and everything else is transparent.

Open these files first and match them:
- art-source/assault/undead/und-05-ground.png on this branch, if it is there: the ground textures these overlays must match exactly in
  colour and pixel density. If it is not there yet, match the descriptions below and src/art/areas/graveyard/top1.png.
- docs/samples/assault-art/template-textures-1024.png: the grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/undead-kit.jpg > /tmp/undead-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

Where two grounds meet (grave mud beside grass, a lane's edge), the game lays an overlay along the shared edge so the join is ragged
and natural instead of a straight seam.

THE VIEW IS STRAIGHT DOWN, NOT ISOMETRIC, as on a map. Style: painted pixel art matching the ground textures, with soft, ragged,
organic edges (clumps, tongues and scattered bits), never a straight line or a smooth gradient band.

The sheet: 1024 x 1024 px, a 4 x 4 grid of 256 x 256 squares, read left to right, top to bottom. Each square is ONE tile, painted at
4x. The cells come in pairs:
- an EDGE (odd cells): the material covers the square's TOP edge fully, along its whole width, and breaks up into transparency by about
  40% of the way down. It must join seamlessly with itself left to right, because the game lays it along a whole row of tiles. The
  game turns it to face each of the four sides.
- an OUTER CORNER (even cells): the material sits only in the square's TOP-LEFT corner, a ragged rounded patch reaching about 40% of
  the way along the top and left edges, fading to transparency, and meeting the edge overlay's profile where it touches the edges.

1. Grave mud spreading onto barrow grass: edge.            2. The same: outer corner.
3. Bone dust and ash spreading onto any ground: edge.      4. The same: outer corner.
5. A cobbled lane's edge: cobbles loosening into grave earth: edge.   6. The same: outer corner.
7. A dirt path's edge over dead grass: bare grey earth with trodden stalks: edge.   8. The same: outer corner.
9. Lake shingle onto grass: pebbles and grey sand thinning into turf: edge.   10. The same: outer corner.
11. Broken crypt flags into mud: flags cracked and sinking, mud between: edge.   12. The same: outer corner.
13. Dead grass creeping onto mud: tufts and clumps encroaching: edge.   14. The same: outer corner.
15. The still water's edge: a thin pale mist-and-scum line with wet black stones, laid on the water side of a bank: edge.
16. The same: outer corner.
```

## Prompt 7: UND-07, the ossuary keep, the Lich's throne and the great banner

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Undead Legion's: the Barrow Necropolis, a walled city of the dead on grey barrow downs, ringed by iron railings on bone footings,
with mausoleum rows, an ossuary keep on a stepped barrow at its heart, open belfries of bone bells, and a still grey lake.
This task paints ONE sheet: the ossuary keep, the Lich's throne and the great banner.

Rules for this task:
- Branch: art/assault-undead. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/undead/und-07-keep.png. Change no other file.
- Size: the image tool's own output size does not matter (it often gives 1254 x 1254 or another size). Paint the pieces at whatever size
  it gives, then with Pillow cut each piece out, scale it so it fills its cell like the Orc sheet's matching piece, and pack the pieces
  into a new transparent canvas of exactly the size below, each in its own cell near its foot point. That is expected, not a failure:
  placement and scale only need to be close, because the game's cutter re-anchors every piece. Never stop because of the size.
- Pull request into main titled "Assault art: the Barrow Necropolis". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG). Each piece casts only a small soft contact shadow on its own footprint.

Open these files first and match them:
- docs/samples/assault-art/undead-kit.jpg: the Liches and Blood Court kits (Chronos Settlement's isometric kits), labelled. Your
  pieces stand beside these on the map, so match them exactly: the blue-grey slate, the bone-white trim and spikes, the cold teal
  witch-fire glow in windows and lanterns, the black iron, the dead grass.
  Above all liches/chapel, liches/mausoleum and liches/gatehouse.
- src/art/camp/camp-war.png, its middle row: the Necropolis graveyard as the camp's overlook paints it (the palette and the mood).
- src/art/areas/graveyard/top1.png and side.png: the graveyard land's ground and sides as the game draws them today.
- docs/samples/assault-art/template-keep-1536.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/undead-kit.jpg > /tmp/undead-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

Style: detailed painted pixel art, exactly like the Liches kit. Crisp dark outlines, chunky readable shapes, a cold muted palette
(blue-grey slate and stone, bone white, black iron, dead olive grass) with teal-green witch fire as the accent, a little Blood Court
red only where a piece says so, light weathering, moonlit. It must read clearly when shown at a quarter of this size on a phone.

The angle and scale, exactly:
- True 2:1 isometric (dimetric) view, no perspective: a flat square tile on the ground is a diamond exactly twice as wide as it is
  tall, its corners pointing up, right, down and left. Vertical edges stay vertical.
- ONE TILE = a diamond 128 px wide and 64 px tall. ONE HEIGHT STEP = 24 px.
- Light from the upper left: faces turned to the lower left are lit; faces turned to the lower right are in shade.
- A doorway is about 4 steps (96 px) tall.

The sheet: 1536 x 1024 px. Three cells:
1. Cell 1, x 0 to 1024, y 0 to 1024: THE OSSUARY KEEP. Footprint 6 tiles along u (upper left to lower right) by 4 tiles along v: a
   diamond 640 px wide and 320 px tall, centred on the foot point (512, 840). The keep may rise up to about 640 px above its foot.
   A great gothic charnel hall on a black stone plinth at the top of the barrow: walls of dark crypt stone faced with patterns of
   skulls and long bones, a steep blue-grey slate roof with bone ridge spikes, two slender spires with open bone belfries, a great
   rose window of iron tracery glowing teal, a broad pointed doorway facing the lower left with stone steps and two skull-lantern
   posts, grey banners with a black crown down the walls, wisps of teal mist round its base. Grander than anything else on the map.
2. Cell 2, x 1024 to 1536, y 0 to 512: THE LICH'S THRONE. One-tile footprint (a diamond 128 x 64) centred on the foot point (256,
   440) in the cell. A tall throne of black iron and bone on a two-step slate dais: a back of fanned ribs and skulls rising about 6
   steps, crowned with a black iron crown and a teal flame, a tattered grey shroud over the seat, two iron cages of witch fire on the
   dais. Facing the lower left.
3. Cell 3, x 1024 to 1536, y 512 to 1024: THE GREAT BANNER. One-tile footprint centred on (256, 440) in the cell. A tall pole (about
   14 steps) of black iron set in a cairn of skulls, a crossbar hung with a long ash-grey banner bearing a black crown over a white
   skull, tattered at the bottom, a teal lantern on top of the pole, small trophies (a cracked helm, a broken sword) tied below.
```

## Prompt 8: UND-08, the inner wall's dressing, the stairs and small structures

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Undead Legion's: the Barrow Necropolis, a walled city of the dead on grey barrow downs, ringed by iron railings on bone footings,
with mausoleum rows, an ossuary keep on a stepped barrow at its heart, open belfries of bone bells, and a still grey lake.
This task paints ONE sheet: the inner wall's dressing, the stairs and small structures.

Rules for this task:
- Branch: art/assault-undead. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/undead/und-08-wall-dressing.png. Change no other file.
- Size: the image tool's own output size does not matter (it often gives 1254 x 1254 or another size). Paint the pieces at whatever size
  it gives, then with Pillow cut each piece out, scale it so it fills its cell like the Orc sheet's matching piece, and pack the pieces
  into a new transparent canvas of exactly the size below, each in its own cell near its foot point. That is expected, not a failure:
  placement and scale only need to be close, because the game's cutter re-anchors every piece. Never stop because of the size.
- Pull request into main titled "Assault art: the Barrow Necropolis". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG). Each piece casts only a small soft contact shadow on its own footprint.

Open these files first and match them:
- docs/samples/assault-art/undead-kit.jpg: the Liches and Blood Court kits (Chronos Settlement's isometric kits), labelled. Your
  pieces stand beside these on the map, so match them exactly: the blue-grey slate, the bone-white trim and spikes, the cold teal
  witch-fire glow in windows and lanterns, the black iron, the dead grass.
  Above all liches/lantern_post, liches/witch_fire, liches/skull_pile and bloodcourt/stone_wall_run.
- src/art/camp/camp-war.png, its middle row: the Necropolis graveyard as the camp's overlook paints it (the palette and the mood).
- src/art/areas/graveyard/top1.png and side.png: the graveyard land's ground and sides as the game draws them today.
- docs/samples/assault-art/template-props-1024.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/undead-kit.jpg > /tmp/undead-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

Style: detailed painted pixel art, exactly like the Liches kit. Crisp dark outlines, chunky readable shapes, a cold muted palette
(blue-grey slate and stone, bone white, black iron, dead olive grass) with teal-green witch fire as the accent, a little Blood Court
red only where a piece says so, light weathering, moonlit. It must read clearly when shown at a quarter of this size on a phone.

The angle and scale, exactly:
- True 2:1 isometric (dimetric) view, no perspective: a flat square tile on the ground is a diamond exactly twice as wide as it is
  tall, its corners pointing up, right, down and left. Vertical edges stay vertical.
- ONE TILE = a diamond 128 px wide and 64 px tall. ONE HEIGHT STEP = 24 px.
- Light from the upper left: faces turned to the lower left are lit; faces turned to the lower right are in shade.
- The inner wall's walkway is 6 steps up; these pieces stand on it or against it.

The sheet: 1024 x 1024 px, a 4 x 4 grid of 256 x 256 cells, read left to right, top to bottom. Every piece has a ONE-TILE footprint:
its diamond's centre (the foot point) is at (128, 208) inside its cell. Keep each piece inside its own cell with 8 px to spare.

1. Bone crenel: one merlon of crypt stone capped with a skull, for the wall's outer edge, along u.
2. The same crenel, broken: cracked off, the skull rolled away, rubble on the walk.
3. Inner parapet: a low stone rail with bone balusters along the walk's inner edge, along u.
4. Wall witch-fire: an iron brazier on a bone tripod with teal flames, for the walk (about 2 steps tall).
5. Wall lantern: a hooked iron arm with a caged teal lantern, fixed to the walk's edge.
6. A small hanging banner: grey cloth with a black crown on a short iron pole, for the walk.
7. Arrow slit hoarding: a short timber-and-slate roof over a gap in the merlons, an archer's shelter.
8. A stack of black spears and a quiver rack against the parapet.
9. Stairs up the wall, along u: crypt-stone steps rising 6 steps (144 px) from the ground at the lower left to the walk, with a bone
   rail. One tile.
10. Stairs down, the same steps seen descending to the lower right (the game uses it where a stair goes down into a pit).
11. A ladder of lashed bones and planks leaning against a wall to the upper right, about 6 steps tall.
12. Cauldron of boiling pitch on the walk, an iron pot over teal fire, a ladle.
13. A small open grave: a rectangular hole with a spade stuck in the earth heap beside it.
14. A grave candle cluster: a dozen tall candles on a skull, wax pooled, small teal-white flames.
15. A raven perch: a dead branch on a post with two ravens.
16. A crumbling statue of a hooded mourner on a plinth, about 4 steps tall, moss in its folds.
```

## Prompt 9: UND-09, the bone-bell belfries (the hold's war drums) and its great landmarks

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Undead Legion's: the Barrow Necropolis, a walled city of the dead on grey barrow downs, ringed by iron railings on bone footings,
with mausoleum rows, an ossuary keep on a stepped barrow at its heart, open belfries of bone bells, and a still grey lake.
This task paints ONE sheet: the bone-bell belfries (the hold's war drums) and its great landmarks.

Rules for this task:
- Branch: art/assault-undead. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/undead/und-09-landmarks.png. Change no other file.
- Size: the image tool's own output size does not matter (it often gives 1254 x 1254 or another size). Paint the pieces at whatever size
  it gives, then with Pillow cut each piece out, scale it so it fills its cell like the Orc sheet's matching piece, and pack the pieces
  into a new transparent canvas of exactly the size below, each in its own cell near its foot point. That is expected, not a failure:
  placement and scale only need to be close, because the game's cutter re-anchors every piece. Never stop because of the size.
- Pull request into main titled "Assault art: the Barrow Necropolis". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG). Each piece casts only a small soft contact shadow on its own footprint.

Open these files first and match them:
- docs/samples/assault-art/undead-kit.jpg: the Liches and Blood Court kits (Chronos Settlement's isometric kits), labelled. Your
  pieces stand beside these on the map, so match them exactly: the blue-grey slate, the bone-white trim and spikes, the cold teal
  witch-fire glow in windows and lanterns, the black iron, the dead grass.
  Above all liches/watchtower, liches/chapel, liches/bone_pit and liches/mausoleum.
- src/art/camp/camp-war.png, its middle row: the Necropolis graveyard as the camp's overlook paints it (the palette and the mood).
- src/art/areas/graveyard/top1.png and side.png: the graveyard land's ground and sides as the game draws them today.
- docs/samples/assault-art/template-buildings-1536.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/undead-kit.jpg > /tmp/undead-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

Style: detailed painted pixel art, exactly like the Liches kit. Crisp dark outlines, chunky readable shapes, a cold muted palette
(blue-grey slate and stone, bone white, black iron, dead olive grass) with teal-green witch fire as the accent, a little Blood Court
red only where a piece says so, light weathering, moonlit. It must read clearly when shown at a quarter of this size on a phone.

The angle and scale, exactly:
- True 2:1 isometric (dimetric) view, no perspective: a flat square tile on the ground is a diamond exactly twice as wide as it is
  tall, its corners pointing up, right, down and left. Vertical edges stay vertical.
- ONE TILE = a diamond 128 px wide and 64 px tall. ONE HEIGHT STEP = 24 px.
- Light from the upper left: faces turned to the lower left are lit; faces turned to the lower right are in shade.
- The bone bells play the part the orc hold's war drums do: while one rings, the garrison near it fights harder, until our troops
  reach it and silence it.

The sheet: 1536 x 1024 px, a 3 x 2 grid of 512 x 512 cells, read left to right, top to bottom. The foot point (the centre of the
footprint diamond) is at (256, 416) in every cell. Footprints: cells 1 to 4 are 2 x 2 tiles (a diamond 256 x 128); cells 5 and 6 are 3 x 3 tiles (a diamond 384 x 192). Keep each piece inside its cell with 8 px to spare.

1. Bone-bell belfry, ringing: an open belfry on four pillars of stacked bones about 6 steps tall, a slate roof with bone finials,
   a great cracked bronze bell hung on chains, at the instant it swings out: the clapper striking, teal sound-rings bursting round
   the bell, ghostly wisps streaming, two skull lanterns flaring.
2. The same belfry, silenced: after our troops reached it: the bell cut down and lying cracked on its side at the foot, the chains
   hanging loose, one pillar toppled, the lanterns out and smoking.
3. A barrow mound: a grassy burial mound with a dark stone-lined entrance passage facing the lower left, standing stones either side,
   a lintel carved with spirals, teal mist breathing out.
4. A plague pit: a round pit ringed by a low stone kerb and leaning grave spikes, bones and quicklime inside, a winch for lowering
   the dead, a faint sickly green haze.
5. The drowned lych-gate: a roofed stone gate standing in shallow water, the water lapping its steps, dead reeds round it, its roof
   sagging, a single teal lantern still burning. It stands on a lake's edge tile.
6. The Lich's spire: a slender black tower about 16 steps tall on a stepped base, ringed by three floating stone rings, its top an
   open cage of iron with a teal fire, ravens round it. The tallest thing on the map.
```

## Prompt 10: UND-10, the necropolis's small props the kits do not have

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Undead Legion's: the Barrow Necropolis, a walled city of the dead on grey barrow downs, ringed by iron railings on bone footings,
with mausoleum rows, an ossuary keep on a stepped barrow at its heart, open belfries of bone bells, and a still grey lake.
This task paints ONE sheet: the necropolis's small props the kits do not have.

Rules for this task:
- Branch: art/assault-undead. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/undead/und-10-props.png. Change no other file.
- Size: the image tool's own output size does not matter (it often gives 1254 x 1254 or another size). Paint the pieces at whatever size
  it gives, then with Pillow cut each piece out, scale it so it fills its cell like the Orc sheet's matching piece, and pack the pieces
  into a new transparent canvas of exactly the size below, each in its own cell near its foot point. That is expected, not a failure:
  placement and scale only need to be close, because the game's cutter re-anchors every piece. Never stop because of the size.
- Pull request into main titled "Assault art: the Barrow Necropolis". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG). Each piece casts only a small soft contact shadow on its own footprint.

Open these files first and match them:
- docs/samples/assault-art/undead-kit.jpg: the Liches and Blood Court kits (Chronos Settlement's isometric kits), labelled. Your
  pieces stand beside these on the map, so match them exactly: the blue-grey slate, the bone-white trim and spikes, the cold teal
  witch-fire glow in windows and lanterns, the black iron, the dead grass.
  The kits already give the coffins, the coffin stack, the gravestones, the skull pile, the bone pit, the witch fire, the lantern
  posts, the dead trees and the barrels: do not paint those again. These props go with them.
- src/art/camp/camp-war.png, its middle row: the Necropolis graveyard as the camp's overlook paints it (the palette and the mood).
- src/art/areas/graveyard/top1.png and side.png: the graveyard land's ground and sides as the game draws them today.
- docs/samples/assault-art/template-props-1024.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/undead-kit.jpg > /tmp/undead-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

Style: detailed painted pixel art, exactly like the Liches kit. Crisp dark outlines, chunky readable shapes, a cold muted palette
(blue-grey slate and stone, bone white, black iron, dead olive grass) with teal-green witch fire as the accent, a little Blood Court
red only where a piece says so, light weathering, moonlit. It must read clearly when shown at a quarter of this size on a phone.

The angle and scale, exactly:
- True 2:1 isometric (dimetric) view, no perspective: a flat square tile on the ground is a diamond exactly twice as wide as it is
  tall, its corners pointing up, right, down and left. Vertical edges stay vertical.
- ONE TILE = a diamond 128 px wide and 64 px tall. ONE HEIGHT STEP = 24 px.
- Light from the upper left: faces turned to the lower left are lit; faces turned to the lower right are in shade.

The sheet: 1024 x 1024 px, a 4 x 4 grid of 256 x 256 cells, read left to right, top to bottom. Every piece has a ONE-TILE footprint:
its diamond's centre (the foot point) is at (128, 208) inside its cell. Keep each piece inside its own cell with 8 px to spare.

1. A single leaning headstone, old and cracked, moss on it.
2. A celtic grave cross of grey stone, a little tilted.
3. A sarcophagus with a carved knight's effigy on its lid.
4. An open, broken coffin, its lid beside it, bones spilling out.
5. A heap of grave earth with a spade and a pick stuck in it.
6. A body cart: a two-wheeled cart piled with shrouded bodies.
7. A bone rack: a timber frame hung with sorted long bones and skulls, as in a charnel house.
8. An iron gibbet cage hanging from a crooked post, a skeleton inside.
9. A broken angel statue: a winged figure fallen from its plinth, one wing snapped.
10. A cluster of grave lanterns: three small iron lanterns on short stakes with teal flames.
11. A ritual circle of black candles round a chalk sigil (no letters), lying low on the ground.
12. A pile of rusted helms, shields and swords from the fallen.
13. A dead hawthorn bush, black and spiked.
14. A grey shroud banner on a tall pole, tattered.
15. A small mausoleum door set into a hillock, iron-bound, a skull over it.
16. A crow-picked carcass of a horse, bones and a torn saddle, lying low.
```

## Prompt 11: UND-11, ruins, and the burnt states of the charnel camp's tents

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Undead Legion's: the Barrow Necropolis, a walled city of the dead on grey barrow downs, ringed by iron railings on bone footings,
with mausoleum rows, an ossuary keep on a stepped barrow at its heart, open belfries of bone bells, and a still grey lake.
This task paints ONE sheet: ruins, and the burnt states of the charnel camp's tents.

Rules for this task:
- Branch: art/assault-undead. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/undead/und-11-ruins.png. Change no other file.
- Size: the image tool's own output size does not matter (it often gives 1254 x 1254 or another size). Paint the pieces at whatever size
  it gives, then with Pillow cut each piece out, scale it so it fills its cell like the Orc sheet's matching piece, and pack the pieces
  into a new transparent canvas of exactly the size below, each in its own cell near its foot point. That is expected, not a failure:
  placement and scale only need to be close, because the game's cutter re-anchors every piece. Never stop because of the size.
- Pull request into main titled "Assault art: the Barrow Necropolis". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG). Each piece casts only a small soft contact shadow on its own footprint.

Open these files first and match them:
- docs/samples/assault-art/undead-kit.jpg: the Liches and Blood Court kits (Chronos Settlement's isometric kits), labelled. Your
  pieces stand beside these on the map, so match them exactly: the blue-grey slate, the bone-white trim and spikes, the cold teal
  witch-fire glow in windows and lanterns, the black iron, the dead grass.
- src/art/camp/camp-war.png, its middle row: the Necropolis graveyard as the camp's overlook paints it (the palette and the mood).
- src/art/areas/graveyard/top1.png and side.png: the graveyard land's ground and sides as the game draws them today.
- docs/samples/assault-art/template-buildings-1536.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/undead-kit.jpg > /tmp/undead-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

Style: detailed painted pixel art, exactly like the Liches kit. Crisp dark outlines, chunky readable shapes, a cold muted palette
(blue-grey slate and stone, bone white, black iron, dead olive grass) with teal-green witch fire as the accent, a little Blood Court
red only where a piece says so, light weathering, moonlit. It must read clearly when shown at a quarter of this size on a phone.

The angle and scale, exactly:
- True 2:1 isometric (dimetric) view, no perspective: a flat square tile on the ground is a diamond exactly twice as wide as it is
  tall, its corners pointing up, right, down and left. Vertical edges stay vertical.
- ONE TILE = a diamond 128 px wide and 64 px tall. ONE HEIGHT STEP = 24 px.
- Light from the upper left: faces turned to the lower left are lit; faces turned to the lower right are in shade.
- Our own siege works (the ladders, the ram, the trebuchet) are already painted on the Orc hold's sheets and serve every hold: do not
  paint them. The Warpath's reserve camp here is the charnel camp: its tents and coffin heaps burn when our archers loose fire arrows.

The sheet: 1536 x 1024 px, a 3 x 2 grid of 512 x 512 cells, read left to right, top to bottom. The foot point (the centre of the
footprint diamond) is at (256, 416) in every cell. Footprints: cells 1 and 2 are 2 tiles along u by 1 (a diamond 192 x 96); cells 3 to 6 are 2 x 2 tiles (a diamond 256 x 128). Keep each piece inside its cell with 8 px to spare.

1. A charnel tent: a long grey canvas tent on black poles, patched, a coffin stack and a lantern at its open flap.
2. The same tent, burnt: a black heap of charred poles and ash, a few embers, the coffins scorched.
3. A heap of coffins and grave timber, piled for the camp, ready to burn.
4. The same heap, burnt: collapsed charred planks, ash, a thin smoke wisp.
5. A ruined mausoleum: its roof fallen in, two walls standing, the door gone, vines of dead ivy.
6. A toppled bell tower's ruin: the base of a stone tower, its top fallen in a spill of stones, a cracked bell half buried.
```

## Prompt 12: UND-12, the still grey lake's causeways, fords and shore pieces

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Undead Legion's: the Barrow Necropolis, a walled city of the dead on grey barrow downs, ringed by iron railings on bone footings,
with mausoleum rows, an ossuary keep on a stepped barrow at its heart, open belfries of bone bells, and a still grey lake.
This task paints ONE sheet: the still grey lake's causeways, fords and shore pieces.

Rules for this task:
- Branch: art/assault-undead. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/undead/und-12-lake.png. Change no other file.
- Size: the image tool's own output size does not matter (it often gives 1254 x 1254 or another size). Paint the pieces at whatever size
  it gives, then with Pillow cut each piece out, scale it so it fills its cell like the Orc sheet's matching piece, and pack the pieces
  into a new transparent canvas of exactly the size below, each in its own cell near its foot point. That is expected, not a failure:
  placement and scale only need to be close, because the game's cutter re-anchors every piece. Never stop because of the size.
- Pull request into main titled "Assault art: the Barrow Necropolis". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG). Each piece casts only a small soft contact shadow on its own footprint.

Open these files first and match them:
- docs/samples/assault-art/undead-kit.jpg: the Liches and Blood Court kits (Chronos Settlement's isometric kits), labelled. Your
  pieces stand beside these on the map, so match them exactly: the blue-grey slate, the bone-white trim and spikes, the cold teal
  witch-fire glow in windows and lanterns, the black iron, the dead grass.
  Above all liches/stone_bridge and bloodcourt/stone_bridge: the causeway is their style.
- src/art/camp/camp-war.png, its middle row: the Necropolis graveyard as the camp's overlook paints it (the palette and the mood).
- src/art/areas/graveyard/top1.png and side.png: the graveyard land's ground and sides as the game draws them today.
- docs/samples/assault-art/template-props-1024.png: the layout grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/undead-kit.jpg > /tmp/undead-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

Style: detailed painted pixel art, exactly like the Liches kit. Crisp dark outlines, chunky readable shapes, a cold muted palette
(blue-grey slate and stone, bone white, black iron, dead olive grass) with teal-green witch fire as the accent, a little Blood Court
red only where a piece says so, light weathering, moonlit. It must read clearly when shown at a quarter of this size on a phone.

The angle and scale, exactly:
- True 2:1 isometric (dimetric) view, no perspective: a flat square tile on the ground is a diamond exactly twice as wide as it is
  tall, its corners pointing up, right, down and left. Vertical edges stay vertical.
- ONE TILE = a diamond 128 px wide and 64 px tall. ONE HEIGHT STEP = 24 px.
- Light from the upper left: faces turned to the lower left are lit; faces turned to the lower right are in shade.
- The Necropolis has a still grey lake where the Orc hold has a river. The game draws the water as ground; these pieces stand in it
  or on its banks.
- "Along u" means running from the upper left down to the lower right (like "\"). Every run on this sheet runs along u, passing
  through its tile from the midpoint of the diamond's upper-left edge to the midpoint of its lower-right edge, so that pieces placed on
  neighbouring tiles join seamlessly at those points. (The game mirrors them for runs going the other way.)

The sheet: 1024 x 1024 px, a 4 x 4 grid of 256 x 256 cells, read left to right, top to bottom. Every piece has a ONE-TILE footprint:
its diamond's centre (the foot point) is at (128, 208) inside its cell. Keep each piece inside its own cell with 8 px to spare.

1. Causeway, whole: a flat stone causeway one tile wide crossing the water along u, low arches beneath, bone posts at its edges.
2. The causeway, broken: a gap with fallen stones in the water, the edges cracked. Impassable.
3. The causeway's end, where it meets the bank at the upper left, with a step down.
4. A causeway lantern post: an iron post with a teal lantern, for its edge.
5. Ford stones: a line of flat grave slabs just under the water along u, their tops showing.
6. Dead reeds: a clump of tall grey-brown reeds standing in the shallows.
7. A sunken coffin, its lid just showing above the water, weed on it.
8. A half-drowned headstone leaning in the shallows.
9. Wet black boulders at the water's edge, slick.
10. A rotting jetty: grey planks on posts reaching from the bank into the water along u.
11. A ferry punt: a narrow flat boat with a pole, moored.
12. Mist bank: a low drifting band of pale mist lying on the water (semi-transparent).
13. A drowned tree: a dead tree standing in the water, its roots exposed.
14. Lily pads that have gone grey, with one pale flower.
15. A stone mooring post with an iron ring and a frayed rope.
16. Water-worn stone steps going down into the lake from the bank at the upper left.
```

## Prompt 13: UND-13, sixteen ground decals

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). Its Assault mode is fought on a 100 x 100 tile isometric map of an enemy stronghold. This hold is the
Undead Legion's: the Barrow Necropolis, a walled city of the dead on grey barrow downs, ringed by iron railings on bone footings,
with mausoleum rows, an ossuary keep on a stepped barrow at its heart, open belfries of bone bells, and a still grey lake.
This task paints ONE sheet: sixteen ground decals.

Rules for this task:
- Branch: art/assault-undead. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly one file: art-source/assault/undead/und-13-decals.png. Change no other file.
- Size: the image tool's own output size does not matter (it often gives 1254 x 1254 or another size). Paint the pieces at whatever size
  it gives, then with Pillow cut each piece out, scale it so it fills its cell like the Orc sheet's matching piece, and pack the pieces
  into a new transparent canvas of exactly the size below, each in its own cell near its foot point. That is expected, not a failure:
  placement and scale only need to be close, because the game's cutter re-anchors every piece. Never stop because of the size.
- Pull request into main titled "Assault art: the Barrow Necropolis". If it is already open, push to it and add this sheet to the
  list in its body; otherwise open it. In the body, list the file and what is in each numbered cell.
- No text, letters, numbers, logos, frames, grid lines, watermarks or signatures. Original work only.
- Fully transparent background (RGBA PNG).

Open these files first and match them:
- art-source/assault/undead/und-05-ground.png on this branch, if it is there: the ground these lie on (match its pixel density, 64 px a
  tile at quarter size). Otherwise src/art/areas/graveyard/top1.png.
- docs/samples/assault-art/template-textures-1024.png: the grid (a guide only; draw none of its lines).
If docs/samples/assault-art/ is missing a file on main: git fetch origin claude/assault-2 claude/assault-art-plan, then
git show origin/claude/assault-2:docs/samples/assault-art/undead-kit.jpg > /tmp/undead-kit.jpg, and
git show origin/claude/assault-art-plan:docs/samples/assault-art/<template> > /tmp/<template> for the templates.

THE VIEW IS STRAIGHT DOWN, NOT ISOMETRIC, as on a map: everything lies flat on the ground, nothing stands up. Style: painted pixel
art matching the Liches kit's ground; dark, gritty, readable; ectoplasm is a pale teal, blood a dark red-brown, never bright or gory.

The sheet: 1024 x 1024 px, a 4 x 4 grid of 256 x 256 squares, read left to right, top to bottom. Each square holds ONE decal covering
up to 2 x 2 tiles, centred, with at least 16 px of transparency round it.

1. Ectoplasm splash (pale teal, glossy).   2. Ectoplasm trail (a dragged streak).   3. Ectoplasm pool, small.
4. Scorch mark, round (a blast).   5. Witch-fire scorch: a burnt patch with a teal tint and ash.
6. Stone rubble scatter (chips and broken crypt blocks lying flat).   7. Bone scatter (ribs, a jaw, small bones lying flat).
8. Cart ruts: two parallel wheel ruts running straight from the square's top edge to its bottom edge (so they join end to end).
9. Bare footprints of the dead: a trail of skeletal foot prints crossing the square.   10. Drag marks: two furrows where a body was
    dragged.
11. A puddle of still grey water.   12. Spilled quicklime: a pale powdery patch.
13. Ash and grave candle wax, with a few teal embers.   14. Dead leaves blown flat.
15. Freshly turned grave earth (a long low mound shape, flat).   16. Cracked flagstones (cracks and a few broken corners, to lay over
    a stone floor).
```
