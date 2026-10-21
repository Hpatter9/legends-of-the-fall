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
The Druid's treant and the decoy sheet (`cls_treant`, which is not a hero sheet) are untouched.
