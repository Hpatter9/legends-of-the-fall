// An army's 10 stars and its chests. A run through an army earns up to three stars from how well the whole run went (the
// conditions are the same on every tier but Legendary, whose single star is a flawless clear); the conditions a tier has
// met are kept for good, so a replay adds only the ones still missing. At 3, 5 and 10 stars an army gives a chest, once
// each, into the meta's stash (opened later from the home screen); its rewards are fixed when it is earned, from a side
// stream of the save's seed, the army and the milestone, so they cannot be rerolled by reloading or by the order of
// opening, and they pay better the higher the milestone and the tier and the later the army. Pure rules: no
// Pixi, no DOM.

import { dailyStarsMax } from './dailyThemes';
import { chestOres, grantOres, ORES, sumOres, type OreDrop } from './awakenMats';
import { ARMIES, armyById, armyIndex, recordOf, type Army, type ArmyRecord } from './armies';
import { grantEquipment, itemName, RARITY_NAMES, rollEquipment, type NewEquipment } from './equipment';
import { type Meta, type StashChest } from './meta';
import { mixSeed, Rng } from './rng';
import { armyOfRun, tierOfRun, type Run } from './run';
import { MILESTONES, RUN_STARS, TIERS } from './tiers';
import { ALL_HEROES } from './units';
import { CHEST_STONES, DAILY_CHEST_STONES } from './unlockRules';
import { rollScroll, scrollWords } from './spellSources';
import type { SpellId } from './spells';
import { addTomes, grantTomes, rollTomes, TOME_SIZES, tomeWords, type TomeCounts, type TomeSize } from './tomes';

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
  if (TIERS[tier].stars === 1) return [{ text: 'Flawless: no hero lost in any boss fight', earned: won && !!t && (t.bossFell ?? t.bossLost) === 0 }];
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
  /** The milestone that sizes the first-clear chest this run paid (3, 5 or 10), or 0 when the tier was cleared before. */
  firstClear: number;
}

/** Settle a finished army run in the meta: the conditions it met are merged into the tier's best, and any chest the new total reaches is given. Null unless the run cleared its army. */
export function settleArmyRun(m: Meta, run: Run): StarResult | null {
  const a = armyOfRun(run);
  if (!a || !run.cleared) return null;
  const tier = tierOfRun(run);
  const rules = armyRules(a, tier, run);
  const rec = (m.armies[a.id] ??= { waves: a.waves.length, best: 0, won: 0, clears: 0, stars: {} });
  const before = rec.met?.[String(tier)] ?? 0;
  let mask = 0;
  const fresh: number[] = [];
  rules.slice(0, RUN_STARS).forEach((r, i) => {
    if (!r.earned) return;
    mask |= 1 << i;
    if (!(before & (1 << i))) fresh.push(i);
  });
  (rec.met ??= {})[String(tier)] = before | mask;
  const firstClear = grantFirstClear(m, a, rec, tier);
  return { tier, rules, fresh, gained: fresh.length, total: starsOf(rec), chests: grantChests(m, a, rec, tier), firstClear };
}

/** The star milestone whose chest size an army's first clear of each tier pays: Normal bronze, Hard and Elite silver, Legendary and Mythic gold. */
export const FIRST_CLEAR_CHEST: readonly number[] = [3, 5, 5, 10, 10];

/** The seed of a first-clear chest: the save's seed, the army and the tier (a side stream of its own, so every other chest rolls as before). */
export const firstClearSeed = (seed: number, a: Army, tier: number): number => mixSeed(seed, FIRST_SALT, armyIndex(a.id) + 1, tier);

/** Give the chest for the army's first clear on `tier`, once ever. Returns its size's milestone, or 0 when this tier was cleared before. */
export function grantFirstClear(m: Meta, a: Army, rec: ArmyRecord, tier: number): number {
  const bit = 1 << tier;
  if ((rec.first ?? 0) & bit) return 0;
  rec.first = (rec.first ?? 0) | bit;
  const at = FIRST_CLEAR_CHEST[tier] ?? 3;
  m.stash.push({ army: a.id, at, tier, seed: firstClearSeed(m.seed, a, tier), first: true });
  return at;
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

/** The daily chest has a look of its own (`chestStash.ts`), whatever its size. */
export type ChestKind = 'bronze' | 'silver' | 'gold' | 'mythic' | 'daily';
/** The Mythic star's chest is the best the armies give (a gold chest's picture, tinted); the rolls of a gold chest stand for its quality. */
export const chestKind = (at: number): 'bronze' | 'silver' | 'gold' | 'mythic' => (at >= 11 ? 'mythic' : at >= 10 ? 'gold' : at >= 5 ? 'silver' : 'bronze');
const CHEST_STEP = (at: number): number => (at >= 11 ? 4 : at >= 10 ? 3 : at >= 5 ? 2 : 1);

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
  return MILESTONES.map((at) => ({ at, kind: chestKind(at), state: rec.chests?.includes(at) ? 'earned' : 'locked', waiting: m.stash.some((c) => !c.tower && !c.first && c.army === a.id && c.at === at) }));
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
  const kind = chestKind(at);
  if (kind === 'bronze' && !rng.chance(BRONZE_GEAR_CHANCE)) return [];
  const quality = kind === 'mythic' ? 'gold' : kind;
  const out = [{ item: rollEquipment(rng, { quality, armyIndex: armyIdx, milestone: at >= 11 ? 3 : at >= 10 }) }];
  // (the Mythic chest holds a second piece, drawn after the first, so the gold chest's own roll is as it was)
  if (kind === 'mythic') out.push({ item: rollEquipment(rng, { quality, armyIndex: armyIdx, milestone: 3 }) });
  return out;
}

export interface LootItem {
  type: 'crowns' | 'stones' | 'gear' | 'tomes' | 'spell' | 'ores';
  /** A line for the reveal: "320 crowns", "3 summoning stones". */
  text: string;
  /** The equipment's base it is about. */
  ref?: string;
  /** How many crowns, stones or tomes the line holds. */
  n?: number;
  /** The size of the XP tomes a tomes line holds (`tomes.ts`). */
  size?: TomeSize;
  /** The class trait of the rift ores a line holds (`awakenMats.ts`). */
  trait?: string;
  /** The spell a scroll teaches (`spellSources.ts`). */
  spell?: SpellId;
  /** A piece of equipment this reward is (for its icon and frame). */
  equip?: NewEquipment;
  /** A piece of equipment's rarity (for the card colour; heroes have none). */
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
const FIRST_SALT = 0xf1c7e;
const roundTo = (n: number, k: number): number => Math.round(n / k) * k;

/** The seed a chest's contents are rolled from, fixed when it is earned: the save's seed, the army and the milestone. */
export const chestSeed = (seed: number, a: Army, at: number): number => mixSeed(seed, SALT, armyIndex(a.id) + 1, at);

/** The crowns a chest pays before its draw: the milestone's base, rising with the army's place in the list and the tier. */
export const chestCrowns = (at: number, armyIdx: number, tier = 0): number => roundTo(({ 3: 150, 5: 420, 10: 1300, 11: 2400 } as Record<number, number>)[at] * (1 + 0.32 * armyIdx) * (1 + 0.15 * tier), 10);

/** What a chest holds, drawn from its seed without touching the meta: the same chest always rolls the same. */
export function rollChest(seed: number, a: Army, at: number, tier = 0): { crowns: number; shards: string[]; recruits: { kind: string; prize: boolean }[]; gear: GearDrop[] } {
  const idx = armyIndex(a.id);
  const step = CHEST_STEP(at);
  const rng = new Rng(seed);
  const crowns = roundTo(chestCrowns(at, idx, tier) * rng.range(0.85, 1.15), 10);
  const shards = Array.from({ length: 1 + step + (at >= 10 ? 1 : 0) }, () => rng.pick(ALL_HEROES));
  const recruits: { kind: string; prize: boolean }[] = [];
  if (step === 2 && rng.chance(0.3 + 0.04 * idx + 0.05 * tier)) recruits.push({ kind: rng.pick(ALL_HEROES), prize: false });
  if (step >= 3) {
    // the 10-star chest always holds a hero (any of them, as likely as another); the 11-star chest a second
    recruits.push({ kind: rng.pick(ALL_HEROES), prize: true });
  }
  if (step >= 4) recruits.push({ kind: rng.pick(ALL_HEROES), prize: true });
  return { crowns, shards, recruits, gear: rollGear(rng, at, idx) };
}

// ---- the daily chest ----------------------------------------------------------------------------------------------------

/** Crowns the daily chest pays before its draw, and each bonus star's addition. */
export const DAILY_CHEST_CROWNS = 240;
export const DAILY_BONUS_CROWNS = 60;
/** The chance the daily chest holds a piece of equipment (bronze quality; silver once both bonus stars are won), and what each bonus star adds. */
export const DAILY_GEAR_CHANCE = 0.45;
export const DAILY_GEAR_STAR = 0.15;
/** The chance of a hero draw (unlock shards for a hero not owned, rank shards for one owned) in the daily chest. */
export const DAILY_HERO_CHANCE = 0.3;
/** The army-list place the daily chest's equipment rolls its item level at (the early armies' own). */
const DAILY_GEAR_ARMY = 1;

/**
 * What a daily chest holds, drawn from its seed alone: crowns (more for each bonus star), 3 hero shards (one more per bonus star),
 * now and then a hero draw, and a chance of equipment. Same shape as `rollChest`, so opening it goes through the same shard rules
 * (`lootOf`: unlock shards for a hero not owned, rank shards for one owned, a content hero not owned swapped for another).
 */
export function rollDailyChest(seed: number, bonus: number): ReturnType<typeof rollChest> {
  const rng = new Rng(seed);
  const crowns = roundTo((DAILY_CHEST_CROWNS + DAILY_BONUS_CROWNS * bonus) * rng.range(0.85, 1.15), 10);
  const shards = Array.from({ length: 3 + bonus }, () => rng.pick(ALL_HEROES));
  const recruits = rng.chance(DAILY_HERO_CHANCE) ? [{ kind: rng.pick(ALL_HEROES), prize: false }] : [];
  // (the equipment takes the stream last, as in every chest)
  const gear: GearDrop[] = rng.chance(DAILY_GEAR_CHANCE + DAILY_GEAR_STAR * bonus) ? [{ item: rollEquipment(rng, { quality: bonus >= 2 ? 'silver' : 'bronze', armyIndex: DAILY_GEAR_ARMY, milestone: bonus >= 1 }) }] : [];
  return { crowns, shards, recruits, gear };
}

/** The chest of the stash at `index`, rolled (null when there is none). */
export function peekChest(m: Meta, index: number): Loot | null {
  const c = m.stash[index];
  return c ? lootOf(m, c, false) : null;
}

/**
 * The summoning stones a chest holds: by its star milestone (`CHEST_STONES`), and a daily chest's base and one for each bonus star. The rolls of the chest
 * (`rollChest`) are untouched, so every chest still holds the crowns and the gear it did; the hero shards they once named are stones now, which are
 * not tied to a hero: a stone is one shard of a hero drawn when it is used (`pullOnce`).
 */
export function chestStones(c: Pick<StashChest, 'at' | 'daily' | 'bonus'>): number {
  return c.daily !== undefined ? DAILY_CHEST_STONES + (c.bonus ?? 0) : CHEST_STONES[c.at] ?? 1;
}

/** The reveal lines of a chest's stones (a plain line and, when there is one, the prize line), the gear after. Shared with the shop's chests. */
export function stoneItems(plain: number, prize: number): LootItem[] {
  const word = (n: number) => `${n} summoning stone${n === 1 ? '' : 's'}`;
  const out: LootItem[] = [];
  if (plain) out.push({ type: 'stones', text: word(plain), n: plain });
  if (prize) out.push({ type: 'stones', text: word(prize), n: prize, prize: true });
  return out;
}

/** The reveal lines of a chest's XP tomes, one a size, smallest first. Shared with the shop's chests. */
export function tomeItems(t: TomeCounts): LootItem[] {
  return TOME_SIZES.filter((size) => (t[size] ?? 0) > 0).map((size) => ({ type: 'tomes', text: tomeWords(size, t[size]!), n: t[size], size, ...(size === 'large' ? { prize: true } : {}) }));
}

/** The reveal line of a piece of gear a chest drops. */
export const gearItem = (g: GearDrop): LootItem => ({ type: 'gear', text: `${itemName(g.item)} (${RARITY_NAMES[g.item.rarity]}, Lv ${g.item.level})`, ref: g.item.base, rarity: g.item.rarity, equip: g.item, prize: g.item.rarity >= 5 });

function lootOf(m: Meta, c: StashChest, apply: boolean): Loot {
  const daily = c.daily !== undefined;
  const roll = daily ? rollDailyChest(c.seed, c.bonus ?? 0) : rollChest(c.seed, armyById(c.army)!, c.at, c.tier);
  const items: LootItem[] = [{ type: 'crowns', text: `${roll.crowns} crowns`, n: roll.crowns }];
  if (apply) m.crowns += roll.crowns;
  const stones = chestStones(c);
  if (apply) m.stones = (m.stones ?? 0) + stones;
  items.push(...stoneItems(stones, 0));
  // (XP tomes: on top of the rest, from a side stream of the chest's seed, so the crowns and gear roll as they always did)
  const tomes = rollTomes(c.seed, daily ? 'daily' : chestKind(c.at), c.bonus ?? 0);
  if (apply) grantTomes(m, tomes);
  items.push(...tomeItems(tomes));
  // (a spell scroll in a gold or Mythic chest, now and then: from its own side stream, a spell this save does not know yet)
  const scroll = daily ? null : rollScroll(m, c.seed, chestKind(c.at));
  if (scroll) {
    if (apply && !m.spellbook.owned.includes(scroll)) m.spellbook.owned.push(scroll);
    items.push({ type: 'spell', text: scrollWords(scroll), spell: scroll, prize: true });
  }
  // (now and then a gold or Mythic chest holds a few rift ores of its army's kinds: from a side stream of its seed)
  const ores = daily ? null : chestOres(c.seed, chestKind(c.at), c.army);
  if (ores) {
    if (apply) grantOres(m, [ores]);
    items.push({ type: 'ores', text: `${ores.n} ${ORES[ores.trait].name}`, n: ores.n, trait: ores.trait });
  }
  // (equipment: last, as it was drawn last; granted once, when the chest is opened)
  for (const g of roll.gear) {
    if (apply) grantEquipment(m, g.item);
    items.push(gearItem(g));
  }
  return { at: c.at, kind: daily ? 'daily' : chestKind(c.at), army: c.army, items };
}

/** Open the stash's chest at `index`: it leaves the stash and its rewards go into the meta, once. Null when there is no such chest. */
export function openChest(m: Meta, index: number): Loot | null {
  const c = m.stash[index];
  if (!c || (c.daily === undefined && !armyById(c.army))) return null;
  m.stash.splice(index, 1);
  return lootOf(m, c, true);
}

/** What several chests held, added up (the Open all summary): the crowns, stones and tomes, the spell scrolls, and the gear, the best first (rarity, then level). */
export interface LootSummary {
  chests: number;
  crowns: number;
  stones: number;
  tomes: TomeCounts;
  spells: LootItem[];
  gear: LootItem[];
  /** Rift ores, the same kinds added together. */
  ores: OreDrop[];
}
export function sumLoot(loots: readonly Loot[]): LootSummary {
  const out: LootSummary = { chests: loots.length, crowns: 0, stones: 0, tomes: {}, spells: [], gear: [], ores: [] };
  const ores: OreDrop[] = [];
  for (const l of loots)
    for (const it of l.items) {
      if (it.type === 'crowns') out.crowns += it.n ?? 0;
      else if (it.type === 'stones') out.stones += it.n ?? 0;
      else if (it.type === 'tomes' && it.size) out.tomes = addTomes(out.tomes, { [it.size]: it.n ?? 0 });
      else if (it.type === 'spell') out.spells.push(it);
      else if (it.type === 'gear') out.gear.push(it);
      else if (it.type === 'ores' && it.trait) ores.push({ trait: it.trait, n: it.n ?? 0 });
    }
  out.ores = sumOres(ores);
  // (a stable sort: pieces of the same rarity and level stay in the order their chests were opened)
  out.gear.sort((a, b) => (b.rarity ?? 0) - (a.rarity ?? 0) || (b.equip?.level ?? 0) - (a.equip?.level ?? 0));
  return out;
}

/**
 * Open every chest in the stash at once, in the order a tap on the cart would open them one by one (the best waiting first, `bestChest`):
 * each chest pays exactly what it would have, from its own seed, and the gear is given its ids in the same order. Returns what each held.
 */
export function openAll(m: Meta): Loot[] {
  const out: Loot[] = [];
  while (m.stash.length) {
    const i = bestChest(m.stash);
    const loot = openChest(m, i);
    // (a chest that cannot be opened (an army no longer known) is left where it is; Open all stops rather than loop on it)
    if (!loot) break;
    out.push(loot);
  }
  return out;
}

/**
 * A saved stash that is sane: chests of a real army, a milestone and tier, with a seed (the unopened ones of the earlier format, which kept
 * "given" and "opened" lists on the army record, are added too, so no chest is lost; none is added twice).
 */
export function readStash(raw: unknown, rawArmies: unknown, seed: number): StashChest[] {
  const out: StashChest[] = [];
  const add = (c: StashChest) => {
    // (a tower chest is one of several a run pays, told apart by its seed; an army's milestone is given once)
    if (!out.some((x) => (c.daily || x.daily ? x.daily === c.daily : c.tower || x.tower || c.first || x.first ? !!x.tower === !!c.tower && !!x.first === !!c.first && x.seed === c.seed : x.army === c.army && x.at === c.at))) out.push(c);
  };
  if (Array.isArray(raw))
    for (const c of raw as Partial<StashChest>[]) {
      // (a daily chest names its date and has no army)
      if (c && c.army === 'daily' && /^\d{8}$/.test(String(c.daily)) && typeof c.seed === 'number') add({ army: 'daily', at: 3, tier: 0, seed: c.seed >>> 0, daily: c.daily as number, bonus: Math.max(0, Math.min(dailyStarsMax(c.daily as number), (c.bonus ?? 0) | 0)) });
      else if (c && typeof c.army === 'string' && armyById(c.army) && MILESTONES.includes(c.at as number) && typeof c.seed === 'number') add({ army: c.army, at: c.at as number, tier: Math.max(0, Math.min(TIERS.length - 1, (c.tier ?? 0) | 0)), seed: c.seed >>> 0, ...(c.tower === true ? { tower: true } : {}), ...(c.first === true ? { first: true } : {}) });
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
export function bestChest(stash: readonly { army: string; at: number; tier: number; daily?: number }[]): number {
  // (a daily chest ranks with a silver one)
  const rank = (c: { army: string; at: number; tier: number; daily?: number }) => (c.daily !== undefined ? 5 : c.at) * 1000 + c.tier * 100 + Math.max(0, armyIndex(c.army));
  let best = stash.length ? 0 : -1;
  stash.forEach((c, k) => {
    if (rank(c) > rank(stash[best])) best = k;
  });
  return best;
}
