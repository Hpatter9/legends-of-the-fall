// Unlocking heroes: the numbers only (few imports, so `meta.ts`, `starter.ts` and the pages can all read them). A hero is
// collected shard by shard from pulls and chests until it joins; ten heroes never come that way and join on a milestone of
// the game instead (`contentHeroes.ts`). See `unlock.ts` for the pulls and the shards, and `docs/notes/hero-shards.md`.

import { ALL_HEROES } from './units';

/** The heroes that join on a milestone, never from a pull or a chest (their milestones are in `contentHeroes.ts`). */
export const CONTENT_KINDS: readonly string[] = ['werewolf', 'reaper', 'demonSwordsman', 'samuraiCommander', 'juggernaut', 'dreadPirate', 'tyrant', 'timeWitch', 'dragoon', 'sage'];
export const isContent = (kind: string): boolean => CONTENT_KINDS.includes(kind);
/** The heroes pulls and chests can unlock, collected by shards. */
export const PULL_HEROES: readonly string[] = ALL_HEROES.filter((k) => !isContent(k));

/** Unlock shards a hero not yet owned needs, by how many pullable heroes are owned (the starter's three count): few for the first heroes after the starter, many for the last. */
export const NEED_FIRST = 2;
export const NEED_LAST = 60;
const OWNED_FIRST = 3;
export const unlockNeed = (owned: number): number => {
  const t = Math.max(0, Math.min(1, (owned - OWNED_FIRST) / (PULL_HEROES.length - 1 - OWNED_FIRST)));
  return Math.round(NEED_FIRST + (cfg().needLast - NEED_FIRST) * t ** 1.6);
};

/** A hero already begun is this much likelier (per unlock shard held) to turn up in a pull than one not begun, so bars fill rather than all creeping. */
export const STICKY = 6;
/** After this many pulls in a row that gave no unlock shards, the next gives unlock shards of the hero closest to joining. */
export const PITY_PULLS = 3;
/** Unlock shards a repeat-of-a-pull gives, and the rank shards a repeat of an owned hero gives. */
export const DUPLICATE_SHARDS = 1;
/** Unlock shards a chest's hero draw gives: a plain draw, and a gold chest's prize. */
export const CHEST_HERO_SHARDS = 2;
export const CHEST_PRIZE_SHARDS = 5;

/** A pull costs more as the roster grows: the price is multiplied by 1 with the starter's three owned, rising to this with every pullable hero owned (crowns come in far faster late in the game than early, so a flat price would gate nothing). */
export const PRICE_LAST_MULT = 250;
export const priceMult = (owned: number): number => {
  const t = Math.max(0, Math.min(1, (owned - OWNED_FIRST) / (PULL_HEROES.length - OWNED_FIRST)));
  return cfg().priceLast ** t;
};

// ---- the three ways to make unlocking slow (the owner picks one; `rising` is the default) ----

/** `rising`: the price of a pull rises with the roster. `daily`: the price stays flat and only `dailyPulls` pulls are allowed a day. `fading`: the price stays flat and the chance a pull is a hero not owned falls as the roster grows. */
export type UnlockMode = 'rising' | 'daily' | 'fading';
interface ModeCfg {
  /** Shards the last hero needs. */
  needLast: number;
  /** The price multiplier with every pullable hero owned. */
  priceLast: number;
  /** Pulls without unlock shards before the pity, with the starter's three owned, and how many more for each pullable hero owned beyond them. */
  pity: number;
  pityGrow: number;
  /** How much likelier a hero begun is, per shard held. */
  sticky: number;
  /** How much likelier each hero owned is to be drawn (rank shards), for each pullable hero beyond the starter's three owned. */
  ownedBoost: number;
  /** The power of that count (1 is a straight rise; 2 makes the late pulls far likelier to land on heroes owned). */
  ownedPow: number;
  /** Pulls a day (0 for no limit). */
  dailyPulls: number;
}
export const MODES: Record<UnlockMode, ModeCfg> = {
  rising: { needLast: NEED_LAST, priceLast: PRICE_LAST_MULT, pity: PITY_PULLS, pityGrow: 0, sticky: STICKY, ownedBoost: 0, ownedPow: 1, dailyPulls: 0 },
  daily: { needLast: 150, priceLast: 1, pity: PITY_PULLS, pityGrow: 0, sticky: STICKY, ownedBoost: 0, ownedPow: 1, dailyPulls: 10 },
  fading: { needLast: 100, priceLast: 1, pity: 3, pityGrow: 6, sticky: STICKY, ownedBoost: 2, ownedPow: 2.2, dailyPulls: 0 },
};
let mode: UnlockMode = 'rising';
export const unlockMode = (): UnlockMode => mode;
export const setUnlockMode = (m: UnlockMode): void => void (mode = m);
export const cfg = (): ModeCfg => MODES[mode];
/** Pulls without unlock shards before the pity, for a roster with `owned` pullable heroes. */
export const pityAt = (owned: number): number => Math.round(cfg().pity + cfg().pityGrow * Math.max(0, owned - OWNED_FIRST));
