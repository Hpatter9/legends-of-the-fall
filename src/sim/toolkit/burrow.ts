// Burrow (RPG-SPELLS batch 1, docs/notes/rpg-spells-design.md section 3.5): the caster digs down, travels under the ground, and comes
// up under a foe: the foe there is struck and launched, the foes beside it are struck and shoved a tile, and the caster takes its tile.
// While it is underground it cannot act, be targeted or be struck (only its own ailments tick), and its tile is free (`unitAt` skips
// it). The rise is a pending event (`b.pending`, kind `erupt`), as a meteor's fall is. No randomness.

import { DIRS, type At } from '../board';
import { atkOf, defOf, defenceOf, hurt, wayTo, type Battle, type BattleEvent, type Pending, type Unit } from '../battle';
import { canLand } from './blink';
import { displace } from './move';

export interface BurrowOpts {
  /** How far the target may be (tiles), the blow on it, how far it is launched, and the blow on the foes beside it. */
  reach: number;
  mult: number;
  launch: number;
  splash: number;
}

/** What a burrowing fighter keeps while it is underground. */
export interface Burrowing {
  from: At;
  target: number;
  until: number;
  o: BurrowOpts;
}

export const BURROW = {
  /** Underground this long, and this much more a tile travelled. */
  MS: 800,
  TILE_MS: 100,
  /** The target may have moved this much past `reach` and still be followed. */
  SLACK: 2,
} as const;

const apart = (a: At, c: At) => Math.abs(a.u - c.u) + Math.abs(a.v - c.v);
const foesOf = (b: Battle, me: Unit) => b.units.filter((x) => x.alive && x.side !== me.side && !x.under && !(x.hideUntil !== undefined && x.hideUntil > b.t));
const backLine = (f: Unit) => defOf(f).range >= 2;

/** The AI's target (the design's section 3.5): the foe within `reach` with the most foes beside it, back-line foes counted twice; ties
 *  by distance, then id. */
export function burrowTarget(b: Battle, me: Unit, reach: number): Unit | undefined {
  const foes = foesOf(b, me);
  let best: { f: Unit; s: number; d: number } | undefined;
  for (const f of foes) {
    const d = apart(me, f);
    if (d > reach) continue;
    const s = (backLine(f) ? 2 : 1) + foes.filter((x) => x !== f && apart(x, f) === 1).reduce((n, x) => n + (backLine(x) ? 2 : 1), 0);
    if (!best || s > best.s || (s === best.s && (d < best.d || (d === best.d && f.id < best.f.id)))) best = { f, s, d };
  }
  return best?.f;
}

/** The tiles the tunnel runs under, for the page's moving mound (a straight run, u first). */
function tunnel(from: At, to: At): At[] {
  const path: At[] = [];
  let u = from.u;
  let v = from.v;
  while (u !== to.u) path.push({ u: (u += Math.sign(to.u - u)), v });
  while (v !== to.v) path.push({ u, v: (v += Math.sign(to.v - v)) });
  return path;
}

/** Go down: false when there is no target in reach. */
export function burrow(b: Battle, me: Unit, o: BurrowOpts, out: BattleEvent[], target = burrowTarget(b, me, o.reach)): boolean {
  if (!target || me.under) return false;
  const ms = BURROW.MS + BURROW.TILE_MS * apart(me, target);
  me.under = { from: { u: me.u, v: me.v }, target: target.id, until: b.t + ms, o };
  me.hideUntil = Math.max(me.hideUntil ?? 0, b.t + ms);
  me.busyUntil = Math.max(me.busyUntil, b.t + ms);
  me.step = me.swing = undefined;
  out.push({ kind: 'burrow', by: me.id, phase: 'down', u: me.u, v: me.v, ms, path: tunnel(me, target) });
  b.pending.push({ at: b.t + ms, kind: 'erupt', by: me.id, to: target.id, dmg: 0, heavy: true } as Pending);
  return true;
}

/** Come up (the pending `erupt`). */
export function erupt(b: Battle, p: Pending, out: BattleEvent[]): void {
  const me = b.units.find((x) => x.id === p.by);
  if (!me || !me.under) return;
  const { from, o } = me.under;
  delete me.under;
  me.hideUntil = b.t;
  if (!me.alive) return;
  // (where it comes up: the target where it stands now, if it is still in reach; else the nearest foe in reach; else where it went down)
  const was = b.units.find((x) => x.id === p.to);
  let foe = was && was.alive && !was.under && apart(from, was) <= o.reach + BURROW.SLACK ? was : undefined;
  if (!foe) foe = foesOf(b, me).filter((f) => apart(from, f) <= o.reach).sort((x, y) => apart(from, x) - apart(from, y) || x.id - y.id)[0];
  let at: At = foe ? { u: foe.u, v: foe.v } : from;
  const near = foe ? foesOf(b, me).filter((x) => x !== foe && apart(x, foe!) === 1) : [];
  if (foe) {
    hurt(b, me, foe, Math.max(1, Math.round(atkOf(me) * o.mult - defenceOf(foe))), true, false, out, 'skill');
    if (foe.alive) displace(b, me, foe, foe.u === from.u && foe.v === from.v ? 1 : wayTo(from, foe), o.launch, 'launch', out);
  }
  // (the caster takes the target's tile; if the target did not move off it, the nearest free tile beside)
  if (!canLand(b, me, at)) {
    const spot = [at, ...DIRS.map(([du, dv]) => ({ u: at.u + du, v: at.v + dv }))].find((x) => canLand(b, me, x));
    at = spot ?? from;
  }
  me.u = at.u;
  me.v = at.v;
  me.step = undefined;
  out.push({ kind: 'burrow', by: me.id, phase: 'up', u: at.u, v: at.v, ms: 0, path: [] });
  for (const x of near) {
    if (!x.alive) continue;
    hurt(b, me, x, Math.max(1, Math.round(atkOf(me) * o.splash - defenceOf(x))), false, true, out, 'skill');
    if (x.alive) displace(b, me, x, wayTo(at, x), 1, 'shove', out);
  }
}
