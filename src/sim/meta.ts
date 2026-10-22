// Lasting progress across runs, and the recruiting draw (the usual gacha). Crowns are earned for each stage won and at
// a run's end; they buy pulls that unlock hero kinds. A repeat of a kind gives a shard of it; shards raise the kind's
// rank, and each rank makes its heroes a little stronger in every fight. Pure rules: no Pixi, no DOM; every pull draws
// from a side stream of the meta seed and the pull counter, so it replays exactly.

import { newCastle, readCastle, readChapel, spellBudget, type Castle } from './castle';
import { newLoadout, readLoadout, STARTER_SPELLS, type Loadout } from './spells';
import { Rng } from './rng';
import { ALL_HEROES, HEROES, UNITS, type Rarity } from './units';
import { MAX_STARS, starCrowns } from './stars';
import { BOSS_IDS } from './foes';
import { readEquipment, readEquipped, type EquipSlot, type Equipment } from './equipment';
import { migrateArmies, readSeen, seenFor, type ArmyRecord } from './armies';

export const PULL_COST = 100;
export const PULL10_COST = 900;
/** The tiers' names, by rarity (index 0 is unused). */
export const RARITY_NAMES: readonly string[] = ['', 'Common', 'Rare', 'Epic', 'Legendary', 'Mythic'];
/** Chance of each rarity (1 Common to 5 Mythic), in percent. */
export const RATES: Readonly<Record<Rarity, number>> = { 1: 50, 2: 28, 3: 14, 4: 6, 5: 2 };
/** A Legendary or better is guaranteed by this pull without one. */
export const PITY = 30;
/** A Mythic is guaranteed by this pull without one. */
export const MYTHIC_PITY = 90;
/** Hp and attack a hero of each tier has over a Common one (index 0 is unused). */
export const TIER_MULT: readonly number[] = [1, 1, 1.08, 1.16, 1.26, 1.4];
/** A Mythic is drawn this much bigger on the board. */
export const MYTHIC_SIZE = 1.12;
/** Shards a repeat pull gives. */
export const DUPLICATE_SHARDS = 1;
/** Shards each rank needs in all: rank 1 at 1, rank 2 at 3, rank 3 at 6, rank 4 at 10. */
export const RANK_SHARDS: readonly number[] = [1, 3, 6, 10];
export const MAX_RANK = RANK_SHARDS.length;
/** Heroes in a party: the deck the summons draw from, and the run's starting heroes (fewer while fewer are unlocked). */
export const PARTY_SIZE = 5;
/** Hp and attack grow by this for each rank a hero kind has. */
export const RANK_MULT = 1.05;
const SALT = 0x6ac4a;

export interface Meta {
  seed: number;
  crowns: number;
  /** Hero kinds unlocked for summoning. */
  unlocked: string[];
  /** The party: the hero kinds a run's summons draw from (`partySlots` of them, all unlocked). */
  party: string[];
  /** Pulls so far (the draw follows it). */
  pulls: number;
  /** Pulls since the last Legendary or better. */
  dry: number;
  /** Pulls since the last Mythic (saves from before the Mythics start at none). */
  dryMythic: number;
  /** The castle's upgrades (see `castle.ts`). */
  castle: Castle;
  /** Whether the Chapel has been bought (it opens the spellbook; saves from before count it built if they had spells or upgrades; see `castle.ts`). */
  chapel?: boolean;
  /** Shards per hero kind (missing is none). */
  shards: Record<string, number>;
  /** The king's spells owned and equipped (see `spells.ts`; saves from before have the starting three). */
  spellbook: Loadout;
  /** The best stars won on each stage (keyed by the stage number; missing is none). */
  stars: Record<string, number>;
  /** Lasting XP per hero kind (missing is none); its level is read from it (`levels.ts`). */
  xp: Record<string, number>;
  /** The furthest stage fought in any run (the endless tower opens at 10). */
  bestStage: number;
  /** The most floors cleared in the endless tower. */
  tower: number;
  /** The daily challenge per date (yyyymmdd): the best score counted and the plays (the first counts). */
  daily: Record<string, DailyEntry>;
  /** The bosses beaten (`foes.ts`, by id). */
  bosses: string[];
  /** Each army's record: furthest wave, wins, clears and stars (`armies.ts`; missing is none). */
  armies: Record<string, ArmyRecord>;
  /** The armies whose open card the player has seen (a newly opened one glows until then). */
  armySeen: string[];
  /** The achievements unlocked (`achievements.ts`, by id). */
  achievements: string[];
  /** The permanent equipment owned, worn or spare (`equipment.ts`; missing is none). */
  equipment?: Equipment[];
  /** The item ids each hero kind wears, by slot (an item is on one kind at most). */
  equipped?: Record<string, Partial<Record<EquipSlot, number>>>;
  /** The next equipment id. */
  nextItem?: number;
}

export interface DailyEntry {
  best: number;
  plays: number;
}

export interface Pull {
  kind: string;
  rarity: Rarity;
  /** The kind was not unlocked before this pull. */
  isNew: boolean;
  /** Shards a duplicate gives (0 for a new kind). */
  shards: number;
}

export const newMeta = (seed: number): Meta => ({ seed, crowns: 0, unlocked: [...HEROES], party: [...HEROES], pulls: 0, dry: 0, dryMythic: 0, shards: {}, stars: {}, xp: {}, castle: newCastle(), chapel: false, spellbook: newLoadout(), bestStage: 1, tower: 0, daily: {}, bosses: [], armies: {}, armySeen: [], achievements: [] });

export const rarityOf = (kind: string): Rarity => UNITS[kind]?.rarity ?? 1;
/** Hp and attack multiplier of a hero kind's tier. */
export const tierMult = (kind: string): number => TIER_MULT[rarityOf(kind)];
/** The rank a hero kind has from its shards (0 to MAX_RANK). */
export const rankOf = (m: Meta, kind: string): number => RANK_SHARDS.filter((need) => (m.shards[kind] ?? 0) >= need).length;
/** Hp and attack multiplier a rank gives. */
export const rankMult = (rank: number): number => RANK_MULT ** rank;
/** Crowns a won stage pays. */
export const stageCrowns = (stage: number) => 10 + 2 * stage;
/** Crowns a run's end pays: more the further it got. */
export const runCrowns = (best: number) => 10 * (best - 1) + best * best;

/** How many heroes a party takes: five, or fewer while fewer are unlocked. */
export const partySlots = (m: Meta): number => Math.min(PARTY_SIZE, m.unlocked.length);

/** Set the party to these hero kinds: exactly `partySlots` different unlocked kinds. Returns false (and changes nothing) otherwise. */
export function setParty(m: Meta, kinds: readonly string[]): boolean {
  const ok = kinds.length === partySlots(m) && new Set(kinds).size === kinds.length && kinds.every((k) => m.unlocked.includes(k));
  if (ok) m.party = [...kinds];
  return ok;
}

/** Saved party that is sane: unlocked kinds, no repeats, at most five. Missing or empty means the first five unlocked. */
function readParty(raw: unknown, unlocked: readonly string[]): string[] {
  const kept = Array.isArray(raw) ? [...new Set(raw)].filter((k): k is string => typeof k === 'string' && unlocked.includes(k)).slice(0, PARTY_SIZE) : [];
  return kept.length ? kept : unlocked.slice(0, PARTY_SIZE);
}

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

/** Saved daily records that are sane: a date (yyyymmdd) with a best score and a play count. Anything else is dropped. */
function readDaily(raw: unknown): Record<string, DailyEntry> {
  const out: Record<string, DailyEntry> = {};
  if (raw && typeof raw === 'object')
    for (const [k, e] of Object.entries(raw)) {
      const d = e as Partial<DailyEntry> | null;
      if (/^\d{8}$/.test(k) && d && typeof d.best === 'number' && typeof d.plays === 'number') out[k] = { best: Math.max(0, d.best | 0), plays: Math.max(0, d.plays | 0) };
    }
  return out;
}

/** Saved stars that are sane: a stage number and 1 to MAX_STARS. Anything else is dropped. */
function readStars(raw: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (raw && typeof raw === 'object') for (const [k, n] of Object.entries(raw)) if (/^[1-9]\d*$/.test(k) && typeof n === 'number' && n >= 1) out[k] = Math.min(MAX_STARS, n | 0);
  return out;
}

export const pullCost = (count: 1 | 10) => (count === 10 ? PULL10_COST : PULL_COST);

/** The hero kinds of a rarity; when none exist, the nearest rarity below, then above. */
function kindsOf(rarity: Rarity): readonly string[] {
  const all: Rarity[] = [1, 2, 3, 4, 5];
  const order = all.filter((x) => x <= rarity).reverse().concat(all.filter((x) => x > rarity));
  for (const r of order) {
    const list = ALL_HEROES.filter((k) => rarityOf(k) === r);
    if (list.length) return list;
  }
  return ALL_HEROES;
}

/** One pull (no payment): rolls the rarity (a Legendary or better when the pity is reached, a Mythic at the Mythic pity), then a kind of it, and unlocks it. */
export function pullOnce(m: Meta): Pull {
  const rng = Rng.from(m.seed, SALT, m.pulls);
  const roll = rng.next() * 100;
  let rarity: Rarity = 1;
  for (let r = 5, edge = 0; r >= 1; r--) {
    edge += RATES[r as Rarity];
    if (roll < edge) {
      rarity = r as Rarity;
      break;
    }
  }
  if (m.dryMythic + 1 >= MYTHIC_PITY) rarity = 5;
  else if (m.dry + 1 >= PITY && rarity < 4) rarity = 4;
  const kind = rng.pick(kindsOf(rarity));
  rarity = rarityOf(kind);
  m.pulls++;
  m.dry = rarity >= 4 ? 0 : m.dry + 1;
  m.dryMythic = rarity === 5 ? 0 : m.dryMythic + 1;
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
      // (saves from before parties have the first five unlocked)
      m.party = readParty(m.party, m.unlocked);
      m.pulls = m.pulls | 0;
      m.dry = m.dry | 0;
      // (saves from before the Mythics count their dry spell from the start)
      m.dryMythic = Math.max(0, m.dryMythic | 0);
      m.castle = readCastle(m.castle);
      m.spellbook = readLoadout(m.spellbook, spellBudget(m.castle));
      m.chapel = readChapel(m.chapel, m.castle, m.spellbook, STARTER_SPELLS);
      // (saves from before shards have none)
      const shards: Record<string, number> = {};
      if (m.shards && typeof m.shards === 'object') for (const [k, n] of Object.entries(m.shards)) if (ALL_HEROES.includes(k) && typeof n === 'number') shards[k] = n | 0;
      m.shards = shards;
      // (saves from before stars have none)
      m.stars = readStars(m.stars);
      // (saves from before XP have none)
      m.xp = readXp(m.xp);
      // (saves from before the modes and achievements have none)
      m.bestStage = Math.max(1, m.bestStage | 0);
      m.tower = Math.max(0, m.tower | 0);
      m.daily = readDaily(m.daily);
      m.bosses = Array.isArray(m.bosses) ? m.bosses.filter((b) => BOSS_IDS.includes(b)) : [];
      // (saves from before the armies have their furthest stage mapped onto them, and the armies it opens are not new)
      const fresh = !m.armies || typeof m.armies !== 'object';
      m.armies = migrateArmies(m.armies, m.bestStage);
      m.armySeen = fresh ? seenFor(m) : readSeen(m.armySeen);
      m.achievements = Array.isArray(m.achievements) ? m.achievements.filter((a) => typeof a === 'string') : [];
      // (saves from before equipment have none)
      m.equipment = readEquipment(m.equipment);
      m.equipped = readEquipped(m.equipped, m.equipment);
      m.nextItem = Math.max((m.nextItem ?? 1) | 0, 1, ...m.equipment.map((x) => x.id + 1));
      return m;
    }
  } catch {
    /* fall through to a fresh one */
  }
  return newMeta(seed);
}
