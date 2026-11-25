# ART-GAPS: the ChatGPT prompts

The art that [art-gaps.md](art-gaps.md) found missing, as prompts for ChatGPT. There are more than 80 pieces, so they are split into
three prompts that run one after the other. Each has its own branch and pull request:

1. **Round 3** (`art/round-3`, "Art round 3: missing art"): 31 pieces. The Armies page comes first: seven boss trophies and two
   mid-boss battle sheets. Then the rest of the fight's and menus' stand-ins, and the four pieces already requested.
2. **Round 4** (`art/round-4`, "Art round 4: missing art, part two"): 35 pieces. The named elites, the quest guests, two yokai, the
   nemesis weaknesses and a few small sprites.
3. **Round 5** (`art/round-5`, "Art round 5: the twenty's awakened forms"): 20 heroes, a front and a back sheet each.

Natsu's portrait fix is its own short prompt at the end, because it needs the owner's screenshot attached.

**Already requested (pending), folded into round 3 so the owner has one prompt.** Their prompts are in
[trait-perks-art-prompts.md](trait-perks-art-prompts.md) and [nemesis-depth-art-prompts.md](nemesis-depth-art-prompts.md). They keep
their own paths:

- `art-source/trait-perks/sentry_turret.png`
- `art-source/trait-perks/ghost_ship.png`
- `art-source/trait-perks/crown_mark.png`
- `art-source/nemesis-depth/temperaments.png`

If any of them has already landed by the time round 3 runs, delete its item from the prompt.

None of this art is used until a builder wires it. What each piece needs is in [art-gaps.md](art-gaps.md), "What the wiring builder
will need to change".

## Round 3: missing art

```text
Repository: hpatter9/legends-of-the-fall. Branch: art/round-3, from the latest main (create it). Add exactly the image files listed below
and nothing else: no code, no notes, no version change. Then open ONE pull request into main titled "Art round 3: missing art". In its
body, list every file with its canvas size and grid, and say that every image is original work made for this game.

You are painting missing art for Legends of the Last Keep, a dark gothic fantasy auto-battler played upright on a phone. Small pixel-art
fighters battle on an isometric, Final Fantasy Tactics style board, and the menus are candlelit, ornate and painted. Each piece below
replaces a stand-in: a borrowed sprite, a tinted copy, a text glyph or an empty plaque. Each must sit among its neighbours as one set,
so open the files named on each "Match:" line first and copy their scale, outline, palette and lighting.

GENERAL RULES (every file):
- No text, letters, numbers, logos, watermarks or signatures anywhere in an image.
- Original work only: do not copy or trace any existing game, pack, RPG Maker resource or film.
- Transparent background (real alpha, no checkerboard, no coloured key). The one exception is item 1, the trophies, which are opaque
  paintings like the trophies they join.
- Exact canvas sizes. Cells left over in a grid stay fully transparent (or charcoal, for item 1).
- Sprites (items 2 to 5): crisp pixel art, hard pixel edges, no blur or soft anti-aliasing, a clean dark outline, light from the
  upper left, no ground shadow. Every figure faces RIGHT, and its feet stand on the bottom edge of its cell in every frame, centred so it
  does not jump between frames. Rows run top to bottom in the order given; frames run left to right.
- The standard battle-sheet rows: walk = a steady step cycle; attack = wind-up, strike, recover; idle = a slow breath, almost still;
  hurt = a flinch back; dead = falling, the last frame lying flat on the ground.
- Icons (items 6 to 9): painted to match their neighbours, one bold shape that still reads at 20 to 28 px on a phone, centred in its
  cell with clear space round it.

=== THE ARMIES PAGE (THE WAR ROOM) ===

The War Room shows each army as a card. The card's picture is its final boss's mounted trophy: the boss's helm, mask or token hung on a
carved dark-oak shield with worn brass fittings and a blank brass nameplate. Two armies' bosses have no trophy, so their cards show the
empty plaque, and five mid-bosses have none for the trophy wall.

1. art-source/round3/trophies.png: 1536 x 1536, OPAQUE. A 3 x 3 grid of 512 x 512 cells in reading order (left to right, top row
   first). Each cell is one complete mounted trophy, centred, on the same dark charcoal surround as the existing trophies. Every one is
   the same carved dark-oak shield with brass corner fittings, a brass hanging ring and a BLANK nameplate, warm candlelit painted
   materials. Only the keepsake mounted on it changes.
   Match: src/art/trophies/orcWarlord.webp, lichKing.webp and hornedOgre.webp (and art-source/trophies/champions-2.png, the sheet they
   were cut from), and the empty mount src/art/trophies/locked.webp.
   For each boss's look, see its battle sprite in src/art/units/ (named below).
   1. Boar King (Beast Packs' final boss; boar_king.png): a huge tusked boar's head helm with bristling grey-brown hair, two curved
      ivory tusks and a small iron crown between the ears, a dented olive-green pauldron hung beside it.
   2. Grove Spearlord (the Wildwood's final boss; forest_boss_3.png): a crown of thorny branches and small antlers resting on a broken
      bronze-tipped spear laid across the shield, its spearhead still glowing faint amber.
   3. Orc Chieftain (the Orc Warband's mid-boss; orc_chieftain.png): a war banner's top, a horned skull on a pole with tattered red
      cloth, crossed with a fur-trimmed iron helm.
   4. Alpha Werewolf (the Beast Packs' mid-boss; werewolf_black.png): a black wolf's pelt and head with grizzled silver ruff, bared
      fangs and amber glass eyes, a broken chain collar hanging below.
   5. Thorn Warden (the Wildwood's first boss; forest_boss_1.png): a mossy green troll's mask grown over with bramble, two glowing
      violet and blue mushrooms sprouting from its brow.
   6. Wood Raider (the Wildwood's second boss; forest_boss_2.png): a carved wooden tribal mask with two antlers and violet war paint,
      two hand axes crossed behind it.
   7. Devil Leader (the Infernal Host's mid-boss; devil_leader.png): a black and teal plate helm with two curved red horns, a small
      flame still burning in an iron brazier-cup hung beside it.
   Cells 8 and 9: the charcoal surround only, no shield.

2. art-source/round3/alpha_werewolf.png: 1024 x 480, cells 128 x 96, 8 per row, 5 rows: walk 8, attack 6, idle 4, hurt 3, dead 5.
   Figure about 80 px tall. The Alpha Werewolf, the Beast Packs' mid-boss: a huge black werewolf, bigger and heavier than the pack,
   with a grizzled silver ruff, scars across the muzzle, a broken chain collar and long claws. It runs hunched; its attack is a
   two-claw rend.
   Match: src/art/units/werewolf_black.png (the pack wolf it must outclass) and src/art/units/boar_king.png (a boss's level of detail).

3. art-source/round3/nine_tails.png: 1024 x 480, the same grid as item 2. Figure about 80 px tall. The Nine-Tailed Fox, the Yokai Night
   Parade's mid-boss: a tall white-and-gold fox spirit standing upright in a layered shrine robe, nine fanned tails tipped with blue
   foxfire, a fox mask pushed up on its head. Its attack is a cast: foxfire gathers in a raised palm and flies.
   Match: src/art/units/kitsune.png (the common fox spirit it must outclass) and src/art/units/oni_king.png.

=== THE REST ===

4. Three risen skeletons for the Undead trait's perk. They fight FOR the heroes, so they read as friendly undead: bone-white with
   pale green grave-light in the eye sockets and the joints, wisps of grave mist, scraps of a grave shroud. No foe-red. Each is
   1024 x 480, cells 128 x 96, 8 per row, 5 rows: walk 8, attack 6, idle 4, hurt 3, dead 5 (dead: it collapses into a heap of bones).
   Match: src/art/units/skeleton_warrior.png, skeleton_spearman.png and skeleton_archer.png (same build, same size in the cell), and
   src/art/units/summon_wraith.png (a friendly summon's glow).
   - art-source/round3/summon_grave_warrior.png: figure about 58 px. A sword and a round shield.
   - art-source/round3/summon_grave_spear.png: figure about 82 px. A long spear held two-handed.
   - art-source/round3/summon_grave_archer.png: figure about 64 px. A bone bow; the attack draws and looses.

5. art-source/round3/wanted_mark.png: 128 x 64, two frames of 64 x 64 side by side. A small floating mark that hovers over the foe a
   Frontier hero has marked: a torn parchment bounty notice nailed with a single iron nail, a red wax seal, and a pistol's crosshair
   ring round it. Frame 2 is the same with the ring brighter, for a slow pulse. Readable at 24 px tall.
   Match: art-source/trait-perks/crown_mark.png (if it has landed) and src/art/ui/combat-icon-pistol.png.

6. art-source/round3/council-icons.png: 288 x 96, three icons of 96 x 96 side by side, for the Dark Council's News list.
   1. Hunt: a hunting horn with a red tassel over a single paw print.
   2. Plot: a scroll sealed with black wax, a thin dagger thrust through it.
   3. Spared: a kneeling helm laid down on the ground, a broken sword beside it.
   Match: src/art/council/duel.png, betrayal.png and oath.png (the icons they replace: the same size, outline and muted gothic palette
   with violet, iron and blood-red).

7. art-source/round3/assault-icons-2.png: 768 x 128, six icons of 128 x 128 side by side, for the Assault's war table. They will be
   appended to the twelve icons that are already there.
   1. Send scouts: a spyglass over a folded map.
   2. The ram: a capped iron battering ram on a timber frame.
   3. Main part: a sword upright on a round shield.
   4. Cover part: a raised tower shield with arrows stuck in it.
   5. Flank part: a curved arrow of riders' pennants sweeping round.
   6. Line formation: a row of five shields side by side, seen from above at a slant.
   Match: art-source/release/assault-icons.png (and src/art/ui/release/assault-icons.webp), especially its wall, wedge and loose
   formation icons, which the Line joins.

8. Three quest-giver portraits, each 256 x 256, transparent background, head and shoulders (or the thing, for the first two) centred.
   Match: src/art/quests/hunter-face.png, pedlar-face.png and gwen-face.png.
   - art-source/round3/spoils-face.png: the "spoils" giver is a found thing, not a person: a torn war map pinned with a dagger, a
     red cross on a hold, by candlelight.
   - art-source/round3/rift-face.png: the "rift" giver is a thing too: a jagged violet rift crystal floating, cracked, light pouring out.
   - art-source/round3/duchess-face.png: Duchess, the court's goat: a small white nanny goat in a three-quarter portrait, short curved
     horns, a little beard, soft grey shading, a tiny gold court ribbon at her neck, dignified and a little smug.
     Match also: src/art/duchess/goat.png and src/art/units/duchess_goat.png (her look).

9. art-source/round3/status-curse.png: 96 x 96. The Cursed status icon that floats over a cursed fighter: a violet hexed eye in a
   cracked purple sigil ring, its colour painted in, not tinted.
   Match: src/art/fx/status/atlas.png (the other ailments' icons, 96 px cells, e.g. poison's, so it sits among them).

10. art-source/round3/voltara-after.png: 960 x 160, six frames of 160 x 160 in one row. The aftermath of Voltara, the Eidolon of
    lightning: the last of the storm on the ground, crackling arcs dying away, smoke curling up, the arcs fading out by frame 6.
    Match: src/art/eidolons/fx/askel-after.webp, nivra-after.webp and gorm-after.webp (the other Eidolons' aftermaths), and
    src/art/eidolons/fx/voltara-extra.webp (Voltara's own colours).

=== ALREADY REQUESTED (keep their own paths) ===

11. art-source/trait-perks/sentry_turret.png: 768 x 384, two rows of six 128 x 192 cells. A small clockwork sentry turret, about the
    height of a kneeling soldier: a brass and dark-iron tripod, a rotating drum housing with one stubby rifled barrel, rivets, a glowing
    amber lens and steam vents. Row 1: unfolding from a folded crate into the turret (the last frame its idle pose). Row 2: firing (a
    recoil, a muzzle flash, a puff of steam, back to idle). Facing down-right.
    Match: src/art/units/hero_res_rifle_bot.png and hero_res_siege_bot.png.

12. art-source/trait-perks/ghost_ship.png: 1024 x 512, two frames of 512 x 512 side by side. A spectral pirate galleon seen side-on, its
    broadside facing the viewer: torn glowing sails, a pale green-teal ghost light, wisps trailing off the hull, a row of eight gun
    ports. Frame 1: at rest. Frame 2: every gun port flashing with fire and smoke. Slightly translucent, readable as a silhouette.
    Match: src/art/ult-show/dread-pirate-ghost-ship.webp.

13. art-source/trait-perks/crown_mark.png: 128 x 64, two frames of 64 x 64. A small floating gold crown that hovers over the hero who
    wears the Royal crown: five points, a red gem in the middle, a bright rim light. Frame 2 is the same with a brighter glint on its
    points. Readable at 24 px tall.

14. art-source/nemesis-depth/temperaments.png: 1024 x 512, eight symbols in two rows of four, each centred in its own 256 x 256 cell.
    A 1 px dark outline; muted gothic colours with violet, iron and blood-red accents. In order:
    1. Brute: a spiked iron fist, clenched, cracking the ground beneath it.
    2. Schemer: a hooded eye half-closed, a thin dagger hidden behind it.
    3. Glory-hound: a raised golden trophy cup with a laurel, a single drop of blood on its rim.
    4. Coward: a heel running away, trailing dust, a dropped broken spear.
    5. Zealot: a burning candle in an iron holder, its flame tall and straight.
    6. Oathbound: two hands clasped in a red cord knot, a drop of blood between them.
    7. Trickster: a grinning jester's mask split in two halves, light and dark.
    8. Old Hand: a battered, much-dented helm with a healed scar across it.
    Match: art-source/expansion/nemesis-icons.png and src/art/nemesis-traits/fearless.png and elusive.png.

Before you finish, check every file:
- it is at its exact path;
- its canvas size is exact;
- every row has the frame count given;
- every fighter faces right;
- no image has any text in it.
```

## Round 4: missing art, part two

Run after round 3 has merged.

```text
Repository: hpatter9/legends-of-the-fall. Branch: art/round-4, from the latest main (create it). Add exactly the image files listed below
and nothing else: no code, no notes, no version change. Then open ONE pull request into main titled "Art round 4: missing art, part
two". In its body, list every file with its canvas size and grid, and say that every image is original work made for this game.

You are painting missing art for Legends of the Last Keep, a dark gothic fantasy auto-battler played upright on a phone. Small pixel-art
fighters battle on an isometric, Final Fantasy Tactics style board. Each piece replaces a stand-in. Open the files on each "Match:" line
first and copy their scale, outline, palette and lighting.

GENERAL RULES (every file):
- No text, letters, numbers, logos, watermarks or signatures anywhere in an image.
- Original work only: do not copy or trace any existing game, pack, RPG Maker resource or film.
- Transparent background (real alpha, no checkerboard, no coloured key).
- Exact canvas sizes. Cells left over in a grid stay fully transparent.
- Sprites: crisp pixel art, hard pixel edges, no blur, a clean dark outline, light from the upper left, no ground shadow.

THE TWO FOE GRIDS (items 1 to 3):
- LARGE grid: 1152 x 640, cells 144 x 128, 8 per row, 5 rows: walk 8, attack 6, idle 4, hurt 3, dead 5.
- MEDIUM grid: 1024 x 480, cells 128 x 96, 8 per row, the same 5 rows.

Every foe faces RIGHT, its feet on the bottom edge of its cell in every frame, centred so it does not jump. The rows:
- walk: a steady step cycle;
- attack: wind-up, strike, recover;
- idle: a slow breath;
- hurt: a flinch back;
- dead: falling, the last frame lying flat.

1. Twelve named elites. Each is a champion of a common foe and must read as that foe's kind at a glance, but be clearly someone:
   bigger, better armed, with its own colours.
   Match: the common foe's sheet in src/art/units/ (named in brackets) for the build and size, and src/art/units/boar_king.png for a
   champion's level of detail.
   1. art-source/round4/elite_gorrak.png, LARGE, figure about 100 px [hk_orc_brute.png]: Gorrak, an orc berserker in a bloodied
      iron half-mask, two cleavers, red war paint, scarred bare arms.
   2. art-source/round4/elite_ysolde.png, MEDIUM, figure about 64 px [werewolf_white.png]: Ysolde, a lean white she-wolf
      werewolf with frost-blue eyes and a torn hunter's red hood about her shoulders.
   3. art-source/round4/elite_hollow.png, MEDIUM, figure about 72 px [skeleton_warrior.png]: the Hollow Knight, a skeleton in a
      rusted full knight's helm and breastplate, a tall kite shield with a faded heraldry, a longsword.
   4. art-source/round4/elite_sethra.png, MEDIUM, figure about 80 px [gorgon_2.png]: Sethra, a gorgon matriarch, emerald scales,
      a hood of hissing snakes, a gold serpent circlet, eyes glowing yellow.
   5. art-source/round4/elite_brakka.png, LARGE, figure about 100 px [minotaur_1.png]: Brakka, a hulking minotaur in a spiked bronze
      yoke, one horn capped in iron, a double-bladed axe; its attack is a lowered-head charge.
   6. art-source/round4/elite_cindra.png, LARGE, figure about 112 px [hk_demon.png]: Cindra, a she-demon wreathed in hellfire,
      burning hair, cracked obsidian skin with orange seams, a flaming whip.
   7. art-source/round4/elite_vexor.png, LARGE, figure about 100 px [hk_demon.png]: Vexor, a hunched demon summoner in tattered
      violet robes, a staff topped with a caged imp, small horns, many eyes.
   8. art-source/round4/elite_thrum.png, LARGE, figure about 112 px [hk_ogre.png]: Thrum, a broad grey-skinned ogre with a great
      tree-trunk club bound in iron bands, a necklace of shields.
   9. art-source/round4/elite_nyssa.png, MEDIUM, figure about 80 px [kitsune.png]: Nyssa, a fox witch in a dark green robe, a
      lantern of poison-green foxfire, a veil over her face.
   10. art-source/round4/elite_warden.png, LARGE, figure about 116 px [golem_iron.png]: the Iron Warden, an iron golem plated like
      a fortress gate, a portcullis grille for a face, rivets, a glowing white core.
   11. art-source/round4/elite_kuro.png, MEDIUM, figure about 87 px [karasu_tengu.png]: Kuro, a black crow tengu with a long
      red-lacquered nodachi, a torn straw hat, wide wings spread when it dives.
   12. art-source/round4/elite_silenus.png, MEDIUM, figure about 70 px [satyr_3.png]: Silenus, an old grey-bearded satyr with
      curling ram's horns, a vine wreath and long reed pipes he plays as his attack.

2. art-source/round4/yokai_witch.png, MEDIUM, figure about 78 px [kitsune.png]: the Fox Witch, a fox spirit in a black and
   violet robe with paper talismans hanging from her sleeves. Her attack is a curse thrown from a talisman.
   art-source/round4/yokai_seer.png, MEDIUM, figure about 87 px [karasu_tengu.png]: the Crow Seer, a white-feathered crow
   tengu in a monk's robe, prayer beads, a third eye glowing on its brow. Its attack is a pointed hand.

3. Five quest guests: ordinary folk the heroes must keep alive in a quest battle, so they look like civilians, not heroes. Each guest
   is TWO sheets, the front and the back of the same figure, on the hero grid:
   - Canvas 576 x 840, cells 144 x 120, 4 per row, 7 rows: idle 4; walk 8 (rows 2 and 3); attack 4; hurt 4; dead 4 (the last
     frame lying flat); act 4 (a gesture: waving, pointing, ducking).
   - Figure about 96 px tall, feet on the bottom edge of the cell.
   - The front sheet shows the figure in three-quarter view facing down-right, toward the viewer. The back sheet shows the same figure
     from behind, three-quarter, facing up-right.
   Match: src/art/units/hero_res_peasant.png and hero_res_peasant_back.png (the grid, the front and back views and the pixel style).
   1. art-source/round4/guest_carter.png and guest_carter_back.png: the Carter, a stout middle-aged carter in a brown smock and a
      flat cap, a whip in his belt.
   2. guest_pilgrim.png and guest_pilgrim_back.png: the Pilgrim, a thin pilgrim in a grey hooded cloak, a staff with a scallop
      shell and a small bell.
   3. guest_bosun.png and guest_bosun_back.png: the Bosun, a red-nosed sailor in a striped shirt and a knitted cap, a bottle in
      one hand, swaying.
   4. guest_envoy.png and guest_envoy_back.png: the Envoy, a court envoy in a blue and gold tabard of the Crown, a sealed letter
      case on a strap.
   5. guest_prisoner.png and guest_prisoner_back.png: the Prisoner, a ragged prisoner in torn grey, broken manacles still on both
      wrists.
   (All ten files go under art-source/round4/.)

4. art-source/round4/nemesis-weaknesses.png: 768 x 768, nine symbols in a 3 x 3 grid of 256 x 256 cells, reading order, each centred
   with clear space round it. They show a nemesis's weaknesses beside the words on its card, at 18 to 28 px. A 1 px dark outline;
   muted gothic colours with violet, iron and blood-red accents.
   1. Dread of a hero: a wide-eyed skull with a single tear of cold sweat.
   2. Fears fire: a flame with a cracked shield shying from it.
   3. Fears frost: an icicle shard with frost creeping over a gauntlet.
   4. Fears storm: a lightning bolt splitting a helm.
   5. Fears venom: a green dripping fang over a vial.
   6. Hates heights: a cliff edge with crumbling stones and a dizzy spiral.
   7. Glutton: a gnawed drumstick and an overturned tankard.
   8. Craven: a white rag of surrender tied to a broken spear.
   9. Vain: a hand mirror with a cracked glass and a gold frame.
   Match: src/art/nemesis-traits/fearless.png, elusive.png and the other trait symbols in that folder.

5. art-source/round4/hunted-mark.png: 128 x 128. A small badge on a Council seat whose member is the player's hunted quarry: a red
   hunter's crosshair over a wax-sealed bounty tag.
   Match: src/art/nemesis-traits/fearless.png (size and outline) and art-source/round4/nemesis-weaknesses.png (item 4).

6. art-source/round4/kings-tent.png: 384 x 384, one isometric sprite, its footprint one tile, its ground anchor at bottom centre. The
   player's own war tent in the Assault's camp: a conical canvas tent in the Crown's blue and gold, a gold crown finial on its pole,
   a small royal pennant, rope guy-lines and pegs, the flap tied open.
   Match: the conical orc tent in art-source/assault/orc/orc-09-camp.png (the same scale, angle and pixel style; it now stands in for
   this tent, tinted blue).

7. Two Calamity dungeon tiles, each 64 x 64, pixel art, seamless when tiled in a grid. The Calamity's map is a dungeon seen from above
   at a slant.
   - art-source/round4/calmap-floor.png: worn dark flagstones with ash in the cracks and a faint ember glow.
   - art-source/round4/calmap-walltop.png: the top of a dungeon wall, black basalt blocks with a rim of dull red light.
   Match: src/art/calmap-dungeon/encounters.webp and arrival-portal.webp (the Calamity's own art) and src/art/stand/floor1.png and
   walltop.png (the tiles they replace: their size and the view).

8. Duchess's three costumes. Each is an overlay for her 48 px walking frames: 288 x 48, one row of six 48 x 48 frames, the costume ONLY,
   no goat, placed to sit on her exactly.
   Her points, in the RIGHT-facing frames 4 to 6:
   - the top of her head between the horns is at x 29 to 35, y 12;
   - her back is level at about y 22 to 24, from x 9 to x 26;
   - her hooves are on y 47.
   Frames 1 to 3 face LEFT: the same points mirrored (x becomes 47 - x). The frames step: frames 1 and 3 and 4 and 6 are walking
   steps, frames 2 and 5 are standing, so move the overlay with her by a pixel where she bobs.
   Match: src/art/duchess/goat.png (lay each overlay over it to check the fit).
   - art-source/round4/duchess-crown.png: a tiny gold crown with a red gem on her head.
   - art-source/round4/duchess-wizard.png: a tall floppy blue wizard's hat with gold stars on her head.
   - art-source/round4/duchess-quiver.png: a small leather quiver of three arrows strapped across her back.

Before you finish, check every file:
- it is at its exact path;
- its canvas size is exact;
- every row has the frame count given;
- every foe faces right;
- each guest has both a front and a back sheet;
- no image has any text in it.
```

## Round 5: the twenty's awakened forms

Run after round 4. Each of the twenty newer heroes needs the awakened form the other 45 already have: the same hero in upgraded
legendary gear, a front and a back sheet on the hero's own grid. The packer (`tools/ascended/pack.cjs`) trims and aligns them.

```text
Repository: hpatter9/legends-of-the-fall. Branch: art/round-5, from the latest main (create it). Add exactly the 40 image files listed
below and nothing else: no code, no notes, no version change. Then open ONE pull request into main titled "Art round 5: the twenty's
awakened forms". In its body, list every file with its canvas size, and say that every image is original work made for this game.

Legends of the Last Keep is a dark gothic fantasy auto-battler played upright on a phone, with small pixel-art fighters on an
isometric, Final Fantasy Tactics style board. A hero who is "awakened" keeps who they are but upgrades for good: legendary weapons and
armour, richer colours, a glow in the eyes of the casters, a cape or mantle. Twenty heroes have no awakened form yet.

GENERAL RULES:
- No text, letters, numbers, logos, watermarks or signatures.
- Original work only.
- Transparent background (real alpha).
- Crisp pixel art, hard pixel edges, no blur, a clean dark outline, light from the upper left, no ground shadow.

Match, before you start:
- src/art/awakened/awakened_knight.png with awakened_knight_back.png, and awakened_paladin.png with its _back: how much an awakened
  form changes and how much it keeps.
- Each hero's own base sheets, src/art/units/hero_res_<name>.png and hero_res_<name>_back.png: the identity, the pose of every frame
  and the grid, to keep exactly.

EVERY SHEET: the hero's own grid, given below as cell width x height. 4 cells per row, 7 rows, so the canvas is 4 x width by 7 x height:
- row 1: idle 4;
- rows 2 and 3: walk 8;
- row 4: attack 4;
- row 5: hurt 4;
- row 6: dead 4 (the last frame lying flat);
- row 7: ability 4.

The figure is about 96 px tall, its feet on the bottom edge of its cell. Copy each base frame's pose; change the gear, not the motion.
The front sheet is three-quarter facing down-right; the back sheet is the same figure from behind, three-quarter facing up-right.

Files, all under art-source/round5/: awakened_<kind>.png and awakened_<kind>_back.png for each of these (kind, base sheet name, cell,
canvas, what the awakening adds):
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
17. seraph, seraph, 158 x 107, 632 x 749: a winged guardian; six white wings edged in gold, a radiant spear and a white and gold
    plate.
18. corsairSurgeon, corsair_surgeon, 134 x 110, 536 x 770: a reef sawbones; a gilded bone saw, a coral-red coat, a glowing tonic
    bandolier.
19. harpooner, harpooner, 152 x 113, 608 x 791: a floe whaler; a harpoon of blue ice, a white fur and whalebone armour.
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

Canvas 1024 x 2048 (upright, 1:2), the same painted background as the current portrait (it is an opaque painting, not a cut-out),
the whole figure in frame from the top of her head to her feet. This item is the one exception to a transparent background. No text, letters, logos or signatures.
Match: src/art/heroes/archer.webp and src/art/heroes/archer-portrait.webp (the painting being fixed), and the other heroes' paintings
in src/art/heroes/ for the style.
```
