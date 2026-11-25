# ART-REMAINING: the ChatGPT prompts for the art still missing

PIXELLAB-ART (0.616.0, [pixellab-art.md](pixellab-art.md)) made most of [art-gaps.md](art-gaps.md)'s list. This page is the rest,
as ChatGPT prompts. They were checked against main at 0.617.0. When the art lands, [art-remaining-wiring.md](art-remaining-wiring.md)
says how to wire it.

There are 56 pieces, too many for one prompt, so they run as two prompts, one after the other:

1. **Round 4** (`art/round-4`, "Art round 4: the rest"): 16 pieces.
   - The five quest guests, a front and a back sheet each.
   - The Machine's sentry turret.
   - The Pirate's ghost ship.
   - Voltara's aftermath.
   - Duchess's three cosmetic overlays.
2. **Round 5** (`art/round-5`, "Art round 5: the twenty's awakened forms"): 40 pieces. These are the twenty newer heroes' awakened
   battle sheets, a front and a back each.

Natsu's portrait fix is its own short prompt at the end. Send it with the owner's screenshot attached.

**Left out on purpose:**

- **Already done by PixelLab:** the trophies, the mid-bosses, the elites, the yokai, the grave skeletons, the marks, the icons and
  the quest faces.
- **The assault icons and the king's tent:** the Assault is gone.
- **The Calamity's tiles:** the Calamity is hidden.
- **Duchess's three shop costumes** (`costume_regalia`, `costume_knight` and `costume_lantern`): they are already in
  `art-source/round2/`, and the cosmetics builder is wiring them. Round 4's three overlays are her other three: the Tiny Tin Crown,
  the Wizard Hat and the Archery Quiver. Those are still drawn in code.

The grids below are read from `src/art/units/sheets.json`. The guests' cells are **160 x 120** (the peasant hero's grid). The
144 x 120 in the old art-gaps prompt was wrong.

## Round 4: the rest

```text
Repository: hpatter9/legends-of-the-fall. Branch: art/round-4, from the latest main (create it). Add exactly the image files listed below
under art-source/round4/ and nothing else: no code, no notes, no version change. Then open ONE pull request into main titled "Art round
4: the rest". In its body, list every file with its canvas size and grid, and say that every image is original work made for this game.

You are painting missing art for Legends of the Last Keep, a dark gothic fantasy auto-battler played upright on a phone. Small pixel-art
fighters battle on an isometric, Final Fantasy Tactics style board. Each piece replaces a stand-in: a borrowed sprite, a tinted copy or
pixels drawn in code. Open the files named on each "Match:" line first and copy their scale, outline, palette and lighting.

GENERAL RULES (every file):
- No text, letters, numbers, logos, watermarks or signatures anywhere in an image.
- Original work only: do not copy or trace any existing game, pack, RPG Maker resource or film.
- Transparent background (real alpha, no checkerboard, no coloured key).
- Exact canvas sizes. Cells left over in a grid stay fully transparent.
- Sprites: crisp pixel art, hard pixel edges, no blur or soft anti-aliasing, a clean dark outline, light from the upper left, no ground
  shadow. A figure's feet stand on the bottom edge of its cell in every frame, centred, so it does not jump between frames.
- Keep each figure the same from frame to frame and row to row: the same clothes, the same weapon or tool, the same colours and the
  same size. Only the pose changes.

1. THE FIVE QUEST GUESTS. Ordinary folk the heroes must keep alive in a quest battle, so they look like civilians, not heroes. Each guest
   is TWO sheets, the front and the back of the same figure, on the hero grid:
   - Canvas 640 x 840, cells 160 x 120, 4 per row, 7 rows in this order: idle 4; walk 8 (rows 2 and 3); attack 4 (a feeble swing or
     shove); hurt 4; dead 4 (the last frame lying flat); act 4 (a gesture: waving, pointing, ducking).
   - The figure is about 96 px tall, its feet on the bottom edge of its cell.
   - The front sheet is three-quarter view facing down-right, toward the viewer. The back sheet is the same figure from behind,
     three-quarter, facing up-right. Same size and same frame timing as the front.
   Match: src/art/units/hero_res_peasant.png and hero_res_peasant_back.png (the grid, the front and back views and the pixel style);
   src/art/units/hero_res_wanderer.png, hero_res_buccaneer.png, hero_res_priestess.png and hero_res_druid.png (the stand-ins now used
   for the Pilgrim, the Bosun, the Envoy and the Prisoner: the same scale, but these must look like plain folk).
   1. art-source/round4/guest_carter.png and guest_carter_back.png: the Carter, a stout middle-aged carter in a brown smock and a flat
      cap, a coiled whip at his belt.
   2. art-source/round4/guest_pilgrim.png and guest_pilgrim_back.png: the Pilgrim, a thin pilgrim in a grey hooded cloak, a staff
      with a scallop shell and a small bell.
   3. art-source/round4/guest_bosun.png and guest_bosun_back.png: the Bosun, a red-nosed sailor in a striped shirt and a knitted cap,
      a bottle in one hand, swaying.
   4. art-source/round4/guest_envoy.png and guest_envoy_back.png: the Envoy, a court envoy in a blue and gold tabard of the Crown, a
      sealed letter case on a strap.
   5. art-source/round4/guest_prisoner.png and guest_prisoner_back.png: the Prisoner, a ragged prisoner in torn grey, broken
      manacles still on both wrists.

2. art-source/round4/sentry_turret.png: 768 x 480, cells 128 x 96, 6 per row, 5 rows. The Machine trait's sentry turret, a small
   clockwork gun the heroes' engineers set up: about the height of a kneeling soldier, about 60 px tall when standing. A brass and
   dark-iron tripod, a drum housing with one stubby rifled barrel, rivets, a glowing amber lens and little steam vents. It faces RIGHT.
   The rows, in this order:
   - deploy 6: unfolding from a folded brass crate into the turret; the last frame is its standing pose.
   - attack 5: firing: a recoil, a muzzle flash, a puff of steam, back.
   - idle 6: standing, the lens glowing brighter and dimmer, the drum turning a little.
   - hurt 4: struck, sparks and a jolt.
   - dead 5: breaking apart, the last frame a heap of scrap lying on the ground.
   Match: src/art/units/hero_res_rifle_bot.png and hero_res_siege_bot.png (the game's machines: the brass, the iron, the outline) and
   src/art/units/robot_infantry.png (the sheet it now borrows; the same cell layout and row lengths).

3. art-source/round4/ghost_ship.png: 1024 x 512, two frames of 512 x 512 side by side. The Pirate trait's Broadside: a spectral pirate
   galleon seen side-on, its broadside facing the viewer, bow to the right. It has torn glowing sails, a pale green-teal ghost light,
   wisps trailing off the hull and a row of eight gun ports.
   - Frame 1: at rest.
   - Frame 2: every gun port flashing with fire and smoke.
   It is slightly translucent and readable as a silhouette over the battlefield's edge. It may be painted rather than pixel art.
   Match: src/art/ult-show/dread-pirate-ghost-ship.webp (the Dread Pirate's own ghost ship: the same ship's look, so the two read as one
   fleet).

4. art-source/round4/voltara-after.png: 960 x 160, six frames of 160 x 160 in one row. The aftermath of Voltara, the Eidolon of
   lightning: the last of the storm on the ground, scorched cracks with crackling violet-white arcs dying away and smoke curling up. The
   arcs are gone by frame 6, leaving only a faint wisp.
   Match: src/art/eidolons/fx/askel-after.webp, nivra-after.webp and gorm-after.webp (the other Eidolons' aftermaths: the same size,
   the same placing on the ground, the same fade), and src/art/eidolons/fx/voltara-extra.webp (Voltara's own colours).

5. DUCHESS'S THREE COSMETICS. Duchess is the court's small white goat; she wanders the tavern, the castle and the camp, and the player can
   dress her in a cosmetic. Each cosmetic is an OVERLAY for her walking strip, the costume ONLY with no goat, placed to sit on her exactly:
   288 x 48, one row of six 48 x 48 frames, the same frames as her strip.
   - Her strip is src/art/duchess/goat.png: frames 1 to 3 walk LEFT, frames 4 to 6 walk RIGHT; frames 1 and 4 are her standing pose.
   - Her points, in the RIGHT-facing frames: the top of her skull, behind the horns, is at x 22 to 31, y 18 (a hat's brim sits at y 16
     to 17). Her back is level at about y 32, and her hooves are on y 47. In the left-facing frames the same points are mirrored
     (x becomes 47 - x).
   - Lay each overlay over goat.png frame by frame and move it with her by a pixel where she bobs.
   Match: src/art/duchess/goat.png (lay each overlay over it to check the fit) and src/art/units/duchess_goat.png (her look up close).
   - art-source/round4/duchess-crown.png: the Tiny Tin Crown, a slightly crooked tin coronet with a tiny ruby, perched on her head.
   - art-source/round4/duchess-wizard.png: the Wizard Hat, a tall floppy blue wizard's hat with gold stars, tilted back on her head.
   - art-source/round4/duchess-quiver.png: the Archery Quiver, a small leather quiver of three arrows slung diagonally across her back.

Before you finish, check every file:
- it is at its exact path;
- its canvas size is exact;
- every row has the frame count given;
- every guest has both a front and a back sheet;
- the turret faces right;
- the overlays line up with goat.png;
- no image has any text in it.
```

## Round 5: the twenty's awakened forms

Run this after round 4 has merged. Each of the twenty newer heroes needs the awakened battle sheets the other heroes already have.
The awakened form is the same hero in upgraded legendary gear, as a front and a back sheet on the hero's own grid. Their painted
awakened portraits are already in the game (`art-source/heroes-20/awakened/`), so each sheet copies its portrait's gear and colours.

```text
Repository: hpatter9/legends-of-the-fall. Branch: art/round-5, from the latest main (create it). Add exactly the 40 image files listed
below under art-source/round5/ and nothing else: no code, no notes, no version change. Then open ONE pull request into main titled "Art
round 5: the twenty's awakened forms". In its body, list every file with its canvas size, and say that every image is original work made
for this game.

Legends of the Last Keep is a dark gothic fantasy auto-battler played upright on a phone, with small pixel-art fighters on an
isometric, Final Fantasy Tactics style board. A hero who is "awakened" keeps who they are but upgrades for good: legendary weapons and
armour, richer colours, a glow in the eyes of the casters, a cape or mantle. Twenty heroes have no awakened battle sheets yet.

GENERAL RULES:
- No text, letters, numbers, logos, watermarks or signatures.
- Original work only.
- Transparent background (real alpha).
- Crisp pixel art, hard pixel edges, no blur, a clean dark outline, light from the upper left, no ground shadow.
- The same gear, weapon, colours and size in every frame and on both sheets: only the pose changes.

Match, before you start:
- src/art/awakened/awakened_knight.png with awakened_knight_back.png, and awakened_paladin.png with its _back: how much an awakened
  form changes and how much it keeps.
- Each hero's own base sheets, src/art/units/hero_res_<name>.png and hero_res_<name>_back.png: the identity, the pose of every frame
  and the grid, to keep exactly.
- Each hero's painted awakened portrait, art-source/heroes-20/awakened/<kind>.png: the awakened gear and colours to bring to the sheet.

EVERY SHEET is on the hero's own grid, given below as cell width x height. There are 4 cells per row and 7 rows, so the canvas is
4 x width by 7 x height. The rows, in this order:
- row 1: idle 4;
- rows 2 and 3: walk 8;
- row 4: attack 4;
- row 5: hurt 4;
- row 6: dead 4 (the last frame lying flat);
- row 7: ability 4.

The figure is about 96 px tall, its feet on the bottom edge of its cell. Copy each base frame's pose; change the gear, not the motion.
The front sheet is three-quarter view facing down-right; the back sheet is the same figure from behind, three-quarter, facing up-right.

The files, all under art-source/round5/, are awakened_<kind>.png and awakened_<kind>_back.png for each hero below. Each line gives the
kind, the base sheet name, the cell, the canvas, and what the awakening adds:
1. vampireLord, vampire_lord, 156 x 118, 624 x 826: a crimson and gold vampire count; a blood-red crystal rapier, a tall winged collar.
2. hemomancer, hemomancer, 134 x 110, 536 x 770: a blood mage; floating blood orbs, a bone-and-ruby circlet, glowing red eyes.
3. nightstalker, nightstalker, 168 x 128, 672 x 896: the Strigoi, a winged night-hunter; larger tattered wings with silver claws, a
   moon-silver chest plate.
4. bloodGargoyle, blood_gargoyle, 154 x 100, 616 x 700: a stone gargoyle; cracks of glowing blood-red, a carved crown of horns.
5. dhampir, dhampir, 144 x 105, 576 x 735: a silver-bolt hunter; a silver-chased repeating crossbow, a long grey coat with silver trim.
6. warDrummer, war_drummer, 156 x 113, 624 x 791: a taiko master; a great lacquered drum with a gold dragon, red and gold armour.
7. banneret, banneret, 154 x 109, 616 x 763: a rampart warden; a taller gilded standard, a heraldic shield, a plumed helm.
8. geomancer, geomancer, 132 x 108, 528 x 756: a crag-shaper; floating stones round him, a staff of a single crystal, glowing amber
   eyes.
9. bellWarden, bell_warden, 152 x 109, 608 x 763: a bronze bell keeper; a bigger bell engraved with runes, a temple mantle.
10. falconer, falconer, 134 x 116, 536 x 812: a highland hawker; a golden falcon with storm-blue wingtips, a feathered mantle.
11. astralSphinx, astral_sphinx, 204 x 125, 816 x 875: a star-lioness; wings of starlight, constellations in her mane, glowing eyes.
12. mirageDancer, mirage_dancer, 142 x 99, 568 x 693: a dune dancer; flowing veils of shimmering gold, twin curved blades of glass.
13. plagueDoctor, plague_doctor, 134 x 103, 536 x 721: an ash apothecary; a brass-beaked mask, a censer of green smoke, a crow
    feather cape.
14. bombardier, bombardier, 136 x 103, 544 x 721: an iron alchemist; a brass rocket pack, a bandolier of glowing shells.
15. astrologer, astrologer, 138 x 118, 552 x 826: a star-keeper; an orrery floating over one hand, a midnight robe sewn with stars,
    glowing eyes.
16. inquisitor, inquisitor, 144 x 110, 576 x 770: a sun-judge; a radiant halo-crown, gold chains, a blazing sword.
17. seraph, seraph, 158 x 107, 632 x 749: a winged guardian; six white wings edged in gold, a radiant spear, white and gold plate.
18. corsairSurgeon, corsair_surgeon, 134 x 110, 536 x 770: a reef sawbones; a gilded bone saw, a coral-red coat, a glowing tonic
    bandolier.
19. harpooner, harpooner, 152 x 113, 608 x 791: a floe whaler; a harpoon of blue ice, white fur and whalebone armour.
20. seaReaver, sea_reaver, 150 x 115, 600 x 805: a hull-breaker; a barnacled golden anchor, sea-green armour streaming water.

Before you finish, check that:
- all 40 files are present;
- each canvas is exactly the size given;
- every frame keeps its base frame's pose;
- the front and back of each hero are the same figure at the same size;
- no image has any text in it.
```

## Natsu's portrait fix (its own prompt)

Attach the owner's screenshot of Natsu showing one leg when you send this.

```text
Repository: hpatter9/legends-of-the-fall. Branch: art/natsu-fix, from the latest main (create it). Add exactly one file,
art-source/fix/natsu-archer.png, and nothing else. Open one pull request into main titled "Art: Natsu's portrait fix", and say there
that the image is original work made for this game.

The attached screenshot shows Natsu, the Archer of Legends of the Last Keep, in her full painted portrait: she shows only one leg. Repaint
the portrait so that both legs are clearly drawn, in a natural, balanced archer's stance. Keep everything else exactly as it is: her
face, her hair, her outfit and colours, her bow and quiver, the pose of her upper body and the painted style.

The canvas is 1024 x 2048 (upright, 1:2), with the same painted background as the current portrait: it is an opaque painting, not a
cut-out. The whole figure is in frame, from the top of her head to her feet. This item is the one exception to a transparent
background. No text, letters, logos or signatures.
Match: src/art/heroes/archer.webp and src/art/heroes/archer-portrait.webp (the painting being fixed), and the other heroes' paintings
in src/art/heroes/ for the style.
```
