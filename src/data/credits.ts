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
    { work: 'Original art made for Legends of the Last Keep.' },
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
    { work: 'Golems and elementals: the Golem Forge, the treant, the wraith and the decoy', author: 'batareya', unconfirmed: true },
    { work: 'RPG Maker MV animals: Duchess the goat, the wolves and the wild dogs', author: 'whtdragon', unconfirmed: true },
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
    { work: 'Original sound made for Legends of the Last Keep: the effects and the king’s spells.' },
    { work: 'Eight recorded combat sounds: hits, a shield block, a crit, a bowstring, an arrow, a death and an explosion', author: 'Source not yet recorded', unconfirmed: true },
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
