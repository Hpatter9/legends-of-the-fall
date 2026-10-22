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

Code borrowed from Chronos Settlement (`hpatter9/little-town`): the seeded random numbers (`src/sim/rng.ts`), the
board's relief, step and sight rules (`src/sim/board.ts`), the blow and reach rules (`src/sim/battle.ts`), the
isometric column drawing (`src/render/boardView.ts`), `loadImage` and the battle juice rules.

- **The music** (`src/audio/town.ogg`, `battle.ogg`, `boss.ogg`): the Tiny RPG Music tracks `tiny-rpg-town.ogg` (between
  fights), `Battle Encounter.ogg` (fights) and `BossBattle.ogg` (boss stages), copied from the private assets repository
  (`hpatter9/chronos-assets`, `TinyRPGMusic/`). The pack's licence file names Luis Zuno (@ansimuz) as its creator and
  allows use and redistribution in personal and commercial projects, with credit appreciated but not required.
- **The sound effects** are synthesised in `src/render/sound.ts` with the Web Audio API; no files were copied for them.

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

## More foes and bosses (copied in for the boss stages and new bands)

- The orc warband (grunt, archer, brute, warlord), demons, demon lord, imp and ogres (`src/art/units/hk_*.png`) are
  **generated with PixelLab** (see below), drawn to match the Craftpix fighters; the Himeko Sutori sheets they replace are gone.
- The three forest bosses are from Craftpix's **Free Forest Bosses**; the Boar King, Devil Leader and Shaman King from
  Craftpix's **Free Fantasy RPG Top-Down Boss Creatures**.

## The class heroes (`src/art/units/cls_*.png`)

- The Paladin, Cleric, Druid, Barbarian, Ranger, Warlock, Illusionist and Gunslinger (three looks each, one per grade) are
  **generated with PixelLab** (see below). The Himeko Sutori layered sheets they replace are gone, so
  `tools/compose-class-heroes.cjs` no longer makes the `cls_*` hero sheets.
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

## Art generated with PixelLab

- The **Lich King** (`lich_king.png`, the Undead Legion's boss) is generated the same way as the other bosses: a base figure (`/generate-with-style-v2`, 128 px, Craftpix Minotaur, Samurai Commander and Skeleton Warrior frames as style references), then idle, walk, attack, cast and death clips (`/animate-with-text-v3`), cropped and padded only (native pixels, hard alpha), with a last lying death frame made by an exact 90-degree turn (`tools/pixellab/lie.py`). The steps are in `tools/pixellab/lich.py`; see `docs/notes/armies.md`.
- The Druid's treant (`cls_treant.png`) is generated the same way (base figure from Craftpix Knight and Minotaur style references, then walk, attack and idle clips). Every generated sheet's last death frame is that sheet's idle figure turned exactly 90 degrees (`tools/pixellab/lie.py`), so no extra generation was involved.
- The class heroes (`cls_*_1/2/3.png`) and the orc, imp, demon and ogre foes (`hk_*.png`) are pixel art generated with
  **PixelLab** (pixellab.ai): a base figure from a text description with Craftpix fighters as style references
  (`/generate-with-style-v2`), animated with `/animate-with-text-v3`. The frames were only cropped and padded into the
  sheets (no resizing; alpha made hard, lone stray pixels dropped). The prompts are in `tools/pixellab/spec.py`.

## Castle courtyard (`src/art/castle/`)

- Every building, wall, gate, prop and ground tile is a single piece of Chronos Settlement's isometric kits (`hpatter9/little-town`,
  `src/renderer/art/iso/kits/`: the Knights, Settlers, Dwarves, Blood Court, Fae, Liches, Druids and Nomads kits), shrunk to half size
  by a 2x2 box average (`tools/castle/prep.py`). Chronos credits them as made for that project: drawn with ChatGPT's image generation from
  prompts written for the game, then cut into sprites, cleaned and reduced to 256 colours. Used: Fae shrine and spiral watchtower, Liches
  chapel, Knights watchtower, stockpile, longhouse, cottage, barracks, workshop, campfire, hay bales, crates, barrels, woodpile, oak, pine,
  bush, rocks and grass and cobble tiles, Dwarves great hall, forge, anvil stall, brazier, shrine (the statue) and crystals, Settlers longhouse,
  stone gate and stone wall run, Blood Court banner and rose bush, Druids flower patch and berry bush, Nomads chests.
- The heroes who stroll the yard use their own sheets (see above), shrunk by a whole number when the page loads.
- Nothing was generated for this look.
