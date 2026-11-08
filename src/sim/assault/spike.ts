// The Assault's engine spike, phase 0 (`docs/notes/assault-0.md`; the design's sections 7 and 10): 55 of ours (five heroes, each
// with a platoon of ten soldiers) storm the placeholder hold (`stencil.ts`) against 200 of the garrison at their posts, on the
// 100 x 100 field. It proves the engine's budget before any content is built: the occupancy grid and buckets (`field.ts`), the
// sector graph and long walks (`sectors.ts`), the bounded walks (`walkNear`, path.ts), leaders who walk while soldiers steer to
// their slots, and sleeping posts. It is played only by the benches (`tools/assault/bench.mjs`, `?bench=assault`) and its tests.
//
// The fighters are the battle's own `Unit`s on a real `Battle` (its rng, its clock), with `Battle.field` set. They fight plainly:
// blows by `canStrike` and `blowMult`, no kits. Phase 1 puts the heroes' whole minds on the field. Deterministic: every draw is
// from `b.rng`, units decide in id order, and nothing reads a clock.

import { blowMult, canStrike, startBattle, wayTo, WAIT_MS, type Battle, type Unit } from '../battle';
import { canStep, DIRS, standable, tileAt, type At } from '../board';
import { nearIndex, nearFirstStep, walkNear } from '../path';
import { Rng } from '../rng';
import { UNITS, type UnitDef } from '../units';
import { forNear, newField, occClear, occMove, occPut, rebuildBuckets, type FieldGroup, type FieldState } from './field';
import { jumpClass, nextRegion, reaches, rebuildSectors, regionAt } from './sectors';
import { buildField, FIELD, placeholderStencil } from './stencil';

/** The fight's longest: twelve minutes of battle time (the design's 1.1). */
export const SPIKE_LIMIT_MS = 12 * 60_000;
/** A soldier strays at most this far from its leader before it gives up a foe and goes back to its slot (the leash). */
export const LEASH = 6;
/** A soldier takes on a foe within its reach plus this. */
export const ENGAGE = 2;
/** A leader takes on a foe within its reach plus this. */
export const LEADER_ENGAGE = 4;
/** A sleeping post wakes when one of ours comes this near its home; and a post that wakes calls the posts this near it. */
export const WAKE = 8;
export const CALL = 12;
/** An awake post hunts ours this far from its home, and goes home past it. */
export const HUNT = 18;
/** A soldier that finds no step for this long asks for a bounded walk. */
export const STUCK_MS = 2000;
/** A leader waits at most this long at a time for its stragglers. */
export const WAIT_MAX = 3000;
/** How long a gate of the stone wall stands once a leader of ours is battering at it. */
export const GATE_MS = 10_000;

/** The troops of the spike: five of the design's nine kinds (its section 3.2), on the plain class sheets. */
const TROOP = (id: string, name: string, sheet: string, o: Partial<UnitDef>): UnitDef => ({ id, name, side: 'hero', sheet, scale: 0.55, hp: 100, atk: 8, def: 3, range: 1, moveMs: 700, atkMs: 1200, jump: 2, role: 'A soldier of the Assault', ...o });
export const SPIKE_TROOPS: Record<string, UnitDef> = {
  shieldguard: TROOP('shieldguard', 'Shieldguard', 'cls_paladin_1', { hp: 120, atk: 5, def: 8, moveMs: 800, atkMs: 1200 }),
  blades: TROOP('blades', 'Blades', 'cls_barbarian_1', { hp: 95, atk: 10, def: 4, moveMs: 650, atkMs: 1000 }),
  archers: TROOP('archers', 'Archers', 'samurai_archer', { hp: 70, atk: 9, def: 2, range: 4, moveMs: 700, atkMs: 1400, shot: 'arrow' }),
  battlemages: TROOP('battlemages', 'Battlemages', 'cls_warlock_1', { hp: 60, atk: 11, def: 1, range: 3, moveMs: 750, atkMs: 1700, shot: 'fire' }),
  skirmishers: TROOP('skirmishers', 'Skirmishers', 'cls_illusionist_1', { hp: 80, atk: 8, def: 3, moveMs: 450, atkMs: 700, jump: 3 }),
};
/** The five platoons: a hero and its troop kind. */
export const SPIKE_PLATOONS: readonly { hero: string; troop: string }[] = [
  { hero: 'knight', troop: 'shieldguard' },
  { hero: 'samurai', troop: 'blades' },
  { hero: 'archer', troop: 'archers' },
  { hero: 'wizard', troop: 'battlemages' },
  { hero: 'kunoichi', troop: 'skirmishers' },
];
/** Ours stand at this many times their base numbers (a host near the tenth star's level); the garrison at its share of a wave foe's. */
export const HOST_HP = 5;
export const HOST_ATK = 3.4;
export const FOE_HP = 0.8;
export const FOE_ATK = 0.55;

/** A war-wolf: the Beastmaster's black wolf's sheet on a wolf's numbers (the design's 4.1). */
const WAR_WOLF: UnitDef = { ...UNITS.wolfBlack, id: 'warWolf', name: 'War-wolf', sheet: 'wolf_black', scale: 0.6 };
const ROSTER: Record<string, UnitDef> = { G: UNITS.orcGrunt, A: UNITS.orcArcher, B: UNITS.orcBrute, W: WAR_WOLF, C: UNITS.orcChieftain, L: UNITS.orcWarlord };

/** The garrison's posts: a name, where it stands, and its roster (its leader first). 200 in all. */
export const SPIKE_POSTS: readonly { name: string; u: number; v: number; roster: string }[] = [
  { name: 'The bridge barricade', u: 79, v: 79, roster: 'C GGGGG AAA' },
  { name: 'The west watchtower', u: 52, v: 92, roster: 'G AAAA' },
  { name: 'The east watchtower', u: 92, v: 52, roster: 'G AAAA' },
  { name: 'The west patrol', u: 40, v: 84, roster: 'G GGG A' },
  { name: 'The east patrol', u: 84, v: 40, roster: 'G GGG A' },
  { name: 'The wolf pens', u: 88, v: 22, roster: 'G G WWWWWWWW' },
  { name: 'The lumber camp', u: 22, v: 86, roster: 'G GGGGG' },
  { name: 'The village ambush', u: 66, v: 88, roster: 'G GGGGG' },
  { name: 'The west drum', u: 30, v: 92, roster: 'C GGGG BB' },
  { name: 'The east drum', u: 92, v: 30, roster: 'C GGGG BB' },
  { name: 'The south drum', u: 80, v: 70, roster: 'C GGGG BB' },
  { name: 'The east gate', u: 78, v: 50, roster: 'C GGGG AAAA BB' },
  { name: 'The west gate', u: 50, v: 78, roster: 'C GGGG AAAA BB' },
  { name: 'The north bank', u: 30, v: 30, roster: 'A AA' },
  { name: 'The east bank', u: 71, v: 40, roster: 'A AA' },
  { name: 'The west bank', u: 40, v: 71, roster: 'A AA' },
  { name: 'The south bank', u: 70, v: 70, roster: 'A AA' },
  { name: 'The longhouses', u: 66, v: 44, roster: 'B GGGGGGGGG BBBB' },
  { name: 'The forge', u: 44, v: 66, roster: 'B BBBBB' },
  { name: 'The Bonefire', u: 34, v: 50, roster: 'G GGGGG BB' },
  { name: 'The beast pens', u: 50, v: 34, roster: 'W WWWWW' },
  { name: 'The east tower', u: 61, v: 39, roster: 'A AA' },
  { name: 'The west tower', u: 39, v: 61, roster: 'A AA' },
  { name: 'The north tower', u: 38, v: 38, roster: 'A AA' },
  { name: 'The south tower', u: 61, v: 61, roster: 'A AA' },
  { name: 'The east iron gate', u: 64, v: 50, roster: 'C BB GG A' },
  { name: 'The west iron gate', u: 50, v: 64, roster: 'C BB GG A' },
  { name: 'The wall-walk', u: 50, v: 38, roster: 'A AAA' },
  { name: 'The throne mound', u: 50, v: 50, roster: 'L CC BBBBBBB' },
  { name: 'The Warpath', u: 15, v: 15, roster: 'C GGGGGGGGGGGGGGG AAA BBB' },
];

/** Where each platoon musters at the Landing, and the crossing it takes (the design's opening plan). */
const MUSTER: readonly { at: At; crossing: At }[] = [
  { at: { u: 91, v: 93 }, crossing: { u: 82, v: 82 } },
  { at: { u: 94, v: 90 }, crossing: { u: 82, v: 82 } },
  { at: { u: 96, v: 94 }, crossing: { u: 82, v: 82 } },
  { at: { u: 87, v: 96 }, crossing: { u: 72, v: 94 } },
  { at: { u: 97, v: 86 }, crossing: { u: 94, v: 72 } },
];

/** What the spike's step tells the renderer. */
export type FieldEvent =
  | { kind: 'blow'; by: number; to: number; shot: boolean }
  | { kind: 'hit'; to: number; dmg: number }
  | { kind: 'die'; id: number }
  | { kind: 'wake'; group: number }
  | { kind: 'breach'; tiles: number[] }
  | { kind: 'end'; won: boolean };

/** The spike's own state besides the field's: blows on their way, the stone wall's gates and how long each has been battered. */
interface SpikeState {
  pending: { at: number; by: number; to: number; dmg: number }[];
  gates: { tiles: number[]; front: At; broken: boolean; battered: number }[];
}
const spikes = new WeakMap<Battle, SpikeState>();

/** A spike fight on the placeholder hold, ready to step (phase 'fight'). The same seed always gives the same fight. */
export function startSpike(seed: number): Battle {
  const map = buildField(placeholderStencil(), seed);
  const b = startBattle(seed, [], { board: map.board });
  const f = newField(b.board, map.zone);
  b.field = f;
  b.phase = 'fight';
  const st: SpikeState = { pending: [], gates: map.ironGates.map((tiles, k) => ({ tiles, front: k === 0 ? { u: 66, v: 50 } : { u: 50, v: 66 }, broken: false, battered: 0 })) };
  spikes.set(b, st);
  const taken = (u: number, v: number) => f.occ[v * f.w + u] >= 0;
  const add = (def: UnitDef, at: At, side: 'hero' | 'foe', group: number, slot: number, hp: number, atk: number): Unit => {
    const maxHp = Math.round(def.hp * hp);
    const unit: Unit = { id: b.nextId++, def: def.id, side, u: at.u, v: at.v, hp: maxHp, maxHp, facing: side === 'hero' ? 3 : 1, alive: true, busyUntil: 0, charge: 0, power: atk };
    b.units.push(unit);
    f.byId[unit.id] = unit;
    f.info[unit.id] = { def, sheet: def.sheet, role: slot === 0 ? 'leader' : 'soldier', group, slot };
    occPut(f, unit);
    return unit;
  };
  // our five platoons at the Landing: the hero first, its ten soldiers round it
  SPIKE_PLATOONS.forEach((p, k) => {
    const m = MUSTER[k];
    const g: FieldGroup = { id: f.groups.length, side: 'hero', name: UNITS[p.hero].name, leader: 0, members: [], home: m.at, awake: true, route: [m.crossing, { u: 50, v: 50 }], heading: 3 };
    f.groups.push(g);
    for (let n = 0; n <= 10; n++) {
      const def = n === 0 ? UNITS[p.hero] : SPIKE_TROOPS[p.troop];
      const at = nearestFree(b, m.at, taken);
      const unit = add(def, at, 'hero', g.id, n, HOST_HP, HOST_ATK);
      if (n === 0) g.leader = unit.id;
      g.members.push(unit.id);
    }
  });
  // the garrison at its posts, asleep
  for (const p of SPIKE_POSTS) {
    const g: FieldGroup = { id: f.groups.length, side: 'foe', name: p.name, leader: 0, members: [], home: { u: p.u, v: p.v }, awake: false, route: [], heading: 1 };
    f.groups.push(g);
    const ids = p.roster.replace(/ /g, '').split('');
    ids.forEach((c, n) => {
      const def = ROSTER[c];
      const at = nearestFree(b, g.home, taken);
      const lead = n === 0 ? 1.6 : 1;
      const unit = add(def, at, 'foe', g.id, n, FOE_HP * lead, FOE_ATK);
      if (n === 0) g.leader = unit.id;
      g.members.push(unit.id);
    });
  }
  return b;
}

/** The nearest standable, free tile to a spot, by rings of steps (in a fixed order, so the same every time). */
function nearestFree(b: Battle, at: At, taken: (u: number, v: number) => boolean): At {
  for (let r = 0; r < FIELD; r++)
    for (let du = -r; du <= r; du++)
      for (const dv of r - Math.abs(du) === 0 ? [0] : [-(r - Math.abs(du)), r - Math.abs(du)]) {
        const u = at.u + du;
        const v = at.v + dv;
        const t = tileAt(b.board, u, v);
        if (t && standable(t) && !taken(u, v)) return { u, v };
      }
  return at;
}

const dist = (a: At, z: At) => Math.abs(a.u - z.u) + Math.abs(a.v - z.v);

/** Step the spike fight one tick (100 ms). */
export function stepSpike(b: Battle): FieldEvent[] {
  const out: FieldEvent[] = [];
  const f = b.field;
  const st = spikes.get(b);
  if (!f || !st || b.phase !== 'fight') return out;
  b.t += 100;
  f.stats.ticks++;
  f.stats.tickWalks = 0;
  f.stats.tickDecided = 0;
  const rng = new Rng(b.rng);
  rebuildBuckets(f, b.units);
  // blows that land now
  while (st.pending.length && st.pending[0].at <= b.t) {
    const p = st.pending.shift()!;
    const to = f.byId[p.to];
    if (!to.alive) continue;
    to.hp -= p.dmg;
    to.hurtAt = b.t;
    out.push({ kind: 'hit', to: to.id, dmg: p.dmg });
    // (a post struck wakes, whatever its distance)
    const g = f.groups[f.info[to.id].group];
    if (!g.awake) wakePost(f, g, out);
    if (to.hp <= 0) {
      to.hp = 0;
      to.alive = false;
      to.diedAt = b.t;
      occClear(f, to);
      out.push({ kind: 'die', id: to.id });
    }
  }
  // the once-a-second jobs, spread over the ten ticks of a second by group (the design's 7.3, point 6)
  const slice = f.stats.ticks % 10;
  for (const g of f.groups) if (g.id % 10 === slice) groupSecond(b, f, st, g, out);
  for (const me of b.units) {
    if (!me.alive || me.busyUntil > b.t) continue;
    const g = f.groups[f.info[me.id].group];
    // (a sleeping post does not decide at all)
    if (!g.awake) continue;
    decide(b, f, st, me, g, rng, out);
  }
  b.rng = rng.state;
  f.stats.mostDecided = Math.max(f.stats.mostDecided, f.stats.tickDecided);
  const ours = b.units.some((x) => x.alive && x.side === 'hero');
  const theirs = b.units.some((x) => x.alive && x.side === 'foe');
  if (!ours || !theirs || b.t >= SPIKE_LIMIT_MS) {
    b.phase = ours && !theirs ? 'won' : 'lost';
    out.push({ kind: 'end', won: b.phase === 'won' });
  }
  return out;
}

/** Play a spike fight to its end (for the tests and the headless bench); `each` is told every tick's events. */
export function playSpike(b: Battle, each?: (events: FieldEvent[]) => void): Battle {
  while (b.phase === 'fight') {
    const ev = stepSpike(b);
    each?.(ev);
  }
  return b;
}

function wakePost(f: FieldState, g: FieldGroup, out: FieldEvent[]): void {
  if (g.awake) return;
  g.awake = true;
  out.push({ kind: 'wake', group: g.id });
  // (it calls the posts near it)
  for (const o of f.groups) if (o.side === 'foe' && !o.awake && dist(o.home, g.home) <= CALL) {
    o.awake = true;
    out.push({ kind: 'wake', group: o.id });
  }
}

/** A group's once-a-second job: a sleeping post looks for ours near its home; an awake post picks its mark; a platoon moves on to
 *  its next waypoint; a leader at a shut gate batters it. */
function groupSecond(b: Battle, f: FieldState, st: SpikeState, g: FieldGroup, out: FieldEvent[]): void {
  const lead = f.byId[g.leader];
  if (g.side === 'foe') {
    if (!g.awake) {
      let near = false;
      forNear(f, g.home.u, g.home.v, WAKE, (x) => (near = x.side === 'hero'));
      if (near) wakePost(f, g, out);
      return;
    }
    // (the nearest of ours to the post's home, within the hunt)
    let best: Unit | null = null;
    let bd = Infinity;
    forNear(f, g.home.u, g.home.v, HUNT, (x) => {
      if (x.side !== 'hero') return;
      const d = dist(x, g.home);
      if (d < bd) {
        bd = d;
        best = x;
      }
    });
    const mark = best as Unit | null;
    g.route = [mark ? { u: mark.u, v: mark.v } : g.home];
    return;
  }
  // (a platoon whose hero has fallen follows its first soldier still standing)
  if (!lead.alive) {
    const next = g.members.find((id) => f.byId[id].alive);
    if (next === undefined) return;
    g.leader = next;
    f.info[next].role = 'leader';
    return;
  }
  // (a platoon at its waypoint takes the next; at its last, it marches on the nearest post still standing: the bench's auto plan)
  if (g.route.length > 1 && dist(lead, g.route[0]) <= 3) g.route.shift();
  else if (g.route.length === 1 && dist(lead, g.route[0]) <= 3) {
    // (the nearest post's nearest fighter; one the platoon can walk to first, else the nearest at all, behind a gate to break)
    const c = jumpClass(f.info[lead.id].def.jump);
    let best: At | null = null;
    let bd = Infinity;
    for (const pass of [true, false]) {
      for (const o of f.groups) {
        if (o.side !== 'foe') continue;
        for (const id of o.members) {
          const x = f.byId[id];
          if (!x.alive) continue;
          const d = dist(lead, x);
          if (d >= bd || (pass && !reaches(f.sectors, c, lead.v * f.w + lead.u, x.v * f.w + x.u))) continue;
          bd = d;
          best = { u: x.u, v: x.v };
        }
      }
      if (best) break;
    }
    if (best) g.route = [best];
  }
  // (a shut gate of the stone wall: a leader of ours before it batters it, and it breaks in GATE_MS)
  for (const gate of st.gates) {
    if (gate.broken || dist(lead, gate.front) > 4) continue;
    gate.battered += 1000;
    if (gate.battered >= GATE_MS) breakTiles(b, gate.tiles, out), (gate.broken = true);
  }
  // (while the way to the keep is shut, the platoon makes for the nearest gate's front)
  const goal = g.route[g.route.length - 1];
  const c = jumpClass(f.info[lead.id].def.jump);
  if (g.route.length === 1 && !reaches(f.sectors, c, lead.v * f.w + lead.u, goal.v * f.w + goal.u)) {
    const shut = st.gates.filter((x) => !x.broken).sort((x, y) => dist(lead, x.front) - dist(lead, y.front))[0];
    if (shut) g.route = [shut.front, goal];
  }
}

/** Break tiles of the field: the solid tiles open to floor, and the sector graph is rebuilt (the design's 5.1 and 7.3). */
export function breakTiles(b: Battle, tiles: readonly number[], out?: FieldEvent[]): void {
  const f = b.field;
  if (!f) return;
  for (const i of tiles) {
    const t = b.board.tiles[i];
    delete t.wall;
    delete t.rock;
  }
  rebuildSectors(f.sectors, b.board, tiles);
  f.stats.rebuilds++;
  out?.push({ kind: 'breach', tiles: [...tiles] });
}

/** The fighter's way of striking (its def's reach and shot, the board's heights and sight). */
const canHit = (b: Battle, f: FieldState, me: Unit, to: Unit): boolean => canStrike(b.board, f.info[me.id].def, me, to);

function decide(b: Battle, f: FieldState, st: SpikeState, me: Unit, g: FieldGroup, rng: Rng, out: FieldEvent[]): void {
  f.stats.decided++;
  f.stats.tickDecided++;
  const info = f.info[me.id];
  const def = info.def;
  const lead = f.byId[g.leader];
  const leader = info.role === 'leader' || !lead.alive;
  // the nearest foe within the fighter's reach plus its engage (by steps; ties by the buckets' order, which is fixed)
  const reach = def.range + (def.shot ? 2 : 0) + (leader ? LEADER_ENGAGE : ENGAGE);
  let target: Unit | null = null;
  let td = Infinity;
  forNear(f, me.u, me.v, reach, (x) => {
    if (x.side === me.side) return;
    const d = dist(me, x);
    if (d < td) {
      td = d;
      target = x;
    }
  });
  const foe = target as Unit | null;
  // (a soldier strays no further than the leash from its leader)
  const leashed = !leader && dist(me, lead) > LEASH;
  if (foe && canHit(b, f, me, foe)) return strike(b, f, st, me, foe, rng, out);
  if (foe && !leashed) {
    if (leader ? walkTowards(b, f, me, foe) : steer(b, f, me, foe)) return;
  }
  if (leader) {
    const goal = g.route[0];
    if (!goal || dist(me, goal) <= 1) return void (me.busyUntil = b.t + WAIT_MS);
    // (a leader of ours waits for its platoon to keep up: up to WAIT_MAX, then it goes on, and waits again only once they have caught up)
    if (g.side === 'hero') {
      if (straggling(f, g) <= 4) g.waited = 0;
      else if ((g.waited ?? 0) < WAIT_MAX) {
        g.waited = (g.waited ?? 0) + WAIT_MS;
        return void (me.busyUntil = b.t + WAIT_MS);
      }
    }
    g.heading = wayTo(me, goal);
    if (walkTowards(b, f, me, goal)) return;
    me.busyUntil = b.t + WAIT_MS;
    return;
  }
  // a soldier steers to its slot behind its leader
  const slot = slotOf(b, f, g, info.slot);
  if (dist(me, slot) === 0 || steer(b, f, me, slot)) return;
  me.busyUntil = b.t + WAIT_MS;
}

/** How many of a platoon's living soldiers are more than three tiles off their slots. */
function straggling(f: FieldState, g: FieldGroup): number {
  const lead = f.byId[g.leader];
  let n = 0;
  for (const id of g.members) {
    const x = f.byId[id];
    if (!x.alive || id === g.leader) continue;
    const s = slotAt(lead, g.heading, f.info[id].slot);
    if (dist(x, s) > 3) n++;
  }
  return n;
}

/** A soldier's slot: two ranks of five behind its leader, turned to the group's heading (the design's 3.4). */
function slotAt(lead: At, heading: number, slot: number): At {
  const k = slot - 1;
  const across = (k % 5) - 2;
  const back = 1 + Math.floor(k / 5);
  const [fu, fv] = DIRS[heading];
  // (back is against the heading; across is the heading turned a quarter)
  return { u: lead.u - fu * back - fv * across, v: lead.v - fv * back + fu * across };
}

function slotOf(b: Battle, f: FieldState, g: FieldGroup, slot: number): At {
  const lead = f.byId[g.leader];
  const at = slotAt(lead, g.heading, slot);
  return { u: Math.max(0, Math.min(b.board.w - 1, at.u)), v: Math.max(0, Math.min(b.board.d - 1, at.v)) };
}

function strike(b: Battle, f: FieldState, st: SpikeState, me: Unit, to: Unit, rng: Rng, out: FieldEvent[]): void {
  const def = f.info[me.id].def;
  const tdef = f.info[to.id].def;
  const way = wayTo(me, to);
  me.facing = way;
  const ht = (x: At) => b.board.tiles[x.v * b.board.w + x.u].h;
  const mult = blowMult(ht(me), ht(to), way, to.facing);
  const raw = def.atk * (me.power ?? 1) * mult * (0.9 + 0.2 * rng.next());
  const dmg = Math.max(1, Math.round(raw - tdef.def * 0.5));
  me.busyUntil = b.t + def.atkMs;
  me.swing = { at: b.t, ms: Math.min(def.atkMs, 500), to: to.id };
  const land = b.t + (def.shot ? 300 + 40 * dist(me, to) : 300);
  // (kept in the order they land, ties in the order they were struck)
  let k = st.pending.length;
  while (k > 0 && st.pending[k - 1].at > land) k--;
  st.pending.splice(k, 0, { at: land, by: me.id, to: to.id, dmg });
  out.push({ kind: 'blow', by: me.id, to: to.id, shot: !!def.shot });
}

/** Take one step onto board tile `i`. */
function stepOnto(b: Battle, f: FieldState, me: Unit, i: number, cost: number): void {
  const t = b.board.tiles;
  const from = t[me.v * b.board.w + me.u];
  const u = i % b.board.w;
  const v = (i - u) / b.board.w;
  const def = f.info[me.id].def;
  const ms = Math.round(def.moveMs * (def.flies ? 1 : cost));
  me.facing = wayTo(me, { u, v });
  me.step = { u: me.u, v: me.v, h: from.h, at: b.t, ms };
  occMove(f, me, i);
  me.u = u;
  me.v = v;
  me.busyUntil = b.t + ms;
  f.info[me.id].stuck = undefined;
}

/** A soldier's steering: the neighbour tile nearest the mark that it can step onto and nobody holds, if it is nearer than here
 *  (four checks, the design's 7.3, point 4). With no such step for `STUCK_MS`, it asks for one bounded walk. */
function steer(b: Battle, f: FieldState, me: Unit, mark: At): boolean {
  const w = b.board.w;
  const here = b.board.tiles[me.v * w + me.u];
  const jump = f.info[me.id].def.jump;
  const d2 = (u: number, v: number) => (u - mark.u) * (u - mark.u) + (v - mark.v) * (v - mark.v);
  let best = -1;
  let bestCost = 0;
  let bd = d2(me.u, me.v);
  for (const [du, dv] of DIRS) {
    const u = me.u + du;
    const v = me.v + dv;
    if (u < 0 || v < 0 || u >= w || v >= b.board.d) continue;
    const j = v * w + u;
    if (f.occ[j] >= 0) continue;
    const c = canStep(here, b.board.tiles[j], jump);
    if (c === null) continue;
    const s = d2(u, v);
    if (s < bd) {
      bd = s;
      best = j;
      bestCost = c;
    }
  }
  if (best >= 0) {
    stepOnto(b, f, me, best, bestCost);
    return true;
  }
  const info = f.info[me.id];
  if (info.stuck === undefined) info.stuck = b.t;
  if (b.t - info.stuck < STUCK_MS) return false;
  info.stuck = b.t;
  return walkTowards(b, f, me, mark);
}

/** A real walk towards a mark: a long walk over the sectors, then a bounded walk (`walkNear`) in the window round the walker to the
 *  tile that brings it nearest the next sectors on the way. One step of it is taken. */
function walkTowards(b: Battle, f: FieldState, me: Unit, mark: At): boolean {
  const w = b.board.w;
  const def = f.info[me.id].def;
  const c = jumpClass(def.jump);
  // (a leader walks through its own side's soldiers, changing places with one in its way; anyone else blocks)
  const mine = (j: number) => {
    const o = f.occ[j];
    return o >= 0 && f.byId[o].side === me.side && f.info[o].role === 'soldier';
  };
  const walk = walkNear(b.board, me, def.jump, (j) => f.occ[j] >= 0 && f.occ[j] !== me.id && !(f.info[me.id].role === 'leader' && mine(j)), 8);
  f.stats.walks++;
  f.stats.tickWalks++;
  // (where to make for: the mark itself when it is in the window, else the middle of the region after next on the long walk)
  let point: At = mark;
  // (the mark counts as in reach when the window's walk gets to it or beside it; behind a wall in the window, the long walk leads)
  let inWindow = false;
  for (const [du, dv] of [[0, 0], ...DIRS]) {
    const k = nearIndex(walk, w, (mark.v + dv) * w + mark.u + du);
    if (mark.u + du >= 0 && mark.u + du < w && k >= 0 && walk.cost[k] < Infinity) inWindow = true;
  }
  if (!inWindow) {
    const g = f.sectors;
    const to = regionAt(g, c, mark.v * w + mark.u);
    const n1 = nextRegion(g, regionAt(g, c, me.v * w + me.u), to, c);
    if (n1 >= 0 && n1 !== to) {
      const n2 = nextRegion(g, n1, to, c);
      const m = g.classes[c].mid[n2 >= 0 ? n2 : n1];
      point = { u: m % w, v: Math.floor(m / w) };
    }
  }
  // (the window's tile nearest the point, with a little of the walk's cost; a foe's own tile is held, so stop beside it)
  let best = -1;
  let bs = Infinity;
  for (let k = 0; k < walk.cost.length; k++) {
    const cost = walk.cost[k];
    if (cost === Infinity) continue;
    const u = walk.u0 + (k % walk.w);
    const v = walk.v0 + Math.floor(k / walk.w);
    const s = 2 * (Math.abs(u - point.u) + Math.abs(v - point.v)) + cost * 0.5;
    if (s < bs) {
      bs = s;
      best = v * w + u;
    }
  }
  const here = me.v * w + me.u;
  if (best < 0 || best === here) return false;
  const first = nearFirstStep(walk, w, best);
  if (first === null) return false;
  const k = nearIndex(walk, w, first);
  const from = b.board.tiles[here];
  const cost = canStep(from, b.board.tiles[first], def.jump) ?? walk.cost[k];
  const other = f.occ[first];
  // (a tile its own soldier holds: they change places, the soldier stepping back onto the leader's tile)
  if (other >= 0 && other !== me.id) {
    const o = f.byId[other];
    if (canStep(b.board.tiles[first], from, f.info[other].def.jump) === null) return false;
    stepOnto(b, f, me, first, cost);
    f.occ[first] = me.id;
    o.step = { u: o.u, v: o.v, h: b.board.tiles[first].h, at: b.t, ms: f.info[other].def.moveMs };
    o.u = here % w;
    o.v = Math.floor(here / w);
    f.occ[here] = o.id;
    o.busyUntil = Math.max(o.busyUntil, b.t + f.info[other].def.moveMs);
    return true;
  }
  stepOnto(b, f, me, first, cost);
  return true;
}

/** A plain checksum of where the fight stands (for the determinism test and the bench's report). */
export function spikeChecksum(b: Battle): number {
  let h = b.rng >>> 0;
  for (const x of b.units) h = (Math.imul(h ^ (x.id * 31 + x.u * 101 + x.v * 7 + x.hp * 13 + (x.alive ? 1 : 0)), 0x9e3779b1) >>> 0) ^ (h >>> 15);
  return (h ^ b.t) >>> 0;
}
