// The daily's build themes (DAILY-BUILDS): each day pushes one team idea. A theme picks the day's heroes (the starting five and
// the few more that Hire can bring out), a featured trait whose team bonus is doubled for the day, the host army whose boss
// ends the run, the land, and sometimes a floor twist; and it sets a goal: beat the boss of the day with enough of the featured
// trait on the field for a third bonus star. The themes go round in a fixed order from `DAILY_THEMES_FROM` on, one a day, so a
// theme comes back every `DAILY_THEMES.length` days and never twice in a fortnight; a date before it keeps the old daily.
//
// Pure rules: no Pixi, no DOM, no clock (the date is passed in as yyyymmdd). Nothing here draws from any stream.

import type { Area } from './board';
import { TWISTS, type TwistFx } from './twists';
import { mergeEffects } from './relics';
import { countTraits, TRAITS, type TraitEffects } from './traits';

export interface DailyTheme {
  id: string;
  name: string;
  /** One line that says the idea, for the start card and the deploy banner. */
  idea: string;
  /** The trait the day is built round: its team bonus is doubled while it is woken. */
  trait: string;
  /** The goal: this many different heroes of `trait` on the field when the boss of the day falls. */
  need: number;
  /** The starting five (all in the squad at wave 1). */
  five: readonly [string, string, string, string, string];
  /** The other heroes Hire can bring out (with the five, the day's whole pool). */
  more: readonly string[];
  /** The army whose troops, mid-boss and boss the day uses (one of `DAILY_ARMIES`). */
  host: string;
  area: Area;
  /** A floor twist on every wave (an id in `TWISTS`), or the theme's own when the table has none that fits. */
  twist?: string;
  fx?: TwistFx;
  /** The field waves come as a swarm: twice the foes, each with `SWARM_HP` of the hp. */
  swarm?: boolean;
  /** The mid-boss's and the boss of the day's hp and attack are multiplied by this (set by `tools/daily-builds/themeRate.mjs`, so each theme clears about as often as the old daily); 1 when unset. */
  boss?: number;
}

/** The first date that has a theme (yyyymmdd); a date before it is the old daily, so a run saved before the change plays on as it was. */
export const DAILY_THEMES_FROM = 20261101;
/** The featured trait's woken bonus counts this many times over. */
export const FEATURED_MULT = 2;
/** A swarm's foes have this share of their hp (and there are twice as many). */
export const SWARM_HP = 0.5;
/** At most this many foes in a swarm wave (the foes' two rows hold sixteen; eight leaves room to walk). */
export const SWARM_MAX = 8;

const th = (t: DailyTheme): DailyTheme => t;

/** The themes in the order they come round (set so that no two days running share a host army or a land). */
export const DAILY_THEMES: readonly DailyTheme[] = [
  th({ id: 'beasts', name: "Beasts' Night", idea: 'Four Beasts wake the pack: +16% attack for the day.', trait: 'beast', need: 4, five: ['werewolf', 'minotaur', 'satyr', 'knight', 'archer'], more: ['gorgon', 'wolfBard'], host: 'beasts', area: 'autumn', boss: 1.08 }),
  th({ id: 'casters', name: 'Spellstorm', idea: 'Casters refill their pools twice as fast, and mana surges.', trait: 'caster', need: 4, five: ['wizard', 'wanderer', 'warlock', 'knight', 'peasant'], more: ['tyrant', 'sage'], host: 'undead', area: 'graveyard', twist: 'mana' }),
  th({ id: 'swarm', name: 'The Swarm', idea: 'Twice the foes at half the hp: fire and lightning that spread win it.', trait: 'mystic', need: 3, five: ['wizard', 'lightningMage', 'knight', 'samurai', 'peasant'], more: ['wanderer', 'sage', 'dreadPirate'], host: 'orcs', area: 'warcamp', swarm: true, boss: 0.62 }),
  th({ id: 'shields', name: 'Shields Up', idea: 'The foes hit 15% harder: Guardians and Bulwarks take the blows.', trait: 'guardian', need: 3, five: ['knight', 'paladin', 'kraken', 'archer', 'wizard'], more: ['yamabushi', 'juggernaut', 'peasant'], host: 'ogres', area: 'highlands', fx: { foeAtk: 1.15 }, boss: 0.7 }),
  th({ id: 'wild', name: 'The Wild Hunt', idea: 'Four of the Wild hit 24% harder.', trait: 'wild', need: 4, five: ['werewolf', 'druid', 'barbarian', 'knight', 'archer'], more: ['wolfBard', 'satyr'], host: 'wildwood', area: 'forest', boss: 1.12 }),
  th({ id: 'glass', name: 'Glass Cannons', idea: 'Everyone hits 25% harder, foes too: Assassins strike first.', trait: 'assassin', need: 4, five: ['mercenary', 'buccaneer', 'reaper', 'archer', 'knight'], more: ['arcBlade', 'kunoichi'], host: 'labyrinth', area: 'temple', fx: { heroAtk: 1.25, foeAtk: 1.25 } }),
  th({ id: 'holy', name: 'Holy Vigil', idea: 'Hallowed ground: healing is half again as strong, and the Holy stand longer.', trait: 'holy', need: 3, five: ['paladin', 'cleric', 'samurai', 'archer', 'knight'], more: ['priestess', 'wolfBard'], host: 'undead', area: 'shrine', twist: 'holy' }),
  th({ id: 'samurai', name: 'Way of the Blade', idea: 'Four Samurai: +20% attack, and a duel at every turn.', trait: 'samurai', need: 4, five: ['samurai', 'kunoichi', 'archer', 'knight', 'wizard'], more: ['ninjaMonk', 'samuraiCommander'], host: 'orcs', area: 'highlands' }),
  th({ id: 'iron', name: 'Iron and Steam', idea: 'Four Machines hit 20% harder and shrug off blows.', trait: 'machine', need: 4, five: ['rifleBot', 'arcBlade', 'juggernaut', 'archer', 'knight'], more: ['siegeBot', 'gunslinger'], host: 'labyrinth', area: 'forge' }),
  th({ id: 'crown', name: 'Crown and Lance', idea: 'The air hums: everyone is quicker, and Royals rule the field.', trait: 'royal', need: 4, five: ['lancer', 'dragoon', 'tyrant', 'archer', 'knight'], more: ['demonSwordsman', 'dreadPirate'], host: 'beasts', area: 'plains', twist: 'haste', boss: 0.9 }),
  th({ id: 'wardens', name: "The Wardens' Wall", idea: 'Four Wardens: every hero takes a fifth less damage.', trait: 'warden', need: 4, five: ['cleric', 'druid', 'shambler', 'archer', 'wizard'], more: ['mummy', 'knight'], host: 'ogres', area: 'snow', boss: 1.05 }),
  th({ id: 'yokai', name: 'Night of Spirits', idea: 'In the fog the Yokai slip one blow in eight.', trait: 'yokai', need: 3, five: ['kitsune', 'yamabushi', 'samurai', 'archer', 'wizard'], more: ['karasu', 'gorgon'], host: 'wildwood', area: 'swamp', twist: 'fog' }),
  th({ id: 'high', name: 'High Ground', idea: 'A gale lifts every jump: Marksmen on the heights reach twice as far.', trait: 'marksman', need: 3, five: ['archer', 'ranger', 'knight', 'peasant', 'samurai'], more: ['gunslinger', 'lightningMage'], host: 'undead', area: 'ruins', twist: 'gale', boss: 0.92 }),
  th({ id: 'sea', name: 'Sea Dogs', idea: 'A featured duo: hire the Kraken Mate to stand with the Buccaneer, crits and slips.', trait: 'pirate', need: 2, five: ['buccaneer', 'dreadPirate', 'knight', 'archer', 'wizard'], more: ['kraken', 'gunslinger'], host: 'beasts', area: 'oasis' }),
  th({ id: 'frontier', name: 'Frontier Guns', idea: 'Four of the Frontier: +28% crit chance for the whole party.', trait: 'frontier', need: 4, five: ['ranger', 'gunslinger', 'mercenary', 'knight', 'peasant'], more: ['beastmaster', 'rifleBot'], host: 'orcs', area: 'desert', boss: 0.85 }),
  th({ id: 'grave', name: 'Grave Pact', idea: 'A dark pall wounds the living: four Undead have 28% more health.', trait: 'undead', need: 4, five: ['shambler', 'mummy', 'reaper', 'archer', 'wizard'], more: ['dreadPirate', 'cleric'], host: 'ogres', area: 'dungeon', twist: 'cursed' }),
  th({ id: 'arcane', name: 'Arcane Tide', idea: 'Four of the Arcane refill their pools 60% faster.', trait: 'arcane', need: 4, five: ['warlock', 'timeWitch', 'satyr', 'knight', 'archer'], more: ['illusionist', 'sage'], host: 'wildwood', area: 'crystal', boss: 0.85 }),
  th({ id: 'tricks', name: 'Smoke and Mirrors', idea: 'Tricksters make the party quick: decoys, blinks and swaps.', trait: 'trickster', need: 3, five: ['kunoichi', 'illusionist', 'knight', 'archer', 'wizard'], more: ['kitsune', 'karasu'], host: 'labyrinth', area: 'ruins', boss: 0.9 }),
];

/** Days since 1 January 2000 of a yyyymmdd date (the calendar's own count, so it does not hang on the clock or the time zone). */
export function dayNumber(date: number): number {
  const y = Math.floor(date / 10000);
  const m = Math.floor(date / 100) % 100;
  const d = date % 100;
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(2000, 0, 1)) / 86_400_000);
}

/** A date's theme, or null for a date before `DAILY_THEMES_FROM` (the old daily). */
export function dailyTheme(date: number): DailyTheme | null {
  if (date < DAILY_THEMES_FROM) return null;
  const n = dayNumber(date) - dayNumber(DAILY_THEMES_FROM);
  return DAILY_THEMES[((n % DAILY_THEMES.length) + DAILY_THEMES.length) % DAILY_THEMES.length];
}

/** The day's whole pool: the five, then the heroes Hire can add. */
export const themePool = (t: DailyTheme): string[] => [...t.five, ...t.more];

/** The twist a theme lays on every wave (its own `fx`, or a table twist's), or undefined. */
export const themeFx = (t: DailyTheme): TwistFx | undefined => t.fx ?? (t.twist ? TWISTS[t.twist].fx : undefined);

/** The heroes of the featured trait among some kinds (different kinds only). */
export const featuredCount = (t: DailyTheme, kinds: Iterable<string>): number => countTraits(kinds).find((c) => c.trait.id === t.trait)?.count ?? 0;

/** Whether the field meets the theme's goal (checked on the boss of the day's fight). */
export const themeGoalMet = (t: DailyTheme, kinds: Iterable<string>): boolean => featuredCount(t, kinds) >= t.need;

/** The extra bonus the featured trait gives on top of its usual one (`FEATURED_MULT` - 1 more of its woken tier), for `applyTraits`. */
export function featuredExtra(trait: string, kinds: Iterable<string>): TraitEffects {
  const c = countTraits(kinds).find((x) => x.trait.id === trait);
  if (!c?.active) return {};
  let fx: TraitEffects = {};
  for (let i = 1; i < FEATURED_MULT; i++) fx = mergeEffects(fx, c.trait.tiers[c.tier].effects);
  return fx;
}

/** A trait's name for many heroes: "Beasts", "Samurai", "Wild heroes". */
const PLURALS: Readonly<Record<string, string>> = { samurai: 'Samurai', yokai: 'Yokai', undead: 'Undead', wild: 'Wild heroes', holy: 'Holy heroes', frontier: 'Frontier heroes', arcane: 'Arcane heroes', knightly: 'Knightly heroes' };
export const traitPlural = (trait: string): string => PLURALS[trait] ?? `${TRAITS[trait].name}s`;

/** The goal in words: "Beat the boss with 4 Beasts on the field". */
export const themeGoalText = (t: DailyTheme): string => `Beat the boss with ${t.need} ${traitPlural(t.trait)} on the field`;

/** The bonus stars a date's clear can earn: no heart, quick, and on a themed day its goal. */
export const dailyStarsMax = (date: number): number => (dailyTheme(date) ? 3 : 2);
