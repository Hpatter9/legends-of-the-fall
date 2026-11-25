// STORE-CREDITS (docs/notes/store-credits.md): the in-app Credits page's list, written for players. One entry per creator or pack,
// grouped as the page shows them. CREDITS.md stays the developers' record (which file came from where); `test/store-credits.test.ts`
// checks that every third-party creator, pack and licence it names is covered here, so the two cannot drift apart.
// Pure data: no DOM.

export type CreditGroup = 'Art' | 'Characters and monsters' | 'Music' | 'Sound' | 'Fonts';

export interface PlayerCredit {
  /** The work or pack (or, for music, the composer's tracks). */
  work: string;
  /** Who made it; left out for the game's own work. */
  author?: string;
  /** The licence's name as players read it; left out for the game's own work. */
  licence?: string;
  /** The licence asks for its author's credit (or its notice) to be shown. */
  credit?: boolean;
  /** The licence has not been confirmed yet (CREDITS.md: "licence unconfirmed"). */
  unconfirmed?: boolean;
  /** Where the work comes from, given where the licence asks for credit or the author asks for a link. */
  link?: string;
  /** The packs or tracks the entry stands for, in a line under it. */
  includes?: string[];
}

export const CREDIT_GROUPS: readonly CreditGroup[] = ['Art', 'Characters and monsters', 'Music', 'Sound', 'Fonts'];

const CRAFTPIX_LICENCE = 'Craftpix free licence';
const CRAFTPIX_LINK = 'https://craftpix.net/file-licenses/';
const OFL = 'SIL Open Font Licence 1.1';
const OFL_LINK = 'https://openfontlicense.org';

export const PLAYER_CREDITS: Readonly<Record<CreditGroup, readonly PlayerCredit[]>> = {
  Art: [
    {
      work: 'Original art made for Legends of the Last Keep.',
      // (RELEASE-ART: the release's pieces, named for players)
      includes: ['The gatehouse and the loading poster', 'The speech bubble, the battle panel, the class sigils and the menu icons', 'The daily chest, the achievement medal and the codex', 'The Orc Chieftain, the Bone Captain, the Minotaur Champion and the Gorgon Queen', 'The Golem Forge, the treant, the wraith, the decoy, the wolves and Duchess the goat'],
    },
    {
      work: 'Free pixel-art packs: backgrounds, tilesets, props and icons',
      author: 'Craftpix.net',
      licence: CRAFTPIX_LICENCE,
      link: CRAFTPIX_LINK,
      includes: [
        'Free Mountain Backgrounds',
        'Free Summer Pixel Art Backgrounds',
        'Free Autumn Pixel Backgrounds',
        'Free Winter Backgrounds',
        'Desert Oasis pixel backgrounds',
        'Forest and Trees pixel backgrounds',
        'Free Crystal Cave Pixel Art Backgrounds',
        'Free City Ruin Backgrounds',
        'Free Ancient Temple Pixel Game Backgrounds',
        'Free Steampunk Cityscape Pixel Backgrounds',
        'Free Post-Apocalyptic Pixel Art Game Backgrounds',
        'Free Moon Pixel Game Backgrounds',
        'Abandoned Places Background Collection',
        'Free Mountain Peak Pixel Art Backgrounds',
        'Free Pixel Art Cloud and Sky Backgrounds',
        'Free Seamless Pixel Art Cloudscape for Game Projects',
        'Free Clouds Pixel Art Asset Pack',
        'Fantasy 2D Battlegrounds',
        'Free Undead Tileset Top-Down Pixel Art',
        'Free Fields Tileset',
        'Free Rocks pixel art pack',
        'Rocky Area Objects',
        'Village Tileset for top-down defence',
        'Free Top-Down Pixel Art Cave Objects',
        'Crystal Caves 2D platformer tileset',
        'Free 2D Top-Down Pixel Dungeon Asset Pack',
        'Free Bridges Top-Down Pixel Art Asset Pack',
        'Free Platformer Game Tileset Pixel Art',
        'Free Medieval Field Work 2D Tileset for Platformer',
        'Free Underwater World 2D Game Objects',
        'Free Mining Pixel 32x32 Icons',
      ],
    },
    {
      work: 'DawnLike 16x16 tileset: item, relic, equipment and map icons, and the road’s birds',
      author: 'DragonDePlatino, on DawnBringer’s palette',
      licence: 'CC-BY 4.0',
      credit: true,
      link: 'https://opengameart.org/content/dawnlike-16x16-universal-rogue-like-tileset-v181',
    },
    { work: '5000 Pixel Effects', author: 'blueberry', licence: 'Free for games, credit appreciated', link: 'https://blueberry-assets.itch.io' },
    { work: 'Super Pixel Effects Gigapack (Free Version)', author: 'unTied Games', licence: 'Free version' },
    { work: 'PVFX Foundry: the rift portal and landing dust', author: 'Pixel VFX Studio', licence: 'CC0 1.0' },
    {
      // (PIXELLAB-ART: PixelLab is a tool, not a pack: the pictures are the game's own, made with it from the game's art)
      work: 'Pixel art made for the game with PixelLab',
      author: 'PixelLab (pixellab.ai)',
      licence: 'PixelLab terms: the output is ours to use',
      link: 'https://www.pixellab.ai',
      includes: ['The class heroes, the remade heroes and many foes and bosses', 'The Alpha Werewolf, the Nine-Tailed Fox and the risen skeletons', 'The Boar King’s, the Grove Spearlord’s and five more trophies', 'The Wanted and crown marks, the curse icon and the pause button'],
    },
  ],
  'Characters and monsters': [
    {
      work: 'Free character and monster sprite packs',
      author: 'Craftpix.net',
      licence: CRAFTPIX_LICENCE,
      link: CRAFTPIX_LINK,
      includes: [
        'Free Knight, Samurai, Ninja, Wizard and Skeleton Sprite Sheets',
        'Free Wizard Sprite Sheets',
        'Free Werewolf Sprite Sheets',
        'Free Gorgon Sprite Sheets',
        'Free Minotaur Sprite Sheets',
        'Free Satyr Sprite Sheets',
        'Free Yokai Character Sprites',
        'Free Forest Bosses',
        'Free Fantasy RPG Top-Down Boss Creatures',
        'Free Robot Pixel Art Sprite Sheets',
        'Fantasy RPG Pirate Boss Character Pack',
        'Free Enemy Pixel Pack for Top-Down Defense',
      ],
    },
    {
      work: 'Himeko Sutori sprite share',
      author: 'Rockwell Studios, LLC (Himeko Sutori and Septaroad Voyager); Half-Kaizer sprite template by Showkaizer; additional Half-Kaizer poses by Aleesa Tana',
      licence: 'Free to use with attribution',
      credit: true,
    },
    {
      work: 'Universal LPC Spritesheet: Gwen Tallow behind the tavern’s bar',
      author: 'The LPC artists (listed in the spritesheet’s AUTHORS file)',
      licence: 'CC-BY-SA 3.0 / GPL 3.0',
      credit: true,
      link: 'https://github.com/makrohn/Universal-LPC-spritesheet',
    },
  ],
  Music: [
    {
      work: 'Blackmoor Colossus, Woodland Fantasy, The Dark Amulet, Wasteland Showdown, Tactical Pursuit, Soliloquy and Enchanted Festival',
      author: 'Matthew Pablo',
      licence: 'CC-BY 3.0',
      credit: true,
      link: 'https://www.matthewpablo.com',
    },
    {
      work: 'Briefing Theme (from Unused Music) and Iron Wasteland',
      author: 'Alexandr Zhelanov',
      licence: 'CC-BY 4.0',
      credit: true,
      link: 'https://opengameart.org/users/alexandr-zhelanov',
    },
    { work: 'Boss Battle #2 [Symphonic Metal], #6 [Metal Alternate], #7 [Metal], #8 [Metal], #9 [Metal] and 10 [Metal]', author: 'nene', licence: 'CC0' },
    { work: 'Victory Fanfare (with Thalon) and Crystal Cave & Mysterious Ambience', author: 'cynicmusic (Alex Smith, The Cynic Project)', licence: 'CC0' },
    { work: 'No Hope', author: 'Cleyton Kauffman', licence: 'CC0' },
    { work: 'Spooky Waltz (Music Box)', author: 'Aureolus_Omicron', licence: 'CC0' },
    { work: 'Emotional Piano Loop', author: 'Extenz', licence: 'CC0' },
    { work: 'The Old Tower Inn, Battle March and Medieval Victory Theme', author: 'OpenGameArt.org', licence: 'CC0' },
    { work: 'Original music made for Legends of the Last Keep.' },
  ],
  Sound: [
    { work: 'Original sound made for Legends of the Last Keep: the king’s spells, and the tuned chimes, stingers and blips.' },
    // (CC0-SOUNDS: the recorded sound effects, all from OpenGameArt.org; CC0 asks no credit, it is given anyway)
    { work: 'RPG Audio, and the Impact Sounds, RPG Audio and Sci-fi Sounds in 150 Combat Sound Effects', author: 'Kenney', licence: 'CC0' },
    { work: '150 Combat Sound Effects (with sounds by Kronbits and lentikula)', author: 'untamedpixels', licence: 'CC0', includes: ['Kronbits: 200 Free SFX', 'lentikula: Basic, Druid and Healing Spell Impacts'] },
    {
      work: 'CC0 sound packs',
      author: 'rubberduck',
      licence: 'CC0',
      includes: ['80 CC0 RPG SFX', '100 CC0 SFX 2', '100 CC0 metal and wood SFX', '75 CC0 breaking, falling and hit SFX', '25 CC0 bang and firework SFX', '80 CC0 creature SFX'],
    },
    { work: 'Sword attacks and clashes, impact and shield blocks, coins, metal dings, a cave-in and a shouting crowd', author: 'StarNinjas', licence: 'CC0',
      includes: ['20 sword sound effects', '10 impact and shield blocks', '12 coin sound effects', '4 metal dings', 'Cave-in', 'Crowd shouting'] },
    { work: 'Punch, Impact, 20 rustles, 3 dark magic spells and Energy drain; the Independent.nu Ljudbank’s 35 wooden cracks, hits and destructions and 8 wet squish impacts', author: 'qubodup', licence: 'CC0' },
    { work: 'Tinysized SFX library and Fantasy weapons and apparel SFX library', author: 'Vehicle (Jan Schupke)', licence: 'CC0' },
    { work: 'Swishes sound pack', author: 'artisticdude', licence: 'CC0' },
    {
      work: 'Single sounds',
      author: 'Various OpenGameArt.org artists',
      licence: 'CC0',
      includes: [
        'Bones rattle by congusbongus', 'Skeleton SFX short pack by colodical', 'Ice breaking and shattering, and Wind, by IgnasD', 'Bell dings and chimes by pwl',
        'Bubble sound effects by bmaczero', 'They’re coming (a horn) by stumpystrust', 'Wolf monster sound by caveboytup', 'Deep monster roar by trazzz123',
        'Earthquake and open sesame by mieki256', 'Chunky explosion by Joth', 'Gunshots by Kurt', 'Catching fire and Breaking rock by TheMightyGlider',
        'Teleport spell by ogrebane', 'Air whoosh by pyranostudios', 'Dynamite sound effect by listener',
      ],
    },
  ],
  Fonts: [
    { work: 'Cinzel Decorative', author: 'Natanael Gama', licence: OFL, credit: true, link: OFL_LINK },
    { work: 'Alegreya Sans', author: 'Juan Pablo del Peral, Huerta Tipográfica', licence: OFL, credit: true, link: OFL_LINK },
    { work: 'Press Start 2P', author: 'CodeMan38', licence: OFL, credit: true, link: OFL_LINK },
    { work: 'Pixelify Sans', author: 'Stefie Justprince', licence: OFL, credit: true, link: OFL_LINK },
  ],
};

/** Every word the page shows for an entry, for the test's search. */
export function creditText(c: PlayerCredit): string {
  return [c.work, c.author ?? '', c.licence ?? '', c.link ?? '', ...(c.includes ?? [])].join(' \n ');
}
