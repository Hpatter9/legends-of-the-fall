// The Last Stand: an endless battle on a big square field (`standField.ts`). The king stands on his keep in the middle, the
// heroes guard posts round him (`standAi.ts`), and wave after wave of foes comes in from the edges, bigger each time. Every
// fifth wave is a boss. A hero who falls stays down for the rest of the run (`StandHero.fallen`); when a wave is down to its last
// `HUNT_AT` foes the heroes leave their posts to hunt them down (`StandMode.hunt`), and walk back after. Between waves there is a short break (`BREAK_MS`) to spend gold: level a hero up, buy a
// relic, heal the king (at any time, the break is a breather). The heroes also level up by themselves, in the fight, from kills and wave clears. The run ends when
// the king falls; its score is the best wave reached (`Meta.stand`).
//
// One `Battle` lasts the whole run (with `Battle.stand` set): the foes are added to it a few at a time, the dead are dropped
// a moment after they fall. The saved run (`StandRun`) is a small record kept at the start of each break; the battle is built
// again from it. Pure rules: no Pixi, no DOM; every draw is a side stream of the run's seed.

import { startBattle, addUnit, stepBattle, TICK_MS, creditOf, type Battle, type BattleEvent, type Boost, type Unit } from './battle';
import { tileAt, standable, type Area, type At } from './board';
import { canPost, edgeTiles, EDGES, KING_AT, ringPlan, standArea, standBoard, type Edge, type Role } from './standField';
import { isTank, KING_DEF, leashOf } from './standAi';
import { CLASS_OF } from './starter';
import { BOSS_BANDS, FIELD_BANDS, FOE_BANDS, isBoss } from './foes';
import { armyById, ARMIES, armyIndex, armyUnlocked } from './armies';
import { mixSeed, Rng } from './rng';
import { ALL_RELIC_IDS, mergeEffects, relicEffects, RELICS } from './relics';
import { fxStart } from './equipFx';
import { kindsOf, traitEffects } from './traits';
import { killXp, levelOfKind } from './levels';
import { boostOf, FOE_START } from './run';
import { heroBoost, manaRate, moveRate, type Castle } from './castle';
import { heroRank, type Meta, type StashChest } from './meta';
import { heroStats } from './talents';
import { awakenedOf } from './awaken';
import { chestsFor, gearChance, settleTower } from './tower';
import type { Run } from './run';
import { grantEquipment, rollEquipment, itemName } from './equipment';
import { UNITS } from './units';

/* ------------------------------------------------------------------ the numbers */

/** The break between waves (ms): the shop's time. */
export const BREAK_MS = 5000;
/** The most foes on the field at once; what a wave would add past it is paid in strength instead. */
export const FIELD_CAP = 48;
/** Heroes in the party: eight, all on the field from the start (no hiring, no bench). */
export const FIELD_HEROES = 8;
/** The king's health. */
export const KING_HP = 1000;
/** The share of the king's health a heal gives back. */
export const KING_HEAL = 0.4;
/** Foes' hp and attack at wave 1 (a share of their stats in `foes.ts`), and the share they gain each wave after. */
export const WAVE_START = FOE_START;
export const WAVE_GROWTH = 0.4;
/** From wave `WAVE_KNEE` on the climb eases to `WAVE_GROWTH_LATE` a wave: steep at first, so the early waves bite at once; gentler later, so a stronger party still goes further. */
export const WAVE_KNEE = 10;
export const WAVE_GROWTH_LATE = 0.07;
/** A wave's size: foes at wave 1 and the foes each wave adds. */
export const WAVE_BASE = 4;
export const WAVE_STEP = 2;
/** Every `BOSS_EVERY`th wave is a boss wave; the band changes every `BAND_WAVES` waves. */
export const BOSS_EVERY = 5;
export const BAND_WAVES = 3;
/** A boss's hp and attack against the same wave's foes (its own stats in `foes.ts` are already big): a share that starts low and grows to `BOSS_TOP` by the ninth boss. */
export const BOSS_START = 0.45;
export const BOSS_TOP = 1.0;
export const bossShare = (n: number): number => Math.min(BOSS_TOP, BOSS_START + ((BOSS_TOP - BOSS_START) * (n / BOSS_EVERY - 1)) / 8);
/** The foes of a wave come in over this long at most (ms), a gap between each. */
export const SPAWN_SPAN = 7000;
/** A wave that has gone on this long (ms) enrages its foes: their attack rises `ENRAGE_STEP` each `ENRAGE_EVERY` ms, so no wave lasts for ever. */
export const ENRAGE_AFTER = 75_000;
export const ENRAGE_EVERY = 5000;
export const ENRAGE_STEP = 1.1;
/** A cleared wave heals the heroes standing by this share of their health. The fallen stay down (the owner's ask: a hero who dies does not come back). */
export const CLEAR_HEAL = 0.35;
/** A wave with no foes still to come and this many or fewer on the field is hunted down: the heroes' leashes are lifted until it clears. */
export const HUNT_AT = 2;
/** Dead foes are dropped from the battle's list this long (ms) after they fall (the page has shown them by then). */
export const CORPSE_MS = 2600;

/** Gold for a kill, and for clearing wave `n`. */
export const killGold = (n: number): number => Math.max(1, Math.round((2 + Math.floor(n / 3)) / 2));
export const clearGold = (n: number): number => 12 + 4 * n;
export const BOSS_GOLD = 10;
export const START_GOLD = 60;
/** What the buys cost. */
export const levelCost = (lv: number): number => 25 + 11 * lv;
export const relicCost = (owned: number, wave: number): number => 60 + 12 * owned + 3 * wave;
export const healCost = (wave: number): number => 25 + 3 * wave;
/** The crowns a cleared wave pays: climbs to wave 8 and stays, so a run that gets less far (the waves are harder) is paid about what the same party was paid before. */
export const waveCrowns = (n: number): number => 8 + 16 * Math.min(n, 8);
/** How many relics a break offers. */
export const OFFER = 3;

/** XP: a kill is worth a tenth of the foe kind's own hp (a boss three times that); the killer takes it all, every other hero a share; a wave clear gives each hero `waveXp`. */
export const XP_ALL_SHARE = 0.25;
export const waveXp = (n: number): number => 20 + 4 * n;
export const xpNeed = (lv: number): number => 90 + 45 * lv;
/** What a level adds, as shares of the hero's base hp and attack. */
export const LV_HP = 0.07;
export const LV_ATK = 0.06;
export const lvMult = (lv: number): { hp: number; atk: number } => ({ hp: 1 + LV_HP * lv, atk: 1 + LV_ATK * lv });

/* ------------------------------------------------------------------ the state */

/** A hero of the run: its kind, run level and XP, and the tile it guards (null while it waits on the bench). */
export interface StandHero {
  id: number;
  kind: string;
  lv: number;
  xp: number;
  post: [number, number] | null;
  /** Fallen in this run: stays down to its end (absent in older saves, where everyone saved was standing). */
  fallen?: boolean;
  /** The foes it has felled this run (its summons' kills count for it); absent is none. */
  kills?: number;
}

/** What is saved of a run: enough to build it again at the start of a break. */
export interface StandRun {
  v: 1;
  seed: number;
  area: Area;
  /** The armies open when it began, whose foes join the waves later on. */
  armies: string[];
  /** The wave about to come (or being fought). */
  wave: number;
  gold: number;
  heroes: StandHero[];
  nextId: number;
  relics: string[];
  offer: string[];
  /** The king's health as a share of the whole. */
  king: number;
  kills: number;
  earned: number;
  /** The best wave reached before this run (for the "new best" line). */
  prevBest: number;
  over: boolean;
  best: number;
  summary?: StandSummary;
}

/** What a finished run pays (kept on the run, shown on the end screen). */
export interface StandSummary {
  best: number;
  cleared: number;
  crowns: number;
  bronze: number;
  silver: number;
  gold: number;
  gear: string[];
  kills: number;
  heroes: number;
  relics: number;
  newBest: boolean;
}

/** A foe still to come: when (ms into the wave), what, where. */
interface Spawn {
  at: number;
  def: string;
  edge: Edge;
  boost: Boost;
}

/** Things that happened that the page shows (the battle's own events are returned by `stepStand`). */
export type StandNote =
  | { kind: 'wave'; n: number; boss: boolean }
  | { kind: 'clear'; n: number; gold: number }
  | { kind: 'levelup'; unit: number; level: number }
  | { kind: 'kingHit'; dmg: number }
  /** A hero fell, for good. */
  | { kind: 'fallen'; unit: number; hero: number }
  /** The last foes of the wave are being hunted down (the heroes have left their posts). */
  | { kind: 'hunt' }
  | { kind: 'over'; best: number };

export type StandPhase = 'deploy' | 'wave' | 'break' | 'over';

/** What a run needs to know about the player's save: each kind's boost, the castle, the heroes it may hire. */
export interface StandSetup {
  /** A hero kind's hp and attack and the rest of its boost (its lasting level, rank, equipment). */
  boost(kind: string): Boost;
  castle: Castle;
}

export interface Stand {
  run: StandRun;
  setup: StandSetup;
  b: Battle;
  phase: StandPhase;
  king: Unit;
  queue: Spawn[];
  /** When (battle time) the wave began; the break's time left (ms). */
  waveAt: number;
  breakLeft: number;
  /** The next enrage step is due at this battle time. */
  rageAt: number;
  notes: StandNote[];
  /** The trait bonus the heroes have now (so a change in who is on the field is rescaled by the difference). */
  traitHp: number;
  traitAtk: number;
  /** The relics' hp and attack multipliers the heroes have now. */
  relicHp: number;
  relicAtk: number;
  baseMana: number;
  kingGrace: number;
}

/* ------------------------------------------------------------------ waves */

export interface WaveSpec {
  n: number;
  boss: boolean;
  /** The foes in the order they come (a boss first). */
  foes: string[];
  edges: Edge[];
  /** The foes' hp and attack multipliers (a boss gets `BOSS_HP`, `BOSS_ATK` of them on top). */
  hp: number;
  atk: number;
  /** How many foes the wave would have with no cap; past `FIELD_CAP` the strength carries it. */
  raw: number;
}

export const isBossWave = (n: number): boolean => n % BOSS_EVERY === 0;
/** The foes' strength at wave `n`, as a share of their stats in `foes.ts`. */
export const strength = (n: number): number => WAVE_START * (1 + WAVE_GROWTH * (Math.min(n, WAVE_KNEE) - 1) + WAVE_GROWTH_LATE * Math.max(0, n - WAVE_KNEE));
/** How many foes wave `n` would have with no cap. */
export const rawCount = (n: number): number => Math.round(WAVE_BASE + WAVE_STEP * n);

/** The ids of the foes a wave draws on at wave `n`: the field band of its block of waves, then (later) the next band and an army's. */
function pools(armies: readonly string[], n: number): { main: string[]; second: string[]; army: string[] } {
  const block = Math.floor((n - 1) / BAND_WAVES);
  const band = (i: number) => FOE_BANDS[FIELD_BANDS[i % FIELD_BANDS.length]];
  const open = armies.map((id) => armyById(id)).filter((a) => !!a);
  const army = open.length ? open[Math.floor(n / 4) % open.length]!.waves.filter((w) => !w.boss).flatMap((w) => [...w.foes]) : [];
  return { main: band(block), second: band(block + 1), army: n >= 10 ? army : [] };
}

/** Which edges wave `n` comes in by: one at first, two from wave 6, three from 11, all four from 16 (a boss wave from at least two). */
export function waveEdges(seed: number, n: number): Edge[] {
  const rng = new Rng(mixSeed(seed, 0x57e0, n));
  const want = Math.min(4, 1 + Math.floor((n - 1) / 5) + (isBossWave(n) ? 1 : 0));
  const pool = [...EDGES];
  const out: Edge[] = [];
  while (out.length < want) out.push(pool.splice(rng.int(0, pool.length - 1), 1)[0]);
  return out;
}

/** Wave `n` of a run: deterministic from the seed. */
export function waveSpec(seed: number, armies: readonly string[], n: number): WaveSpec {
  const rng = new Rng(mixSeed(seed, 0x57e1, n));
  const raw = rawCount(n);
  const count = Math.min(FIELD_CAP, raw);
  // (what the cap would have cut is paid in strength: half in hp and half in attack, so the wave's threat is what it was)
  const over = Math.sqrt(raw / count);
  const k = strength(n) * over;
  const boss = isBossWave(n);
  const p = pools(armies, n);
  const foes: string[] = [];
  if (boss) foes.push(...FOE_BANDS[BOSS_BANDS[(n / BOSS_EVERY - 1) % BOSS_BANDS.length]]);
  let i = 0;
  while (foes.length < count) {
    // (the band in turn; from wave 13 about a third come from the next band, and from wave 10 a fifth from an army's waves)
    const roll = rng.next();
    const from = n >= 10 && p.army.length && roll < 0.2 ? p.army : n >= 13 && roll < 0.5 ? p.second : p.main;
    foes.push(from === p.main ? from[i++ % from.length] : from[rng.int(0, from.length - 1)]);
  }
  return { n, boss, foes: foes.slice(0, Math.max(count, boss ? 5 : 0)), edges: waveEdges(seed, n), hp: k, atk: k, raw };
}

/* ------------------------------------------------------------------ building a run */

/** The setup of a save: the kinds' boosts as the armies would give them. */
export function setupFromMeta(m: Meta): StandSetup {
  return {
    boost: (kind) => ({
      ...boostOf({ id: 0, kind, grade: 1 }, heroRank(m, kind), levelOfKind(m, kind), heroStats(m, kind)),
      ...(awakenedOf(m, kind) ? { awaken: awakenedOf(m, kind) } : {}),
    }),
    castle: m.castle,
  };
}

/** A new run for a party (the hero kinds of a save's party). */
export function newStandRun(seed: number, party: readonly string[], armies: readonly string[] = [], prevBest = 0): StandRun {
  const run: StandRun = { v: 1, seed, area: standArea(seed), armies: [...armies], wave: 1, gold: START_GOLD, heroes: [], nextId: 1, relics: [], offer: [], king: 1, kills: 0, earned: 0, prevBest, over: false, best: 1 };
  for (const kind of party) run.heroes.push({ id: run.nextId++, kind, lv: 0, xp: 0, post: null });
  return run;
}

/** A hero's whole boost: the save's, then the run's levels. */
function boostFor(s: Stand, h: StandHero): Boost {
  const base = s.setup.boost(h.kind);
  const lv = lvMult(h.lv);
  return { ...base, hp: (base.hp ?? 1) * lv.hp, atk: (base.atk ?? 1) * lv.atk };
}

/** Whether a hero of the run is on the field: posted, and not fallen. */
export const standing = (h: StandHero): boolean => !!h.post && !h.fallen;

const heroUnits = (s: Stand): Unit[] => s.b.units.filter((u) => u.side === 'hero' && u.tag !== undefined && u.alive);
const unitOfHero = (s: Stand, id: number): Unit | undefined => s.b.units.find((u) => u.side === 'hero' && u.tag === id);

/** Where a kind stands in the ring: tanks out front, shooters and healers near the king, the rest between. */
export const roleOfKind = (kind: string): Role => (UNITS[kind] && isTank(UNITS[kind]) ? 'tank' : UNITS[kind]?.shot || (UNITS[kind]?.range ?? 1) >= 3 || CLASS_OF[kind] === 'support' || CLASS_OF[kind] === 'caster' ? 'inner' : 'mid');

/** The battle, the king and the run's heroes: a run from a save (the heroes whole; those with a post on it, the rest to be placed). */
export function startStand(run: StandRun, setup: StandSetup): Stand {
  const rl = relicEffects(run.relics);
  const castle = heroBoost(setup.castle);
  const mana = manaRate(setup.castle) * (rl.mana ?? 1);
  const { atk, hp, mana: _m, first, revive, gold: _g, set, ...team } = rl;
  const b = startBattle(run.seed, [], {
    board: standBoard(run.seed, run.area),
    heroes: { hp: castle.hp! * (hp ?? 1), atk: castle.atk! * (atk ?? 1) },
    mana,
    move: moveRate(setup.castle),
    relics: { team, first, revive, set },
  });
  b.phase = 'fight';
  const king = addUnit(b, KING_DEF, KING_AT.u, KING_AT.v, { size: 1.25 });
  king.facing = 1;
  king.hp = Math.max(1, Math.round(king.maxHp * run.king));
  b.stand = { king: king.id, at: { ...KING_AT }, fields: {} };
  const s: Stand = { run, setup, b, phase: 'deploy', king, queue: [], waveAt: 0, breakLeft: 0, rageAt: 0, notes: [], traitHp: 1, traitAtk: 1, relicHp: hp ?? 1, relicAtk: atk ?? 1, baseMana: mana, kingGrace: 0 };
  // (the heroes with a post stand on it; a new run's eight are set out in a ring round the keep: `ringPlan`)
  const fresh = run.heroes.filter((h) => !h.post);
  if (fresh.length) {
    const plan = ringPlan(b.board, fresh.map((h) => h.kind), roleOfKind, run.heroes.filter((h) => h.post).map((h) => ({ u: h.post![0], v: h.post![1] })));
    fresh.forEach((h, i) => (h.post = plan[i] ? [plan[i].u, plan[i].v] : null));
  }
  // (the fallen stay down: a run built again from its save leaves them off the field)
  for (const h of run.heroes) if (standing(h)) addHeroUnit(s, h);
  syncTraits(s);
  syncMana(s);
  if (!run.offer.length) run.offer = drawOffer(run, run.wave);
  return s;
}


function addHeroUnit(s: Stand, h: StandHero): Unit {
  const [u, v] = h.post!;
  const unit = addUnit(s.b, h.kind, u, v, boostFor(s, h), h.id);
  unit.post = { u, v, leash: leashOf(UNITS[h.kind]), tank: isTank(UNITS[h.kind]) };
  fxStart(s.b, unit);
  return unit;
}

/** The team bonus of the heroes on the field (their traits and the relics'), with the difference from what the heroes had before put on them. */
function syncTraits(s: Stand): void {
  const b = s.b;
  const fx = mergeEffects(traitEffects(kindsOf(b.units)), b.relics?.team ?? {});
  b.traits = fx;
  const hp = fx.hp ?? 1;
  const atk = fx.atk ?? 1;
  if (hp !== s.traitHp || atk !== s.traitAtk) {
    for (const u of heroUnits(s)) {
      const rh = hp / s.traitHp;
      const ra = atk / s.traitAtk;
      const was = u.maxHp;
      u.maxHp = Math.round(u.maxHp * rh);
      u.hp = Math.min(u.maxHp, u.hp + (u.maxHp - was));
      u.power = (u.power ?? 1) * ra;
    }
    s.traitHp = hp;
    s.traitAtk = atk;
  }
}

function syncMana(s: Stand): void {
  s.b.spells.rate = s.baseMana * (s.b.traits?.mana ?? 1);
}

/* ------------------------------------------------------------------ the post of a hero */

/** Put a hero on a tile (a bench hero comes onto the field; one on the field has its post moved, and walks there). False when the tile is not a place to post, is taken, or the field is full. */
export function postHero(s: Stand, id: number, u: number, v: number): boolean {
  const h = s.run.heroes.find((x) => x.id === id);
  if (!h || h.fallen || s.phase === 'over' || !canPost(s.b.board, u, v)) return false;
  if (s.b.units.some((x) => x.alive && x.u === u && x.v === v && x.tag !== id)) return false;
  const was = h.post;
  h.post = [u, v];
  const unit = unitOfHero(s, id);
  if (unit) {
    unit.post = { ...(unit.post ?? { leash: 0, tank: false }), u, v } as NonNullable<Unit['post']>;
    // (before the fight a hero simply stands on its new tile)
    if (s.phase === 'deploy') {
      unit.u = u;
      unit.v = v;
    }
  } else {
    addHeroUnit(s, h);
    syncTraits(s);
    syncMana(s);
  }
  return !was || was[0] !== u || was[1] !== v || true;
}

/* ------------------------------------------------------------------ levels and XP */

/** Give a hero a level now: its hp and attack rise, it is healed by what it gained. Returns the new level. */
function levelUp(s: Stand, h: StandHero, out?: StandNote[]): number {
  const before = lvMult(h.lv);
  h.lv++;
  const after = lvMult(h.lv);
  const u = unitOfHero(s, h.id);
  if (u?.alive) {
    const was = u.maxHp;
    u.maxHp = Math.round((u.maxHp * after.hp) / before.hp);
    u.hp = Math.min(u.maxHp, u.hp + (u.maxHp - was));
    u.power = ((u.power ?? 1) * after.atk) / before.atk;
    out?.push({ kind: 'levelup', unit: u.id, level: h.lv });
  }
  return h.lv;
}

/** Add XP to a hero; each level it reaches is taken at once. */
function giveXp(s: Stand, h: StandHero, xp: number): void {
  h.xp += xp;
  while (h.xp >= xpNeed(h.lv + 1)) {
    h.xp -= xpNeed(h.lv + 1);
    levelUp(s, h, s.notes);
  }
}

/* ------------------------------------------------------------------ the waves */

const killXpOf = (foe: Unit): number => killXp({ def: foe.def, maxHp: UNITS[foe.def].hp });

/** Begin the next wave: its foes are queued, to come in by its edges over the first seconds. */
function beginWave(s: Stand): void {
  const run = s.run;
  const spec = waveSpec(run.seed, run.armies, run.wave);
  const b = s.b;
  run.best = Math.max(run.best, run.wave);
  s.phase = 'wave';
  if (b.stand) b.stand.hunt = false;
  s.waveAt = b.t;
  s.rageAt = b.t + ENRAGE_AFTER;
  b.revived = false;
  b.foeBoost = { hp: spec.hp, atk: spec.atk };
  const gap = Math.max(100, Math.min(600, SPAWN_SPAN / spec.foes.length));
  s.queue = spec.foes.map((def, i) => ({
    at: i * gap,
    def,
    edge: spec.edges[i % spec.edges.length],
    boost: isBoss(def) ? { hp: spec.hp * bossShare(run.wave), atk: spec.atk * bossShare(run.wave), size: 1.5 } : { hp: spec.hp, atk: spec.atk },
  }));
  s.notes.push({ kind: 'wave', n: run.wave, boss: spec.boss });
}

/** The tile a foe comes in on: a free one on its edge (by a side stream of the run), or one row in. */
function spawnTile(s: Stand, edge: Edge, rng: Rng): At | null {
  const tiles = edgeTiles(s.b.board, edge);
  for (let tries = 0; tries < 10 && tiles.length; tries++) {
    const at = tiles[rng.int(0, tiles.length - 1)];
    // (a free tile, or one a step in from the edge)
    const step = edge === 'north' ? { u: at.u, v: at.v + 1 } : edge === 'south' ? { u: at.u, v: at.v - 1 } : edge === 'west' ? { u: at.u + 1, v: at.v } : { u: at.u - 1, v: at.v };
    for (const p of tries < 5 ? [at] : [at, step]) if (standable(tileAt(s.b.board, p.u, p.v)) && !s.b.units.some((x) => x.alive && x.u === p.u && x.v === p.v)) return p;
  }
  return null;
}

/** The foes still to come, and alive on the field. */
export const foesLeft = (s: Stand): number => s.queue.length + s.b.units.filter((u) => u.alive && u.side === 'foe').length;
export const foesAlive = (s: Stand): number => s.b.units.filter((u) => u.alive && u.side === 'foe').length;

/** Start the run's first wave (from the deploy phase). */
export function startFirstWave(s: Stand): boolean {
  if (s.phase !== 'deploy' || !s.run.heroes.some(standing)) return false;
  syncTraits(s);
  beginWave(s);
  return true;
}

/** End the break at once (the Go button). */
export function goNow(s: Stand): boolean {
  if (s.phase !== 'break') return false;
  s.breakLeft = 0;
  return true;
}

/** A relic offer for the break before wave `n`: up to `OFFER` unowned ones, drawn from a side stream of the run. */
export function drawOffer(run: StandRun, n: number): string[] {
  const rest = ALL_RELIC_IDS.filter((id) => !run.relics.includes(id));
  const rng = new Rng(mixSeed(run.seed, 0x57a7, n));
  const out: string[] = [];
  while (out.length < OFFER && rest.length) out.push(rest.splice(rng.int(0, rest.length - 1), 1)[0]);
  return out;
}

/** The wave is cleared: the pay, the XP, the break. */
function clearWave(s: Stand): void {
  const run = s.run;
  const n = run.wave;
  const gold = clearGold(n) + (relicEffects(run.relics).gold ?? 0);
  run.gold += gold;
  run.earned += gold;
  for (const h of run.heroes) if (standing(h)) giveXp(s, h, waveXp(n));
  // (the heroes standing get their breath back: the hurt mend a little; the fallen stay down)
  for (const u of s.b.units) {
    if (u.side !== 'hero' || u.tag === undefined || !u.alive) continue;
    u.hp = Math.min(u.maxHp, u.hp + Math.round(u.maxHp * CLEAR_HEAL * (u.healMult ?? 1)));
  }
  // (the hunt is over: the heroes walk back to their posts in the break)
  if (s.b.stand) s.b.stand.hunt = false;
  run.wave++;
  run.offer = drawOffer(run, run.wave);
  s.phase = 'break';
  s.breakLeft = BREAK_MS;
  s.notes.push({ kind: 'clear', n, gold });
}

/** The events of a tick that matter to the run: gold and XP for kills, the king's wounds. */
function settleEvents(s: Stand, events: BattleEvent[]): void {
  for (const e of events) {
    if (e.kind !== 'hit') continue;
    const to = s.b.units.find((u) => u.id === e.to);
    if (!to) continue;
    if (to.id === s.king.id) {
      s.notes.push({ kind: 'kingHit', dmg: e.dmg });
      continue;
    }
    if (!e.killed || to.side !== 'foe') continue;
    const by = s.b.units.find((u) => u.id === e.by);
    const who = by ? creditOf(s.b, by) : undefined;
    const gold = killGold(s.run.wave) + (isBoss(to.def) ? BOSS_GOLD : 0);
    s.run.gold += gold;
    s.run.earned += gold;
    s.run.kills++;
    const killer = who?.side === 'hero' && who.tag !== undefined ? s.run.heroes.find((h) => h.id === who.tag) : undefined;
    if (killer) killer.kills = (killer.kills ?? 0) + 1;
    const xp = killXpOf(to);
    for (const h of s.run.heroes) {
      if (!standing(h)) continue;
      const mine = who?.tag === h.id;
      giveXp(s, h, Math.round(xp * (mine ? 1 : XP_ALL_SHARE)));
    }
  }
}

/** One tick of the run (`TICK_MS`): the foes due come in, the battle steps, the kills are paid, a wave clears or the break runs down. Returns the battle's events for the page. */
export function stepStand(s: Stand): BattleEvent[] {
  if (s.phase === 'deploy' || s.phase === 'over') return [];
  const b = s.b;
  const run = s.run;
  if (s.phase === 'wave') {
    const into = b.t - s.waveAt;
    const rng = new Rng(mixSeed(run.seed, 0x57e2, run.wave, b.t));
    while (s.queue.length && s.queue[0].at <= into) {
      const sp = s.queue.shift()!;
      const at = spawnTile(s, sp.edge, rng);
      if (!at) {
        // (no room at that edge now: it comes a moment later)
        s.queue.push({ ...sp, at: into + 400 });
        s.queue.sort((x, y) => x.at - y.at);
        break;
      }
      const foe = addUnit(b, sp.def, at.u, at.v, sp.boost);
      foe.facing = at.v === 0 ? 1 : at.v === FIELD_LAST ? 3 : at.u === 0 ? 0 : 2;
      if (b.relics?.first) foe.busyUntil = b.t + b.relics.first;
    }
    // (a wave that drags on is enraged)
    if (b.t >= s.rageAt) {
      s.rageAt += ENRAGE_EVERY;
      for (const u of b.units) if (u.alive && u.side === 'foe') u.power = (u.power ?? 1) * ENRAGE_STEP;
    }
  }
  const events = stepBattle(b);
  settleEvents(s, events);
  markFallen(s);
  // (the last foes of a wave are hunted down; the heroes go back when it clears)
  if (s.phase === 'wave' && b.stand) {
    const left = s.queue.length ? Infinity : foesAlive(s);
    const hunt = left > 0 && left <= HUNT_AT;
    if (hunt && !b.stand.hunt) s.notes.push({ kind: 'hunt' });
    b.stand.hunt = hunt;
  }
  // (the fallen are dropped from the list a moment after they fall)
  if (b.t % 1000 === 0) dropCorpses(s);
  if (b.phase === 'lost' || !s.king.alive) return endRun(s, events);
  if (s.phase === 'wave' && !s.queue.length && !b.units.some((u) => u.alive && u.side === 'foe')) clearWave(s);
  else if (s.phase === 'break') {
    s.breakLeft -= TICK_MS;
    if (s.breakLeft <= 0) beginWave(s);
  }
  return events;
}

const FIELD_LAST = 23;

/** A hero whose unit has fallen is marked so, for good: no rising at the clear, no XP, no levels, and it is left off the field when the run is built again. */
function markFallen(s: Stand): void {
  for (const h of s.run.heroes) {
    if (h.fallen || !h.post) continue;
    const u = unitOfHero(s, h.id);
    if (u && !u.alive) {
      h.fallen = true;
      s.notes.push({ kind: 'fallen', unit: u.id, hero: h.id });
    }
  }
}

/** Drop the foes that fell a while ago, unless something in the battle still points at one (a burn or a bleed it laid, a shot in the air, one it called up). */
function dropCorpses(s: Stand): void {
  const b = s.b;
  if (!b.units.some((u) => !u.alive && u.side === 'foe' && b.t - (u.diedAt ?? b.t) >= CORPSE_MS)) return;
  const held = new Set<number>();
  for (const p of b.pending) (held.add(p.by), held.add(p.to));
  for (const z of b.zones) held.add(z.by);
  for (const t of b.traps ?? []) held.add(t.by);
  for (const u of b.units) {
    if (u.dot) held.add(u.dot.by);
    if (u.hot?.by !== undefined) held.add(u.hot.by);
    if (u.owner !== undefined) held.add(u.owner);
    if (u.taunt) held.add(u.taunt.to);
  }
  for (const id of b.combo?.ids ?? []) held.add(id);
  b.units = b.units.filter((u) => u.alive || u.side === 'hero' || held.has(u.id) || b.t - (u.diedAt ?? b.t) < CORPSE_MS);
}

function endRun(s: Stand, events: BattleEvent[]): BattleEvent[] {
  s.phase = 'over';
  s.run.over = true;
  s.run.king = 0;
  s.notes.push({ kind: 'over', best: s.run.best });
  return events;
}

/* ------------------------------------------------------------------ buying */

/** Why a buy is refused now, if it is. */
export type Refusal = 'over' | 'gold' | 'full' | 'none';

/** The hero a level-up goes to when none is named: the lowest level on the field (the lowest id of equals). */
export const weakestHero = (s: Stand): StandHero | undefined => [...s.run.heroes].filter(standing).sort((x, y) => x.lv - y.lv || x.id - y.id)[0];

export function levelBlock(s: Stand, id?: number): Refusal | null {
  const h = id === undefined ? weakestHero(s) : s.run.heroes.find((x) => x.id === id);
  if (!h || h.fallen) return 'none';
  if (s.phase === 'over') return 'over';
  return s.run.gold < levelCost(h.lv) ? 'gold' : null;
}

/** Pay for a level for a hero (the lowest-level one on the field unless one is named). Returns the new level, or null. */
export function buyLevel(s: Stand, id?: number): number | null {
  if (levelBlock(s, id)) return null;
  const h = id === undefined ? weakestHero(s)! : s.run.heroes.find((x) => x.id === id)!;
  s.run.gold -= levelCost(h.lv);
  return levelUp(s, h, s.notes);
}

/** The price of the relic at `i` of the offer. */
export const offerCost = (s: Stand): number => relicCost(s.run.relics.length, s.run.wave);

/** Buy the relic at `i` of the break's offer: it works at once for the whole team. */
export function buyRelic(s: Stand, i: number): string | null {
  const id = s.run.offer[i];
  if (!id || s.phase === 'over' || s.run.gold < offerCost(s)) return null;
  s.run.gold -= offerCost(s);
  s.run.relics.push(id);
  s.run.offer.splice(i, 1);
  const rl = relicEffects(s.run.relics);
  const b = s.b;
  const { atk, hp, mana, first, revive, gold: _g, set, ...team } = rl;
  b.relics = { team, first, revive, set };
  // (hp and attack rise at once, by the difference from what the relics gave before)
  const rh = (hp ?? 1) / s.relicHp;
  const ra = (atk ?? 1) / s.relicAtk;
  for (const u of heroUnits(s)) {
    const was = u.maxHp;
    u.maxHp = Math.round(u.maxHp * rh);
    u.hp = Math.min(u.maxHp, u.hp + (u.maxHp - was));
    u.power = (u.power ?? 1) * ra;
  }
  s.relicHp = hp ?? 1;
  s.relicAtk = atk ?? 1;
  s.baseMana = manaRate(s.setup.castle) * (mana ?? 1);
  syncTraits(s);
  syncMana(s);
  return id;
}

export const relicLine = (id: string): string => `${RELICS[id].name}: ${RELICS[id].text}`;

/** Heal the king by `KING_HEAL` of his health. Returns the hp given, or null (over, gold short, or he is whole). */
export function healKing(s: Stand): number | null {
  const k = s.king;
  if (s.phase === 'over' || !k.alive || k.hp >= k.maxHp || s.run.gold < healCost(s.run.wave)) return null;
  s.run.gold -= healCost(s.run.wave);
  const give = Math.min(k.maxHp - k.hp, Math.round(k.maxHp * KING_HEAL));
  k.hp += give;
  return give;
}

/* ------------------------------------------------------------------ the end, the save, the old climb */

/** The run as it stands for saving at a break: the king's health, and the heroes' posts, are already in it. */
export function snapshot(s: Stand): StandRun {
  s.run.king = s.king.alive ? s.king.hp / s.king.maxHp : 0;
  return s.run;
}

/** What the run has cleared: the waves before the one it is in (a wave in progress does not count). */
export const clearedOf = (run: StandRun): number => Math.max(0, run.wave - 1);

/**
 * Pay a finished run, once: crowns for each wave cleared (`waveCrowns`), chests into the
 * stash (a bronze every 8 waves, a silver every 13, a gold every 39) and a chance of equipment, from the run's seed. The
 * best wave is kept in the meta.
 */
export function settleStand(m: Meta, run: StandRun, armies: readonly string[] = run.armies): StandSummary | null {
  if (!run.over) return null;
  if (run.summary) return run.summary;
  const cleared = clearedOf(run);
  let crowns = 0;
  for (let w = 1; w <= cleared; w++) crowns += waveCrowns(w);
  m.crowns += crowns;
  const bosses = Math.floor(cleared / 13);
  const c = chestsFor(cleared, bosses);
  const open = armies.filter((id) => armyById(id) && armyUnlocked(m, id));
  const army = armyById(open[Math.min(open.length - 1, Math.floor(cleared / 13))] ?? ARMIES[0].id)!;
  let n = 0;
  const give = (at: number, count: number) => {
    for (let i = 0; i < count; i++) m.stash.push({ army: army.id, at, tier: 0, seed: mixSeed(run.seed, 0x70e7, ++n), tower: true } satisfies StashChest);
  };
  give(3, c.bronze);
  give(5, c.silver);
  give(10, c.gold);
  const gear: string[] = [];
  const rng = new Rng(mixSeed(run.seed, 0xe9a1));
  const quality = cleared >= 39 ? 'gold' : cleared >= 13 ? 'silver' : 'bronze';
  for (let i = 0; i < 1 + Math.floor(bosses / 2); i++) {
    if (!rng.chance(gearChance(cleared))) continue;
    gear.push(itemName(grantEquipment(m, rollEquipment(rng, { quality, armyIndex: armyIndex(army.id), milestone: cleared >= 39 }))));
  }
  const newBest = run.best > (m.stand ?? 0);
  m.stand = Math.max(m.stand ?? 0, run.best);
  run.summary = { best: run.best, cleared, crowns, ...c, gear, kills: run.kills, heroes: run.heroes.length, relics: run.relics.length, newBest };
  return run.summary;
}

export const STAND_KEY = 'legends.stand';

export const saveStand = (run: StandRun, store: Pick<Storage, 'setItem'> = localStorage) => store.setItem(STAND_KEY, JSON.stringify(run));
export const dropStand = (store: Pick<Storage, 'removeItem'> = localStorage) => store.removeItem(STAND_KEY);
/** The run saved in the Last Stand's slot, if it is a run still going. */
export function loadStand(store: Pick<Storage, 'getItem'> = localStorage): StandRun | null {
  try {
    const r = JSON.parse(store.getItem(STAND_KEY) ?? 'null') as StandRun | null;
    const ok = r && r.v === 1 && !r.over && Number.isFinite(r.seed) && r.wave >= 1 && Array.isArray(r.heroes) && r.heroes.length > 0 && Array.isArray(r.relics);
    return ok ? { ...r, offer: Array.isArray(r.offer) ? r.offer : [], armies: Array.isArray(r.armies) ? r.armies : [] } : null;
  } catch {
    return null;
  }
}

/** The start of a break is the place a run is saved: its battle is built again from the record, the wave still to come. */
export const canSave = (s: Stand): boolean => s.phase === 'break' || s.phase === 'deploy';

/**
 * The old spire climb is gone. A climb still saved (in the Tower's slot, or in the ordinary one by a very old save) is dropped, and what it had
 * earned is paid once as the old end of a run was (`settleTower`: its chests and equipment; its crowns were paid fight by fight). Returns a line
 * for the page to show, or null when there was none. Anything unreadable is dropped with a plain note.
 */
export function migrateOldClimb(m: Meta, store: Pick<Storage, 'getItem' | 'removeItem'>): string | null {
  let note: string | null = null;
  for (const key of ['legends.tower', 'legends.run']) {
    let run: Run | null = null;
    try {
      run = JSON.parse(store.getItem(key) ?? 'null') as Run | null;
    } catch {
      run = null;
    }
    if (!run || run.mode?.kind !== 'tower') continue;
    store.removeItem(key);
    const floors = Math.max(0, (run.stage ?? 1) - 1);
    try {
      run.over = true;
      if (run.tower) {
        const sum = settleTower(m, run);
        note = `The old tower climb has been closed: its ${floors} floors paid ${sum ? `${sum.bronze + sum.silver + sum.gold} chests and ${sum.gear.length} pieces of equipment` : 'nothing more'}. The Tower is now the Last Stand.`;
      }
    } catch {
      /* (a record that cannot be settled pays nothing) */
    }
    note ??= 'The old tower climb has been closed. The Tower is now the Last Stand.';
  }
  return note;
}

/** The eight heroes of a run from a save: the ones chosen (kept, in order), then the strongest owned (by level) that are left. Fewer if fewer are owned. */
export function pickEight(m: Meta, chosen: readonly string[] = m.party): string[] {
  const out = [...new Set(chosen)].filter((k) => m.unlocked.includes(k)).slice(0, FIELD_HEROES);
  const rest = m.unlocked.filter((k) => !out.includes(k) && !UNITS[k]?.summon).sort((x, y) => levelOfKind(m, y) - levelOfKind(m, x));
  while (out.length < FIELD_HEROES && rest.length) out.push(rest.shift()!);
  return out;
}
