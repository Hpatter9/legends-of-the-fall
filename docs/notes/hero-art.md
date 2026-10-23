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


## The Lich King (armies)

A skeletal king in a jagged crown, dark robes and spiked pauldrons, with a bone staff and cold blue soul fire (`lich_king`, 134x128
cells, figure 126 px, faces right, drawn at scale 0.45 and 1.5 times that as a boss). Made as above: 4 base candidates at 128 px
from Craftpix Minotaur, Samurai Commander and Skeleton Warrior frames (the fourth picked by eye), then 4-frame clips of idle, walk,
attack (a staff thrust, used for his shots), cast (the staff swept up, with blue fire) and dead. The robe hides the legs, so the
walk is a slow glide, which suits him. The dead clip barely moves, so his death is the last frame only: the idle figure turned
exactly 90 degrees by `lie.py` (which now also takes `lich_king`). There is no hurt row (it plays idle). Steps: `tools/pixellab/lich.py`.
Cost: 122 generations by the balance readings (1720.75 before the base, 1598.75 after the last clip): 22 for the base, 50 for
the five first clips and 50 for three re-rolled ones (walk, cast and dead, with stronger prompts). The balance dropped
further afterwards, but that was another worker's use of the same account.


## Lich King walk and hurt, treant forms (lich-treant)

- **Lich King:** the robe hides his legs, so the old walk was a slow glide. Two walk takes were made from his idle frame (a floating drift,
  and slow steps under the robe hem); the steps take (seed 3) showed more sway and the hem moving, so it is the walk row now (5 frames).
  A new **hurt** row (4 frames, a flinch back with the robe thrown out) comes from a third clip; a harder-recoil take changed his colours
  and was dropped. `tools/pixellab/patch_lich.py` swaps the rows into `lich_king.png` by moving the pixels so the figure stands where the
  old idle figure does (no resampling, hard alpha); the lying death frame is untouched.
- **Treant forms:** `cls_treant` stays form 1 (the sapling-like treant). **Form 2** `cls_treant_2` is a bigger moss-bark tree-folk with flowers
  and a staff-like branch; **form 3** `cls_treant_3` is an ancient treant with glowing green runes, autumn leaves and blossoms and a crown of
  branches. Both are 128 px bases (4 candidates each, from the form 1 figure, Craftpix Minotaur and Samurai Commander as style references;
  picked by eye), then idle, walk, attack and dead clips (4 frames each). Form 3's first attack had white flashes, so it is a second take
  (seed 2, a few green rune sparks stay); form 2's walk is a second take. Sheets by `tools/pixellab/treant_sheet.py` (cut.py's rules), then
  `lie.py` for the lying last death frame. Rows and base steps: `rows.py`, `treant.py`.
- **Wiring:** `treant` now has `forms` like the class heroes, and Call Treant gives the treant the Druid's grade, so a grade-2 or grade-3 Druid
  calls the matching form (`unitView` already draws a grade's sheet, glow and filter). `scale` is the def's, so forms 2 and 3 stand about 62 px
  tall against form 1's 48: bigger on purpose.
- Tests: `test/class-heroes.test.ts` (the treant takes the Druid's grade and each form has its rows; the Lich King has walk, hurt and death rows).
- Samples: `docs/samples/lich-treant.png` (new rows at 1:1 and 3x), `lich-treant-fight-lich.png` and `lich-treant-fight-treant.png` (393x852,
  from `tools/lich-treant/shots.mjs`).
- Cost: generations 706.75 before, 489.75 after (217 used: 2 bases of 4 candidates, 15 clips including the dropped takes).


# Hero art remake (hero-art)

One look for the whole roster: sixteen heroes were redrawn with PixelLab in the Craftpix side-view style (realistic proportions, soft
shading, a thin dark outline, 64-90 px figures facing right), so the party reads as one cast. Names, kits, stats and balance are
unchanged; only `sheet`, `forms` and `scale` in `src/sim/units.ts` moved. The simulation is untouched.

## Which heroes

- The 14 asked for: Mercenary, Wolf Bard, Beastmaster, Time Witch, High Priestess, Queen Dragoon, Great Sage, Demon Swordsman
  (were Pixel Champions chibis), Buccaneer, Dread Pirate, Kraken Mate (pirate-pack chibis), Lancer, Mummy, Juggernaut.
- Also remade after a lineup (`docs/samples/hero-art-lineup-before.png`): **Tyrant** (a thin, odd, gradient-shaded sprite, the one that
  clashed most) and **Shambler** (a cartoon zombie with a thin outline; its three zombie looks are now one).
- Kept: **Reaper**. It is a dark hooded shape that sits well beside the Warlock and the Lich, so no redraw.
- Each is now one sheet, `src/art/units/hero_<name>.png`, with no per-grade looks (`forms` removed): the grade tint and glow in the
  portrait and the awakened recolours still show the grade. The old `pc_*`, `pirate_*`, `squidman`, `horde_2`, `hk_tyrant`,
  `hk_juggernaut`, `hk_mummy` and `hk_zombie*` sheets are deleted (no foe used them).

## How

`tools/pixellab/heroes/`: `spec.py` (prompts; style references are first frames of the game's Craftpix sheets), `gen.py` (base
candidates, clips, takes, previews), `contact.py` (contact sheet of candidates), `cut.py` / `finish.py` (sheet + sheets.json entry,
and `lie.py` for the lying last death frame), `bands.py` (sheets and heights into `units.ts`), `lineup.py` and `shots.mjs`.
Per hero: one base call (9 candidates, one picked by eye), then walk, attack, idle, hurt and dead clips (plus a cast clip for the hero
whose kit casts `attack2`). Clips of the same prompt were rerun with another seed where the first take barely moved (Wolf Bard,
Queen Dragoon). Weak or glitchy frames (a yellow flash on a few attack frames) were avoided by taking another seed's clip, not
by editing pixels. Dragoon's attack row is the lance-thrust clip (its `attack2` falls back to it). `hurt`/`attack2` fall back as before where a row is absent.

## Heights

The heroes were almost all drawn at the same 46 px, which read as "no bands". `bands.py` sets each `scale` so the figure's body
(without a thin weapon tip) stands **small 42, medium 50 or large 60** world px: small are the quick light fighters (Kunoichi, Ninja
Monk, Wanderer, Kitsune, Peasant, Lightning Mage, Karasu), large are the bruisers and big bodies (Barbarian, Minotaur, Werewolf,
Samurai Commander, Yamabushi, Tyrant, Juggernaut, Lancer, Queen Dragoon, Siege Bot, Kraken Mate), everyone else medium. Hitboxes and
stats do not use `scale`. Tests: `test/hero-art.test.ts`; the two older size checks (`class-heroes`, `new-heroes`) now assert the bands
rather than the single 40-52 window.

## Outline, shadow, palette

The new figures carry the same dark outline as the class heroes; the drop shadow is the renderer's, the same for all. I left the
palettes alone: the new heroes use muted, slightly dark colours that match the Craftpix sheets, and the few bright originals (Peasant, Kitsune,
the robots) are the Craftpix art the owner wants kept, so a recolour would be a redraw by another name.

## Checked

Before and after lineups at in-game scale: `docs/samples/hero-art-lineup-before.png`, `-after.png`; the prototype beside Knight, Samurai
and Paladin: `hero-art-proto.png`. In battle at 393x852: `hero-art-fight-{a,b,c}-393.png`, `hero-art-fight2-*`, deploys `hero-art-deploy-*`;
the party list and a hero sheet: `hero-art-party-393.png`, `hero-art-sheet-wolfbard-393.png`; the tavern, hall, castle and camp:
`hero-art-home-<n>-393.png`. Offline: the sheets are bundled into `game.js` as data URLs, so `FILES` did not change.

## Cost

About 1,030 generations of the plan's 4,212 (3,186 left): base calls 15 each, clips about 11 each, plus a few retakes.
