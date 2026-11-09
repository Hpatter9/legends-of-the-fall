// The Assault on a hold (phase 1, `docs/notes/assault-1.md`; the design `docs/design/assault-mode.md`): one long real-time battle on a hold's
// 100 x 100 field. The five heroes each lead a platoon of up to ten soldiers against the garrison's 200, the army's Council at its posts and
// its lord on the throne. The lord's fall wins; all five heroes down at once loses; twelve minutes of battle time is night, a withdrawal.
//
// It is a battle like any other (`startBattle`, `fight`, `stepBattle`), with `Battle.field` set: the occupancy grid and buckets, the sector
// graph, and the hold's own state (`holdTypes.ts`). The battle's own engine calls this module's hooks (`fieldHooks`, filled in as this module
// is first imported) only on a fight with a field, so no other fight changes:
//
// - the heroes keep their whole minds (kits, ultimates, auras, statuses), with their orders first (`lead`) and their sight bounded (`sight`);
// - the soldiers steer to their slots round their hero, take on what comes within reach, and strike through the battle's own `swing`;
// - the garrison sleeps at its posts until woken (the hold's mind, `holdMind.ts`); its officers and lord keep their whole minds too;
// - the structures stand on their tiles and break by hand (`forts.ts`).
//
// Deterministic: nothing here reads a clock or draws a random number of its own. The blows draw from the fight's stream, units decide in id
// order, and the platoons' orders are logged and applied at the next tick. Pure rules: no Pixi, no DOM.

import { defOf, fight, fieldHooks, hurt, startBattle, stepBattle, stepTo, strikeDef, swing, canStrike, wayTo, WAIT_MS, type Battle, type BattleEvent, type Boost, type Unit } from '../battle';
import { canStep, DIRS, type At } from '../board';
import { flankStep, flankValue } from '../battle';
import { isBoss } from '../foes';
import { hidden } from '../equipFx';
import { nearFirstStep, nearIndex, nearPath, walkNear } from '../path';
import { Rng } from '../rng';
import { UNITS } from '../units';
import { forNear, newField, occClear, rebuildBuckets, type FieldGroup, type FieldState } from './field';
import { jumpClass, nextRegion, reaches, regionAt } from './sectors';
import { buildHold, ringOf, type HoldMap } from './fieldMap';
import { BLOODTUSK } from './maps/orcs';
import type { Blueprint } from './blueprint';
import { addFieldUnit, ASSAULT, archersOnly, buildGarrison, freeNear } from './garrison';
import { barrelOnForts, canStrikeFort, drumsBeating, landFortHits, makeForts, strikeFort } from './forts';
import { anchorOf, DRUM_BLOW, holdTick, nearDrum } from './holdMind';
import { applyQueued, CHARGE_MOVE, defaultFormation, ENGAGE, FORMATION_FX, givePlatoon, HERO_LEASH, LEADERLESS, LEASH, replayEntries, slotAt } from './platoons';
import type { AssaultInput, AssaultLogEntry, AssaultOutcome, HoldState, PlatoonRole, PlatoonState, PostState } from './holdTypes';
import { ELITE_TRICK, kindOfUnit, rankOf, troopBoost, troopUnitOf, troopOf, TRICKS } from './troops';
import { SPLASH_SHARE } from '../units';
import { callVolley, carrying, KEG_SLOW, plantGoal, worksTick } from './works';
import { duelBlow, duelSight, duelTick, inDuel } from './gateDuel';
import { flightTick, tauntTick } from './warAnswer';
import { FIRE_RANGE, hasShooters, hutNear, looseFire, ramMind, RAM, scaleAim, scaleGoal, siegeBlow, siegeTick, startSiege, SUPPRESS_R, SUPPRESS_RANGE } from './siege';

/** The assault's longest: twelve minutes of battle time (5.5); the rout runs this long after the lord falls before the hold is taken. */
export const ASSAULT_LIMIT_MS = 12 * 60_000;
export const ROUT_MS = 5000;
/** A platoon at most this many soldiers (3.1). */
export const PLATOON_MAX = 10;
/** Fall back goes no faster than the Shieldguard walk. */
export const FALLBACK_MS = 800;
/** How far a fighter's own mind looks for foes on the field. */
export const SIGHT = 10;
/** A leader waits this long at a time for its stragglers. */
const WAIT_MAX = 3000;
/** A soldier that finds no step for this long asks for a bounded walk. */
const STUCK_MS = 2000;
/** A cheap mind in its place with nothing near looks again after this long (not every `WAIT_MS`). */
const IDLE_MS = 700;
/** A walk keeps this many steps of its search for the decisions after (searching again once they are walked, or one is blocked). */
const PATH_STEPS = 4;
/** A waypoint of a route counts as reached this near. */
const WAYPOINT = 5;

/** The parts the platoons take when the plan names none: two on the main push, one in cover, one on the flank, one more on the push. */
export const DEFAULT_ROLES: readonly PlatoonRole[] = ['main', 'main', 'cover', 'flank', 'main'];
/** A flanking platoon goes this far beyond its foe, on the side away from where it started, before it strikes. */
export const FLANK_REACH = 3;

/** The holds built so far (a hold's field is the same every time, so it is built once and copied for each assault). */
const BLUEPRINTS: Record<string, Blueprint> = { orcs: BLOODTUSK };
const built = new Map<string, HoldMap>();
/** A hold's blueprint, if the army has one. */
export const blueprintOf = (army: string): Blueprint | undefined => BLUEPRINTS[army];
/** A hold's field as built (shared; `startAssault` fights on a copy). */
export function holdMapOf(army: string): HoldMap | undefined {
  const bp = BLUEPRINTS[army];
  if (!bp) return undefined;
  let m = built.get(army);
  if (!m) built.set(army, (m = buildHold(bp)));
  return m;
}

const holdOf = (b: Battle): HoldState | undefined => b.field?.hold;
const dist = (a: At, z: At) => Math.abs(a.u - z.u) + Math.abs(a.v - z.v);

// ---- the start -----------------------------------------------------------------------------------------------------------------

/** Begin an assault: the hold built, our platoons at the Landing on their approaches, the garrison at its posts. Phase 'fight', ready to step.
 *  The same input always gives the same assault. */
export function startAssault(input: AssaultInput): Battle {
  const bp = BLUEPRINTS[input.army];
  if (!bp) throw new Error(`no hold for ${input.army}`);
  const map = holdMapOf(input.army)!;
  const b = startBattle(input.seed, [], { board: map.board, ...(input.castle ? { heroes: input.castle } : {}), ...(input.mana ? { mana: input.mana } : {}) });
  const f = newField(b.board, map.zone);
  b.field = f;
  const share = input.foeShare ?? ASSAULT.foeShare;
  const forts = makeForts(map.forts, input.army, share, input.tier);
  const h: HoldState = {
    bp, input, forts, fortAt: new Map(), posts: [], platoons: [], lord: -1, bands: 0, auto: !!input.auto, queue: [], log: [], events: [], fallen: [], foesTotal: 0, garrison: [], fortKills: {},
    kinds: Object.fromEntries(forts.map((x) => [x.spec.id, x.spec.kind])), hits: [], cleaves: [], blows: {}, down: {}, kills: {}, stakes: new Uint8Array(b.board.w * b.board.d),
    siege: { ladders: [], huts: [], arrows: [], zones: [], trebReady: 0, wallHits: {} }, warpath: { held: false, marching: [] },
  };
  for (const hz of b.board.hazards ?? []) if (hz.kind === 'spikes') for (const t of hz.tiles) h.stakes[t] = 1;
  forts.forEach((x, i) => x.spec.tiles.forEach((t) => h.fortAt.set(t, i)));
  f.hold = h;
  // our platoons at the Landing: each hero, its soldiers round it, on its approach
  input.heroes.slice(0, 5).forEach((hero, k) => {
    const g: FieldGroup = { id: f.groups.length, side: 'hero', name: UNITS[hero.kind].name, leader: 0, members: [], home: { ...bp.muster[k % bp.muster.length] }, awake: true, route: [], heading: 3 };
    f.groups.push(g);
    const lead = addFieldUnit(b, f, hero.kind, freeNear(b, f, g.home, false), hero.boost, g.id, 0, hero.sheet);
    g.leader = lead.id;
    g.members.push(lead.id);
    const troop = troopOf(hero.kind);
    const unitId = troopUnitOf(hero.kind);
    const marks = (input.troops[hero.kind] ?? []).slice(0, PLATOON_MAX);
    const castle = input.castle ?? {};
    const role = input.roles?.[hero.kind] ?? DEFAULT_ROLES[k % DEFAULT_ROLES.length];
    const pl: PlatoonState = { group: g.id, hero: hero.kind, heroId: lead.id, troop, soldiers: [], route: [], order: { kind: 'hold', at: { ...g.home } }, formation: input.formations?.[hero.kind] ?? defaultFormation({ troop }), role };
    marks.forEach((m, index) => {
      const tb = troopBoost(hero.level, m);
      // (the castle's boost is for heroes: a soldier's own numbers are its kind's, its hero's level and its rank, nothing else)
      const boost: Boost = { hp: tb.hp / (castle.hp ?? 1), atk: tb.atk / (castle.atk ?? 1) };
      const unit = addFieldUnit(b, f, unitId, freeNear(b, f, g.home, false), boost, g.id, index + 1);
      g.members.push(unit.id);
      pl.soldiers.push({ id: unit.id, slot: index + 1, marks: m, kills: 0, index });
    });
    // (the opening plan: a Move along the approach, from the first tick)
    const way = bp.approaches.find((a) => a.id === (input.approaches?.[hero.kind] ?? 'bridge')) ?? bp.approaches[1];
    pl.route = way.way.map((p) => ({ ...p }));
    pl.order = { kind: 'move', at: { ...way.way[way.way.length - 1] } };
    h.platoons.push(pl);
  });
  buildGarrison(b, f, h, input);
  h.siege = startSiege(b, f, h);
  h.foesTotal = h.garrison.length + bp.reinforce.bands * bp.reinforce.roster.replace(/ /g, '').length;
  fight(b);
  return b;
}

// ---- the field's tick ----------------------------------------------------------------------------------------------------------

function tick(b: Battle, out: BattleEvent[]): void {
  const f = b.field!;
  const h = f.hold;
  f.stats.ticks++;
  // (the last tick's count of decisions, before it starts again)
  f.stats.mostDecided = Math.max(f.stats.mostDecided, f.stats.tickDecided);
  f.stats.tickWalks = 0;
  f.stats.tickDecided = 0;
  if (!h) return;
  h.events = [];
  applyQueued(b, h);
  // (the grid and the buckets: a fighter a skill called up joins the field; one a kit carried off its tile is put back where it stands)
  f.occ.fill(-1);
  for (const x of b.units) {
    if (!f.byId[x.id]) {
      f.byId[x.id] = x;
      f.info[x.id] = { def: UNITS[x.def], sheet: UNITS[x.def].sheet, role: 'leader', group: -1, slot: 0 };
    }
    if (x.alive && !x.under) f.occ[x.v * f.w + x.u] = x.id;
  }
  // (the two in a duel's ring are left out of the buckets: nobody outside it looks for them)
  rebuildBuckets(f, h.duel?.state === 'fighting' ? b.units.filter((x) => !inDuel(h, x.id)) : b.units);
  landFortHits(b, h, out);
  landCleaves(b, h, out);
  noteFalls(f, h);
  holdTick(b, f, h, out);
  siegeTick(b, f, h, (pl) => anchorOf(f, pl), out);
  worksTick(b, h, (pl) => anchorOf(f, pl), out);
  duelTick(b, f, h, out);
  flightTick(b, f, h, out);
  tauntTick(f, h);
  // (the platoons' own upkeep: a charge runs out, a soldier walks for a downed hero)
  h.platoons.forEach((pl, k) => {
    if (pl.order.kind === 'charge' && b.t >= (pl.chargeUntil ?? 0)) {
      const a = anchorOf(f, pl);
      pl.order = { kind: 'move', at: a ? { u: a.u, v: a.v } : pl.order.at };
    }
    const hero = f.byId[pl.heroId];
    if (!hero.alive && !(pl.acting !== undefined && f.byId[pl.acting]?.alive)) pl.acting = pl.soldiers.find((s) => f.byId[s.id]?.alive)?.id;
    // (a platoon plays its part in the plan on its own until the player orders it; Auto hands them all back to it)
    if ((h.auto || !pl.manual) && f.stats.ticks % 10 === (k * 2) % 10) bot(b, f, h, k);
  });
  // (the bot's Tactical style calls the trebuchet on the Iron Gate once a platoon of ours is near it)
  if (h.input.tactical && f.stats.ticks % 10 === 5) {
    const iron = h.forts.find((x) => x.spec.kind === 'ironGate');
    const t = iron?.spec.tiles[0];
    if (iron && !iron.broken && t !== undefined && h.platoons.some((pl) => { const a = anchorOf(f, pl); return !!a && dist(a, iron.spec.front) <= 15; }))
      callVolley(b, t % b.board.w, Math.floor(t / b.board.w));
  }
}

/** The soldiers fallen since the last tick: each is gone for good, written to the save as it happens (`assaultMode.ts` reads the events). */
function noteFalls(f: FieldState, h: HoldState): void {
  h.platoons.forEach((pl, k) => {
    for (const s of pl.soldiers) {
      if (h.down[s.id] || f.byId[s.id]?.alive) continue;
      h.down[s.id] = true;
      h.fallen.push({ hero: pl.hero, index: s.index, marks: s.marks });
      h.events.push({ kind: 'fell', platoon: k, soldier: s.id, index: s.index });
    }
  });
}

/** The Blades' cleaves that land now: half the blow on the target's foes beside it. */
function landCleaves(b: Battle, h: HoldState, out: BattleEvent[]): void {
  if (!h.cleaves.length) return;
  const f = b.field!;
  const keep: typeof h.cleaves = [];
  for (const c of h.cleaves) {
    if (c.at > b.t) {
      keep.push(c);
      continue;
    }
    const by = f.byId[c.by];
    const to = f.byId[c.to];
    if (!by?.alive || !to) continue;
    for (const [du, dv] of DIRS) {
      const id = f.occ[(to.v + dv) * f.w + to.u + du];
      const x = id >= 0 ? f.byId[id] : undefined;
      if (x?.alive && x.side !== by.side) hurtSplash(b, by, x, c.dmg, out);
    }
  }
  h.cleaves = keep;
}

// (the battle's `hurt`, kept behind one call so the cleave reads as a splash)
const hurtSplash = (b: Battle, by: Unit, to: Unit, dmg: number, out: BattleEvent[]) => hurt(b, by, to, dmg, false, true, out, 'blow');

// ---- the minds -----------------------------------------------------------------------------------------------------------------

/** Whether a foe keeps its whole mind on the field: a post's leader that is a nemesis or a boss (the officers and the lord). */
const wholeMind = (f: FieldState, me: Unit) => f.info[me.id]?.slot === 0 && (!!me.nem || isBoss(me.def));

/** The cheap minds (the `decide` hook): true when it decided for `me`. Heroes, the officers and the lord, and fighters a skill called up
 *  keep the battle's own mind. */
function cheapDecide(b: Battle, me: Unit, rng: Rng, out: BattleEvent[]): boolean {
  const f = b.field!;
  const h = f.hold;
  const info = f.info[me.id];
  if (!h || !info || info.group < 0) return false;
  // (the two in a duel's ring fight by their own whole minds, each seeing only the other)
  if (inDuel(h, me.id)) return false;
  const g = f.groups[info.group];
  if (me.side === 'hero') {
    if (info.slot === 0) return false;
    f.stats.decided++;
    f.stats.tickDecided++;
    const pl = h.platoons.find((p) => p.group === g.id)!;
    if (me.def === RAM.id) {
      ramMind(b, f, h, me, anchorOf(f, pl), out, (to) => walkStep(b, f, me, to, out, false));
      return true;
    }
    soldierMind(b, f, h, pl, me, rng, out);
    return true;
  }
  const post = h.posts.find((p) => p.group === g.id);
  if (!post) return false;
  if (wholeMind(f, me) && post.mood !== 'posted') return false;
  f.stats.decided++;
  f.stats.tickDecided++;
  foeMind(b, f, h, post, me, rng, out);
  return true;
}

/** The nearest foe of `me` it can strike from here, within `r` (by steps; ties by the buckets' fixed order). */
function nearestFoe(b: Battle, f: FieldState, me: Unit, r: number, strikable: boolean): Unit | null {
  let best: Unit | null = null;
  let bd = Infinity;
  const def = strikable ? strikeDef(b, me) : null;
  forNear(f, me.u, me.v, r, (x) => {
    if (x.side === me.side || hidden(b, x)) return;
    const d = dist(me, x);
    if (d >= bd) return;
    if (def && !canStrike(b.board, def, me, x)) return;
    bd = d;
    best = x;
  });
  return best;
}

/** Strike: a skirmisher steps round to a side first (its Flank), anyone else swings. */
function strike(b: Battle, me: Unit, to: Unit, rng: Rng, out: BattleEvent[]): void {
  if (kindOfUnit(me.def) === 'skirmishers') {
    const round = flankStep(b, me, strikeDef(b, me), to, true);
    if (round >= 0) return stepTo(b, me, round, out);
  }
  swing(b, me, to, rng, out);
}

/** Where a platoon's order sends it now: a point to walk to (null to stand), and whether it fights on the way. */
function orderGoal(b: Battle, f: FieldState, h: HoldState, pl: PlatoonState, me: Unit): { at: At | null; fights: boolean; fort?: number } {
  const o = pl.order;
  switch (o.kind) {
    case 'fallback':
      return { at: o.at, fights: false };
    case 'hold':
      return { at: null, fights: true };
    case 'focus': {
      const x = f.byId[o.unit];
      if (!x?.alive) {
        pl.order = { kind: 'move', at: x ? { u: x.u, v: x.v } : { u: me.u, v: me.v } };
        return { at: pl.order.at, fights: true };
      }
      return { at: { u: x.u, v: x.v }, fights: true };
    }
    case 'assault': {
      const i = h.forts.findIndex((x) => x.spec.id === o.fort);
      const fort = h.forts[i];
      if (!fort || fort.broken || fort.open) {
        // (the way is open: go through it)
        const t = fort?.spec.tiles[0];
        const at = t !== undefined ? { u: t % b.board.w, v: Math.floor(t / b.board.w) } : { u: me.u, v: me.v };
        pl.order = { kind: 'move', at };
        return { at, fights: true };
      }
      return { at: fort.spec.front, fights: true, fort: i };
    }
    case 'flank': {
      // (round to the far side of the foe, away from where the platoon stands, and strike it from there)
      const x = f.byId[o.unit];
      if (!x?.alive) {
        pl.order = { kind: 'move', at: x ? { u: x.u, v: x.v } : { u: me.u, v: me.v } };
        return { at: pl.order.at, fights: true };
      }
      const du = Math.sign(x.u - me.u);
      const dv = Math.sign(x.v - me.v);
      const at = { u: Math.max(0, Math.min(f.w - 1, x.u + du * FLANK_REACH)), v: Math.max(0, Math.min(f.d - 1, x.v + dv * FLANK_REACH)) };
      if (dist(me, at) <= 2 || dist(me, x) <= 2) {
        pl.order = { kind: 'focus', unit: o.unit };
        return { at: { u: x.u, v: x.v }, fights: true };
      }
      return { at, fights: false };
    }
    case 'charge': {
      const x = nearestFoe(b, f, me, 20, false);
      return { at: x ? { u: x.u, v: x.v } : null, fights: true };
    }
    case 'move': {
      while (pl.route.length > 1 && dist(me, pl.route[0]) <= WAYPOINT) pl.route.shift();
      return { at: pl.route[0] ?? o.at, fights: true };
    }
    case 'scale': {
      // (to the wall's foot, and once the ladder is up, onto the wall-walk; no wall or no kit, a Move there)
      const at = scaleGoal(b, f, pl, o.at);
      if (!at) {
        pl.order = { kind: 'move', at: o.at };
        return { at: o.at, fights: true };
      }
      if (!pl.ladder && pl.aim && b.board.tiles[pl.aim.top].ladder && dist(me, at) <= 1) pl.order = { kind: 'move', at };
      return { at, fights: true };
    }
    case 'fire': {
      // (within bow shot of the hut; burnt, or no shooters left, the platoon holds where it stands)
      const hut = h.siege.huts.find((x) => x.id === o.hut);
      if (!hut || hut.burning !== undefined || hut.burnt || !hasShooters(b, f, pl)) {
        pl.order = { kind: 'hold', at: { u: me.u, v: me.v } };
        return { at: null, fights: true };
      }
      const near = hutNear(b, hut, me);
      return { at: near.d > FIRE_RANGE - 1 ? near.at : null, fights: true };
    }
    case 'suppress':
      // (the shooters within range of the spot; the platoon holds there)
      return { at: dist(me, o.at) > SUPPRESS_RANGE - 2 ? o.at : null, fights: true };
    case 'plant': {
      // (for a barrel, then with the keg to the wall's foot, not stopping for blows; no barrel left or the keg another's, it holds)
      const at = plantGoal(b, h, pl, me, o.at);
      if (!at) {
        pl.order = { kind: 'hold', at: { u: me.u, v: me.v } };
        return { at: null, fights: true };
      }
      return { at, fights: false };
    }
  }
}

/** A hero's orders before its own mind (the `lead` hook); for the garrison's officers and lord, their post's. True when it acted. */
function lead(b: Battle, me: Unit, _rng: Rng, out: BattleEvent[]): boolean {
  const f = b.field!;
  const h = f.hold;
  const info = f.info[me.id];
  if (!h || !info || info.group < 0) return false;
  if (inDuel(h, me.id)) return false;
  const g = f.groups[info.group];
  if (me.side === 'foe') {
    const post = h.posts.find((p) => p.group === g.id);
    return post ? officerLead(b, f, post, me, out) : false;
  }
  const pl = h.platoons.find((p) => p.group === g.id);
  if (!pl) return false;
  const def = strikeDef(b, me);
  const inReach = nearestFoe(b, f, me, def.range + 3, true);
  const goal = orderGoal(b, f, h, pl, me);
  // (fall back: walk for the rally flag or a friend, no blows; a flank: walk round, no stopping for blows)
  if (!goal.fights) {
    if (goal.at && dist(me, goal.at) > (pl.order.kind === 'plant' ? 1 : 2)) return leaderWalk(b, f, h, pl, me, goal.at, out);
    if (pl.order.kind === 'fallback') pl.order = { kind: 'hold', at: { u: me.u, v: me.v } };
    return false;
  }
  if (goal.fort !== undefined && !inReach) {
    const fort = h.forts[goal.fort];
    if (canStrikeFort(b, me, fort)) {
      strikeFort(b, h, me, goal.fort, out);
      return true;
    }
    return leaderWalk(b, f, h, pl, me, nearFortTile(b, me, fort.spec.tiles) ?? fort.spec.front, out);
  }
  // (fire arrows: a hero with a shot looses at the hut once in range, before any foe)
  if (pl.order.kind === 'fire' && looseFire(b, h, me, pl.order.hut, out)) return true;
  if (inReach) return false;
  if (pl.order.kind === 'hold' || ((pl.order.kind === 'fire' || pl.order.kind === 'suppress') && !goal.at)) {
    if (nearestFoe(b, f, me, def.range + 1, false)) return false;
    me.busyUntil = b.t + WAIT_MS;
    return true;
  }
  if (!goal.at) return false;
  const leash = pl.order.kind === 'charge' || pl.order.kind === 'focus' || pl.order.kind === 'flank' || pl.order.kind === 'scale' ? 0 : HERO_LEASH;
  if (dist(me, goal.at) > leash) return leaderWalk(b, f, h, pl, me, goal.at, out);
  // (at its point: it fights what is near, within the leash, by its own mind; else it waits)
  if (nearestFoe(b, f, me, def.range + HERO_LEASH + 1, false)) return false;
  me.busyUntil = b.t + WAIT_MS;
  return true;
}

/** The tile beside a structure nearest to `me` that a walker stands on (where to stand to strike it). */
function nearFortTile(b: Battle, me: Unit, tiles: readonly number[]): At | null {
  const w = b.board.w;
  let best: At | null = null;
  let bd = Infinity;
  for (const i of tiles)
    for (const [du, dv] of DIRS) {
      const u = (i % w) + du;
      const v = Math.floor(i / w) + dv;
      const t = b.board.tiles[v * w + u];
      if (!t || t.wall || t.rock || t.ground === 'deep') continue;
      const d = dist(me, { u, v });
      if (d < bd) {
        bd = d;
        best = { u, v };
      }
    }
  return best;
}

/** A leader's walk towards its point, waiting a little for its stragglers. */
function leaderWalk(b: Battle, f: FieldState, h: HoldState, pl: PlatoonState, me: Unit, at: At, out: BattleEvent[]): boolean {
  const g = f.groups[pl.group];
  if (straggling(b, f, pl, me) <= 4) g.waited = 0;
  else if ((g.waited ?? 0) < WAIT_MAX) {
    g.waited = (g.waited ?? 0) + WAIT_MS;
    me.busyUntil = b.t + WAIT_MS;
    return true;
  }
  g.heading = wayTo(me, at);
  if (walkStep(b, f, me, at, out, true)) {
    pace(b, h, pl, me);
    return true;
  }
  // (a crowd at a waypoint: one near enough counts as reached, and the platoon goes on to the next)
  if (pl.route.length > 1 && dist(me, pl.route[0]) <= WAYPOINT * 2) pl.route.shift();
  me.busyUntil = b.t + WAIT_MS;
  return true;
}

/** How many of a platoon's soldiers are more than three tiles off their slots. */
function straggling(_b: Battle, f: FieldState, pl: PlatoonState, anchor: Unit): number {
  let n = 0;
  const g = f.groups[pl.group];
  for (const s of pl.soldiers) {
    const x = f.byId[s.id];
    if (!x?.alive || x.id === anchor.id) continue;
    if (dist(x, slotAt(anchor, g.heading, pl.formation, s.slot)) > 3) n++;
  }
  return n;
}

/** A step's pace for the platoon's order: a charge quickens it; a fall back keeps to the Shieldguard's walk. */
function pace(b: Battle, h: HoldState, pl: PlatoonState, me: Unit): void {
  if (!me.step || me.step.at !== b.t) return;
  let ms = me.step.ms;
  if (pl.order.kind === 'charge' && b.t < (pl.chargeUntil ?? 0)) ms = Math.round(ms / CHARGE_MOVE);
  else if (pl.order.kind === 'fallback') ms = Math.max(ms, FALLBACK_MS);
  else if (carrying(h, pl)) ms = Math.round(ms * KEG_SLOW);
  else return;
  me.step.ms = ms;
  me.busyUntil = b.t + ms;
  void h;
}

/** A soldier's mind: the soldier walking for a downed hero leads; the others take on what comes within reach on a leash, strike the
 *  structure their platoon assaults, or steer to their slot. */
function soldierMind(b: Battle, f: FieldState, h: HoldState, pl: PlatoonState, me: Unit, rng: Rng, out: BattleEvent[]): void {
  const hero = f.byId[pl.heroId];
  const anchor = hero.alive ? hero : anchorOf(f, pl) ?? me;
  const acting = !hero.alive && anchor.id === me.id;
  const def = strikeDef(b, me);
  const goal = orderGoal(b, f, h, pl, anchor);
  if (acting) {
    if (goal.fights) {
      const x = nearestFoe(b, f, me, def.range, true);
      if (x) return strike(b, me, x, rng, out);
      if (goal.fort !== undefined && canStrikeFort(b, me, h.forts[goal.fort])) return strikeFort(b, h, me, goal.fort, out);
    }
    if (goal.at && dist(me, goal.at) > 1) {
      leaderWalk(b, f, h, pl, me, goal.fort !== undefined ? nearFortTile(b, me, h.forts[goal.fort].spec.tiles) ?? goal.at : goal.at, out);
      return;
    }
    const y = nearestFoe(b, f, me, def.range + ENGAGE + 2, false);
    if (y && steer(b, f, me, y, out)) return;
    me.busyUntil = b.t + WAIT_MS;
    return;
  }
  const g = f.groups[pl.group];
  const slot = slotAt(anchor, g.heading, pl.formation, f.info[me.id].slot, !hero.alive);
  if (goal.fights) {
    const leashed = dist(me, anchor) > LEASH;
    // (Assault: those who can reach the structure strike it; the shooters cover)
    if (goal.fort !== undefined && !def.shot) {
      const fort = h.forts[goal.fort];
      if (canStrikeFort(b, me, fort)) return strikeFort(b, h, me, goal.fort, out);
      if (dist(anchor, fort.spec.front) <= 8) {
        const at = nearFortTile(b, me, fort.spec.tiles);
        if (at && steer(b, f, me, at, out)) return;
      }
    }
    // (fire arrows: the shooters loose at the hut once in range; suppression: they take the foes round the spot first)
    if (pl.order.kind === 'fire' && def.shot && looseFire(b, h, me, pl.order.hut, out)) return;
    if (pl.order.kind === 'suppress' && def.shot) {
      const at = pl.order.at;
      let mark: Unit | null = null;
      let md = Infinity;
      forNear(f, at.u, at.v, SUPPRESS_R, (x) => {
        if (x.side === me.side || !x.alive || dist(x, at) > SUPPRESS_R || !canStrike(b.board, def, me, x)) return;
        const d = dist(me, x);
        if (d < md) {
          md = d;
          mark = x;
        }
      });
      if (mark) return strike(b, me, mark, rng, out);
    }
    const focus = pl.order.kind === 'focus' ? f.byId[pl.order.unit] : undefined;
    const reach = def.range + (pl.order.kind === 'hold' ? 1 : ENGAGE) + (def.shot ? 1 : 0);
    let target: Unit | null = focus?.alive && dist(me, focus) <= reach + 4 ? focus : null;
    if (target && !canStrike(b.board, def, me, target)) {
      const near = nearestFoe(b, f, me, def.range, true);
      if (near) target = near;
    }
    target ??= nearestFoe(b, f, me, def.range, true) ?? nearestFoe(b, f, me, reach, false);
    if (target && canStrike(b.board, def, me, target)) return strike(b, me, target, rng, out);
    if (target && !leashed && !(pl.order.kind === 'hold' && def.shot) && steer(b, f, me, target, out)) return;
  }
  if (dist(me, slot) === 0) me.busyUntil = b.t + (goal.fights && nearestFoe(b, f, me, def.range + ENGAGE + 2, false) ? WAIT_MS : IDLE_MS);
  else if (!steer(b, f, me, slot, out)) me.busyUntil = b.t + WAIT_MS;
  else if (pl.order.kind === 'fallback' || (pl.order.kind === 'charge' && b.t < (pl.chargeUntil ?? 0))) pace(b, h, pl, me);
}

/** An officer's or the lord's post before its own mind: asleep it waits; routed it runs (and fights back when caught); awake, a long walk to
 *  its mark, and its own mind once near. */
function officerLead(b: Battle, f: FieldState, post: PostState, me: Unit, out: BattleEvent[]): boolean {
  if (post.mood === 'posted') {
    me.busyUntil = b.t + 500;
    return true;
  }
  if (post.mood === 'routed') {
    if (nearestFoe(b, f, me, strikeDef(b, me).range, true)) return false;
    if (dist(me, post.mark) > 1 && walkStep(b, f, me, post.mark, out, true)) return true;
    me.busyUntil = b.t + WAIT_MS;
    return true;
  }
  if (nearestFoe(b, f, me, strikeDef(b, me).range + 2, true)) return false;
  if (dist(me, post.mark) > 6) {
    f.groups[post.group].heading = wayTo(me, post.mark);
    if (walkStep(b, f, me, post.mark, out, true)) return true;
  }
  return false;
}

/** The garrison's rank and file: asleep at their posts; awake, the leader walks for the post's mark and the rest take on what comes within
 *  reach on a leash or keep their places behind it; the archers keep to their perch; routed, they run (and fight back when caught). */
function foeMind(b: Battle, f: FieldState, _h: HoldState, post: PostState, me: Unit, rng: Rng, out: BattleEvent[]): void {
  const g = f.groups[post.group];
  const def = strikeDef(b, me);
  const lead = f.byId[g.leader];
  const isLead = me.id === g.leader || !lead.alive && g.members.find((id) => f.byId[id].alive) === me.id;
  if (post.mood === 'posted') {
    // (a patrol walks its round; anyone else sleeps)
    if (post.def.loop) {
      if (isLead) {
        if (dist(me, post.mark) > 1 && walkStep(b, f, me, post.mark, out, true)) return;
      } else {
        const anchor = lead.alive ? lead : me;
        const at = slotAt(anchor, g.heading, 'wall', f.info[me.id].slot);
        if (dist(me, at) > 0 && steer(b, f, me, at, out)) return;
      }
    }
    me.busyUntil = b.t + 1000;
    return;
  }
  const near = nearestFoe(b, f, me, def.range, true);
  if (post.mood === 'routed') {
    if (near) return swing(b, me, near, rng, out);
    if (dist(me, post.mark) > 1 && (isLead ? walkStep(b, f, me, post.mark, out, false) : steer(b, f, me, post.mark, out))) return;
    me.busyUntil = b.t + WAIT_MS;
    return;
  }
  if (near) return swing(b, me, near, rng, out);
  if (archersOnly(post.def)) {
    me.busyUntil = b.t + IDLE_MS;
    return;
  }
  if (isLead) {
    if (dist(me, post.mark) > 1) {
      g.heading = wayTo(me, post.mark);
      if (walkStep(b, f, me, post.mark, out, true)) return;
    }
    me.busyUntil = b.t + WAIT_MS;
    return;
  }
  const anchor = lead.alive ? lead : f.byId[g.members.find((id) => f.byId[id].alive)!];
  const leashed = dist(me, anchor) > LEASH;
  const x = nearestFoe(b, f, me, def.range + ENGAGE, false);
  if (x && !leashed && steer(b, f, me, x, out)) return;
  const at = slotAt(anchor, g.heading, def.shot ? 'loose' : 'wall', f.info[me.id].slot);
  // (in its place with nothing near: it rests a little longer before looking again)
  if (dist(me, at) === 0) me.busyUntil = b.t + (x ? WAIT_MS : IDLE_MS);
  else if (!steer(b, f, me, at, out)) me.busyUntil = b.t + WAIT_MS;
}

// ---- walking -------------------------------------------------------------------------------------------------------------------

/** A soldier's steering: the neighbour tile nearest the mark that it can step onto and nobody holds, if nearer than here (four checks).
 *  With no such step for `STUCK_MS`, it asks for one bounded walk. */
function steer(b: Battle, f: FieldState, me: Unit, mark: At, out: BattleEvent[]): boolean {
  const w = b.board.w;
  const here = b.board.tiles[me.v * w + me.u];
  const jump = defOf(me).jump;
  const d2 = (u: number, v: number) => (u - mark.u) * (u - mark.u) + (v - mark.v) * (v - mark.v);
  const stakes = f.hold?.stakes;
  let best = -1;
  let bd = d2(me.u, me.v) + (stakes?.[me.v * w + me.u] ? 4 : 0);
  for (const [du, dv] of DIRS) {
    const u = me.u + du;
    const v = me.v + dv;
    if (u < 0 || v < 0 || u >= w || v >= b.board.d) continue;
    const j = v * w + u;
    if (f.occ[j] >= 0) continue;
    if (canStep(here, b.board.tiles[j], jump, me.side) === null) continue;
    // (the stakes count as two tiles further, so a soldier goes round them when it can)
    const s = d2(u, v) + (stakes?.[j] ? 4 : 0);
    if (s < bd) {
      bd = s;
      best = j;
    }
  }
  const info = f.info[me.id];
  if (best >= 0) {
    info.stuck = undefined;
    stepTo(b, me, best, out);
    return true;
  }
  if (info.stuck === undefined) info.stuck = b.t;
  if (b.t - info.stuck < STUCK_MS) return false;
  info.stuck = b.t;
  return walkStep(b, f, me, mark, out, false);
}

/** A real walk towards a mark: a long walk over the sectors, then a bounded walk (`walkNear`) in the window round the walker to the tile that
 *  brings it nearest the next sectors on the way. One step of it is taken. A leader may change places with its own soldier in its way. */
function walkStep(b: Battle, f: FieldState, me: Unit, mark: At, out: BattleEvent[], swapping: boolean): boolean {
  const w = b.board.w;
  const def = defOf(me);
  const jump = def.flies ? 9 : def.jump;
  const c = jumpClass(jump);
  // (the walk's next steps kept from the last search, while it walks for the same mark and the next tile is free and steppable)
  const info = f.info[me.id];
  const markAt = mark.v * w + mark.u;
  if (info?.path?.length && info.pathTo === markAt) {
    const here = me.v * w + me.u;
    const nx = info.path[0];
    const near = Math.abs((nx % w) - me.u) + Math.abs(Math.floor(nx / w) - me.v) === 1;
    if (near && f.occ[nx] < 0 && canStep(b.board.tiles[here], b.board.tiles[nx], jump, me.side) !== null) {
      info.path.shift();
      stepTo(b, me, nx, out);
      return true;
    }
    info.path = undefined;
  }
  const mine = (j: number) => {
    const o = f.occ[j];
    return o >= 0 && f.byId[o].side === me.side && f.info[o]?.role === 'soldier';
  };
  const walk = walkNear(b.board, me, jump, (j) => f.occ[j] >= 0 && f.occ[j] !== me.id && !(swapping && mine(j)), 8, me.side);
  const stakes = f.hold?.stakes;
  f.stats.walks++;
  f.stats.tickWalks++;
  let point: At = mark;
  let inWindow = false;
  for (const [du, dv] of [[0, 0], ...DIRS]) {
    const u = mark.u + du;
    const v = mark.v + dv;
    if (u < 0 || v < 0 || u >= w || v >= b.board.d) continue;
    const k = nearIndex(walk, w, v * w + u);
    if (k >= 0 && walk.cost[k] < Infinity) inWindow = true;
  }
  if (!inWindow) {
    const g = f.sectors;
    const to = regionAt(g, c, mark.v * w + mark.u);
    const from = regionAt(g, c, me.v * w + me.u);
    if (to >= 0 && from >= 0) {
      const n1 = nextRegion(g, from, to, c);
      if (n1 >= 0 && n1 !== to) {
        const n2 = nextRegion(g, n1, to, c);
        const m = g.classes[c].mid[n2 >= 0 ? n2 : n1];
        point = { u: m % w, v: Math.floor(m / w) };
      }
    }
  }
  let best = -1;
  let bs = Infinity;
  for (let k = 0; k < walk.cost.length; k++) {
    const cost = walk.cost[k];
    if (cost === Infinity) continue;
    const u = walk.u0 + (k % walk.w);
    const v = walk.v0 + Math.floor(k / walk.w);
    const s = 2 * (Math.abs(u - point.u) + Math.abs(v - point.v)) + cost * 0.5 + (stakes?.[v * w + u] ? 3 : 0);
    if (s < bs) {
      bs = s;
      best = v * w + u;
    }
  }
  const here = me.v * w + me.u;
  if (best < 0 || best === here) return false;
  const first = nearFirstStep(walk, w, best);
  if (first === null) return false;
  // (the steps after this one, kept for the next few decisions)
  if (info) {
    info.path = nearPath(walk, w, best, PATH_STEPS + 1).slice(1);
    info.pathTo = markAt;
  }
  const other = f.occ[first];
  if (other >= 0 && other !== me.id) {
    // (its own soldier there: they change places, the soldier stepping back onto the leader's tile)
    const o = f.byId[other];
    if (canStep(b.board.tiles[first], b.board.tiles[here], defOf(o).jump, o.side) === null) return false;
    o.step = { u: o.u, v: o.v, h: b.board.tiles[first].h, at: b.t, ms: defOf(o).moveMs };
    o.u = here % w;
    o.v = Math.floor(here / w);
    o.busyUntil = Math.max(o.busyUntil, b.t + defOf(o).moveMs);
    f.occ[first] = -1;
    stepTo(b, me, first, out);
    f.occ[here] = o.id;
    return true;
  }
  stepTo(b, me, first, out);
  return true;
}

// ---- the hooks' other parts ------------------------------------------------------------------------------------------------------

/** The foes a fighter's own mind looks at: those within sight; a hero holding, those within its reach and one; a hero's focus alone while
 *  it can be struck. */
function sight(b: Battle, me: Unit, foes: Unit[]): Unit[] {
  const f = b.field!;
  const h = f.hold;
  let r = SIGHT;
  const pl = me.side === 'hero' && h ? h.platoons.find((p) => p.heroId === me.id) : undefined;
  if (pl?.order.kind === 'hold') r = strikeDef(b, me).range + 1;
  const near = foes.filter((x) => dist(me, x) <= r);
  if (pl?.order.kind === 'focus') {
    const x = near.find((y) => y.id === (pl.order as { unit: number }).unit);
    if (x && canStrike(b.board, strikeDef(b, me), me, x)) return [x];
  }
  return near;
}

/** A blow's share on the field: the formations, the troops' tricks, a leaderless platoon, the drums. */
function blow(b: Battle, me: Unit, to: Unit): number {
  const f = b.field!;
  const h = f.hold;
  if (!h) return 1;
  let m = 1;
  const mine = me.side === 'hero' ? platoonOf(h, me) : undefined;
  const theirs = to.side === 'hero' ? platoonOf(h, to) : undefined;
  if (mine) {
    m *= FORMATION_FX[mine.formation].punch;
    if (!f.byId[mine.heroId].alive) m *= LEADERLESS;
    const kind = kindOfUnit(me.def);
    const elite = kind ? (rankOf(soldierOf(mine, me.id)?.marks ?? 0).rank === 'elite' ? ELITE_TRICK : 1) : 1;
    if (kind === 'archers') {
      const loosed = (mine.loosed ??= {});
      loosed[me.id] = b.t;
      const n = Object.values(loosed).filter((t) => b.t - t <= TRICKS.volleyMs).length;
      if (n >= TRICKS.volleyNeed) m *= 1 + (TRICKS.volley - 1) * elite;
    } else if (kind === 'lancers') {
      if (to.step && b.t - to.step.at <= TRICKS.braceMs && dist(to.step, me) > dist(to, me)) m *= 1 + (TRICKS.brace - 1) * elite;
    } else if (kind === 'beasts') {
      let n = 0;
      for (const [du, dv] of DIRS) {
        const id = f.occ[(to.v + dv) * f.w + to.u + du];
        if (id >= 0 && id !== me.id && kindOfUnit(f.byId[id].def) === 'beasts') n++;
      }
      m *= 1 + Math.min(TRICKS.packMost, TRICKS.pack * n) * elite;
    } else if (kind === 'skirmishers') {
      // (an Elite's flank: its blow from the side or the back lands harder)
      if (elite > 1 && flankValue(me, to) > 0) m *= TRICKS.flank;
    } else if (kind === 'blades') {
      const n = (h.blows[me.id] = (h.blows[me.id] ?? 0) + 1);
      if (n % TRICKS.cleaveEvery === 0) {
        const raw = Math.max(1, Math.round(defOf(me).atk * (me.power ?? 1) * SPLASH_SHARE * elite));
        h.cleaves.push({ at: b.t + 400, by: me.id, to: to.id, dmg: raw });
      }
    }
  }
  if (theirs) {
    m *= FORMATION_FX[theirs.formation].guard;
    // (locked shields: a Shieldguard with a platoon-mate beside it)
    if (kindOfUnit(to.def) === 'shieldguard') {
      const elite = rankOf(soldierOf(theirs, to.id)?.marks ?? 0).rank === 'elite' ? ELITE_TRICK : 1;
      const mate = DIRS.some(([du, dv]) => {
        const id = f.occ[(to.v + dv) * f.w + to.u + du];
        return id >= 0 && f.info[id]?.group === theirs.group;
      });
      if (mate) m *= 1 - (1 - TRICKS.locked) * elite;
    }
  }
  if (me.side === 'foe' && drumsBeating(h).length && nearDrum(b, h, me)) m *= DRUM_BLOW;
  return m * siegeBlow(b, h, me, to) * duelBlow(h, me, to);
}

const platoonOf = (h: HoldState, u: Unit) => h.platoons.find((p) => p.heroId === u.id || p.soldiers.some((s) => s.id === u.id));
const soldierOf = (pl: PlatoonState, id: number) => pl.soldiers.find((s) => s.id === id);

/** Whether a soldier of ours is an Elite (its trick half again as strong). */
function isElite(b: Battle, me: Unit): boolean {
  const h = b.field?.hold;
  const pl = h && me.side === 'hero' ? platoonOf(h, me) : undefined;
  return !!pl && rankOf(soldierOf(pl, me.id)?.marks ?? 0).rank === 'elite';
}

/** The Gunners' pierce: armour their shot ignores (an Elite's, half again as much). */
function pierce(b: Battle, me: Unit): number {
  return kindOfUnit(me.def) === 'gunners' ? TRICKS.pierce * (isElite(b, me) ? ELITE_TRICK : 1) : 0;
}

/** The Battlemages' splash: an Elite's fire lands on the foes beside half again as hard. */
function splash(b: Battle, me: Unit): number {
  return kindOfUnit(me.def) === 'battlemages' && isElite(b, me) ? ELITE_TRICK : 1;
}

function unitAtField(b: Battle, u: number, v: number): Unit | undefined {
  const f = b.field!;
  if (u < 0 || v < 0 || u >= f.w || v >= f.d) return undefined;
  const id = f.occ[v * f.w + u];
  if (id < 0) return undefined;
  const x = f.byId[id];
  if (x && x.alive && x.u === u && x.v === v && !x.under) return x;
  return b.units.find((y) => y.alive && y.u === u && y.v === v && !y.under);
}

function moved(b: Battle, me: Unit, from: number): void {
  const f = b.field!;
  if (f.occ[from] === me.id) f.occ[from] = -1;
  f.occ[me.v * f.w + me.u] = me.id;
}

/** The field's end (5.5): the lord's fall wins after the rout's five seconds; all the heroes down at once loses; night at twelve minutes; the
 *  retreat sounded. */
function end(b: Battle, out: BattleEvent[]): void {
  const h = holdOf(b);
  if (!h || b.phase !== 'fight') return;
  const f = b.field!;
  let outcome: AssaultOutcome | undefined = h.outcome;
  if (!outcome && h.lordFell !== undefined && b.t - h.lordFell >= ROUT_MS) outcome = 'won';
  if (!outcome && !h.platoons.some((pl) => f.byId[pl.heroId]?.alive)) outcome = 'lost';
  if (!outcome && b.t >= ASSAULT_LIMIT_MS) outcome = 'night';
  if (!outcome) return;
  h.outcome = outcome;
  b.phase = outcome === 'won' ? 'won' : 'lost';
  b.pending = [];
  out.push({ kind: 'end', won: outcome === 'won' });
  // (the fallen leave the grid)
  for (const x of b.units) if (!x.alive) occClear(f, x);
}

/** A barrel on the field: the structures within a tile take its blast. */
function blast(b: Battle, i: number, out: BattleEvent[]): void {
  const h = holdOf(b);
  if (h) barrelOnForts(b, h, i, out);
}

// ---- the bot (Auto) ------------------------------------------------------------------------------------------------------------

/** The bot's turn for a platoon (Auto, once a second): it plays the opening plan, then pushes for the nearest gate that stands between it
 *  and the throne, then for the throne. With the input's `tactical` set (the balance tool's second style), it silences the drums near its
 *  approach first and sends a flying hero onto the wall-walk by the Iron Gate. */
export function bot(b: Battle, f: FieldState, h: HoldState, k: number): void {
  const pl = h.platoons[k];
  const a = anchorOf(f, pl);
  if (!a) return;
  if (pl.order.kind === 'fallback' || pl.order.kind === 'charge' || pl.order.kind === 'flank' || pl.order.kind === 'scale' || pl.order.kind === 'fire') return;
  if (pl.route.length > 1) return;
  // (the parts in the plan, unless the bot plays its Tactical style: cover keeps behind the main push; the flank goes round for the North Gate)
  if (!h.input.tactical && roleMove(b, f, h, pl, a)) return;
  const w = b.board.w;
  const c = jumpClass(defOf(a).flies ? 9 : defOf(a).jump);
  const here = a.v * w + a.u;
  const throne = h.bp.throne.v * w + h.bp.throne.u;
  const tactical = h.input.tactical;
  // (tactical: the drum near this platoon's approach, while it beats)
  if (tactical) {
    // (the host together: the drum nearest the host's middle, every platoon at it)
    const anchors = h.platoons.map((p) => anchorOf(f, p)).filter((x): x is Unit => !!x);
    const mid = { u: Math.round(anchors.reduce((n, x) => n + x.u, 0) / anchors.length), v: Math.round(anchors.reduce((n, x) => n + x.v, 0) / anchors.length) };
    const drum = drumsBeating(h)
      .map((d) => ({ d, i: h.forts.indexOf(d) }))
      .sort((x, y) => dist(x.d.spec.front, mid) - dist(y.d.spec.front, mid))[0];
    if (drum && dist(drum.d.spec.front, mid) <= 40) {
      if (!(pl.order.kind === 'assault' && pl.order.fort === drum.d.spec.id)) givePlatoon(b, h, pl, { kind: 'assault', fort: drum.d.spec.id });
      return;
    }
  }
  if (reaches(f.sectors, c, here, throne)) {
    if (!(pl.order.kind === 'move' && dist(pl.order.at, h.bp.throne) === 0)) givePlatoon(b, h, pl, { kind: 'move', at: { ...h.bp.throne } });
    return;
  }
  // (the nearest gate between it and the throne: the Iron Gate once it can walk to it; from outside, a way already open, else the nearest
  // gate of the palisade to break)
  const outside = ringOf(a.u, a.v) > 22;
  const iron = h.forts.find((x) => x.spec.kind === 'ironGate')!;
  const ironFront = iron.spec.front.v * w + iron.spec.front.u;
  if (!iron.broken && reaches(f.sectors, c, here, ironFront)) {
    // (tactical: a flying hero goes over the wall onto the walk by the Iron Gate, where its crew stands, so the gate opens from inside)
    const hero = f.byId[pl.heroId];
    if (tactical && hero.alive && defOf(hero).flies) {
      const walk = { u: 60, v: 52 };
      if (!(pl.order.kind === 'move' && dist(pl.order.at, walk) === 0)) givePlatoon(b, h, pl, { kind: 'move', at: walk });
      return;
    }
    // (a platoon carrying a ladder puts it up against the wall where it stands, and climbs)
    if (pl.ladder && scaleAim(b, f, a)) {
      givePlatoon(b, h, pl, { kind: 'scale', at: { u: a.u, v: a.v } });
      return;
    }
    if (!(pl.order.kind === 'assault' && pl.order.fort === iron.spec.id)) givePlatoon(b, h, pl, { kind: 'assault', fort: iron.spec.id });
    return;
  }
  if (outside) {
    const open = h.forts.find((x) => (x.open || x.broken) && x.spec.kind !== 'drum' && x.spec.kind !== 'ironGate' && reaches(f.sectors, c, here, x.spec.tiles[0]));
    if (open) {
      const at = inward(open.spec.tiles[0], w);
      if (!(pl.order.kind === 'move' && dist(pl.order.at, at) === 0)) givePlatoon(b, h, pl, { kind: 'move', at });
      return;
    }
  }
  const gates = h.forts.filter((x) => !x.broken && !x.open && (x.spec.kind === 'southGate' || x.spec.kind === 'sallyPort' || x.spec.kind === 'northGate'));
  const pick = gates.sort((x, y) => dist(x.spec.front, a) - dist(y.spec.front, a))[0] ?? h.forts.filter((x) => x.spec.kind === 'palisade' && !x.broken).sort((x, y) => dist(x.spec.front, a) - dist(y.spec.front, a))[0];
  if (pick && !(pl.order.kind === 'assault' && pl.order.fort === pick.spec.id)) givePlatoon(b, h, pl, { kind: 'assault', fort: pick.spec.id });
}

/** A platoon's part in the plan, where it is not the main push: cover follows the main push a few tiles behind it (shooters on the ridges
 *  behind the line); the flank goes round for the North Gate, and through it once it is open. True when it gave the platoon its order. */
function roleMove(b: Battle, f: FieldState, h: HoldState, pl: PlatoonState, a: Unit): boolean {
  if (pl.role === 'cover') {
    const mains = h.platoons.filter((p) => p.role === 'main').map((p) => anchorOf(f, p)).filter((x): x is Unit => !!x);
    if (!mains.length) return false;
    const lead = mains.reduce((m, x) => (dist(x, h.bp.throne) < dist(m, h.bp.throne) ? x : m));
    // (shooters in cover keep the archers over the main push under their volleys: the nearest awake post of archers within reach of it)
    if (hasShooters(b, f, pl)) {
      let spot: At | null = null;
      let sd = Infinity;
      for (const p of h.posts) {
        if (p.mood === 'posted' || !archersOnly(p.def)) continue;
        const g = f.groups[p.group];
        if (!g.members.some((id) => f.byId[id].alive)) continue;
        const d = dist(g.home, lead);
        if (d <= 10 && d < sd) {
          sd = d;
          spot = g.home;
        }
      }
      if (spot) {
        if (!(pl.order.kind === 'suppress' && dist(pl.order.at, spot) === 0)) givePlatoon(b, h, pl, { kind: 'suppress', at: { ...spot } });
        return true;
      }
    }
    // (behind it, back towards the rally flag)
    const du = Math.sign(h.bp.rally.u - lead.u);
    const dv = Math.sign(h.bp.rally.v - lead.v);
    const at = { u: Math.max(0, Math.min(f.w - 1, lead.u + du * 4)), v: Math.max(0, Math.min(f.d - 1, lead.v + dv * 4)) };
    if (!(pl.order.kind === 'move' && dist(pl.order.at, at) <= 2)) givePlatoon(b, h, pl, { kind: 'move', at });
    return true;
  }
  if (pl.role === 'flank') {
    // (first the Warpath's camp, to hold it so no more bands come down it; then the North Gate)
    if (!h.warpath.held) {
      const camp = h.bp.warpath;
      if (!(pl.order.kind === 'move' && dist(pl.order.at, camp) === 0)) givePlatoon(b, h, pl, { kind: 'move', at: { ...camp } });
      return true;
    }
    const gate = h.forts.find((x) => x.spec.kind === 'northGate');
    if (!gate || gate.broken || gate.open) return false;
    if (!(pl.order.kind === 'assault' && pl.order.fort === gate.spec.id)) givePlatoon(b, h, pl, { kind: 'assault', fort: gate.spec.id });
    return true;
  }
  void a;
  return false;
}

/** A few tiles in from a gate's tile, towards the middle of the hold (where a platoon goes through an open way). */
function inward(t: number, w: number): At {
  const u = t % w;
  const v = Math.floor(t / w);
  const du = u - 49.5;
  const dv = v - 49.5;
  return Math.abs(du) >= Math.abs(dv) ? { u: u - Math.sign(du) * 4, v } : { u, v: v - Math.sign(dv) * 4 };
}

// ---- playing and replaying -------------------------------------------------------------------------------------------------------

/** Step an assault one tick (the battle's own `stepBattle`), with the hold's events for the page. */
export function stepAssault(b: Battle): BattleEvent[] {
  const out = stepBattle(b);
  const h = holdOf(b);
  if (h) for (const e of out) if (e.kind === 'hit' && e.killed) h.kills[e.by] = (h.kills[e.by] ?? 0) + 1;
  return out;
}

/** Play an assault to its end (for the tests and the tools), the log's orders replayed at their ticks. */
export function playAssault(b: Battle, log: readonly AssaultLogEntry[] = [], each?: (b: Battle, events: BattleEvent[]) => void): Battle {
  while (b.phase === 'fight') {
    if (log.length) replayEntries(b, log);
    const ev = stepAssault(b);
    each?.(b, ev);
  }
  return b;
}

/** A plain checksum of where the assault stands (the determinism test, the bench's report). */
export function assaultChecksum(b: Battle): number {
  let x = b.rng >>> 0;
  for (const u of b.units) x = (Math.imul(x ^ (u.id * 31 + u.u * 101 + u.v * 7 + Math.round(u.hp) * 13 + (u.alive ? 1 : 0)), 0x9e3779b1) >>> 0) ^ (x >>> 15);
  const h = holdOf(b);
  if (h) for (const f of h.forts) x = (Math.imul(x ^ (f.hp + (f.broken ? 7 : 0)), 0x85ebca6b) >>> 0) ^ (x >>> 13);
  return (x ^ b.t) >>> 0;
}

/** How the assault stands, for the page's top bar and the result: foes left of the 200, the drums beating, each platoon's count. */
export function assaultScore(b: Battle): { foesLeft: number; foesTotal: number; drums: number; platoons: { hero: string; alive: boolean; soldiers: number }[] } {
  const h = holdOf(b)!;
  const f = b.field!;
  const placed = h.garrison.filter((id) => f.byId[id].alive).length;
  const coming = (h.bp.reinforce.bands - h.bands) * h.bp.reinforce.roster.replace(/ /g, '').length;
  return {
    foesLeft: placed + (h.warpath.held ? 0 : coming),
    foesTotal: h.foesTotal,
    drums: drumsBeating(h).length,
    platoons: h.platoons.map((pl) => ({ hero: pl.hero, alive: !!f.byId[pl.heroId]?.alive, soldiers: pl.soldiers.filter((s) => f.byId[s.id]?.alive).length })),
  };
}

/** How far a whole mind sees on the field while it decides: its kits pick their targets (a blink, a dash, a heal, a revive) only from the
 *  fighters this near, so a skill never reaches across the hold. */
export const AROUND = 16;

/** Run a whole mind's decision with `b.units` cut to the fighters within `AROUND` of it (in their own order, so the decision is the same
 *  every time); a fighter a skill calls up meanwhile joins the whole list after. */
function around(b: Battle, me: Unit, run: () => void): void {
  const all = b.units;
  const near = duelSight(b.field?.hold, me, all).filter((x) => Math.abs(x.u - me.u) + Math.abs(x.v - me.v) <= AROUND);
  const n = near.length;
  b.units = near;
  try {
    run();
  } finally {
    const added = near.slice(n).filter((x) => !all.includes(x));
    b.units = all;
    if (added.length) all.push(...added);
  }
}

// (the battle's engine calls these on a fight with a field, and on no other)
fieldHooks.around = around;
fieldHooks.tick = tick;
fieldHooks.decide = cheapDecide;
fieldHooks.lead = lead;
fieldHooks.sight = sight;
fieldHooks.blow = blow;
fieldHooks.pierce = pierce;
fieldHooks.splash = splash;
fieldHooks.unitAt = unitAtField;
fieldHooks.moved = moved;
fieldHooks.blast = blast;
fieldHooks.end = end;
