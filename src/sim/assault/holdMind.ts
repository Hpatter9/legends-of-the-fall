// The hold's mind (phase 1, `docs/notes/assault-1.md`; the design's 4.4, 4.5, 5.2 to 5.4): cheap, a few decisions a second for the whole
// garrison, each post's turn spread over the ten ticks of a second by its group.
//
// - A post WAKES (alerted) when one of ours comes within eight tiles of its home, or one of its own is hurt, and calls the posts within twelve.
//   The barracks, the wolves, the beast pens and the sally ports wait for the great horn (or ours at their door).
// - The GREAT HORN sounds when a gate or segment of the palisade is first struck: the barracks empty, the sally ports open, and the bank's
//   archers spread to the threatened side.
// - SALLIES: once the ports are open, a platoon alone (no friendly platoon within eight) near one is set upon by the post with the most
//   soldiers near that port. One sally at a time.
// - MORALE belongs to the foes only. A post routs when it has lost 60% and its leader is down, or when its leader flees; never within eight
//   tiles of a drum still beating. Everyone routs when the lord falls. The player's soldiers never rout.
// - The DRUMS: while any beats, a band of five comes every 90 seconds from 1:30 (four at most); foes near one strike a tenth harder.
// - A GATE whose crew has all fallen, with one of ours inside the wall near it, opens from inside after ten seconds.
// - A downed hero RISES at the rally flag after 45 seconds, at half health, while three or more of its soldiers stand.
// - The ACOLYTES mend: each heals the most hurt friend within two tiles for 4% of its health a second, soldiers first.
//
// Pure rules: no Pixi, no DOM, no randomness.

import { mendUnit } from '../abilities';
import type { Battle, BattleEvent, Unit } from '../battle';
import type { At } from '../board';
import { forNear, type FieldState } from './field';
import { ringOf } from './fieldMap';
import { archersOnly, freeNear, reinforce } from './garrison';
import { breakFort, drumsBeating, openPort } from './forts';
import type { HoldState, PostState } from './holdTypes';
import { ELITE_TRICK, rankOf, TRICKS } from './troops';

export const WAKE = 8;
export const CALL = 12;
/** An awake post hunts ours this far from its home (the throne's guard keeps closer), and goes home past it. */
export const HUNT = 14;
export const THRONE_HUNT = 8;
/** A post routs having lost this share, with its leader down. */
export const ROUT_LOSS = 0.6;
/** A drum's reach: its foes strike harder and stand firm within it. */
export const DRUM_REACH = 8;
export const DRUM_BLOW = 1.1;
/** The reinforcements: every this long while a drum beats, from the first. */
export const BAND_MS = 90_000;
/** A platoon alone has no friendly platoon within this; a sally goes for one this near an open port, and gives up after this long. */
export const ALONE = 8;
export const SALLY_NEAR = 14;
export const SALLY_MS = 30_000;
/** A gate opens from inside this long after its crew fell, with one of ours this near it inside the wall. */
export const GATE_OPEN_MS = 10_000;
export const GATE_NEAR = 6;
/** A downed hero rises at the rally flag after this long, at this share, while this many of its soldiers stand. */
export const RISE_MS = 45_000;
export const RISE_HP = 0.5;
export const RISE_SOLDIERS = 3;

const dist = (a: At, z: At) => Math.abs(a.u - z.u) + Math.abs(a.v - z.v);

/** The hold's turn this tick: each post whose second it is, and the hold's own jobs on the first tick of each second. */
export function holdTick(b: Battle, f: FieldState, h: HoldState, out: BattleEvent[]): void {
  const slice = f.stats.ticks % 10;
  // (the lord's fall: everyone routs, for the North Gate)
  if (h.lordFell === undefined && !f.byId[h.lord]?.alive) {
    h.lordFell = b.t;
    h.events.push({ kind: 'lordFell' });
    for (const p of h.posts) rout(f, h, p);
  }
  for (const p of h.posts) if (p.group % 10 === slice) postSecond(b, f, h, p);
  if (slice !== 0) return;
  hornSecond(b, f, h);
  sallySecond(b, f, h);
  drumSecond(b, f, h);
  gateSecond(b, f, h);
  riseSecond(b, f, h, out);
  mendSecond(b, f, h, out);
}

/** A post's second: asleep, it looks for ours near its home; awake, it picks its mark; it may rout. */
function postSecond(b: Battle, f: FieldState, h: HoldState, p: PostState): void {
  const g = f.groups[p.group];
  const living = g.members.filter((id) => f.byId[id].alive);
  if (!living.length) return;
  if (p.mood === 'posted') {
    const hurt = living.some((id) => f.byId[id].hp < f.byId[id].maxHp);
    let near = false;
    forNear(f, g.home.u, g.home.v, p.def.horn ? 4 : WAKE, (x) => (near = x.side === 'hero'));
    if (hurt || near) wake(f, h, p, true);
    // (a patrol walks its round while it is posted)
    if (p.def.loop && p.loopAt !== undefined) {
      const lead = f.byId[g.leader].alive ? f.byId[g.leader] : f.byId[living[0]];
      const at = p.def.loop[p.loopAt];
      if (dist(lead, at) <= 2) p.loopAt = (p.loopAt + 1) % p.def.loop.length;
      p.mark = p.def.loop[p.loopAt];
    }
    return;
  }
  if (p.mood === 'routed') return;
  // (morale: a post routs having lost the most of its band with its leader down, or when its leader flees; never by a drum still beating)
  const lead = f.byId[g.leader];
  const lost = 1 - living.length / Math.max(1, p.muster);
  const fled = !!lead.fled;
  if ((fled || (lost >= ROUT_LOSS && !lead.alive)) && !nearDrum(b, h, g.home)) {
    rout(f, h, p);
    return;
  }
  if (p.mood === 'sally' && h.sally?.post === h.posts.indexOf(p)) {
    const pl = h.platoons[h.sally.platoon];
    const target = f.byId[pl.heroId]?.alive ? f.byId[pl.heroId] : pl.soldiers.map((s) => f.byId[s.id]).find((x) => x?.alive);
    if (target && b.t < h.sally.until) {
      p.mark = { u: target.u, v: target.v };
      return;
    }
    h.sally = undefined;
    p.mood = 'alerted';
  }
  // (archers keep to their perch, their wall or their bank; the others hunt the nearest of ours within reach of home)
  if (archersOnly(p.def)) {
    p.mark = { ...g.home };
    return;
  }
  const reach = p.def.id === 'throne' ? THRONE_HUNT : HUNT;
  let best: Unit | null = null;
  let bd = Infinity;
  forNear(f, g.home.u, g.home.v, reach, (x) => {
    if (x.side !== 'hero') return;
    const d = dist(x, g.home);
    if (d < bd) {
      bd = d;
      best = x;
    }
  });
  const m = best as Unit | null;
  p.mark = m ? { u: m.u, v: m.v } : { ...g.home };
}

/** Wake a post (alerted), and with it the posts near it that wait for no horn. */
export function wake(f: FieldState, h: HoldState, p: PostState, call: boolean): void {
  if (p.mood !== 'posted') return;
  p.mood = 'alerted';
  f.groups[p.group].awake = true;
  h.events.push({ kind: 'wake', group: p.group });
  if (!call) return;
  const home = f.groups[p.group].home;
  for (const o of h.posts) if (o.mood === 'posted' && !o.def.horn && dist(f.groups[o.group].home, home) <= CALL) wake(f, h, o, false);
}

function rout(f: FieldState, h: HoldState, p: PostState): void {
  if (p.mood === 'routed') return;
  p.mood = 'routed';
  f.groups[p.group].awake = true;
  p.mark = h.lordFell !== undefined ? { ...h.bp.northGate } : { ...h.bp.throne };
  if (h.sally?.post === h.posts.indexOf(p)) h.sally = undefined;
  h.events.push({ kind: 'rout', post: h.posts.indexOf(p) });
}

/** Whether a drum still beats within its reach of a spot. */
export function nearDrum(b: Battle, h: HoldState, at: At): boolean {
  const w = b.board.w;
  return drumsBeating(h).some((d) => dist({ u: d.spec.tiles[0] % w, v: Math.floor(d.spec.tiles[0] / w) }, at) <= DRUM_REACH);
}

/** The horn's work, once: the barracks and the pens wake, the sally ports open, the bank's archers spread to the side struck. */
function hornSecond(b: Battle, f: FieldState, h: HoldState): void {
  if (!h.horn || h.hornDone) return;
  h.hornDone = true;
  for (const p of h.posts) if (p.def.horn) wake(f, h, p, false);
  h.forts.forEach((x, i) => {
    if (x.spec.kind === 'sallyPort') openPort(b, h, i);
  });
  // (the bank's archers: each group to the bank behind the structure struck last)
  const struck = h.forts.filter((x) => x.struckAt !== undefined).sort((x, y) => (y.struckAt ?? 0) - (x.struckAt ?? 0))[0];
  if (!struck) return;
  const w = b.board.w;
  const t = struck.spec.tiles[0];
  const su = t % w;
  const sv = Math.floor(t / w);
  let n = 0;
  for (const p of h.posts) {
    if (!p.def.id.startsWith('bank')) continue;
    // (a step inside the palisade, three tiles apart along it)
    const along = (n++ - 1.5) * 3;
    const home = Math.abs(su - 49.5) >= Math.abs(sv - 49.5) ? { u: su > 49.5 ? 70 : 29, v: Math.round(Math.max(30, Math.min(69, sv + along))) } : { u: Math.round(Math.max(30, Math.min(69, su + along))), v: sv > 49.5 ? 70 : 29 };
    f.groups[p.group].home = home;
    p.mark = home;
    wake(f, h, p, false);
  }
}

/** A sally: a platoon alone near an open port is set upon by the post with the most soldiers near that port. */
function sallySecond(b: Battle, f: FieldState, h: HoldState): void {
  if (h.sally || h.lordFell !== undefined) return;
  const w = b.board.w;
  const ports = h.forts.filter((x) => x.spec.kind === 'sallyPort' && (x.open || x.broken));
  if (!ports.length) return;
  const leads = h.platoons.map((pl) => anchorOf(f, pl));
  for (let k = 0; k < h.platoons.length; k++) {
    const a = leads[k];
    if (!a) continue;
    if (leads.some((o, j) => j !== k && o && dist(o, a) <= ALONE)) continue;
    const port = ports.find((x) => dist({ u: x.spec.tiles[0] % w, v: Math.floor(x.spec.tiles[0] / w) }, a) <= SALLY_NEAR);
    if (!port) continue;
    const pa = { u: port.spec.tiles[0] % w, v: Math.floor(port.spec.tiles[0] / w) };
    let best = -1;
    let most = 0;
    h.posts.forEach((p, i) => {
      if (p.mood === 'routed' || p.mood === 'sally' || archersOnly(p.def) || p.def.id === 'throne') return;
      const g = f.groups[p.group];
      if (dist(g.home, pa) > SALLY_NEAR + 4) return;
      const n = g.members.filter((id) => f.byId[id].alive).length;
      if (n > most) {
        most = n;
        best = i;
      }
    });
    if (best < 0) return;
    const p = h.posts[best];
    if (p.mood === 'posted') wake(f, h, p, false);
    p.mood = 'sally';
    p.mark = { ...a };
    h.sally = { post: best, platoon: k, until: b.t + SALLY_MS };
    h.events.push({ kind: 'sally', post: best, platoon: k });
    return;
  }
}

/** Where a platoon stands: its hero, or its soldier walking for it. */
export function anchorOf(f: FieldState, pl: HoldState['platoons'][number]): Unit | undefined {
  const hero = f.byId[pl.heroId];
  if (hero?.alive) return hero;
  if (pl.acting !== undefined && f.byId[pl.acting]?.alive) return f.byId[pl.acting];
  return pl.soldiers.map((s) => f.byId[s.id]).find((x) => x?.alive);
}

/** The drums: a band every `BAND_MS` while any beats, four at most. */
function drumSecond(b: Battle, f: FieldState, h: HoldState): void {
  if (h.lordFell !== undefined || h.bands >= h.bp.reinforce.bands || !drumsBeating(h).length) return;
  if (b.t < BAND_MS * (h.bands + 1)) return;
  const post = reinforce(b, f, h, h.bp);
  if (post) h.events.push({ kind: 'reinforce', post: h.posts.indexOf(post), n: h.bp.reinforce.roster.replace(/ /g, '').length });
}

/** A gate whose crew has all fallen opens from inside, ten seconds after one of ours stands inside the wall near it. */
function gateSecond(b: Battle, f: FieldState, h: HoldState): void {
  const w = b.board.w;
  h.forts.forEach((fort, i) => {
    if (fort.broken || fort.open || fort.spec.kind === 'palisade' || fort.spec.kind === 'drum') return;
    const crew = h.posts.filter((p) => p.def.guards === fort.spec.id);
    if (!crew.length || crew.some((p) => f.groups[p.group].members.some((id) => f.byId[id].alive))) {
      if (h.openAt) delete h.openAt[fort.spec.id];
      return;
    }
    const t = fort.spec.tiles[0];
    const at = { u: t % w, v: Math.floor(t / w) };
    const ring = ringOf(at.u, at.v);
    let inside = false;
    forNear(f, at.u, at.v, GATE_NEAR, (x) => (inside = x.side === 'hero' && ringOf(x.u, x.v) < ring - 0.5));
    if (!inside) {
      if (h.openAt) delete h.openAt[fort.spec.id];
      return;
    }
    const when = ((h.openAt ??= {})[fort.spec.id] ??= b.t + GATE_OPEN_MS);
    if (b.t >= when) breakFort(b, h, i);
  });
}

/** A downed hero is carried back by its soldiers, and rises at the rally flag (3.4). */
function riseSecond(b: Battle, f: FieldState, h: HoldState, out: BattleEvent[]): void {
  h.platoons.forEach((pl, k) => {
    const hero = f.byId[pl.heroId];
    if (!hero) return;
    if (hero.alive) {
      pl.downAt = undefined;
      return;
    }
    pl.downAt ??= hero.diedAt ?? b.t;
    if (b.t - pl.downAt < RISE_MS) return;
    const left = pl.soldiers.filter((s) => f.byId[s.id]?.alive).length;
    if (left < RISE_SOLDIERS) return;
    const at = freeNear(b, f, h.bp.rally, false);
    hero.u = at.u;
    hero.v = at.v;
    hero.alive = true;
    hero.hp = Math.max(1, Math.round(hero.maxHp * RISE_HP));
    hero.diedAt = undefined;
    hero.step = undefined;
    hero.swing = undefined;
    hero.busyUntil = b.t + 500;
    f.occ[at.v * f.w + at.u] = hero.id;
    pl.downAt = undefined;
    pl.acting = undefined;
    h.events.push({ kind: 'rise', platoon: k, id: hero.id });
    out.push({ kind: 'revive', by: hero.id, to: hero.id, hp: hero.hp });
  });
}

/** The Acolytes' mend: each heals the most hurt friend within its reach, soldiers first, a share of its health a second. */
function mendSecond(_b: Battle, f: FieldState, h: HoldState, out: BattleEvent[]): void {
  for (const pl of h.platoons) {
    if (pl.troop !== 'acolytes') continue;
    for (const s of pl.soldiers) {
      const me = f.byId[s.id];
      if (!me?.alive) continue;
      let best: Unit | null = null;
      let worst = 1;
      let soldier = false;
      forNear(f, me.u, me.v, TRICKS.mendReach, (x) => {
        if (x.side !== 'hero' || x.hp >= x.maxHp) return;
        const share = x.hp / x.maxHp;
        const isSoldier = !!f.info[x.id] && f.info[x.id].role === 'soldier';
        if ((isSoldier && !soldier) || ((isSoldier === soldier) && share < worst)) {
          best = x;
          worst = share;
          soldier = isSoldier;
        }
      });
      const to = best as Unit | null;
      if (!to) continue;
      const elite = rankOf(s.marks).rank === 'elite' ? ELITE_TRICK : 1;
      mendUnit(to, Math.max(1, Math.round(to.maxHp * TRICKS.mend * elite)), out, me);
    }
  }
}
