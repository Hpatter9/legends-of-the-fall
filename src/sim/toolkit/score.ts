// The AI's choices for the toolkit's moves (RPG-SPELLS batch 1, docs/notes/rpg-spells-design.md sections 3.2 to 3.8): whom to pull,
// which way to shove or launch a crowd, whom to rescue with a swap, and when to blink away. Each looks at the field and changes
// nothing (the shoves and launches are worked out with `previewMove`). Ties go by distance, then id, so every choice is the same each
// time. A later batch's skills call these; nothing in batch 1 does.

import type { At } from '../board';
import { atkOf, defOf, defenceOf, wayTo, type Battle, type Unit } from '../battle';
import { previewMove, type MoveHow, type MovePlan } from './move';
import { canSwap } from './blink';

const apart = (a: At, c: At) => Math.abs(a.u - c.u) + Math.abs(a.v - c.v);
const foesOf = (b: Battle, me: Unit) => b.units.filter((x) => x.alive && x.side !== me.side && !x.under && !(x.hideUntil !== undefined && x.hideUntil > b.t));
const friendsOf = (b: Battle, me: Unit) => b.units.filter((x) => x.alive && x.side === me.side && !x.under);
const backLine = (u: Unit) => defOf(u).range >= 2;

/** A pull's target (section 3.3): a back-line foe (range 2 or more) at 3 tiles or more within `reach`, the hardest-hitting first; never a
 *  foe already beside one of the caster's side; a boss only when nothing else is in reach. */
export function pullTarget(b: Battle, me: Unit, reach: number): Unit | undefined {
  const friends = friendsOf(b, me);
  const ok = foesOf(b, me).filter((f) => apart(me, f) <= reach && apart(me, f) >= 2 && !friends.some((x) => apart(x, f) === 1));
  const order = (x: Unit, y: Unit) => atkOf(y) - atkOf(x) || apart(me, x) - apart(me, y) || x.id - y.id;
  const back = ok.filter((f) => backLine(f) && apart(me, f) >= 3);
  const plain = (fs: Unit[]) => fs.filter((f) => previewMove(b, me, f, wayTo(f, me), 1, 'drag')?.how !== undefined);
  const notBoss = (fs: Unit[]) => fs.filter((f) => !(f.size && f.size > 1));
  return notBoss(plain(back)).sort(order)[0] ?? notBoss(plain(ok)).sort(order)[0] ?? plain(ok).sort(order)[0];
}

/** What a move would be worth (section 3.4), in blows of the caster's attack: a slam +1, each two levels of fall +1, lava +1, each foe
 *  moved off a friend of the caster that is a shooter or caster +0.5, each foe sent towards a back-line friend −1. */
export function moveWorth(b: Battle, me: Unit, f: Unit, p: MovePlan | undefined): number {
  if (!p) return 0;
  let s = 0;
  if (p.slam) s += 1;
  s += Math.floor(p.fell / 2);
  if (p.lava) s += 1;
  const friends = friendsOf(b, me).filter((x) => x !== me);
  for (const x of friends) {
    const was = apart(x, p.from);
    const now = apart(x, p.land);
    if (backLine(x) && was === 1 && now > 1) s += 0.5;
    if (backLine(x) && now < was) s -= 1;
  }
  // (a plain hit is worth a blow; the score is the blow plus what the move adds, as a share of attack)
  const blow = Math.max(1, atkOf(me) - defenceOf(f)) / Math.max(1, atkOf(me));
  return blow + s;
}

/** The foes a shove or launch from `src` would move, and what it would be worth all told. */
export function crowdWorth(b: Battle, me: Unit, fs: Unit[], n: number, how: MoveHow, src: At = me): number {
  return fs.reduce((s, f) => s + moveWorth(b, me, f, previewMove(b, me, f, wayTo(src, f), n, how)), 0);
}

/** Whether a shove or launch is worth casting: its worth beats a plain hit on each of the foes by half (section 3.4). */
export function moveIsWorth(b: Battle, me: Unit, fs: Unit[], n: number, how: MoveHow, src: At = me): boolean {
  if (!fs.length) return false;
  const plain = fs.reduce((s, f) => s + Math.max(1, atkOf(me) - defenceOf(f)) / Math.max(1, atkOf(me)), 0);
  return crowdWorth(b, me, fs, n, how, src) >= plain * 1.5 - 1e-9;
}

/** The best foe to throw from beside `me` (a single shove or launch), by `moveWorth`, or undefined when none beats a plain hit by half. */
export function bestThrow(b: Battle, me: Unit, n: number, how: MoveHow): Unit | undefined {
  let best: { f: Unit; s: number } | undefined;
  for (const f of foesOf(b, me).filter((x) => apart(x, me) === 1)) {
    const s = moveWorth(b, me, f, previewMove(b, me, f, wayTo(me, f), n, how));
    if (!best || s > best.s + 1e-9 || (Math.abs(s - best.s) <= 1e-9 && f.id < best.f.id)) best = { f, s };
  }
  if (!best) return undefined;
  const plain = Math.max(1, atkOf(me) - defenceOf(best.f)) / Math.max(1, atkOf(me));
  return best.s >= plain * 1.5 - 1e-9 ? best.f : undefined;
}

/** The friend in most trouble for a rescue (section 3.8): under 35% health with two or more foes beside it, within `reach` of `me`; the
 *  lowest health share first. */
export function rescueTarget(b: Battle, me: Unit, reach: number): Unit | undefined {
  const foes = foesOf(b, me);
  return friendsOf(b, me)
    .filter((x) => x !== me && !defOf(x).summon && apart(me, x) <= reach && x.hp < x.maxHp * 0.35 && foes.filter((f) => apart(f, x) === 1).length >= 2 && canSwap(b, me, x))
    .sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp || x.id - y.id)[0];
}

/** Whether `me` should blink away (section 3.2): under 30% health with two or more foes beside it, or a shooter or caster with a foe
 *  beside it. */
export function shouldEscape(b: Battle, me: Unit): boolean {
  const beside = foesOf(b, me).filter((f) => apart(f, me) === 1).length;
  return (me.hp < me.maxHp * 0.3 && beside >= 2) || (backLine(me) && beside >= 1);
}
