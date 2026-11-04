# The chosen ruler in the cinematics

The owner: "The king needs to be replaced in the cinematics to the new ones we're using."

## Where a cinematic, scene or reveal draws a king or ruler

| Place | Art it uses | State |
| --- | --- | --- |
| Every scene's figure `unit:standKing` (`sceneView.ts`: the opening's "That is you", the Last Stand scenes, the Calamity and event scenes in `sceneEvents.ts`, `sceneFamilies.ts`, `cineMoments.ts`, `sceneScripts.ts`) | The chosen ruler's 32 frames (`rulerTextures`), name and words from `rulerOf` / `rulerWords` | Already the chosen ruler. The default, The King, is the ninth ruler's own atlas (`the_king.png`), not the old sprite. |
| A line spoken by `face:ruler` (the Crown's herald: `eidolonChainData.ts`, e.g. the Dry Storm prologue) | Was `messenger-face.png`, a stock messenger, for every ruler | **Fixed**: now the chosen ruler's head and shoulders, cut from the first idle frame (`rulerPortraitTexture`). |
| Royal quest cards (`questCard.ts` `faceOf('ruler')`) | The chosen ruler's sheet frame | Already the chosen ruler. |
| Castle throne, Last Stand hall | `rulerSeatTexture`, `thrones.png` | Already the chosen ruler. |
| Unit sheet `stand_king` (`units.ts`, `sheets.json`) | The old Himeko king | Kept: it is the sim's `standKing` unit sheet, still named by the unit table, the armies list and sheet loaders; no screen draws it for the player's ruler. Not removed, because `UNITS.standKing.sheet` still points at it. |
| `throne/king_throne.png` | The old enthroned king | Kept: `the_king.png` is built from it (`tools/rulers/the-king.py`) and the castle sets stand from it; it is part of The King. |
| `loading/last-keep.webp` | A painted still with a crowned king | Loading screen, not a cinematic. Left alone; if it should follow the ruler it needs a repaint (prompt: "moonlit keep gate, an empty throne window lit behind, a hooded archer on the wall, no king figure"). |

No cinematic uses a painted still with a baked-in king: every shot is composed from sheets over the land backdrop.

## What changed

- `src/render/rulerArt.ts`: `rulerPortraitTexture(id)`, a head-and-shoulders crop found from the frame's own pixels.
- `src/render/sceneView.ts`: `face:ruler` loads the chosen ruler's portrait instead of the messenger's face.
- `tools/cinematics/ruler-shots.mjs`: the screenshot script (`node tools/cinematics/ruler-shots.mjs <ruler>`).
- No art files removed (see above: the two old king files are still used).

Shots (393x852, two rulers): `docs/samples/cinematic-ruler-opening-<ruler>.png` (the opening's "That is you") and `cinematic-ruler-crown-<ruler>.png` (the Crown speaking), for `sun_viper` and `iron_stag`.
