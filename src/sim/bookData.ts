// Skill books (the owner's ask: "add skill books that allow heroes to learn and replace their skills. Bought from the store, or
// better ones are found"; docs/notes/books-shop-gear-design.md and docs/notes/shop-books-gear.md). A book teaches one skill, an
// existing hero kit's skill (the same cast, painting and rules), to a hero of a calling suited to it. This file is the catalogue and
// who reads what; the rules (study, the loadout, the slot a book makes) are in `books.ts`. Pure data: no Pixi, no DOM.

/** The five kinds of book, one for each sort of calling and one for everyone. */
export type BookKind = 'manual' | 'grimoire' | 'hymnal' | 'bestiary' | 'universal';
export type BookRarity = 'common' | 'uncommon' | 'rare' | 'legendary';

export interface BookDef {
  id: string;
  title: string;
  kind: BookKind;
  rarity: BookRarity;
  /** The line of its history, shown in italics. */
  history: string;
  /** The skill it teaches: that hero's skill 1 or 2 (its cast, painting and strength). */
  from: { hero: string; slot: 1 | 2 };
  /** A share of the source skill's strength (1 when unset): the balance knob for a book's skill in another hero's hands. */
  tune?: number;
}

/** The kinds' names, as the shelf and the sheet show them. */
export const KIND_NAMES: Readonly<Record<BookKind, string>> = { manual: 'Manual', grimoire: 'Grimoire', hymnal: 'Hymnal', bestiary: 'Bestiary', universal: 'Universal' };
export const RARITY_WORDS: Readonly<Record<BookRarity, string>> = { common: 'Common', uncommon: 'Uncommon', rare: 'Rare', legendary: 'Legendary' };
/** A book's rarity as the gear's grade (Common 1, Uncommon 2, Rare 3, Legendary 4), so books and gear share one colour language. */
export const RARITY_GRADE: Readonly<Record<BookRarity, number>> = { common: 1, uncommon: 2, rare: 3, legendary: 4 };

/** Who reads what (the owner's rule: only the kinds suited to a hero's calling, plus the universal books). One line to change. */
export const READS: Readonly<Record<Exclude<BookKind, 'universal'>, readonly string[]>> = {
  manual: ['knight', 'samurai', 'kunoichi', 'archer', 'peasant', 'ninjaMonk', 'samuraiCommander', 'barbarian', 'ranger', 'gunslinger', 'rifleBot', 'mercenary', 'buccaneer', 'beastmaster', 'lancer', 'reaper', 'arcBlade', 'dreadPirate', 'siegeBot', 'dragoon', 'juggernaut', 'demonSwordsman'],
  grimoire: ['wizard', 'lightningMage', 'warlock', 'illusionist', 'tyrant'],
  hymnal: ['cleric', 'priestess', 'wanderer', 'druid', 'paladin', 'wolfBard', 'timeWitch', 'sage'],
  bestiary: ['kitsune', 'karasu', 'yamabushi', 'werewolf', 'minotaur', 'satyr', 'gorgon', 'shambler', 'mummy', 'kraken'],
};

/** The first catalogue (the design's table): Common and Uncommon on the stall's shelf, Rare found in chests. */
export const BOOKS: readonly BookDef[] = [
  { id: 'whirlingStep', title: 'Notes on the Whirling Step', kind: 'manual', rarity: 'common', from: { hero: 'barbarian', slot: 1 }, history: 'Copied out by a barbarian’s daughter who could not read, from a man who could not write. It works anyway.' },
  { id: 'shieldwallDrill', title: 'The Shieldwall Drill', kind: 'manual', rarity: 'common', from: { hero: 'knight', slot: 2 }, history: 'The drill book of the Dawn Watch, every page stamped “do not lend”. It was lent.' },
  { id: 'boatswainsHook', title: 'A Boatswain’s Hook', kind: 'manual', rarity: 'common', from: { hero: 'buccaneer', slot: 1 }, history: 'Half a sea chart, half a knot book; the knots are the useful half.' },
  { id: 'bountyLedger', title: 'The Bounty Ledger', kind: 'manual', rarity: 'uncommon', from: { hero: 'mercenary', slot: 2 }, history: 'A hunter’s accounts: names, prices, and a neat line through each.' },
  { id: 'trappersAlmanac', title: 'A Trapper’s Almanac', kind: 'manual', rarity: 'uncommon', from: { hero: 'ranger', slot: 2 }, history: 'Where the deer walk, when the frost comes, and where to leave the iron.' },
  { id: 'riverbankIaido', title: 'The Riverbank Iaido', kind: 'manual', rarity: 'rare', from: { hero: 'samurai', slot: 1 }, history: 'Twelve pages, one cut. A swordsman by a river wrote it over forty years.' },
  { id: 'firstFires', title: 'First Fires', kind: 'grimoire', rarity: 'common', from: { hero: 'wizard', slot: 1 }, history: 'Every apprentice’s first spellbook, its corners singed by every apprentice.' },
  { id: 'forkedSkies', title: 'Of Forked Skies', kind: 'grimoire', rarity: 'uncommon', from: { hero: 'lightningMage', slot: 1 }, history: 'Written in a tower struck nine times. The author was in it for six.' },
  { id: 'pactPrimer', title: 'The Pact Primer', kind: 'grimoire', rarity: 'uncommon', from: { hero: 'warlock', slot: 1 }, history: 'It asks for a signature on the first page. Don’t.' },
  { id: 'burningWall', title: 'The Burning Wall', kind: 'grimoire', rarity: 'rare', from: { hero: 'wizard', slot: 2 }, history: 'The siege notes of a mage who held a gate alone for a night.' },
  { id: 'morningPrayers', title: 'Morning Prayers', kind: 'hymnal', rarity: 'common', from: { hero: 'cleric', slot: 2 }, history: 'A village chapel’s hymnal, the hymns for wounds marked with ribbons.' },
  { id: 'wardensPsalter', title: 'The Warden’s Psalter', kind: 'hymnal', rarity: 'uncommon', from: { hero: 'paladin', slot: 2 }, history: 'Sung by the order’s wardens on the walls at night, so the walls would hear.' },
  { id: 'lastRites', title: 'Last Rites, Unsaid', kind: 'hymnal', rarity: 'rare', from: { hero: 'priestess', slot: 2 }, history: 'A priest’s book of the prayers for the dying, with one prayer crossed out and a better one written in.' },
  { id: 'mountainBreathes', title: 'What the Mountain Breathes', kind: 'bestiary', rarity: 'common', from: { hero: 'yamabushi', slot: 1 }, history: 'A tengu’s tally of the winds on one mountain, in feathers stuck to the page.' },
  { id: 'tidepoolNotes', title: 'Tidepool Notes', kind: 'bestiary', rarity: 'uncommon', from: { hero: 'kraken', slot: 1 }, history: 'Water-stained, and still damp. It always is.' },
  { id: 'labyrinthsLesson', title: 'The Labyrinth’s Lesson', kind: 'bestiary', rarity: 'uncommon', from: { hero: 'minotaur', slot: 2 }, history: 'Hoof-prints, mostly, in a careful order.' },
  { id: 'gorgonsMirror', title: 'The Gorgon’s Mirror', kind: 'bestiary', rarity: 'rare', from: { hero: 'gorgon', slot: 2 }, history: 'Read it in a mirror. The scholar who didn’t is the bookend.' },
  { id: 'pocketbook', title: 'The Illusionist’s Pocketbook', kind: 'universal', rarity: 'rare', from: { hero: 'illusionist', slot: 1 }, history: 'There are two of these. Or one. It depends who’s looking.' },
  { id: 'wellOfStars', title: 'A Well of Stars', kind: 'universal', rarity: 'rare', from: { hero: 'sage', slot: 2 }, history: 'A sage’s diary of the nights the sky gave more than it took.' },
];

export const BOOK_BY_ID: Readonly<Record<string, BookDef>> = Object.fromEntries(BOOKS.map((b) => [b.id, b]));
export const bookById = (id: string): BookDef | undefined => BOOK_BY_ID[id];

/** The kind of book a hero kind reads besides the universal ones (undefined for a kind in no list). */
export function readsKind(kind: string): Exclude<BookKind, 'universal'> | undefined {
  for (const [k, list] of Object.entries(READS)) if (list.includes(kind)) return k as Exclude<BookKind, 'universal'>;
  return undefined;
}

/** Fights (waves) a book takes to study, by rarity, before the library's cut. */
export const STUDY: Readonly<Record<BookRarity, number>> = { common: 5, uncommon: 8, rare: 12, legendary: 20 };
/** A book's base price on the stall at the first army (Common and Uncommon only: Rare and Legendary books are found, not sold). */
export const BOOK_PRICE: Readonly<Partial<Record<BookRarity, number>>> = { common: 350, uncommon: 900 };
/** Crowns a spare book sells back for: a fifth of the shelf price for Common and Uncommon, a fixed sum for a Rare; Legendary never. */
export const BOOK_SELL_SHARE = 0.2;
export const RARE_BOOK_SELL = 400;
