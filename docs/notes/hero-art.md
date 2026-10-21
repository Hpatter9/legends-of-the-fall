# Hero and foe art (PixelLab)

The eight class heroes (three looks each) and the nine `hk_*` foes (orc grunt, archer, brute, warlord; imp; demon, demon lord;
ogre, horned ogre) are generated pixel art in the Craftpix look (adult proportions, dark outlines, muted palette), replacing the
paper-doll sheets. Same ids (`cls_<hero>_<1-3>`, `hk_*`), so the game code is unchanged except the `scale` of each def.

## How they were made

- Base figure: `POST /generate-with-style-v2` with Craftpix idle frames (Knight, Fire Wizard, padded to 80x80; a Minotaur
  and a Samurai Commander at 128x128 for the big foes) as style references. The output size follows the style images, so
  the figures come out natively about 64 px tall (bosses and ogres 100-120 px): nothing is scaled down. Grades 2 and 3 take the
  grade 1 pick as an extra style reference so the character stays the same. The pick is made by eye from 9 candidates.
- Animation: `POST /animate-with-text-v3` from the picked frame (walk, attack and dead of 4 frames; a few looks also kept idle,
  hurt and attack2 frames from the samples). Rows missing from a sheet fall back as the renderer already does (idle is the
  picked frame; hurt plays the idle frame; attack2 plays the attack).
- Sheet: `tools/pixellab/cut.py` only crops and pads (one crop for the whole sheet, centred on the idle figure, feet on the
  bottom, facing right). Alpha is made hard (0 or 255) and lone one- or two-pixel specks are dropped. Prompts are in
  `tools/pixellab/spec.py`.
- Scale: `scale` = about 46 / `figure`, so heroes sit near 0.7 like Knight (0.74). Bosses and ogres are drawn bigger on purpose
  (about 55 px: Orc Warlord 0.55, Demon Lord 0.46, Horned Ogre 0.47; Ogre 0.42, Brute 0.57).

## Check

`docs/samples/hero-art-phase2.png`: every new figure at 1:1 and 3x (nearest) beside a Craftpix Knight and Skeleton Warrior.
Fights at 393x852 and 852x393: `hero-art-phase2-fight-a/b.png`, `hero-art-phase2-fight-sideways-a.png`.

## Cost

Animations cost about 11 generations a 4-frame clip (80 px; more at 128 px) and a base 15 (10 at 128 px), not the 1 the job
usage reports. About 1,880 of 4,189 generations were used in all, including 12 lost to requests that timed out.


## Treant and lying deaths (treant-deaths)

- **Treant** (`cls_treant`, the Druid's summon; there is one form, the game uses one sheet for it): a mossy bark tree-folk, 96x96,
  generated like the heroes (Craftpix Knight and Minotaur padded to 96x96 as style references; 4 candidates, the mossy one picked).
  Rows walk (5), attack (5), idle (4) and dead (5). The first attack take had a glitchy yellow flash on its last frames, so attack
  and walk are second takes (seed 1). `scale` stays 0.5. The treant faces the camera more than sideways; the renderer mirrors it
  as for every sheet.
- **Deaths:** the generated dead rows ended in a crouch or kneel. `tools/pixellab/lie.py` adds one last dead frame to every
  `cls_*` and `hk_*` sheet: the idle figure rotated by exactly 90 degrees (head to the left, so it falls backwards), standing on
  the old ground line, centred on the idle figure. It is a lossless pixel move, so the art stays crisp and the API is not used.
  Cells are padded wider (never resampled) where the lying figure does not fit. `sheets.json` gets `"lies": true` so the script
  is safe to run twice. `unitView.ts` already holds the last dead frame, so the body stays on the ground until it fades.
  The treant's topple frames from the API barely tilt, so its dead row is those frames then the rotated idle.
- `tools/pixellab/api.py` holds the helpers (style references from the game's sheets, submit, poll); `strip.py` makes the strip.
- Sample: `docs/samples/treant-deaths.png` (treant at 1:1 and 3x, then the final death frame of every generated sheet).
- Cost: generations 1959.75 before, 1803.75 after (156 used, for 1 base and 8 animation clips; the job usage reports far less).
