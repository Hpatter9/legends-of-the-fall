# Credits

Most of the art is from free **Craftpix.net** packs (craftpix.net, free licence: use in games allowed, no redistributing
the raw files), copied one sprite at a time from the private assets repository (`hpatter9/chronos-assets`).

- **The heroes and the skeletons** (`src/art/units/`): the Free Knight, Samurai, Ninja, Wizard and Skeleton Sprite
  Sheets, as cut into one small sheet each by Chronos Settlement's `tools/compose-sheets.cjs`: Knight 1, Samurai,
  Kunoichi, Samurai Archer, Fire Wizard, Skeleton Warrior, Skeleton Spearman, Skeleton Archer; and from the Free
  Werewolf, Gorgon, Minotaur and Satyr Sprite Sheets, all three of each. Knight 2 and 3, Samurai Commander, Ninja Monk, Ninja Peasant, Lightning Mage,
  Wanderer Magician (Free Wizard Sprite Sheets) and Kitsune, Karasu Tengu, Yamabushi Tengu (Free Yokai Character Sprites)
  are copied in for more heroes and their evolved looks. The arrows
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

- The orc warband (grunt, archer, brute, warlord), demons, demon lord, imp and ogres (`src/art/units/hk_*.png`, as cut by
  Chronos Settlement's `tools/compose-sheets.cjs`) are from the **Himeko Sutori sprite share**, free to use with
  attribution: Half-Kaizer sprite template created by Showkaizer; additional Half-Kaizer poses by Aleesa Tana; armour,
  weapon, demon, ogre and other sprites from Himeko Sutori and Septaroad Voyager by Rockwell Studios, LLC.
- The three forest bosses are from Craftpix's **Free Forest Bosses**; the Boar King, Devil Leader and Shaman King from
  Craftpix's **Free Fantasy RPG Top-Down Boss Creatures**.

- **The home screen** (`src/art/home/castle.png`): the Fantasy 2D Battlegrounds pixel pack (Craftpix), Battleground 2
  (Bright), `Battleground2.png`, scaled to half size.

## Magic effects (the spells, the skills and the crits)

- **The skill, spell and hit effects** (`src/art/fx/magic/`, 22 sheets of six 32px frames each, copied unchanged from the
  `sheet-32.png` strips of the **5000 Pixel Effects** pack by blueberry (`pixel-effects/sprites/<effect>/`, from the
  private assets repository): light gather, light nova and circle, wind vortex, wave, burst and strike, earth shield,
  burst, explosion and wave, ice shield, fire circle and explosion, gold, white and blood bursts, dark circle and slash,
  moon slash, lightning burst and strike, and the pink heart. The pack's licence allows use in games, commercial ones
  included; credit appreciated (https://blueberry-assets.itch.io). Mapped to skills and spells in `src/render/skillFx.ts`.
