// Equipment: permanent gear for the hero kinds, found in the reward chests and kept for good (not the in-run "gear" of
// `gear.ts`, which lasts one run). A hero kind wears three pieces, a weapon, armour and a trinket; any kind can wear
// any piece, but a piece made for a calling (a staff for casters, a bow for shooters) is stronger on a hero of that
// calling. An item has a base (its name and what it gives), a rarity (Common to Mythic, as for heroes), an item level
// and, from Epic up, the base's signature ability (`equipBases.ts`; run by `equipFx.ts`). What a kind wears is added to its stats in every fight, through the
// same boost the levels and grades use (`Boost.equip`, read by `addUnit` in battle.ts). Pure rules: no Pixi, no DOM;
// the roll draws only from the stream it is given.

import type { Meta } from './meta';
import type { Rng } from './rng';
import { ALL_HEROES, UNITS } from './units';
import { levelOfKind } from './levels';
import type { Scores } from './stats';
import { setBonus, type SetBonus } from './gearSets';

import { ABILITIES, BASE_SCORE, EQUIP_BASES, EQUIP_BASE_IDS, EQUIP_LIST, RARITY_SCORE, type Ability, type Calling, type EquipSlot, type Kind, type MainKey } from './equipBases';
export { ABILITIES, EQUIP_BASES, EQUIP_BASE_IDS, EQUIP_LIST };
export type { Ability, Calling, EquipSlot, MainKey };

export const EQUIP_SLOTS: readonly EquipSlot[] = ['weapon', 'armour', 'trinket'];
export const SLOT_NAMES: Readonly<Record<EquipSlot, string>> = { weapon: 'Weapon', armour: 'Armour', trinket: 'Trinket' };

/** A piece of equipment's tier, 1 (Common) to 5 (Mythic). Heroes have none: only gear is graded. */
export type Rarity = 1 | 2 | 3 | 4 | 5;
/** The tiers' names, by rarity (index 0 is unused). */
export const RARITY_NAMES: readonly string[] = ['', 'Common', 'Rare', 'Epic', 'Legendary', 'Mythic'];

/** A chest's quality sets the odds of each rarity. */
export type Quality = 'bronze' | 'silver' | 'gold';
/** Chance of each rarity (Common to Mythic) in percent, by chest quality. */
export const QUALITY_WEIGHTS: Readonly<Record<Quality, Readonly<Record<Rarity, number>>>> = {
  bronze: { 1: 70, 2: 25, 3: 5, 4: 0, 5: 0 },
  silver: { 1: 30, 2: 40, 3: 22, 4: 7, 5: 1 },
  gold: { 1: 5, 2: 25, 3: 40, 4: 24, 5: 6 },
};
export const MAX_ITEM_LEVEL = 20;
/** What a main stat of each rarity is worth against a Common one (index 0 is unused). */
export const RARITY_SCALE: readonly number[] = [1, 1, 1.2, 1.45, 1.75, 2.05];
/** One knob for every main stat: the catalogue's numbers are written as a share of a hero, this keeps the whole kit modest next to levels (`tools/gear-balance.ts`). */
export const MAIN_SCALE = 0.4;
/** Each item level above the first adds this share of the level-1 stat. */
export const LEVEL_STEP = 0.04;
/** A piece made for the wearer's calling gives this much more of its main stats. */
export const CALLING_BONUS = 1.25;
/** Crowns an unwanted item turns into, by rarity (index 0 is unused). */
export const SALVAGE_CROWNS: readonly number[] = [0, 5, 12, 30, 70, 150];
/** The first rarity whose pieces carry their signature ability (Epic). */
export const ABILITY_RARITY = 3;
/** How strong the signature ability is at each rarity (index 0 is unused; Common and Rare have none). */
export const ABILITY_SCALE: readonly number[] = [0, 0, 0, 0.45, 0.55, 0.7];
/** The most a hero's worn pieces add to the shares that could otherwise stack without end. */
const CAPS: Partial<Record<MainKey, number>> = { dodge: 0.35, crit: 0.6, resist: 0.6, atkSpeed: 0.8, moveSpeed: 0.8, charge: 1, regen: 0.03 };

/** A signature ability a worn piece switches on: its id, the name to show, and its strength (`ABILITY_SCALE`, a little more per item level). */
export interface ActiveAbility {
  id: string;
  name: string;
  s: number;
}

/** The numbers a hero's equipment adds in a fight. Shares are 0.06 for +6%; `def` and `range` are flat. */
export interface EquipStats {
  /** Hp and attack as shares of the hero's. */
  hp: number;
  atk: number;
  def: number;
  /** Faster blows and steps, as shares. */
  atkSpeed: number;
  moveSpeed: number;
  /** Extra crit chance. */
  crit: number;
  /** Tiles of reach (whole). */
  range: number;
  /** The share of blows slipped. */
  dodge: number;
  /** A share faster skill charge. */
  charge: number;
  /** Hp mended a second, as a share of max hp. */
  regen: number;
  /** The share of burning and bleeding damage shrugged off. */
  resist: number;
  /** The signature abilities of the worn Epic or better pieces (and a talent's, `talents.ts`). */
  abilities: ActiveAbility[];
  /** The skill and passive modifiers the hero's talents add (`talents.ts` lists the keys; the skills in `abilities.ts` read them). */
  tal?: Record<string, number>;
  /** The two skills the hero kind has chosen for its slots, when not its own two in order (`books.ts`: 'own1', 'own2' or a learned
   *  book's id); `heroKitOf` builds its kit from them. */
  book?: [string, string];
  /** The kind's skill levels by use in slot order, when any is above 1 (`skillLevels.ts`, set by `heroStats`). */
  skillLv?: number[];
  /** Ability score points from the worn pieces (`BASE_SCORE`) and the talents' stat nodes (STATS batch 2; `statPower.ts` reads them). */
  scores?: Partial<Scores>;
}
export type StatKey = Exclude<keyof EquipStats, 'abilities' | 'tal' | 'book' | 'skillLv' | 'scores'>;
export const STAT_KEYS: readonly StatKey[] = ['atk', 'hp', 'def', 'atkSpeed', 'moveSpeed', 'crit', 'range', 'dodge', 'charge', 'regen', 'resist'];
export const emptyStats = (): EquipStats => ({ hp: 0, atk: 0, def: 0, atkSpeed: 0, moveSpeed: 0, crit: 0, range: 0, dodge: 0, charge: 0, regen: 0, resist: 0, abilities: [] });

const pct = (v: number) => `${Math.round(v * 100)}%`;
const secs = (w: number) => `${Math.round(w * 10) / 10}s`;
const num = (v: number) => String(Math.round(v * 10) / 10);

/** What an ability does, in plain words, at strength `s`. */
export function describeAbility(a: Ability, s = 1): string {
  const v = (a.v ?? 0) * s;
  const w = (a.w ?? 0) * (1 + (s - 1) / 2);
  const p = Math.min(0.9, (a.p ?? 1) * s);
  const when: Record<string, string> = {
    hit: a.p ? `${pct(p)} of blows` : 'Each blow',
    nth: `Every ${a.n}th blow`,
    crit: 'On a crit',
    kill: 'On a kill',
    struck: a.n ? `Every ${a.n}th blow taken` : a.p ? `${pct(p)} of blows taken` : 'When struck',
    start: 'At the start',
    tick: a.n && a.n > 1 ? `Every ${a.n} seconds` : 'Every second',
    low: 'Once, below 35% hp',
    death: 'Once, when it would fall',
  };
  const what: Record<Kind, string> = {
    leech: `heals ${pct(v)} of the damage dealt`,
    burn: `sets the foe alight (${pct(v)} of attack a second)`,
    bleed: `makes the foe bleed (${pct(v)} of attack a second)`,
    curse: `curses the foe: ${pct(v)} of attack a second, and it feeds the wielder`,
    slow: `slows the foe for ${secs(w)}`,
    stun: `stuns the foe for ${secs(w)}`,
    chain: `lightning leaps to a second foe for ${pct(v)} of the blow`,
    splash: `${pct(v)} of the blow hits the foes beside the target`,
    pierce: `${pct(v)} of the blow hits the foe behind`,
    smite: `deals ${pct(v)} more of the blow`,
    execute: `deals ${pct(v)} more to a foe below 30% hp`,
    burst: `the slain bursts for ${pct(v)} of attack on foes beside it`,
    charge: `adds ${num(v)} skill charge`,
    mana: `adds ${num(v)} mana to the king`,
    heal: `heals ${pct(v)} of max hp`,
    healAlly: `heals the weakest ally for ${pct(v)} of its hp`,
    shield: `a shield of ${pct(v)} of max hp for ${secs(w)}`,
    haste: `hastes the wielder for ${secs(w)}`,
    stealth: `cannot be targeted for ${secs(w)}`,
    guard: `takes half damage for ${secs(w)}`,
    reflect: `the attacker takes ${pct(v)} of the blow back`,
    counter: `strikes back for ${pct(v)} of attack`,
    taunt: `the attacker must go for the wielder for ${secs(w)}`,
    revive: `rises at ${pct(v)} hp`,
    regen: `mends ${pct(v)} of max hp`,
    aura: `heals allies beside it for ${pct(v)} of their hp`,
    banner: 'raises the attack of allies beside it (+25%)',
    rally: `raises the attack of allies near it (+25%) for ${secs(w)}`,
    berserk: `+${pct(v)} attack for the rest of the fight`,
    cleanse: `cleanses burns, bleeds and slows, and heals ${pct(v)}`,
  };
  return `${when[a.trig]}: ${what[a.kind]}`;
}

export interface Equipment {
  /** Stable for the life of the save; never reused. */
  id: number;
  base: string;
  rarity: Rarity;
  /** 1 to `MAX_ITEM_LEVEL`. */
  level: number;
  /** Durability points lost to wear (`wear.ts`); missing is a full piece (and every piece from before wear). */
  wear?: number;
}
export type NewEquipment = Omit<Equipment, 'id' | 'wear'>;

/** Durability by grade before the item level is added (index 0 is unused): Common 30 to Mythic 90 (`wear.ts`). */
export const DUR: readonly number[] = [0, 30, 40, 55, 70, 90];
/** A piece's full durability: its grade's and its item level. */
export const maxDurability = (it: Pick<Equipment, 'rarity' | 'level'>): number => DUR[it.rarity] + it.level;
/** A piece worn to nothing is broken: it gives nothing (no stats, no ability, no set count) until it is mended (`wear.ts`). */
export const brokenPiece = (it: Equipment): boolean => (it.wear ?? 0) >= maxDurability(it);

/** The calling of a hero kind: shooters (arrows, bullets), casters (the other shots), else melee. */
export function callingOf(kind: string): Calling {
  const shot = UNITS[kind]?.shot;
  if (!shot) return 'melee';
  return shot === 'arrow' || shot === 'bullet' || shot === 'bone' ? 'shooter' : 'caster';
}

/** Whether a piece of this rarity carries its signature ability. */
export const hasAbility = (rarity: number): boolean => rarity >= ABILITY_RARITY;
/** The ability's strength at a rarity and item level. */
export const abilityScale = (rarity: number, level: number): number => ABILITY_SCALE[rarity] * (1 + 0.01 * (level - 1));

/** What an item is called: its base's name, or the Mythic name at Mythic. */
export const itemName = (it: NewEquipment | Equipment): string => (it.rarity >= 5 ? EQUIP_BASES[it.base]?.mythic : EQUIP_BASES[it.base]?.name) ?? 'Unknown';

/** The numbers one item gives a hero of `kind` (a `kind` makes the calling bonus count). */
export function itemStats(it: NewEquipment | Equipment, kind?: string): EquipStats {
  const base = EQUIP_BASES[it.base];
  const out = emptyStats();
  if (!base) return out;
  const k = MAIN_SCALE * RARITY_SCALE[it.rarity] * (1 + LEVEL_STEP * (it.level - 1)) * (kind && base.calling && base.calling === callingOf(kind) ? CALLING_BONUS : 1);
  for (const [stat, v] of Object.entries(base.main) as [MainKey, number][]) out[stat] = stat === 'range' ? Math.floor((v * (it.rarity + 1)) / 3) : v * k;
  if (hasAbility(it.rarity)) out.abilities.push({ id: base.ability.id, name: it.rarity >= 5 ? base.mythic : base.ability.name, s: abilityScale(it.rarity, it.level) });
  // (and its ability score, by its base and rarity: STATS batch 2)
  const score = BASE_SCORE[it.base];
  const points = RARITY_SCORE[it.rarity] ?? 0;
  if (score && points) out.scores = { [score]: points };
  return out;
}

export function addStats(a: EquipStats, b: EquipStats): EquipStats {
  for (const k of STAT_KEYS) a[k] += b[k];
  a.abilities.push(...b.abilities);
  if (b.scores) {
    const s: Partial<Scores> = { ...a.scores };
    for (const [k, v] of Object.entries(b.scores) as [keyof Scores, number][]) s[k] = (s[k] ?? 0) + v;
    a.scores = s;
  }
  return a;
}

/** The item a kind wears in a slot (undefined when the slot is empty). */
export function wornIn(m: Meta, kind: string, slot: EquipSlot): Equipment | undefined {
  const id = m.equipped?.[kind]?.[slot];
  return id === undefined ? undefined : m.equipment?.find((x) => x.id === id);
}

/** What a hero kind's equipment adds in a fight; undefined when it wears nothing (so the fight is exactly as before). */
export function equipStats(m: Meta, kind: string): EquipStats | undefined {
  // (a broken piece gives nothing at all until mended: `wear.ts`)
  const worn = EQUIP_SLOTS.map((slot) => wornIn(m, kind, slot)).filter((x): x is Equipment => !!x && !brokenPiece(x));
  if (!worn.length) return undefined;
  const total = emptyStats();
  for (const it of worn) addStats(total, itemStats(it, kind));
  return capStats(addSetBonus(total, worn.map((x) => x.base)));
}

/** Fold the bonus of the gear sets these bases make (`gearSets.ts`) into stats. An ability a worn piece already carries is not added twice. */
export function addSetBonus(total: EquipStats, bases: readonly string[], bonus: SetBonus = setBonus(bases)): EquipStats {
  for (const [k, v] of Object.entries(bonus.stats) as [MainKey, number][]) total[k] += v;
  for (const a of bonus.abilities) if (!total.abilities.some((x) => x.id === a.id)) total.abilities.push({ id: a.id, name: a.name, s: a.s });
  return total;
}

/** Keep the shares that could stack without end under their caps (the worn pieces and the talents together). */
export function capStats(total: EquipStats): EquipStats {
  for (const [k, cap] of Object.entries(CAPS) as [MainKey, number][]) total[k] = Math.min(cap, total[k]);
  return total;
}

/** The items owned and not worn by anyone, optionally of one slot. */
export function spareEquipment(m: Meta, slot?: EquipSlot): Equipment[] {
  const worn = new Set(Object.values(m.equipped ?? {}).flatMap((s) => Object.values(s)));
  return (m.equipment ?? []).filter((x) => !worn.has(x.id) && (!slot || EQUIP_BASES[x.base]?.slot === slot));
}

/** Whether an item is worn by some hero kind (and which). */
export function wearerOf(m: Meta, id: number): string | undefined {
  for (const [kind, slots] of Object.entries(m.equipped ?? {})) if (Object.values(slots).includes(id)) return kind;
  return undefined;
}

/** Add a new item to the inventory (the chests call this). Gives it the next id and returns it. */
export function grantEquipment(m: Meta, item: NewEquipment): Equipment {
  const have = m.equipment ?? (m.equipment = []);
  const id = Math.max(m.nextItem ?? 1, ...have.map((x) => x.id + 1));
  m.nextItem = id + 1;
  const made: Equipment = { id, base: item.base, rarity: item.rarity, level: item.level };
  have.push(made);
  return made;
}

/** Put a spare item on a hero kind. The piece in that slot goes back to the inventory. False when the item isn't spare or the kind isn't unlocked. */
export function equipItem(m: Meta, kind: string, id: number): boolean {
  const it = spareEquipment(m).find((x) => x.id === id);
  const base = it && EQUIP_BASES[it.base];
  if (!it || !base || !m.unlocked.includes(kind)) return false;
  ((m.equipped ??= {})[kind] ??= {})[base.slot] = id;
  return true;
}

/** Take a kind's piece in a slot off, back to the inventory. */
export function unequipItem(m: Meta, kind: string, slot: EquipSlot): boolean {
  const slots = m.equipped?.[kind];
  if (!slots || slots[slot] === undefined) return false;
  delete slots[slot];
  if (!Object.keys(slots).length) delete m.equipped![kind];
  return true;
}

/** What a piece sells for (the stall's Sell, which replaced Salvage): its grade's salvage crowns and its item level, times its condition
 *  (0.8 broken to 1 full), rounded down, at least 1. A full piece sells for exactly what salvage paid. The condition's gap is kept small
 *  on purpose: mending a piece only to sell it must never pay (`test/sell.test.ts`). */
export function sellPrice(it: Equipment): number {
  const max = maxDurability(it);
  const condition = 0.8 + (0.2 * Math.max(0, max - (it.wear ?? 0))) / max;
  return Math.max(1, Math.floor((SALVAGE_CROWNS[it.rarity] + it.level - 1) * condition + 1e-9));
}

/** Turn a spare item into crowns. Returns the crowns (0, and nothing changes, when it is worn or not owned). */
export function salvageItem(m: Meta, id: number): number {
  const i = spareEquipment(m).findIndex((x) => x.id === id);
  if (i < 0) return 0;
  const it = spareEquipment(m)[i];
  m.equipment = m.equipment!.filter((x) => x.id !== id);
  const n = sellPrice(it);
  m.crowns += n;
  return n;
}

// ---- combining: three of a piece make one of the next grade ----

/** Pieces of one base and grade that go into a combine. */
export const COMBINE_COUNT = 3;
/** Whether a grade can be combined up (Mythic is the top). */
export const canCombineGrade = (rarity: number): boolean => rarity >= 1 && rarity < 5;

/** A group of spare pieces of one base and grade, the best item levels first. */
export interface CombineGroup {
  base: string;
  rarity: Rarity;
  /** Every spare piece in it, best item level first (older id first among equals). */
  items: Equipment[];
}

/** The spare pieces grouped by base and grade, in the catalogue's order then the grade's (only groups of `COMBINE_COUNT` or more, below Mythic). */
export function combineGroups(m: Meta): CombineGroup[] {
  const groups = new Map<string, CombineGroup>();
  for (const it of spareEquipment(m)) {
    if (!canCombineGrade(it.rarity)) continue;
    const key = `${it.base}:${it.rarity}`;
    const g = groups.get(key) ?? { base: it.base, rarity: it.rarity, items: [] };
    g.items.push(it);
    groups.set(key, g);
  }
  const order = (b: string) => EQUIP_BASE_IDS.indexOf(b);
  return [...groups.values()]
    .filter((g) => g.items.length >= COMBINE_COUNT)
    .map((g) => ({ ...g, items: g.items.sort((x, y) => y.level - x.level || x.id - y.id) }))
    .sort((a, b) => order(a.base) - order(b.base) || a.rarity - b.rarity);
}

/** What combining a group makes: the next grade of the same base, at the best item level of the three it uses (the best three of the group). */
export function combinePreview(g: CombineGroup): NewEquipment {
  return { base: g.base, rarity: (g.rarity + 1) as Rarity, level: g.items[0].level };
}

/** Combine three spare pieces of one base and grade (given by id) into one of the next grade, at the best of their item levels. Returns the new piece, or null (and nothing changes) when they are not three different spare pieces of one base and grade, or are Mythic. */
export function combineItems(m: Meta, ids: readonly number[]): Equipment | null {
  if (ids.length !== COMBINE_COUNT || new Set(ids).size !== COMBINE_COUNT) return null;
  const spare = spareEquipment(m);
  const used = ids.map((id) => spare.find((x) => x.id === id));
  if (used.some((x) => !x)) return null;
  const [first] = used as Equipment[];
  if (!canCombineGrade(first.rarity) || (used as Equipment[]).some((x) => x.base !== first.base || x.rarity !== first.rarity)) return null;
  const level = Math.max(...(used as Equipment[]).map((x) => x.level));
  m.equipment = m.equipment!.filter((x) => !ids.includes(x.id));
  return grantEquipment(m, { base: first.base, rarity: (first.rarity + 1) as Rarity, level });
}

/** Combine one group of a base and grade (its three best pieces). Null when fewer than three are spare. */
export function combineGroup(m: Meta, base: string, rarity: number): Equipment | null {
  const g = combineGroups(m).find((x) => x.base === base && x.rarity === rarity);
  return g ? combineItems(m, g.items.slice(0, COMBINE_COUNT).map((x) => x.id)) : null;
}

/** Combine everything that can be, lowest grades first, so a new piece can join the next grade's group. Worn pieces are never used. Returns the pieces made. */
export function combineAll(m: Meta): Equipment[] {
  const made: Equipment[] = [];
  for (let rarity = 1; rarity < 5; rarity++)
    for (;;) {
      const g = combineGroups(m).find((x) => x.rarity === rarity);
      if (!g) break;
      const it = combineItems(m, g.items.slice(0, COMBINE_COUNT).map((x) => x.id));
      if (!it) break;
      made.push(it);
    }
  return made;
}

export interface EquipRoll {
  quality: Quality;
  /** How far on the army is (0 for the first army, up); later armies roll higher item levels. */
  armyIndex?: number;
  /** A chest from a milestone (a boss wave, a clear): a few levels more. A number counts that many. */
  milestone?: boolean | number;
}

/** The item level a chest rolls: 1 plus 3 for each army on, plus up to 2 more, plus 2 for a milestone, to the cap. */
export function rollLevel(rng: Rng, armyIndex = 0, milestone: boolean | number = false): number {
  return Math.max(1, Math.min(MAX_ITEM_LEVEL, 1 + 3 * Math.max(0, Math.floor(armyIndex)) + rng.int(0, 2) + 2 * Number(milestone)));
}

/** A new piece of equipment for a chest. Draws from `rng` only (the same stream gives the same item). Give it to the player with `grantEquipment`. */
export function rollEquipment(rng: Rng, roll: EquipRoll): NewEquipment {
  const rarity = Number(rng.weighted(QUALITY_WEIGHTS[roll.quality])) as Rarity;
  const base = EQUIP_BASES[rng.pick(EQUIP_BASE_IDS)];
  const level = rollLevel(rng, roll.armyIndex, roll.milestone);
  return { base: base.id, rarity, level };
}

/** Plain-English lines for a set of stats, the non-zero ones. */
export function statLines(s: EquipStats): { key: StatKey; label: string; value: number; text: string }[] {
  const label: Record<StatKey, [string, (v: number) => string]> = {
    atk: ['Attack', (v) => `+${pct(v)}`],
    hp: ['Hp', (v) => `+${pct(v)}`],
    def: ['Defence', (v) => `+${(Math.round(v * 10) / 10).toString()}`],
    atkSpeed: ['Attack speed', (v) => `+${pct(v)}`],
    moveSpeed: ['Move speed', (v) => `+${pct(v)}`],
    crit: ['Crit chance', (v) => `+${pct(v)}`],
    range: ['Range', (v) => `+${v}`],
    dodge: ['Dodge', (v) => `+${pct(v)}`],
    charge: ['Skill charge', (v) => `+${pct(v)}`],
    regen: ['Regen', (v) => `${Math.round(v * 1000) / 10}% hp/s`],
    resist: ['Resist', (v) => `+${pct(v)}`],
  };
  return STAT_KEYS.filter((k) => s[k] > 0).map((key) => ({ key, label: label[key][0], value: s[key], text: label[key][1](s[key]) }));
}

/** A few items for the screenshots and tests: one of each slot at a spread of rarities. Adds them to the inventory and returns them. */
export function grantSampleEquipment(m: Meta): Equipment[] {
  const picks: NewEquipment[] = [
    { base: 'ironSword', rarity: 1, level: 1 },
    { base: 'runedBlade', rarity: 3, level: 4 },
    { base: 'stormStaff', rarity: 5, level: 9 },
    { base: 'huntersBow', rarity: 2, level: 3 },
    { base: 'leatherJerkin', rarity: 2, level: 2 },
    { base: 'thornplate', rarity: 4, level: 7 },
    { base: 'luckyCharm', rarity: 1, level: 1 },
    { base: 'phoenixFeather', rarity: 4, level: 6 },
  ];
  return picks.map((p) => grantEquipment(m, p));
}

/** Saved equipment that is sane: known bases, rarity 1 to 5, a level in range, unique ids. Anything else is dropped. */
export function readEquipment(raw: unknown): Equipment[] {
  const out: Equipment[] = [];
  const seen = new Set<number>();
  if (Array.isArray(raw))
    for (const x of raw as Partial<Equipment>[]) {
      if (!x || typeof x.id !== 'number' || !Number.isInteger(x.id) || x.id < 1 || seen.has(x.id) || typeof x.base !== 'string' || !EQUIP_BASES[x.base]) continue;
      const rarity = Math.min(5, Math.max(1, Math.floor(Number(x.rarity)) || 1)) as Rarity;
      const level = Math.min(MAX_ITEM_LEVEL, Math.max(1, Math.floor(Number(x.level)) || 1));
      seen.add(x.id);
      const made: Equipment = { id: x.id, base: x.base, rarity, level };
      // (wear from `wear.ts`: points lost, in halves, never more than the piece's durability; missing is full)
      const wear = Number(x.wear);
      if (Number.isFinite(wear) && wear > 0) made.wear = Math.min(maxDurability(made), Math.round(wear * 2) / 2);
      out.push(made);
    }
  return out;
}

/** Saved wearing that is sane: a hero kind, a slot, an owned item of that slot, each item on one hero only. */
export function readEquipped(raw: unknown, items: readonly Equipment[]): Record<string, Partial<Record<EquipSlot, number>>> {
  const out: Record<string, Partial<Record<EquipSlot, number>>> = {};
  const used = new Set<number>();
  if (raw && typeof raw === 'object')
    for (const [kind, slots] of Object.entries(raw as Record<string, unknown>)) {
      if (!ALL_HEROES.includes(kind) || !slots || typeof slots !== 'object') continue;
      for (const slot of EQUIP_SLOTS) {
        const id = (slots as Record<string, unknown>)[slot];
        const it = typeof id === 'number' ? items.find((x) => x.id === id) : undefined;
        if (!it || used.has(it.id) || EQUIP_BASES[it.base].slot !== slot) continue;
        used.add(it.id);
        (out[kind] ??= {})[slot] = it.id;
      }
    }
  return out;
}

// ---- equipping the best ----

/** What a point of each main stat is worth to a hero in an item's score (the shares are 0.06 for +6%; `def` and `range` are flat). */
const STAT_WORTH: Readonly<Record<StatKey, number>> = { atk: 100, hp: 60, def: 3, atkSpeed: 80, moveSpeed: 20, crit: 50, range: 12, dodge: 50, charge: 30, regen: 800, resist: 10 };
/** What a signature ability is worth, for each point of its strength (`ABILITY_SCALE` .45 to .7 and a little more per item level). */
export const ABILITY_WORTH = 60;

/** How much each stat counts for this hero: its calling (shooters want reach and crits, casters charge, the melee defence), and a sturdy hero (high hp or defence) wants hp and defence more. */
function weightsFor(kind: string): Record<StatKey, number> {
  const w = { ...STAT_WORTH };
  const calling = callingOf(kind);
  const def = UNITS[kind];
  if (calling === 'shooter') (w.range *= 2), (w.crit *= 1.3), (w.atkSpeed *= 1.2);
  if (calling === 'caster') (w.charge *= 1.6), (w.atk *= 1.1);
  if (def && (def.def >= 8 || def.hp >= 280)) (w.hp *= 1.4), (w.def *= 1.6), (w.regen *= 1.3);
  if (def && def.hp <= 170) w.dodge *= 1.3;
  return w;
}

/** An item's value to a hero kind: its main stats (with the calling bonus, rarity and item level, through `itemStats`) weighted for the hero's role, plus its signature ability. */
export function itemScore(it: NewEquipment | Equipment, kind: string): number {
  const s = itemStats(it, kind);
  const w = weightsFor(kind);
  let score = 0;
  for (const k of STAT_KEYS) score += s[k] * w[k];
  for (const a of s.abilities) score += a.s * ABILITY_WORTH;
  return score;
}

export interface EquipPlan {
  /** The item chosen for each slot a change is made in (slots left as they are are missing). */
  slots: Partial<Record<EquipSlot, number>>;
}

/** What a gear set's bonus is worth to a hero kind: its stats and abilities, scored like a piece's. */
export function setScore(bases: readonly string[], kind: string): number {
  const bonus = setBonus(bases);
  const w = weightsFor(kind);
  let score = 0;
  for (const [k, v] of Object.entries(bonus.stats) as [StatKey, number][]) score += v * w[k];
  for (const a of bonus.abilities) score += a.s * ABILITY_WORTH;
  return score;
}

/** The strongest set of pieces for a hero kind: from the bag (spare items) and what the kind already wears, and, if `takeFromOthers`, what other heroes wear (never an id in `locked`). The pieces are chosen together, so a gear set's bonus counts: the best combination of one item a slot (the best item of each base) by the pieces' scores plus the sets' worth. A slot changes only when the whole beats what the kind wears. */
export function bestFor(m: Meta, kind: string, takeFromOthers = false, locked: ReadonlySet<number> = new Set()): EquipPlan {
  const plan: EquipPlan = { slots: {} };
  // (each slot's options: what is worn first, then the best item of each base by the older id, then an empty slot)
  const options = EQUIP_SLOTS.map((slot) => {
    const cur = wornIn(m, kind, slot);
    // (a broken piece worn scores nothing, so Equip best swaps it for a whole one)
    const list: { it?: Equipment; score: number }[] = [{ it: cur, score: cur && !brokenPiece(cur) ? itemScore(cur, kind) : 0 }];
    const bestOfBase = new Map<string, { it: Equipment; score: number }>();
    for (const it of m.equipment ?? []) {
      if (EQUIP_BASES[it.base]?.slot !== slot || it === cur || locked.has(it.id) || brokenPiece(it)) continue;
      const owner = wearerOf(m, it.id);
      if (owner !== undefined && owner !== kind && !takeFromOthers) continue;
      const score = itemScore(it, kind);
      const held = bestOfBase.get(it.base);
      // (ties go to the older item, so the plan is the same every time)
      if (!held || score > held.score + 1e-9) bestOfBase.set(it.base, { it, score });
    }
    list.push(...bestOfBase.values());
    if (cur) list.push({ score: 0 });
    return list;
  });
  let top = -Infinity;
  let pick: (Equipment | undefined)[] = [];
  for (const w of options[0])
    for (const a of options[1])
      for (const t of options[2]) {
        const chosen = [w.it, a.it, t.it];
        const total = w.score + a.score + t.score + setScore(chosen.filter((x): x is Equipment => !!x).map((x) => x.base), kind);
        if (total > top + 1e-9) (top = total), (pick = chosen);
      }
  EQUIP_SLOTS.forEach((slot, i) => {
    const cur = wornIn(m, kind, slot);
    if (pick[i] && pick[i] !== cur) plan.slots[slot] = pick[i]!.id;
  });
  return plan;
}

/** Put the best pieces on a hero kind. Returns how many slots changed. A piece taken from another hero leaves that hero's slot empty; no item is ever on two heroes. */
export function equipBest(m: Meta, kind: string, takeFromOthers = false, locked: ReadonlySet<number> = new Set()): number {
  if (!m.unlocked.includes(kind)) return 0;
  let n = 0;
  for (const [slot, id] of Object.entries(bestFor(m, kind, takeFromOthers, locked).slots) as [EquipSlot, number][]) {
    const owner = wearerOf(m, id);
    if (owner !== undefined && owner !== kind) unequipItem(m, owner, slot);
    if (equipItem(m, kind, id)) n++;
  }
  return n;
}

/** The unlocked hero kinds, strongest first (level, then rank): the order `equipAll` serves them in. */
export function strongestFirst(m: Meta): string[] {
  const rank = (k: string) => RANK_SHARDS_FOR(m, k);
  return ALL_HEROES.filter((k) => m.unlocked.includes(k)).sort((a, b) => levelOfKind(m, b) - levelOfKind(m, a) || rank(b) - rank(a) || ALL_HEROES.indexOf(a) - ALL_HEROES.indexOf(b));
}
const RANK_SHARDS_FOR = (m: Meta, k: string): number => m.shards[k] ?? 0;

/** Equip every unlocked hero (or the kinds given), strongest first. A hero served earlier keeps what it was given (`takeFromOthers` only strips heroes not yet served). Returns the slots changed. */
export function equipAll(m: Meta, takeFromOthers = false, kinds: readonly string[] = strongestFirst(m)): number {
  const locked = new Set<number>();
  let n = 0;
  for (const kind of kinds) {
    n += equipBest(m, kind, takeFromOthers, locked);
    for (const id of Object.values(m.equipped?.[kind] ?? {})) locked.add(id);
  }
  return n;
}
