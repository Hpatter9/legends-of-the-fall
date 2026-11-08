# Painted hearth

`hearth-source.png` is the original OpenAI image-generation output for the owner-approved tavern direction. The shared `combat-panel.png` was the palette/material reference: forest green, aged brass, dark oak and warm candlelight.

The brief requested a portrait medieval keep tavern with a central hearth, side bar, green banners, oak rafters, a tiny resting white goat, and an empty foreground rug/floor for five dynamic hero illustrations. No fixed heroes, interface or text are baked in.

First background study import (archived; use the packer below for the current scene):

```python
from PIL import Image
Image.open('art-source/tavern/hearth-source.png').save('src/art/ui/tavern-hearth.png', optimize=True)
```

The UI build loop copies and precaches this PNG. `paintedTavern.ts` composes existing transparent hero portraits over it; `paintedTavern.css` positions them. No character art was regenerated for this pass. See `docs/notes/painted-tavern.md` for selection rules and validation.

## Seated hero production

Owner approved `pose-proposal/kwame-ravi-two-poses.png` and the five-hero room composition. `guests/batches.json` gives the exact six-hero identity order for each 4-column × 3-row sheet: each hero occupies two neighbouring cells, first inward-right, then inward-left. Sheets reference the current hero portraits plus the approved seated study. Their brief preserves identity, costume and nonhuman anatomy, with relaxed conversational/reading/tea poses, dark oak green-leather chairs, grounded feet and warm neutral firelight. No combat posing or baked room scenery.

`sheet-03-clean.png` and `sheet-08-clean.png` are image-generator transparency corrections of the corresponding originals. `dreadPirate-pair.png` corrects the first result to preserve Harrow's skeletal identity. The original results remain for provenance; the packer explicitly selects the corrected sources.

`cozy-room-source.png` is the approved five-hero concept edited by image generation to remove people, chairs and tables, preserving room perspective and atmosphere. `tables-source.png` supplies the shared rear and front table layers. At runtime the guests and props are independent, so the room always shows the save's current strongest five.

Run `python tools/tavern/pack.py` (Pillow, NumPy, SciPy) to reproduce all runtime art. It cuts the reviewed grids, removes near-invisible export noise and tiny disconnected sheet specks, normalises scale, retains transparent edge padding and encodes WebP. It does not repaint or synthesise the character images. Source boxes are recorded in `guests/packed.json`. Run `python tools/tavern/review.py` to validate all 108 alpha/padding exports and reproduce the nine contact sheets. The shared build UI cache loop includes every runtime painting and table.

## Living tavern (current)

The owner approved the natural tavern concept in `living/approved-concept.png`, requested subtle animation, and clarified that heroes need individual activities. The armchair artwork above is now archived. `living/activities.json` records all 54 briefs; each of nine `living/sheet-*.png` files has six different heroes in a 3-column by 2-row grid. Each hero has one distinctive off-duty activity, rather than shared drinking/reading variants. `living/room.png` is the empty environment, and `living/gwen-tables.png` holds the separate keeper and table layers. The earlier two-template studies are unused.

Run `python tools/tavern/living-pack.py` for current production exports, then `python tools/tavern/living-review.py` for alpha/padding checks and the labelled contact sheet. The old `pack.py` reproduces the archived armchair scene and should not be used for the current room. Runtime metadata lives in `src/render/tavernActivities.json`; place and motion changes belong there. See `docs/notes/living-tavern.md`.
