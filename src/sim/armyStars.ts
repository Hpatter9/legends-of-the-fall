// An army's 10 stars and its chests. A run through an army earns up to three stars from how well the whole run went (the
// conditions are the same on every tier but Legendary, whose single star is a flawless clear); the conditions a tier has
// met are kept for good, so a replay adds only the ones still missing. At 3, 5 and 10 stars an army gives a chest, once
// each; the chest holds random rewards drawn from a side stream of the save's seed, the army and the milestone, so it
// cannot be rerolled by reloading, and it pays better the higher the milestone and the later the army. Pure rules: no
// Pixi, no DOM.

import { armyById, armyIndex, recordOf, type Army, type ArmyRecord } from './armies';
import { dropGear, type Gear } from './gear';
import { kindsOf, RATES, rarityOf, RARITY_NAMES, type Meta } from './meta';
import { RELIC_IDS, RELICS } from './relics';
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
  /** Chest milestones this run reached for the first time. */
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
  return { tier, rules, fresh, gained: fresh.length, total: starsOf(rec), chests: grantChests(rec) };
}

const starsOf = (rec: ArmyRecord): number => TIERS.reduce((n, t, i) => n + countBits((rec.met?.[String(i)] ?? 0) & ((1 << t.stars) - 1)), 0);
function countBits(n: number): number {
  let c = 0;
  for (let x = n; x; x &= x - 1) c++;
  return c;
}

/** Give the chests the army's stars have reached (each milestone once, however often it is called). Returns the new ones. */
export function grantChests(rec: ArmyRecord): number[] {
  const got = (rec.chests ??= []);
  const stars = starsOf(rec);
  const fresh = MILESTONES.filter((n) => stars >= n && !got.includes(n));
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
  /** Not reached, waiting to be opened, or opened. */
  state: 'locked' | 'ready' | 'opened';
}
/** The three chests of an army and where each stands. */
export function chestsOf(m: Meta, a: Army): ChestState[] {
  const rec = recordOf(m, a.id);
  return MILESTONES.map((at) => ({ at, kind: chestKind(at), state: rec.opened?.includes(at) ? 'opened' : rec.chests?.includes(at) ? 'ready' : 'locked' }));
}
export const chestsReady = (m: Meta, a: Army): number => chestsOf(m, a).filter((c) => c.state === 'ready').length;

export interface LootItem {
  type: 'crowns' | 'shards' | 'hero' | 'relic' | 'gear';
  /** A line for the reveal: "320 crowns", "3 Knight shards", "Banner (relic)". */
  text: string;
  /** The hero kind, relic id or gear slot it is about. */
  ref?: string;
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

/** The crowns a chest pays before its draw: the milestone's base, rising with the army's place in the list. */
export const chestCrowns = (at: number, armyIdx: number): number => roundTo(({ 3: 150, 5: 420, 10: 1300 } as Record<number, number>)[at] * (1 + 0.32 * armyIdx), 10);

/** A rarity drawn from the pull rates, tilted towards the rare ones by the chest's quality. */
function drawRarity(rng: Rng, quality: number, min: Rarity = 1): Rarity {
  const w = {} as Record<string, number>;
  for (let r = min; r <= 5; r++) w[String(r)] = RATES[r as Rarity] * quality ** (r - 1);
  return Number(rng.weighted(w)) as Rarity;
}

/** What a chest holds, drawn without touching the meta: the same for a save seed, army and milestone, always. */
export function rollChest(seed: number, a: Army, at: number): { crowns: number; shards: string[]; recruits: { kind: string; prize: boolean }[]; relics: string[]; gear: Gear[] } {
  const idx = armyIndex(a.id);
  const step = CHEST_STEP(at);
  const rng = new Rng(mixSeed(seed, SALT, idx + 1, at));
  // quality: how far the rare ones are tilted up (1 is the plain pull rates)
  const quality = 1 + 0.28 * (step - 1) + 0.06 * idx;
  const crowns = roundTo(chestCrowns(at, idx) * rng.range(0.85, 1.15), 10);
  const shards = Array.from({ length: 1 + step + (at >= 10 ? 1 : 0) }, () => rng.pick(kindsOf(drawRarity(rng, quality))));
  const recruits: { kind: string; prize: boolean }[] = [];
  if (step === 2 && rng.chance(0.3 + 0.04 * idx)) recruits.push({ kind: rng.pick(kindsOf(drawRarity(rng, quality, 2))), prize: false });
  if (step === 3) {
    // the 10-star chest always holds a hero: Epic or better, Legendary from the fourth army, Mythic from the eighth
    const floor = (idx >= 7 ? 5 : idx >= 3 ? 4 : 3) as Rarity;
    recruits.push({ kind: rng.pick(kindsOf(drawRarity(rng, quality, floor))), prize: true });
  }
  const relics: string[] = [];
  const gear: Gear[] = [];
  const stage = 1 + 8 * (step - 1) + 5 * idx;
  if (step >= 2) {
    relics.push(rng.pick(RELIC_IDS));
    if (rng.chance(0.5 + 0.05 * idx)) gear.push(dropGear(rng, 0, stage, step - 2));
  } else if (rng.chance(0.4)) {
    if (rng.chance(0.5)) relics.push(rng.pick(RELIC_IDS));
    else gear.push(dropGear(rng, 0, stage));
  }
  if (step === 3) gear.push(dropGear(rng, 0, stage, 1));
  return { crowns, shards, recruits, relics, gear };
}

/**
 * Open a ready chest: roll it, put the rewards in the meta and mark it opened. Null when the chest is not ready (not reached, or opened already).
 * A hero not yet owned is recruited; one owned gives shards instead. Relics and gear go to the vault for the next run.
 */
export function openChest(m: Meta, armyId: string, at: number): Loot | null {
  const a = armyById(armyId);
  const rec = m.armies[armyId];
  if (!a || !rec || !rec.chests?.includes(at) || rec.opened?.includes(at)) return null;
  const roll = rollChest(m.seed, a, at);
  const items: LootItem[] = [];
  m.crowns += roll.crowns;
  items.push({ type: 'crowns', text: `${roll.crowns} crowns` });
  const shards = new Map<string, number>();
  for (const k of roll.shards) shards.set(k, (shards.get(k) ?? 0) + 1);
  for (const [kind, n] of shards) {
    m.shards[kind] = (m.shards[kind] ?? 0) + n;
    items.push({ type: 'shards', text: `${n} ${UNITS[kind].name} shard${n > 1 ? 's' : ''}`, ref: kind, rarity: rarityOf(kind) });
  }
  for (const r of roll.recruits) {
    const isNew = !m.unlocked.includes(r.kind);
    if (isNew) m.unlocked.push(r.kind);
    else m.shards[r.kind] = (m.shards[r.kind] ?? 0) + 2;
    items.push({ type: 'hero', text: isNew ? `${UNITS[r.kind].name} joins you (${RARITY_NAMES[rarityOf(r.kind)]})` : `${UNITS[r.kind].name}: 2 shards (already yours)`, ref: r.kind, rarity: rarityOf(r.kind), prize: r.prize });
  }
  for (const id of roll.relics) {
    if (m.vault.relics.includes(id)) {
      m.crowns += 60;
      items.push({ type: 'crowns', text: `60 crowns (a second ${RELICS[id].name})` });
    } else {
      m.vault.relics.push(id);
      items.push({ type: 'relic', text: `${RELICS[id].name}: ${RELICS[id].text}`, ref: id });
    }
  }
  for (const g of roll.gear) {
    m.vault.gear.push(g);
    items.push({ type: 'gear', text: `${g.name} (${g.slot}, tier ${g.tier})`, ref: g.slot, prize: false });
  }
  (rec.opened ??= []).push(at);
  return { at, kind: chestKind(at), army: armyId, items };
}

/** A new run starts with the relics and gear the chests have given (they leave the vault). Returns how many pieces it took. */
export function takeVault(m: Meta, run: Run): number {
  const v = m.vault;
  const n = v.relics.length + v.gear.length;
  if (!n) return 0;
  run.relics = [...new Set([...(run.relics ?? []), ...v.relics])];
  for (const g of v.gear) (run.items ??= []).push({ ...g, id: (run.nextGear = (run.nextGear ?? 1) + 1) - 1 });
  m.vault = { relics: [], gear: [] };
  return n;
}

