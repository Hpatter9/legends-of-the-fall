# The castle remake: art prompts

**Superseded:** the owner approved a full two-view [Castle tab renewal](castle-tab-renewal.md). Its building scene sheet now supplies all eleven sites; the tall courtyard is retired. This prompt is retained as historical context: do not commission the old courtyard or cutout sheets for the current tab. The royal hall source from the earlier follow-up is retained.

The castle remake (`docs/notes/castle-remake.md`) needs four new paintings. They come from **one** ChatGPT task: one prompt, one branch
(`art/castle-remake`), one pull request ("Castle remake art"). If that turns out to be too much for one task, run the same prompt twice,
adding the line "Do images 1 and 2 only" to the first run and "Do images 3 and 4 only" to the second; both runs use the same branch and
the second adds to the first's pull request.

Until the art lands the game shows stand-ins (a plain courtyard, the old building sprites, the old pixel throne room). When the pull
request is merged, `python3 tools/castle-remake/cut.py` cuts the four files into `src/art/castle-remake/` and writes its manifest; the
page picks every picture up by file name with no other change.

| # | File (under `art-source/castle-remake/`) | Size | Background | What it is |
| --- | --- | --- | --- | --- |
| 1 | `courtyard.png` | 1024 x 1536 | opaque | The castle's bailey from above: the keep at the top, eleven empty building plots, the gate at the foot |
| 2 | `buildings-a.png` | 1536 x 1024 | transparent | Six buildings, a 3 x 2 grid of 512 px cells: Treasury, Armoury, Barracks / Mage Tower, Stable, Library |
| 3 | `buildings-b.png` | 1536 x 1024 | transparent | Six more: Chapel, Smithy, Watchtower / Hall of Legends, Drill Yard, a building site with scaffolding |
| 4 | `throne-hall.png` | 1536 x 1024 | opaque | The great hall inside the keep: an empty dais (the ruler brings their own throne), the carpet, the windows |

The building cutouts double as the pictures at the head of each building's card, so there are no separate card headers. The painted
medallions and plates already in the game (`art-source/ui/buttons/`) serve every button, so no new buttons are needed.

## The prompt (all four pictures)

```text
You are painting game art for Legends of the Last Keep, a fantasy auto-battler played as an upright phone web app (repository
hpatter9/legends-of-the-fall). The player rules a castle, the Last Keep. Its Castle tab is being remade as ONE painted scene: the
castle's courtyard seen from above, with each of the castle's eleven buildings standing on its own plot, so the player taps a building
to upgrade it. You will paint the courtyard, the eleven buildings (as cut-out pieces laid over the courtyard in code), a building site,
and the great hall inside the keep.

Rules for this task:
- Branch: art/castle-remake. If it already exists on origin, check it out and add to it; otherwise create it from main.
- Add exactly these four files and change no other file:
    art-source/castle-remake/courtyard.png     1024 x 1536, opaque
    art-source/castle-remake/buildings-a.png   1536 x 1024, RGBA with a transparent background
    art-source/castle-remake/buildings-b.png   1536 x 1024, RGBA with a transparent background
    art-source/castle-remake/throne-hall.png   1536 x 1024, opaque
- Open one pull request into main titled "Castle remake art". In its body list the four files with one line each on what is in them.
- No text, letters, numbers, runes that read as letters, logos, frames, borders, watermarks or signatures anywhere. Original work only.
- Paint at your native image size. If a picture comes out at another size, resize it to the exact canvas above with Pillow
  (Image.resize with LANCZOS, cropping evenly first if the aspect differs). Do not repaint it to fix the size.

Open these files first and match their hand exactly (brushwork, detail, palette, light):
- art-source/tavern/hearth-source.png (the painted tavern, shown on the Heroes tab): warm candle and fire light, rich wood and stone,
  crisp painted detail that reads at a third of the size on a phone.
- src/art/camp/overlook.png and src/art/camp/camp-war.png (the camp paintings): the same painted fantasy landscape, and camp-war.png
  for the high bird's-eye three-quarter view of a walled place full of small buildings, torches and paths.
- art-source/ui/buttons/plates-frames.png and art-source/ui/buttons/camp.png (the painted buttons): the aged brass, dark green and
  slate the menus are dressed in. The castle's banners and trim use the same dark green and brass.
The style throughout: detailed painted fantasy art, as those files are. Dark weathered stone, timber, slate and copper roofs, aged
brass, deep green banners with gold trim, warm torch and window light against cool blue-grey dusk shadow. Lit from the upper left.

IMAGE 1: art-source/castle-remake/courtyard.png (1024 x 1536, upright, opaque)
The Last Keep's bailey at dusk, seen from high above and in front, the same bird's-eye three-quarter view as camp-war.png. Positions
below are shares of the picture (0 to 1 across, 0 to 1 down); code lays buildings and name plaques exactly on them, so keep to them.
- The great keep at the top centre: a tall stone keep with two towers, slate roofs, green-and-gold banners on poles, and the tall
  arched windows of its great hall glowing warm. It fills about x 0.30 to 0.70 and y 0.02 to 0.24; its great doors stand at the top
  of a broad flight of steps at about (0.50, 0.235).
- The curtain wall runs round the whole bailey: behind the keep along the top, down both sides at the very edges of the picture (only
  a strip of wall-walk with torches shows at the left and right edges), and across the foot. Two round corner bastions at the top left
  (about 0.15, 0.20) and top right (about 0.85, 0.20) have flat, empty stone tops: these are plots too.
- The gatehouse at the bottom centre (about 0.50, 0.90): an arched gate with a raised portcullis, a lit torch either side of it at
  about (0.40, 0.88) and (0.60, 0.88). The bottom tenth of the picture is the road leaving through the gate and the dark hills beyond.
- A cobbled road runs from the gate straight up the middle to the keep's steps; narrower paths branch off it to every plot.
- ELEVEN EMPTY PLOTS. Each is a level patch of packed earth and flagstones edged with a low stone kerb, about 0.24 of the picture wide
  and 0.10 of it deep, centred on these points. Leave every plot EMPTY: no building, scaffold, tent or prop on it (the buildings are
  separate pieces drawn over it in code). Nothing tall may stand in front of (below) a plot within 0.08 of it.
    (0.15, 0.20) and (0.85, 0.20): the tops of the two corner bastions
    (0.18, 0.37)   (0.50, 0.37)   (0.82, 0.37)
    (0.18, 0.54)   (0.50, 0.54)   (0.82, 0.54)
    (0.18, 0.71)   (0.50, 0.71)   (0.82, 0.71)
  The plot at (0.50, 0.71) is a larger open parade ground of sand edged with a low fence (the Drill Yard stands there).
- Between the plots: small gardens, a well at about (0.34, 0.62), a stone fountain at about (0.66, 0.45), lamp posts along the road,
  barrels, carts and crates against walls, a few small trees, banners on the walls. Keep these low and clear of the plots.
- Life the code will animate, so paint them clearly where stated: the keep's two banners (on the towers' tops), the two gate torches,
  four torches along the wall-walks at the left and right edges (about y 0.30 and 0.60 on each side), the keep's lit windows, and
  the fountain's water.
- Keep the picture's top 0.02 as dusk sky over the keep's roofs, with a few stars. No figures anywhere (heroes are added in code).

IMAGES 2 and 3: the buildings (each 1536 x 1024, RGBA, transparent background)
Each sheet is a grid of 3 columns by 2 rows of 512 x 512 cells. One building per cell, centred across its cell, standing on the
cell's bottom edge (its foot about 24 px above the bottom, with the plot's kerb NOT included), at most 470 px wide and 470 px tall, with
at least 20 px of clear transparent space to every edge of its cell. Nothing may cross into a neighbouring cell. Paint every building
from the SAME high three-quarter view and lighting as the courtyard (lit from the upper left), at the same scale as each other: a
two-storey building is about 300 px tall. Soft contact shadow on the ground under each is fine; no ground plate, no grass square.
All the castle's buildings share one family look: dark grey stone, timber, slate or copper roofs, dark green banners with brass.

buildings-a.png, top row left to right:
  1. Treasury: a squat stone vault-house with an iron-bound door, a copper dome, chests and coin sacks by the door, a gold glint.
  2. Armoury: a stone forge-house with a tall chimney, a glowing furnace mouth, weapon racks of swords and spears, an anvil.
  3. Barracks: a long two-storey timber-and-stone hall with bunk-room windows, a green banner, shields hung along its wall.
buildings-a.png, bottom row left to right:
  4. Mage Tower: a slender round tower with a pointed slate roof, a ring of floating crystals, its windows glowing cyan and violet.
  5. Stable: a timber stable with a hayloft and a thatched roof, two horses' heads over the half-doors, hay bales, a water trough.
  6. Library: a tall stone archive with arched windows lit warm, a small observatory dome, scroll racks seen through the door.

buildings-b.png, top row left to right:
  7. Chapel: a small gothic chapel with a spire, a rose window glowing gold, a bell in the tower.
  8. Smithy: a smaller open-sided smithy under a lean-to roof, a glowing hearth, a grindstone, horseshoes and tools on the wall.
  9. Watchtower: a tall square stone watchtower with a timber hoarding at the top, a brazier lit on its roof, a green pennant.
buildings-b.png, bottom row left to right:
  10. Hall of Legends: a columned marble hall like a small temple, four statues of heroes on plinths along its front, laurel garlands.
  11. Drill Yard: no building: a sanded parade square seen from the same view, with two straw training dummies, a weapon rack, a
      sergeant's stand with a small canopy and a green banner. It is wider than tall (about 470 x 300) and must still be a cut-out.
  12. Building site: an empty plot under construction: timber scaffolding round a half-built stone wall, stacked stone blocks, a
      wooden crane with a rope and a hanging block, a ladder, tools, a few planks. No workers. (Code shows it for an unbuilt
      building and over a building while its next level goes up.)

IMAGE 4: art-source/castle-remake/throne-hall.png (1536 x 1024, landscape, opaque)
The great hall inside the keep, seen straight on and symmetrical about the centre line, as from the foot of the hall. It is shown in a
wide strip on the phone, so the top tenth and the bottom tenth may be cropped: keep everything important between y 0.10 and 0.90.
- Centre: a raised stone dais with three broad steps, its top edge at about y 0.59, its front step at about y 0.66, about 0.36 of the
  picture wide. The dais is EMPTY: no throne, chair, ruler or figure on it (the ruler and their throne are drawn over it in code,
  standing on the dais at (0.50, 0.59)). Behind the dais: a great green-and-gold cloth of state hanging from the wall.
- A deep red carpet runs from the dais straight down to the bottom edge.
- Tall arched stained-glass windows left and right of the dais (about x 0.20 and 0.80, y 0.15 to 0.50) with cool blue light falling
  into the hall; four iron torch sconces on the pillars (about x 0.04, 0.32, 0.68, 0.96 at y 0.12), each lit; long green banners hang
  from the pillars.
- The wall at about x 0.74 to 0.89, y 0.46 to 0.67 is plain stone: a trophy rack is hung there in code.
- The floor in front of the dais is clear flagstone, so four guards (drawn in code) can stand at about (0.21, 0.58), (0.79, 0.58),
  (0.15, 0.75) and (0.85, 0.75), and a goat can wander along y 0.80. Nothing tall on the floor.
- No figures, no throne, no text. Warm torchlight and cool window light; the middle of the picture a little darker than the edges so
  the figures drawn over it stand out.

Before you commit, check every file yourself with Pillow and fix anything that fails:
- each file's size is exactly as listed (courtyard.png 1024 x 1536; buildings-a.png and buildings-b.png 1536 x 1024; throne-hall.png
  1536 x 1024);
- buildings-a.png and buildings-b.png are mode RGBA, their corners and the gaps between cells fully transparent (alpha 0), and in each
  512 x 512 cell the opaque pixels stay at least 20 px from the cell's edges;
- courtyard.png and throne-hall.png are fully opaque (RGB, or RGBA with every alpha 255);
- look at each picture once more: no text or letters anywhere, the courtyard's eleven plots are empty and where stated, the hall's dais
  is empty, and every building is whole in its cell.
Then commit the four files and open the pull request.
```

## After it lands

- `python3 tools/castle-remake/cut.py` (run from the repository root, with Pillow): reads `art-source/castle-remake/`, writes
  `src/art/castle-remake/courtyard.webp` and `throne-hall.webp` (quality 86) and one trimmed `.webp` per building
  (`treasury.webp` … `site.webp`), then `src/art/castle-remake/manifest.json` naming what it cut. `build.mjs` copies the folder to
  `out/web/ui/castle/` and adds every file to the service worker's `FILES`; `src/castleArt.ts` reads the manifest, so each painting
  replaces its stand-in by name.
- Credit the four paintings in `CREDITS.md` (the cutter prints the line to add).
- Check the ambient life's spots (`SCENE_LIFE.courtyard` and `SCENE_LIFE.throneHall` in `src/render/ambientScenes.ts`) against the
  painting with `node tools/alive/masks.mjs <dir>` and nudge them to the torches, banners and windows as painted.
