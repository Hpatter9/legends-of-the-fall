# Credits

Most of the art is from free **Craftpix.net** packs (craftpix.net, free licence: use in games allowed, no redistributing
the raw files), copied one sprite at a time from the private assets repository (`hpatter9/chronos-assets`).

- **The heroes and the skeletons** (`src/art/units/`): the Free Knight, Samurai, Ninja, Wizard and Skeleton Sprite
  Sheets, as cut into one small sheet each by Chronos Settlement's `tools/compose-sheets.cjs`: Knight 1, Samurai,
  Kunoichi, Samurai Archer, Fire Wizard, Skeleton Warrior, Skeleton Spearman, Skeleton Archer; and from the Free
  Werewolf, Gorgon, Minotaur and Satyr Sprite Sheets, all three of each. Knight 2 and 3, Samurai Commander, Ninja Monk, Ninja Peasant, Lightning Mage,
  Wanderer Magician (Free Wizard Sprite Sheets) and Kitsune, Karasu Tengu, Yamabushi Tengu (Free Yokai Character Sprites)
  are copied in for more heroes and their evolved looks. The Werewolf, Minotaur, Satyr and Gorgon heroes use the same
  sheets (the other colours at grades 2 and 3), and the Samurai Commander is the one copied in above. The arrows
  (`src/art/fx/arrow.png`, `bone_arrow.png`) are the Samurai Archer's and the Skeleton Archer's own.
- **The ground** (`src/art/ground/`): the grass tops (`grass1.png`, `grass2.png`) are cut from the Fantasy 2D
  Battlegrounds pixel pack (Battleground 1, Bright, `stones&grass.png`) and the stone tops (`stone.png`) from its
  Battleground 4 `ground.png`; the column sides (`rock.png`) are a strip of the Free Undead Tileset's
  `Ground_rocks.png`. The boulders and bushes are still from the Free Fields Tileset for tower defence.
- **The backdrop** (`src/art/backdrop/m1_1..5.png`): the Free Mountain Backgrounds pixel pack, set m1 (sky, clouds,
  peak, far hills, near hills), moved in layers as the board is panned. The app icon is from the Free Autumn Pixel
  Backgrounds (background 1).
- **Effects** (`src/art/fx/impact.png`, `hit_fire.png`, `blast.png`): the hit sparks, fire hit and blast from the
  **Super Pixel Effects Gigapack (Free Version)** by unTied Games, as Chronos Settlement cut them
  (`src/renderer/art/effects/`).
- **Item icons** (`src/art/items/`): single 16x16 tiles cut from the **DawnLike** tileset by DragonDePlatino (Items: Armor, Amulet, Boot, Hat, LongWep, Ring, Shield), for relics and gear.
  The ten relics of the tower's relic sets (Ember Ruby, Dragon Scale, Frost Sapphire, Winter Cloak, Holy Chalice, Saint's Medal, Shadow Cloak, Viper Fang, Wolf Fang, Beast Harness) reuse tiles of the same tileset already cut for the equipment (`src/art/equip/`), copied one a file (CC-BY 4.0).
- **Tower map icons** (`src/art/rogue/`): single 16x16 tiles cut from the **DawnLike** tileset by DragonDePlatino (Effect0, Money, GUI1, Potion, LongWep; crossed swords is the sword tile and its mirror), by `tools/rogue-icons.py` (CC-BY 4.0).
- **Tower map backdrop** (`src/art/tower/`, cut by `tools/tower-art.py`): the brick (`brick.png`, tinted warm and cold for `brick2.png` and `brick3.png`), the barred window, the small window and the wall torch frames (`window.png`, `slit.png`, `torch.png`, glow disc dropped) from the Craftpix **Free 2D Top-Down Pixel Dungeon Asset Pack** (`walls_floor.png`, `fire_animation.png`); the cloud strips (`cloud_*.png`) from the Craftpix **Free Clouds Pixel Art Asset Pack** (white, gray and black, Shape2); and the far peaks (`peaks.png`) from the Craftpix **Free Mountain Peak Pixel Art Backgrounds** (background 3, Plan 2). The banners are the castle banner already in `src/art/castle/`.
- **Floor twist icons** (`src/art/twists/`) and the four legendary relics' icons (`src/art/items/sun_crown.png`, `dragon_heart.png`, `storm_ring.png`, `void_lens.png`): single 16x16 tiles cut from the same **DawnLike** tileset by DragonDePlatino (Effect0, Potion, Rock, Money, Boot, ShortWep, Hat, Shield, Amulet, Ring), by `tools/twist-icons.py` (CC-BY 4.0).
- **The Calamity relic sets' icons** (`src/art/items/`: Thunder Horn, Cloud Treads, Thunder Pendant, Tempest Ring, Granite Heart, Moss Amulet, Stone Gauntlet, Earthen Bell, Blood Vial, Bloodstone Ring, Reaver Helm, Ruby Locket, Star Chart, Comet Shard, Moon Lantern, Astral Circlet, Coin Hoard, Gilded Ingot, Jewelled Crown, Gold Band, Rift Shard, Void Sigil, Doom Helm, Last Light): single 16x16 tiles cut from the same **DawnLike** tileset by DragonDePlatino (Items: Music, Boot, Amulet, Ring, Glove, Potion, Hat, Book, Money), by `tools/relic-icons.py` (CC-BY 4.0).
- **Equipment icons** (`src/art/equip/`): 16x16 tiles cut one tile each from the same **DawnLike** tileset by DragonDePlatino (Items: LongWep, ShortWep, Ammo, Wand, Book, Scroll, Armor, Amulet, Ring, Boot, Glove, Hat, Music, Potion, Rock, Tool), by `tools/equip-icons.py`, for the hero equipment (CC-BY 4.0).
- **Army chests** (`src/art/ui/chest-bronze.png`, `chest-silver.png`, `chest-gold.png`): the chest (closed and open frames) from the Craftpix **Free Platformer Game Tileset Pixel Art** pack (`chest.png`), cropped, with its iron bands tinted bronze, silver and gold by a script (hue shifts only). The **daily chest** (`src/art/ui/chest-daily.png`) is the silver chest with its wood hue-shifted to violet. The army scenes on the Armies screen use the foes' existing sprite sheets and the land backdrops, with no new art.

Code borrowed from Chronos Settlement (`hpatter9/little-town`): the seeded random numbers (`src/sim/rng.ts`), the
board's relief, step and sight rules (`src/sim/board.ts`), the blow and reach rules (`src/sim/battle.ts`), the
isometric column drawing (`src/render/boardView.ts`), `loadImage` and the battle juice rules.

- **The music** is synthesised: three loops written as notes in `src/render/musicScore.ts` and rendered in the page by `src/render/musicBake.ts`. No files were copied for it. (Before 0.134 the game played the Tiny RPG Music tracks by Luis Zuno (@ansimuz) from `hpatter9/chronos-assets`; they are gone from the build but remain in the git history.)
- **The sound effects** are synthesised in `src/render/audioProcessors.ts` with the Web Audio API; no files were copied for them.

## Areas (`src/art/areas/`, cut by `tools/areas-prep.py`)

- **Backdrops** (`<area>/bgN.png`, as parallax layers): Forest from the Forest and Trees pixel backgrounds (set 1);
  Snowfields from the Free Winter Backgrounds (set 8); Desert from the Desert Oasis pixel background pack (background
  3); Volcano from the same Winter Backgrounds (set 6) with its sky and hills recoloured; Dungeon from the Crystal Cave
  pixel backgrounds (background 3). All Craftpix.
- **Ground** (`top1/2.png`, `high.png`, `side.png`, `common/water.png`, `ice.png`, `lava.png`): the highlands grass and
  stone tops and the Undead Tileset's rock face (as above), recoloured for each area.
- **Rocks** (`boulder1/2.png`): the Free Rocks pixel art pack (middle lane rocks, snowy rocks, desert rocks, stalagmites,
  cave rocks). **Tall growth** (`tall1/2.png`): the Fields Tileset's grass tufts, recoloured; the dungeon's are two
  mushrooms of the Free Top-Down Cave Objects pack.

### The eleven newer lands (`src/art/areas/<land>/`, cut by `tools/lands-prep.py`)

All Craftpix, copied one sprite or layer at a time; no PixelLab. Ground tops and sides are the highlands textures recoloured per land, as above.

- **Backdrops** (`bgN.png`): Meadows from Free Summer Pixel Art Backgrounds (summer 7); Autumn Wood from Free Autumn Pixel Backgrounds (background 1); Mire from the Fantasy 2D Battlegrounds pack (Battleground 3, Pale, graded); Graveyard from the same pack (Battleground 4, Pale, graded); City Ruins from Free City Ruin Backgrounds (background 4, toned); Ancient Temple from Free Ancient Temple Pixel Game Backgrounds (background 1); Crystal Caves from Free Crystal Cave Pixel Art Backgrounds (background 4); Forge from Free Steampunk Cityscape Pixel Backgrounds (background 1, recoloured to embers); Moonlit Shrine from the Abandoned Places Background Collection (background 4, graded for night) over the Free Moon Pixel Game Backgrounds (set 4, sky and moon); War Camp from the Free Post-Apocalyptic Pixel Art Game Backgrounds (set 1, Bright); Oasis from the Desert Oasis pack (background 1).
- **Boulders** (`boulderN.png`, the props that block a tile): Meadows, Autumn Wood and Oasis from the Free Rocks pack and the Rocky Area Objects pack (oval rocks, middle lane rocks); Mire from the Undead Tileset (broken tree) and the Rocky Area Objects (orange mushrooms); Graveyard from the Undead Tileset (gravestones, a pile of skulls); City Ruins from the Undead Tileset (ruins, rock); Ancient Temple from the Rocky Area Objects (stone pyramid recoloured to sandstone, a rock statue); Crystal Caves from the Crystal Caves platformer tileset (the crystal pillar) and the Undead Tileset (crystals, hue-shifted); Forge from the Village Tileset for top-down defence (an anvil and a barrel); Moonlit Shrine from the Rocky Area Objects (the fox statue) and the Village Tileset (a lamp post); War Camp from the Medieval Field Work platformer tileset (the two palisade fences) and the Rocky Area Objects (a yurt).
- **Tall growth** (`tallN.png`): the Fields Tileset's tufts recoloured (Meadows, Autumn Wood, Forge, Moonlit Shrine, War Camp, Oasis); the Undead Tileset's plants and thorn plants (Mire, Graveyard, City Ruins); the Rocky Area Objects' fern trees (Ancient Temple); two of the Top-Down Cave Objects mushrooms, hue-shifted (Crystal Caves).
- **Weather** (`src/render/weatherView.ts`) is drawn with plain rectangles and one soft glow; no files were copied for it.

## More foes and bosses (copied in for the boss stages and new bands)

- The orc warband (grunt, archer, brute, warlord), demons, demon lord, imp and ogres (`src/art/units/hk_*.png`) are
  **generated with PixelLab** (see below), drawn to match the Craftpix fighters; the Himeko Sutori sheets they replace are gone.
- The three forest bosses are from Craftpix's **Free Forest Bosses**; the Boar King, Devil Leader and Shaman King from
  Craftpix's **Free Fantasy RPG Top-Down Boss Creatures**.

## The class heroes (`src/art/units/cls_*.png`)

- The Paladin, Cleric, Druid, Barbarian, Ranger, Warlock, Illusionist and Gunslinger (three looks each, one per grade) are
  **generated with PixelLab** (see below). The Himeko Sutori layered sheets they replace are gone, so
  `tools/compose-class-heroes.cjs` no longer makes the `cls_*` hero sheets.
- The **Golem Forge** army's golems (`golem_stone/iron/crystal/magma/sapphire/forge.png`) are figures 6, 18, 20, 27, 32 and 15 of the same **Golems and elementals** pack by batareya (no licence file in the pack folder: check the author's terms before any public release). The pack has only still figures, so `tools/golems/cut.py` moves each by whole pixels for the walk, attack, idle, hurt and dead rows, with a last lying frame made by an exact 90-degree turn; nothing is resampled. The **Yokai Night Parade** troops and the Nine-Tailed Fox use the Kitsune, Karasu Tengu and Yamabushi Tengu sheets (Free Yokai Character Sprites, Craftpix) listed above.
- The **foes remade for the art cleanup** (`forest_boss_1-3`, `boar_king`, `devil_leader`, `shaman_king`, `golem_*`, `satyr_1-3`) and the new **walk and hurt rows of the 16 remade heroes** are generated the same way (PixelLab: bases from Craftpix style references, `/animate-with-text-v3` clips, native pixels, hard alpha, lying last death frame by `lie.py`). Tools: `tools/pixellab/foes/` and `tools/pixellab/heroes/polish.py`; see `docs/notes/art-cleanup.md`.
- The Druid's treant (`cls_treant.png`) is one picture from the **Golems and elementals** pack by batareya (the pack folder has no licence file: check the author's terms before any public release).

- **The home screen** (`src/art/home/castle.png`): the Fantasy 2D Battlegrounds pixel pack (Craftpix), Battleground 2
  (Bright), `Battleground2.png`, scaled to half size.

## Magic effects (the spells, the skills and the crits)

- **The skill, spell and hit effects** (`src/art/fx/magic/`, 22 sheets of six 32px frames each, copied unchanged from the
  `sheet-32.png` strips of the **5000 Pixel Effects** pack by blueberry (`pixel-effects/sprites/<effect>/`, from the
  private assets repository): light gather, light nova and circle, wind vortex, wave, burst and strike, earth shield,
  burst, explosion and wave, ice shield, fire circle and explosion, gold, white and blood bursts, dark circle and slash,
  moon slash, lightning burst and strike, and the pink heart. The pack's licence allows use in games, commercial ones
  included; credit appreciated (https://blueberry-assets.itch.io). Mapped to skills and spells in `src/render/skillFx.ts`.

## Fight effects (`src/art/fx/vfx/`)

- 27 Pixel Effects strips (six 32px frames each, copied unchanged from `pixel-effects/sprites/<effect>/sheet-32.png` in
  the private assets repository, the **5000 Pixel Effects** pack by blueberry, https://blueberry-assets.itch.io): light,
  earth, wind slashes; white, gold, wind, fire, ice, sand and blood puffs; white and gold dust; water ripple and splash;
  fire sparkle and flame; white dash; light hit; dark smoke; light pillar; gold level-up; light sparkle; white sparkle;
  gold star; and the burning, bleeding, hasted and shielded-icon status strips. Used by `src/render/vfxArt.ts`.

## Combat effects (`src/art/fx/pack/`)

- **The projectile, impact, wind-up, status and death effects**: 225 32px strips (up to eight frames each) of the **5000
  Pixel Effects** pack by blueberry (https://blueberry-assets.itch.io), packed side by side into one picture
  (`atlas.png`, with `atlas.json` naming each strip's place) by `tools/fx-atlas.py` from the private assets repository's
  `pixel-effects/sprites/<effect>/sheet-32.png`; the frames are unchanged. Fire, ice, lightning, light, dark, forest,
  poison, earth, wind and blood each have orb, hit, explosion, slash, circle, rune, shield, status, gather, nova, cross,
  puff, smoke, sparkle, aura, vortex, pillar, strike, spikes, wave and flame strips; star, water and moon have orb, hit,
  explosion, slash and sparkle. Used by `src/render/fxSheets.ts`.

- **The spell props** (`src/art/fx/props.png`): twelve 32x32 sprites (a crow feather, a gold coin, a music note, a roll of
  bandage, a fist, a ghost, an anchor, a cannonball, a leaf, a paw print, a scythe and a banner) **generated with PixelLab**
  (`/create-image-pixflux`, the game's warm palette; `tools/fxlab/genprops.py`, the chosen frames kept in `tools/fxlab/props/`),
  thrown by the heroes' skills and ultimates (`src/render/signatures.ts`, `docs/notes/unique-spells.md`). Every other effect
  in those looks is a strip of the Pixel Effects pack above.

- **Fonts** (`out/web/fonts/`, copied by `build.mjs` from the `@fontsource` npm packages, all under the SIL Open Font
  Licence 1.1): **Cinzel Decorative** (Natanael Gama; titles, banners and big buttons), **Alegreya Sans** (Juan Pablo
  del Peral, Huerta Tipográfica; body text) and **Press Start 2P** (CodeMan38; counters and damage numbers).

## The pixel UI (`src/art/ui/`, `src/pixel.css`)

- **Frames, buttons, bars, ribbons, the wood tile, the card back and the war-banner flag** (`src/art/ui/*.png` except `tab-*` and
  `ic-*`): drawn natively at their final size by `tools/ui/frames.py` (our own pixel art, in the game's brown and gold palette),
  shown as CSS 9-slices at whole-number scales.
- **The tab icons** (`tab-*.png`) and **the gold, crown, gear, sound, mute and trophy icons** (`ic-*.png`): 32x32 pixel art
  generated with PixelLab (`tools/ui/genicons.py`), used as they came.
- **Pixelify Sans** (Stefie Justprince; SIL Open Font Licence 1.1), from the `@fontsource/pixelify-sans` npm package: the
  text font for the whole interface (`out/web/fonts/`). Press Start 2P stays for the counters.

## The tavern (`src/art/tavern/`, `src/tavern.ts`)

- **Wall, floor, rug, bar, stools, chairs, tables, barrels and crates** (`src/art/tavern/*.png`): generated with PixelLab
  (`/create-image-pixflux`, side view, final pixel size; see `tools/tavern/README.md`), trimmed, and the floor turned and
  darkened. No asset-pack tiles are used here: the packs' village, glassblower and dungeon tilesets are all top-down, and
  the room is a side view. The heroes in it are the Craftpix sheets already credited above.
- **The hearth hall and the games room** (`wall_hearth.png`, `wall_back.png`, `arch.png`, `bench.png`, `stage.png`): generated
  the same way with PixelLab `/create-image-pixflux` (the two walls at 384x176, cropped to their wall: 128 rows; the doorway frame at 56x128;
  the bench and the bard's stage trimmed to their pixels). The bar room's wall is the old `wall.png` without its top 48 rows. Nothing is
  scaled; `tools/tavern/hall.py` does the cuts, `docs/notes/tavern-hall.md` lists the prompts.

## Art generated with PixelLab

- The **Lich King** (`lich_king.png`, the Undead Legion's boss) is generated the same way as the other bosses: a base figure (`/generate-with-style-v2`, 128 px, Craftpix Minotaur, Samurai Commander and Skeleton Warrior frames as style references), then idle, walk, attack, cast and death clips (`/animate-with-text-v3`), cropped and padded only (native pixels, hard alpha), with a last lying death frame made by an exact 90-degree turn (`tools/pixellab/lie.py`). The steps are in `tools/pixellab/lich.py`; see `docs/notes/armies.md`.
- The **Oni King** (`oni_king.png`, the Yokai Night Parade's boss) is generated the same way as the Lich King: 4 base candidates at 128 px (Craftpix Minotaur, Samurai Commander and the generated Horned Ogre as style references; the armoured one picked), then idle, walk, attack, attack2 and death clips and the lying last frame. The steps are in `tools/pixellab/oni.py`; see `docs/notes/armies.md`.
- The Druid's treant (`cls_treant.png`) is generated the same way (base figure from Craftpix Knight and Minotaur style references, then walk, attack and idle clips). Every generated sheet's last death frame is that sheet's idle figure turned exactly 90 degrees (`tools/pixellab/lie.py`), so no extra generation was involved.
- The class heroes (`cls_*_1/2/3.png`) and the orc, imp, demon and ogre foes (`hk_*.png`) are pixel art generated with
  **PixelLab** (pixellab.ai): a base figure from a text description with Craftpix fighters as style references
  (`/generate-with-style-v2`), animated with `/animate-with-text-v3`. The frames were only cropped and padded into the
  sheets (no resizing; alpha made hard, lone stray pixels dropped). The prompts are in `tools/pixellab/spec.py`.

- **Hero art remake** (`hero_<name>.png`): sixteen heroes were redrawn with **PixelLab** in the Craftpix look, replacing the Pixel
  Champions chibis, the pirate-pack chibis and the Himeko-based Lancer, Mummy, Juggernaut, Tyrant and Shambler sheets (the old
  sheets are gone): Mercenary, Wolf Bard, Beastmaster, Time Witch, High Priestess, Queen Dragoon, Great Sage, Demon
  Swordsman, Buccaneer, Dread Pirate, Kraken Mate, Lancer, Mummy, Juggernaut, Tyrant and Shambler. Same method as the class heroes: a base figure
  (`/generate-with-style-v2`, Craftpix Knight, Samurai, Fire Wizard, Minotaur and Samurai Commander frames as style references), then
  walk, attack, idle, hurt, dead (and cast) clips with `/animate-with-text-v3`, cropped and padded only (native pixels, hard alpha), and a lying last
  death frame by an exact 90-degree turn. Prompts and steps: `tools/pixellab/heroes/`; see `docs/notes/hero-art.md`.

## Castle courtyard (`src/art/castle/`)

- Every building, wall, gate, prop and ground tile is a single piece of Chronos Settlement's isometric kits (`hpatter9/little-town`,
  `src/renderer/art/iso/kits/`: the Knights, Settlers, Dwarves, Blood Court, Fae, Liches, Druids and Nomads kits), shrunk to half size
  by a 2x2 box average (`tools/castle/prep.py`). Chronos credits them as made for that project: drawn with ChatGPT's image generation from
  prompts written for the game, then cut into sprites, cleaned and reduced to 256 colours. Used: Fae shrine and spiral watchtower, Liches
  chapel, Knights watchtower, stone wall run, lamp post, stockpile, longhouse, cottage, barracks, workshop, campfire, hay bales, crates, barrels, woodpile, oak, pine,
  bush, rocks and grass and cobble tiles, Dwarves great hall, forge, anvil stall, brazier, shrine and crystals, Settlers longhouse,
  Orcs weapon stall (the weapon rack), Blood Court banner and rose bush, Druids flower patch and berry bush, Nomads chests.
- The tavern, chapel, stable, library and market pieces are from the same kits: Knights tavern, chapel, stable, cart, granary, market stall, field tile and signpost,
  Settlers stockpile (the shed), market stall and field tile, Fae workshop (the library's observatory), Liches tavern (the library's manor), Druids baskets and
  herb garden tile, Nomads carpet stall.
- The courtyard's extras and the front lawn are from the same kits: Knights well, Dwarves flagstone tile (the plaza's chequer), Druids clay pots, hedge wall, birch tree and
  great oak, Settlers signpost (the Armies road).
- The heroes who stroll the yard use their own sheets (see above), shrunk by a whole number when the page loads.
- Nothing was generated for this look.

## The summoning hall and the library (`src/art/hall/`, `src/art/library/`)

- The hall's wall, floor, summoning circle, summoner (two poses), brazier and pillar, and the library's wall and lectern are **generated with
  PixelLab** (see `tools/scenes/README.md` for the prompts).
- The braziers' flames (`src/art/hall/fx_fire-flame.png`) are the `fire-flame-16` sheet from the **Super Pixel Effects Gigapack (Free Version)**
  by unTied Games, copied as it is.
- The town square's fountain (`tools/castle/generated/fountain.png`) and its benches (`bench.png`) were generated with PixelLab (`/generate-with-style-v2`, kit pieces as style references; see `tools/castle/gen.py` and `docs/notes/castle-scene.md`): 10 generations; the picks are used as they came, halved by `prep.py` like the kit pieces. Nothing else in this look was generated.
- The Lich King's new walk and hurt rows, and the treant's evolved forms (`cls_treant_2.png`, `cls_treant_3.png`), are generated the same way as the other generated sheets (`/generate-with-style-v2` with the existing treant and Craftpix Minotaur and Samurai Commander frames as style references, then `/animate-with-text-v3`; native pixels, hard alpha, last death frame by `tools/pixellab/lie.py`). See `docs/notes/hero-art.md`.

- **The war camp** (`src/art/camp/`, Battle tab): the gatehouse, felt and striped tents, war banner, water skins, skull torch and dirt tile are pieces of the
  isometric kits in Chronos (`iso/kits/knights`, `nomads`, `orcs`), halved by `tools/camp/prep.py`; the sky, clouds and night sky are the Craftpix
  "Free Pixel Art Cloud and Sky Backgrounds" pack. The rest are pictures already in `src/art/castle/`. The war table is drawn in code.

## The second wave of heroes (`src/art/units/`, built by `tools/more-heroes/build_sheets.py`)

- (**Superseded by the hero art remake above**: the Pixel Champions, pirate-pack and horse-rider heroes and the Himeko Juggernaut, Tyrant,
  Mummy and zombies below are no longer in the game; the Robots and the Ghost (Reaper) are.)
- **Pixel Champions v3** (Micro Edition, by Alex / @alexdraws; the pack folder has only its `ABOUT.jpg` and no licence file:
  check the author's terms before any public release): the Wolf Bard (Ouzo), Beastmaster (Ley), High Priestess (Linail),
  Time Witch (Hex), Mercenary (Oratio), Queen Dragoon (Wyvera), Great Sage (Prime) and Demon Swordsman (Glenys), three
  colour looks each (`pc_<name>_<1-3>.png`). The 1x battler sheets are rebuilt into the game's rows and doubled by whole pixels.
- Craftpix's **Free Robot Pixel Art Sprite Sheets** (Infantryman = Rifle Bot, Swordsman = Arc Blade, Destroyer = Siege Bot),
  **Fantasy RPG Pirate Boss Character Pack** (Pirate Leader = Buccaneer, Pirate Zombie = Dread Pirate, Squidman = Kraken
  Mate) and **Free Enemy Pixel Pack for Top-Down Defense** (the horse rider = Lancer): Chronos Settlement's cut sheets
  (`robot_*.png`, `pirate_*.png`, `squidman.png`, `horde_2.png`), copied as they are.
- From the **Himeko Sutori sprite share** (as Chronos cut them, `hk_*.png`): the Juggernaut, Tyrant, Mummy (Mummy), Ghost
  (Reaper) and the three zombies (Shambler's three looks). Those sprites are free to use with attribution:
  - Half-Kaizer sprite template created by Showkaizer.
  - Additional Half-Kaizer poses by Aleesa Tana.
  - Armor, weapon, shield, helmet, hair, skeleton, zombie, demon, fairy, mecha, wolf, boar, pumpkin, turkey, slime,
    skullbird, dragon, cactus, and other sprites are from Himeko Sutori and Septaroad Voyager by Rockwell Studios, LLC.
- The Dire Wolf the Beastmaster calls is the Red Werewolf sheet of the Free Werewolf Sprite Sheets (Craftpix), already listed above.

- **The loading screen** (`src/art/loading/`): the Knight's and the Demon Lord's attack rows, cut from the unit sheets above by `tools/loading-art.py`, with the slash (`src/art/fx/magic/moon_slash.png`) and the impact burst (`src/art/fx/impact.png`), all inlined into the page by `build.mjs`.

## The Calamity's map and portal (`src/art/calmap/`, cut by `tools/calmap/prep.py`)

- The lands' ground tiles (grass, dirt, moss, forest floor, stone path, dry grass, snow, scorched earth, cracked earth, cobble, flagstone, rocky floor), trees, bushes,
  rocks, and the landmarks (weapon stall, hide tent, war drum, skull banner and meat pile, skull pile, market stall, striped tent and standard, chests, loot chests,
  campfire, moon shrine, stone circle) and the six lairs (Orcs skull gate, Druids tree gate, Blood Court crypt and gatehouse, Moonpack cave den, Liches gatehouse) are single
  pieces of Chronos Settlement's isometric kits (`hpatter9/little-town`, `src/renderer/art/iso/kits/`: Knights, Druids, Nomads, Moonpack, Orcs, Liches, Blood Court,
  Dwarves, Fae), shrunk to half size by a 2x2 box average like the castle's and the camp's, and packed into one atlas (256 colours). The "spent" pictures (a done
  stall, tent, chest, shrine; the burnt-out campfire) are made from the live ones by draining and darkening their colours. Chronos credits the kits as drawn with
  ChatGPT's image generation from prompts written for the game, then cut, cleaned and reduced to 256 colours.
- The portal (`portal.png`, also in the war camp) is the `rift-portal` effect of **PVFX Foundry** (Pixel VFX Studio, `pvfx-foundry-thirteen-spritesheets`), CC0 1.0: sixteen
  frames, the visible 64 pixels of each, in one row.

- **The camp's places** (`src/art/camp/tower.png`, `tower_locked.png`, `board.png`, `tools/camp/places.py`): the Tower is the Knights watchtower already used by the castle
  (`src/art/castle/watchtower.png`), its locked picture that drained of colour with a chain and padlock drawn on it; the Daily board is the Fae ribbon signpost of the same
  isometric kits (`hpatter9/little-town`), halved by a 2x2 box average.

- **Stone and iron UI kit** (`src/art/ui/` frames, buttons, ribbons, chips, flag, `wood.png`, `page.png`; drawn by `tools/ui/styles.py`, which replaced `tools/ui/frames.py`'s brown and gold kit): the `wood.png` (bars) and `page.png` (menu pages, panel fill) textures are the centre tiles of two **DawnLike** brick sets by DragonDePlatino (`Objects/Floor.png`, CC-BY 4.0; palette by DawnBringer), their few colours moved by brightness rank onto the slate ramp, with no resampling. The frames are drawn natively by the script.
## The Calamity's void (`src/art/calmap/`, `tools/calmap/prep.py`)

- The sky behind the islands: the stars (`stars.png`, the bright pixels of the first sky) and the four moons (`planet_white/tan/red/blue.png`) are cut from the Craftpix **Free Moon Pixel Game
  Backgrounds** pack; the six nebulae (`nebula_0..5.png`) are its sibling, the Craftpix **Free Seamless Pixel Art Cloudscape for Game Projects** (background 1, the two cloud layers), turned to a
  colour for each realm (hue shifts only). Both from the private assets repository (`hpatter9/chronos-assets`).
- The rock hanging under each island is the Undead Tileset's rock face already credited above (`src/art/ground/rock.png`), multiplied by each realm's colour in code.
- The islands' ground and props are single pieces of Chronos Settlement's isometric kits as before; the realms add the Fae mushroom-patch and meadow tiles, crystal rocks and glow bush, the Dwarves'
  crystals, and the Machines' iron-plate and grate tiles, iron tree, coil stack, oil drums and arc lamp (the Rift's ground is the Liches' cracked earth turned violet). The great rift behind the last lair
  and the portal are the PVFX Foundry rift (CC0), as before.

## Duchess the goat (`src/art/duchess/goat.png`; `goat-half.png` is the same sheet cut to half size for the tavern)

Duchess is the town's goat from Chronos Settlement (`hpatter9/little-town`), and now of the camp, the tavern and the battlefield too. Her sheet
is the one Chronos's cutscenes use (three steps walking left, three walking right), copied as it is. It is **whtdragon**'s RPG Maker MV white goat
(`animals/goats.png`). The pack folder has no licence file: check whtdragon's posted terms of use before any public release (the same note as
Chronos's CREDITS.md).

## The Beastmaster's wolves (`src/art/units/wolf_grey.png`, `wolf_black.png`; `tools/wolf/compose-wolf.py`)

The wolf (and the black dire wolf) are the grey and black wolves of **whtdragon**'s RPG Maker MV animals pack (`animals/wolfdog.png`, from the private assets repository `hpatter9/chronos-assets`), the
right-facing row of three walking frames, scaled up 2x with nearest-neighbour. The script builds the game's rows from them (a step cycle, a lunge made of the stride shifted forward, an idle, a hurt
frame brightened, and a dead frame rolled onto its side). The pack folder has no licence file: the same note as Duchess the goat, which comes from the same pack: check whtdragon's posted terms of use before any public release.

## The combo and promotion effects (`src/render/spectacle.ts`)

No new art: the five-hero combos' gathering and strike, a tier skill's ring and a promotion's pillar of light are the **5000 Pixel Effects** strips by blueberry already credited above
(`src/art/fx/pack`: the circle, gather, sparkle, pillar, nova, wave, strike and explosion strips of eight elements), drawn through the existing particle pool.

## Talent icons

- The **talent glyphs** (`src/art/talent/*.png`, 37 icons at 32x32: heart, sword, armour, eye, boot, cross, pickaxe and the rest) are generated with PixelLab (`tools/pixellab/talents/gen.py`, `/create-image-pixflux` with the game's warm palette as the colour reference, as `tools/ui/genicons.py` does), used as they came. See `docs/notes/hero-progress.md`.
