// The daily's build themes (DAILY-BUILDS): each day pushes one team idea. A theme picks the day's heroes (the starting five and
// the few more that Hire can bring out), a featured trait whose team bonus is doubled for the day, the host army whose boss
// ends the run, the land, and sometimes a floor twist; and it sets a goal: beat the boss of the day with enough of the featured
// trait on the field for a third bonus star. From `DAILY_THEMES_FROM` on, the days come in blocks of `DAILY_THEMES.length`, each
// block every theme once in a shuffled order (`themeBlock`), worked out from the date alone, so every player meets the same theme
// on the same day. No theme comes back within `THEME_GAP` days, across a block's edge too, and no two days running share a host
// army or a land. A date before the switch keeps the old daily.
//
// Pure rules: no Pixi, no DOM, no clock (the date is passed in as yyyymmdd). The shuffle is its own side stream of the block's
// number (`mixSeed(block, 0x7e3e)`); nothing draws from any stream a fight uses.

import type { Area } from './board';
import { TWISTS, type TwistFx } from './twists';
import { countTraits, TRAITS } from './traits';
import { mixSeed, Rng } from './rng';

export interface DailyTheme {
  id: string;
  name: string;
  /** One line that says the idea, for the start card and the deploy banner. */
  idea: string;
  /** The trait the day is built round: its team bonus is doubled while it is woken. */
  trait: string;
  /** The goal: this many different heroes of `trait` on the field when the boss of the day falls (never more than the starting five hold: a Hire draws at random, so a goal may not lean on one; `docs/notes/goals-audit.md`). */
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

/** The first date that has a theme (yyyymmdd); a date before it is the old daily. (A run of a themed date begun before the change carries no
 *  `theme` in its mode, so it plays on as the old daily: `runTheme`.) */
export const DAILY_THEMES_FROM = 20261026;
/** No theme comes back within this many days. */
export const THEME_GAP = 14;
/** The featured trait counts this many heroes more than it has (TRAIT-PERKS: in place of its old bonus counted twice), so two of it on
 *  the day wake its second tier and three its signature (`countTraits`'s `featured`). */
export const FEATURED_PLUS = 1;
/** A swarm's foes have this share of their hp (and there are twice as many). */
export const SWARM_HP = 0.5;
/** At most this many foes in a swarm wave (the foes' two rows hold sixteen; eight leaves room to walk). */
export const SWARM_MAX = 8;

const th = (t: DailyTheme): DailyTheme => t;

/** The themes (each block of days shuffles them: `themeBlock`). */
export const DAILY_THEMES: readonly DailyTheme[] = [
  th({ id: 'beasts', name: "Beasts' Night", idea: 'The Beasts count one more today: three of them and every kill sends them into a frenzy.', trait: 'beast', need: 3, five: ['werewolf', 'minotaur', 'satyr', 'knight', 'archer'], more: ['gorgon', 'wolfBard'], host: 'beasts', area: 'autumn', boss: 1.08 }),
  th({ id: 'casters', name: 'Spellstorm', idea: 'Casters refill their pools twice as fast, and mana surges.', trait: 'caster', need: 3, five: ['wizard', 'wanderer', 'warlock', 'knight', 'peasant'], more: ['tyrant', 'sage'], host: 'undead', area: 'graveyard', twist: 'mana', boss: 0.92 }),
  th({ id: 'swarm', name: 'The Swarm', idea: 'Twice the foes at half the hp: fire and lightning that spread win it.', trait: 'mystic', need: 2, five: ['wizard', 'lightningMage', 'knight', 'samurai', 'peasant'], more: ['wanderer', 'sage', 'dreadPirate'], host: 'orcs', area: 'warcamp', swarm: true, boss: 0.52 }),
  th({ id: 'shields', name: 'Shields Up', idea: 'The foes hit 15% harder: Guardians and Bulwarks take the blows.', trait: 'guardian', need: 2, five: ['knight', 'paladin', 'kraken', 'archer', 'wizard'], more: ['yamabushi', 'juggernaut', 'peasant'], host: 'ogres', area: 'highlands', fx: { foeAtk: 1.15 }, boss: 0.6 }),
  th({ id: 'wild', name: 'The Wild Hunt', idea: 'The Wild count one more today: three of them and a stampede tramples the foes every 20 s.', trait: 'wild', need: 3, five: ['werewolf', 'druid', 'barbarian', 'knight', 'archer'], more: ['wolfBard', 'satyr'], host: 'wildwood', area: 'forest' }),
  th({ id: 'glass', name: 'Glass Cannons', idea: 'Everyone hits 25% harder, foes too: Assassins strike first.', trait: 'assassin', need: 3, five: ['mercenary', 'buccaneer', 'reaper', 'archer', 'knight'], more: ['arcBlade', 'kunoichi'], host: 'labyrinth', area: 'temple', fx: { heroAtk: 1.25, foeAtk: 1.25 } }),
  th({ id: 'holy', name: 'Holy Vigil', idea: 'Hallowed ground: healing is half again as strong, and the Holy stand longer.', trait: 'holy', need: 2, five: ['paladin', 'cleric', 'samurai', 'archer', 'knight'], more: ['priestess', 'wolfBard'], host: 'undead', area: 'shrine', twist: 'holy' }),
  th({ id: 'samurai', name: 'Way of the Blade', idea: 'The Samurai count one more today: three of them and the first to fall writes its death poem.', trait: 'samurai', need: 3, five: ['samurai', 'kunoichi', 'archer', 'knight', 'wizard'], more: ['ninjaMonk', 'samuraiCommander'], host: 'orcs', area: 'highlands' }),
  th({ id: 'iron', name: 'Iron and Steam', idea: 'The Machines count one more today: three of them and sentry turrets unfold every wave.', trait: 'machine', need: 3, five: ['rifleBot', 'arcBlade', 'juggernaut', 'archer', 'knight'], more: ['siegeBot', 'gunslinger'], host: 'labyrinth', area: 'forge', boss: 1.05 }),
  th({ id: 'crown', name: 'Crown and Lance', idea: 'The air hums: everyone is quicker, and Royals rule the field.', trait: 'royal', need: 3, five: ['lancer', 'dragoon', 'tyrant', 'archer', 'knight'], more: ['demonSwordsman', 'dreadPirate'], host: 'beasts', area: 'plains', twist: 'haste' }),
  th({ id: 'wardens', name: "The Wardens' Wall", idea: 'The Wardens count one more today: three of them and they raise warding circles when the party is hurt.', trait: 'warden', need: 3, five: ['cleric', 'druid', 'shambler', 'archer', 'wizard'], more: ['mummy', 'knight'], host: 'ogres', area: 'snow', boss: 1.12 }),
  th({ id: 'yokai', name: 'Night of Spirits', idea: 'In the fog the Yokai count one more: three of them and every wave opens in a spirit dusk.', trait: 'yokai', need: 2, five: ['kitsune', 'yamabushi', 'samurai', 'archer', 'wizard'], more: ['karasu', 'gorgon'], host: 'wildwood', area: 'swamp', twist: 'fog', boss: 0.92 }),
  th({ id: 'high', name: 'High Ground', idea: 'A gale lifts every jump, and the Marksmen count one more: their shots pin from the heights.', trait: 'marksman', need: 2, five: ['archer', 'ranger', 'knight', 'peasant', 'samurai'], more: ['gunslinger', 'lightningMage'], host: 'undead', area: 'ruins', twist: 'gale', boss: 0.92 }),
  th({ id: 'sea', name: 'Sea Dogs', idea: 'A featured duo: field the Kraken Mate beside the Buccaneer, and with one more today the Pirates walk the tide.', trait: 'pirate', need: 2, five: ['buccaneer', 'kraken', 'knight', 'archer', 'wizard'], more: ['dreadPirate', 'gunslinger'], host: 'beasts', area: 'oasis' }),
  th({ id: 'frontier', name: 'Frontier Guns', idea: 'The Frontier count one more today: three of them and the toughest foe of each wave is Wanted.', trait: 'frontier', need: 3, five: ['ranger', 'gunslinger', 'mercenary', 'knight', 'peasant'], more: ['beastmaster', 'rifleBot'], host: 'orcs', area: 'desert', boss: 0.85 }),
  th({ id: 'grave', name: 'Grave Pact', idea: 'A dark pall wounds the living, and the Undead count one more: three of them and the skeletons rise.', trait: 'undead', need: 3, five: ['shambler', 'mummy', 'reaper', 'archer', 'wizard'], more: ['dreadPirate', 'cleric'], host: 'ogres', area: 'dungeon', twist: 'cursed' }),
  th({ id: 'arcane', name: 'Arcane Tide', idea: 'The Arcane count one more today: three of them and every ultimate starts fuller.', trait: 'arcane', need: 3, five: ['warlock', 'timeWitch', 'satyr', 'knight', 'archer'], more: ['illusionist', 'sage'], host: 'wildwood', area: 'crystal', boss: 0.76 }),
  th({ id: 'tricks', name: 'Smoke and Mirrors', idea: 'The Tricksters count one more today: the first blow on each misses, and the low leave decoys.', trait: 'trickster', need: 2, five: ['kunoichi', 'illusionist', 'knight', 'archer', 'wizard'], more: ['kitsune', 'karasu'], host: 'labyrinth', area: 'ruins' }),
];

/** Days since 1 January 2000 of a yyyymmdd date (the calendar's own count, so it does not hang on the clock or the time zone). */
export function dayNumber(date: number): number {
  const y = Math.floor(date / 10000);
  const m = Math.floor(date / 100) % 100;
  const d = date % 100;
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(2000, 0, 1)) / 86_400_000);
}

/** Whether theme `b` may follow theme `a` on the next day: a different host army and a different land. */
const fits = (a: DailyTheme | undefined, b: DailyTheme): boolean => !a || (a.host !== b.host && a.area !== b.area);

const blocks = new Map<number, readonly number[]>();
/**
 * The order of block `n` of days (block 0 starts on `DAILY_THEMES_FROM`): every theme once, as indices into `DAILY_THEMES`. A seeded
 * shuffle (its own stream, `mixSeed(n, 0x7e3e)`) made as a search: a theme may stand at place i only if it stood at least `THEME_GAP`
 * days before in the last block (its place there at most i + length - gap), and it must differ in host and land from the day before it
 * (the last block's last day, for the first). Each block hangs on the one before, so they are worked out from block 0 on and kept.
 */
export function themeBlock(n: number): readonly number[] {
  const got = blocks.get(n);
  if (got) return got;
  const len = DAILY_THEMES.length;
  const prev = n > 0 ? themeBlock(n - 1) : null;
  const was = new Map<number, number>(prev ? prev.map((t, i) => [t, i]) : []);
  const rng = new Rng(mixSeed(n, 0x7e3e));
  const order: number[] = [];
  const used = new Set<number>();
  const place = (i: number): boolean => {
    if (i === len) return true;
    const before = i ? DAILY_THEMES[order[i - 1]] : prev ? DAILY_THEMES[prev[len - 1]] : undefined;
    const pick = Array.from({ length: len }, (_, k) => k);
    for (let k = len - 1; k > 0; k--) {
      const j = rng.int(0, k);
      [pick[k], pick[j]] = [pick[j], pick[k]];
    }
    for (const t of pick) {
      if (used.has(t) || (was.has(t) && i + len - was.get(t)! < THEME_GAP) || !fits(before, DAILY_THEMES[t])) continue;
      used.add(t);
      order.push(t);
      if (place(i + 1)) return true;
      used.delete(t);
      order.pop();
    }
    return false;
  };
  if (!place(0)) throw new Error(`no order for theme block ${n}`);
  blocks.set(n, order);
  return order;
}

/** A date's theme, or null for a date before `DAILY_THEMES_FROM` (the old daily). The same for everyone on the date. */
export function dailyTheme(date: number): DailyTheme | null {
  if (date < DAILY_THEMES_FROM) return null;
  const day = dayNumber(date) - dayNumber(DAILY_THEMES_FROM);
  const len = DAILY_THEMES.length;
  return DAILY_THEMES[themeBlock(Math.floor(day / len))[day % len]];
}

/** A theme by its id (a saved run names its theme). */
export const themeById = (id: string | undefined): DailyTheme | null => DAILY_THEMES.find((t) => t.id === id) ?? null;

/** The day's whole pool: the five, then the heroes Hire can add. */
export const themePool = (t: DailyTheme): string[] => [...t.five, ...t.more];

/** The twist a theme lays on every wave (its own `fx`, or a table twist's), or undefined. */
export const themeFx = (t: DailyTheme): TwistFx | undefined => t.fx ?? (t.twist ? TWISTS[t.twist].fx : undefined);

/** The heroes of the featured trait among some kinds (different kinds only). */
export const featuredCount = (t: DailyTheme, kinds: Iterable<string>): number => countTraits(kinds).find((c) => c.trait.id === t.trait)?.count ?? 0;

/** Whether the field meets the theme's goal (checked on the boss of the day's fight). */
export const themeGoalMet = (t: DailyTheme, kinds: Iterable<string>): boolean => featuredCount(t, kinds) >= t.need;

/** A trait's name for many heroes: "Beasts", "Samurai", "Wild heroes". */
const PLURALS: Readonly<Record<string, string>> = { samurai: 'Samurai', yokai: 'Yokai', undead: 'Undead', wild: 'Wild heroes', holy: 'Holy heroes', frontier: 'Frontier heroes', arcane: 'Arcane heroes', knightly: 'Knightly heroes' };
export const traitPlural = (trait: string): string => PLURALS[trait] ?? `${TRAITS[trait].name}s`;

/** The goal in words: "Beat the boss with 4 Beasts on the field". */
export const themeGoalText = (t: DailyTheme): string => `Beat the boss with ${t.need} ${traitPlural(t.trait)} on the field`;

/** The bonus stars a date's clear can earn: no heart, quick, and on a themed day its goal. */
export const dailyStarsMax = (date: number): number => (dailyTheme(date) ? 3 : 2);
