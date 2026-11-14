# Licence replace: the prompt for the art (LICENCE-REPLACE)

The owner's answer on the assets whose licence could not be confirmed was "Replace them". This page is the art half; the eight recorded
combat sounds are already replaced by the game's own synth ([licence-replace.md](licence-replace.md)).

The sheets to repaint come from two packs with no licence file:

- **batareya's "Golems and elementals":** the Golem Forge's six golems, the Druid's treant, the Reaper's wraith and the Illusionist's
  decoy.
- **whtdragon's RPG Maker MV animals:**
  - Duchess the goat: her walking sheet, and her fighting sheet with the PixelLab headbutt and fall made from it;
  - the Beastmaster's wolves;
  - the wild dogs the summons use.

Every sheet keeps the exact canvas and frame grid of the one it replaces, so the swap is the file and nothing else.

| # | File (under `art-source/licence-replace/`) | Replaces `src/art/…` | Canvas | Cell | Rows top to bottom (frames) | Figure |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `golem_stone.png` | `units/golem_stone.png` | 1056 x 635 | 132 x 127 | walk 8, attack 5, idle 4, hurt 3, dead 5 | about 110 px tall |
| 2 | `golem_iron.png` | `units/golem_iron.png` | 1024 x 605 | 128 x 121 | the same | about 117 px |
| 3 | `golem_crystal.png` | `units/golem_crystal.png` | 1088 x 610 | 136 x 122 | the same | about 112 px |
| 4 | `golem_magma.png` | `units/golem_magma.png` | 1072 x 605 | 134 x 121 | the same | about 118 px |
| 5 | `golem_sapphire.png` | `units/golem_sapphire.png` | 1024 x 640 | 128 x 128 | the same | about 124 px |
| 6 | `golem_forge.png` | `units/golem_forge.png` | 1040 x 640 | 130 x 128 | the same | about 125 px |
| 7 | `cls_treant.png` | `units/cls_treant.png` | 500 x 510 | 100 x 102 | walk 5, attack 5, idle 4, **dead 5, hurt 3** (this order) | about 96 px |
| 8 | `summon_wraith.png` | `units/summon_wraith.png` | 576 x 580 | 96 x 116 | walk 6, attack 5, idle 4, hurt 2, dead 5 | about 91 px, feet 4 px above the cell's bottom |
| 9 | `summon_decoy.png` | `units/summon_decoy.png` | 576 x 580 | 96 x 116 | the same | about 82 px, feet 4 px up |
| 10 | `wolf_grey.png` | `units/wolf_grey.png` | 384 x 480 | 96 x 96 | walk 4, attack 4, idle 2, hurt 1, dead 2 | about 62 px |
| 11 | `wolf_black.png` | `units/wolf_black.png` | 384 x 480 | 96 x 96 | the same | about 62 px |
| 12 | `summon_wolf.png` | `units/summon_wolf.png` | 560 x 480 | 112 x 96 | walk 4, attack 5, idle 4, hurt 2, dead 4 | about 78 px, feet 4 px up |
| 13 | `summon_wolf_white.png` | `units/summon_wolf_white.png` | 560 x 480 | 112 x 96 | the same | about 78 px, feet 4 px up |
| 14 | `summon_direwolf.png` | `units/summon_direwolf.png` | 560 x 480 | 112 x 96 | the same | about 78 px, feet 4 px up |
| 15 | `duchess_goat.png` | `units/duchess_goat.png` | 512 x 640 | 128 x 128 | walk 4, attack 4, idle 2, hurt 1, dead 3 | see below |
| 16 | `goat.png` | `duchess/goat.png` (and `goat-half.png`, which the builder cuts from it) | 288 x 48 | 48 x 48 | one row of 6 | see below |

Rules for every sheet:

- **Facing and layout:**
  - every figure faces **right**;
  - unused cells at the end of a row stay empty;
  - the feet sit on the same line in every frame of a sheet.
- **Rows:**
  - the last frame of a `dead` row lies flat on the ground;
  - a `hurt` frame is a flinch;
  - an `idle` row is a slow breath.

**Duchess must stay Duchess.** She is a small white nanny goat, with:

- short curved horns, a little beard and a stubby upturned tail;
- a white coat with soft grey shading;
- dark hooves.

She is shown in profile, side-on. Her proportions are the sheet's today: a body about as long as she is tall, and a head held a little
above her back.

Her costumes are drawn in code at fixed points of her 48 px frame (`goat.png`), so in the right-facing frames:

- the top of her head between the horns is at x 29 to 35, y 12;
- her neck runs down to her back at about y 22;
- her back is level at about y 22 to 24, from x 9 to x 26;
- her hooves stand on y 47.

In the left-facing frames the same points are mirrored (x becomes 47 - x).

On her fighting sheet the same goat is drawn 2x on a 64 px canvas set in the 128 px cell: her body spans x 16 to 88 and y 52 to 124, so
her hooves stand on y 124.

## The batch prompt

```
Repository: hpatter9/legends-of-the-fall. Branch: art/licence-replace, from the latest main (create it). Add exactly the 16 PNG files
below, all under art-source/licence-replace/, and nothing else: no code, no notes, no version. Then open one pull request into main titled
"Licence replace: 16 repainted sheets" listing every file with its canvas size and its grid, and say there that every image is original
work made for this game.

You are repainting the sprite sheets of Legends of the Last Keep, a dark gothic fantasy auto-battler played upright on a phone: small
fighters on an isometric, Final Fantasy Tactics style board. Each sheet replaces one whose licence could not be confirmed, so it must be
wholly your own design: do not copy or trace any existing pack, RPG Maker resource or game sprite.

STYLE for all 16: painted pixel art with a clean dark outline, hard pixel edges, no blur, no anti-aliased soft edges, no ground shadow,
no text, transparent background (real alpha, no checkerboard, no coloured key). Light from the upper left. Match the pixel scale, outline
and palette of the fighters already in the repository: study src/art/units/hk_orc_grunt.png, hk_ogre.png, cls_paladin_1.png and
src/art/units/orc_chieftain.png, and the existing sheet each new one replaces (named below), and keep each figure the same size in its
cell as the old one.

LAYOUT for every sheet: a grid of equal cells, rows from top to bottom in the order given, frames from left to right; any cell past a
row's frame count is left fully transparent. Every figure faces RIGHT. The feet stand on the same horizontal line in every frame of a
sheet (the line given, measured from the bottom of the cell). Rows: walk = a steady step cycle; attack = wind-up, strike, recover;
idle = a slow breath, almost still; hurt = a flinch back; dead = falling, the last frame lying flat on the ground. Keep each figure
centred in its cells so it does not jump between frames.

1. art-source/licence-replace/golem_stone.png: canvas 1056 x 635, cells 132 x 127, 8 per row; rows walk 8, attack 5, idle 4, hurt 3,
   dead 5; feet on the cell's bottom edge; figure about 110 px tall. A hulking golem of rough red-brown sandstone blocks, broad shoulders,
   huge fists, small glowing amber eyes, moss in the cracks. (Replaces src/art/units/golem_stone.png.)
2. golem_iron.png: canvas 1024 x 605, cells 128 x 121, 8 per row; the same rows; feet on the bottom edge; about 117 px. A riveted iron
   golem, dark bronze plates, a furnace grille in its chest and a small flame on its head.
3. golem_crystal.png: canvas 1088 x 610, cells 136 x 122, 8 per row; the same rows; feet on the bottom edge; about 112 px. A lean golem
   of violet amethyst shards, crystals jutting from shoulders and back, faint inner light.
4. golem_magma.png: canvas 1072 x 605, cells 134 x 121, 8 per row; the same rows; feet on the bottom edge; about 118 px. A black basalt
   golem split by glowing orange lava seams, flames rising from its head and shoulders.
5. golem_sapphire.png: canvas 1024 x 640, cells 128 x 128, 8 per row; the same rows; feet on the bottom edge; about 124 px. A massive
   blue sapphire colossus, cracked crystal skin with light inside, crystal spikes on its crown.
6. golem_forge.png: canvas 1040 x 640, cells 130 x 128, 8 per row; the same rows; feet on the bottom edge; about 125 px. A gilded brass
   forge titan, a glowing core in its chest, a smith's hammer for one hand, a burning brazier for a head.
7. cls_treant.png: canvas 500 x 510, cells 100 x 102, 5 per row; rows walk 5, attack 5, idle 4, dead 5, hurt 3 (dead BEFORE hurt);
   feet on the bottom edge; about 96 px. A friendly-looking but grim old treant: an oak's bark body, root feet, branch arms, a mossy
   crown of leaves, two green glowing eyes.
8. summon_wraith.png: canvas 576 x 580, cells 96 x 116, 6 per row; rows walk 6, attack 5, idle 4, hurt 2, dead 5; the bottom of the
   figure 4 px above the cell's bottom; about 91 px. A floating spectral wraith of pale blue light, a hooded torso trailing into wisps,
   long clawed hands; it has no legs. Its dead row fades and comes apart into motes.
9. summon_decoy.png: canvas 576 x 580, cells 96 x 116, 6 per row; the same rows; feet 4 px above the cell's bottom; about 82 px. An
   illusion double: a slim humanoid figure made of shimmering violet and cyan crystal light, a mirror-mask face. Its dead row shatters
   into light.
10. wolf_grey.png: canvas 384 x 480, cells 96 x 96, 4 per row; rows walk 4, attack 4, idle 2, hurt 1, dead 2; feet on the bottom edge;
    about 62 px tall (a wolf seen side-on, longer than tall). A pale grey wolf with a lighter belly, alert ears; attack is a lunge and
    bite.
11. wolf_black.png: the same canvas and grid as wolf_grey.png. A big black dire wolf with a grizzled ruff and amber eyes.
12. summon_wolf.png: canvas 560 x 480, cells 112 x 96, 5 per row; rows walk 4, attack 5, idle 4, hurt 2, dead 4; feet 4 px above the
    cell's bottom; about 78 px tall. A lean dark-grey summoned wolf with a faint green spirit glow in its eyes.
13. summon_wolf_white.png: the same canvas and grid. A light grey-white summoned wolf, same build as 12.
14. summon_direwolf.png: the same canvas and grid. A black summoned dire wolf, heavier than 12, same pose language.
15. duchess_goat.png: canvas 512 x 640, cells 128 x 128, 4 per row; rows walk 4, attack 4, idle 2, hurt 1, dead 3; Duchess's hooves on
    a line 4 px above the cell's bottom (y 124 in each cell), her body spanning about x 16 to 88 of the cell, drawn as chunky pixels at
    2x (each art pixel a 2 x 2 block). Attack is a headbutt: rear back, charge, butt, recover. Dead: she flops onto her side, comic, not
    gory.
16. goat.png: canvas 288 x 48, one row of six 48 x 48 frames: frames 1 to 3 walking LEFT (frame 2 standing), frames 4 to 6 walking
    RIGHT (frame 5 standing), her hooves on the canvas's bottom edge (y 47).

DUCHESS (15 and 16) must stay recognisably the game's goat: a small white nanny goat in profile, short curved horns, a little beard, a
stubby upturned tail, white coat with soft grey shading, dark hooves; her body about as long as she is tall, her head held a little above
her back. Her costumes are drawn on top of her at fixed points, so in goat.png's RIGHT-facing frames keep: the top of her head between
the horns at x 29 to 35, y 12; her back level at about y 22 to 24 from x 9 to x 26; her hooves on y 47. The LEFT-facing frames are the
same points mirrored. Keep her cute and dignified: she is the court's goat, "Her Grace".

Before you finish, check every file's canvas size is exact, every row has the frame count given, and every figure faces right.
```
