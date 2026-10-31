// The callers' new skills (COMBAT-002): the Samurai Commander's standard and the Beastmaster's pack.

import { wolfLeap } from './ranged';
import { addUnit, type Battle, type BattleEvent, type Unit } from '../battle';
import { apart, BANNER_MULT, callSummon, foesOf, slowFor, tal } from '../abilities';
import { alliesOf, blinkTo, foesNear, freeNear, mark, ms, strike } from './common';
import { renewable, timeSummon, TIMER } from '../carry';

/** Samurai Commander, Plant the Standard: a standard (a quarter of his health; it stands where it is planted) for 30s of fighting time (10s
 *  before SUMMON-TIMERS; it is planted again beside him in the next wave): his friends within 2 of it take a tenth less and hit a tenth harder
 *  while it stands. One at a time: with a quarter of its time left, the call renews it instead. */
export function plantStandard(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const old = b.units.find((x) => x.alive && x.def === 'standard' && x.owner === me.id);
  if (old) {
    if (!renewable(b, me, ['standard']) || !foesNear(b, me, 6).length) return false;
    timeSummon(b, old, ms(me, TIMER.standard));
    out.push({ kind: 'banner', by: me.id, ms: ms(me, TIMER.standard) });
    return true;
  }
  const foes = foesNear(b, me, 6);
  if (!foes.length || !alliesOf(b, me).some((a) => a !== me && apart(a, me) <= 3)) return false;
  const near = foes.sort((x, y) => apart(me, x) - apart(me, y) || x.id - y.id)[0];
  const at = freeNear(b, me, 1).sort((x, y) => apart(x, near) - apart(y, near) || x.v - y.v || x.u - y.u)[0];
  if (!at) return false;
  const s = addUnit(b, 'standard', at.u, at.v);
  s.owner = me.id;
  s.hp = s.maxHp = Math.max(1, Math.round(me.maxHp / 4));
  timeSummon(b, s, ms(me, TIMER.standard));
  s.facing = me.facing;
  b.kits = { ...b.kits, standards: true };
  out.push({ kind: 'banner', by: me.id, ms: ms(me, TIMER.standard) });
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
    // (RPG-SPELLS batch 5, Pack Tactics: within 4 tiles the wolf leaps to it, farther it blinks as before)
    if (to && !wolfLeap(b, w, to, out)) blinkTo(b, w, to, out);
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
