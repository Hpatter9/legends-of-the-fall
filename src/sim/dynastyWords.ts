// Dynasties' words (docs/design/legends-expansion.md section 3.1; docs/notes/dynasty-5.md): each hero kind's story age when its first
// bearer takes the field, and, for the ageless kinds (the Kitsune, the Reaper, the Mummy, the bots and the Kraken), the words their
// seasons are told in instead of years. A season served is one year of story age, so Kwame, 26, is 36 when he reaches Elder.
// Data only: no game rules. The ages are the bearers' own and never reach a fight.

/** Each kind's story age at its first season (a person's years; a beast's or a spirit's in the same years, told as they would tell it). */
export const BASE_AGE: Readonly<Record<string, number>> = {
  knight: 26, samurai: 28, kunoichi: 22, archer: 21, wizard: 30, peasant: 24, ninjaMonk: 27, wanderer: 33, lightningMage: 23,
  kitsune: 300, karasu: 61, yamabushi: 88, werewolf: 25, minotaur: 40, satyr: 52, gorgon: 120, samuraiCommander: 38, paladin: 29,
  cleric: 25, druid: 34, barbarian: 27, ranger: 26, warlock: 31, illusionist: 24, gunslinger: 27, shambler: 44, rifleBot: 7,
  mercenary: 32, mummy: 3000, buccaneer: 30, wolfBard: 26, beastmaster: 28, kraken: 9, lancer: 24, reaper: 1000, timeWitch: 35,
  arcBlade: 22, dreadPirate: 41, siegeBot: 11, priestess: 26, dragoon: 23, juggernaut: 36, sage: 50, demonSwordsman: 29, tyrant: 45,
  vampireLord: 400, hemomancer: 300, nightstalker: 150, bloodGargoyle: 600, dhampir: 27, warDrummer: 33, geomancer: 48, bellWarden: 200, falconer: 25,
};

/** The ageless kinds: how a season served is told ("in its sixth year of service"), and the veteran's and the elder's touch in its own
 *  words (the people's are a streak of grey, then grey hair). */
export interface AgelessWords {
  /** The age line in place of years. */
  age: (served: number) => string;
  veteran: string;
  elder: string;
}

const nth = (n: number): string => {
  const t = n % 100;
  if (t >= 11 && t <= 13) return `${n}th`;
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
};

export const AGELESS: Readonly<Record<string, AgelessWords>> = {
  kitsune: { age: (s) => `${300 + s} years a fox`, veteran: 'Kohaku’s ninth tail begins to grey at its tip', elder: 'Kohaku’s ninth tail is silver from root to tip' },
  reaper: { age: (s) => `${nth(s + 1)} season of the long watch`, veteran: 'the lantern on Vesper’s scythe burns lower and steadier', elder: 'Vesper’s robe has faded to the grey of old ash' },
  mummy: { age: (s) => `${nth(s + 1)} season since the waking`, veteran: 'Seneb’s wraps have yellowed like old papyrus', elder: 'Seneb’s wraps are pale as desert bone' },
  rifleBot: { age: (s) => `service year ${7 + s}`, veteran: 'Rook-7’s brass has dulled to a soldier’s patina', elder: 'Rook-7’s plating wears the grey of long service' },
  siegeBot: { age: (s) => `service year ${11 + s}`, veteran: 'Bastion’s hull has dulled to a veteran’s patina', elder: 'Bastion’s hull wears the grey of long service' },
  kraken: { age: (s) => `${nth(s + 1)} tide on land`, veteran: 'Skerry’s shell has dulled like a sea-worn stone', elder: 'Skerry’s shell is pale as old coral' },
};

/** The touch of the years in a person's (or a beast's) own look, by stage. */
export const VETERAN_LOOK = 'a streak of grey at the temples';
export const ELDER_LOOK = 'hair gone grey with honour';
/** Beasts and spirits that are not ageless still grey, in their own way. */
export const BEAST_LOOK: Readonly<Record<string, { veteran: string; elder: string }>> = {
  werewolf: { veteran: 'grey in Vuk’s muzzle', elder: 'Vuk’s coat silvered like the full moon' },
  minotaur: { veteran: 'Asterion’s horns ringed with age', elder: 'Asterion’s hide gone iron-grey' },
  wolfBard: { veteran: 'grey in Lovell’s muzzle', elder: 'Lovell’s coat silvered from ear to tail' },
  gorgon: { veteran: 'a silver snake among Xanthe’s locks', elder: 'Xanthe’s serpents silvered, every one' },
  karasu: { veteran: 'grey among Kurogane’s pinions', elder: 'Kurogane’s feathers gone the grey of storm clouds' },
  yamabushi: { veteran: 'Kazan’s beard has a frost in it', elder: 'Kazan’s beard is white as mountain snow' },
  satyr: { veteran: 'Dorion’s curls salted with grey', elder: 'Dorion’s curls and beard gone silver' },
  shambler: { veteran: 'Hobb’s stitches greyed with weather', elder: 'Hobb is grey as an old gravestone' },
  dreadPirate: { veteran: 'salt-grey in Harrow’s beard', elder: 'Harrow’s beard white as sea foam' },
};

/** What each season is like (words only: the seasons give the War no rules yet). */
export const SEASON_LINES: Readonly<Record<string, string>> = {
  spring: 'The roads are open and the young take to them. New names are made in spring.',
  summer: 'Long days on the march. The heroes on the road earn their years in the sun.',
  autumn: 'The harvest is in and the old songs are sung. A good season for remembering.',
  winter: 'Fires in the Hearth Hall and stories at the long table. The War waits for the thaw.',
};
