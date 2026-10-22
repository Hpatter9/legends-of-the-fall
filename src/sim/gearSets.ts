// Gear sets: the permanent equipment's bases grouped into twelve themed sets of two or three pieces (a weapon, armour and
// trinket). A hero kind wearing two pieces of a set gets the set's small bonus, and three its strong one (which keeps the
// two's), as the tower's relic sets do (`relicSets.ts`). A bonus is plain stat numbers, folded into the kind's equipment
// stats like any piece's, and from the three-piece tier often one of the signature abilities (`equipBases.ts`, run by
// `equipFx.ts`). Only the bases count, whatever their grade. Pure rules: no Pixi, no DOM, no randomness.

import { ABILITIES, EQUIP_BASES, type Ability, type EquipSlot, type Main } from './equipBases';

export interface SetTier {
  /** What it gives, in a line for the page. */
  text: string;
  /** Stat numbers, as for an item's main stats (shares are 0.06 for +6%; `def` and `range` are flat). Not scaled by grade or level. */
  stats?: Main;
  /** A signature ability it switches on, and how strong (the same scale as a piece's: 0.45 at Epic to 0.7 at Mythic). */
  ability?: { id: string; s: number };
}

export interface GearSet {
  id: string;
  name: string;
  /** The frame colour of its bar on the panel. */
  colour: string;
  /** The bases in it (two or three, at most one for a slot). */
  pieces: readonly string[];
  two: SetTier;
  /** Only a set of three pieces has this tier. */
  three?: SetTier;
}

export const GEAR_SETS: readonly GearSet[] = [
  { id: 'ember', name: 'Emberforged', colour: '#e8683a', pieces: ['dragonboneAxe', 'emberRobe', 'emberAmulet'],
    two: { text: '+5% attack', stats: { atk: 0.05 } }, three: { text: '+4% attack, and blows set foes alight', stats: { atk: 0.04 }, ability: { id: 'dragonfire', s: 0.55 } } },
  { id: 'frost', name: 'Winter Court', colour: '#6fc3f0', pieces: ['frostbrand', 'silkenRobe', 'sapphireRing'],
    two: { text: '+8% skill charge', stats: { charge: 0.08 } }, three: { text: '+3% crit chance, and a crit freezes the foe', stats: { crit: 0.03 }, ability: { id: 'deepFreeze', s: 0.7 } } },
  { id: 'storm', name: 'Stormcaller', colour: '#b58cff', pieces: ['stormStaff', 'mageRobe', 'scryingOrb'],
    two: { text: '+10% skill charge', stats: { charge: 0.1 } }, three: { text: '+5% attack, and every 4th blow chains lightning', stats: { atk: 0.05 }, ability: { id: 'chainLightning', s: 0.55 } } },
  { id: 'hunter', name: "Hunter's Kit", colour: '#6fc16a', pieces: ['huntersBow', 'rangerCloak', 'seerSpectacles'],
    two: { text: '+4% crit chance', stats: { crit: 0.04 } }, three: { text: 'Reach +1, and bleeding shots', stats: { range: 1 }, ability: { id: 'pinpoint', s: 0.7 } } },
  { id: 'vanguard', name: 'Vanguard', colour: '#c8c8d8', pieces: ['spikedMace', 'plateCuirass', 'stoneIdol'],
    two: { text: '+1 defence, +4% hp', stats: { def: 1, hp: 0.04 } }, three: { text: '+6% hp, and foes struck may be taunted', stats: { hp: 0.06 }, ability: { id: 'idolsGaze', s: 0.7 } } },
  { id: 'shadow', name: 'Nightblade', colour: '#8a6ac8', pieces: ['vampireFang', 'shadowcloak', 'relicShard'],
    two: { text: '+4% dodge', stats: { dodge: 0.04 } }, three: { text: '+4% attack speed, and blows heal', stats: { atkSpeed: 0.04 }, ability: { id: 'vampiricBite', s: 0.55 } } },
  { id: 'samurai', name: 'Shogun', colour: '#d84a4a', pieces: ['katana', 'lamellar', 'warDrum'],
    two: { text: '+4% attack, +3% hp', stats: { atk: 0.04, hp: 0.03 } }, three: { text: '+3% crit chance, and a crit makes the foe bleed', stats: { crit: 0.03 }, ability: { id: 'iaijutsu', s: 0.7 } } },
  { id: 'radiant', name: 'Radiant Order', colour: '#ffd86a', pieces: ['runedBlade', 'sunforgedAegis', 'healerLyre'],
    two: { text: 'Mends 0.3% hp a second', stats: { regen: 0.003 } }, three: { text: '+5% hp, and an aura mends allies beside it', stats: { hp: 0.05 }, ability: { id: 'sunlightAura', s: 0.7 } } },
  { id: 'grave', name: 'Gravewalker', colour: '#9cb89c', pieces: ['reapersScythe', 'boneArmour', 'rubyRing'],
    two: { text: '+4% attack, +4% resist', stats: { atk: 0.04, resist: 0.04 } }, three: { text: '+4% hp, and a kill heals', stats: { hp: 0.04 }, ability: { id: 'soulReaper', s: 0.7 } } },
  { id: 'wyrm', name: 'Wyrmblood', colour: '#e8a63a', pieces: ['ashenSpear', 'dragonscaleMail', 'phoenixFeather'],
    two: { text: '+5% hp, +4% resist', stats: { hp: 0.05, resist: 0.04 } }, three: { text: '+4% attack, and the attackers burn', stats: { atk: 0.04 }, ability: { id: 'dragonsWrath', s: 0.55 } } },
  { id: 'wind', name: 'Windrunner', colour: '#8adbd0', pieces: ['leatherJerkin', 'bootsOfHaste'],
    two: { text: '+6% move speed, +3% attack speed', stats: { moveSpeed: 0.06, atkSpeed: 0.03 } } },
  { id: 'arcane', name: 'Scholar of Ash', colour: '#6a8ae8', pieces: ['grimoire', 'sageVestments', 'scholarScroll'],
    two: { text: '+8% skill charge, +4% resist', stats: { charge: 0.08, resist: 0.04 } }, three: { text: '+5% skill charge, and the mind gathers charge', stats: { charge: 0.05 }, ability: { id: 'meditation', s: 0.7 } } },
];

export const SET_BY_ID: Readonly<Record<string, GearSet>> = Object.fromEntries(GEAR_SETS.map((s) => [s.id, s]));
/** The set a base belongs to, if any (a base is in at most one set). */
export const SET_OF_BASE: Readonly<Record<string, GearSet>> = Object.fromEntries(GEAR_SETS.flatMap((s) => s.pieces.map((p) => [p, s] as const)));

/** The slot of each piece of a set, in the order of `pieces`. */
export const slotsOf = (set: GearSet): EquipSlot[] => set.pieces.map((p) => EQUIP_BASES[p].slot);

/** How many pieces of each set these bases make (only sets with at least one). */
export function setCounts(bases: readonly string[]): Map<GearSet, number> {
  const out = new Map<GearSet, number>();
  for (const b of new Set(bases)) {
    const s = SET_OF_BASE[b];
    if (s) out.set(s, (out.get(s) ?? 0) + 1);
  }
  return out;
}

/** The tiers a count of pieces switches on (the two, and the three with it). */
export function activeTiers(set: GearSet, count: number): SetTier[] {
  return [...(count >= 2 ? [set.two] : []), ...(count >= 3 && set.three ? [set.three] : [])];
}

export interface SetBonus {
  stats: Main;
  abilities: { id: string; name: string; s: number }[];
  /** The sets that give something, with how many pieces are worn. */
  active: { set: GearSet; count: number }[];
}

/** What wearing these bases gives: the stats and abilities of every set tier switched on. */
export function setBonus(bases: readonly string[]): SetBonus {
  const out: SetBonus = { stats: {}, abilities: [], active: [] };
  for (const [set, count] of setCounts(bases)) {
    const tiers = activeTiers(set, count);
    if (!tiers.length) continue;
    out.active.push({ set, count });
    for (const t of tiers) {
      for (const [k, v] of Object.entries(t.stats ?? {}) as [keyof Main, number][]) out.stats[k] = (out.stats[k] ?? 0) + v;
      if (t.ability) out.abilities.push({ id: t.ability.id, name: (ABILITIES[t.ability.id] as Ability).name, s: t.ability.s });
    }
  }
  return out;
}
