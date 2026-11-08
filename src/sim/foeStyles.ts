// FOE-STYLES: how a foe moves and picks its prey (`Passive.move`, `docs/notes/foe-styles.md`). Every foe used to walk to the nearest hero
// and strike the weakest in reach; now each kind of foe fights its own way:
//
//   flank   goes round to the side or back of a hero busy with someone else (the heroes' own quick-blade step, `flankStep`)
//   kite    a shooter or a spear steps back from a blade beside it, keeping its reach (the heroes' own `kiteStep`)
//   hunt    makes for the heroes' shooters and casters first, past the front line
//   guard   stays by its most needy friend (a shooter, else the most hurt) and strikes whoever is striking its friends
//   charge  a run of `CHARGE_RUN` steps or more ends in a blow `CHARGE_MULT` as hard ("Charge!")
//
// Read for foes only, and not in the Last Stand, whose foes march on the breaches by their own mind (`standAi.ts`). Fixed orders over the
// fight's state, ties broken by id: no randomness, so nothing draws from a stream. Pure: no Pixi, no DOM.

import { kitOf, type FoeMove } from './abilities';
import { defOf, type Battle, type Unit } from './battle';

/** A charge's run: this many steps in a row before a blow. */
export const CHARGE_RUN = 3;
/** A charging blow is this much harder. */
export const CHARGE_MULT = 1.5;

/** A foe's way of moving (none for a hero, a summon of the heroes', or a foe without one). */
export const moveOf = (me: Unit): FoeMove | undefined => (me.side === 'foe' ? kitOf(me)?.passive.move : undefined);

/** A shooter or caster: what a hunter goes for first (a gun, a bow, a staff that reaches three tiles or more). */
export const backline = (u: Unit): boolean => !!defOf(u).shot || defOf(u).range >= 3;

/** The friend a guard keeps by: its shooters first, then the most hurt (by share), then the lower id; none when it stands alone. */
export function wardOf(b: Battle, me: Unit): Unit | undefined {
  return b.units
    .filter((x) => x.alive && x !== me && x.side === me.side && !x.under)
    .sort((x, y) => Number(backline(y)) - Number(backline(x)) || x.hp / x.maxHp - y.hp / y.maxHp || x.id - y.id)[0];
}

/** The order a styled foe takes the heroes in reach in (`inReach` comes weakest first): a hunter takes the shooters first, a guard whoever is
 *  striking one of its friends. A stable sort, so the weakest-first order holds within each group. */
export function preyOrder(b: Battle, me: Unit, mv: FoeMove | undefined, inReach: Unit[]): Unit[] {
  if (mv === 'hunt') return [...inReach].sort((x, y) => Number(backline(y)) - Number(backline(x)));
  if (mv === 'guard') {
    const friends = new Set(b.units.filter((x) => x.alive && x !== me && x.side === me.side).map((x) => x.id));
    const onFriend = (x: Unit) => (x.swing && friends.has(x.swing.to) ? 1 : 0);
    return [...inReach].sort((x, y) => onFriend(y) - onFriend(x));
  }
  return inReach;
}

/** The order a styled foe walks at the heroes in (`byDistance` comes nearest first): a hunter at the shooters first, a guard at whoever is
 *  nearest its ward. */
export function walkOrder(b: Battle, me: Unit, mv: FoeMove | undefined, byDistance: Unit[]): Unit[] {
  if (mv === 'hunt') return [...byDistance].sort((x, y) => Number(backline(y)) - Number(backline(x)));
  if (mv === 'guard') {
    const ward = wardOf(b, me);
    if (!ward) return byDistance;
    const d = (x: Unit) => Math.abs(x.u - ward.u) + Math.abs(x.v - ward.v);
    return [...byDistance].sort((x, y) => d(x) - d(y) || x.id - y.id);
  }
  return byDistance;
}

/** A step taken: a charger's run grows (a step of any other kind of unit is not counted). */
export function noteStep(me: Unit): void {
  if (moveOf(me) === 'charge') me.run = (me.run ?? 0) + 1;
}

/** A blow begun: a charger at the end of a run strikes `CHARGE_MULT` as hard; the run is spent either way. 1 for every other blow. */
export function chargeOf(me: Unit): number {
  if (me.run === undefined) return 1;
  const run = me.run;
  me.run = 0;
  return run >= CHARGE_RUN ? CHARGE_MULT : 1;
}
