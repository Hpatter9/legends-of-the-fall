// Awakening materials (AWAKEN-MATS): each class trait (`traitsOf(kind)[1]`) has a rift ore of its own, in its aura's colour
// (`render/auraStyles.ts`), and awakening a hero asks for ores of its class on top of the shards (`AWAKEN_ORES`, read by
// `awaken.ts`). Ores come from where they are found: each army drops its own two or three kinds (its boss waves and first
// clears, more on a harder tier), each Calamity map its own kinds (its boss and mini-bosses, the richest source), and a
// Calamity cleared whole pays a Rift Cache the player opens on any hero's awakening panel for that hero's class. Small
// trickles: a first Mythic clear pays a Rift Cache, a Last Stand record past each tenth wave a couple of ores, and now and
// then a gold or Mythic chest holds a few of its army's.
//
// Kept in `Meta.ores` (class trait -> count) and `Meta.caches` (Rift Caches waiting), both optional. Pure rules: no Pixi, no
// DOM; every draw comes from a side stream of its own seed, so no existing fight, chest or reward rolls differently.
// The tables and their reasons are in `docs/notes/awaken-mats.md`.

import type { Meta } from './meta';
import { mixSeed, Rng } from './rng';
import { traitsOf } from './traits';

export interface Ore {
  /** The class trait it awakens. */
  trait: string;
  name: string;
  /** One wry line for the panel and the pouch. */
  line: string;
  /** The class's aura colour (`auraStyles.ts`), which the icon is tinted to. */
  colour: number;
  /** The icon's file in `src/art/ui/ore/` (a pack icon tinted to the colour). */
  icon: string;
}

const o = (trait: string, name: string, colour: number, line: string): Ore => ({ trait, name, colour, line, icon: `ore-${trait}.png` });

/** Every class's ore. */
export const ORES: Readonly<Record<string, Ore>> = {
  guardian: o('guardian', 'Oathgold', 0xffd24a, 'Melted down from promises kept. There is not a great deal of it.'),
  bulwark: o('bulwark', 'Bastion Bronze', 0xf0b860, 'Scraped off a wall that refused to fall. The wall is still sulking.'),
  blade: o('blade', 'Whetblood Ore', 0xe0304a, 'Sharpens anything it touches, including tempers.'),
  marksman: o('marksman', 'Windglass', 0xdbe8f4, 'Splinters of a gust that never missed. Handle by the edges.'),
  gunner: o('gunner', 'Saltpetre Cake', 0xf2d35a, 'Smells of burnt eyebrows. Keep away from candles, and from Siege Bot.'),
  caster: o('caster', 'Hexquartz', 0xb06cff, 'Hums in a key that wizards find soothing and cats do not.'),
  arcanist: o('arcanist', 'Starseed', 0x7a86ff, 'Pebbles of night sky. Each one remembers a different tomorrow.'),
  support: o('support', 'Hearthsalt', 0xfff0b8, 'Warm to the touch, and tastes faintly of soup.'),
  beast: o('beast', 'Fang Amber', 0xff6a2a, 'Something with teeth is asleep inside. Do not knock.'),
  assassin: o('assassin', 'Nightglass', 0x6a46a8, 'Hard to find, harder to see, and someone has always just pocketed it.'),
  trickster: o('trickster', 'Moonmilk Pearls', 0xc6d2ff, 'Count them twice; the answer will differ.'),
  warden: o('warden', 'Mossjade', 0x6cd060, 'Grows back if you chip it, which the jewellers find rude.'),
  vanguard: o('vanguard', 'Charge Cinders', 0xffa040, 'Still warm from the last time someone ran at a wall.'),
};
export const ORE_TRAITS: readonly string[] = Object.keys(ORES);

/** The ore a hero kind's awakening asks for (its class trait's), or undefined for a kind without a class. */
export const oreOf = (kind: string): Ore | undefined => ORES[traitsOf(kind)[1] ?? ''];

/** Ores of its class each awakening step asks for (I, II), besides the shards `AWAKEN_COSTS` uses. */
export const AWAKEN_ORES: readonly number[] = [10, 20];

/** A drop of ores of one class. */
export interface OreDrop { trait: string; n: number }

/* ------------------------------------------------------------------ where each kind is found */

/** The ore kinds each army drops: two or three that fit its troops, and between them all thirteen. */
export const ARMY_ORES: Readonly<Record<string, readonly string[]>> = {
  orcs: ['blade', 'vanguard', 'marksman'],
  undead: ['arcanist', 'assassin'],
  beasts: ['beast', 'marksman'],
  wildwood: ['warden', 'support', 'trickster'],
  labyrinth: ['beast', 'bulwark', 'trickster'],
  ogres: ['guardian', 'blade', 'support'],
  infernal: ['caster', 'assassin', 'vanguard'],
  yokai: ['trickster', 'arcanist', 'caster'],
  golems: ['gunner', 'bulwark', 'guardian'],
};

/** The ore kinds each Calamity map's boss and mini-bosses drop (maps 1 to 6, by their bosses), between them all thirteen. */
export const REALM_ORES: readonly (readonly string[])[] = [
  ['blade', 'vanguard'], // Gorvak the Ashen, an orc warlord
  ['warden', 'beast', 'marksman'], // the Thorn Warden of the grove
  ['caster', 'support'], // Malphas, who calls the hordes and mends
  ['guardian', 'bulwark'], // Hrungar, the Wall That Walks
  ['assassin', 'gunner'], // Vorgrath the Hellbringer: poison, and the last flame
  ['trickster', 'arcanist'], // Karnok the Calamity, the end of all roads
];
/** The kinds of a Calamity map (1-based; past the last, the last's). */
export const realmOres = (map: number): readonly string[] => REALM_ORES[Math.max(0, Math.min(REALM_ORES.length - 1, map - 1))];

/** One kind of a list, drawn from a side stream. */
const draw = (seed: number, kinds: readonly string[]): string => kinds[new Rng(seed).int(0, kinds.length - 1)];

/* ------------------------------------------------------------------ the Calamity (the richest) */

/** Ores a calamity's map boss pays when it falls (maps 1 to 6): 18 for a whole run at ascension 0. */
export const BOSS_ORES: readonly number[] = [2, 2, 3, 3, 4, 4];
/** Ores a calamity's mini-boss (a detour's too) pays. */
export const ELITE_ORES = 2;
/** Ores a Rift Cache gives when opened, all of the class of the hero whose panel it is opened on. A calamity clear pays one. */
export const CACHE_ORES = 8;
/** Every ore a calamity pays grows by this share for each ascension level (as its crowns grow by a fifth). */
export const ORE_ASC = 0.1;
/** The count `n` at an ascension level (never less than `n`). */
export const ascOres = (n: number, level: number): number => Math.max(n, Math.round(n * (1 + ORE_ASC * Math.max(0, level))));
/** The ores a Rift Cache gives at an ascension level (a cache is opened at level 0's size, `CACHE_ORES`; this is for the notes). */
export const cacheOres = (level: number): number => ascOres(CACHE_ORES, level);

/** The ores a calamity's map boss pays: one of the map's kinds, from the run's side stream. */
export function bossOres(seed: number, map: number, level: number): OreDrop {
  return { trait: draw(mixSeed(seed, 0x0e5b, map), realmOres(map)), n: ascOres(BOSS_ORES[Math.max(0, Math.min(BOSS_ORES.length - 1, map - 1))], level) };
}

/** The ores a calamity's mini-boss pays: one of its map's kinds (`floor` tells the run's mini-bosses apart). */
export function eliteOres(seed: number, map: number, floor: number, level: number): OreDrop {
  return { trait: draw(mixSeed(seed, 0x0e5e, map, floor), realmOres(map)), n: ascOres(ELITE_ORES, level) };
}

/* ------------------------------------------------------------------ the armies (slower: the Calamity stays the richest) */

/** The chance a won boss wave drops an ore, by tier (Normal to Mythic): a mid boss, and the army's last. */
export const MID_CHANCE: readonly number[] = [0.01, 0.015, 0.02, 0.025, 0.03];
export const FINAL_CHANCE: readonly number[] = [0.025, 0.035, 0.045, 0.055, 0.065];
/** Ores such a drop holds, by tier. */
export const BOSS_DROP: readonly number[] = [1, 1, 1, 2, 2];
/** Ores a tier's first clear pays (Normal to Legendary); a first Mythic clear pays a Rift Cache instead. */
export const FIRST_CLEAR_ORES: readonly number[] = [2, 3, 4, 6];
export const MYTHIC_TIER = 4;

/** What an army's fight paid in ores, and a Rift Cache for a first Mythic clear. */
export interface ArmyOres { drops: OreDrop[]; cache: number }

/**
 * The ores a won army wave pays (none for a loss or a field wave): its boss now and then (the army's last more often than a mid
 * boss, and more often on a harder tier), and the tier's first clear always. Drawn from side streams of the run's seed.
 */
export function armyOres(army: string, waveBoss: 'mid' | 'final' | undefined, tier: number, won: boolean, firstClear: boolean, seed: number, wave: number): ArmyOres {
  const kinds = ARMY_ORES[army];
  const out: ArmyOres = { drops: [], cache: 0 };
  if (!won || !kinds || !waveBoss) return out;
  const t = Math.max(0, Math.min(MYTHIC_TIER, tier | 0));
  const rng = new Rng(mixSeed(seed, 0x0e5a, wave, t));
  const chance = (waveBoss === 'final' ? FINAL_CHANCE : MID_CHANCE)[t];
  if (rng.chance(chance)) out.drops.push({ trait: kinds[rng.int(0, kinds.length - 1)], n: BOSS_DROP[t] });
  if (firstClear && waveBoss === 'final') {
    if (t === MYTHIC_TIER) out.cache = 1;
    else out.drops.push({ trait: kinds[rng.int(0, kinds.length - 1)], n: FIRST_CLEAR_ORES[t] });
  }
  return out;
}

/* ------------------------------------------------------------------ the trickles: chests and the Last Stand */

/** The chance a gold (10-star) or Mythic (11-star) chest holds a few of its army's ores, and how many. Other chests hold none. */
export const CHEST_ORES: Readonly<Record<string, { chance: number; n: number }>> = { gold: { chance: 0.25, n: 2 }, mythic: { chance: 0.5, n: 3 } };

/** The ores a chest holds (none for most), from a side stream of its seed: of its army's kinds, any kind for a chest of no army. */
export function chestOres(seed: number, kind: string, army: string): OreDrop | null {
  const c = CHEST_ORES[kind];
  if (!c) return null;
  const rng = new Rng(mixSeed(seed, 0x0e5c));
  if (!rng.chance(c.chance)) return null;
  const kinds = ARMY_ORES[army] ?? ORE_TRAITS;
  return { trait: kinds[rng.int(0, kinds.length - 1)], n: c.n };
}

/** A Last Stand record pays these ores for each tenth wave it passes for the first time (any kind: the Stand fights every army). */
export const STAND_ORES = 2;
export const STAND_EVERY = 10;
/** The ores a Last Stand run pays: for each tenth wave its best passes that the save's best had not. */
export function standOres(seed: number, prevBest: number, best: number): OreDrop[] {
  const out: OreDrop[] = [];
  for (let w = (Math.floor(Math.max(0, prevBest) / STAND_EVERY) + 1) * STAND_EVERY; w <= best; w += STAND_EVERY) out.push({ trait: draw(mixSeed(seed, 0x0e5d, w), ORE_TRAITS), n: STAND_ORES });
  return out;
}

/* ------------------------------------------------------------------ the meta: held ores, caches */

/** The ores a save holds of a class. */
export const oresOf = (m: Pick<Meta, 'ores'>, trait: string): number => m.ores?.[trait] ?? 0;
/** The Rift Caches a save holds. */
export const cachesOf = (m: Pick<Meta, 'caches'>): number => m.caches ?? 0;

/** Add drops of ores to a save. */
export function grantOres(m: Pick<Meta, 'ores'>, drops: readonly OreDrop[]): void {
  for (const d of drops) if (ORES[d.trait] && d.n > 0) (m.ores ??= {})[d.trait] = oresOf(m, d.trait) + d.n;
}

/** Drops of the same kind added together, in the order of `ORE_TRAITS` (for the result screens). */
export function sumOres(drops: readonly OreDrop[]): OreDrop[] {
  const n: Record<string, number> = {};
  for (const d of drops) n[d.trait] = (n[d.trait] ?? 0) + d.n;
  return ORE_TRAITS.filter((t) => n[t]).map((t) => ({ trait: t, n: n[t] }));
}

/** Open a Rift Cache on a hero kind's panel: `CACHE_ORES` of its class. Returns the drop, or null when there is no cache or no class. */
export function openCache(m: Pick<Meta, 'ores' | 'caches'>, kind: string): OreDrop | null {
  const ore = oreOf(kind);
  if (!ore || cachesOf(m) < 1) return null;
  m.caches = cachesOf(m) - 1;
  const drop = { trait: ore.trait, n: CACHE_ORES };
  grantOres(m, [drop]);
  return drop;
}

/** Saved ores that are sane: a class trait and a whole count above none. Anything else is dropped; undefined when none are left. */
export function readOres(raw: unknown): Record<string, number> | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const out: Record<string, number> = {};
  for (const [t, n] of Object.entries(raw as Record<string, unknown>)) if (ORES[t] && typeof n === 'number' && n >= 1) out[t] = Math.floor(n);
  return Object.keys(out).length ? out : undefined;
}

/** The most Rift Caches a save from before the ores is paid back, one for each Calamity it had cleared. */
export const BACK_PAY_CACHES = 5;
/** Saved caches: a whole count, or, for a save from before the ores (none saved yet), one for each Calamity it cleared, up to five. */
export function readCaches(raw: unknown, calamityClears: number): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) return Math.max(0, Math.floor(raw));
  return Math.max(0, Math.min(BACK_PAY_CACHES, Math.floor(calamityClears || 0)));
}

/** Pay a won army wave's ores into a save (`armyOres`): the drops, and a first Mythic clear's Rift Cache. Returns what it paid. */
export function settleArmyOres(m: Pick<Meta, 'ores' | 'caches'>, army: string, waveBoss: 'mid' | 'final' | undefined, tier: number, won: boolean, firstClear: boolean, seed: number, wave: number): ArmyOres {
  const r = armyOres(army, waveBoss, tier, won, firstClear, seed, wave);
  grantOres(m, r.drops);
  if (r.cache) m.caches = cachesOf(m) + r.cache;
  return r;
}
