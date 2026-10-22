// The endless tower as a roguelike, Slay the Spire style. A run climbs acts of `ACT_ROWS` floors, the last a boss; each act
// is a map of branching paths (`makeMap`, drawn from the run's seed on its own side stream), and the player picks a node
// from those joined to the one just cleared. Fights, elites and the boss are battles (a band and a strength fixed when the
// node is entered, so a saved run replays the same fight); campfires, shops, treasure and mystery floors are settled here
// without one. The party's hp carries over (`health.ts`), so the heals matter. The run's floors are its stages: `run.stage`
// is the floor about to be climbed, and keeps counting through the acts. A lost fight ends the run; `settleTower` then pays
// the run's chests and equipment into the meta, by the floors cleared. Pure rules: no Pixi, no DOM, no clock.

import type { Battle, Boost, Stage } from './battle';
import { AREAS } from './board';
import { armyById, armyIndex, armyUnlocked, ARMIES } from './armies';
import { BOSS_BANDS, FIELD_BANDS, FOE_BANDS } from './foes';
import { grantEquipment, itemName, rollEquipment } from './equipment';
import { dropGear, gearText, type Gear } from './gear';
import { FALLEN, healParty } from './health';
import { drawEvent, TOWER_EVENT_KINDS } from './events';
import type { Meta } from './meta';
import { RELIC_IDS, RELICS, relicEffects } from './relics';
import { mixSeed, Rng } from './rng';
import { BOSS, FOE_START, recruit, reward, summonCost, type Run } from './run';
import { UNITS } from './units';

/** Floors in an act: the path floors, then the boss on the last. */
export const ACT_ROWS = 13;
/** Lanes a map is drawn across. */
export const LANES = 5;
/** Paths walked up from the first floor to make a map. */
export const PATHS = 4;
/** Foes' hp and attack grow by this share of their first-floor strength for each floor climbed, the acts running on. */
export const TOWER_GROWTH = 0.17;
/** An elite's foes are this much stronger than a plain fight's, and its leader is a mini-boss. */
export const ELITE_MULT = 1.22;
export const ELITE_LEADER: Boost = { size: 1.3, hp: 1.7, atk: 1.2 };
/** What the party heals after every won fight, and at a campfire's rest. */
export const WIN_HEAL = 0.1;
export const REST_HEAL = 0.45;
/** What a boss kill heals. */
export const BOSS_HEAL = 0.5;
/** The healing draught and the elixir of the shop. */
export const DRAUGHT_HEAL = 0.4;

export type NodeKind = 'fight' | 'elite' | 'campfire' | 'shop' | 'treasure' | 'mystery' | 'boss';
export const NODE_NAMES: Record<NodeKind, string> = { fight: 'Fight', elite: 'Elite', campfire: 'Campfire', shop: 'Shop', treasure: 'Treasure', mystery: 'Mystery', boss: 'Boss' };

export interface MapNode {
  id: number;
  row: number;
  lane: number;
  kind: NodeKind;
  /** The ids of the nodes one row up that this one leads to. */
  next: number[];
}

/** A battle's band and strength, fixed when its node is entered. */
export interface FightSpec {
  band: string[];
  stage: Stage;
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

export interface Treasure {
  gold: number;
  relic?: string;
  gear?: Gear;
  opened?: boolean;
}

/** The node being played: its fight, its stock, its chest or its campfire. */
export interface Current {
  id: number;
  kind: NodeKind;
  fight?: FightSpec;
  shop?: ShopItem[];
  chest?: Treasure;
  /** What the campfire did (rested or trained), once it has. */
  camp?: string;
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
  /** The boss that fell last (for the meta's list of bosses beaten). */
  lastBoss?: string;
  /** Crowns the fights have paid so far, and act bosses felled. */
  crowns: number;
  bosses: number;
  /** The tower record when the run began. */
  prevBest: number;
  summary?: TowerSummary;
}

/* ------------------------------------------------------------------ the map */

/** The floor (the run's stage) of a row of an act. */
export const floorOf = (act: number, row: number): number => (act - 1) * ACT_ROWS + row + 1;
/** The act a floor is in, and its row there. */
export const actOf = (floor: number): number => Math.floor((floor - 1) / ACT_ROWS) + 1;
export const rowOf = (floor: number): number => (floor - 1) % ACT_ROWS;

const SPECIAL: readonly NodeKind[] = ['elite', 'campfire', 'shop'];
const KIND_WEIGHTS: Record<string, number> = { fight: 44, mystery: 22, elite: 13, shop: 9, campfire: 12 };
/** The row of the one sure chest, and the row of the sure campfire before the boss. */
const TREASURE_ROW = 5;

/** An act's map, from the seed: `PATHS` paths walked up through `LANES` lanes (no two ever cross twice), every one ending at the boss. */
export function makeMap(seed: number, act: number): MapNode[] {
  const rng = new Rng(mixSeed(seed, 0x70ad, act));
  const last = ACT_ROWS - 1;
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
  for (let i = 2; i < PATHS; i++) starts.push(rng.pick(lanes));
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
    else if (n.row === TREASURE_ROW) n.kind = 'treasure';
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
  return nodes;
}

/** A tower's first state: the first act's map, a whole party, the armies the run may draw foes from. */
export function newTower(seed: number, armies: readonly string[], prevBest = 0): TowerState {
  return { act: 1, map: makeMap(seed, 1), at: -1, row: 0, hp: {}, armies: [...armies], path: [], crowns: 0, bosses: 0, prevBest };
}

/** The nodes the player may pick next: those the last one leads to (the whole first floor at the start of an act). Empty while a node is in play. */
export function choices(run: Run): MapNode[] {
  const t = run.tower;
  if (!t || t.cur || run.over) return [];
  if (t.at < 0) return t.map.filter((n) => n.row === t.row);
  return t.map[t.at].next.map((id) => t.map[id]);
}

/* ------------------------------------------------------------------ the fights */

/** Foes' hp and attack on a floor, as a share of their stats in `foes.ts`. */
export const foeScale = (floor: number): number => FOE_START * (1 + TOWER_GROWTH * (floor - 1));

/** The band of a plain fight or an elite on a floor: the usual field bands in the first act, then those and the waves of every unlocked army. */
function bandFor(run: Run, floor: number, salt: number): string[] {
  const rng = new Rng(mixSeed(run.seed, 0x7b4d, floor, salt));
  const fields = (): string[] => [...FOE_BANDS[FIELD_BANDS[rng.int(0, FIELD_BANDS.length - 1)]]];
  const armies = (run.tower?.armies ?? []).map((id) => armyById(id)).filter((a) => !!a);
  if (actOf(floor) === 1 || !armies.length || rng.chance(0.25)) return fields();
  const waves = rng.pick(armies)!.waves.filter((w) => !w.boss);
  return [...rng.pick(waves).foes];
}

/** The fight a node brings on a floor. */
export function fightSpec(run: Run, kind: NodeKind, floor: number): FightSpec {
  const k = foeScale(floor);
  const area = AREAS[Math.floor((floor - 1) / 5) % AREAS.length];
  if (kind === 'boss') return { band: [...FOE_BANDS[BOSS_BANDS[(actOf(floor) - 1) % BOSS_BANDS.length]]], stage: { foes: { hp: k, atk: k }, boss: BOSS, area } };
  if (kind === 'elite') return { band: bandFor(run, floor, 1), stage: { foes: { hp: k * ELITE_MULT, atk: k * ELITE_MULT }, boss: ELITE_LEADER, area } };
  return { band: bandFor(run, floor, 0), stage: { foes: { hp: k, atk: k }, area } };
}

const unownedRelics = (run: Run) => RELIC_IDS.filter((id) => !run.relics?.includes(id));
const gearId = (run: Run) => (run.nextGear = (run.nextGear ?? 1) + 1) - 1;

/** What a shop on a floor sells, drawn from the run's seed. */
function stockShop(run: Run, floor: number): ShopItem[] {
  const rng = new Rng(mixSeed(run.seed, 0x5409, floor));
  const items: ShopItem[] = [];
  const relics = unownedRelics(run);
  for (let i = 0; i < 2 && relics.length; i++) {
    const id = relics.splice(rng.int(0, relics.length - 1), 1)[0];
    items.push({ kind: 'relic', label: RELICS[id].name, text: RELICS[id].text, cost: 55 + 3 * floor + rng.int(0, 15), ref: id });
  }
  const g = dropGear(rng, gearId(run), floor);
  items.push({ kind: 'gear', label: g.name, text: `${g.slot}: ${gearText(g)}`, cost: 24 * g.tier + 2 * floor, gear: g });
  const pool = run.pool?.length ? run.pool : Object.keys(UNITS).filter((k) => UNITS[k].side === 'hero');
  const kind = rng.pick(pool);
  items.push({ kind: 'hero', label: UNITS[kind].name, text: 'joins the party, grade 1', cost: summonCost(run) + 10, ref: kind });
  items.push({ kind: 'heal', label: 'Healing draught', text: `heals every hero ${DRAUGHT_HEAL * 100}% of its hp`, cost: 20 + floor });
  items.push({ kind: 'elixir', label: 'Elixir', text: 'heals every hero fully, the fallen too', cost: 55 + 2 * floor });
  return items;
}

/** A chest on a floor: gold, and a relic or a piece of gear. */
function stockChest(run: Run, floor: number): Treasure {
  const rng = new Rng(mixSeed(run.seed, 0x7ea5, floor));
  const relics = unownedRelics(run);
  const chest: Treasure = { gold: 30 + 6 * floor };
  if (relics.length && rng.chance(0.45)) chest.relic = rng.pick(relics);
  else chest.gear = dropGear(rng, gearId(run), floor, rng.chance(0.3) ? 1 : 0);
  return chest;
}

/** Enter a node from the choices: a battle is made ready (the page starts it), the rest are laid out. False when it can't be picked now. */
export function enterNode(run: Run, id: number): boolean {
  const t = run.tower;
  const node = choices(run).find((n) => n.id === id);
  if (!t || !node) return false;
  const floor = run.stage;
  t.lastBoss = undefined;
  const cur: Current = { id, kind: node.kind };
  if (node.kind === 'fight' || node.kind === 'elite' || node.kind === 'boss') cur.fight = fightSpec(run, node.kind, floor);
  if (node.kind === 'shop') cur.shop = stockShop(run, floor);
  if (node.kind === 'treasure') cur.chest = stockChest(run, floor);
  t.cur = cur;
  if (node.kind === 'mystery') run.event = drawEvent(run, floor, TOWER_EVENT_KINDS);
  return true;
}

/** Whether the node in play is a battle. */
export const inBattle = (run: Run): boolean => !!run.tower?.cur?.fight;

/** The node is done: the run moves up a floor (a boss fallen opens the next act's map). */
export function clearNode(run: Run): void {
  const t = run.tower;
  const cur = t?.cur;
  if (!t || !cur) return;
  t.path.push(cur.id);
  t.cur = undefined;
  run.event = undefined;
  run.stage++;
  if (cur.kind === 'boss') {
    t.act++;
    t.bosses++;
    t.map = makeMap(run.seed, t.act);
    t.at = -1;
    t.row = 0;
    t.path = [];
  } else {
    t.at = cur.id;
    t.row++;
  }
}

/** A mystery floor's card has been closed: the floor is done. */
export function finishMystery(run: Run): void {
  if (run.tower?.cur?.kind === 'mystery' && !run.event) clearNode(run);
}

/**
 * Settle a finished battle of the tower: the wounds are carried (a fallen hero comes back at `FALLEN`), a win pays gold and
 * heals a little and may drop a relic or gear, and the run climbs on; a loss ends it.
 */
export function finishTower(run: Run, b: Battle, won: boolean, stars = 0): void {
  const t = run.tower;
  if (!t) return;
  const kind = t.cur?.kind ?? 'fight';
  const floor = run.stage;
  run.best = Math.max(run.best, floor);
  run.found = [];
  run.stars = (run.stars ?? 0) + stars;
  if (!won) {
    run.over = true;
    run.buff = undefined;
    return;
  }
  for (const u of b.units) if (u.side === 'hero' && u.tag !== undefined) t.hp[String(u.tag)] = u.alive ? Math.max(FALLEN * 0.4, u.hp / u.maxHp) : FALLEN;
  healParty(run, kind === 'boss' ? BOSS_HEAL : WIN_HEAL);
  const bonus = (relicEffects(run.relics).gold ?? 0) + (run.buff?.gold ?? 0);
  run.gold += Math.round(reward(floor) * (kind === 'elite' ? 1.5 : kind === 'boss' ? 1.2 : 1)) + bonus;
  const prizes: Gear[] = run.buff?.gear ? [run.buff.gear] : [];
  const rng = new Rng(mixSeed(run.seed, 0xe11e, floor));
  const relics = unownedRelics(run);
  const relicOf = (id: string) => {
    (run.relics ??= []).push(id);
    run.found!.push(`the ${RELICS[id].name} (${RELICS[id].text})`);
  };
  if (kind === 'elite') {
    // (an elite drops a relic or a piece of gear)
    if (relics.length && rng.chance(0.5)) relicOf(rng.pick(relics));
    else prizes.push(dropGear(rng, gearId(run), floor, 1));
  } else if (kind === 'boss') {
    // (a boss drops gear, and a relic if one is left)
    prizes.push(dropGear(rng, gearId(run), floor, 1));
    if (relics.length) relicOf(rng.pick(relics));
    t.lastBoss = t.cur?.fight?.band[0];
  }
  for (const g of prizes) {
    (run.items ??= []).push(g);
    run.found.push(`${g.name} (${g.slot}, ${gearText(g)})`);
  }
  if (run.buff?.gold) run.found.push(`${run.buff.gold} gold from the cursed path`);
  run.buff = undefined;
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

/** At a campfire: train a hero. Returns its kind and the XP to add to the meta, or null when it can't be done. */
export function train(run: Run, heroId: number): { kind: string; xp: number } | null {
  const cur = run.tower?.cur;
  const h = run.roster.find((x) => x.id === heroId);
  if (cur?.kind !== 'campfire' || cur.camp || !h) return null;
  const xp = trainXp(run.stage);
  cur.camp = `The ${UNITS[h.kind].name} trains by the fire: +${xp} XP.`;
  return { kind: h.kind, xp };
}

/** Buy item `i` of the shop. Returns a line saying what it was, or null when it can't be bought. */
export function buy(run: Run, i: number): string | null {
  const cur = run.tower?.cur;
  const it = cur?.shop?.[i];
  if (cur?.kind !== 'shop' || !it || it.sold || run.gold < it.cost) return null;
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
      recruit(run, it.ref!);
      return `A ${it.label} joins the party.`;
    case 'heal':
      healParty(run, DRAUGHT_HEAL);
      return 'The party drinks and is healed.';
    default:
      healParty(run, 1);
      return 'The elixir heals everyone.';
  }
}

/** Open the treasure: the gold, and the relic or gear. Returns lines for what it held, or null when there is no chest to open. */
export function openTreasure(run: Run): string[] | null {
  const ch = run.tower?.cur?.chest;
  if (!ch || ch.opened) return null;
  ch.opened = true;
  run.gold += ch.gold;
  const lines = [`${ch.gold} gold`];
  if (ch.relic) {
    (run.relics ??= []).push(ch.relic);
    lines.push(`the ${RELICS[ch.relic].name}: ${RELICS[ch.relic].text}`);
  }
  if (ch.gear) {
    (run.items ??= []).push(ch.gear);
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
  t.summary = { floors, act: t.act, crowns: t.crowns, ...c, gear, relics: run.relics?.length ?? 0, heroes: run.roster.length, newBest: floors > t.prevBest };
  return t.summary;
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
