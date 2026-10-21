# Credits

Most of the art is from free **Craftpix.net** packs (craftpix.net, free licence: use in games allowed, no redistributing
the raw files), copied one sprite at a time from the private assets repository (`hpatter9/chronos-assets`).

- **The heroes and the skeletons** (`src/art/units/`): the Free Knight, Samurai, Ninja, Wizard and Skeleton Sprite
  Sheets, as cut into one small sheet each by Chronos Settlement's `tools/compose-sheets.cjs`: Knight 1, Samurai,
  Kunoichi, Samurai Archer, Fire Wizard, Skeleton Warrior, Skeleton Spearman, Skeleton Archer; and from the Free
  Werewolf, Gorgon, Minotaur and Satyr Sprite Sheets, all three of each (not yet in play). The arrows
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

Code borrowed from Chronos Settlement (`hpatter9/little-town`): the seeded random numbers (`src/sim/rng.ts`), the
board's relief, step and sight rules (`src/sim/board.ts`), the blow and reach rules (`src/sim/battle.ts`), the
isometric column drawing (`src/render/boardView.ts`), `loadImage` and the battle juice rules.
