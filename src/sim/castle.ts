// The king's castle: lasting upgrades bought with crowns between runs. Each building has a few levels with rising
// costs; a level's effect is added on top of the one before. A run takes a snapshot of the levels when it starts
// (`newRun`), so the fights of that run keep the same castle. Pure rules: no Pixi, no DOM, no randomness.

import type { Boost } from './battle';

export type BuildingId = 'treasury' | 'barracks' | 'armoury' | 'mageTower' | 'stable' | 'library';

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
  barracks: { id: 'barracks', name: 'Barracks', perLevel: '+6% hp for every hero', costs: [60, 120, 200, 320, 520, 850, 1400] },
  armoury: { id: 'armoury', name: 'Armoury', perLevel: '+5% attack for every hero; repairs 4% cheaper', costs: [60, 120, 200, 320, 520, 850, 1400] },
  stable: { id: 'stable', name: 'Stable', perLevel: '+4% move speed for every hero', costs: [60, 120, 200, 320, 520] },
  library: { id: 'library', name: 'Library', perLevel: '+6% XP from every fight; study goes faster, and more heroes can study at once', costs: [60, 120, 200, 320, 520] },
  mageTower: { id: 'mageTower', name: 'Mage Tower', perLevel: 'the king\'s mana fills 12% faster and three new spells are taught (and +1 spell power at levels 2 and 4)', costs: [80, 160, 280, 450] },
};
export const BUILDING_IDS: BuildingId[] = ['treasury', 'barracks', 'armoury', 'mageTower', 'stable', 'library'];

/** The level of each building (0 = not built). The three room buildings and the Chapel's level (DEPTH-BUILD) are optional, so a castle
 *  written before them (in a save, a run or a tool) still reads; missing is 0 (the Chapel's level also reads `Meta.chapel`). */
export type Castle = Record<BuildingId, number> & Partial<Record<RoomBuildingId | 'chapel', number>>;

/* -------------------------------------------------------------- the room buildings (DEPTH-BUILD, docs/notes/depth-build.md) */

/** The three buildings that add no number of their own, only rooms (`rooms.ts`): the Smithy, the Watchtower and the Hall of Legends. */
export type RoomBuildingId = 'smithy' | 'watchtower' | 'hall';
export const ROOM_BUILDING_IDS: RoomBuildingId[] = ['smithy', 'watchtower', 'hall'];
export const ROOM_BUILDINGS: Record<RoomBuildingId, { id: RoomBuildingId; name: string; blurb: string; costs: readonly number[] }> = {
  smithy: { id: 'smithy', name: 'Smithy', blurb: 'A forge for the road: mending at the camp, patched gear, one hero whose gear never wears.', costs: [150, 400, 900] },
  watchtower: { id: 'watchtower', name: 'Watchtower', blurb: 'Scouts and lookouts: opens march orders before a run, and in time the roads an army takes.', costs: [120, 350, 800] },
  hall: { id: 'hall', name: 'Hall of Legends', blurb: 'Where retired heroes stand and teach: one mentor seat a level, one for each calling.', costs: [600, 1200, 2000, 3000] },
};
/** The Chapel's levels: level 1 is the old one purchase (`CHAPEL_COST`), then Vigil and Last Rites. */
export const CHAPEL_COSTS: readonly number[] = [200, 450, 1000];

/** Anything the builders can raise a level of. */
export type SiteId = BuildingId | RoomBuildingId | 'chapel';
export const isRoomBuilding = (id: string): id is RoomBuildingId => (ROOM_BUILDING_IDS as string[]).includes(id);
/** The costs of every level of a site. */
export const siteCosts = (id: SiteId): readonly number[] => (id === 'chapel' ? CHAPEL_COSTS : isRoomBuilding(id) ? ROOM_BUILDINGS[id].costs : BUILDINGS[id].costs);
export const siteName = (id: SiteId): string => (id === 'chapel' ? 'Chapel' : isRoomBuilding(id) ? ROOM_BUILDINGS[id].name : BUILDINGS[id].name);
export const siteTop = (id: SiteId): number => siteCosts(id).length;
/** A site's level in a castle (the Chapel's also from the old flag, when the caller passes it). */
export const siteLevel = (c: Castle, id: SiteId, chapelFlag = false): number => (id === 'chapel' ? Math.max(c.chapel ?? 0, chapelFlag ? 1 : 0) : (c[id] ?? 0));
/** The crowns a site's next level costs, or null at the top. */
export const siteNextCost = (c: Castle, id: SiteId, chapelFlag = false): number | null => siteCosts(id)[siteLevel(c, id, chapelFlag)] ?? null;

export const GOLD_PER_LEVEL = 10;
export const HP_PER_LEVEL = 0.06;
export const ATK_PER_LEVEL = 0.05;
export const MANA_PER_LEVEL = 0.12;
export const MOVE_PER_LEVEL = 0.04;
export const XP_PER_LEVEL = 0.06;

export const newCastle = (): Castle => ({ treasury: 0, barracks: 0, armoury: 0, mageTower: 0, stable: 0, library: 0 });

export const maxLevel = (id: SiteId) => siteCosts(id).length;
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

/* -------------------------------------------------------------- building takes time */

/** What the builders are raising: a building's next level (or the Chapel's, or a room building's), and when it stands. One at a time. */
export type BuildSite = SiteId;
export interface Works {
  id: BuildSite;
  /** The level it reaches when done (1 for the Chapel). */
  level: number;
  /** When it stands, in the page's clock (ms since 1970: the page passes `Date.now()`, so these rules stay pure). */
  doneAt: number;
}
/** How long a level takes, by the level being built (the owner's ask: higher tiers take longer): 1 min, 5 min, 20 min, 1 hour, 3 hours, then 8 hours and 1 day for the
 *  Barracks' and Armoury's sixth and seventh levels (the late armies' lift). */
export const BUILD_MS: readonly number[] = [60_000, 5 * 60_000, 20 * 60_000, 60 * 60_000, 3 * 60 * 60_000, 8 * 60 * 60_000, 24 * 60 * 60_000];
/** The Chapel takes as long as a second level. */
export const CHAPEL_MS = BUILD_MS[1];
/** (The Chapel's levels take one step longer than a building's: its first is `CHAPEL_MS`, as before; a room building's take the usual table.) */
export const buildMs = (id: BuildSite, level: number): number => (id === 'chapel' ? BUILD_MS[Math.min(BUILD_MS.length - 1, Math.max(1, level))] : BUILD_MS[Math.min(BUILD_MS.length, Math.max(1, level)) - 1]);

/** The slice of the Meta the builders read and change. */
export interface WorksMeta extends ChapelMeta {
  castle: Castle;
  works?: Works;
}

/** Pay for a building's next level and set the builders to it. False (and nothing changed) at the top level, when too poor, or while the builders are busy. */
export function startBuild(m: WorksMeta, id: BuildingId, now: number): boolean {
  const cost = nextCost(m.castle, id);
  if (m.works || cost === null || m.crowns < cost) return false;
  m.crowns -= cost;
  const level = m.castle[id] + 1;
  m.works = { id, level, doneAt: now + buildMs(id, level) };
  return true;
}

/** Pay for the next level of any site (a building, a room building or the Chapel) and set the builders to it. False (and nothing changed) at the top,
 *  when too poor or while the builders are busy. */
export function startSite(m: WorksMeta, id: SiteId, now: number): boolean {
  if (id === 'chapel') return startChapel(m, now);
  if (!isRoomBuilding(id)) return startBuild(m, id, now);
  const cost = siteNextCost(m.castle, id);
  if (m.works || cost === null || m.crowns < cost) return false;
  m.crowns -= cost;
  const level = siteLevel(m.castle, id) + 1;
  m.works = { id, level, doneAt: now + buildMs(id, level) };
  return true;
}

/** Pay for the Chapel and set the builders to it. False when it stands, is being built, the crowns are short, or the builders are busy. */
export function startChapel(m: WorksMeta, now: number): boolean {
  if (m.works) return false;
  // (its first level is the old purchase; levels 2 and 3 open the Vigil and Last Rites, DEPTH-BUILD)
  const level = chapelLevel(m) + 1;
  const cost = CHAPEL_COSTS[level - 1];
  if (cost === undefined || m.crowns < cost) return false;
  m.crowns -= cost;
  m.works = { id: 'chapel', level, doneAt: now + buildMs('chapel', level) };
  return true;
}

/** Finish the works if their time is up: the level (or the Chapel) is raised. Returns what was finished, or null. */
export function settleWorks(m: WorksMeta, now: number): BuildSite | null {
  const w = m.works;
  if (!w || now < w.doneAt) return null;
  if (w.id === 'chapel') {
    m.chapel = true;
    m.castle.chapel = Math.max(chapelLevel(m), Math.min(CHAPEL_COSTS.length, w.level));
  } else if (isRoomBuilding(w.id)) m.castle[w.id] = Math.max(m.castle[w.id] ?? 0, Math.min(siteTop(w.id), w.level));
  else m.castle[w.id] = Math.max(m.castle[w.id], Math.min(maxLevel(w.id), w.level));
  delete m.works;
  return w.id;
}

/** Milliseconds until the works stand (0 when there are none, or they are due). */
export const worksLeft = (m: Pick<WorksMeta, 'works'>, now: number): number => (m.works ? Math.max(0, m.works.doneAt - now) : 0);

/** A time left for the page: "45s", "4:05", "1:02:09". */
export function clockText(ms: number): string {
  const s = Math.ceil(ms / 1000);
  if (s < 60) return `${s}s`;
  const h = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(mm).padStart(2, '0')}:${ss}` : `${mm}:${ss}`;
}

/** Works read from a save: undefined unless sane (a known site, a level it can reach, a finite time). */
export function readWorks(raw: unknown): Works | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const w = raw as Partial<Works>;
  const id = w.id as BuildSite;
  const okId = id === 'chapel' || isRoomBuilding(id) || BUILDING_IDS.includes(id as BuildingId);
  const level = Math.floor(Number(w.level));
  const doneAt = Number(w.doneAt);
  if (!okId || !Number.isFinite(doneAt) || !(level >= 1) || level > siteTop(id)) return undefined;
  return { id, level, doneAt };
}

/** The castle read from a saved value: missing, odd or too-high levels become 0 or the top. */
export function readCastle(raw: unknown): Castle {
  const c = newCastle();
  if (raw && typeof raw === 'object')
    for (const id of BUILDING_IDS) {
      const n = Math.floor(Number((raw as Record<string, unknown>)[id]));
      c[id] = Number.isFinite(n) ? Math.max(0, Math.min(maxLevel(id), n)) : 0;
    }
  // (the room buildings and the Chapel's level: kept only when built, so a castle from before reads exactly as it did)
  if (raw && typeof raw === 'object')
    for (const id of [...ROOM_BUILDING_IDS, 'chapel'] as const) {
      const n = Math.floor(Number((raw as Record<string, unknown>)[id]));
      if (Number.isFinite(n) && n > 0) c[id] = Math.min(siteTop(id), n);
    }
  return c;
}

/** Gold a run starts with on top of the usual. */
export const bonusGold = (c: Castle = newCastle()) => GOLD_PER_LEVEL * c.treasury;
/** The boost every hero fights with (hp and attack multipliers). */
export const heroBoost = (c: Castle = newCastle()): Boost => ({ hp: 1 + HP_PER_LEVEL * c.barracks, atk: 1 + ATK_PER_LEVEL * c.armoury });
/**
 * The castle's hp and attack are the one lasting power that gets into the spire and the Calamity (they start every hero at level 1, with nothing worn and no
 * talents), so their foes answer it: they are multiplied by the castle's own boost to the power `share`. At 1 a built castle changes nothing there but the
 * mana, the stable and the spell budget; below 1 it still helps (`docs/notes/difficulty.md`).
 */
export const CASTLE_ANSWER = { share: 1.2 };
export function foeAnswer(c: Castle = newCastle()): Boost {
  const h = heroBoost(c);
  return { hp: h.hp! ** CASTLE_ANSWER.share, atk: h.atk! ** CASTLE_ANSWER.share };
}
/** How much faster than usual the king's mana fills. */
export const manaRate = (c: Castle = newCastle()) => 1 + MANA_PER_LEVEL * c.mageTower;

/** How much faster than usual every hero walks (the Stable): its steps take this much less time; it does not speed up swings or skills. */
export const moveRate = (c: Castle = newCastle()) => 1 + MOVE_PER_LEVEL * c.stable;
/** How much more XP every hero earns from a fight (the Library). */
export const xpRate = (c: Castle = newCastle()) => 1 + XP_PER_LEVEL * c.library;

/** The power the three equipped spells may add up to: 9, and the Mage Tower adds 1 at level 2 and again at level 4. */
export const SPELL_BUDGET = 9;
export const spellBudget = (c: Castle = newCastle()) => SPELL_BUDGET + Math.floor(c.mageTower / 2);

/** The Chapel (the owner's call: the Tavern is free, the Chapel is bought): one purchase of this many crowns, no levels. Until it is built the spellbook is locked. */
export const CHAPEL_COST = 200;

/** The slice of the Meta the Chapel rules read and change (`chapel` missing is not built). */
export interface ChapelMeta {
  crowns: number;
  chapel?: boolean;
  castle?: Castle;
}

export const chapelBuilt = (m: Pick<ChapelMeta, 'chapel'>): boolean => m.chapel === true;
export const canBuildChapel = (m: ChapelMeta): boolean => !chapelBuilt(m) && m.crowns >= CHAPEL_COST;
/** The Chapel's level (DEPTH-BUILD): the castle's own when set, else 1 when the old flag says it stands. */
export const chapelLevel = (m: { chapel?: boolean; castle?: Castle }): number => Math.max(m.castle?.chapel ?? 0, m.chapel === true ? 1 : 0);

/** Pay for the Chapel. False (and nothing changed) when it stands already or the crowns are short. */
export function buildChapel(m: ChapelMeta): boolean {
  if (!canBuildChapel(m)) return false;
  m.crowns -= CHAPEL_COST;
  m.chapel = true;
  if (m.castle) m.castle.chapel = Math.max(1, m.castle.chapel ?? 0);
  return true;
}

/** The spellbook (changing the loadout, unlocking spells) opens only once the Chapel stands. The starting spells still work in fights either way. */
export const spellsOpen = (m: Pick<ChapelMeta, 'chapel'>): boolean => chapelBuilt(m);

/** Whether a save counts the Chapel as built: its own flag when it has one, else (saves from before it was bought) yes when the player already owns a spell beyond
 *  the starting ones, changed the equipped spells, or bought any castle upgrade, so nobody loses what they had. */
export function readChapel(raw: unknown, castle: Castle, spellbook: { owned: readonly string[]; equipped: readonly string[] }, starters: readonly string[]): boolean {
  if (typeof raw === 'boolean') return raw;
  const same = spellbook.equipped.length === starters.length && starters.every((id) => spellbook.equipped.includes(id));
  return BUILDING_IDS.some((id) => castle[id] > 0) || spellbook.owned.some((id) => !starters.includes(id)) || !same;
}
