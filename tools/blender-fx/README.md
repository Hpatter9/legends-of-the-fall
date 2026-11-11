# Blender effects (prototype)

`prototype.py` renders six battle effects (fire burst, blessing, ice spikes, sword arc, lightning, shadow vortex) as
transparent frames from the game's camera angle (orthographic, 30 degrees down, turned 45).

```bash
pip install bpy            # Blender as a Python module; no display needed, Cycles on the CPU
python3 tools/blender-fx/prototype.py <out dir>     # FX=fire,ice picks some
```

Each effect writes 16 frames at 160 x 160. The owner chose the pixelated finish: shrink each frame to the heroes'
pixel size (about 90 px across for a two-tile effect), cut to about 14 colours shared by the effect's frames, harden
the alpha, and keep a soft glow underneath for light effects (heals, holy, lightning). See
`docs/samples/blender-fx/` for smooth against pixelated.

## Eidolons (a trial)

`eidolons/askel.py` stages the fire Eidolon's whole summoning (8 seconds, 96 frames) in one scene; `eidolons/finish.py` gives it the
pixelated finish and lays it over a real fight; `eidolons/shots.mjs` takes today's cast and the plate. See `docs/notes/eidolon-blender.md`
and `docs/samples/eidolon-blender/`.
