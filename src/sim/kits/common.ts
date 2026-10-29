// Small helpers the hero kits share (COMBAT-002). Pure rules.

import { standable, tileAt, type At } from '../board';
import { atkOf, unitAt, wayTo, tileOf, hurt, type Battle, type BattleEvent, type Unit } from '../battle';
import { DIR, durOf, foesOf, net, apart } from '../abilities';
import { stunFor } from '../ailments';

export const stun = (b: Battle, f: Unit, ms: number): void => {
  stunFor(b, f, ms);
};
export const alliesOf = (b: Battle, me: Unit): Unit[] => b.units.filter((a) => a.alive && a.side === me.side);
export const free = (b: Battle, at: At): boolean => standable(tileAt(b.board, at.u, at.v)) && !unitAt(b, at.u, at.v);
/** The foes within `reach` tiles of the caster. */
export const foesNear = (b: Battle, me: Unit, reach: number): Unit[] => foesOf(b, me).filter((f) => apart(me, f) <= reach);
/** A skill strike: `mult` of the caster's attack, less the foe's defence. */
export const strike = (b: Battle, me: Unit, f: Unit, mult: number, out: BattleEvent[], heavy = false): void => { hurt(b, me, f, net(atkOf(me) * mult, f), heavy, false, out, 'skill'); };
/** The strongest (hardest-hitting) first, then by id. */
export const strongest = (x: Unit, y: Unit) => atkOf(y) - atkOf(x) || x.id - y.id;
/** The toughest (most health) first. */
export const toughest = (x: Unit, y: Unit) => y.hp - x.hp || x.id - y.id;
/** A duration lengthened by the caster's `dur` talent. */
export const ms = (me: Unit, n: number): number => durOf(me, n);

/** Shove a fighter `tiles` away from `from`, a tile at a time; true if it was stopped by something (a wall, a ledge, a fighter, the edge). */
export function shove(b: Battle, f: Unit, from: At, tiles: number): boolean {
  const way = wayTo(from, f);
  for (let i = 0; i < tiles; i++) {
    const to = { u: f.u + DIR[way][0], v: f.v + DIR[way][1] };
    const t = tileAt(b.board, to.u, to.v);
    if (!t || !standable(t) || unitAt(b, to.u, to.v) || t.h - tileOf(b, f).h > 1) return true;
    f.step = { u: f.u, v: f.v, h: tileOf(b, f).h, at: b.t, ms: 250 };
    f.u = to.u;
    f.v = to.v;
  }
  return false;
}

/** Free tiles within `radius` of `at`, nearest first (then by row and column). */
export function freeNear(b: Battle, at: At, radius: number): At[] {
  const spots: At[] = [];
  for (let dv = -radius; dv <= radius; dv++)
    for (let du = -radius; du <= radius; du++) {
      const c = { u: at.u + du, v: at.v + dv };
      if ((du || dv) && apart(c, at) <= radius && free(b, c)) spots.push(c);
    }
  return spots.sort((x, y) => apart(at, x) - apart(at, y) || x.v - y.v || x.u - y.u);
}

/** Move a fighter at once to a tile (a blink), with the event the page draws it by. */
export function blinkTo(_b: Battle, me: Unit, to: At, out: BattleEvent[]): void {
  const from = { u: me.u, v: me.v };
  me.u = to.u;
  me.v = to.v;
  me.step = undefined;
  out.push({ kind: 'blink', by: me.id, from, to });
}

/** The nearest foe (then the weakest, then by id). */
export const nearestFoe = (b: Battle, me: Unit): Unit | undefined => foesOf(b, me).sort((x, y) => apart(me, x) - apart(me, y) || x.hp - y.hp || x.id - y.id)[0];

/** A kit's mark on a fighter, with the event the page shows it by. */
export const mark = (out: BattleEvent[], by: Unit, to: Unit, what: string, ms: number) => out.push({ kind: 'mark', to: to.id, by: by.id, what, ms });
