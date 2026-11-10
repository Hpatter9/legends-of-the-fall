# Moonlit Shrine source art

Sheets 01–03 are the existing owner-approved paintings (PR #488), unchanged here. Sheets 04–13 were generated with OpenAI image generation from the existing per-sheet briefs in [the art prompts](../../../docs/notes/assault-4-moonlit-shrine-art-prompts.md). The owner approved the shrine direction and required grid compatibility.

`raw/` preserves the ten selected generation outputs before layout packing, plus the initial keep before its moon-and-fox refinement; `generation-manifest.json` records hashes and repaired layouts. Generated imagery is original; existing Chronos kit artwork remains separately credited in `CREDITS.md`. Production packing only crops the specified cells, clears faint sprite alpha, uniformly scales pieces and places them at the cutter's anchors; it does not paint replacement artwork.

From the repository root:

```sh
python3 tools/moonlit-shrine/pack.py
python3 tools/moonlit-shrine/check.py
python3 tools/assault/cut-sheets.py yokai --reuse-kits
npm run web
```

The last command retains shipped kit pixels/metadata when the private kit source checkout is absent. Use `KITS=<source directory>` instead when the original kit files are present. Repeated WebP recuts can introduce compression changes; raw generated paintings and packed PNG sources remain lossless.

| Sheet | Canvas | Layout |
| --- | --- | --- |
| 04 faces | 1536×1024 | Six 256×512 columns in each of two rows; lip/body/foot heights 80/320/80, then 32 transparent pixels |
| 05 ground | 1024×1024 | 4×4 top-down 256px textures |
| 06 transitions | 1024×1024 | 4×4 top-down edge/corner overlays |
| 07 shrine | 1536×1024 | 1024px main cell, two 512px side cells; 6×4 keep and 1×1 seat/banner |
| 08 wall dressing | 1024×1024 | 4×4 props, the hold's own order |
| 09 landmarks | 1536×1024 | 3×2 buildings, including two 3×3 landmarks |
| 10 props | 1024×1024 | 4×4 props; fox-statue cell 6 also supplies the totem aliases |
| 11 ruins | 1536×1024 | 3×2 buildings: tent, burnt tent, pavilion, burnt pavilion, two ruins |
| 12 pond | 1024×1024 | 4×4 water props; wet boulders in cell 9 |
| 13 decals | 1024×1024 | 4×4 top-down decals |

Standing source tiles use the brief's 128×64 diamond. One-tile prop anchors are (128,208), ordinary building anchors (256,416), keep anchor (512,840), and seat/banner anchors (256,440). A 3×3 landmark's front tip lies exactly at its 512px cell boundary by design; all raw silhouettes are complete before placement. No piece extends into an adjacent cell.

See [handoff](../../../docs/notes/moonlit-shrine-completion.md) and the footprint diagrams/browser evidence under `docs/samples/moonlit-shrine/`.

The [richness follow-up](../../../docs/notes/moonlit-shrine-richness.md) places the existing fox shrines, lantern garden, water pavilion and waterfall island in the game. The [refinement prompt](../../../docs/notes/moonlit-shrine-richness-art-prompts.md) gives the main shrine its crescent crown and fox-mask entrance, using the same source grid and anchors.

The [whole-map detail pass](../../../docs/notes/moonlit-shrine-map-detail.md) uses these existing paintings for regional vegetation, camp and store supplies, ruins, shoreline plants, perimeter banners and lanterns. No additional source art was required.
