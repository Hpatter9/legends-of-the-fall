# Blender effects

Every battle effect in the game is to be a Blender-rendered, pixelated, fully animated frame sheet (the owner's call), so
everything matches. This is the pipeline; `docs/notes/blender-fx.md` says how the game plays the sheets and which effects
have been made so far.

```bash
pip install bpy pillow numpy       # Blender as a Python module: Cycles on the CPU, no display needed
npm run blender-fx                 # render what has changed, pixelate, pack, write the manifest
python3 tools/blender-fx/build.py --only spell-heal-cast,spell-frost-cast     # render only these, then pack everything
ZOOM=2 python3 tools/blender-fx/build.py --sheet out/sheet.png spell-heal lib-   # a contact sheet of the ids that start so
node tools/blender-fx/shots.mjs out/blender-fx/shots     # after `npm run web`: each spell cast in a real fight, photographed
```

## The parts

- `lib.py`: the game's camera (orthographic, 30 degrees down, turned 45: a tile is a 2:1 diamond; one Blender unit is one
  tile's side, +x the board's u, -y its v), the element palettes (fire, ice, lightning, earth, blood, forest, poison, holy,
  shadow, arcane, water, wind, bone), and the materials and shapes scenes are built from.
- `scenes.py`: the library of effect shapes (52: burst, pillar, spikes, arc, bolt, vortex, beam, nova, rain, crack, dome,
  projectile, trail, ring, swarm, chains, meteor, cloud, geyser, sigil, wall, crystal, shatter, gust, vines, motes, shout,
  spiral, implode, bite, eye, ribs, flames, ground, sparks, cross, smoke, portal, claws, veil, halo, shockwave, souls, hearts,
  shaft, slab, flare, strike, comet, palisade, siphon, tile). A scene takes its palette from the effect's element and its size
  from its options, and returns `step(t)`, which poses it at time t.
- `effects.py`: the catalogue. An effect is a recipe: a scene, an element, a canvas (in tile widths), a frame count and a
  time. `stages=[stage('sigil', 0, 0.4), stage('strike', 0.35, 0.6), stage('smoke', 0.55, 1)]` builds one effect from several
  scenes, each over its own stretch of the time: that is how a long staged move (a wind-up, a strike, an aftermath) is made,
  and the manifest carries each stage's frames (`cuts`). The `lib-*` entries are one of each scene, to look at; they are not shipped.
- `render.py`: renders an effect's frames at twice their kept size. An effect is rendered again only when its recipe, its
  scenes' code or the shared code has changed.
- `pixelate.py`: shrinks each frame to the heroes' pixel density (45 px a tile), cuts the alpha hard (thin parts keep a
  fixed 4x4 dither, so a mist stays a mist), and cuts all of an effect's frames to one shared palette of 14 colours. A
  light effect (`glow`: holy and lightning by their palettes, heals by their recipe) also gets a soft glow: the frame
  blurred and kept at a quarter size, which the game draws underneath, smoothed.
- `pack.py`: cuts each effect to the smallest box that holds all its frames, shelves the blocks into atlases of at most
  1024 x 1024 (`src/art/fx/blender/px-<n>.webp`, lossless; `soft-<n>.webp` for the glows) and writes the manifest
  (`src/render/blenderFxData.ts`). It warns when an effect touches its canvas's edge (make the canvas larger).
- `sheet.py`, `shots.mjs`, `shots_sheet.py`: contact sheets of the frames, and pictures of the effects in real fights.

The rendered frames are kept in `out/blender-fx/raw` (not in the repo); the scripts are the source, and one command makes
everything again. Rendering is the same from run to run on one machine (fixed seeds, a fixed Cycles seed); another machine's
Blender build may differ in the last bit of a noise, which the palette cut mostly hides. `prototype.py` is the first six
effects as they were shown to the owner (smooth against pixelated: `docs/samples/blender-fx/`).

## Adding an effect

1. Pick a scene (or write one in `scenes.py`: build the parts, return `step(t)`), and add a recipe to `effects.py`.
2. `python3 tools/blender-fx/build.py --sheet out/x.png <id>` and look at it; then `npm run blender-fx`.
3. Play it from the game by its key (`bfxOnce`, `bfxStand`, `bfxFly` in `src/render/fx.ts`).
