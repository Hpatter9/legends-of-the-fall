# The Assault's maps: the art plan

The owner's ask: *"I want to make sure the maps for the assault are varied and interesting, like our battle maps in the army runs but
much more expansive. Let's get prompts to ChatGPT as needed for artwork for the assets."*

This note plans the art for the Assault's 100 x 100 holds. It covers Bloodtusk Hold, the Orc Warband's hold, in full, and the other
eight armies' holds in short. It changes no game code. The paste-ready ChatGPT prompts for the Orc hold are in
[assault-art-prompts-orc.md](assault-art-prompts-orc.md).

What I read first:

- the design, `docs/design/assault-mode.md` (branch `claude/assault-design`): sections 2.3, 2.4 and 9;
- [assault-0.md](assault-0.md) and its render fix;
- phase 1 on `claude/assault-1`, read only: `src/sim/assault/maps/orcs.ts` (the blueprint), `src/render/fieldView.ts`, `fieldCull.ts`,
  and the "Art still needed" list in `docs/notes/assault-1.md`;
- the army boards: `board.ts`, `layouts.ts`, `lands.ts`, `boardView.ts`, `roadArt.ts`, `areaArt.ts` (`AREA_URLS`) and `terrainArt.ts`
  (`TERRAIN_URLS`);
- the camp overlook's enemy camps (`SCOUT_CAMPS` in `src/render/overlookLayout.ts`, painted in `src/art/camp/camp-war.png`,
  `camp-wild.png` and `camp-arcane.png`);
- the packs:
  - `hpatter9/chronos-assets` (the Craftpix and other packs);
  - Chronos Settlement's isometric kits (`hpatter9/little-town`, `src/renderer/art/iso/kits/`). The army road's and the Calamity's
    atlases were already cut from these kits, so they count as pack art here and are credited the same way.

**The headline.** Chronos's **Orcs kit** already holds about 35 of the Orc hold's pieces, drawn at the boards' own angle in the very
style we want. It has:

- the spiked palisade, its corner and the skull gate;
- the siege tower, the war drum and the longhouse;
- the huts, the forge, the wolf pen and the skull totem;
- the bonfire, the stake fence, the burnt and gnarled trees and the dark rocks.

So ChatGPT is asked only for what the kit lacks, which is mostly:

- the hold's **states** (battered, broken, the breach);
- the **stone fortress** (its faces, crenellations, the Iron Gate, the corner towers and the keep);
- the **ground** (textures, transitions and decals);
- a handful of camp pieces (tents, totems, cages, banners).

A contact sheet of the kit pieces used is in [`docs/samples/assault-art/orc-kit.jpg`](../samples/assault-art/orc-kit.jpg).

---

## 1. Variety: what makes a hold varied and alive

A 100 x 100 map is 44 of today's boards laid side by side. Two land skins on 10,000 flat tiles would read as a green carpet, which is
what the bench shows now (`docs/samples/assault-art/field-today-393.png`). The army boards look rich because every square holds
something: a height step, a ground change, a wall, a tree. The hold needs that richness at a larger scale, in layers.

### 1.1 What the field renderer does today (phase 1)

`src/render/fieldView.ts` bakes the field in **chunks of 10 x 10 tiles** at half resolution, on the board's projection (`iso.ts`):

- **The tile.** A tile's top is a diamond `TW` 64 x `TH` 32 px, and each height step lifts it `HH` 12 px. That is true 2:1 dimetric.
  - +u runs down to the right on the screen, +v down to the left.
  - The south corner, (99, 99), is at the bottom of the screen.
- **The tops** are **square, top-down textures** (64 x 64), laid onto each diamond by an affine transform. They are not drawn at the iso
  angle. A tile's land is chosen by its zone: the highlands outside the palisade, the war camp inside it.
  - Each land has two grass tops and a stony `high` top, used for paved tiles and for tiles at height 7 and over.
  - Water and deep water are a tint over the water top. A bridge is the `planks` top.
- **The sides** are **front-on strips** (80 x 20), drawn once a height step and sheared along the tile's edge. Each step gets the same
  strip, so a cliff of six steps shows six identical bands. The right face is shaded 0.32 and the left face 0.12, so the light comes
  from the left.
- **Tall grass** is drawn as five tufts a tile.
- **The tall things** are sprites sorted with the fighters by `(u + v)`. They are:
  - boulders (the land's own);
  - bushes;
  - the ruined-wall sprites (`TERRAIN_URLS.walls`), which stand in for the palisade and every solid tile;
  - the camp's `gate.png` for every gate;
  - the arenas' set pieces (`roadArt.ts` `setPiece`: the drum, tent, flag, campfire, skulls and brazier).
- **Far** is one 1,024 px overview, the tops shaded by height. **Mid** draws the same as Near, a little smaller.
- **A breach** drops its chunk so the chunk is baked again. There are no broken pictures yet: the gate's sprite is simply removed.

What it **cannot do yet**:

- ground transitions: every tile edge is a hard seam;
- a decal layer;
- roads (a road is just the stony top);
- more than two grounds a hold;
- tall cliff faces without banding;
- structure states;
- landmarks bigger than a set piece;
- clutter rules;
- shadows at the foot of walls;
- lights at night;
- moving water.

### 1.2 The layers, and who supplies each

| Layer | What it does for variety | Renderer today | New art | New code (the builder's, not this note's) |
| --- | --- | --- | --- | --- |
| **Biome zones** | Each zone wears its own ground set, not just highland or camp: heath, meadow, churned mud, scorched earth, cobbled road, flagstone yard, the keep's dark stone | two lands, by zone | the ground textures (ORC-05) | a looks-only **ground material** for each tile (from the zone, plus blueprint rects and seeded patches), replacing the two-land rule |
| **Large-scale texture** | No visible 64 px repeat across 10,000 tiles | one 64 px texture a tile | 256 px seamless squares, each covering **4 x 4 tiles** | sample the quarter given by `u % 4`, `v % 4` |
| **Transitions** | Mud bleeds into grass, the road's edge crumbles, the shingle meets the water | none | one **edge** and one **outer corner** overlay for each material (ORC-06) | a fringe pass in `bakeChunk`: for each neighbour of a higher-ranked material, draw its edge overlay turned to face it, and its corner overlay for a diagonal. The overlays are top-down squares, so turning them is free. |
| **Elevation bands and cliffs** | Land rises in bands: the river flats, the rolling fields at 0–4, the bank at +2, the wall at +6, the towers at +8 to +10, the mound's terraces at +3, +5 and +7. Each band's faces read differently. | height, with one side strip a land | **face sets** with a lip, a body that repeats, and a foot (ORC-04) | pick the face material by zone and height; draw the lip on a column's top step, the body on its middle steps and the foot on its lowest. A soft dark band (a tint) at the foot of any face 3 or more steps tall. |
| **Rivers, fords and bridges** | The Redwater is the first decision of the assault. Fords must read as crossable and deep water as not. | water and deep tints; planks top | shallows and river textures; bridge, pier and ford pieces (ORC-05, ORC-12) | scroll the water tops' texture slowly (code); a shingle fringe where water meets land |
| **Roads and paths** | The road tells the player where the fight goes. Trodden paths link the posts. | `paved` uses the stony top | cobbled road and dirt path, with fringes | paths from the blueprint's `approaches` and post loops, drawn as dirt-path material |
| **Ground decals** | Mud splashes, blood where the posts fought, scorch round fires, rubble under the walls, cart ruts and wolf tracks | none | 16 decals (ORC-13) | a decal pass after the fringes: the blueprint's placed decals, plus seeded scatter by zone. At run time, blood and scorch are added only where a structure breaks (the chunk is re-baked then anyway), never every blow. |
| **Clutter** | Small life on every few tiles | tall-grass tufts; boulders and bushes where the sim put them | mostly packs (wild flair, kit props) | the density rules in 1.3 |
| **Landmarks** | Something to look at every 15 to 20 tiles | set pieces only | the kit's buildings, plus the new keep, tents and totems | the landmark table in 1.4, placed as blueprint pieces |
| **Army identity** | It must look like the Orcs' home, everywhere | the camp gate and arena pieces | banners, totems, trophies, cages (ORC-09, ORC-10) | the identity rules in 1.5 |
| **Life** | Smoke, flicker, flags, birds, the drums' beat | `sway` and `light` exist on the boards, not yet on the field | none (the fx pack's smoke, the road's birds) | add the boards' light glow and sway to field props at Near |

**One rule matters for play: looks never hide or fake the rules.**

- Anything taller than about half a tile that stands on a walkable tile must be **solid in the blueprint**. Otherwise a fighter
  vanishes behind a tent he can walk through.
- Looks-only clutter stays low: flowers, pebbles, bones, decals, tufts.
- A fence that does not block is drawn low (the kit's stake fence at 0.4).
- Hazards keep their own warning marks, which are code.

### 1.3 Clutter density

The scatter is seeded from the hold's own stream (`mixSeed(seed, ASSAULT_SALT)`, as the flesh already is). It is looks-only and never
changes a tile the sim reads.

| Zone | Looks-only clutter (share of free tiles) | Sets | Solid props (in the blueprint) |
| --- | --- | --- | --- |
| The Landing | 6% | flowers, ferns, pebbles; our camp's crates and barrels near the tents | the tents, the rally flag |
| River banks (2 tiles from water) | 25% | reeds, wet pebbles, a sunken log | boulders at the bends |
| Killing Fields, meadow | 10% | flowers, tall-grass tufts, a bone or two | boulder clumps of 2 to 4, a tree every 40 tiles or so |
| Killing Fields, near posts | 15% | bones, broken spears, scorch, blood decals | stake fences, the kit's spear signposts |
| Burnt village | 30% | rubble, ash, charred beams, scorch | the ruined walls and burnt shells |
| Lumber camp | 25% | stumps, chips, a fallen log | log piles |
| The ditch floor | 0% | (stakes are the hazard's own art) | |
| Outer bailey lanes | 12% | mud splashes, barrels, meat piles, shields, cart ruts | tents, huts, longhouses, pens, the forge |
| Inner bailey | 8% | bones, braziers' soot, flagstone cracks | the wall stairs |
| Throne Mound | 4% | skulls, soot | braziers, the throne, the banner |
| The Warpath | 18% | bones, hides, ash, cage debris | the reserve tents, cages, the great Bonefire |

**The rules:**

- Never on a road, a stair, a gate's two approach tiles, a post's own tile, the rally flag's 3 x 3 or a muster box.
- No two looks-only pieces on neighbouring tiles. They would read as a pattern.
- Decals may overlap each other, but not more than two on one tile.

### 1.4 Landmarks every 15 to 20 tiles

Cut the map into 17 x 17 windows (6 x 6 of them). Each window holds at least one thing worth looking at. Most of them are already
posts in the blueprint (`maps/orcs.ts`), so they come for free. The four marked **new** fill the empty windows on the flanks and the
rear. They are looks-only, and they are suggestions for the blueprint's author.

| Landmark | Where (u, v) | Art |
| --- | --- | --- |
| Our camp: blue tents, campfires, the rally flag | (93, 93) | the conical tent (ORC-10), tinted blue in code; the kit bonfire |
| The Old Bridge and its barricade fort | (78, 74) | bridge pieces (ORC-12); barricade (ORC-01); the kit barrels |
| The West Ford's reeds | (57, 93) | the kit reeds; ford stones (ORC-12) |
| The East Ford and its pool | (97, 63) | ford stones; shallows |
| The burnt village | (48 to 58, 82 to 92) | burnt shells (ORC-11); the kit ruins and rubble |
| The shrine on its knoll | (66, 86) | the `shrine` ground; the kit skull totem |
| The West Watchtower on its crag | (22, 92) | the crag cliff face (ORC-04); the watchtower top (ORC-02) |
| The East Watchtower | (92, 22) | as above |
| The lumber camp | (15, 72) | the kit woodpile, stumps and fallen logs |
| The three war drums | (24, 86), (86, 24), (80, 61) | the kit war drum; struck and silenced (ORC-09) |
| The wolf pens | (86, 30) | the kit warg pen |
| The stake field | (78, 64) | stake line (ORC-01) |
| The South Gate and its two towers | (72, 58) | the gatehouse (ORC-02) |
| The sally ports and the North Gate | (41, 72), (72, 41), (26, 40) | the sally port (ORC-01); the North Gate (ORC-02) |
| The longhouses | (64, 31), (67, 35), (31, 64) | the kit longhouse |
| The forge | (64, 53) | the kit workshop and forge fire |
| The Bonefire and the training pit | (34, 50) | the Bonefire (ORC-09); training dummies (ORC-10) |
| The beast pens | (52, 33) | the kit warg pen and pig pen |
| The stone wall's four corner towers | (39, 39), (60, 39), (39, 60), (60, 60) | the corner tower top (ORC-03) |
| The Iron Gate | (60, 49) | (ORC-03) |
| The keep and the Throne Mound | (50, 50) | the keep's hall, the skull throne and the great banner (ORC-07) |
| The Warpath's reserve camp, the great Bonefire and the cages | (12, 12) | tents, cages, the Bonefire (ORC-09, ORC-10) |
| **New:** Gallows Hill, the trophy poles on a knoll | (12, 45) | trophy rack and skull poles (ORC-10); the kit spear signposts |
| **New:** the burial cairns and standing stones | (45, 12) | the kit dark rocks; the moonpack howling stone |
| **New:** the raiders' camp outside the palisade | (88, 45) | war tents and a bonfire (ORC-09, ORC-10) |
| **New:** the siege park: two catapults, a bolt thrower and a war cart | (55, 66), in the outer bailey's south | catapult and bolt thrower (ORC-11, ORC-10); the kit war cart |

At **Far**, the overview should also bake a tiny icon for each landmark: the kit sprite at a sixteenth of its size. The player then
reads the map as places, not a texture.

### 1.5 The army's identity everywhere

- **Banners** on every post's tile (the small war banner, ORC-10). The great banner stands on the mound. Hanging banners go on the stone
  wall's face, one in every 8 wall tiles (ORC-08).
- **Totems** where zones meet: the river's far bank, the palisade's causeways, and the inner bailey's corners (the kit skull totem and
  two new ones).
- **Trophies** along the road from the bridge to the South Gate: a skull pole every 10 tiles (the kit spear signpost). Gallows Hill and
  the trophy rack are the big ones.
- **Camps**: every post outside the walls gets a fire and one or two tents, so the garrison looks like it lives there and does not just
  stand there.
- **Siege works**: the siege park, the stake field, the ditch's stakes, and the barricade fort at the bridge.
- **Colour.** The Orcs' red and black, with bone white:
  - every piece of cloth on the map is the hold's red;
  - our own camp is the only blue;
  - after the conquest, the overlook's painting swaps to our banner (code, as in phase 1).

---

## 2. The Orc kit: Bloodtusk Hold

### 2.1 The formats the renderer wants

There are two kinds of art. They must never be confused, because the renderer handles them differently.

**A. Flat textures** (ground tops, transitions, decals, cliff and wall faces). They are drawn **straight on, not at the iso angle**:
the renderer warps them itself.

- **Ground tops, transitions and decals** are seen from straight above, as on a map.
  - **Ground textures**: 256 x 256 px squares. Each covers 4 x 4 tiles (64 px a tile, the same density as today's tops). It must
    tile seamlessly with itself on all four sides.
  - **Transitions**: 256 x 256 px. Each covers one tile, at 4x for clean downsizing. The material fills the square's top edge and
    breaks up into transparency towards the middle.
  - **Decals**: 256 x 256 px. Each covers 2 x 2 tiles. Transparent background.
- **Faces** are seen square-on from the front, as a wall elevation.
  - One column is 256 px wide, the length of one tile's edge, and must tile left to right.
  - A height step is 80 px.
  - Each set has a **lip** (one step: the top edge, with grass or the parapet overhanging), a **body** (four steps, 320 px, which tiles
    up, down and sideways) and a **foot** (one step: where it meets the ground, with dirt, roots or rubble).

**B. Standing sprites** (structures and props). They are drawn **at the game's 2:1 isometric angle**, at **2x the game's scale**:

- **One tile's footprint is a diamond 128 px wide and 64 px tall.** A footprint of N tiles along u and M along v is a diamond
  (N + M) x 64 px wide and (N + M) x 32 px tall.
- **One height step is 24 px.** The palisade stands about 4 steps (96 px). The stone wall is 6 steps (144 px) from the bailey to the
  wall-walk.
- The tile's corners point up, right, down and left. Vertical edges stay vertical.
- The light comes from the upper left: faces turned to the lower left are lit, and faces turned to the lower right are in shade, as the
  renderer shades the columns.
- Each sprite stands on a stated **foot point**, the centre of its footprint, at a fixed place in its cell. The cutter anchors it
  there.
- Pieces that run along u (down to the right, `\`) are mirrored by code to run along v (`/`), as `roadArt.ts` mirrors the ring walls.
  So only the u version is drawn.
- **Outer and inner faces.** The palisade and the stone wall are square rings in (u, v), so on screen they are diamonds:
  - the ring's two front sides (south-west and south-east) show the viewer their **outer** faces;
  - its two back sides show their **inner** faces.

  So the runs and corners come in both looks. The North Gate and the postern sit on the back sides, so they are drawn from inside.

That scale matches the Chronos kits: a kit tile is about 108 px wide, which the road's prep halves to about 54. The 2x art is halved by
the cutter to the field's 64 px tile and keeps its detail when the camera zooms in.

**The canvases.** ChatGPT's image tool paints 1024 x 1024 or 1536 x 1024. Every sheet uses one of those, on a fixed grid, with a
template in `docs/samples/assault-art/`:

| Template | Canvas | Cells | Foot point in a cell |
| --- | --- | --- | --- |
| `template-props-1024.png` | 1024 x 1024 | 4 x 4 of 256 x 256, one-tile footprint | (128, 208) |
| `template-buildings-1536.png` | 1536 x 1024 | 3 x 2 of 512 x 512, footprints up to 3 x 3 | (256, 416) |
| `template-keep-1536.png` | 1536 x 1024 | one 1,024 x 1,024 (a 6 x 4 footprint) and two 512 x 512 | (512, 840); (256, 440) |
| `template-textures-1024.png` | 1024 x 1024 | 4 x 4 of 256 x 256, flat | n/a |
| `template-faces-1536.png` | 1536 x 1024 | 6 x 2 columns of 256 x 512: lip 0–80, body 80–400, foot 400–480 | n/a |

**After the paintings.** The builder writes a cutter, `tools/assault/cut-sheets.py`, modelled on `tools/army-road/prep.py`. It:

- cuts each cell by the grid;
- trims the cell;
- records the foot point;
- halves the 2x sprites with the same 2 x 2 box average;
- packs one atlas a hold, `src/art/assault/orc/atlas.webp`, with its rects in a `.ts` file, and the textures and faces as their own
  small PNGs.

Two more rules:

- **Offline**: anything loaded by URL is added to `FILES` in `build.mjs`; small PNGs can be bundled as data URLs, as the land's tops are.
- **Credits**: kit pieces copied in are credited in `CREDITS.md` like the road atlas, and the ChatGPT sheets as the game's own art.

ChatGPT rarely makes a texture truly seamless, so the cutter should also:

- **fix the seams**: offset each texture by half, then blend a 16 px band across the seam;
- **key out any near-white background** left on a sprite.

### 2.2 The asset list

Sources:

- **Pack**: a Chronos kit piece. The paths below are under `hpatter9/little-town/src/renderer/art/iso/kits/`.
- **In repo**: art already in this repository.
- **ChatGPT**: the sheet and cell it is painted on.
- **Code**: tints, outlines and markers only.

#### Terrain tops (flat, 256 px, 4 x 4 tiles a square)

| Item | Source |
| --- | --- |
| Highland grass, two variants | **In repo** for phase 1 (`src/art/ground/grass1.png`, `grass2.png`). **ChatGPT** ORC-05 #1–2 for the 256 px version |
| Heath (heather and dry grass, for the crags and the Warpath) | ChatGPT ORC-05 #3 |
| Trampled grass (round the posts and camps) | ChatGPT ORC-05 #4 |
| Mud, two variants | ChatGPT ORC-05 #5–6. The kit's `orcs/mud_tile` is one iso diamond with an edge, not seamless, so it is only a colour reference. |
| Churned wet mud with puddles (the bailey lanes, the ditch) | ChatGPT ORC-05 #7 |
| Scorched earth | ChatGPT ORC-05 #8 (the kit's `orcs/scorched_tile` is the colour reference) |
| Ash and cinders (the burnt village, round the Bonefires) | ChatGPT ORC-05 #9 |
| Packed camp dirt with straw | ChatGPT ORC-05 #10 |
| Cobbled road | ChatGPT ORC-05 #11. (The Craftpix *path and road* tileset in `chronos-assets` has cobbles, but they are flat vector-like tiles in another style. Not used.) |
| Flagstones (the inner bailey and the Throne Mound's yard) | ChatGPT ORC-05 #12 |
| Wall-walk and tower-top stone | ChatGPT ORC-05 #13 |
| Timber walkway, planks seen from above (bridges, platforms, the barricade) | ChatGPT ORC-05 #14. **In repo** `src/art/terrain/planks.png` (22 px) until then. |
| River shingle (the banks, the ford floors under water) | ChatGPT ORC-05 #15 |
| Shallow water over pebbles (the fords) | ChatGPT ORC-05 #16. **In repo** for phase 1: the water top with the shallow tint. |
| Deep river water | **In repo** (`src/art/areas/common/water.png`, with the deep tint). The slow flow is **code** (scroll the texture). |
| Coals (the forge yard) | **In repo**: the `coals` ground, as the boards draw it |
| The shrine ground | **In repo**: the boards' `shrine` ground |

#### Transitions (flat, 256 px, one tile; an edge and an outer corner each, which code turns)

| Item | Source |
| --- | --- |
| Mud over grass: edge, corner | ChatGPT ORC-06 #1–2 |
| Scorch over any ground: edge, corner | ChatGPT ORC-06 #3–4 |
| Cobbled road's edge (cobbles breaking up into dirt): edge, corner | ChatGPT ORC-06 #5–6 |
| Dirt path over grass: edge, corner | ChatGPT ORC-06 #7–8 |
| Shingle over grass (the river bank): edge, corner | ChatGPT ORC-06 #9–10 |
| Flagstone's edge (broken flags into mud): edge, corner | ChatGPT ORC-06 #11–12 |
| Grass creeping over mud (the reverse, so the mud's islands are not perfect shapes): edge, corner | ChatGPT ORC-06 #13–14 |
| Water's edge (a foam line and wet stones, laid on the water tile): edge, corner | ChatGPT ORC-06 #15–16 |

#### Cliff and wall faces (flat, front-on: a lip, a body of 4 steps, a foot)

| Item | Source |
| --- | --- |
| Highland rock cliff (the crags under the watchtowers) | ChatGPT ORC-04 #1 |
| Highland earth bank, grass lip (the rolling land's steps) | ChatGPT ORC-04 #2. **In repo** `src/art/ground/rock.png` until then. |
| Mud bank (the ditch's sides) | ChatGPT ORC-04 #3 |
| Earth rampart revetted with timber (the bank at +2 behind the ditch) | ChatGPT ORC-04 #4 |
| Palisade timber skin, vertical sharpened logs (the solid palisade tiles' sides) | ChatGPT ORC-04 #5 |
| Stone curtain wall, big dark blocks with a crenellated lip | ChatGPT ORC-04 #6 |
| Stone curtain wall, battle-damaged (scorch, cracks, missing blocks) | ChatGPT ORC-04 #7. Phase 2's breaches use it too. |
| Corner tower masonry (rounder, with arrow slits) | ChatGPT ORC-04 #8 |
| Mound terrace retaining wall (stone and bone, skulls set in the mortar) | ChatGPT ORC-04 #9 |
| Mound earth with stakes (the mound's raw faces) | ChatGPT ORC-04 #10 |
| River bank, wet stone with a waterline | ChatGPT ORC-04 #11 |
| Dark basalt (the Warpath's crags) | ChatGPT ORC-04 #12 |
| A darker band at the foot of tall faces; height shading | **Code** (a tint) |

#### The palisade and its gates

| Item | Source |
| --- | --- |
| Palisade, straight run, whole | **Pack** `orcs/spiked_wall_run` (in the road atlas as `spikedWall`). It is also repainted on ORC-01 #1 so the battered and broken states match it exactly; keep whichever tiles better along the ring. |
| Palisade run, battered (arrows, split tips, a shield gone) | ChatGPT ORC-01 #2 |
| Palisade run, broken (snapped stumps; still blocks until breached) | ChatGPT ORC-01 #3 |
| The breach: a ramp of logs and earth into the ditch (passable) | ChatGPT ORC-01 #4 |
| Palisade run, inner face (braces, the fighting step): the back walls, seen from inside the ring | ChatGPT ORC-01 #5 |
| Palisade corners: south (front) and north (back) | **Pack** `orcs/spiked_wall_corner` for one view. ChatGPT ORC-01 #6–7 for both, matched. |
| Palisade corner, east (mirrored by code for the west) | ChatGPT ORC-01 #8 |
| Gate post: a thick post with a horned skull, where a run meets a gate | ChatGPT ORC-01 #9 |
| Sally port (one tile wide): whole, battered, broken open | ChatGPT ORC-01 #10–12 |
| The bridge fort's barricade (low logs and shields): whole, broken | ChatGPT ORC-01 #13–14 |
| Ditch stakes (low, angled outward) | ChatGPT ORC-01 #15 |
| Stake line, across a road (the stake field) | ChatGPT ORC-01 #16. The kit's `orcs/stake_fence` is a lower fence, used for pens and lines that do not block. |
| The South Gate, 2 x 2 (gatehouse with horned skulls and red banners): whole | **Pack** `orcs/skull_gate` (the arenas' `warGate`). Repainted on ORC-02 #1 to match its states. |
| The South Gate, battered and broken | ChatGPT ORC-02 #2–3 |
| The North Gate (plainer, 2 x 2): whole and broken | ChatGPT ORC-02 #4–5 |
| Gate tower top (a 2 x 2 perch on the bank: platform, hide roof, braziers) | ChatGPT ORC-02 #6 |

#### The stone wall, the keep and the throne mound

| Item | Source |
| --- | --- |
| The wall itself (6 steps of terrain) | the faces above (ORC-04 #6–7), the wall-walk top (ORC-05 #13) |
| Crenellations along the wall-walk's outer edge: straight, outer corner, inner corner, broken | ChatGPT ORC-08 #1–4 |
| Arrow-slit parapet; timber hoarding along the wall top | ChatGPT ORC-08 #5–6 |
| Hanging war banner on the wall's face; skulls and chains on the face | ChatGPT ORC-08 #7–8 |
| Wall-walk brazier; boiling-oil cauldron | ChatGPT ORC-08 #10–11 |
| Iron spikes along the wall top | ChatGPT ORC-08 #12 |
| The Iron Gate, 2 x 2, with its portcullis: whole, battered, broken | ChatGPT ORC-03 #1–3 |
| The north postern (one tile wide): whole, broken | ChatGPT ORC-03 #4–5 |
| Corner tower top (3 x 3 perch: crenellated, a brazier, a red banner) | ChatGPT ORC-03 #6 |
| The keep's hall (6 x 4: timber and black stone, bone and tusk decoration) | ChatGPT ORC-07 #1. Phase 1 uses the `fortress` landmark. |
| The skull throne | ChatGPT ORC-07 #2. Phase 1 uses the `skulls` piece. |
| The hold's great war banner on its pole (also the camp's trophy) | ChatGPT ORC-07 #3 |
| The mound's terraces | the faces (ORC-04 #9–10), the flagstone top, the stairs (ORC-08 #9, #14) |
| The mound's braziers | **Pack** `dwarves/brazier`, or the road atlas's `brazierRed` |
| Stairs, one tile each, as standing sprites: rising away from the viewer, and rising towards the viewer (code mirrors both for v) | ChatGPT ORC-08 #9, #14 |
| Mound stair banisters (bone posts with torches) | ChatGPT ORC-08 #13 |
| Fallen stones on the wall-walk; the portcullis winch | ChatGPT ORC-08 #15–16 |

#### The war camp

| Item | Source |
| --- | --- |
| Longhouse, the barracks (3 x 2) | **Pack** `orcs/longhouse` |
| Bone hut | **Pack** `orcs/cottage` |
| Round hide hut | **Pack** `orcs/tavern` |
| Forge | **Pack** `orcs/workshop`, and `dwarves/forge_fire` for the open hearth |
| Wolf pens | **Pack** `orcs/warg_pen` |
| Beast pen (pigs, boars) | **Pack** `orcs/pig_pen_tile` |
| Freestanding watchtower (lumber camp, raiders' camp) | **Pack** `orcs/siege_tower`; `moonpack/lookout_tower` as a second |
| War drum, whole | **Pack** `orcs/war_drum` (the arenas' `drum`) |
| War drum, struck (the beat frame) and silenced (skin slashed, frame toppled) | ChatGPT ORC-09 #5–6. The beat alternates whole and struck, with a small squash (**code**). |
| Skull totem | **Pack** `orcs/shrine` |
| Boar-tusk totem; wolf-skull totem pole | ChatGPT ORC-10 #3–4 |
| Skull torch | **Pack** `orcs/skull_torch` (lit by code) |
| Trophy pole (skulls on a spear) | **Pack** `orcs/spear_signpost` |
| Small war banner on a spear (one a post) | ChatGPT ORC-10 #5 |
| Banner pole with three trophy pennants | ChatGPT ORC-10 #6 |
| Bonfire | **Pack** `orcs/bonfire` |
| The Bonefire (a great fire in a ring of skulls, 2 x 2) | ChatGPT ORC-09 #4 |
| War tent, red ridge tent (2 x 1) | ChatGPT ORC-09 #1 |
| Great hide yurt (2 x 2) | ChatGPT ORC-09 #2 |
| The chieftain's pavilion (3 x 3, a horned skull over the door) | ChatGPT ORC-09 #3 |
| Conical red tent (1 x 1); our camp's tents are the same, tinted blue by **code** | ChatGPT ORC-10 #1 |
| Hide lean-to | ChatGPT ORC-10 #2 |
| Hanging cage (a gibbet); wooden prisoner cage | ChatGPT ORC-10 #7–8 |
| Training dummy | ChatGPT ORC-10 #9 |
| Trophy rack (the shields and helms of beaten foes) | ChatGPT ORC-10 #10 |
| Anvil and quench barrel; small firepit | ChatGPT ORC-10 #11–12 |
| Weapon rack and stall | **Pack** `orcs/weapon_stall` |
| Skull pile | **Pack** `liches/skull_pile`; the road atlas's `b5_1` |
| Stack of shields and spears; hides on a drying frame | ChatGPT ORC-10 #13–14 |
| Alarm horn on a post (the great horn) | ChatGPT ORC-10 #15 |
| Bolt thrower (1 x 1) | ChatGPT ORC-10 #16 |
| Catapult (2 x 2) | ChatGPT ORC-11 #1 |
| War cart | **Pack** `orcs/war_cart` |
| Meat rack; meat pile | **Pack** `orcs/granary`, `moonpack/meat_racks`; `orcs/meat_pile` |
| Barrels, chests, stockpile, woodpile, well | **Pack** `orcs/barrels`, `loot_chests`, `stockpile`, `woodpile`, `well` |
| Hide bundles | **Pack** `moonpack/hide_bundles` |
| Burnt cottage shell (2 x 2), standing walls; collapsed into beams | ChatGPT ORC-11 #2–3 |
| Phase 2's siege engines for our side, still poses: the ladder, the ram, the trebuchet (their animation frames come later) | ChatGPT ORC-11 #4–6 |
| Ruined walls (the burnt village) | **Pack** `wild/ruin_1`, `ruin_2`; **in repo** `src/art/terrain/wall1–3.png` |
| Rubble | **Pack** `dwarves/rubble` |

#### Bridges, fords and the river

| Item | Source |
| --- | --- |
| The Old Bridge as a single piece | **Pack** `orcs/log_bridge` (about three tiles). Use it if the span fits; otherwise the modular pieces. |
| Bridge deck, modular, along u: deck with rails; the end where it meets the bank; a pier in the water; a broken span | ChatGPT ORC-12 #1–4 |
| Rope-and-plank footbridge (a flank's narrow crossing, if the blueprint adds one) | **Pack** `moonpack/rope_bridge` |
| Ford stepping stones; wet boulders at the bank; a sunken log; a mooring post | ChatGPT ORC-12 #5–8 |
| Waterfall lip rocks (the Redwater's Fall) | ChatGPT ORC-12 #9. The falling water is **in repo** (painted in `roadArt.ts`). |
| Reeds | **Pack** `wild/reeds_1`, `reeds_2` (the road atlas's `reeds1`, `reeds2`) |
| River debris: a broken shield, drifted arrows, a snagged banner | ChatGPT ORC-12 #10–12 |
| The bridge's barricaded end; a broken rail; an orc raft; a fish weir | ChatGPT ORC-12 #13–16 |

#### Trees and rocks

All are pack art. The kit has what the land needs.

| Item | Source |
| --- | --- |
| Highland pines | **Pack** `knights/pine_tree`, `moonpack/pine_tree`, `moonpack/small_pine` |
| Dead and burnt trees (near the camp, round the burnt village) | **Pack** `orcs/burnt_tree`, `orcs/gnarled_tree`, `moonpack/bare_tree` |
| Thorn bushes | **Pack** `orcs/thorn_bush` |
| Shrubs, ferns, stumps, fallen logs | **Pack** `wild/shrub_1–3`, `wild/fern`, `wild/stump_1–3`, `moonpack/fallen_log` |
| Highland boulders | **In repo** `src/art/ground/boulder1–2.png`, `src/art/areas/warcamp/boulder1–3.png`; **pack** `moonpack/boulders`, `rocks_a–c` |
| Dark rocks (the Warpath, the crags) | **Pack** `orcs/dark_rocks`, `dark_rocks_b` |
| Standing stone (the burial cairns) | **Pack** `moonpack/howling_stone` |

#### Decals (flat, top-down, 256 px, 2 x 2 tiles, transparent)

| Item | Source |
| --- | --- |
| Blood: a spatter, a smear, a pool | ChatGPT ORC-13 #1–3 |
| Scorch marks, two | ChatGPT ORC-13 #4–5 |
| Stone rubble scatter; timber debris scatter | ChatGPT ORC-13 #6–7 |
| Cart ruts (straight; code turns them) | ChatGPT ORC-13 #8 |
| Boot tracks in mud; wolf tracks | ChatGPT ORC-13 #9–10 |
| Puddle; mud splash | ChatGPT ORC-13 #11–12 |
| Ash and embers; scattered bones (flat) | ChatGPT ORC-13 #13–14 |
| Straw and hay; cracked flagstones | ChatGPT ORC-13 #15–16 |
| Bones (standing, small) | **Pack** `wild/bones_1–3`, `wild/skeleton` |
| Floor cracks | **Pack**: the Craftpix *2D top-down pixel dungeon* `decorative_cracks_floor.png` in `chronos-assets`, if its style fits on test. Otherwise ORC-13 #16. |

#### Code only

- the team rings and the chosen platoon's ring;
- our camp's blue tint on the conical tent;
- the conquered dressing on the overlook;
- the hazard warnings;
- the height shading and the band at the foot of faces;
- the lights' glow and flicker;
- the water's scroll;
- the drum's squash;
- the breach's shake and dust (the fx pack);
- the minimap's markers;
- the Far landmark icons (the sprites, shrunk).

### 2.3 The count

**13 sheets, 13 images**, 151 cells. Allowing two or three tries a sheet, that is 30 to 40 images: well inside one day's budget of
about 100. Pack art covers about 45 pieces (the kit's 35, and about 10 from the wild, moonpack, dwarves and liches kits), plus the
pieces already in this repository.

---

## 3. The other eight holds: their kits in short

Each hold needs about 12 to 16 images (the design's estimate), on the same sheet types. These are listed, not yet prompted. **Every
name below is a working name**, for the owner to change.

| Army | Its lands | The overlook's camp | The hold (working name) | Signature structures | Landmarks | The drums' equivalent | Packs that cover it | ChatGPT will mostly paint |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Undead Legion** | graveyard, dungeon | Necropolis graveyard | **The Barrow Necropolis** | bone walls and an iron-railed graveyard ring; mausoleum rows; an ossuary keep | the barrow mounds, a black chapel, the plague pits, a drowned lych-gate on a still grey lake, the Lich's spire | **bone bells** in open belfries | **Liches kit**: bone wall run and corner, gatehouse, mausoleum, iron fence, coffin stacks, bone pit, skull pile, witch fire, lantern posts, dead oaks and pines, the grave-plot, cracked-earth and dead-grass tiles. **Blood Court kit**: crypt, gravestones. | the ossuary keep; bone-bell belfries; the gate states; grave mud and bone-dust ground; crypt-stone faces; spectral decals (ectoplasm, grave dirt) |
| **Beast Packs** | plains, autumn | Frozen hunting grounds | **The Howling Den**: an autumn moor that climbs to a frozen den in the crags | log walls lashed with hides; a cave den in a snowbound cliff; bone fences | the hunting grounds with the kills on racks, a rope bridge over a gorge, the howling-stone circle, a frozen waterfall, the alpha's den | **howling stones** | **Moonpack kit**: log wall run and corner, bone fence and gate, cave den, howling stone, lookout tower, meat racks, pelt stall, hide bundles, rope bridge, sled, snowy pines, the snow tile. **Wild**: the floes. | the den's keep (a great cave mouth under a skull arch); the log-wall states; the snow-to-autumn ground transitions; ice faces; claw-mark and track decals |
| **The Wildwood** | forest, swamp | Elder-root stronghold | **The Elder Root** | living hedge and root walls; thorn gates; a hollow world-tree keep | the stone circle, the drowned grove in the swamp, the horn trees, a root bridge, the mushroom-lit hollow | **horn trees** (great horns grown into old trunks) | **Druids kit**: hedge wall run and corner, tree gate, great oak, birch, stone circle, mushroom lantern, totem signpost, watch platform, wattle fences, log bridge, moss and forest-floor tiles. **Fae kit**: root bridge, weeping willow, glow bush, spiral watchtower. | the world-tree keep; the root-wall states; the horn trees; swamp water and peat ground; root-wrapped cliff faces; spore decals |
| **The Labyrinth** | temple, ruins | The stone labyrinth | **The Heart of the Maze** | the hold is a maze: high carved sandstone walls in rings, with bull-horn gates | the sunken arena, the broken colossus, the hall of pillars, the overgrown courtyard, the bull altar at the centre | **gongs** | **Wild**: pillars, ruins, statue. **Dwarves kit**: stone wall run and corner, cliff gate, rubble (tinted to sandstone). **In repo**: the temple and ruins tops. | the maze walls as faces, with crenels of carved horn; the altar keep (a ziggurat); the bull gates' states; the gongs; carved-relief faces |
| **Ogre Clans** | highlands, snow | Bonefire clan camp | **Bonefire Crag** | walls of piled megaliths; huts of hide stretched on mammoth ribs; a great cooking pit | the mammoth graveyard, the boulder-throwing ledge, a giant's cooking pot, the frozen tarn, a cave-hall under a great rock | **bonefire totems** | **Orcs kit** reused (bonfire, meat pile, woodpile). **Moonpack**: boulders, snowy pines, fallen logs. **Dwarves**: boulders, rubble. | the megalith walls and their breach; the mammoth-rib huts; the cave-hall keep; the bonefire totems; snow and frozen-mud ground |
| **Infernal Host** | volcano, desert | Infernal mustering grounds | **The Brimstone Gate** | obsidian walls veined with fire; a lava moat; chain bridges; a hellgate keep | the summoning circles, the brimstone spires, the slave pits, the bone-and-iron siege engines, the hellgate | **summoning circles** | Little: **Blood Court** braziers, **dwarves** forge fire (tinted), **in repo** the lava ground and the volcano land. | most of the kit: obsidian faces, the hellgate, the chain bridge, the circles (glowing, animated in code), ash-desert ground, brimstone decals |
| **Yokai Night Parade** | shrine, forest | Haunted shrine | **The Moonlit Shrine** | plastered walls with tile roofs; torii gates; plank walkways over koi ponds; a pagoda keep | the thousand-torii path, the bamboo grove, the lantern bridge, the koi pond, the haunted bell tower | **temple bells** | **Nomads**: tassel lanterns (the road atlas's `tasselLantern`). **Fae**: willow. **In repo**: the shrine land. Little else. | most of the kit: plaster-and-tile walls, the torii, the pagoda keep, stone lanterns, bamboo, raked-gravel and moss ground |
| **Golem Forge** | forge, crystal | War foundry | **The Iron Foundry** | iron-plated walls; piston gates; a foundry keep with chimneys; rails and ore carts | the crystal quarry, the slag heaps, the rail yard, the furnace, the searchlight towers | **forge bellows** | **Machines kit**: iron wall run and corner, piston gate, generator, searchlight tower, rail cart, scrap heaps, girder bridge, coil stack, arc lamp, grate and iron-plate tiles. **Dwarves**: forge, mine entrance, ore carts, crystals, cliff gate, great hall, quarry. | the foundry keep; the bellows; the wall states; slag and rail ground; riveted iron faces; oil and scorch decals |

The Labyrinth and the Golems are best covered by packs. The Infernal and the Yokai are the least covered, so they need the most
ChatGPT work: perhaps 16 images each.

---

## 4. The prompts

[assault-art-prompts-orc.md](assault-art-prompts-orc.md) holds one prompt for each of the 13 sheets, ordered by what phase 1 needs
most:

1. ORC-01 the palisade;
2. ORC-02 its gates;
3. ORC-03 the stone wall's gates and towers;
4. ORC-04 the faces;
5. ORC-05 the ground;
6. ORC-06 the transitions;
7. ORC-07 the keep;
8. ORC-08 the wall's dressing;
9. ORC-09 the camp's big pieces;
10. ORC-10 the camp's props;
11. ORC-11 siege and ruins;
12. ORC-12 bridges and fords;
13. ORC-13 the decals.

All of them go on one branch, `art/assault-orc`, under `art-source/assault/orc/`, in one pull request titled "Assault art: the Orc hold".

---

## 5. Questions for the owner

1. **The Beasts' hold.** Their lands are plains and autumn, but the overlook paints their camp as frozen hunting grounds, and the design
   calls it "a frozen den". I suggest an autumn moor that climbs to a snowbound den. Is that right?
2. **The hold names.** Only Bloodtusk Hold is named. Are the working names in section 3 fine, or do you want to name them?
3. **The renderer work in 1.2** (materials, fringes, decals, face sets, structure states) is a sizeable renderer task. Should it go into
   phase 1's polish, or wait for a phase 1.5 "art pass" once the sheets are in?
