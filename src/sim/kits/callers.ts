// The callers' new skills (COMBAT-002): the Samurai Commander's standard and the Beastmaster's pack.

import { addUnit, type Battle, type BattleEvent, type Unit } from '../battle';
import { apart, BANNER_MULT, callSummon, foesOf, slowFor, tal } from '../abilities';
import { alliesOf, blinkTo, foesNear, freeNear, mark, ms, strike } from './common';

/** Samurai Commander, Plant the Standard: a standard (a quarter of his health; it stands where it is planted) for 10s: his friends within 2 of it take a tenth less and hit a tenth harder
 *  while it stands. One at a time. */
export function plantStandard(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  if (b.units.some((x) => x.alive && x.def === 'standard' && x.owner === me.id)) return false;
  const foes = foesNear(b, me, 6);
  if (!foes.length || !alliesOf(b, me).some((a) => a !== me && apart(a, me) <= 3)) return false;
  const near = foes.sort((x, y) => apart(me, x) - apart(me, y) || x.id - y.id)[0];
  const at = freeNear(b, me, 1).sort((x, y) => apart(x, near) - apart(y, near) || x.v - y.v || x.u - y.u)[0];
  if (!at) return false;
  const s = addUnit(b, 'standard', at.u, at.v);
  s.owner = me.id;
  s.hp = s.maxHp = Math.max(1, Math.round(me.maxHp / 4));
  s.expires = b.t + ms(me, 10000);
  s.facing = me.facing;
  b.kits = { ...b.kits, standards: true };
  out.push({ kind: 'banner', by: me.id, ms: ms(me, 10000) });
  return true;
}

/** Beastmaster, Sic 'Em: every wolf of his leaps at the foe he marks (the weakest within 4 of him): it is struck and slowed, and the wolves hit a quarter harder for 4s and keep on it.
 *  With no wolf standing, one answers instead. */
export function sicEm(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const wolves = b.units.filter((x) => x.alive && x.owner === me.id && (x.def === 'wolf' || x.def === 'direWolf'));
  if (!wolves.length) return callSummon(b, me, 'wolf', 1 + tal(me, 'extra'));
  const f = foesOf(b, me)
    .filter((x) => apart(me, x) <= 4)
    .sort((x, y) => x.hp - y.hp || x.id - y.id)[0];
  if (!f) return false;
  mark(out, me, f, 'prey', 4000);
  for (const w of wolves) {
    if (!f.alive) break;
    const to = apart(w, f) > 1 ? freeNear(b, f, 1).sort((x, y) => apart(w, x) - apart(w, y) || x.v - y.v || x.u - y.u)[0] : undefined;
    if (to) blinkTo(b, w, to, out);
    // (a war cry for the pack: their attack up a quarter while it lasts, as a banner raises it)
    if (w.banner === undefined) w.power = (w.power ?? 1) * BANNER_MULT;
    w.banner = { until: b.t + ms(me, 4000) };
    w.taunt = { to: f.id, until: b.t + ms(me, 4000) };
    if (apart(w, f) === 1) {
      strike(b, w, f, 1.2, out, true);
      if (f.alive) slowFor(b, f, ms(me, 2000));
    }
  }
  return true;
}
