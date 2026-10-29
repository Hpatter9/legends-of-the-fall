// Charge and dash (RPG-SPELLS batch 1, docs/notes/rpg-spells-design.md section 3.1): the charger moves up to `tiles` to reach a
// target and strikes it. Three routes: straight along one of the four ways (`line`, as Gore Charge and Lance Charge do now), along
// the cheapest walk round others (`path`), or in a leap through the air (`leap`). `through` runs through the foes on a line,
// striking each (Iaido). On arrival: the blow, and the riders (a stun, a shove, a launch, haste, a splash round the landing).
// The target is chosen by the AI's score (`chargeScore`). No randomness.

import { DIRS, solidFor, standable, tileAt, type At } from '../board';
import { atkOf, blowMult, defOf, defenceOf, hurt, tileOf, unitAt, wayTo, type Battle, type BattleEvent, type Unit } from '../battle';
import { walkFrom } from '../path';
import { stunFor } from '../ailments';
import { canLand } from './blink';
import { displace, launchMs } from './move';

export interface ChargeOpts {
  tiles: number;
  route: 'line' | 'path' | 'leap';
  /** Run through every foe on the line (line only), striking each. */
  through?: boolean;
  mult: number;
  stun?: number;
  shove?: number;
  launch?: number;
  /** Ms of haste for the charger after. */
  haste?: number;
  /** A splash on the 3x3 round the landing: this share of attack on every other foe in it. */
  land?: number;
  /** Only these foes may be charged (else every foe). */
  only?: (f: Unit) => boolean;
}

/** A charge the charger could make: where it ends, whom it strikes (the first is the target), and its way. */
export interface ChargePlan {
  end: At;
  hits: Unit[];
  way: number;
  steps: number;
  route: ChargeOpts['route'];
}

const apart = (a: At, c: At) => Math.abs(a.u - c.u) + Math.abs(a.v - c.v);
const foesOf = (b: Battle, me: Unit) => b.units.filter((x) => x.alive && x.side !== me.side && !x.under && !(x.hideUntil !== undefined && x.hideUntil > b.t));

/** The AI's score for a charge (the design's section 3.1): the blow's damage, +50% on a shooter or caster, +30% of the target's missing
 *  health share, +1 blow for each other foe a through-charge strikes; −50% when the charger is under 40% health and would end with three
 *  or more foes beside it. */
export function chargeScore(b: Battle, me: Unit, p: ChargePlan, o: ChargeOpts): number {
  const f = p.hits[0];
  const blow = Math.max(1, atkOf(me) * o.mult - defenceOf(f));
  let s = blow * (defOf(f).range >= 2 ? 1.5 : 1) * (1 + 0.3 * (1 - f.hp / f.maxHp));
  s += blow * (p.hits.length - 1);
  if (me.hp < me.maxHp * 0.4 && foesOf(b, me).filter((x) => apart(x, p.end) === 1).length >= 3) s *= 0.5;
  return s;
}

/** Every charge `me` could make with `o`. */
export function chargePlans(b: Battle, me: Unit, o: ChargeOpts): ChargePlan[] {
  const ok = (f: Unit) => !o.only || o.only(f);
  const plans: ChargePlan[] = [];
  const def = defOf(me);
  if (o.route === 'line') {
    for (let way = 0; way < 4; way++) {
      const [du, dv] = DIRS[way];
      let h = tileOf(b, me).h;
      let end: At = { u: me.u, v: me.v };
      const hits: Unit[] = [];
      let steps = 0;
      for (let i = 1; i <= o.tiles; i++) {
        const n = { u: me.u + du * i, v: me.v + dv * i };
        const t = tileAt(b.board, n.u, n.v);
        if (!t || solidFor(t, me.side) || (!def.flies && (!standable(t) || Math.abs(t.h - h) > def.jump))) break;
        const there = unitAt(b, n.u, n.v);
        if (there && there.side !== me.side && !there.under && ok(there)) {
          hits.push(there);
          if (!o.through) break;
          continue;
        }
        if (there) break;
        end = n;
        steps = i;
        h = t.h;
      }
      if (hits.length) plans.push({ end, hits, way, steps, route: 'line' });
    }
    return plans;
  }
  for (const f of foesOf(b, me).filter(ok)) {
    let best: { end: At; steps: number } | undefined;
    if (o.route === 'path') {
      const blocked = new Set<number>();
      for (const x of b.units) if (x.alive && x !== me && !x.under) blocked.add(x.v * b.board.w + x.u);
      const walk = walkFrom(b.board, me, def.jump, blocked, me.side);
      for (const [du, dv] of DIRS) {
        const at = { u: f.u + du, v: f.v + dv };
        const t = tileAt(b.board, at.u, at.v);
        if (!t) continue;
        const c = walk.cost[at.v * b.board.w + at.u];
        if (c === Infinity || c > o.tiles || (c > 0 && !canLand(b, me, at))) continue;
        if (!best || c < best.steps) best = { end: at, steps: c };
      }
    } else {
      const h0 = tileOf(b, me).h;
      for (const [du, dv] of DIRS) {
        const at = { u: f.u + du, v: f.v + dv };
        const d = apart(me, at);
        if (d > o.tiles || (d > 0 && !canLand(b, me, at))) continue;
        if (!def.flies && tileAt(b.board, at.u, at.v)!.h - h0 > 2) continue;
        if (!best || d < best.steps) best = { end: at, steps: d };
      }
    }
    if (best) plans.push({ end: best.end, hits: [f], way: wayTo(best.end, f), steps: best.steps, route: o.route });
  }
  return plans;
}

/** The best charge by the AI's score (ties: fewer steps, then the target's id), or undefined. */
export function bestCharge(b: Battle, me: Unit, o: ChargeOpts): ChargePlan | undefined {
  let best: { p: ChargePlan; s: number } | undefined;
  for (const p of chargePlans(b, me, o)) {
    const s = chargeScore(b, me, p, o);
    if (!best || s > best.s + 1e-9 || (Math.abs(s - best.s) <= 1e-9 && (p.steps < best.p.steps || (p.steps === best.p.steps && p.hits[0].id < best.p.hits[0].id)))) best = { p, s };
  }
  return best?.p;
}

/** Make a charge: move, strike every foe it hits, and the riders on the target. False when there is none to make. */
export function charge(b: Battle, me: Unit, o: ChargeOpts, out: BattleEvent[], plan = bestCharge(b, me, o)): boolean {
  if (!plan) return false;
  const from = { u: me.u, v: me.v };
  const h0 = tileOf(b, me).h;
  const moved = plan.end.u !== from.u || plan.end.v !== from.v;
  if (moved) {
    const ms = plan.route === 'leap' ? launchMs(plan.steps) : 70 * Math.max(1, plan.steps);
    me.step = { u: from.u, v: from.v, h: h0, at: b.t, ms, ...(plan.route === 'leap' ? { arc: 1.2 + 0.3 * plan.steps } : {}) };
    me.u = plan.end.u;
    me.v = plan.end.v;
    if (plan.route === 'leap') out.push({ kind: 'launch', to: me.id, from, land: { ...plan.end }, ms, peak: me.step.arc! });
    else out.push({ kind: 'dash', by: me.id, from, to: { ...plan.end } });
  }
  const target = plan.hits[0];
  me.facing = wayTo(me, target);
  for (const f of plan.hits) {
    if (!f.alive) continue;
    const power = atkOf(me) * o.mult * blowMult(h0, tileOf(b, f).h, plan.way, f.facing);
    hurt(b, me, f, Math.max(1, Math.round(power - defenceOf(f))), true, false, out, 'skill');
  }
  if (o.haste) {
    me.hasteUntil = Math.max(me.hasteUntil ?? 0, b.t + o.haste);
    out.push({ kind: 'haste', to: me.id, ms: o.haste });
  }
  if (o.land) {
    for (const x of foesOf(b, me))
      if (!plan.hits.includes(x) && Math.abs(x.u - me.u) <= 1 && Math.abs(x.v - me.v) <= 1) hurt(b, me, x, Math.max(1, Math.round(atkOf(me) * o.land - defenceOf(x))), false, true, out, 'skill');
  }
  if (!target.alive) return true;
  if (o.stun) stunFor(b, target, o.stun, false, 'stun', me);
  if (o.launch) displace(b, me, target, wayTo(me, target), o.launch, 'launch', out);
  else if (o.shove) displace(b, me, target, wayTo(me, target), o.shove, 'shove', out);
  return true;
}
