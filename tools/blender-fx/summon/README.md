# The summoning's show (SUMMON-SHOW)

Kept apart from the battle effects' pipeline: its own scenes, its own finish, its own sheets and manifest, loaded only by the
summoning screen. It borrows the Eidolons' helpers (`../eidolons/askel.py`: materials, glow, math nodes) and changes nothing there.

```bash
pip install bpy pillow numpy
python3 tools/blender-fx/summon/show.py out/summon-fx/raw            # render the five pieces (PART=rift,burst for some); about a minute
python3 tools/blender-fx/summon/finish.py out/summon-fx/raw          # pixelate, pack src/art/fx/summon/*.webp, write src/render/summonFxData.ts
```

`docs/notes/summon-show.md` says what each piece is and how the page plays it.
