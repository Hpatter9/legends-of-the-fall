// The king's castle: lasting upgrades bought with crowns between runs. Each building has a few levels with rising
// costs; a level's effect is added on top of the one before. A run takes a snapshot of the levels when it starts
// (`newRun`), so the fights of that run keep the same castle. Pure rules: no Pixi, no DOM, no randomness.

import type { Boost } from './battle';

export type BuildingId = 'treasury' | 'barracks' | 'armoury' | 'mageTower';

export interface Building {
  id: BuildingId;
  name: string;
  /** What one level gives, in plain words. */
  perLevel: string;
  /** The crowns each level costs, in order (so its length is the top level). */
  costs: readonly number[];
}

export const BUILDINGS: Record<BuildingId, Building> = {
  treasury: { id: 'treasury', name: 'Treasury', perLevel: '+10 starting gold', costs: [50, 100, 180, 300, 500] },
  barracks: { id: 'barracks', name: 'Barracks', perLevel: '+6% hp for every hero', costs: [60, 120, 200, 320, 520] },
  armoury: { id: 'armoury', name: 'Armoury', perLevel: '+5% attack for every hero', costs: [60, 120, 200, 320, 520] },
  mageTower: { id: 'mageTower', name: 'Mage Tower', perLevel: 'the king\'s mana fills 12% faster', costs: [80, 160, 280, 450] },
};
export const BUILDING_IDS: BuildingId[] = ['treasury', 'barracks', 'armoury', 'mageTower'];

/** The level of each building (0 = not built). */
export type Castle = Record<BuildingId, number>;

export const GOLD_PER_LEVEL = 10;
export const HP_PER_LEVEL = 0.06;
export const ATK_PER_LEVEL = 0.05;
export const MANA_PER_LEVEL = 0.12;

export const newCastle = (): Castle => ({ treasury: 0, barracks: 0, armoury: 0, mageTower: 0 });

export const maxLevel = (id: BuildingId) => BUILDINGS[id].costs.length;
/** The crowns the next level costs, or null at the top. */
export const nextCost = (c: Castle, id: BuildingId): number | null => BUILDINGS[id].costs[c[id]] ?? null;

/** Pay for the next level of a building. False (and nothing changed) at the top level or when too poor. */
export function upgrade(m: { crowns: number; castle: Castle }, id: BuildingId): boolean {
  const cost = nextCost(m.castle, id);
  if (cost === null || m.crowns < cost) return false;
  m.crowns -= cost;
  m.castle[id]++;
  return true;
}

/** The castle read from a saved value: missing, odd or too-high levels become 0 or the top. */
export function readCastle(raw: unknown): Castle {
  const c = newCastle();
  if (raw && typeof raw === 'object')
    for (const id of BUILDING_IDS) {
      const n = Math.floor(Number((raw as Record<string, unknown>)[id]));
      c[id] = Number.isFinite(n) ? Math.max(0, Math.min(maxLevel(id), n)) : 0;
    }
  return c;
}

/** Gold a run starts with on top of the usual. */
export const bonusGold = (c: Castle = newCastle()) => GOLD_PER_LEVEL * c.treasury;
/** The boost every hero fights with (hp and attack multipliers). */
export const heroBoost = (c: Castle = newCastle()): Boost => ({ hp: 1 + HP_PER_LEVEL * c.barracks, atk: 1 + ATK_PER_LEVEL * c.armoury });
/** How much faster than usual the king's mana fills. */
export const manaRate = (c: Castle = newCastle()) => 1 + MANA_PER_LEVEL * c.mageTower;
