// An army's 10 stars and its chests. A run through an army earns up to three stars from how well the whole run went (the
// conditions are the same on every tier but Legendary, whose single star is a flawless clear); the conditions a tier has
// met are kept for good, so a replay adds only the ones still missing. At 3, 5 and 10 stars an army gives a chest, once
// each, into the meta's stash (opened later from the home screen); its rewards are fixed when it is earned, from a side
// stream of the save's seed, the army and the milestone, so they cannot be rerolled by reloading or by the order of
// opening, and they pay better the higher the milestone and the tier and the later the army. Pure rules: no
// Pixi, no DOM.

import { ARMIES, armyById, armyIndex, recordOf, type Army, type ArmyRecord } from './armies';
import { grantEquipment, itemName, rollEquipment, type NewEquipment } from './equipment';
import { kindsOf, RATES, rarityOf, RARITY_NAMES, type Meta, type StashChest } from './meta';
import { mixSeed, Rng } from './rng';
import { armyOfRun, tierOfRun, type Run } from './run';
import { MILESTONES, RUN_STARS, TIERS } from './tiers';
import { UNITS, type Rarity } from './units';

// ---- the conditions -----------------------------------------------------------------------------------------------------

/** Battle time that earns the third star of a tier, per wave (a harder tier's longer fights get a little more). */
export const WAVE_MS = 26_000;
export const timeTarget = (a: Army, tier: number): number => Math.round(a.waves.length * WAVE_MS * (1 + 0.12 * tier));
const clock = (ms: number): string => `${Math.floor(ms / 60000)}:${String(Math.round((ms % 60000) / 1000)).padStart(2, '0')}`;

export interface StarRule {
  /** The reason, in plain words. */
  text: string;
  earned: boolean;
}

/** The conditions of a tier in order (one a star), with `run` judging them (all unearned without one). */
export function armyRules(a: Army, tier: number, run?: Run): StarRule[] {
  const t = run?.tally;
  const won = !!run?.cleared;
  if (tier === TIERS.length - 1) return [{ text: 'Flawless: no hero lost in any boss fight', earned: won && !!t && (t.bossFell ?? t.bossLost) === 0 }];
  return [
    { text: `Clear ${a.name}`, earned: won },
    { text: 'No hero lost in the last boss fight', earned: won && !!t && t.bossLost === 0 },
    { text: `Clear in ${clock(timeTarget(a, tier))} of battle`, earned: won && !!t && t.ms <= timeTarget(a, tier) },
  ];
}

export interface StarResult {
  tier: number;
  rules: StarRule[];
  /** The conditions met this run that no earlier run had (by index). */
  fresh: number[];
  /** Stars this run added, and the army's stars now. */
  gained: number;
  total: number;
  /** Chest milestones this run reached for the first time (each is now in the stash). */
  chests: number[];
}

/** Settle a finished army run in the meta: the conditions it met are merged into the tier's best, and any chest the new total reaches is given. Null unless the run cleared its army. */
export function settleArmyRun(m: Meta, run: Run): StarResult | null {
  const a = armyOfRun(run);
  if (!a || !run.cleared) return null;
  const tier = tierOfRun(run);
  const rules = armyRules(a, tier, run);
  const rec = (m.armies[a.id] ??= { best: 0, won: 0, clears: 0, stars: {} });
  const before = rec.met?.[String(tier)] ?? 0;
  let mask = 0;
  const fresh: number[] = [];
  rules.slice(0, RUN_STARS).forEach((r, i) => {
    if (!r.earned) return;
    mask |= 1 << i;
    if (!(before & (1 << i))) fresh.push(i);
  });
  (rec.met ??= {})[String(tier)] = before | mask;
  return { tier, rules, fresh, gained: fresh.length, total: starsOf(rec), chests: grantChests(m, a, rec, tier) };
}

const starsOf = (rec: ArmyRecord): number => TIERS.reduce((n, t, i) => n + countBits((rec.met?.[String(i)] ?? 0) & ((1 << t.stars) - 1)), 0);
function countBits(n: number): number {
  let c = 0;
  for (let x = n; x; x &= x - 1) c++;
  return c;
}

/** Give the chests the army's stars have reached (each milestone once, however often it is called): each goes into the stash with its seed. Returns the new milestones. */
export function grantChests(m: Meta, a: Army, rec: ArmyRecord, tier = 0): number[] {
  const got = (rec.chests ??= []);
  const stars = starsOf(rec);
  const fresh = MILESTONES.filter((n) => stars >= n && !got.includes(n));
  for (const at of fresh) m.stash.push({ army: a.id, at, tier, seed: chestSeed(m.seed, a, at) });
  got.push(...fresh);
  got.sort((x, y) => x - y);
  return fresh;
}

// ---- the chests ---------------------------------------------------------------------------------------------------------

export type ChestKind = 'bronze' | 'silver' | 'gold';
export const chestKind = (at: number): ChestKind => (at >= 10 ? 'gold' : at >= 5 ? 'silver' : 'bronze');
const CHEST_STEP = (at: number): number => (at >= 10 ? 3 : at >= 5 ? 2 : 1);

export interface ChestState {
  at: number;
  kind: ChestKind;
  /** Not reached yet, or earned (waiting in the stash, or opened already). */
  state: 'locked' | 'earned';
  /** Earned and still in the stash. */
  waiting: boolean;
}
/** The three chests of an army and where each stands. */
export function chestsOf(m: Meta, a: Army): ChestState[] {
  const rec = recordOf(m, a.id);
  return MILESTONES.map((at) => ({ at, kind: chestKind(at), state: rec.chests?.includes(at) ? 'earned' : 'locked', waiting: m.stash.some((c) => !c.tower && c.army === a.id && c.at === at) }));
}

/** A piece of permanent hero equipment a chest drops (`equipment.ts`); it is granted to the meta when the chest is opened. */
export interface GearDrop {
  item: NewEquipment;
}
/** The chance a bronze chest holds a piece of equipment (silver and gold chests always do). */
export const BRONZE_GEAR_CHANCE = 0.35;
/**
 * The chest's equipment, rolled with `rollEquipment`: the chest's quality (bronze, silver or gold), the army's place in the list and, for the
 * 10-star chest, a milestone bonus. It takes the chest's own stream *last* (after everything else is drawn), so the other rewards of every
 * chest are what they were before equipment existed. `at` is the star milestone (3, 5 or 10).
 */
export function rollGear(rng: Rng, at: number, armyIdx: number): GearDrop[] {
  const quality = chestKind(at);
  if (quality === 'bronze' && !rng.chance(BRONZE_GEAR_CHANCE)) return [];
  return [{ item: rollEquipment(rng, { quality, armyIndex: armyIdx, milestone: at >= 10 }) }];
}

export interface LootItem {
  type: 'crowns' | 'shards' | 'hero' | 'gear';
  /** A line for the reveal: "320 crowns", "3 Knight shards". */
  text: string;
  /** The hero kind (or the equipment's base) it is about. */
  ref?: string;
  /** A piece of equipment this reward is (for its icon and frame). */
  equip?: NewEquipment;
  /** A hero's rarity (for the card colour). */
  rarity?: number;
  /** The chest's big prize. */
  prize?: boolean;
}
export interface Loot {
  at: number;
  kind: ChestKind;
  army: string;
  items: LootItem[];
}

const SALT = 0xc4e57;
const roundTo = (n: number, k: number): number => Math.round(n / k) * k;

/** The seed a chest's contents are rolled from, fixed when it is earned: the save's seed, the army and the milestone. */
export const chestSeed = (seed: number, a: Army, at: number): number => mixSeed(seed, SALT, armyIndex(a.id) + 1, at);

/** The crowns a chest pays before its draw: the milestone's base, rising with the army's place in the list and the tier. */
export const chestCrowns = (at: number, armyIdx: number, tier = 0): number => roundTo(({ 3: 150, 5: 420, 10: 1300 } as Record<number, number>)[at] * (1 + 0.32 * armyIdx) * (1 + 0.15 * tier), 10);

/** A rarity drawn from the pull rates, tilted towards the rare ones by the chest's quality. */
function drawRarity(rng: Rng, quality: number, min: Rarity = 1): Rarity {
  const w = {} as Record<string, number>;
  for (let r = min; r <= 5; r++) w[String(r)] = RATES[r as Rarity] * quality ** (r - 1);
  return Number(rng.weighted(w)) as Rarity;
}

/** What a chest holds, drawn from its seed without touching the meta: the same chest always rolls the same. */
export function rollChest(seed: number, a: Army, at: number, tier = 0): { crowns: number; shards: string[]; recruits: { kind: string; prize: boolean }[]; gear: GearDrop[] } {
  const idx = armyIndex(a.id);
  const step = CHEST_STEP(at);
  const rng = new Rng(seed);
  // quality: how far the rare ones are tilted up (1 is the plain pull rates)
  const quality = 1 + 0.28 * (step - 1) + 0.06 * idx + 0.1 * tier;
  const crowns = roundTo(chestCrowns(at, idx, tier) * rng.range(0.85, 1.15), 10);
  const shards = Array.from({ length: 1 + step + (at >= 10 ? 1 : 0) }, () => rng.pick(kindsOf(drawRarity(rng, quality))));
  const recruits: { kind: string; prize: boolean }[] = [];
  if (step === 2 && rng.chance(0.3 + 0.04 * idx + 0.05 * tier)) recruits.push({ kind: rng.pick(kindsOf(drawRarity(rng, quality, 2))), prize: false });
  if (step === 3) {
    // the 10-star chest always holds a hero: Epic or better, Legendary from the fourth army, Mythic from the eighth
    const floor = (idx >= 7 ? 5 : idx >= 3 ? 4 : 3) as Rarity;
    recruits.push({ kind: rng.pick(kindsOf(drawRarity(rng, quality, floor))), prize: true });
  }
  return { crowns, shards, recruits, gear: rollGear(rng, at, idx) };
}

/** The chest of the stash at `index`, rolled (null when there is none). */
export function peekChest(m: Meta, index: number): Loot | null {
  const c = m.stash[index];
  return c ? lootOf(m, c, false) : null;
}

function lootOf(m: Meta, c: StashChest, apply: boolean): Loot {
  const a = armyById(c.army)!;
  const roll = rollChest(c.seed, a, c.at, c.tier);
  const items: LootItem[] = [{ type: 'crowns', text: `${roll.crowns} crowns` }];
  if (apply) m.crowns += roll.crowns;
  const shards = new Map<string, number>();
  for (const k of roll.shards) shards.set(k, (shards.get(k) ?? 0) + 1);
  for (const [kind, n] of shards) {
    if (apply) m.shards[kind] = (m.shards[kind] ?? 0) + n;
    items.push({ type: 'shards', text: `${n} ${UNITS[kind].name} shard${n > 1 ? 's' : ''}`, ref: kind, rarity: rarityOf(kind) });
  }
  for (const r of roll.recruits) {
    // (a hero not yet owned is recruited; one owned pays shards instead)
    const isNew = !m.unlocked.includes(r.kind);
    if (apply) {
      if (isNew) m.unlocked.push(r.kind);
      else m.shards[r.kind] = (m.shards[r.kind] ?? 0) + 2;
    }
    items.push({ type: 'hero', text: isNew ? `${UNITS[r.kind].name} joins you (${RARITY_NAMES[rarityOf(r.kind)]})` : `${UNITS[r.kind].name}: 2 shards (already yours)`, ref: r.kind, rarity: rarityOf(r.kind), prize: r.prize });
  }
  // (equipment: last, as it was drawn last; granted once, when the chest is opened)
  for (const g of roll.gear) {
    if (apply) grantEquipment(m, g.item);
    items.push({ type: 'gear', text: `${itemName(g.item)} (${RARITY_NAMES[g.item.rarity]}, Lv ${g.item.level})`, ref: g.item.base, rarity: g.item.rarity, equip: g.item, prize: g.item.rarity >= 5 });
  }
  return { at: c.at, kind: chestKind(c.at), army: c.army, items };
}

/** Open the stash's chest at `index`: it leaves the stash and its rewards go into the meta, once. Null when there is no such chest. */
export function openChest(m: Meta, index: number): Loot | null {
  const c = m.stash[index];
  if (!c || !armyById(c.army)) return null;
  m.stash.splice(index, 1);
  return lootOf(m, c, true);
}

/**
 * A saved stash that is sane: chests of a real army, a milestone and tier, with a seed (the unopened ones of the earlier format, which kept
 * "given" and "opened" lists on the army record, are added too, so no chest is lost; none is added twice).
 */
export function readStash(raw: unknown, rawArmies: unknown, seed: number): StashChest[] {
  const out: StashChest[] = [];
  const add = (c: StashChest) => {
    // (a tower chest is one of several a run pays, told apart by its seed; an army's milestone is given once)
    if (!out.some((x) => (c.tower || x.tower ? x.tower === c.tower && x.seed === c.seed : x.army === c.army && x.at === c.at))) out.push(c);
  };
  if (Array.isArray(raw))
    for (const c of raw as Partial<StashChest>[]) {
      if (c && typeof c.army === 'string' && armyById(c.army) && MILESTONES.includes(c.at as number) && typeof c.seed === 'number') add({ army: c.army, at: c.at as number, tier: Math.max(0, Math.min(TIERS.length - 1, (c.tier ?? 0) | 0)), seed: c.seed >>> 0, ...(c.tower === true ? { tower: true } : {}) });
    }
  // (the earlier format: a record with its given chests and the opened ones)
  if (rawArmies && typeof rawArmies === 'object')
    for (const a of ARMIES) {
      const r = (rawArmies as Record<string, { chests?: unknown; opened?: unknown } | undefined>)[a.id];
      if (!r || !Array.isArray(r.chests) || !Array.isArray(r.opened)) continue;
      for (const at of MILESTONES) if (r.chests.includes(at) && !r.opened.includes(at)) add({ army: a.id, at, tier: 0, seed: chestSeed(seed, a, at) });
    }
  return out;
}

/** Which chest in the stash the camp's cart shows (and a tap opens): the highest milestone (10 before 5 before 3), then the
 *  hardest tier, then the later army; the first of equals. -1 for an empty stash. */
export function bestChest(stash: readonly { army: string; at: number; tier: number }[]): number {
  const rank = (c: { army: string; at: number; tier: number }) => c.at * 1000 + c.tier * 100 + Math.max(0, armyIndex(c.army));
  let best = stash.length ? 0 : -1;
  stash.forEach((c, k) => {
    if (rank(c) > rank(stash[best])) best = k;
  });
  return best;
}
