// Lasting progress across runs, and the recruiting draw (the usual gacha). Crowns are earned for each stage won and at
// a run's end; they buy pulls that unlock hero kinds. A repeat of a kind gives a shard of it; shards raise the kind's
// rank, and each rank makes its heroes a little stronger in every fight. Pure rules: no Pixi, no DOM; every pull draws
// from a side stream of the meta seed and the pull counter, so it replays exactly.

import { newCastle, readCastle, type Castle } from './castle';
import { Rng } from './rng';
import { ALL_HEROES, HEROES, UNITS } from './units';
import { MAX_STARS, starCrowns } from './stars';

export const PULL_COST = 100;
export const PULL10_COST = 900;
/** Chance of each rarity (1 common, 2 rare, 3 epic), in percent. */
export const RATES: Readonly<Record<1 | 2 | 3, number>> = { 1: 70, 2: 25, 3: 5 };
/** An epic is guaranteed by this pull without one. */
export const PITY = 30;
/** Shards a repeat pull gives. */
export const DUPLICATE_SHARDS = 1;
/** Shards each rank needs in all: rank 1 at 1, rank 2 at 3, rank 3 at 6, rank 4 at 10. */
export const RANK_SHARDS: readonly number[] = [1, 3, 6, 10];
export const MAX_RANK = RANK_SHARDS.length;
/** Hp and attack grow by this for each rank a hero kind has. */
export const RANK_MULT = 1.05;
const SALT = 0x6ac4a;

export interface Meta {
  seed: number;
  crowns: number;
  /** Hero kinds unlocked for summoning. */
  unlocked: string[];
  /** Pulls so far (the draw follows it). */
  pulls: number;
  /** Pulls since the last epic. */
  dry: number;
  /** The castle's upgrades (see `castle.ts`). */
  castle: Castle;
  /** Shards per hero kind (missing is none). */
  shards: Record<string, number>;
  /** The best stars won on each stage (keyed by the stage number; missing is none). */
  stars: Record<string, number>;
  /** Lasting XP per hero kind (missing is none); its level is read from it (`levels.ts`). */
  xp: Record<string, number>;
}

export interface Pull {
  kind: string;
  rarity: 1 | 2 | 3;
  /** The kind was not unlocked before this pull. */
  isNew: boolean;
  /** Shards a duplicate gives (0 for a new kind). */
  shards: number;
}

export const newMeta = (seed: number): Meta => ({ seed, crowns: 0, unlocked: [...HEROES], pulls: 0, dry: 0, shards: {}, stars: {}, xp: {}, castle: newCastle() });

export const rarityOf = (kind: string): 1 | 2 | 3 => UNITS[kind]?.rarity ?? 1;
/** The rank a hero kind has from its shards (0 to MAX_RANK). */
export const rankOf = (m: Meta, kind: string): number => RANK_SHARDS.filter((need) => (m.shards[kind] ?? 0) >= need).length;
/** Hp and attack multiplier a rank gives. */
export const rankMult = (rank: number): number => RANK_MULT ** rank;
/** Crowns a won stage pays. */
export const stageCrowns = (stage: number) => 10 + 2 * stage;
/** Crowns a run's end pays: more the further it got. */
export const runCrowns = (best: number) => 10 * (best - 1) + best * best;

/** Saved XP that is sane: a hero kind in the game and a number of XP. Anything else is dropped. */
function readXp(raw: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (raw && typeof raw === 'object') for (const [k, n] of Object.entries(raw)) if (ALL_HEROES.includes(k) && typeof n === 'number' && n >= 0) out[k] = Math.floor(n);
  return out;
}

/** Pay the crowns for a settled fight (a win pays for the stage and its stars; a loss ends the run and pays by how far it got). Returns the sum. */
export function earn(m: Meta, stage: number, won: boolean, stars = 0): number {
  const n = won ? stageCrowns(stage) + starCrowns(stars) : runCrowns(stage);
  m.crowns += n;
  return n;
}

/** Keep the best stars won on a stage. Returns whether it beat the one before. */
export function recordStars(m: Meta, stage: number, stars: number): boolean {
  const key = String(stage);
  if (stars <= (m.stars[key] ?? 0)) return false;
  m.stars[key] = stars;
  return true;
}

/** The furthest stage with any stars and the stars won across all stages (null before the first win). */
export function starSummary(m: Meta): { stage: number; total: number } | null {
  const stages = Object.keys(m.stars).map(Number);
  if (!stages.length) return null;
  return { stage: Math.max(...stages), total: Object.values(m.stars).reduce((n, s) => n + s, 0) };
}

/** Saved stars that are sane: a stage number and 1 to MAX_STARS. Anything else is dropped. */
function readStars(raw: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (raw && typeof raw === 'object') for (const [k, n] of Object.entries(raw)) if (/^[1-9]\d*$/.test(k) && typeof n === 'number' && n >= 1) out[k] = Math.min(MAX_STARS, n | 0);
  return out;
}

export const pullCost = (count: 1 | 10) => (count === 10 ? PULL10_COST : PULL_COST);

/** The hero kinds of a rarity; when none exist, the nearest rarity below, then above. */
function kindsOf(rarity: 1 | 2 | 3): readonly string[] {
  const order = ([3, 2, 1] as const).filter((x) => x <= rarity).concat(([1, 2, 3] as const).filter((x) => x > rarity));
  for (const r of order) {
    const list = ALL_HEROES.filter((k) => rarityOf(k) === r);
    if (list.length) return list;
  }
  return ALL_HEROES;
}

/** One pull (no payment): rolls the rarity (an epic when the pity is reached), then a kind of it, and unlocks it. */
export function pullOnce(m: Meta): Pull {
  const rng = Rng.from(m.seed, SALT, m.pulls);
  const roll = rng.next() * 100;
  let rarity: 1 | 2 | 3 = roll < RATES[3] ? 3 : roll < RATES[3] + RATES[2] ? 2 : 1;
  if (m.dry + 1 >= PITY) rarity = 3;
  const kind = rng.pick(kindsOf(rarity));
  rarity = rarityOf(kind);
  m.pulls++;
  m.dry = rarity === 3 ? 0 : m.dry + 1;
  const isNew = !m.unlocked.includes(kind);
  let shards = 0;
  if (isNew) m.unlocked.push(kind);
  else m.shards[kind] = (m.shards[kind] ?? 0) + (shards = DUPLICATE_SHARDS);
  return { kind, rarity, isNew, shards };
}

/** Pay for and make 1 or 10 pulls. Null when too poor. */
export function recruit(m: Meta, count: 1 | 10): Pull[] | null {
  const cost = pullCost(count);
  if (m.crowns < cost) return null;
  m.crowns -= cost;
  return Array.from({ length: count }, () => pullOnce(m));
}

const KEY = 'legends.meta';
export const saveMeta = (m: Meta, store: Pick<Storage, 'setItem'> = localStorage) => store.setItem(KEY, JSON.stringify(m));
/** The saved meta, or a fresh one from `seed`. Kinds no longer in the game are dropped; the starting five always stay. */
export function loadMeta(seed: number, store: Pick<Storage, 'getItem'> = localStorage): Meta {
  try {
    const m = JSON.parse(store.getItem(KEY) ?? 'null') as Meta | null;
    if (m && typeof m.crowns === 'number' && Array.isArray(m.unlocked) && typeof m.seed === 'number') {
      m.unlocked = [...new Set([...HEROES, ...m.unlocked.filter((k) => ALL_HEROES.includes(k))])];
      m.pulls = m.pulls | 0;
      m.dry = m.dry | 0;
      m.castle = readCastle(m.castle);
      // (saves from before shards have none)
      const shards: Record<string, number> = {};
      if (m.shards && typeof m.shards === 'object') for (const [k, n] of Object.entries(m.shards)) if (ALL_HEROES.includes(k) && typeof n === 'number') shards[k] = n | 0;
      m.shards = shards;
      // (saves from before stars have none)
      m.stars = readStars(m.stars);
      // (saves from before XP have none)
      m.xp = readXp(m.xp);
      return m;
    }
  } catch {
    /* fall through to a fresh one */
  }
  return newMeta(seed);
}
