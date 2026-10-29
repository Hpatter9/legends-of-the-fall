# Credits

- **Full Resonance hero upgrade** (`src/art/units/hero_res_*.png`, separate `_back` sheets, and the two pilot heroes): original generated pixel artwork following the owner's approved direction. Includes the 43 remaining collectible heroes, Werewolf Brute/awakened appearances and three Treants. Front/rear art supplies four isometric facings through left/right mirroring; dedicated walking atlases supply eight-frame strides. Prompts, specifications and packing tools are in `tools/resonance/`; raw generation intermediates remain in the art workspace. No franchise sprites are included. Foes/NPCs retain their existing art and credits.

- **Resonance hero pilot** (`hero_soldier.png`, `hero_samurai_archer.png`): original generated pixel artwork, directed from the owner's approved concept and Final Fantasy Resonance style references. No franchise sprites are included. Cropped, packed and sampled with nearest-neighbour scaling by `tools/resonance/pack.cjs`. These replace the Knight and Archer's displayed art at all grades; current grade effects and awakened class auras apply. Original Craftpix sheets and their credits remain available.

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
- **Effects** (`src/art/fx/impact.png`, `hit_fire.png`): the hit sparks and fire hit from the
  **Super Pixel Effects Gigapack (Free Version)** by unTied Games, as Chronos Settlement cut them
  (`src/renderer/art/effects/`).
- **Rift ore icons** (`src/art/ui/ore/`, the awakening materials): thirteen 32x32 icons from the **Free Mining Pixel 32x32 Icons** pack by Craftpix (craftpix.net, free licence), each recoloured to its class's aura colour by `tools/awaken/ore-icons.py`.
- **Item icons** (`src/art/items/`): single 16x16 tiles cut from the **DawnLike** tileset by DragonDePlatino (Items: Armor, Amulet, Boot, Hat, LongWep, Ring, Shield), for relics and gear.
  The ten relics of the tower's relic sets (Ember Ruby, Dragon Scale, Frost Sapphire, Winter Cloak, Holy Chalice, Saint's Medal, Shadow Cloak, Viper Fang, Wolf Fang, Beast Harness) reuse tiles of the same tileset already cut for the equipment (`src/art/equip/`), copied one a file (CC-BY 4.0).
- **Tower map icons** (`src/art/rogue/`): single 16x16 tiles cut from the **DawnLike** tileset by DragonDePlatino (Effect0, Money, GUI1, Potion, LongWep; crossed swords is the sword tile and its mirror), by `tools/rogue-icons.py` (CC-BY 4.0).
- **Tower map backdrop** (`src/art/tower/`, cut by `tools/tower-art.py`): the brick (`brick.png`, tinted warm and cold for `brick2.png` and `brick3.png`), the barred window, the small window and the wall torch frames (`window.png`, `slit.png`, `torch.png`, glow disc dropped) from the Craftpix **Free 2D Top-Down Pixel Dungeon Asset Pack** (`walls_floor.png`, `fire_animation.png`); the cloud strips (`cloud_*.png`) from the Craftpix **Free Clouds Pixel Art Asset Pack** (white, gray and black, Shape2); and the far peaks (`peaks.png`) from the Craftpix **Free Mountain Peak Pixel Art Backgrounds** (background 3, Plan 2). The banners are the castle banner already in `src/art/castle/`.
- **Floor twist icons** (`src/art/twists/`) and the four legendary relics' icons (`src/art/items/sun_crown.png`, `dragon_heart.png`, `storm_ring.png`, `void_lens.png`): single 16x16 tiles cut from the same **DawnLike** tileset by DragonDePlatino (Effect0, Potion, Rock, Money, Boot, ShortWep, Hat, Shield, Amulet, Ring), by `tools/twist-icons.py` (CC-BY 4.0).
- **The Calamity relic sets' icons** (`src/art/items/`: Thunder Horn, Cloud Treads, Thunder Pendant, Tempest Ring, Granite Heart, Moss Amulet, Stone Gauntlet, Earthen Bell, Blood Vial, Bloodstone Ring, Reaver Helm, Ruby Locket, Star Chart, Comet Shard, Moon Lantern, Astral Circlet, Coin Hoard, Gilded Ingot, Jewelled Crown, Gold Band, Rift Shard, Void Sigil, Doom Helm, Last Light): single 16x16 tiles cut from the same **DawnLike** tileset by DragonDePlatino (Items: Music, Boot, Amulet, Ring, Glove, Potion, Hat, Book, Money), by `tools/relic-icons.py` (CC-BY 4.0).
- **Equipment icons** (`src/art/equip/`): 16x16 tiles cut one tile each from the same **DawnLike** tileset by DragonDePlatino (Items: LongWep, ShortWep, Ammo, Wand, Book, Scroll, Armor, Amulet, Ring, Boot, Glove, Hat, Music, Potion, Rock, Tool), by `tools/equip-icons.py`, for the hero equipment (CC-BY 4.0).
- **XP tome icons** (`src/art/ui/tome-small.png`, `tome-medium.png`, `tome-large.png`): three 16x16 tiles cut one each from the same **DawnLike** tileset by DragonDePlatino (Items: Book), by `tools/tome-icons.py` (CC-BY 4.0).
- **Army chests** (`src/art/ui/chest-bronze.png`, `chest-silver.png`, `chest-gold.png`): the chest (closed and open frames) from the Craftpix **Free Platformer Game Tileset Pixel Art** pack (`chest.png`), cropped, with its iron bands tinted bronze, silver and gold by a script (hue shifts only). The **daily chest** (`src/art/ui/chest-daily.png`) is the silver chest with its wood hue-shifted to violet. The army scenes on the Armies screen use the foes' existing sprite sheets and the land backdrops, with no new art.

- **Battlefield terrain** (`src/art/terrain/`, cut by `tools/map-layouts/terrain-art.py`, bundled into `game.js` as data URLs): the powder barrel from the Craftpix **Free 2D Top-Down Pixel Dungeon Asset Pack** (`Objects.png`); the ruined walls (`wall1..3.png`) from the Craftpix **Free Undead Tileset Top-Down Pixel Art** (`Objects_separately`, Ruin_shadow1_2 to 1_4); the shrine's crystal from the Craftpix **Free Top-Down Pixel Art Cave Objects** (Blue-green crystal); the bridge planks from the Craftpix **Free Bridges Top-Down Pixel Art Asset Pack** (`Bridges.png`). Deep water is the shallows' existing water texture (`src/art/areas/common/water.png`), darkened in the page.

Code borrowed from Chronos Settlement (`hpatter9/little-town`): the seeded random numbers (`src/sim/rng.ts`), the
board's relief, step and sight rules (`src/sim/board.ts`), the blow and reach rules (`src/sim/battle.ts`), the
isometric column drawing (`src/render/boardView.ts`), `loadImage` and the battle juice rules.

- **The music**:
  - Battle tracks (`battle.opus`, `battle2.opus`, `battle3.opus`, `calbattle.opus`): **Boss Battle #2 [Symphonic Metal]**, **Boss Battle #6 [Metal Alternate]**, **Boss Battle #8 [Metal]**, and **Boss Battle #9 [Metal]** by **nene** from OpenGameArt.org (CC0 Public Domain; live drums, distorted guitars, orchestral brass, and violins).
  - Boss battles (`boss.opus`): **Blackmoor Colossus** by **Matthew Pablo** (matthewpablo.com / OpenGameArt.org, CC-BY 3.0; colossal orchestral brass, driving drums, and dark fantasy choir).
  - Stings: Victory (`victory.opus`) uses **Victory Fanfare** by **cynicmusic** (Alex Smith) / **Thalon** (OpenGameArt.org, CC0 Public Domain); Defeat (`defeat.opus`) uses **No Hope** by **Cleyton Kauffman** (OpenGameArt.org, CC0 Public Domain).
  - Hubs & Exploration:
    - Home screen (`camp.opus`): **Woodland Fantasy** by **Matthew Pablo** (matthewpablo.com / OpenGameArt.org, CC-BY 3.0; live violin, medieval ballad, acoustic fantasy atmosphere).
    - Battle preparation (`deploy.opus`): **Briefing Theme** from *Unused Music* by **Alexandr Zhelanov** (OpenGameArt.org, CC-BY 4.0; tactical preparation and strategy suspense).
    - Tavern (`tavern.opus`): **The Old Tower Inn** (OpenGameArt.org, CC0 Public Domain; medieval tavern lute, flute, and waltz).
    - Dungeon exploration (`tower.opus`): **Crystal Cave & Mysterious Ambience** by **cynicmusic** (The Cynic Project / OpenGameArt.org, CC0 Public Domain; underground ambient exploration).
    - Calamity map (`calmap.opus`): **Iron Wasteland** by **Alexandr Zhelanov** (OpenGameArt.org, CC-BY 4.0; dark post-apocalyptic suspense ambience).
  - Heralds & Cinematics:
    - Gorvak (`gorvak.opus`): **Battle March** (OpenGameArt.org, CC0 Public Domain; heavy war march).
    - Calamity heralds (`herald2.opus` to `herald6.opus`): **Boss Battle #7 [Metal]** and **Boss Battle 10 [Metal]** by **nene** (OpenGameArt.org, CC0); **The Dark Amulet**, **Wasteland Showdown**, and **Tactical Pursuit** by **Matthew Pablo** (matthewpablo.com / OpenGameArt.org, CC-BY 3.0).
    - Opening (`opening.opus`): **Spooky Waltz (Music Box)** by **Aureolus_Omicron** (OpenGameArt.org, CC0 Public Domain).
    - Story scenes: **Medieval Victory Theme** (`triumph.opus`, CC0); **Emotional Piano Loop** by **Extenz** (`solemn.opus`, CC0); **Soliloquy** by **Matthew Pablo** (`spire.opus`, CC-BY 3.0); **Enchanted Festival** by **Matthew Pablo** (`comic.opus`, CC-BY 3.0).
  - Each track is resampled to 24 kHz, seamlessly crossfaded, and encoded to Opus with a 1.5 s wrap tail. The older synthesised loops (`src/render/musicScore.ts`, rendered in the page by `src/render/musicBake.ts`) remain as a fallback if a browser cannot decode the files.
- **The sound effects** are synthesised in `src/render/audioProcessors.ts` with the Web Audio API, except eight recorded combat sounds (sword and
  blunt hits, a shield block, a crit, a bowstring, an arrow hit, a death and an explosion) embedded in `src/render/combatAudioBank.ts`
  (PR #150, given as CC0). Their original source and authors were not recorded with the PR and should be named here.

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
  `tools/compose-class-heroes.cjs` no longer makes the `cls_*` hero sheets (it now makes only the Last Stand's king).
- The **Golem Forge** army's golems (`golem_stone/iron/crystal/magma/sapphire/forge.png`) are figures 6, 18, 20, 27, 32 and 15 of the same **Golems and elementals** pack by batareya (no licence file in the pack folder: check the author's terms before any public release). The pack has only still figures, so `tools/golems/cut.py` moves each by whole pixels for the walk, attack, idle, hurt and dead rows, with a last lying frame made by an exact 90-degree turn; nothing is resampled. The **Yokai Night Parade** troops and the Nine-Tailed Fox use the Kitsune, Karasu Tengu and Yamabushi Tengu sheets (Free Yokai Character Sprites, Craftpix) listed above.
- The **foes remade for the art cleanup** (`forest_boss_1-3`, `boar_king`, `devil_leader`, `shaman_king`, `golem_*`, `satyr_1-3`) and the new **walk and hurt rows of the 16 remade heroes** are generated the same way (PixelLab: bases from Craftpix style references, `/animate-with-text-v3` clips, native pixels, hard alpha, lying last death frame by `lie.py`). Tools: `tools/pixellab/foes/` and `tools/pixellab/heroes/polish.py`; see `docs/notes/art-cleanup.md`.
- The Druid's treant (`cls_treant.png`) is one picture from the **Golems and elementals** pack by batareya (the pack folder has no licence file: check the author's terms before any public release).

## Magic effects (the spells, the skills and the crits)

- **The skill, spell and hit effects** (`src/art/fx/magic/`, 22 sheets of six 32px frames each, copied unchanged from the
  `sheet-32.png` strips of the **5000 Pixel Effects** pack by blueberry (`pixel-effects/sprites/<effect>/`, from the
  private assets repository): light gather, light nova and circle, wind vortex, wave, burst and strike, earth shield,
  burst, explosion and wave, ice shield, fire circle and explosion, gold, white and blood bursts, dark circle and slash,
  moon slash, lightning burst and strike, and the pink heart. The pack's licence allows use in games, commercial ones
  included; credit appreciated (https://blueberry-assets.itch.io). Mapped to skills and spells in `src/render/skillFx.ts`.

## Awakened auras (`src/art/fx/aura/`)

- `atlas.png`: 70 strips (32px frames, six or eight each) of the **5000 Pixel Effects** pack by blueberry
  (https://blueberry-assets.itch.io), copied unchanged from `pixel-effects/sprites/<effect>/sheet-32.png` in the private
  assets repository and packed a strip a row by `tools/awaken/aura-sheets.py` (`atlas.json` gives each aura part's
  strip; `tools/awaken/aura-pack.json` which strip each part uses): the ground circles, runes, glyphs, shields, rising
  auras, sparkles, orbs, flames, smoke, vortices, pillar, cuts, slashes and dashes the class auras of awakened heroes
  are made of (`src/render/auraStyles.ts`, `docs/notes/awaken-auras.md`). The pack's licence allows use in games; the
  raw files are not redistributed. A painted replacement (`docs/notes/awaken-auras-art-brief.md`) would be credited
  here instead.

## Summon tarot cards (SUMMON-TAROT, phase A mock-up)

- `src/art/ui/tarot-frame.png`: the gold tarot card frame, generated with PixelLab (one generation) for this game.
- `src/art/tarot/arcana.png`: 48 strips of the **5000 Pixel Effects** pack by blueberry (https://blueberry-assets.itch.io),
  copied unchanged from `pixel-effects/sprites/<element>-<glyph|burst|circle|aura>/sheet-32.png` in the private assets
  repository and packed twelve elements a row (light, earth, blood, wind, lightning, crystal, star, fire, dark, moon, forest,
  sand): the class sigils on the cards and the burst, ring and halo of the first-time reveal (`src/summonTarot.ts`).

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
- **The summoning stone** (`ic-stone.png`): the "Mana" crystal from the Crystal Caves 2D platformer tileset (Craftpix free pack), cropped and scaled to 64x64 by `tools/ui/stone-icon.py`.
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

- **Duchess's headbutt and fall** (the attack and dead rows of `duchess_goat.png`) are generated with **PixelLab**: her own standing frame from whtdragon's white goat (`src/art/duchess/goat.png`) on a 64-pixel canvas, animated with `/animate-with-text-v3` (`tools/duchess/gen.py`, the takes kept in `tools/duchess/generated/`), native pixels with hard alpha, then scaled 2x like the pack frames beside them. Four generations: two headbutt takes (the second used), a hurt take (not used: it drew a lightning flash) and the fall (its last three frames used). See `docs/notes/duchess-fights.md`.
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
## The army road's scenery and arenas (WORLD-ROAD)

- `src/art/road/atlas.png` (cut by `tools/army-road/prep.py`, listed in `src/render/roadAtlas.ts`): the arenas' rings and set pieces and the land
  beside the road (the orcs' spiked wall and stake fence, the liches' bone wall, iron fence, mausoleum, dead oak and lantern post, the
  dwarves' stone wall, braziers, crystals and rubble, the machines' iron wall, generator, iron tree, arc lamp and coil stack, the Moon Pack's bone
  fence, cave den, howling stone, snowy pine, torch post and fallen log, the druids' great oak, birch, standing stone, stone circle, hedge and
  mushroom lantern, the Fae's weeping willow, silver birch, shrine and lantern post, the Blood Court's gravestones and brazier, the nomads' tassel
  lantern, the orcs' skull gate, war drum, skull torch, bonfire, burnt tree and dark rocks, and the wild set's ruins, pillars, statue, bones,
  skeleton, ferns, reeds, grass, flowers, mushrooms, pebbles, shrubs, thorns and stump) are single pieces of Chronos Settlement's isometric kits
  (`hpatter9/little-town`, `src/renderer/art/iso/kits/`), the same kits as the Calamity map's atlas above, so they stand at the boards' own angle.
  The bigger pieces are halved by a 2x2 box average; the atlas is reduced to 256 colours. Chronos credits the kits as drawn with ChatGPT's image
  generation from prompts written for that game, then cut, cleaned and reduced to 256 colours.
- The rest of the scenery is cut at run time from the Calamity map's atlas (`src/art/calmap/atlas.png`, credited above), and the ruins from the
  boards' own ruined walls.
- `src/art/road/birds.png`: the five small birds pecking at the road's edge, **DawnLike** by DragonDePlatino (`Characters/Avian0.png` and
  `Avian1.png`, CC-BY 4.0; palette by DawnBringer), as cut for Chronos Settlement (`src/renderer/art/birds.png` there).
- The running water, the waterfalls and the lights' glow are painted in code (`src/render/roadArt.ts`): no pack has a waterfall at this angle.
  The hazards' strikes play the **Pixel Effects** pack's strips already in the game (`src/art/fx/pack`).

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

Her fighting sheet (`src/art/units/duchess_goat.png`, for the rare fight she joins: `tools/duchess/compose-duchess.py`) keeps that goat's walk and idle
(the right-facing row, set on a 64-pixel canvas and scaled up 2x with nearest-neighbour) and her hurt (the standing frame brightened and knocked back). Her
headbutt and her fall are **generated with PixelLab** from her own standing frame (see "Art generated with PixelLab").

## The Beastmaster's wolves (`src/art/units/wolf_grey.png`, `wolf_black.png`; `tools/wolf/compose-wolf.py`)

The wolf (and the black dire wolf) are the grey and black wolves of **whtdragon**'s RPG Maker MV animals pack (`animals/wolfdog.png`, from the private assets repository `hpatter9/chronos-assets`), the
right-facing row of three walking frames, scaled up 2x with nearest-neighbour. The script builds the game's rows from them (a step cycle, a lunge made of the stride shifted forward, an idle, a hurt
frame brightened, and a dead frame rolled onto its side). The pack folder has no licence file: the same note as Duchess the goat, which comes from the same pack: check whtdragon's posted terms of use before any public release.

## The combo and promotion effects (`src/render/spectacle.ts`)

No new art: the five-hero combos' gathering and strike, a tier skill's ring and a promotion's pillar of light are the **5000 Pixel Effects** strips by blueberry already credited above
(`src/art/fx/pack`: the circle, gather, sparkle, pillar, nova, wave, strike and explosion strips of eight elements), drawn through the existing particle pool.

## Talent icons

- The **talent glyphs** (`src/art/talent/*.png`, 37 icons at 32x32: heart, sword, armour, eye, boot, cross, pickaxe and the rest) are generated with PixelLab (`tools/pixellab/talents/gen.py`, `/create-image-pixflux` with the game's warm palette as the colour reference, as `tools/ui/genicons.py` does), used as they came. See `docs/notes/hero-progress.md`.

- **The Last Stand's king** (`src/art/units/stand_king.png`): layered from the Himeko Sutori character pack in `chronos-assets` (plain male body, Plate 06 Lordly armour and its top layer, the Crown helm, a Broad Sword), cut by `tools/compose-class-heroes.cjs stand_king` as the class heroes once were.

## The Last Stand's castle (`src/art/stand/`, cut by `tools/stand/prep-art.py`; STAND-003)

- The floor's flagstones (`floor1.png`, `floor2.png`), the walls', pillars' and steps' dressed stone (`wallface.png`) and the walls' coping
  (`walltop.png`): cells of `walls_floor.png` from the Craftpix **Free 2D Top-Down Pixel Dungeon Asset Pack**, under Craftpix's free licence
  (use in the game; the raw files are not redistributed): https://craftpix.net/file-licenses/.
- The rubble at the breaches (`rubble1.png`, `rubble2.png`): `Ruin_shadow1_3.png` and `Ruin_shadow1_4.png` of the Craftpix **Free Undead
  Tileset Top-Down Pixel Art**, the same licence.
- The red carpet and the dais (`rug.png`) and the library's bookcases (`shelf1.png`, `shelf2.png`): cells of `Objects/Decor0.png` of the
  **DawnLike** tileset by DragonDePlatino, on DawnBringer's palette, CC-BY 4.0, four times up.
- The smoke at the breaches (`smoke.png`) and the dust burst's ring (`dust.png`, ten frames): `directional_smoke_burst_001` (large white,
  frame 12) and `symmetrical_smoke_burst_001` (large brown) of the **Super Pixel Effects Gigapack (Free Version)** by unTied Games.
- The dust kicked up as a wave comes in (`landdust.png`): the `landing-dust` effect of **PVFX Foundry** (Pixel VFX Studio,
  `pvfx-foundry-thirteen-spritesheets`), CC0 1.0, its grid sheet as it is.
- The stained-glass window, the gilt pilaster with its banner and the dark back wall behind the field (`window.png`, `pilaster.png`,
  `backwall.png`) are cut from the castle's own throne room (`src/art/throne/throne_room.png`); the king on his throne is the castle's
  enthroned king (`src/art/throne/king_throne.png`, used as it is), so he looks the same everywhere.
- The banners, braziers, lamps, fountain, well, chests, crates, barrels and pots are the castle courtyard's Chronos kit pieces already in
  `src/art/castle/` (see "Castle courtyard"), and the standards the war camp's (`src/art/camp/standard.png`); the courtyard's grass is
  `src/art/ground/grass1.png` and `grass2.png`.
- The brass of the Last Stand's bars, deploy tray, pause sheet and end card is the game's own `ui/` art (the battle crest, the ribbon, the
  heroes' brass frame, the page). The pools of light, the glass's coloured light and the auras are drawn effects.

## Heart revive

No new art: the burning heart's flame is the `flame_fire` strip (`src/art/fx/vfx/flame_fire.png`) from the **5000 Pixel Effects** pack by blueberry already credited above, played once over the heart (`src/reviveView.ts`); the heroes rise in the existing light pillar of a promotion.

## Company card brass frame

- `src/art/ui/hero-brass-frame.png`: generated with OpenAI image generation for the approved Keep & Kingdom character card concept. Class emblems reuse the existing talent icons; character art and forest scenery reuse the packs credited above.

- `src/art/hall/sanctum.png`: original generated artwork created for the owner-approved Royal Arcane Summoning Sanctum concept (OpenAI image generation, October 2026). Chamber, ceremonial summoner and griffin altar; no third-party asset dependency.

- `src/art/ui/summon-reveal-frame.png`: original generated pixel-art reveal frame (OpenAI image generation, October 2026), made for the approved Royal Arcane summon-results design; emerald banners, brass columns and griffin guardians.

## Painted battle effects

- `src/art/fx/cinematic/painted-atlas.png` and `accents-atlas.png`: original artwork generated with OpenAI image generation in October 2026 for the owner's approved cinematic fantasy battle-effects proposal. Thirty-two painted effect shapes, including weapon trails, elemental impacts, wards, healing, smoke, arrows, bone darts, hearts and water effects. `cinematicArt.ts` cuts the cells, prepares shared elemental palettes and samples them smoothly; animation follows the fight clock.
- These materials replace the older Pixel Effects strips in the live combat loaders, including skill signatures, king's spells, statuses, death effects, combos and promotions. Earlier credits above describe the original assets, which remain in the repository and may still appear in other views. Character sprites, signature props, scenery and interface art retain their existing credits.

## Individual skill and spell artwork

- `src/art/fx/abilities/atlas-0.png` through `atlas-8.png`: original cinematic fantasy effect paintings generated with OpenAI image generation in October 2026 for the owner's explicit request for a different visual signature for every skill, ultimate and king's spell. The 129 named motifs and their source cells are recorded in `catalogue.json`: 90 hero skills/ultimates, 18 additional named enemy abilities and 21 royal spells. No third-party artwork was added for these paintings.
- `tools/fxlab/import-ability-art.py` prepares the shipping atlases from the original generated sources. The runtime isolates detached neighbouring fragments, feathers cell edges and prepares shared 128px materials. The original paintings remain unchanged; existing character, scenery and supporting effect credits still apply.


## Battle cliffside overlook

- `src/art/camp/overlook.png`: original pixel-art environment generated with OpenAI image generation in October 2026 for the owner-approved Battle Overlook concept. The painting includes the rocky command ledge, war table, valley, banners and distant shattered Calamity citadel. No characters or enemy soldiers are baked into the painting; the live party, army ranks and boss reuse the credited game sprite sheets. The campfire reuses the existing credited scenery asset. The environment is bundled into `game.js` for offline play.

- `src/art/camp/camp-war.png`, `camp-wild.png` and `camp-arcane.png`: original generated pixel-art landscape atlases (OpenAI image generation, October 2026) for the owner-requested army-dependent bases. Three equal horizontal scenes per atlas: orc siege camp, undead cemetery, snowy beast dens; wildwood stronghold, stone labyrinth, ogre clan camp; infernal fortress, yokai shrine, golem foundry. The renderer blends the appropriate landscape into the shared overlook and places existing credited enemy sprites around it. All three atlases are bundled for offline use.

## Grand Scenario scenery

The Grand Scenario prototype reuses the already credited camp gate and Knights watchtower sprites as scenic destination compounds, on the existing area tile/rock art. No new art pack files are introduced.

## Battle command ornament

- `src/art/ui/battle-crest.png`: original transparent crossed-sword, emerald lion shield and crimson ribbon ornament generated with OpenAI image generation in October 2026 for the owner-authorised battle UI pass. Other frames, ribbons and spell icons reuse the artwork credited above.

- **Four seductress redesigns** (`hero_res_kitsune`, `hero_res_gorgon`, `hero_res_illusionist`, `hero_res_time_witch`, and their `_back` PNGs): original artwork generated with OpenAI image generation in October 2026, following the owner-approved adult character concepts. Front/rear views and action poses are packed with `tools/seductress/pack.py`. Costume revisions keep the heroes’ existing identities and combat rules; the Illusionist’s decoys reuse her updated sheet.

## Player rulers (October 2026)

- `src/art/rulers/{sun_viper,frost_witch,ash_empress,rose_duchess,moon_oracle,iron_stag,storm_corsair,gilded_necromancer}.png`: original fantasy pixel character artwork generated with OpenAI image generation from the owner-approved roster and personality concepts (`docs/samples/ruler-roster-personalities.png`). Eight rulers, each with four frames for idle, walk, strike, cast, hurt, fall, seated idle and seated command. Tattoos, jewellery, personal objects and costumes follow those approved concepts. `tools/rulers/prepare.sh` and `bounds.mjs` mechanically slice and pad generated frames; `src/art/rulers/provenance.json` records the source files.
- `src/art/rulers/thrones.png`: original empty throne sprites generated with OpenAI image generation for the same eight rulers. The seat remains visible when a ruler stands to cast, recoils or falls in Last Stand. Source: `exec-4085424b-b2af-4831-8f90-7e91b12f2437.png` in the generation workspace; normalised to a four-by-two atlas.
- These replace the player's earlier Himeko Sutori king and three-frame seated king in the live castle, Last Stand and cinematics. Earlier entries above retain the provenance of those historical assets. Enemy kings retain their existing artwork and credits.
- `src/art/rulers/the_king.png` (The King, the ninth ruler and the default since STARTER-KING): the earlier king brought back, no new artwork. The seated and command rows are the castle's enthroned king (`src/art/throne/king_throne.png`, see the throne room entries above) as it is. The standing rows are the Last Stand's old king from the **Himeko Sutori** character pack in `chronos-assets` (`Template_Male`, `Plate_06_Lordly_Male` and its top, `Helm/Helm_Crown_Male`), with the same pack's `Facial Hair/BeardBlond` and `Staff_05_Radiant_Male` as his sceptre, cut from the pack's 128 px grid and drawn twice up; his fall ends on the kneel turned 90 degrees. Built by `tools/rulers/the-king.py` (lossless pixel moves only). When he rises from his seat he stands before the Iron Stag's throne from `thrones.png` (the old art has no empty throne).

## Anime hero gallery

- `src/art/heroes/*.webp`: 45 original anime hero scenes and 45 transparent menu cutouts generated with OpenAI image generation in October 2026 for the owner's hero overview request. Each full illustration has an individual pose and situation. Kitsune, Gorgon, Illusionist and Time Witch follow the owner's supplied redesign concept; the other heroes draw on their established game identities and colours.
- `tools/anime-heroes/catalogue.json` and `scenes.json` record the character directions and scene briefs. Generated production atlases are split into individual assets and transcoded for the offline gallery by `extract.cjs` and `pack.cjs`. Battle animation artwork and its existing credits remain separate.

<<<<<<< HEAD
## Illustrated loading screen

`src/art/loading/last-keep.webp`: original fantasy illustration generated with OpenAI image generation from the owner-approved moonlit keep concept, revised with a crowned king and his archer, paladin and fire wizard guard. Typography, mist, embers, beacon light and loading indicator are live HTML/CSS.
=======

## Last Stand ornate room artwork (`src/art/stand/ornate/`)

- Original castle environment artwork generated with OpenAI image generation at the owner's request to replace the earlier coarse room assets, following the approved Last Stand concept. Production source atlases are retained in `tools/stand/generated/ornate-{props,materials,garden}.png`.
- The new pieces are carved heraldic columns, Gothic stained glass, wooden bookcases, braziers, a tiered fountain, rose-covered arcades, reading desks, carved rubble, a compass medallion, limestone and courtyard paving, ashlar masonry, embroidered velvet, lawn, rose planters, trailing ivy and heraldic banners. `tools/stand/cut-ornate.py` extracts and downsamples them; `src/art/stand/ornate/provenance.json` records their sources.
- Last Stand uses the selected player's existing ruler atlas and throne from the Player rulers section above. These room assets do not replace any ruler, hero or enemy artwork. Earlier room-asset entries retain their historical provenance; the remaining well, lamps, stores, smoke and dust keep their existing credits.
>>>>>>> origin/main
