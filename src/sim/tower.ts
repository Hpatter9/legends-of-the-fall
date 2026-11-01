// The endless tower as a roguelike, Slay the Spire style. A run climbs acts of `ACT_ROWS` floors, the last a boss; each act
// is a map of branching paths (`makeMap`, drawn from the run's seed on its own side stream), and the player picks a node
// from those joined to the one just cleared. Fights, elites and the boss are battles (a band and a strength fixed when the
// node is entered, so a saved run replays the same fight); campfires, shops, treasure and mystery floors are settled here
// without one. The party's hp carries over (`health.ts`), so the heals matter. The run's floors are its stages: `run.stage`
// is the floor about to be climbed, and keeps counting through the acts. A lost fight ends the run; `settleTower` then pays
// the run's chests and equipment into the meta, by the floors cleared. Pure rules: no Pixi, no DOM, no clock.

import { destinationBoard, destinationWorld, expeditionOf, growExpeditionStarter, sanctuaryMap, type RiftWorld } from './sanctuary';
import { growStarter, pendingAltar, RIFT_BOSSES } from './rift';
import { CORRUPT } from './altarRules';
import type { RunRecap } from './runRecap';
import type { Battle, Boost, Stage } from './battle';
import { CLASSIC_AREAS } from './board';
import { spireArea } from './lands';
import { armyById, armyIndex, armyUnlocked, ARMIES } from './armies';
import { BOSS_BANDS, FIELD_BANDS, FOE_BANDS } from './foes';
import { grantEquipment, itemName, rollEquipment } from './equipment';
import { dropGear, gearText, type Gear } from './gear';
import { FALLEN, healParty } from './health';
import { drawEvent, TOWER_EVENT_KINDS } from './events';
import type { Meta } from './meta';
import { drawOffer, eliteAt, eliteFight, OFFER_SIZE, sideEliteAt } from './elites';
import { neighboursOf, openSet, routeBetween, SIDE_BASE, sideSpots, START_ID, type SideSpot } from './calLand';
import { ALL_RELIC_IDS, pickRelic, pricedFor, relicPriceOf, RELICS, relicText, theRelic, relicEffects } from './relics';
import { mixSeed, Rng } from './rng';
import { addTwists, CHAOS_TWISTS, TWISTS } from './twists';
import { BOSS, canJoin, FOE_START, ownHeroes, relicCtx, reward, spendBuff, squadLimit, summonCost, type Run } from './run';
import { UNITS } from './units';
import { CAL_BOARD, CAL_MAPS, CAL_OPENING, CAL_SCALE, calBossBoost, fitBand, squadFoeMult } from './calamity';
import { calBossBand } from './calamityBosses';
import { ascChests, ascCrowns, ascOf, ascRules, ascCleared } from './ascension';
import { CALAMITY_XP, CLIMB_XP, calXpShare, fightXpByHero, gainRunXp, heroLevel, hireable, hireHero, ownsKind, promoteByLevel, type Promotion } from './climb';
import { xpRate } from './castle';
import { payClear, type ClearReward } from './calReward';
import { bossOres, eliteOres, grantOres, ORES, sumOres, type OreDrop } from './awakenMats';
import { noteGuardians } from './traders';
import { xpFor } from './levels';

/** Floors in an act: the path floors, then the boss on the last. */
export const ACT_ROWS = 13;
/** Lanes a map is drawn across. */
export const LANES = 5;
/** Paths walked up from the first floor to make a map. */
export const PATHS = 4;
/** Foes' hp and attack grow by this share of their first-floor strength for each floor climbed, the acts running on (0.17 until MERGE-TWO: two to merge made a long climb's heroes stronger, `docs/notes/merge-two.md`). */
export const TOWER_GROWTH = 0.19;
/** An elite's foes are this much stronger than a plain fight's, and its leader is a mini-boss. */
export const ELITE_MULT = 1.22;
/** An elite pays this much more than a fight. */
export const ELITE_GOLD = 2;
export const ELITE_LEADER: Boost = { size: 1.3, hp: 1.7, atk: 1.2 };
/** What the party heals after every won fight, and at a campfire's rest. */
export const WIN_HEAL = 0.1;
export const REST_HEAL = 0.45;
/** What a boss kill heals. */
export const BOSS_HEAL = 0.5;
/** The healing draught and the elixir of the shop. */
export const DRAUGHT_HEAL = 0.4;

export type NodeKind = 'fight' | 'elite' | 'campfire' | 'shop' | 'treasure' | 'mystery' | 'boss' | 'recruit';
export const NODE_NAMES: Record<NodeKind, string> = { fight: 'Fight', elite: 'Elite', campfire: 'Campfire', shop: 'Shop', treasure: 'Treasure', mystery: 'Mystery', boss: 'Boss', recruit: 'Recruit' };

export interface MapNode {
  id: number;
  row: number;
  lane: number;
  kind: NodeKind;
  /** The ids of the nodes one row up that this one leads to. */
  next: number[];
  /** The twist a fight, elite or boss node carries (`twists.ts`); none when absent (and in a map from an older save). */
  twist?: string;
}

/** A battle's band and strength, fixed when its node is entered. */
export interface FightSpec {
  band: string[];
  stage: Stage;
  /** The named elite this fight is against (`elites.ts`), when it is an elite's. */
  elite?: string;
  /** The floor's twist, by id (its effects are in `stage.twist`). */
  twist?: string;
  /** A mimic's fight (from a mystery floor): its win pays a great chest. */
  mimic?: boolean;
}

export interface ShopItem {
  kind: 'relic' | 'gear' | 'heal' | 'elixir' | 'hero';
  label: string;
  text: string;
  cost: number;
  /** The relic's id or the hero's kind. */
  ref?: string;
  gear?: Gear;
  sold?: boolean;
}

/** A hero offered at a recruit spot (a calamity's): a particular kind. The spot's offer is free, and the party takes one of the three. */
export interface Hire {
  kind: string;
  cost: number;
  hired?: boolean;
}

export interface Treasure {
  gold: number;
  relic?: string;
  gear?: Gear;
  opened?: boolean;
}

/** The node being played: its fight, its stock, its chest or its campfire. */
export interface Current {
  world?: RiftWorld;
  id: number;
  kind: NodeKind;
  fight?: FightSpec;
  shop?: ShopItem[];
  chest?: Treasure;
  /** The heroes a recruit node offers. */
  hires?: Hire[];
  /** What the campfire did (rested or trained), once it has. */
  camp?: string;
  /** A mystery floor's choice has turned into a mimic's fight, made when the card closes (`finishMystery`). */
  mimic?: boolean;
  /** A mystery's event title, kept for the map's recap (the card is gone by the time the spot is cleared). */
  eventTitle?: string;
  /** A hidden side spot of a calamity's map (`calLand.ts`): clearing it leaves the party where it stood, on the same floor. */
  side?: boolean;
}

export interface TowerSummary {
  /** Floors cleared. */
  floors: number;
  act: number;
  /** Crowns the run paid on its way (the fights'). */
  crowns: number;
  bronze: number;
  silver: number;
  gold: number;
  /** The equipment dropped, by name. */
  gear: string[];
  relics: number;
  heroes: number;
  newBest: boolean;
  /** A calamity's: the maps cleared, and whether it was cleared whole. */
  maps?: number;
  cleared?: boolean;
  /** The ascension level it was played at (none for 0). */
  ascension?: number;
  /** The player started over rather than fell. */
  abandoned?: boolean;
  /** A calamity cleared whole: what the finish paid (`calReward.ts`). */
  clear?: ClearReward;
  /** A calamity's map recaps, one a map cleared. */
  recaps?: MapRecap[];
  /** A calamity's rift ores (`awakenMats.ts`), the same kinds added together; paid on a loss too. */
  ores?: OreDrop[];
}

/** What a calamity's map paid and showed, for the recap when it is cleared: the spots, the gold, the finds and the events met. */
export interface MapRecap {
  /** The legacy realm used for the region artwork. */
  realm?: number;
  /** The map's number (1 to 6). */
  map: number;
  /** Spots cleared on it (the lair apart), and how many it has. */
  spots: number;
  total: number;
  /** Fights won, and mini-bosses (the detours' too). */
  fights: number;
  elites: number;
  /** Gold the map's fights, chests and events paid. */
  gold: number;
  /** Relics found (by id), gear found (by name), heroes who joined (by name) and the events met (their titles). */
  relics: string[];
  gear: string[];
  heroes: string[];
  events: string[];
  /** The rift ores its boss and mini-bosses dropped (`awakenMats.ts`; none on a recap from before them). */
  ores?: OreDrop[];
  /** The map's share of the run's recap (WAVE-RECAP-2): each hero's damage, healing and kills, XP and levels, and its fights one by one (`closeMapLeg`; none on a recap from before). */
  detail?: RunRecap;
}

export interface TowerState {
  act: number;
  map: MapNode[];
  /** The node cleared last (-1 before the first of an act). */
  at: number;
  /** The row the next node is picked in. */
  row: number;
  cur?: Current;
  /** Each hero's share of its hp, by roster id (whole when absent; `health.ts`). */
  hp: Record<string, number>;
  /** The armies unlocked when the run began: later acts draw their foes from them. */
  armies: string[];
  /** The nodes taken on this act's map, in order. */
  path: number[];
  /** The hidden side spots taken or skipped on this act's map (by id, `calLand.ts`); a calamity's. */
  sideDone?: number[];
  /** Where a calamity's party stands, any spot of the map (a side spot's id, the portal -1); `at` when not set. */
  here?: number;
  /** The shops a calamity's map has opened, by node id, with what is left in them: a shop stays open to visit again. */
  shops?: Record<string, ShopItem[]>;
  /** The spots the calamity has cleared in all, over its maps (the summary's count). */
  spots?: number;
  /** A calamity's spot the party is walking to (saved when the walk begins, so a game closed mid-walk reopens with the leader there and the spot not yet entered; cleared when it is entered). */
  going?: number;
  /** What the calamity's map in play has paid so far, and the recaps of the maps already cleared (`MapRecap`). */
  recap?: MapRecap;
  recaps?: MapRecap[];
  /** The rift ores a calamity's bosses and mini-bosses have dropped so far (`awakenMats.ts`): paid into the meta when the run ends, a loss too. */
  ores?: OreDrop[];
  /** The run's recap as it stood when the calamity's map in play began (`closeMapLeg`; none for the first map, or a save from before). */
  recapAt?: RunRecap;
  /** The map just cleared, whose recap the page shows once (and then clears). */
  mapDone?: MapRecap;
  /** The relics an elite offers, until one is taken (`takeRelic` in `elites.ts`). */
  offer?: string[];
  /** The elite that paid the offer (for the card's words). */
  lastElite?: string;
  /** The boss that fell last (for the meta's list of bosses beaten). */
  lastBoss?: string;
  /** Crowns the fights have paid so far, and act bosses felled. */
  crowns: number;
  bosses: number;
  /** XP a mystery floor has taught, by hero kind, waiting for the page to add it to the meta (`takeXp`). */
  xp?: Record<string, number>;
  /** Floors in each map, by act (`ACT_ROWS` for the tower, and for a map not listed). A calamity's maps are shorter. */
  rows?: number[];
  /** A finite climb (a calamity): the number of maps; the last boss's fall clears the run. The endless tower has none. */
  maps?: number;
  /** Foes' strength on a floor: `start` x (1 + `growth` x (floor - 1)); the tower's own when absent. */
  scale?: { start: number; growth: number; step?: number };
  /** The player ended the run by starting over (it was not lost). */
  abandoned?: boolean;
  /** What the last fight taught the run's heroes (a run that levels its own heroes; the result screen shows it). */
  gains?: { id: number; kind: string; xp: number; from: number; to: number }[];
  /** The heroes a Calamity's last fight (or fire) moved up a tier (`promoteByLevel`): the page gives each the same promotion moment as a merge. Cleared by the next fight's result. */
  promoted?: Promotion[];
  /** The tower record when the run began. */
  prevBest: number;
  summary?: TowerSummary;
}

/* ------------------------------------------------------------------ the map */

/** The floors in an act's map (a calamity's maps are shorter, and may differ). */
export const rowsIn = (t: Pick<TowerState, 'rows'> | undefined, act: number): number => t?.rows?.[act - 1] ?? t?.rows?.[t.rows.length - 1] ?? ACT_ROWS;
/** The floor (the run's stage) of a row of an act. */
export function floorOf(act: number, row: number, t?: Pick<TowerState, 'rows'>): number {
  let before = 0;
  for (let a = 1; a < act; a++) before += rowsIn(t, a);
  return before + row + 1;
}
/** The act a floor is in, and its row there. */
export const actOf = (floor: number): number => Math.floor((floor - 1) / ACT_ROWS) + 1;
export const rowOf = (floor: number): number => (floor - 1) % ACT_ROWS;

const SPECIAL: readonly NodeKind[] = ['elite', 'campfire', 'shop'];
const KIND_WEIGHTS: Record<string, number> = { fight: 44, mystery: 22, elite: 13, shop: 9, campfire: 12 };
/** The row of the one sure chest, and the row of the sure campfire before the boss. */
const TREASURE_ROW = 5;

/** An act's map, from the seed: `PATHS` paths walked up through `LANES` lanes (no two ever cross twice), every one ending at the boss. `rows` is its floors (a calamity's maps have fewer). */
export function makeMap(seed: number, act: number, twists = true, rows = ACT_ROWS, chestRow = TREASURE_ROW, twoStarts = false, attempt = 0): MapNode[] {
  return buildMap(seed, act, twists, rows, chestRow, twoStarts, attempt);
}

function buildMap(seed: number, act: number, twists: boolean, rows: number, chestRow: number, twoStarts: boolean, attempt: number): MapNode[] {
  const rng = new Rng(attempt ? mixSeed(seed, 0x70ad, act, attempt) : mixSeed(seed, 0x70ad, act));
  const last = rows - 1;
  const treasureRow = Math.min(chestRow, last - 2);
  const grid = new Map<number, Set<number>>();
  const key = (row: number, lane: number) => row * LANES + lane;
  const mid = Math.floor(LANES / 2);
  const link = (row: number, lane: number, to: number) => {
    if (!grid.has(key(row, lane))) grid.set(key(row, lane), new Set());
    grid.get(key(row, lane))!.add(to);
    if (!grid.has(key(row + 1, to))) grid.set(key(row + 1, to), new Set());
  };
  // (the starts: two different lanes at least, then any)
  const lanes = Array.from({ length: LANES }, (_, i) => i);
  const starts = [rng.pick(lanes)];
  starts.push(rng.pick(lanes.filter((l) => l !== starts[0])));
  // (a calamity's map starts at one spot or two, the owner's "a starting spot and one to go to": the other paths set out from those two)
  for (let i = 2; i < (twoStarts ? PATHS + 2 : PATHS); i++) starts.push(twoStarts ? rng.pick(starts.slice(0, 2)) : rng.pick(lanes));
  for (const start of starts) {
    let lane = start;
    if (!grid.has(key(0, lane))) grid.set(key(0, lane), new Set());
    for (let row = 0; row < last - 1; row++) {
      const options = [lane - 1, lane, lane + 1].filter((l) => l >= 0 && l < LANES);
      // (a step that would cross a path already walked is passed over when another will do)
      const crosses = (to: number) => [...grid.entries()].some(([k, set]) => Math.floor(k / LANES) === row && [...set].some((b) => (lane < k % LANES && to > b) || (lane > k % LANES && to < b)));
      const clean = options.filter((l) => !crosses(l));
      const to = rng.pick(clean.length ? clean : options);
      link(row, lane, to);
      lane = to;
    }
    // (every path ends at the boss)
    link(last - 1, lane, mid);
  }
  grid.set(key(last, mid), new Set());
  const cells = [...grid.keys()].sort((a, b) => a - b);
  const idOf = new Map(cells.map((k, i) => [k, i]));
  const nodes: MapNode[] = cells.map((k, i) => ({ id: i, row: Math.floor(k / LANES), lane: k % LANES, kind: 'fight', next: [...grid.get(k)!].map((to) => idOf.get(key(Math.floor(k / LANES) + 1, to))!).sort((a, b) => a - b) }));
  // (kinds: the first floor fights, the one before the boss is a campfire, one floor is treasure; the rest by weight, a special never twice running)
  const parents = (n: MapNode) => nodes.filter((p) => p.next.includes(n.id));
  for (const n of nodes) {
    if (n.row === 0) n.kind = 'fight';
    else if (n.row === last) n.kind = 'boss';
    else if (n.row === last - 1) n.kind = 'campfire';
    else if (n.row === treasureRow) n.kind = 'treasure';
    else {
      const w = { ...KIND_WEIGHTS };
      if (n.row < 3) delete w.elite;
      if (n.row < 2) delete w.shop;
      if (n.row < 3) delete w.campfire;
      for (const p of parents(n)) if (SPECIAL.includes(p.kind)) delete w[p.kind];
      n.kind = rng.weighted(w) as NodeKind;
    }
  }
  // (every map has a shop and an elite to be found)
  for (const want of ['shop', 'elite'] as const) {
    if (nodes.some((n) => n.kind === want)) continue;
    const spots = nodes.filter((n) => n.kind === 'fight' && n.row >= 3 && n.row < last - 2);
    if (spots.length) rng.pick(spots).kind = want;
  }
  // (the twists come last, from their own stream: the kinds and links above are as they always were)
  if (twists) addTwists(nodes, seed, act);
  return nodes;
}

/** A tower's first state: the first act's map, a whole party, the armies the run may draw foes from. */
export function newTower(seed: number, armies: readonly string[], prevBest = 0): TowerState {
  return { act: 1, map: makeMap(seed, 1), at: -1, row: 0, hp: {}, armies: [...armies], path: [], crowns: 0, bosses: 0, prevBest };
}

/** The twists a high ascension puts on boss floors. */
const CURSES: readonly string[] = ['narrow', 'cursed', 'ambush', 'fortified'];

/** What the middle floors of a calamity map are, by weight. */
const CAL_WEIGHTS: Record<string, number> = { fight: 50, mystery: 14, elite: 9, shop: 11, treasure: 12 };

/**
 * A calamity's map: the usual links over fewer floors, with its own kinds. The first floor fights, the second fights or is a
 * mystery, the third is a recruit camp (every node of it, so every path passes one; on the longer maps about half of the
 * floor before the rest are camps too), the floors between are mostly fights with some elites, shops, chests and mysteries,
 * the floor before the boss is a campfire. Every map has a shop and a chest. Its own side stream; the twists come last.
 */
export function calamityMap(seed: number, act: number, rows: number, asc = 0): MapNode[] {
  // (a map that sets out from two spots can come out narrow, with no floor to hold a mini-boss that can be skipped: the draw is repeated, on its own salts, until it has one, and a shop and a chest)
  for (let attempt = 0; ; attempt++) {
    const nodes = calamityOnce(seed, act, rows, asc, attempt);
    // (no floor wider than four spots: the land has room for four across)
    const narrow = nodes.every((n) => nodes.filter((m) => m.row === n.row).length <= 4);
    const ok = narrow && nodes.some((n) => n.kind === 'elite' && nodes.filter((m) => m.row === n.row).length >= 2) && nodes.some((n) => n.kind === 'shop') && nodes.some((n) => n.kind === 'treasure');
    if (attempt >= 80 || ok) return nodes;
  }
}

/** Make every path of a map pass one node of `row`: the other nodes of it are folded into one (its parents lead to it, and it leads on to all of theirs), and the ids are closed up. */
function oneAt(nodes: MapNode[], row: number, rng: Rng): MapNode[] {
  const here = nodes.filter((n) => n.row === row);
  if (here.length < 2) return nodes;
  const keep = rng.pick(here);
  const drop = new Set(here.filter((n) => n !== keep).map((n) => n.id));
  const next = new Set(keep.next);
  for (const d of drop) for (const to of nodes[d].next) next.add(to);
  keep.next = [...next];
  for (const n of nodes) if (n.row === row - 1) n.next = [...new Set(n.next.map((id) => (drop.has(id) ? keep.id : id)))];
  const left = nodes.filter((n) => !drop.has(n.id));
  const idOf = new Map(left.map((n, i) => [n.id, i]));
  for (const n of left) {
    n.id = idOf.get(n.id)!;
    n.next = n.next.map((id) => idOf.get(id)!).sort((x, y) => x - y);
  }
  return left;
}

function calamityOnce(seed: number, act: number, rows: number, asc: number, attempt: number): MapNode[] {
  const rules = ascRules(asc);
  const last = rows - 1;
  // (one campfire and one recruit spot a map, as in King God Castle's roguelike: every path passes the campfire before the boss and the recruit camp on the third floor, each one spot. Their own stream, so the other kinds draw as they did)
  const one = new Rng(attempt ? mixSeed(seed, 0xca1b, act, attempt) : mixSeed(seed, 0xca1b, act));
  let nodes = makeMap(seed, act, false, rows, undefined, true, attempt);
  nodes = oneAt(oneAt(nodes, last - 1, one), 2, one);
  const rng = new Rng(attempt ? mixSeed(seed, 0xca1a, act, attempt) : mixSeed(seed, 0xca1a, act));
  const parents = (n: MapNode) => nodes.filter((p) => p.next.includes(n.id));
  for (const n of nodes) {
    if (n.row === 0) n.kind = 'fight';
    else if (n.row === last) n.kind = 'boss';
    else if (n.row === last - 1) n.kind = 'campfire';
    else if (n.row === 1) n.kind = rng.chance(0.7) ? 'fight' : 'mystery';
    else if (n.row === 2) n.kind = 'recruit';
    else {
      const w: Record<string, number> = { ...CAL_WEIGHTS, elite: CAL_WEIGHTS.elite * rules.elites };
      for (const p of parents(n)) if (SPECIAL.includes(p.kind)) delete w[p.kind];
      n.kind = rng.weighted(w) as NodeKind;
    }
  }
  // (a shop and a chest on every map, among the floors between)
  const between = nodes.filter((n) => n.row > 2 && n.row < last - 1 && n.kind !== 'recruit');
  for (const want of ['shop', 'treasure'] as const) {
    if (nodes.some((n) => n.kind === want)) continue;
    const spare = between.filter((n) => n.kind === 'fight' || n.kind === 'mystery');
    const any = between.filter((n) => n.kind !== 'shop' && n.kind !== 'treasure');
    const spots = spare.length > 1 || (spare.length && want === 'shop') ? spare : any.length > 1 || (any.length && want === 'shop') ? any : nodes.filter((n) => n.row === 1);
    if (spots.length) rng.pick(spots).kind = want;
  }
  // (the mini-boss: an elite on a floor with other ways round it, so it can be skipped; its win pays a relic to choose, gear and double gold)
  const optional = between.filter((n) => (n.kind === 'fight' || n.kind === 'mystery') && nodes.filter((m) => m.row === n.row).length >= 2);
  const elites = nodes.filter((n) => n.kind === 'elite' && nodes.filter((m) => m.row === n.row).length >= 2);
  if (!elites.length) {
    // (no plain node to make one of: a spare shop or chest on a floor with company will do)
    const spare = (n: MapNode) => (n.kind !== 'shop' && n.kind !== 'treasure') || nodes.filter((m) => m.kind === n.kind).length > 1;
    const company = (n: MapNode) => nodes.filter((m) => m.row === n.row).length >= 2;
    const late = between.filter((n) => company(n) && spare(n));
    const pool = optional.length ? optional : late.length ? late : nodes.filter((n) => n.row === 1 && company(n));
    if (pool.length) rng.pick(pool).kind = 'elite';
  }
  addTwists(nodes, seed, act);
  if (rules.chaosMutators) {
    const chaosRng = new Rng(mixSeed(seed, 0xc4a0, act));
    for (const n of nodes) {
      if ((n.kind === 'elite' || n.kind === 'fight') && !n.twist && chaosRng.chance(0.35)) {
        n.twist = chaosRng.pick(CHAOS_TWISTS);
      }
    }
  }
  // (a high ascension curses every boss floor: a twist from the curses, its own stream)
  if (rules.bossCurse) for (const n of nodes) if (n.kind === 'boss') n.twist = new Rng(mixSeed(seed, 0xa5c8, act)).pick(CURSES);
  return nodes;
}

/** The map of an act of this run: the tower's, or a calamity's (shorter, with recruit camps). */
export function mapFor(run: Run, act: number): MapNode[] {
  if (!expeditionOf(run)) return run.tower?.maps ? calamityMap(run.seed, act, rowsIn(run.tower, act), ascOf(run)) : makeMap(run.seed, act, true, rowsIn(run.tower, act));
  const nodes = sanctuaryMap(run.seed, act, rowsIn(run.tower!, act));
  const rules = ascRules(ascOf(run));
  if (rules.elites > 1) for (const n of nodes) if (n.row > 1 && n.kind === 'fight') n.kind = 'elite';
  addTwists(nodes, run.seed, act);
  if (rules.chaosMutators) {
    const rng = new Rng(mixSeed(run.seed, 0xc4a0, act));
    for (const n of nodes) if ((n.kind === 'fight' || n.kind === 'elite') && !n.twist && rng.chance(0.35)) n.twist = rng.pick(CHAOS_TWISTS);
  }
  if (rules.bossCurse) for (const n of nodes) if (n.kind === 'boss') n.twist = new Rng(mixSeed(run.seed, 0xa5c8, act)).pick(CURSES);
  return nodes;
}

/** The nodes the player may pick next: those the last one leads to (the whole first floor at the start of an act). Empty while a node is in play. */
export function choices(run: Run): MapNode[] {
  const t = run.tower;
  if (!t || t.cur || run.over) return [];
  if (expeditionOf(run)) return t.map.filter(n => n.row === t.row);
  // (a calamity's map is walked freely: any spot a bridge leads to from a cleared one, in either direction, and not cleared yet)
  if (t.maps) {
    const sides = sideSpots(run.seed, t.act, t.map);
    const out = new Set<number>();
    for (const id of openSet(t)) for (const to of neighboursOf(t.map, sides, id)) if (to >= 0 && to < SIDE_BASE && !t.path.includes(to)) out.add(to);
    return [...out].sort((a, b) => a - b).map((id) => t.map[id]);
  }
  if (t.at < 0) return t.map.filter((n) => n.row === t.row);
  return t.map[t.at].next.map((id) => t.map[id]);
}

/** The spot a calamity's party stands at: where it last cleared or walked to, the node in play, or the portal. */
export const hereOf = (t: Pick<TowerState, 'here' | 'at' | 'cur'>): number => t.cur?.id ?? t.here ?? t.at;

/** How many of a calamity map's spots (the boss's lair apart) the party has cleared, and how many there are. */
export function mapProgress(t: Pick<TowerState, 'map' | 'path'>): { done: number; total: number } {
  const spots = t.map.filter((n) => n.kind !== 'boss');
  return { done: spots.filter((n) => t.path.includes(n.id)).length, total: spots.length };
}

/** The floor a spot of a calamity's map counts as, for the foes' strength, the pay and the shops: its row, running on through the maps; a hidden spot is one floor past the node it hangs from. */
export function spotFloor(run: Run, id: number): number {
  const t = run.tower!;
  if (id >= SIDE_BASE) {
    const from = sideSpots(run.seed, t.act, t.map).find((s) => s.id === id)?.from;
    return floorOf(t.act, (from !== undefined ? t.map[from].row : t.row) + 1, t);
  }
  return floorOf(t.act, t.map[id]?.row ?? t.row, t);
}

/** The party walks to a spot it has cleared (or the portal): free and safe. False when there is no such cleared spot, or none to walk by. */
export function moveTo(run: Run, id: number): boolean {
  const t = run.tower;
  if (!t?.maps || t.cur || run.over) return false;
  const open = openSet(t);
  if (!open.has(id)) return false;
  t.here = id;
  if (id >= 0 && id < SIDE_BASE) t.at = id;
  else if (id === START_ID) t.at = -1;
  t.going = undefined;
  return true;
}

/** The ways a spot can be walked to from where the party stands (a calamity's): the spots in order, or null when it can't be reached (not revealed). */
export function routeTo(run: Run, id: number): number[] | null {
  const t = run.tower;
  if (!t?.maps) return null;
  const sides = sideSpots(run.seed, t.act, t.map);
  return routeBetween(t.map, sides, openSet(t), hereOf(t), id);
}

/** The party sets out for a spot of the calamity's map (one it may pick now); false when it may not. Saved with the run, so reopening carries on at that spot. */
export function setGoing(run: Run, id: number): boolean {
  const t = run.tower;
  if (!t?.maps || t.cur) return false;
  if (!choices(run).some((n) => n.id === id) && !sideChoices(run).some((s) => s.id === id) && !(t.path.includes(id) && t.map[id]?.kind === 'shop')) return false;
  t.going = id;
  return true;
}

/** The hidden side spots the party may take now: those hanging from the node it stands at, not yet taken (a calamity's; none while a node is in play). They are optional: the road's own choices stay as they are. */
export function sideChoices(run: Run): SideSpot[] {
  const t = run.tower;
  if (!t?.maps || t.cur || run.over || expeditionOf(run)) return [];
  // (shown once the node it hangs from is cleared, and taken whenever the party likes: it is optional, and never lost)
  return sideSpots(run.seed, t.act, t.map).filter((s) => t.path.includes(s.from) && !t.sideDone?.includes(s.id));
}

/* ------------------------------------------------------------------ the fights */

/** Foes' hp and attack on a floor, as a share of their stats in `foes.ts`. */
/** The spire's own step for each act after the first (a Calamity sets its own, `CAL_SCALE.step`): 0 until the skills overhaul (batches 2 and 3),
 *  whose cheaper, quicker skills carried a full castle's long climbs further (a mean of 43.6 floors where main's was 35.8, 96 climbs of
 *  `tools/merge-two/run.mjs spire:max`); at 0.04 it is 36.0 again. It answers the later acts and leaves the first as it was. */
export const SPIRE_ACT_STEP = 0.04;
export const foeScale = (floor: number, scale?: TowerState['scale'], act = 1): number => (scale?.start ?? FOE_START) * (1 + (scale?.growth ?? TOWER_GROWTH) * (floor - 1)) * (1 + (scale ? scale.step ?? 0 : SPIRE_ACT_STEP) * (act - 1));

/** The band of a plain fight or an elite on a floor: the usual field bands in the first act, then those and the waves of every unlocked army. */
function bandFor(run: Run, floor: number, salt: number): string[] {
  const rng = new Rng(mixSeed(run.seed, 0x7b4d, floor, salt));
  const fields = (): string[] => [...FOE_BANDS[FIELD_BANDS[rng.int(0, FIELD_BANDS.length - 1)]]];
  const armies = (run.tower?.armies ?? []).map((id) => armyById(id)).filter((a) => !!a);
  const act = run.tower?.act ?? actOf(floor);
  if (act === 1 || !armies.length || rng.chance(0.25)) return fields();
  // (a calamity's second map meets the first army's waves, its third the second's, and so on)
  const waves = (run.tower?.maps ? armies[Math.min(act - 2, armies.length - 1)] : rng.pick(armies))!.waves.filter((w) => !w.boss);
  return [...rng.pick(waves).foes];
}

/** The fight a node brings on a floor. */
export function fightSpec(run: Run, kind: NodeKind, floor: number, twist?: string, nodeId?: number): FightSpec {
  const spec = plainSpec(run, kind, floor, nodeId);
  const tw = twist ? TWISTS[twist] : undefined;
  if (tw) {
    spec.twist = tw.id;
    spec.stage.twist = tw.fx;
  }
  return spec;
}

function plainSpec(run: Run, kind: NodeKind, floor: number, nodeId?: number): FightSpec {
  const spec = baseSpec(run, kind, floor, nodeId);
  if (run.mode?.kind !== 'calamity') return spec;
  // (a calamity's foes follow the party: fewer for a lone hero, stronger once it is more than five)
  const more = squadFoeMult(run.roster.length) * (run.rift ? [1, 1.35, 1.8][run.tower!.act - 1] : 1);
  const rules = ascRules(ascOf(run));
  spec.band = fitBand(spec.band, run.roster.length, kind === 'boss');
  // (and the fight is on a bigger board)
  spec.stage.size = CAL_BOARD;
  // (the first floors of the first map are gentler: `CAL_OPENING`)
  const ease = kind === 'boss' ? 1 : CAL_OPENING[floor - 1] ?? 1;
  const bite = run.tower!.act > 1 ? 1 + CAL_SCALE.atkBias : 1;
  // (the last map's fights are harder still: `CAL_SCALE.final`)
  const last = run.tower!.act >= (run.tower!.maps ?? CAL_MAPS) && kind !== 'boss' ? 1 + CAL_SCALE.final : 1;
  spec.stage.foes = { ...spec.stage.foes, hp: spec.stage.foes!.hp! * more * rules.foeHp * ease * last, atk: spec.stage.foes!.atk! * more * rules.foeAtk * ease * bite * last };
  if (rules.heal !== 1) spec.stage.heal = rules.heal;
  return spec;
}

function baseSpec(run: Run, kind: NodeKind, floor: number, nodeId?: number): FightSpec {
  const k = foeScale(floor, run.tower?.scale, run.tower?.act);
  // (a Calamity's maps keep the six old lands, one to a map; the spire draws a land for each five floors from all of them, `lands.ts`)
  const area = run.tower?.maps ? CLASSIC_AREAS[Math.floor((floor - 1) / 5) % CLASSIC_AREAS.length] : spireArea(run.seed, floor);
  if (kind === 'boss' && run.tower?.maps) {
    // (a calamity's bosses: one of its own per map, each bigger than the last; the map's twist adds a mechanic from the second on)
    const map = run.rift ? RIFT_BOSSES[run.tower.act - 1] : run.tower.act;
    return { band: calBossBand(map), stage: { foes: { hp: k, atk: k }, boss: calBossBoost(map, ascRules(ascOf(run)).phaseAt, ascRules(ascOf(run)).bossShield), area } };
  }
  if (kind === 'boss') return { band: [...FOE_BANDS[BOSS_BANDS[((run.tower?.act ?? actOf(floor)) - 1) % BOSS_BANDS.length]]], stage: { foes: { hp: k, atk: k }, boss: BOSS, area } };
  // (a named elite waits at an elite node; a call without a node keeps the plain elite band)
  const named = kind === 'elite' && nodeId !== undefined && run.tower ? (nodeId >= SIDE_BASE ? sideEliteAt(run.seed, run.tower.act, run.tower.map, nodeId - SIDE_BASE) : eliteAt(run.seed, run.tower.act, run.tower.map, nodeId)) : undefined;
  if (named) return eliteFight(named, k, ELITE_MULT, area);
  if (kind === 'elite') return { band: bandFor(run, floor, 1), stage: { foes: { hp: k * ELITE_MULT, atk: k * ELITE_MULT }, boss: ELITE_LEADER, area } };
  return { band: bandFor(run, floor, 0), stage: { foes: { hp: k, atk: k }, area } };
}

/** The gold a mimic's chest holds besides its relic and gear. */
export const mimicGold = (floor: number): number => 40 + 8 * floor;

const unownedRelics = (run: Run) => ALL_RELIC_IDS.filter((id) => !run.relics?.includes(id));
const gearId = (run: Run) => (run.nextGear = (run.nextGear ?? 1) + 1) - 1;

/** What a shop on a floor sells, drawn from the run's seed. */
function stockShop(run: Run, floor: number): ShopItem[] {
  const rng = new Rng(mixSeed(run.seed, 0x5409, floor));
  const items: ShopItem[] = [];
  const relics = unownedRelics(run);
  for (let i = 0; i < 2 && relics.length; i++) {
    const id = pickRelic(() => rng.next(), relics);
    relics.splice(relics.indexOf(id), 1);
    items.push({ kind: 'relic', label: RELICS[id].name, text: relicText(id), cost: relicPriceOf(id, 55 + 3 * floor + rng.int(0, 15)), ref: id });
  }
  const g = dropGear(rng, gearId(run), floor);
  items.push({ kind: 'gear', label: g.name, text: `${g.slot}: ${gearText(g)}`, cost: 24 * g.tier + 2 * floor, gear: g });
  // (a calamity's shop offers a hero it does not have yet, of any of the 45; the usual one a hero of the party)
  const pool = hireable(run);
  const kind = pool.length ? rng.pick(pool) : undefined;
  if (kind) items.push({ kind: 'hero', label: UNITS[kind].name, text: run.mode?.kind === 'calamity' ? 'for hire, joins the party' : 'joins the party, grade 1', cost: run.mode?.kind === 'calamity' ? hireCost(floor) : summonCost(run) + 10, ref: kind });
  items.push({ kind: 'heal', label: 'Healing draught', text: `heals every hero ${DRAUGHT_HEAL * 100}% of its hp`, cost: 20 + floor });
  items.push({ kind: 'elixir', label: 'Elixir', text: 'heals every hero fully, the fallen too', cost: 55 + 2 * floor });
  // (a high calamity ascension: dearer shops, and a draught that heals half as much)
  const rules = ascRules(ascOf(run));
  if (rules.shops !== 1) for (const it of items) it.cost = Math.round(it.cost * rules.shops);
  if (rules.hires !== 1) for (const it of items) if (it.kind === 'hero') it.cost = Math.round(it.cost * rules.hires);
  // (RELICS-2: the Tax Ingot's dearer prices)
  for (const it of items) it.cost = pricedFor(run.relics, it.cost);
  if (rules.heal !== 1) for (const it of items) if (it.kind === 'heal') it.text = `heals every hero ${Math.round(DRAUGHT_HEAL * rules.heal * 100)}% of its hp`;
  return items;
}

/** What hiring a hero costs on a floor (a calamity's). */
export const hireCost = (floor: number): number => 45 + 7 * floor;
/** Heroes a recruit node offers. */
export const HIRE_OFFERS = 3;

/** The heroes for hire on a floor: each a different kind, none the run already has (a hero is hired once a run). They are drawn from all 45, the ones the player has not unlocked too, so every camp is a chance to try one; to keep it fair
 *  and the player's own collection worth having, the first of the three is always a hero the player owns (while one is left), and the others are drawn from every kind at the same odds. Heroes have no rarity, so a stranger is no stronger. */
function stockHires(run: Run, floor: number): Hire[] {
  const rng = new Rng(mixSeed(run.seed, 0xca11, floor));
  const left = hireable(run);
  const mine = left.filter((k) => run.pool?.includes(k));
  const out: Hire[] = [];
  const take = (from: string[]): void => {
    const k = from[rng.int(0, from.length - 1)];
    left.splice(left.indexOf(k), 1);
    out.push({ kind: k, cost: 0 });
  };
  if (run.mode?.kind === 'calamity' && mine.length) take(mine);
  while (out.length < HIRE_OFFERS && left.length) take(left);
  return out;
}

/** Whether the run has room for another hero (a calamity owns at most its squad limit). */
export const hasRoom = (run: Run): boolean => run.mode?.kind !== 'calamity' || ownHeroes(run).length < squadLimit(run);

/** Whether the hero of this kind cannot be hired now: a Calamity hires each kind once, so one already on the roster is closed. */
export const hireClosed = (run: Run, kind: string): boolean => run.mode?.kind === 'calamity' && ownsKind(run, kind);

/** Take hero `i` at the recruit spot: the choice of one free hero out of three. Returns a line, or null when it can't be done (a hero already taken, or no room). */
export function hire(run: Run, i: number): string | null {
  const cur = run.tower?.cur;
  const h = cur?.hires?.[i];
  if (cur?.kind !== 'recruit' || !h || cur.hires!.some((x) => x.hired) || !hasRoom(run) || hireClosed(run, h.kind)) return null;
  run.gold -= h.cost;
  h.hired = true;
  hireHero(run, h.kind, h.cost);
  if (run.tower?.recap) run.tower.recap.heroes.push(UNITS[h.kind].name);
  return `The ${UNITS[h.kind].name} joins the party.`;
}

/** A chest on a floor: gold, and a relic or a piece of gear. */
function stockChest(run: Run, floor: number): Treasure {
  const rng = new Rng(mixSeed(run.seed, 0x7ea5, floor));
  const relics = unownedRelics(run);
  const chest: Treasure = { gold: 30 + 6 * floor };
  if (relics.length && rng.chance(0.45)) chest.relic = pickRelic(() => rng.next(), relics);
  else chest.gear = dropGear(rng, gearId(run), floor, rng.chance(0.3) ? 1 : 0);
  return chest;
}

/** The recap of the calamity's map in play (made as the map opens; a save from before has none, and one is started when it is next needed). */
export function recapOf(run: Run): MapRecap | undefined {
  const t = run.tower;
  if (!t?.maps) return undefined;
  return (t.recap ??= { map: t.act, ...(run.rift ? { realm: RIFT_BOSSES[t.act - 1] } : {}), spots: 0, total: expeditionOf(run) ? rowsIn(t, t.act) - 1 : t.map.filter((n) => n.kind !== 'boss').length, fights: 0, elites: 0, gold: 0, relics: [], gear: [], heroes: [], events: [] });
}

/** Leave a recruit spot with nobody taken: the spot stays open, and the party can come back (its offer is the same). */
export function leaveOpen(run: Run): boolean {
  const t = run.tower;
  const cur = t?.cur;
  if (!t?.maps || !cur || cur.kind !== 'recruit' || cur.hires?.some((h) => h.hired)) return false;
  t.here = cur.id;
  t.cur = undefined;
  run.event = undefined;
  return true;
}

/** Enter a node from the choices: a battle is made ready (the page starts it), the rest are laid out. False when it can't be picked now. */
export function enterNode(run: Run, id: number): boolean {
  if (pendingAltar(run)) return false;
  const t = run.tower;
  const side = id >= SIDE_BASE ? sideChoices(run).find((s) => s.id === id) : undefined;
  // (a cleared shop of a calamity can be entered again)
  const again = t?.maps && !expeditionOf(run) && !t.cur && !run.over && t.path.includes(id) && t.map[id]?.kind === 'shop' ? t.map[id] : undefined;
  const node = side ? { id, kind: side.kind as NodeKind, twist: undefined } : again ?? choices(run).find((n) => n.id === id);
  if (!t || !node) return false;
  // (a calamity's spots are fought at their own floor, wherever the party has been: its row, running on through the maps)
  if (t.maps) run.stage = spotFloor(run, id);
  const floor = run.stage;
  t.lastBoss = undefined;
  const cur: Current = { id, kind: node.kind };
  if (expeditionOf(run)) cur.world = destinationWorld(run, id);
  if (side) cur.side = true;
  t.going = undefined;
  if (node.kind === 'fight' || node.kind === 'elite' || node.kind === 'boss') cur.fight = fightSpec(run, node.kind, floor, node.twist, id);
  if (cur.fight && cur.world) {
    const board = destinationBoard(mixSeed(run.seed, t.act, id), cur.world, t.act);
    if (node.kind === 'boss') board.arenaMid = { u: 7, v: 5 };
    cur.fight.stage.board = board;
    cur.fight.stage.area = board.area;
  }
  if (run.rift && node.kind === 'boss' && t.act === t.maps) {
    const starter = run.roster.find((h) => h.id === run.rift!.starter);
    if (starter) starter.xp = Math.max(starter.xp ?? 0, xpFor(30));
  }
  if (t.maps && (node.kind === 'fight' || node.kind === 'elite' || node.kind === 'boss')) levelTiers(run);
  if (node.kind === 'shop') cur.shop = t.shops?.[id] ?? stockShop(run, floor);
  if (node.kind === 'recruit') cur.hires = stockHires(run, floor);
  if (node.kind === 'treasure') cur.chest = stockChest(run, floor);
  // (a hidden hoard is gold alone: the side spots are small rewards, so the road's own stay what they were)
  if (side && cur.chest) cur.chest = { gold: Math.round(cur.chest.gold / 2) };
  t.cur = cur;
  if (node.kind === 'mystery') {
    run.event = drawEvent(run, floor, TOWER_EVENT_KINDS);
    cur.eventTitle = run.event.title;
  }
  return true;
}

/** Whether the node in play is a battle. */
export const inBattle = (run: Run): boolean => !!run.tower?.cur?.fight;

/** The node is done: the run moves up a floor (a boss fallen opens the next act's map). */
export function clearNode(run: Run): void {
  const t = run.tower;
  const cur = t?.cur;
  if (!t || !cur) return;
  if (cur.shop && t.maps) (t.shops ??= {})[String(cur.id)] = cur.shop;
  if (t.maps && cur.side) {
    // (a hidden side spot is done: it stays cleared, and the party stands there)
    const r = recapOf(run);
    if (r) r.spots++;
    (t.sideDone ??= []).push(cur.id);
    t.here = cur.id;
    t.spots = (t.spots ?? 0) + 1;
    t.cur = undefined;
    run.event = undefined;
    return;
  }
  const first = !t.path.includes(cur.id);
  const expedition = expeditionOf(run);
  if (first && expedition && cur.world) {
    growExpeditionStarter(run); levelTiers(run);
    expedition.history.push({ region: t.act, node: cur.id, world: cur.world, kind: cur.kind });
  }
  if (first) {
    t.path.push(cur.id);
    // (a mirror's clone stays for its floors, then goes: its place in the squad goes back to the original it stood in for (ONE-OF-EACH), or
    // else to a benched hero of the party's own)
    for (const h of [...run.roster]) {
      if (h.cloneFloors !== undefined) {
        h.cloneFloors--;
        if (h.cloneFloors <= 0) {
          const fought = run.squad.includes(h.id);
          run.roster = run.roster.filter((x) => x.id !== h.id);
          run.squad = run.squad.filter((x) => x !== h.id);
          delete t.hp[String(h.id)];
          const back = h.standsFor !== undefined && canJoin(run, h.standsFor) ? h.standsFor : undefined;
          if (back !== undefined && fought) {
            run.squad.push(back);
            continue;
          }
          const bench = ownHeroes(run).find((x) => canJoin(run, x.id));
          if (bench && (fought || !run.squad.length)) run.squad.push(bench.id);
        }
      }
    }
  }
  const recap = t.maps ? recapOf(run) : undefined;
  if (recap && first) {
    if (cur.kind !== 'boss') recap.spots++;
    if (cur.kind === 'mystery' && cur.eventTitle) recap.events.push(cur.eventTitle);
  }
  t.cur = undefined;
  run.event = undefined;
  if (t.maps) {
    // (a calamity is not climbed floor by floor: a spot cleared stays cleared, and the party stands on it; a visit to a shop already cleared is not a new spot)
    t.here = cur.id;
    if (first) t.spots = (t.spots ?? 0) + 1;
  } else run.stage++;
  if (cur.kind === 'boss' && t.maps) {
    // (the map is cleared: its recap is kept, and the page shows it once)
    const done = recapOf(run)!;
    t.recaps = [...(t.recaps ?? []), done];
    t.mapDone = done;
    t.recap = undefined;
  }
  if (cur.kind === 'boss' && t.maps && t.act >= t.maps) {
    // (the last map's boss: a calamity is cleared)
    t.bosses++;
    run.cleared = true;
    run.over = true;
    return;
  }
  if (cur.kind === 'boss') {
    t.act++;
    t.bosses++;
    t.map = mapFor(run, t.act);
    t.at = -1;
    t.row = 0;
    t.path = [];
    t.sideDone = undefined;
    t.shops = undefined;
    t.here = undefined;
    t.going = undefined;
    if (t.maps) run.stage = floorOf(t.act, 0, t);
  } else {
    t.at = cur.id;
    if (!t.maps || expedition && first) t.row++;
    if (expedition) t.here = START_ID;
  }
}

/** A mystery floor's card has been closed: the floor is done. */
export function finishMystery(run: Run): void {
  const cur = run.tower?.cur;
  if (cur?.kind !== 'mystery' || run.event) return;
  // (a mimic: the chest was opened, and it bites: an elite's strength under a different band, its win paying a great chest)
  if (cur.mimic) {
    cur.mimic = false;
    cur.fight = { ...plainSpec(run, 'elite', run.stage), band: bandFor(run, run.stage, 2), mimic: true };
    return;
  }
  if (!cur.fight) clearNode(run);
}

/** The XP a mystery floor has taught, by hero kind (the page adds it to the meta); null when there is none waiting. */
export function takeXp(run: Run): Record<string, number> | null {
  const t = run.tower;
  if (!t?.xp || !Object.keys(t.xp).length) return null;
  const xp = t.xp;
  t.xp = undefined;
  return xp;
}

/** The chance a plain fight of a run that levels its own heroes drops a piece of gear. */
export const FIGHT_GEAR = 0.3;

/** Move the Calamity heroes whose level has earned a tier up it, and note them in `t.promoted` for the page. */
export function levelTiers(run: Run): void {
  const t = run.tower;
  const ups = promoteByLevel(run);
  if (t && ups.length) t.promoted = [...(t.promoted ?? []), ...ups];
}

/** A won fight teaches the run's heroes: their XP (by hero) goes onto them, and `t.gains` keeps what each got for the result screen. */
function teachFight(run: Run, b: Battle): void {
  const t = run.tower!;
  const cal = run.mode?.kind === 'calamity';
  const gains = fightXpByHero(b, xpRate(run.castle) * (t.cur?.side ? 0.25 : 1) * (cal ? calXpShare(b.units.filter((u) => u.side === 'foe' && !u.owner).length) : 1), cal ? CALAMITY_XP : CLIMB_XP);
  const before = new Map(run.roster.map((h) => [h.id, heroLevel(h)] as const));
  const xpBefore = new Map(run.roster.map((h) => [h.id, h.xp ?? 0] as const));
  gainRunXp(run, gains);
  // (a calamity's heroes rise a tier at the levels set in `CAL_TIER`: the stand-in for a merge's promotion)
  growStarter(run, !!t.cur?.side);
  growExpeditionStarter(run);
  levelTiers(run);
  t.gains = Object.entries(gains).map(([id, xp]) => {
    const h = run.roster.find((x) => x.id === Number(id));
    return { id: Number(id), kind: h?.kind ?? '', xp: h ? (h.xp ?? 0) - (xpBefore.get(h.id) ?? 0) : xp, from: before.get(Number(id)) ?? 1, to: h ? heroLevel(h) : before.get(Number(id)) ?? 1 };
  }).filter((g) => g.kind);
}

/**
 * Settle a finished battle of the tower: the wounds are carried (a fallen hero comes back at `FALLEN`), a win pays gold and
 * heals a little and may drop a relic or gear, and the run climbs on; a loss ends it.
 */
export function finishTower(run: Run, b: Battle, won: boolean, stars = 0): void {
  const t = run.tower;
  if (!t || expeditionOf(run) && (!t.cur?.fight || run.over)) return;
  const kind = t.cur?.kind ?? 'fight';
  const floor = run.stage;
  t.gains = undefined;
  t.promoted = undefined;
  run.best = Math.max(run.best, floor);
  run.found = [];
  run.stars = (run.stars ?? 0) + stars;
  if (!won) {
    run.over = true;
    run.buff = undefined;
    return;
  }
  for (const u of b.units) if (u.side === 'hero' && u.tag !== undefined) t.hp[String(u.tag)] = u.alive ? Math.max(FALLEN * 0.4, u.hp / u.maxHp) : FALLEN;
  if (run.local) teachFight(run, b);
  // (a hidden spot's win does not heal: the party goes back to the road as hurt as the fight left it)
  if (!t.cur?.side) healParty(run, kind === 'boss' ? BOSS_HEAL : WIN_HEAL);
  const bonus = (relicEffects(run.relics, relicCtx(run)).gold ?? 0) + (run.buff?.gold ?? 0);
  const twist = t.cur?.fight?.stage.twist;
  const paid = Math.round((1 + (run.rift?.corruption ?? 0) * CORRUPT.gold) * reward(floor) * (kind === 'elite' ? ELITE_GOLD : kind === 'boss' ? 1.2 : 1) * (twist?.gold ?? 1)) + bonus;
  run.gold = Math.max(0, run.gold + paid);
  const recap = recapOf(run);
  if (recap) {
    recap.gold += paid;
    recap.fights++;
    if (kind === 'elite') recap.elites++;
  }
  // (a calamity's boss and mini-bosses drop rift ores of their map's kinds, from side streams: kept on the run, paid when it ends)
  if (t.maps && (kind === 'boss' || kind === 'elite')) {
    const drop = kind === 'boss' ? bossOres(run.seed, t.act, ascOf(run)) : eliteOres(run.seed, t.act, floor, ascOf(run));
    (t.ores ??= []).push(drop);
    if (recap) (recap.ores ??= []).push(drop);
    run.found.push(`${drop.n} ${ORES[drop.trait].name}`);
  }
  const prizes: Gear[] = run.buff?.gear ? [run.buff.gear] : [];
  const rng = new Rng(mixSeed(run.seed, 0xe11e, floor));
  // (a run whose heroes start bare finds gear in its fights too: now and then in a plain one, always from an elite; from a side stream)
  if (run.local && !t.cur?.side && (kind === 'elite' || (kind === 'fight' && new Rng(mixSeed(run.seed, 0x6ea5, floor)).chance(FIGHT_GEAR)))) prizes.push(dropGear(new Rng(mixSeed(run.seed, 0x6ea6, floor)), gearId(run), floor, kind === 'elite' ? 1 : 0));
  const relics = unownedRelics(run);
  const relicOf = (id: string) => {
    (run.relics ??= []).push(id);
    run.found!.push(`${theRelic(id)} (${relicText(id)})`);
    recap?.relics.push(id);
  };
  if (kind === 'elite' && t.cur?.side) {
    // (a detour's mini-boss: double gold and a good piece of gear, and no relic; no healing after, and a quarter of the XP)
    prizes.push(dropGear(rng, gearId(run), floor, 1));
  } else if (kind === 'elite') {
    // (an elite always pays a relic, one of three: the page offers them on the map; none left, it pays gear)
    const offer = drawOffer(run, floor);
    if (offer.length) {
      t.offer = offer;
      t.lastElite = t.cur?.fight?.elite;
      run.found.push(`a choice of ${offer.length >= OFFER_SIZE ? 'three' : offer.length} relics, on the map`);
    } else prizes.push(dropGear(rng, gearId(run), floor, 1));
  } else if (kind === 'boss') {
    // (a boss drops gear, and a relic if one is left)
    prizes.push(dropGear(rng, gearId(run), floor, 1));
    if (relics.length) relicOf(pickRelic(() => rng.next(), relics));
    // (a calamity's bosses are its own: not for the meta's list of bosses beaten)
    if (!t.maps) t.lastBoss = t.cur?.fight?.band[0];
  }
  if (t.cur?.fight?.mimic) {
    // (a felled mimic spills a great chest: gold, a relic if one is left, and a good piece of gear)
    const gold = mimicGold(floor);
    run.gold += gold;
    if (recap) recap.gold += gold;
    run.found.push(`${gold} gold from the mimic's chest`);
    if (relics.length) relicOf(pickRelic(() => rng.next(), relics));
    prizes.push(dropGear(rng, gearId(run), floor, 1));
  }
  for (const g of prizes) {
    (run.items ??= []).push(g);
    run.found.push(`${g.name} (${g.slot}, ${gearText(g)})`);
    recap?.gear.push(g.name);
  }
  if (run.buff?.gold) run.found.push(`${run.buff.gold} gold from the cursed path`);
  spendBuff(run);
  clearNode(run);
}

/* ------------------------------------------------------------------ the quiet nodes */

/** At a campfire: rest, healing every hero `REST_HEAL` of its hp (the fallen too). False when not at a campfire or already done. */
export function rest(run: Run): boolean {
  const cur = run.tower?.cur;
  if (cur?.kind !== 'campfire' || cur.camp) return false;
  healParty(run, REST_HEAL);
  cur.camp = `The party rests and is healed ${Math.round(REST_HEAL * 100)}%.`;
  return true;
}

/** XP a hero is taught at a campfire (it is the kind's lasting XP: the page adds it to the meta). */
export const trainXp = (floor: number): number => 40 + 10 * floor;

/** XP a hero is taught at a campfire in a run that levels its own heroes (it is the hero's, for the run). */
export const localTrainXp = (floor: number): number => 30 + 8 * floor;

/** At a campfire: train a hero. Returns its kind and the XP to add to the meta (none in a run that levels its own heroes: the hero is taught in the run), or null when it can't be done. */
export function train(run: Run, heroId: number): { kind: string; xp: number } | null {
  const cur = run.tower?.cur;
  const h = run.roster.find((x) => x.id === heroId);
  if (cur?.kind !== 'campfire' || cur.camp || !h) return null;
  if (run.local) {
    const n = localTrainXp(run.stage);
    h.xp = (h.xp ?? 0) + n;
    cur.camp = `The ${UNITS[h.kind].name} trains by the fire: +${n} XP.`;
    levelTiers(run);
    return { kind: h.kind, xp: 0 };
  }
  const xp = trainXp(run.stage);
  cur.camp = `The ${UNITS[h.kind].name} trains by the fire: +${xp} XP.`;
  return { kind: h.kind, xp };
}

/** Buy item `i` of the shop. Returns a line saying what it was, or null when it can't be bought. */
export function buy(run: Run, i: number): string | null {
  const cur = run.tower?.cur;
  const it = cur?.shop?.[i];
  if (cur?.kind !== 'shop' || !it || it.sold || run.gold < it.cost || (it.kind === 'hero' && (!hasRoom(run) || hireClosed(run, it.ref!)))) return null;
  run.gold -= it.cost;
  it.sold = true;
  switch (it.kind) {
    case 'relic':
      (run.relics ??= []).push(it.ref!);
      return `Bought the ${it.label}.`;
    case 'gear':
      (run.items ??= []).push(it.gear!);
      return `Bought the ${it.label}.`;
    case 'hero':
      hireHero(run, it.ref!, it.cost);
      return `A ${it.label} joins the party.`;
    case 'heal':
      healParty(run, DRAUGHT_HEAL);
      return 'The party drinks and is healed.';
    default:
      healParty(run, 1, true);
      return 'The elixir heals everyone.';
  }
}

/** Open the treasure: the gold, and the relic or gear. Returns lines for what it held, or null when there is no chest to open. */
export function openTreasure(run: Run): string[] | null {
  const ch = run.tower?.cur?.chest;
  if (!ch || ch.opened) return null;
  ch.opened = true;
  run.gold += ch.gold;
  const recap = recapOf(run);
  if (recap) recap.gold += ch.gold;
  const lines = [`${ch.gold} gold`];
  if (ch.relic) {
    (run.relics ??= []).push(ch.relic);
    recap?.relics.push(ch.relic);
    lines.push(`${theRelic(ch.relic)}: ${relicText(ch.relic)}`);
  }
  if (ch.gear) {
    (run.items ??= []).push(ch.gear);
    recap?.gear.push(ch.gear.name);
    lines.push(`${ch.gear.name} (${ch.gear.slot}, ${gearText(ch.gear)})`);
  }
  return lines;
}

/* ------------------------------------------------------------------ the end of a run */

/** What a run that reached `floors` floors pays besides crowns: chests (a bronze every 8 floors, a silver for each act boss, a gold for every third) and a chance of equipment. */
export function chestsFor(floors: number, bosses: number): { bronze: number; silver: number; gold: number } {
  return { bronze: Math.floor(floors / 8), silver: bosses, gold: Math.floor(bosses / 3) };
}
/** The chance of a piece of equipment from a run of `floors` floors. */
export const gearChance = (floors: number): number => (floors < 3 ? 0 : Math.min(0.9, 0.12 + 0.025 * floors));

/**
 * Pay a lost tower run: its chests go into the stash and its equipment into the inventory, rolled from the run's seed,
 * once. Returns the summary (also kept on the run), or null while the run is still going.
 */
export function settleTower(m: Meta, run: Run): TowerSummary | null {
  const t = run.tower;
  if (!t || !run.over) return null;
  if (t.summary) return t.summary;
  if (run.mode?.kind === 'calamity') return settleCalamity(m, run);
  const floors = Math.max(0, run.stage - 1);
  const c = chestsFor(floors, t.bosses);
  const armies = t.armies.filter((id) => armyById(id) && armyUnlocked(m, id));
  const army = armyById(armies[Math.min(Math.max(0, t.act - 1), armies.length - 1)] ?? ARMIES[0].id)!;
  let n = 0;
  const give = (at: number, count: number) => {
    for (let i = 0; i < count; i++) m.stash.push({ army: army.id, at, tier: 0, seed: mixSeed(run.seed, 0x70e7, ++n), tower: true });
  };
  give(3, c.bronze);
  give(5, c.silver);
  give(10, c.gold);
  const gear: string[] = [];
  const rng = new Rng(mixSeed(run.seed, 0xe9a1));
  const quality = floors >= 39 ? 'gold' : floors >= 13 ? 'silver' : 'bronze';
  for (let i = 0; i < 1 + Math.floor(t.bosses / 2); i++) {
    if (!rng.chance(gearChance(floors))) continue;
    const item = grantEquipment(m, rollEquipment(rng, { quality, armyIndex: armyIndex(army.id), milestone: floors >= 39 }));
    gear.push(itemName(item));
  }
  t.summary = { floors, act: t.act, crowns: t.crowns, ...c, gear, relics: run.relics?.length ?? 0, heroes: run.roster.length, newBest: floors > t.prevBest, abandoned: t.abandoned };
  return t.summary;
}

/** Crowns a calamity pays for each map cleared, on top of its fights'. */
export const MAP_CROWNS: readonly number[] = [60, 120, 200, 300, 420, 600];

/** Pay a finished calamity (lost, abandoned or cleared), once: crowns for each map cleared, and gold chests on a full clear (both more at a high ascension). The best is kept in the meta, and a clear opens the next ascension. */
function settleCalamity(m: Meta, run: Run): TowerSummary {
  const t = run.tower!;
  const maps = t.bosses;
  const level = ascOf(run);
  const bonus = Math.round(MAP_CROWNS.slice(0, maps).reduce((n, c) => n + c, 0) * ascCrowns(level));
  m.crowns += bonus;
  const c = run.cleared ? { bronze: 0, silver: 0, gold: ascChests(level) } : { bronze: 0, silver: 0, gold: 0 };
  const armies = t.armies.filter((id) => armyById(id) && armyUnlocked(m, id));
  const army = armyById(armies[armies.length - 1] ?? ARMIES[0].id)!;
  for (let i = 0; i < c.gold; i++) m.stash.push({ army: army.id, at: 10, tier: 0, seed: mixSeed(run.seed, 0xca1c, i + 1), tower: true });
  noteGuardians(m, maps);
  const best = m.calamity ?? { best: 0, clears: 0 };
  const cleared = ascCleared(m);
  m.calamity = { ...best, best: Math.max(best.best, maps), clears: best.clears + (run.cleared ? 1 : 0) };
  if (run.cleared) m.calamity.asc = Math.max(cleared, level);
  else if (best.asc !== undefined) m.calamity.asc = best.asc;
  // (a calamity cleared whole pays the finish: crowns, shards, a Legendary piece of gear, a title, and a Rift Cache)
  const clear = run.cleared ? payClear(m, run.seed, level, armyIndex(army.id)) : undefined;
  // (the rift ores its bosses and mini-bosses dropped, a loss's too)
  const ores = sumOres(t.ores ?? []);
  grantOres(m, ores);
  t.summary = { floors: t.spots ?? Math.max(0, run.stage - 1), act: Math.min(t.act, t.maps ?? t.act), crowns: t.crowns + bonus + (clear?.crowns ?? 0), ...c, gear: [], relics: run.relics?.length ?? 0, heroes: run.roster.length, newBest: maps > best.best, maps, cleared: !!run.cleared, abandoned: t.abandoned, ...(level ? { ascension: level } : {}), ...(clear ? { clear } : {}), recaps: t.recaps ?? [], ...(ores.length ? { ores } : {}) };
  return t.summary;
}

/** The player starts over: the run ends where it stands (no node in play), and `settleTower` pays what it earned, as for a lost run. False when there is no run to end. */
export function abandonTower(run: Run): boolean {
  const t = run.tower;
  if (!t || run.over) return false;
  t.cur = undefined;
  t.offer = undefined;
  t.abandoned = true;
  run.event = undefined;
  run.over = true;
  run.found = [];
  return true;
}

/** A line for a summary's chests, "2 bronze chests, a silver chest" (empty when none). */
export function chestLine(s: Pick<TowerSummary, 'bronze' | 'silver' | 'gold'>): string {
  const part = (n: number, name: string) => (n ? [`${n} ${name} chest${n > 1 ? 's' : ''}`] : []);
  return [...part(s.bronze, 'bronze'), ...part(s.silver, 'silver'), ...part(s.gold, 'gold')].join(', ');
}

/** A run saved by the old tower (a plain run in tower mode) gets a map: the act it stood in, its next floor the one it was on. */
export function migrateTower(run: Run, armies: readonly string[], prevBest = 0): void {
  if (run.mode?.kind !== 'tower' || run.tower) return;
  const t = newTower(run.seed, armies, prevBest);
  t.act = actOf(run.stage);
  t.row = rowOf(run.stage);
  t.map = makeMap(run.seed, t.act);
  run.tower = t;
  run.event = undefined;
}
