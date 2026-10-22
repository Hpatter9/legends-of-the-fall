// Equipment: permanent gear for the hero kinds, found in the reward chests and kept for good (not the in-run "gear" of
// `gear.ts`, which lasts one run). A hero kind wears three pieces, a weapon, armour and a trinket; any kind can wear
// any piece, but a piece made for a calling (a staff for casters, a bow for shooters) is stronger on a hero of that
// calling. An item has a base (its name and what it gives), a rarity (Common to Mythic, as for heroes), an item level
// and, from Epic up, one or two special affixes. What a kind wears is added to its stats in every fight, through the
// same boost the levels and grades use (`Boost.equip`, read by `addUnit` in battle.ts). Pure rules: no Pixi, no DOM;
// the roll draws only from the stream it is given.

import type { Meta } from './meta';
import type { Rng } from './rng';
import { ALL_HEROES, UNITS, type Rarity } from './units';

export type EquipSlot = 'weapon' | 'armour' | 'trinket';
export const EQUIP_SLOTS: readonly EquipSlot[] = ['weapon', 'armour', 'trinket'];
export const SLOT_NAMES: Readonly<Record<EquipSlot, string>> = { weapon: 'Weapon', armour: 'Armour', trinket: 'Trinket' };
export type Calling = 'melee' | 'shooter' | 'caster';

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
export const RARITY_SCALE: readonly number[] = [1, 1, 1.35, 1.8, 2.4, 3.2];
/** Each item level above the first adds this share of the level-1 stat. */
export const LEVEL_STEP = 0.07;
/** A piece made for the wearer's calling gives this much more of its main stats. */
export const CALLING_BONUS = 1.25;
/** Crowns an unwanted item turns into, by rarity (index 0 is unused). */
export const SALVAGE_CROWNS: readonly number[] = [0, 5, 12, 30, 70, 150];

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
  /** Affixes: the share of damage dealt that heals the wielder. */
  lifesteal: number;
  /** A blow sets the foe burning: each tick deals this share of the wielder's attack. */
  burn: number;
  /** A melee blow taken hurts the attacker for this share of it. */
  thorns: number;
  /** The wielder starts the fight with a shield of this share of its max hp. */
  shield: number;
  /** Damage taken is cut by this share. */
  guard: number;
}
export type StatKey = keyof EquipStats;
export const STAT_KEYS: readonly StatKey[] = ['atk', 'hp', 'def', 'atkSpeed', 'moveSpeed', 'crit', 'range', 'lifesteal', 'burn', 'thorns', 'shield', 'guard'];
export const emptyStats = (): EquipStats => ({ hp: 0, atk: 0, def: 0, atkSpeed: 0, moveSpeed: 0, crit: 0, range: 0, lifesteal: 0, burn: 0, thorns: 0, shield: 0, guard: 0 });

export type AffixId = 'lifesteal' | 'burn' | 'thorns' | 'shield' | 'guard';
export const AFFIXES: Readonly<Record<AffixId, { name: string; stat: StatKey; base: number; text: (v: number) => string }>> = {
  lifesteal: { name: 'Vampiric', stat: 'lifesteal', base: 0.06, text: (v) => `heals ${pct(v)} of the damage it deals` },
  burn: { name: 'Burning', stat: 'burn', base: 0.1, text: (v) => `blows set the foe alight (${pct(v)} of attack a second)` },
  thorns: { name: 'Thorned', stat: 'thorns', base: 0.12, text: (v) => `melee attackers take ${pct(v)} of the blow back` },
  shield: { name: 'Warded', stat: 'shield', base: 0.12, text: (v) => `starts the fight with a ${pct(v)} hp shield` },
  guard: { name: 'Stalwart', stat: 'guard', base: 0.04, text: (v) => `takes ${pct(v)} less damage` },
};
/** An affix is a little stronger at the higher rarities (index 0 is unused). */
const AFFIX_SCALE: readonly number[] = [1, 1, 1, 1, 1.25, 1.5];
const pct = (v: number) => `${Math.round(v * 100)}%`;

export interface EquipBase {
  id: string;
  name: string;
  slot: EquipSlot;
  /** The icon file (`src/art/equip/<icon>.png`). */
  icon: string;
  /** The calling it suits (a bonus on a hero of that calling); none suits all alike. */
  calling?: Calling;
  /** Main stats at Common, item level 1. */
  main: Partial<Record<'hp' | 'atk' | 'def' | 'atkSpeed' | 'moveSpeed' | 'crit' | 'range', number>>;
  /** The affixes an Epic or better piece of it can carry. */
  affixes: readonly AffixId[];
  text: string;
}

export const EQUIP_BASES: Readonly<Record<string, EquipBase>> = Object.fromEntries(
  (
    [
      { id: 'ironSword', name: 'Iron Sword', slot: 'weapon', icon: 'sword', main: { atk: 0.07 }, affixes: ['lifesteal', 'thorns'], text: 'A plain, honest blade.' },
      { id: 'runedBlade', name: 'Runed Blade', slot: 'weapon', icon: 'blade', calling: 'melee', main: { atk: 0.08, crit: 0.02 }, affixes: ['lifesteal', 'burn'], text: 'Etched runes glow in a fight.' },
      { id: 'dragonboneAxe', name: 'Dragonbone Axe', slot: 'weapon', icon: 'axe', calling: 'melee', main: { atk: 0.11, atkSpeed: 0.02 }, affixes: ['burn', 'thorns', 'lifesteal'], text: 'Carved from a dragon\'s rib.' },
      { id: 'huntersBow', name: "Hunter's Bow", slot: 'weapon', icon: 'bow', calling: 'shooter', main: { atk: 0.06, range: 1, atkSpeed: 0.03 }, affixes: ['burn', 'lifesteal'], text: 'Light, true and long.' },
      { id: 'oakStaff', name: 'Oak Staff', slot: 'weapon', icon: 'staff', calling: 'caster', main: { atk: 0.08, atkSpeed: 0.03 }, affixes: ['shield', 'burn'], text: 'A gnarled staff humming with spells.' },
      { id: 'stormStaff', name: 'Stormcaller Staff', slot: 'weapon', icon: 'wand', calling: 'caster', main: { atk: 0.1, crit: 0.03 }, affixes: ['burn', 'lifesteal'], text: 'Its tip crackles with lightning.' },
      { id: 'leatherJerkin', name: 'Leather Jerkin', slot: 'armour', icon: 'jerkin', main: { hp: 0.06, moveSpeed: 0.03 }, affixes: ['guard', 'shield'], text: 'Light armour that lets you run.' },
      { id: 'chainMail', name: 'Chain Mail', slot: 'armour', icon: 'mail', main: { hp: 0.08, def: 0.6 }, affixes: ['guard', 'thorns'], text: 'Rings of steel.' },
      { id: 'plateCuirass', name: 'Plate Cuirass', slot: 'armour', icon: 'plate', calling: 'melee', main: { hp: 0.11, def: 1 }, affixes: ['guard', 'thorns', 'shield'], text: 'Heavy, and worth every ounce.' },
      { id: 'mageRobe', name: 'Mage Robe', slot: 'armour', icon: 'robe', calling: 'caster', main: { hp: 0.05, atk: 0.05 }, affixes: ['shield', 'guard'], text: 'Woven with a ward.' },
      { id: 'rangerCloak', name: "Ranger's Cloak", slot: 'armour', icon: 'cloak', calling: 'shooter', main: { hp: 0.05, moveSpeed: 0.05, crit: 0.02 }, affixes: ['guard', 'shield'], text: 'Green and grey, hard to hit.' },
      { id: 'luckyCharm', name: 'Lucky Charm', slot: 'trinket', icon: 'charm', main: { crit: 0.04 }, affixes: ['lifesteal', 'burn'], text: 'Rubbed smooth by many thumbs.' },
      { id: 'ironRing', name: 'Iron Ring', slot: 'trinket', icon: 'ring', main: { def: 0.6, hp: 0.03 }, affixes: ['guard', 'thorns'], text: 'Cold and heavy on the finger.' },
      { id: 'swiftBoots', name: 'Boots of Haste', slot: 'trinket', icon: 'boots', main: { moveSpeed: 0.06, atkSpeed: 0.03 }, affixes: ['shield', 'guard'], text: 'You hardly touch the ground.' },
      { id: 'phoenixFeather', name: 'Phoenix Feather', slot: 'trinket', icon: 'feather', main: { hp: 0.06, atk: 0.04 }, affixes: ['shield', 'burn', 'lifesteal'], text: 'Warm to the touch, even now.' },
    ] as EquipBase[]
  ).map((b) => [b.id, b]),
);
export const EQUIP_BASE_IDS = Object.keys(EQUIP_BASES);

export interface Equipment {
  /** Stable for the life of the save; never reused. */
  id: number;
  base: string;
  rarity: Rarity;
  /** 1 to `MAX_ITEM_LEVEL`. */
  level: number;
  /** The affixes it carries (Epic and Legendary one, Mythic two). */
  affixes: AffixId[];
}
export type NewEquipment = Omit<Equipment, 'id'>;

/** The calling of a hero kind: shooters (arrows, bullets), casters (the other shots), else melee. */
export function callingOf(kind: string): Calling {
  const shot = UNITS[kind]?.shot;
  if (!shot) return 'melee';
  return shot === 'arrow' || shot === 'bullet' || shot === 'bone' ? 'shooter' : 'caster';
}

export const affixCount = (rarity: number): number => (rarity >= 5 ? 2 : rarity >= 3 ? 1 : 0);

/** The numbers one item gives a hero of `kind` (a `kind` makes the calling bonus count). */
export function itemStats(it: NewEquipment | Equipment, kind?: string): EquipStats {
  const base = EQUIP_BASES[it.base];
  const out = emptyStats();
  if (!base) return out;
  const k = RARITY_SCALE[it.rarity] * (1 + LEVEL_STEP * (it.level - 1)) * (kind && base.calling && base.calling === callingOf(kind) ? CALLING_BONUS : 1);
  for (const [stat, v] of Object.entries(base.main) as [keyof EquipBase['main'], number][]) out[stat] = stat === 'range' ? Math.floor((v * (it.rarity + 1)) / 3) : v * k;
  for (const a of it.affixes) if (AFFIXES[a]) out[AFFIXES[a].stat] += AFFIXES[a].base * AFFIX_SCALE[it.rarity];
  return out;
}

function addStats(a: EquipStats, b: EquipStats): EquipStats {
  for (const k of STAT_KEYS) a[k] += b[k];
  return a;
}

/** The item a kind wears in a slot (undefined when the slot is empty). */
export function wornIn(m: Meta, kind: string, slot: EquipSlot): Equipment | undefined {
  const id = m.equipped?.[kind]?.[slot];
  return id === undefined ? undefined : m.equipment?.find((x) => x.id === id);
}

/** What a hero kind's equipment adds in a fight; undefined when it wears nothing (so the fight is exactly as before). */
export function equipStats(m: Meta, kind: string): EquipStats | undefined {
  let any = false;
  const total = emptyStats();
  for (const slot of EQUIP_SLOTS) {
    const it = wornIn(m, kind, slot);
    if (!it) continue;
    any = true;
    addStats(total, itemStats(it, kind));
  }
  return any ? total : undefined;
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
  const made: Equipment = { id, base: item.base, rarity: item.rarity, level: item.level, affixes: [...item.affixes] };
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

/** Turn a spare item into crowns. Returns the crowns (0, and nothing changes, when it is worn or not owned). */
export function salvageItem(m: Meta, id: number): number {
  const i = spareEquipment(m).findIndex((x) => x.id === id);
  if (i < 0) return 0;
  const it = spareEquipment(m)[i];
  m.equipment = m.equipment!.filter((x) => x.id !== id);
  const n = SALVAGE_CROWNS[it.rarity] + (it.level - 1);
  m.crowns += n;
  return n;
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
  const pool = [...base.affixes];
  const affixes: AffixId[] = [];
  for (let n = affixCount(rarity); n > 0 && pool.length; n--) affixes.push(pool.splice(rng.int(0, pool.length - 1), 1)[0]);
  return { base: base.id, rarity, level, affixes };
}

export const itemName = (it: NewEquipment | Equipment): string => EQUIP_BASES[it.base]?.name ?? 'Unknown';

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
    lifesteal: ['Lifesteal', (v) => pct(v)],
    burn: ['Burn', (v) => pct(v)],
    thorns: ['Thorns', (v) => pct(v)],
    shield: ['Shield', (v) => pct(v)],
    guard: ['Guard', (v) => pct(v)],
  };
  return STAT_KEYS.filter((k) => s[k] > 0).map((key) => ({ key, label: label[key][0], value: s[key], text: label[key][1](s[key]) }));
}

/** A few items for the screenshots and tests: one of each slot at a spread of rarities. Adds them to the inventory and returns them. */
export function grantSampleEquipment(m: Meta): Equipment[] {
  const picks: NewEquipment[] = [
    { base: 'ironSword', rarity: 1, level: 1, affixes: [] },
    { base: 'runedBlade', rarity: 3, level: 4, affixes: ['lifesteal'] },
    { base: 'dragonboneAxe', rarity: 5, level: 9, affixes: ['burn', 'thorns'] },
    { base: 'huntersBow', rarity: 2, level: 3, affixes: [] },
    { base: 'leatherJerkin', rarity: 2, level: 2, affixes: [] },
    { base: 'plateCuirass', rarity: 4, level: 7, affixes: ['guard'] },
    { base: 'luckyCharm', rarity: 1, level: 1, affixes: [] },
    { base: 'phoenixFeather', rarity: 4, level: 6, affixes: ['shield'] },
  ];
  return picks.map((p) => grantEquipment(m, p));
}

/** Saved equipment that is sane: known bases, rarity 1 to 5, a level in range, known affixes, unique ids. Anything else is dropped. */
export function readEquipment(raw: unknown): Equipment[] {
  const out: Equipment[] = [];
  const seen = new Set<number>();
  if (Array.isArray(raw))
    for (const x of raw as Partial<Equipment>[]) {
      if (!x || typeof x.id !== 'number' || !Number.isInteger(x.id) || x.id < 1 || seen.has(x.id) || typeof x.base !== 'string' || !EQUIP_BASES[x.base]) continue;
      const rarity = Math.min(5, Math.max(1, Math.floor(Number(x.rarity)) || 1)) as Rarity;
      const level = Math.min(MAX_ITEM_LEVEL, Math.max(1, Math.floor(Number(x.level)) || 1));
      const affixes = (Array.isArray(x.affixes) ? x.affixes : []).filter((a): a is AffixId => typeof a === 'string' && a in AFFIXES).slice(0, 2);
      seen.add(x.id);
      out.push({ id: x.id, base: x.base, rarity, level, affixes });
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
