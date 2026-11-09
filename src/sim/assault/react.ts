// The hold's reactive mind (phase 1b, `docs/notes/assault-1.md`; the owner's tactics direction): the garrison answers what the player does.
//
// - FEINTS. The gate or palisade segment struck last (within eight seconds) draws help: the nearest gate crew or bailey post whose own gate
//   has not been struck for fifteen seconds, and that has none of ours near its home, leaves for it (two at most for one threat). So a
//   feint at one gate thins another. A post sent away goes home the moment its own gate is struck, and the walk back is the window.
// - CAPTAINS SALLY. A captain's post (the South Gate's, the Iron Gate's) charges out at a platoon of ours within twelve tiles that is
//   weakened (half its soldiers lost, or its hero under half health), for twenty seconds, then goes home. One at a time each.
// - THE LORD SALLIES once, when ours first stand in the inner bailey: he and his bodyguard come down off the mound at the nearest platoon
//   for twenty-five seconds, then climb back to the throne.
// - WOLF RIDERS. On the great horn the wolves leave their pens and ride round the flank for the rearmost platoon of ours (the shooters'
//   cover first), hunting it wherever it is, for a minute.
// - THE WARPATH. Reinforcements gather at the Warpath's reserve camp and march down it to the North Gate (let in through it while it
//   stands) to join the post that has lost the most: a band every ninety seconds while a war drum beats, every two and a half minutes once
//   all are silenced, four bands at most (the design's twenty), until the Warpath is HELD (ours have stood at its camp ten seconds with no foe within six). A band
//   already marching still comes. Burning every tent of its reserve camp (fire arrows, phase 2) stops them too.
//
// Every rule is the hold's own second, in post order, with no random numbers. Pure rules: no Pixi, no DOM.

import type { Battle, Unit } from '../battle';
import type { At } from '../board';
import { forNear, type FieldGroup, type FieldState } from './field';
import { ringOf } from './fieldMap';
import { addFieldUnit, archersOnly, freeNear, holdBoosts, KIND, KINDS } from './garrison';
import { drumsBeating, isWall } from './forts';
import type { HoldState, PostState } from './holdTypes';

/** A gate struck this recently is threatened, and draws help; a post whose own gate was struck this recently stays. */
export const THREAT_MS = 8000;
export const STAY_MS = 15_000;
/** At most this many posts go to one threat; a post goes from this far at most; it stays this long, then goes home if nothing comes. */
export const FEINT_POSTS = 2;
export const FEINT_REACH = 30;
export const FEINT_MS = 40_000;
/** A captain sallies at a weakened platoon this near, for this long. */
export const CAPTAIN_NEAR = 12;
export const CAPTAIN_MS = 20_000;
export const LORD_MS = 25_000;
/** The wolves ride for this long. */
export const WOLF_MS = 60_000;
/** The bands: every this long while a drum beats, else every `BAND_SLOW_MS`. */
export const BAND_MS = 90_000;
export const BAND_SLOW_MS = 150_000;
/** The Warpath is held once ours have stood this near its camp, with no foe as near, this long. */
export const HOLD_NEAR = 6;
export const HOLD_MS = 10_000;
/** A marching band is let in through the North Gate this near its causeway. */
const GATE_IN = 3;

const dist = (a: At, z: At) => Math.abs(a.u - z.u) + Math.abs(a.v - z.v);

/** The reactive mind's second (the first tick of each second, after the horn and the sallies). */
export function reactSecond(b: Battle, f: FieldState, h: HoldState, anchorOf: (k: number) => Unit | undefined): void {
  if (h.lordFell !== undefined) return;
  feints(b, f, h);
  captains(b, f, h, anchorOf);
  wolves(b, f, h, anchorOf);
  warpath(b, f, h);
}

/** A post's errand this second: true when it set the post's mark (its own mind's hunting is skipped). */
export function errandMark(b: Battle, f: FieldState, _h: HoldState, p: PostState, anchorOf: (k: number) => Unit | undefined): boolean {
  const e = p.errand;
  if (!e) return false;
  const g = f.groups[p.group];
  if (b.t >= e.until) {
    endErrand(f, p);
    return false;
  }
  // (a reinforcing post hunts round its new home as any post; a band marches for the gate)
  if (e.kind === 'reinforce') return false;
  if (e.kind === 'march') {
    p.mark = { ...e.at! };
    return true;
  }
  const a = e.platoon !== undefined ? anchorOf(e.platoon) : undefined;
  if (!a) {
    endErrand(f, p);
    return false;
  }
  p.mark = { u: a.u, v: a.v };
  void g;
  return true;
}

function endErrand(f: FieldState, p: PostState): void {
  const e = p.errand;
  p.errand = undefined;
  // (back home: a reinforcing post to where it was posted; a sally, the wolves, to their own homes)
  if (e?.kind === 'reinforce' && p.origin) f.groups[p.group].home = { ...p.origin };
  p.mark = { ...f.groups[p.group].home };
}

/** Whether a fort was struck within `ms`. */
const struckWithin = (b: Battle, at: number | undefined, ms: number) => at !== undefined && b.t - at <= ms;

function feints(b: Battle, f: FieldState, h: HoldState): void {
  const w = b.board.w;
  // (a post sent away goes home when its own gate is struck)
  for (const p of h.posts) {
    if (p.errand?.kind !== 'reinforce') continue;
    const mine = h.forts.find((x) => x.spec.id === p.def.guards);
    if (mine && !mine.broken && struckWithin(b, mine.struckAt, 2000)) endErrand(f, p);
  }
  const threat = h.forts
    .map((x, i) => ({ x, i }))
    .filter(({ x }) => isWall(x.spec.kind) && !x.broken && !x.open && struckWithin(b, x.struckAt, THREAT_MS))
    .sort((p, q) => (q.x.struckAt ?? 0) - (p.x.struckAt ?? 0))[0];
  if (!threat) return;
  const id = threat.x.spec.id;
  const sent = h.posts.filter((p) => p.errand?.kind === 'reinforce' && p.errand.fort === id).length;
  if (sent >= FEINT_POSTS) return;
  const t = threat.x.spec.tiles[0];
  const at = inside(t % w, Math.floor(t / w));
  let best: PostState | undefined;
  let bd = Infinity;
  for (const p of h.posts) {
    if (p.errand || p.mood === 'posted' || p.mood === 'routed' || p.mood === 'sally' || archersOnly(p.def, h.input.army) || p.def.id === 'throne') continue;
    if (p.def.zone !== 'palisade' && p.def.zone !== 'bailey') continue;
    if (p.def.guards === id) continue;
    const g = f.groups[p.group];
    if (!g.members.some((m) => f.byId[m].alive)) continue;
    const mine = h.forts.find((x) => x.spec.id === p.def.guards);
    if (mine && !mine.broken && struckWithin(b, mine.struckAt, STAY_MS)) continue;
    let near = false;
    forNear(f, g.home.u, g.home.v, 8, (x) => (near ||= x.side === 'hero' && x.alive));
    if (near) continue;
    const d = dist(g.home, at);
    if (d > FEINT_REACH || d >= bd) continue;
    bd = d;
    best = p;
  }
  if (!best) return;
  best.origin ??= { ...f.groups[best.group].home };
  best.errand = { kind: 'reinforce', fort: id, at, until: b.t + FEINT_MS };
  f.groups[best.group].home = { ...at };
  best.mark = { ...at };
  h.events.push({ kind: 'feint', post: h.posts.indexOf(best), fort: id });
}

/** A few tiles inside the ring from a wall's tile (where a reinforcing post stands to meet those coming through). */
function inside(u: number, v: number): At {
  const du = u - 49.5;
  const dv = v - 49.5;
  return Math.abs(du) >= Math.abs(dv) ? { u: Math.round(u - Math.sign(du) * 3), v } : { u, v: Math.round(v - Math.sign(dv) * 3) };
}

function captains(b: Battle, f: FieldState, h: HoldState, anchorOf: (k: number) => Unit | undefined): void {
  for (const p of h.posts) {
    const lord = p.def.id === 'throne';
    const captain = p.def.roster.trim().startsWith('C');
    if ((!lord && !captain) || p.errand || p.mood === 'routed' || (p.mood === 'posted' && !lord)) continue;
    const g = f.groups[p.group];
    const leader = f.byId[g.leader];
    if (!leader?.alive) continue;
    // (the lord once, when ours first stand in the inner bailey; a captain at a platoon weakened near its post)
    let pick = -1;
    let bd = Infinity;
    h.platoons.forEach((pl, k) => {
      const a = anchorOf(k);
      if (!a) return;
      const d = dist(a, g.home);
      if (lord) {
        if (h.lordSallied || ringOf(a.u, a.v) >= 10 || d >= bd) return;
      } else {
        const hero = f.byId[pl.heroId];
        const left = pl.soldiers.filter((s) => f.byId[s.id]?.alive).length;
        const weak = left * 2 <= pl.soldiers.length || !hero.alive || hero.hp * 2 < hero.maxHp;
        if (!weak || d > CAPTAIN_NEAR || d >= bd) return;
      }
      bd = d;
      pick = k;
    });
    if (pick < 0) continue;
    if (lord) {
      h.lordSallied = true;
      p.mood = 'alerted';
      g.awake = true;
    }
    p.errand = { kind: 'sally', platoon: pick, until: b.t + (lord ? LORD_MS : CAPTAIN_MS) };
    h.events.push({ kind: 'captain', post: h.posts.indexOf(p), platoon: pick });
  }
}

function wolves(b: Battle, _f: FieldState, h: HoldState, anchorOf: (k: number) => Unit | undefined): void {
  if (!h.hornDone) return;
  for (const p of h.posts) {
    if (p.def.id !== 'wolves' || p.errand || p.mood === 'routed' || p.rode) continue;
    // (the rearmost platoon: the cover first, else the one furthest from the throne)
    let pick = -1;
    let score = -Infinity;
    h.platoons.forEach((pl, k) => {
      const a = anchorOf(k);
      if (!a) return;
      const s = dist(a, h.bp.throne) + (pl.role === 'cover' ? 40 : 0);
      if (s > score) {
        score = s;
        pick = k;
      }
    });
    if (pick < 0) return;
    p.rode = true;
    p.errand = { kind: 'flank', platoon: pick, until: b.t + WOLF_MS };
    h.events.push({ kind: 'wolves', post: h.posts.indexOf(p), platoon: pick });
  }
}

function warpath(b: Battle, f: FieldState, h: HoldState): void {
  const wp = h.warpath;
  const camp = h.bp.warpath;
  // (held: ours at the camp, no foe as near, ten seconds)
  if (!wp.held) {
    let ours = false;
    let theirs = false;
    forNear(f, camp.u, camp.v, HOLD_NEAR, (x) => {
      if (!x.alive || dist(x, camp) > HOLD_NEAR) return;
      if (x.side === 'hero') ours = true;
      else theirs = true;
    });
    if (ours && !theirs) {
      wp.since ??= b.t;
      if (b.t - wp.since >= HOLD_MS) {
        wp.held = true;
        h.events.push({ kind: 'held' });
      }
    } else wp.since = undefined;
  }
  // (its camp burnt: every reserve tent fire-arrowed to the ground, phase 2; no more bands set out)
  if (!wp.burnt) {
    const tents = h.siege.huts.filter((x) => x.name === 'Reserve tent');
    if (tents.length && tents.every((x) => x.burnt || x.burning !== undefined)) {
      wp.burnt = true;
      h.events.push({ kind: 'campBurnt' });
    }
  }
  // (the bands on the march: let in through the North Gate at its causeway while it stands; then they join the post that has lost the most)
  const gate = h.forts.find((x) => x.spec.kind === 'northGate');
  const shut = !!gate && !gate.broken && !gate.open;
  const front = gate?.spec.front ?? h.bp.reinforce.at;
  for (let n = wp.marching.length - 1; n >= 0; n--) {
    const m = wp.marching[n];
    const p = h.posts[m.post];
    const living = m.ids.map((id) => f.byId[id]).filter((x) => x?.alive);
    if (!living.length) {
      wp.marching.splice(n, 1);
      continue;
    }
    const there = living.some((x) => dist(x, front) <= GATE_IN) || living.some((x) => ringOf(x.u, x.v) < 24);
    if (!there) continue;
    if (shut)
      for (const x of living) {
        if (ringOf(x.u, x.v) < 24) continue;
        const at = freeNear(b, f, h.bp.reinforce.at, false);
        if (f.occ[x.v * f.w + x.u] === x.id) f.occ[x.v * f.w + x.u] = -1;
        x.u = at.u;
        x.v = at.v;
        x.step = undefined;
        f.occ[at.v * f.w + at.u] = x.id;
      }
    wp.marching.splice(n, 1);
    const join = mostLost(f, h);
    p.errand = undefined;
    f.groups[p.group].home = join ? { ...f.groups[join.group].home } : { ...h.bp.throne };
    p.mark = { ...f.groups[p.group].home };
  }
  // (a band sets out, while the Warpath is not held)
  if (wp.held || wp.burnt || h.bands >= h.bp.reinforce.bands) return;
  const every = drumsBeating(h).length ? BAND_MS : BAND_SLOW_MS;
  if (b.t < every * (h.bands + 1)) return;
  const post = band(b, f, h);
  post.errand = { kind: 'march', at: { ...front }, until: Infinity };
  wp.marching.push({ post: h.posts.indexOf(post), ids: [...f.groups[post.group].members] });
  h.events.push({ kind: 'march', post: h.posts.indexOf(post) });
}

/** The post that has lost the most (where a band goes once it is in). */
function mostLost(f: FieldState, h: HoldState): PostState | undefined {
  let best: PostState | undefined;
  let lost = 0;
  for (const p of h.posts) {
    if (p.mood === 'routed' || p.def.zone === 'warpath') continue;
    const gone = p.muster - f.groups[p.group].members.filter((id) => f.byId[id].alive).length;
    if (gone > lost) {
      lost = gone;
      best = p;
    }
  }
  return best;
}

/** A band of the Warpath's roster at its reserve camp: a post of its own, awake, marching. */
function band(b: Battle, f: FieldState, h: HoldState): PostState {
  const bp = h.bp;
  const def = { id: `band${h.bands + 1}`, name: 'A band from the Warpath', zone: 'warpath' as const, at: { ...bp.warpath }, roster: bp.reinforce.roster };
  const g: FieldGroup = { id: f.groups.length, side: 'foe', name: def.name, leader: 0, members: [], home: { ...bp.warpath }, awake: true, route: [], heading: 1 };
  f.groups.push(g);
  const { foes } = holdBoosts(h);
  for (const c of bp.reinforce.roster.replace(/ /g, '')) {
    // (the hold's own army's fighters, not always the Orcs')
    const unit = addFieldUnit(b, f, (KINDS[h.input.army] ?? KIND)[c], freeNear(b, f, bp.warpath, false), foes, g.id, g.members.length);
    unit.busyUntil = b.t;
    if (!g.members.length) g.leader = unit.id;
    g.members.push(unit.id);
    h.garrison.push(unit.id);
  }
  const post: PostState = { def, group: g.id, mood: 'alerted', mark: { ...bp.warpath }, muster: g.members.length };
  h.posts.push(post);
  h.bands++;
  return post;
}

