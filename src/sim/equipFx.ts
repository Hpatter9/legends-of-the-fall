// What a hero's worn equipment does in a fight beyond its stats: the signature abilities of the Epic and better pieces
// (`equipBases.ts` lists them, `equipment.ts` says which are active and how strong). They run on the sim's own hooks:
// after a blow lands (`fxBlow`), when a blow is taken (`fxStruck`), on a kill (`fxKill`), at the start (`fxStart`), every
// tick (`fxTick`), when the wearer is low (`fxHurt`) and when it would fall (`fxRevive`). They use the sim's own statuses
// (burning and bleeding, stun, slow, haste, shields, the war banner, taunt) and its skill stream for chances, and only
// ever touch fights with equipment on a hero, so every other fight plays out as before. Pure rules: no Pixi, no DOM.

import { apart, atkOf, defenceOf, hurt, wayTo, type Battle, type BattleEvent, type Unit } from './battle';
import { BANNER_MULT, foesOf, gain, mendUnit, roll } from './abilities';
import { ABILITIES, type Ability, type Kind } from './equipBases';
import { TALENT_ABILITIES } from './talents';
import { MANA_MAX } from './spells';
import { AILMENT_SWITCH, chillFor, cleanse, dotOf, setDot, stunFor } from './ailments';

const DIRS = [
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
];
/** Below this share of max hp the `low` abilities fire. */
export const LOW_SHARE = 0.35;
/** The `execute` kinds' mark. */
const EXECUTE_UNDER = 0.3;
/** Kinds that act on a foe (the one struck, the attacker, or the slain). */
const FOE_KINDS: ReadonlySet<Kind> = new Set<Kind>(['burn', 'bleed', 'curse', 'slow', 'stun', 'chain', 'splash', 'pierce', 'smite', 'execute', 'burst', 'reflect', 'counter', 'taunt', 'leech']);
/** Kinds that need the foe to be at arm's length (they are melee things). */
const MELEE_KINDS: ReadonlySet<Kind> = new Set<Kind>(['reflect', 'counter']);

/** Whether a fighter cannot be targeted now (a Shadowcloak's stealth). */
export const hidden = (b: Battle, u: Unit): boolean => u.hideUntil !== undefined && u.hideUntil > b.t;

const abilitiesOf = (u: Unit): { a: Ability; s: number }[] => (u.eq?.abilities ?? []).map((x) => ({ a: ABILITIES[x.id] ?? TALENT_ABILITIES[x.id], s: x.s, name: x.name })).filter((x) => x.a);
const key = (u: Unit, k: string) => u.fx?.[k] ?? 0;
const setKey = (u: Unit, k: string, n: number) => ((u.fx ??= {})[k] = n);
/** How many times an ability has fired for this fighter so far. */
export const firedCount = (u: Unit, id: string): number => key(u, `${id}#fired`);
/** The n-th time this is called returns the count (1, 2, ...). */
const counted = (u: Unit, id: string): number => setKey(u, `${id}#n`, key(u, `${id}#n`) + 1);
/** True the first time only. */
const once = (u: Unit, id: string): boolean => {
  if (key(u, `${id}#used`)) return false;
  setKey(u, `${id}#used`, 1);
  return true;
};
const lucky = (b: Battle, p: number): boolean => p >= 1 || roll(b) < p;
const nameOf = (u: Unit, id: string): string => u.eq?.abilities.find((x) => x.id === id)?.name ?? id;

/** The ability's numbers at strength `s`: the main value, the duration in ms and the chance. */
const nums = (a: Ability, s: number) => ({ v: (a.v ?? 0) * s, w: (a.w ?? 0) * 1000 * (1 + (s - 1) / 2), p: Math.min(0.9, (a.p ?? 1) * s) });

/** Do what an ability does. `foe` is its target for the foe kinds; `dmg` the blow's damage (or the blow taken). */
function fire(b: Battle, me: Unit, a: Ability, s: number, foe: Unit | undefined, dmg: number, out: BattleEvent[], show: boolean): void {
  const { v, w } = nums(a, s);
  if (FOE_KINDS.has(a.kind)) {
    if (!foe || (!foe.alive && a.kind !== 'burst')) return;
    if (MELEE_KINDS.has(a.kind) && apart(me, foe) !== 1) return;
    if (!me.alive && a.kind !== 'burst') return;
  } else if (!me.alive) return;
  // (the count of times each ability has fired, for the fight stats and the tests)
  setKey(me, `${a.id}#fired`, key(me, `${a.id}#fired`) + 1);
  if (show) out.push({ kind: 'skill', by: me.id, name: nameOf(me, a.id), ms: 700 });
  const skillHit = (to: Unit, n: number) => hurt(b, me, to, Math.max(1, Math.round(n)), false, true, out, 'skill');
  const beside = (c: Unit, near: number) => foesOf(b, me).filter((f) => f !== c && f.alive && apart(f, c) <= near);
  switch (a.kind) {
    case 'leech':
      mendUnit(me, dmg * v, out);
      break;
    case 'burn':
    case 'bleed':
    case 'curse':
      // (never over a skill's own burn or bleed already on the foe)
      // (with the ailments on, the Ranger's Poisoned Tips poison rather than bleed, STATUS-FX)
      if (!dotOf(foe!)) setDot(b, foe!, { kind: AILMENT_SWITCH.on && a.id === 'tl_ranger_poison' ? 'poison' : a.kind, dmg: Math.max(1, Math.round(atkOf(me) * v)), every: 1000, ms: 3000, by: me.id, next: b.t + 1000, until: b.t + 3000 });
      break;
    case 'slow':
      chillFor(b, foe!, w);
      break;
    case 'stun':
      stunFor(b, foe!, w, true);
      break;
    case 'chain': {
      const second = beside(foe!, 2).sort((x, y) => apart(x, foe!) - apart(y, foe!) || x.id - y.id)[0];
      if (second) {
        out.push({ kind: 'arc', from: foe!.id, to: second.id });
        skillHit(second, dmg * v);
      }
      break;
    }
    case 'splash':
      for (const f of beside(foe!, 1)) skillHit(f, dmg * v);
      break;
    case 'pierce': {
      const way = wayTo(me, foe!);
      const behind = foesOf(b, me).find((f) => f.u === foe!.u + DIRS[way][0] && f.v === foe!.v + DIRS[way][1]);
      if (behind) skillHit(behind, dmg * v);
      break;
    }
    case 'smite':
      skillHit(foe!, dmg * v);
      break;
    case 'execute':
      if (foe!.hp < foe!.maxHp * EXECUTE_UNDER) skillHit(foe!, dmg * v);
      break;
    case 'burst':
      for (const f of beside(foe!, 1)) skillHit(f, atkOf(me) * v - defenceOf(f));
      break;
    case 'reflect':
      skillHit(foe!, dmg * v);
      break;
    case 'counter':
      skillHit(foe!, atkOf(me) * v - defenceOf(foe!));
      break;
    case 'taunt':
      foe!.taunt = { to: me.id, until: b.t + w };
      break;
    case 'charge':
      gain(me, v);
      break;
    case 'mana':
      if (me.side === 'hero') b.spells.mana = Math.min(MANA_MAX, b.spells.mana + v);
      break;
    case 'heal':
    case 'regen':
      mendUnit(me, me.maxHp * v, out);
      break;
    case 'healAlly': {
      const weakest = b.units.filter((x) => x.alive && x.side === me.side && x.hp < x.maxHp).sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp || x.id - y.id)[0];
      if (weakest) mendUnit(weakest, weakest.maxHp * v, out, me);
      break;
    }
    case 'aura':
      for (const x of b.units) if (x.alive && x.side === me.side && x !== me && apart(x, me) <= 1) mendUnit(x, x.maxHp * v, out, me);
      break;
    case 'shield': {
      const hp = Math.round(me.maxHp * v);
      if (!me.shield || me.shield.hp < hp) me.shield = { hp, until: b.t + w };
      break;
    }
    case 'haste':
      me.hasteUntil = Math.max(me.hasteUntil ?? 0, b.t + w);
      out.push({ kind: 'haste', to: me.id, ms: w });
      break;
    case 'stealth':
      me.hideUntil = b.t + w;
      break;
    case 'guard':
      me.guardUntil = Math.max(me.guardUntil ?? 0, b.t + w);
      break;
    case 'berserk':
      me.power = (me.power ?? 1) * (1 + v);
      break;
    case 'cleanse':
      cleanse(b, me);
      me.slowUntil = undefined;
      mendUnit(me, me.maxHp * v, out);
      break;
    case 'banner':
    case 'rally': {
      const ms = a.kind === 'banner' ? 3000 : w;
      for (const x of b.units) {
        if (!x.alive || x.side !== me.side || apart(x, me) > (a.kind === 'banner' ? 1 : 3)) continue;
        // (a second banner only lengthens the first: the attack is raised once)
        if (x.banner === undefined) x.power = (x.power ?? 1) * BANNER_MULT;
        x.banner = { until: Math.max(x.banner?.until ?? 0, b.t + ms) };
      }
      break;
    }
    case 'revive':
      break;
  }
}

/** After a blow lands: the `hit`, `nth` and `crit` abilities of the one who struck. */
export function fxBlow(b: Battle, by: Unit, to: Unit, crit: boolean, dmg: number, out: BattleEvent[]): void {
  if (!by.eq) return;
  for (const { a, s } of abilitiesOf(by)) {
    const { p } = nums(a, s);
    if (a.trig === 'hit' && lucky(b, p)) fire(b, by, a, s, to, dmg, out, false);
    else if (a.trig === 'nth' && counted(by, a.id) % (a.n ?? 1) === 0) fire(b, by, a, s, to, dmg, out, true);
    else if (a.trig === 'crit' && crit && lucky(b, p)) fire(b, by, a, s, to, dmg, out, true);
  }
}

/** When a blow is about to land on `me` (`dmg` after guards): the `struck` abilities. `melee` is false for splash and the like. */
export function fxStruck(b: Battle, attacker: Unit, me: Unit, dmg: number, blow: boolean, out: BattleEvent[]): void {
  if (!me.eq || !blow) return;
  for (const { a, s } of abilitiesOf(me)) {
    if (a.trig !== 'struck') continue;
    const go = a.n ? counted(me, a.id) % a.n === 0 : lucky(b, nums(a, s).p);
    if (go) fire(b, me, a, s, attacker, dmg, out, true);
  }
}

/** A kill: the killer's `kill` abilities (`victim` stands where it fell). */
export function fxKill(b: Battle, by: Unit, victim: Unit, out: BattleEvent[]): void {
  if (!by.eq) return;
  for (const { a, s } of abilitiesOf(by)) if (a.trig === 'kill' && lucky(b, nums(a, s).p)) fire(b, by, a, s, victim, 0, out, true);
}

/** The start of the fight: the `start` abilities. */
export function fxStart(b: Battle, u: Unit): void {
  if (!u.eq) return;
  const out: BattleEvent[] = [];
  for (const { a, s } of abilitiesOf(u)) if (a.trig === 'start') fire(b, u, a, s, undefined, 0, out, false);
}

/** Each tick: the wearer's regen, and the `tick` abilities (every `n` seconds). */
export function fxTick(b: Battle, u: Unit, out: BattleEvent[]): void {
  if (!u.eq) return;
  if (u.eq.regen && b.t % 1000 === 0) mendUnit(u, u.maxHp * u.eq.regen, out);
  for (const { a, s } of abilitiesOf(u)) if (a.trig === 'tick' && b.t % ((a.n ?? 1) * 1000) === 0) fire(b, u, a, s, undefined, 0, out, !!a.show);
}

/** After the wearer took damage and still stands: the `low` abilities, once each. */
export function fxHurt(b: Battle, to: Unit, out: BattleEvent[]): void {
  if (to.hp >= to.maxHp * LOW_SHARE) return;
  for (const { a, s } of abilitiesOf(to)) if (a.trig === 'low' && once(to, a.id)) fire(b, to, a, s, undefined, 0, out, true);
}

/** The wearer would fall: a `revive` ability brings it back (once a fight). */
export function fxRevive(to: Unit, out: BattleEvent[]): boolean {
  for (const { a, s } of abilitiesOf(to)) {
    if (a.trig !== 'death' || a.kind !== 'revive' || !once(to, a.id)) continue;
    setKey(to, `${a.id}#fired`, key(to, `${a.id}#fired`) + 1);
    to.hp = Math.max(1, Math.round(to.maxHp * nums(a, s).v));
    out.push({ kind: 'skill', by: to.id, name: nameOf(to, a.id), ms: 900 });
    out.push({ kind: 'heal', to: to.id, amount: to.hp });
    return true;
  }
  return false;
}

