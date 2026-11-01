// The ailments (STATUS-FX, docs/notes/status-fx.md): burning, poisoned, frozen, bleeding, chilled, shocked, stunned, weakened,
// cursed, silenced, feared. One list per fighter (`Unit.ail`), one way in for each kind (`setDot`, `stunFor`, `chillFor`...), one
// tick (`tickAilments`), one cleanse. The old fields stay what the AI, the kits and the looks read: a hold still sets `busyUntil`
// and `stunUntil`, a chill `slowUntil`, a weakening `weakUntil`, a freeze `brittleUntil`.
//
// `AILMENT_SWITCH.on` (a dev safety, on in the game) turns on everything the owner asked for in STATUS-FX: the damage kinds standing
// side by side, resists, the boss rules, the shatter, poison stacks, curses turning healing to harm, shocks, silence, fear and the
// new sources. Switched off, every function here does exactly what the old code did (one damage over time a fighter, the holds and
// slows as they were), which `test/ailments-identical.test.ts` holds against fights recorded before the model.
//
// Pure rules: no Pixi, no DOM, no randomness of the fight's stream (a chance, such as a skeleton's poison, hashes the moment).

import { atkOf, hurt, defOf, tileOf, type Battle, type BattleEvent, type Unit } from './battle';
import { isBoss } from './foes';
import { mendUnit, type Dot } from './abilities';
import { mixSeed } from './rng';
import { rollSave, type SaveWhat } from './saves';

import { AILMENT_KEYS, type AilmentKey } from './ailmentKeys';
export { AILMENT_KEYS, type AilmentKey };

/** The new ailments on (the game) or off (main's rules exactly, for the identity test and for measuring before and after). */
export const AILMENT_SWITCH = { on: true };
const on = () => AILMENT_SWITCH.on;

/** One ailment on a fighter. The damage kinds tick `dmg` every `every` ms (times `stacks` for poison); the others only last. */
export interface Ailment {
  kind: AilmentKey;
  until: number;
  /** The fighter that laid it (its kills and drains count for it). */
  by: number;
  dmg?: number;
  every?: number;
  next?: number;
  /** How long it was laid for (a spreading fire copies it). */
  ms?: number;
  /** Poison's stacks. */
  stacks?: number;
  /** A shock that was passed on does not pass on again; and the one it came from. */
  relay?: boolean;
  from?: number;
}

/** The kinds that hurt over time. */
const DOTS: ReadonlySet<AilmentKey> = new Set(['burn', 'bleed', 'curse', 'poison']);
/** Hard control: on a boss it has diminishing returns. */
const HARD: ReadonlySet<AilmentKey> = new Set(['freeze', 'stun', 'fear', 'silence']);

/** The numbers (docs/notes/status-fx.md, section 2; tuned in the balance pass). */
export const AIL = {
  BURN_MS: 3000,
  BURN_EVERY: 500,
  /** A burn tick, as a share of the burner's attack (the old burns keep their own). */
  BURN_SHARE: 0.12,
  POISON_MS: 5000,
  POISON_EVERY: 1000,
  POISON_SHARE: 0.04,
  POISON_MAX: 5,
  /** Each poison stack cuts healing received by this much. */
  POISON_HEAL_CUT: 0.1,
  FREEZE_MS: 1500,
  /** A frozen fighter takes this much more from every blow (Deep Freeze's `BRITTLE_MULT`, through `brittleUntil`). */
  SHATTER_SHARE: 0.5,
  SHATTER_CAP: 0.2,
  SHATTER_CAP_BOSS: 0.06,
  /** A blow this big (a share of the target's health), a crit or any skill hit shatters a freeze. */
  SHATTER_HEAVY: 0.15,
  /** A freeze ends into a chill this long. */
  THAW_CHILL_MS: 2000,
  CHILL_MS: 3000,
  /** Three frost chills within this window freeze. */
  FROST_STACK: 3,
  FROST_WINDOW: 4000,
  FROST_FREEZE_MS: 1200,
  SHOCK_MS: 3000,
  SHOCK_EVERY: 1000,
  SHOCK_SHARE: 0.15,
  SHOCK_PASS_MS: 1500,
  SHOCK_REACH: 2,
  SHOCK_WATER_REACH: 3,
  SHOCK_MACHINE: 1.5,
  WEAK_MS: 4000,
  CURSE_MS: 4000,
  /** A cursed fighter's healing: this share is dealt to it as harm, the rest is lost. */
  CURSE_HARM: 0.5,
  SILENCE_MS: 3000,
  FEAR_MS: 1500,
  /** Every ailment lasts this share as long on a boss. */
  BOSS_SHARE: 0.5,
  /** Hard control on a boss: each within this window of the last lasts half as long again; the fourth makes it immune for `DR_IMMUNE`. */
  DR_WINDOW: 10000,
  DR_IMMUNE: 10000,
  /** A cleanse wards the heroes it touches this long. */
  WARD_MS: 2000,
  /** A skeleton's blow poisons one time in this many. */
  GRAVE_ROT: 5,
};

/** The battle being stepped (set by `stepBattle` and `castSpell`): healing reads it to turn a curse's healing into harm. `by` is the fighter
 *  casting a skill just now (set by `powered`): an ailment its skill lays without naming who laid it is saved against its DC (STATS batch 5). */
export const ailCtx: { b?: Battle; by?: Unit } = {};

/* ------------------------------------------------------------------ reading */

const NONE: Ailment[] = [];

/** The fighter's ailments (a fighter carrying an old single `dot`, from code or a test that set one, has it folded in first). */
export function ailmentsOf(u: Unit): Ailment[] {
  if (u.dot) {
    const d = u.dot;
    u.dot = undefined;
    // (the old field held one damage over time: it replaces any other, as it did)
    u.ail = (u.ail ?? []).filter((a) => !DOTS.has(a.kind));
    u.ail.push({ kind: d.kind, dmg: d.dmg, every: d.every, ms: d.ms, by: d.by, next: d.next, until: d.until });
  }
  return u.ail ?? NONE;
}
/** The fighter's damage over time (the first, if several stand together). */
export const dotOf = (u: Unit): Ailment | undefined => ailmentsOf(u).find((a) => DOTS.has(a.kind));
/** Whether it has this ailment (at time `t`, when given). */
export const hasAil = (u: Unit, kind: AilmentKey, t?: number): boolean => ailmentsOf(u).some((a) => a.kind === kind && (t === undefined || a.until > t));
/** Whether it has any ailment at all (what a healer's "worth cleansing" reads). */
export const harmed = (u: Unit): boolean => ailmentsOf(u).length > 0;
const find = (u: Unit, kind: AilmentKey) => ailmentsOf(u).find((a) => a.kind === kind);
const drop = (u: Unit, kind: AilmentKey) => {
  if (u.ail) u.ail = u.ail.filter((a) => a.kind !== kind);
};

export const isFrozen = (b: Battle, u: Unit): boolean => on() && hasAil(u, 'freeze', b.t);
export const isSilenced = (b: Battle, u: Unit): boolean => on() && hasAil(u, 'silence', b.t);
export const isFeared = (b: Battle, u: Unit): boolean => on() && hasAil(u, 'fear', b.t);

/* ------------------------------------------------------------------ resists */

const FIRE = new Set(['imp', 'demon', 'hellImp', 'hellDemon', 'demonLord', 'devilLeader', 'magmaGolem', 'forgeTitan', 'eliteCindra', 'nineTails', 'dragoon', 'eliteVexor', 'calBoss1', 'calBoss3', 'calBoss5']);
const UNDEAD = new Set(['skeleton', 'spearman', 'boneArcher', 'boneVolley', 'boneCaptain', 'lichKing', 'wraith', 'shambler', 'mummy', 'reaper', 'dreadPirate', 'eliteHollow']);
const GOLEM = new Set(['stoneGolem', 'ironGolem', 'crystalGolem', 'magmaGolem', 'sapphireColossus', 'forgeTitan', 'eliteWarden']);
const MACHINE = new Set(['rifleBot', 'siegeBot', 'arcBlade', 'juggernaut']);
const FROST = new Set(['crystalGolem', 'sapphireColossus', 'lichKing', 'wolfWhite', 'packWhite']);
const HOLY = new Set(['paladin', 'cleric', 'priestess']);
const TREE = new Set(['treant']);
/** Not alive: nothing takes hold (a decoy, the Commander's standard, the Last Stand's king). */
const THINGS = new Set(['decoy', 'standard', 'standKing']);

export interface Resist {
  immune: ReadonlySet<AilmentKey>;
  half: ReadonlySet<AilmentKey>;
  longer: ReadonlySet<AilmentKey>;
}
const EMPTY: ReadonlySet<AilmentKey> = new Set();

/** What a kind shrugs off, and what it takes for half (or half again) as long (docs/notes/status-fx.md, section 6). */
export function resistOf(kind: string): Resist {
  if (THINGS.has(kind)) return { immune: new Set(AILMENT_KEYS), half: EMPTY, longer: EMPTY };
  const immune = new Set<AilmentKey>();
  const half = new Set<AilmentKey>();
  const longer = new Set<AilmentKey>();
  if (FIRE.has(kind)) {
    immune.add('burn');
    half.add('chill').add('freeze');
  }
  if (UNDEAD.has(kind) || GOLEM.has(kind) || MACHINE.has(kind)) immune.add('poison').add('bleed').add('fear');
  if (GOLEM.has(kind)) half.add('stun');
  if (FROST.has(kind)) immune.add('freeze').add('chill');
  if (HOLY.has(kind)) half.add('curse').add('fear');
  if (TREE.has(kind) || kind === 'treant') {
    immune.add('bleed');
    longer.add('burn');
  }
  return { immune, half, longer };
}
export const isMachine = (kind: string) => MACHINE.has(kind);

/** A boss for the ailments: a boss kind, a Calamity boss, or a band's leader drawn bigger. */
export const ailBoss = (u: Unit): boolean => u.side === 'foe' && (isBoss(u.def) || (u.size ?? 1) > 1);

/** Note what the page shows: an ailment shrugged off (into the next tick's events, so it needs no event list of its own). */
const note = (b: Battle, e: BattleEvent) => b.spells.events.push(e);

/**
 * How long an ailment laid on `to` lasts after its resists, its saving throw, the boss rules and a cleanse's ward: 0 when it does not take
 * hold (an "Immune" is shown). `by` laid it (when not given, the fighter casting a skill now, `ailCtx.by`): `to` saves against its DC and a
 * save halves the time ("Saved"; STATS batch 5, `saves.ts`); a boss does not save, its Legendary Resistance is the ladder below. Only with
 * the switch on.
 */
export function gate(b: Battle, to: Unit, kind: AilmentKey, ms: number, by?: Unit, what: SaveWhat = kind): number {
  if (!to.alive) return 0;
  const immune = () => {
    note(b, { kind: 'immune', to: to.id, what: kind });
    return 0;
  };
  if (to.wardUntil !== undefined && to.wardUntil > b.t) return immune();
  const r = resistOf(to.def);
  if (r.immune.has(kind)) return immune();
  if (r.half.has(kind)) ms *= 0.5;
  if (r.longer.has(kind)) ms *= 1.5;
  const boss = ailBoss(to);
  const save = rollSave(b, by ?? ailCtx.by, to, what, boss);
  ms *= save.mult;
  if (save.saved) note(b, { kind: 'saved', to: to.id, what: kind });
  if (boss) {
    if (kind === 'fear') return immune();
    ms *= AIL.BOSS_SHARE;
    if (HARD.has(kind)) {
      ms = hardGate(b, to, ms);
      if (ms <= 0) return immune();
    }
  }
  return Math.max(TICK, Math.round(ms));
}
const TICK = 100;

/** Diminishing returns on a boss's hard control: half again for each within the window of the last, then a while immune. */
function hardGate(b: Battle, to: Unit, ms: number): number {
  const cc = (to.cc ??= { n: 0, end: 0 });
  if (cc.immune !== undefined && cc.immune > b.t) return 0;
  if (b.t > cc.end + AIL.DR_WINDOW) cc.n = 0;
  if (cc.n >= 3) {
    cc.immune = b.t + AIL.DR_IMMUNE;
    cc.n = 0;
    return 0;
  }
  ms *= 0.5 ** cc.n;
  cc.n++;
  cc.end = Math.max(cc.end, b.t + ms);
  return ms;
}

/* ------------------------------------------------------------------ laying them */

/** Put an ailment in the list (or lengthen the one there): returns it. */
function upsert(u: Unit, kind: AilmentKey, until: number, by: number): Ailment {
  const list = (u.ail = [...ailmentsOf(u)]);
  const have = list.find((a) => a.kind === kind);
  if (have) {
    have.until = Math.max(have.until, until);
    return have;
  }
  const a: Ailment = { kind, until, by };
  list.push(a);
  return a;
}

/**
 * A damage over time, given as the old `Unit.dot` was set (its kind, tick, gap, length, who laid it, next tick and end). Off: it replaces
 * any other, as the one field did. On: it stands beside the others; laying it again keeps the stronger tick and the later end; poison
 * stacks; fire thaws a freeze (and does not take) and puts out a chill.
 */
export function setDot(b: Battle, to: Unit, d: Dot & { by: number; next: number; until: number }): void {
  if (!on()) {
    to.ail = ailmentsOf(to).filter((a) => !DOTS.has(a.kind));
    to.ail.push({ kind: d.kind, dmg: d.dmg, every: d.every, ms: d.ms, by: d.by, next: d.next, until: d.until });
    return;
  }
  const ms = gate(b, to, d.kind, d.until - b.t, layer(b, d.by));
  if (!ms) return;
  if (d.kind === 'burn') {
    if (hasAil(to, 'freeze', b.t)) return thaw(b, to);
    if (hasAil(to, 'chill', b.t)) endChill(to);
  }
  const have = find(to, d.kind);
  if (!have) {
    (to.ail = [...ailmentsOf(to)]).push({ kind: d.kind, dmg: d.dmg, every: d.every, ms: d.ms, by: d.by, next: d.next, until: b.t + ms, ...(d.kind === 'poison' ? { stacks: 1 } : {}) });
    return;
  }
  if (d.kind === 'poison') have.stacks = Math.min(AIL.POISON_MAX, (have.stacks ?? 1) + 1);
  if (d.dmg >= (have.dmg ?? 0)) {
    have.dmg = d.dmg;
    have.by = d.by;
  }
  have.until = Math.max(have.until, b.t + ms);
}

/** The new damage over time at its usual numbers (on only): fire, poison (a stack), a bleed or a curse, from `by`'s attack. */
export function burnFor(b: Battle, by: Unit, to: Unit, ms = AIL.BURN_MS, share = AIL.BURN_SHARE): void {
  if (!on() || !to.alive) return;
  setDot(b, to, { kind: 'burn', dmg: Math.max(1, Math.round(attack(by) * share)), every: AIL.BURN_EVERY, ms, by: by.id, next: b.t + AIL.BURN_EVERY, until: b.t + ms });
}
export function poisonFor(b: Battle, by: Unit, to: Unit, share = AIL.POISON_SHARE, ms = AIL.POISON_MS): void {
  if (!on() || !to.alive) return;
  setDot(b, to, { kind: 'poison', dmg: Math.max(2, Math.round(attack(by) * share)), every: AIL.POISON_EVERY, ms, by: by.id, next: b.t + AIL.POISON_EVERY, until: b.t + ms });
}
export function bleedFor(b: Battle, by: Unit, to: Unit, share: number, ms = 3000): void {
  if (!on() || !to.alive) return;
  setDot(b, to, { kind: 'bleed', dmg: Math.max(1, Math.round(attack(by) * share)), every: 500, ms, by: by.id, next: b.t + 500, until: b.t + ms });
}
/** A curse that only turns healing to harm (a Hex spell's), or deepens one already ticking. */
export function curseFor(b: Battle, by: Unit, to: Unit, ms = AIL.CURSE_MS): void {
  if (!on() || !to.alive) return;
  const t = gate(b, to, 'curse', ms, by);
  if (!t) return;
  const a = upsert(to, 'curse', b.t + t, by.id);
  a.every ??= 1000;
  a.next ??= b.t + 1000;
}
/** The king's spells lay ailments as unit 0 (`spells.ts`'s KING, who is on no board): a tick of theirs is struck by this stand-in. */
const KING_UNIT: Unit = { id: 0, def: 'king', side: 'hero', u: 0, v: 0, hp: 1, maxHp: 1, facing: 0, alive: true, busyUntil: 0, charge: 0 };
/** The attack the king's spells lay their ailments with. */
export const KING_ATK = 50;
const attack = (u: Unit) => (u.id === 0 ? KING_ATK : atkOf(u));
const layer = (b: Battle, id: number): Unit | undefined => b.units.find((x) => x.id === id) ?? (id === 0 ? KING_UNIT : undefined);

/**
 * A hold: stunned (or frozen). Off: as every old site did, `busyUntil` reaches its end and `stunUntil` is set to it (`set`) or
 * lengthened. On: resists and the boss rules first; a freeze also makes it brittle and puts out burning.
 */
export function stunFor(b: Battle, to: Unit, ms: number, set = false, kind: 'stun' | 'freeze' = 'stun', by?: Unit): boolean {
  if (!on()) {
    to.busyUntil = Math.max(to.busyUntil, b.t + ms);
    to.stunUntil = set ? b.t + ms : Math.max(to.stunUntil ?? 0, b.t + ms);
    return true;
  }
  const t = gate(b, to, kind, ms, by);
  if (!t) return false;
  to.busyUntil = Math.max(to.busyUntil, b.t + t);
  to.stunUntil = Math.max(to.stunUntil ?? 0, b.t + t);
  upsert(to, kind, b.t + t, by?.id ?? to.id);
  if (kind === 'freeze') {
    to.brittleUntil = Math.max(to.brittleUntil ?? 0, b.t + t);
    drop(to, 'burn');
  }
  return true;
}

/** Frozen (on), or the old hold (off). */
export const freezeFor = (b: Battle, to: Unit, ms: number, set = false, by?: Unit) => stunFor(b, to, ms, set, 'freeze', by);

/** The freeze ends early (fire, a shatter): free to act, no longer brittle, and chilled a while. */
export function thaw(b: Battle, to: Unit): void {
  if (!find(to, 'freeze')) return;
  drop(to, 'freeze');
  if (!find(to, 'stun')) {
    to.stunUntil = undefined;
    to.busyUntil = Math.min(to.busyUntil, b.t);
  }
  to.brittleUntil = undefined;
  chillFor(b, to, AIL.THAW_CHILL_MS);
}
function endChill(to: Unit): void {
  drop(to, 'chill');
  to.slowUntil = undefined;
}

/**
 * Chilled: slowed (every slow in the game). Off: as the old sites did, `slowUntil` set (`set`) or lengthened. On: resists and the boss
 * rules; a frost chill (`frost`: the king's frost, the Lich King, the frost relics) counts towards a freeze.
 */
export function chillFor(b: Battle, to: Unit, ms: number, set = false, frost = false, by?: Unit): boolean {
  if (!on()) {
    to.slowUntil = set ? b.t + ms : Math.max(to.slowUntil ?? 0, b.t + ms);
    return true;
  }
  const t = gate(b, to, 'chill', ms, by);
  if (!t) return false;
  to.slowUntil = Math.max(to.slowUntil ?? 0, b.t + t);
  upsert(to, 'chill', b.t + t, by?.id ?? to.id);
  if (frost) {
    const marks = (to.frost = [...(to.frost ?? []).filter((x) => x > b.t - AIL.FROST_WINDOW), b.t]);
    if (marks.length >= AIL.FROST_STACK) {
      to.frost = [];
      freezeFor(b, to, AIL.FROST_FREEZE_MS, false, by);
    }
  }
  return true;
}

/** Charmed (fights its own side): not one of the eleven, but hard control, so a boss takes it with diminishing returns. Any other saves
 *  with WIS against `by`'s DC (`ailCtx.by` when not given), a save halving it (STATS batch 5). */
export function charmFor(b: Battle, to: Unit, ms: number, by?: Unit): boolean {
  if (on() && !ailBoss(to)) {
    const save = rollSave(b, by ?? ailCtx.by, to, 'charm', false);
    ms = Math.max(TICK, Math.round(ms * save.mult));
    if (save.saved) note(b, { kind: 'saved', to: to.id, what: 'charm' });
  }
  if (on() && ailBoss(to)) {
    const t = hardGate(b, to, ms * AIL.BOSS_SHARE);
    if (t <= 0) {
      note(b, { kind: 'immune', to: to.id, what: 'stun' });
      return false;
    }
    ms = Math.round(t);
  }
  to.charmUntil = b.t + ms;
  return true;
}

/** Weakened: attack cut as the Hex cuts it (`HEX_MULT`, put back when it fades in `settleFalls`). On only. */
export function weakFor(b: Battle, to: Unit, ms = AIL.WEAK_MS, by?: Unit, mult = 0.7): void {
  if (!on()) return;
  const t = gate(b, to, 'weak', ms, by);
  if (!t) return;
  if (to.weakUntil === undefined) to.power = (to.power ?? 1) * mult;
  to.weakUntil = Math.max(to.weakUntil ?? 0, b.t + t);
  upsert(to, 'weak', to.weakUntil, by?.id ?? to.id);
}
export function silenceFor(b: Battle, to: Unit, ms = AIL.SILENCE_MS, by?: Unit): void {
  if (!on()) return;
  const t = gate(b, to, 'silence', ms, by);
  if (t) upsert(to, 'silence', b.t + t, by?.id ?? to.id);
}
export function fearFor(b: Battle, to: Unit, ms = AIL.FEAR_MS, by?: Unit): void {
  if (!on()) return;
  const t = gate(b, to, 'fear', ms, by);
  if (t) upsert(to, 'fear', b.t + t, by?.id ?? to.id);
}
/** Shocked: every second a spark jumps from it to a fighter of its own side nearby (to every one in the same water). */
export function shockFor(b: Battle, by: Unit, to: Unit, ms = AIL.SHOCK_MS, relay = true, from?: number): void {
  if (!on() || !to.alive) return;
  const t = gate(b, to, 'shock', ms, by);
  if (!t) return;
  const had = find(to, 'shock');
  const a = upsert(to, 'shock', b.t + t, by.id);
  a.dmg = Math.max(a.dmg ?? 0, Math.max(1, Math.round(attack(by) * AIL.SHOCK_SHARE)));
  a.every = AIL.SHOCK_EVERY;
  if (!had) a.next = b.t + AIL.SHOCK_EVERY;
  a.relay = had ? had.relay || relay : relay;
  a.from = from;
}

/** A cleanse: every ailment gone (off: the damage over time only, as the old cleanses did; the sites clear their own timers). */
export function cleanse(b: Battle, u: Unit): void {
  const list = ailmentsOf(u);
  if (!on()) {
    u.ail = list.filter((a) => !DOTS.has(a.kind));
    return;
  }
  if (!list.length) return;
  for (const a of list) {
    if (a.kind === 'stun' || a.kind === 'freeze') {
      u.stunUntil = undefined;
      u.busyUntil = Math.min(u.busyUntil, b.t);
      if (a.kind === 'freeze') u.brittleUntil = undefined;
    } else if (a.kind === 'chill') u.slowUntil = undefined;
    else if (a.kind === 'weak' && u.weakUntil !== undefined) {
      u.power = (u.power ?? 1) / 0.7;
      u.weakUntil = undefined;
    }
  }
  u.ail = [];
}
/** Fire put out (water, steam). */
export function putOut(u: Unit): void {
  drop(u, 'burn');
}

/** Fear ends (the king's Battle Cry). */
export function unfear(u: Unit): void {
  if (u.ail) u.ail = u.ail.filter((a) => a.kind !== 'fear');
}

/** A cleanse's ward: no new ailment takes hold for a while (on only). */
export function ward(b: Battle, u: Unit, ms = AIL.WARD_MS): void {
  if (on()) u.wardUntil = b.t + ms;
}

/* ------------------------------------------------------------------ healing */

/** What healing a fighter takes after its ailments: poison cuts it, a curse turns half of it to harm and loses the rest. On only. */
export function healThrough(u: Unit, amount: number, out: BattleEvent[]): number {
  if (!on() || !u.ail?.length || amount <= 0) return amount;
  const p = find(u, 'poison');
  if (p) amount *= Math.max(0, 1 - AIL.POISON_HEAL_CUT * (p.stacks ?? 1));
  const c = find(u, 'curse');
  const b = ailCtx.b;
  if (c && b && b.units.includes(u)) {
    const harm = Math.round(amount * AIL.CURSE_HARM);
    const by = layer(b, c.by) ?? u;
    if (harm > 0) tagged(out, 'curse', () => hurt(b, by, u, harm, false, true, out, 'dot'));
    return 0;
  }
  return amount;
}

/* ------------------------------------------------------------------ each tick */

/** Hurt, and tag the hits it makes with the ailment (the page colours their numbers). */
export function tagged(out: BattleEvent[], ail: AilmentKey | 'shatter', fn: () => unknown): void {
  const from = out.length;
  fn();
  for (let i = from; i < out.length; i++) {
    const e = out[i];
    if (e.kind === 'hit' && e.ail === undefined) e.ail = ail;
  }
}

const walking = (b: Battle, u: Unit) => !!u.step && b.t < u.step.at + u.step.ms;
const inWater = (b: Battle, u: Unit) => {
  const g = tileOf(b, u).ground;
  return g === 'water' || g === 'deep';
};

/** Each tick, for one fighter (where the old damage over time ticked): the damage kinds tick, the shocks spark, the ended ones go. */
export function tickAilments(b: Battle, u: Unit, out: BattleEvent[]): void {
  const list = ailmentsOf(u);
  if (!list.length) return;
  for (const a of [...list]) {
    if (!u.alive) return;
    if (b.t >= a.until) {
      u.ail = (u.ail ?? []).filter((x) => x !== a);
      if (on() && a.kind === 'freeze') {
        u.brittleUntil = undefined;
        chillFor(b, u, AIL.THAW_CHILL_MS);
      }
      continue;
    }
    if (a.next === undefined || b.t < a.next || !a.every) continue;
    if (DOTS.has(a.kind)) {
      if (!a.dmg) {
        a.next += a.every;
        continue;
      }
      a.next += a.every;
      const by = layer(b, a.by)!;
      const dmg = on() ? a.dmg * (a.stacks ?? 1) * (a.kind === 'bleed' && walking(b, u) ? 2 : 1) : a.dmg;
      tagged(out, a.kind, () => hurt(b, by, u, dmg, false, false, out, 'dot'));
      // (a curse feeds the one who laid it)
      if (a.kind === 'curse' && by.alive) mendUnit(by, a.dmg * HEX_DRAIN, out);
    } else if (a.kind === 'shock' && on()) {
      a.next += a.every;
      spark(b, u, a, out);
    }
  }
}
/** What a curse's laying hand drinks of each tick (the Warlock's Hex, `abilities.ts`). */
export const HEX_DRAIN = 0.6;

/** A shock's spark: to the nearest of its own side within reach (every one of its side in the same water), passed on once. */
function spark(b: Battle, u: Unit, a: Ailment, out: BattleEvent[]): void {
  const by = layer(b, a.by);
  if (!by) return;
  const wet = inWater(b, u);
  const reach = wet ? AIL.SHOCK_WATER_REACH : AIL.SHOCK_REACH;
  const near = b.units
    .filter((x) => x.alive && x !== u && x.side === u.side && x.id !== a.from && Math.max(Math.abs(x.u - u.u), Math.abs(x.v - u.v)) <= reach && (!wet || inWater(b, x)))
    .sort((x, y) => Math.max(Math.abs(x.u - u.u), Math.abs(x.v - u.v)) - Math.max(Math.abs(y.u - u.u), Math.abs(y.v - u.v)) || x.id - y.id);
  const to = wet ? near : near.slice(0, 1);
  for (const x of to) {
    out.push({ kind: 'arc', from: u.id, to: x.id, ail: 'shock' });
    tagged(out, 'shock', () => hurt(b, by, x, Math.max(1, Math.round((a.dmg ?? 1) * (isMachine(x.def) ? AIL.SHOCK_MACHINE : 1))), false, true, out, 'dot'));
    if (a.relay && x.alive) shockFor(b, by, x, AIL.SHOCK_PASS_MS, false, u.id);
  }
}

/* ------------------------------------------------------------------ blows */

/** A heavy blow on a frozen fighter shatters the ice (on only): the freeze ends, and the blow lands again for half (capped). The
 *  extra damage to deal after the blow itself, or 0. */
export function shatterOf(b: Battle, by: Unit, to: Unit, dmg: number, heavy: boolean, src: 'blow' | 'skill' | 'dot'): number {
  if (!on() || src === 'dot' || by.side === to.side || !hasAil(to, 'freeze', b.t)) return 0;
  if (!(src === 'skill' || heavy || dmg >= to.maxHp * AIL.SHATTER_HEAVY)) return 0;
  thaw(b, to);
  return Math.max(1, Math.round(Math.min(dmg * AIL.SHATTER_SHARE, to.maxHp * (ailBoss(to) ? AIL.SHATTER_CAP_BOSS : AIL.SHATTER_CAP))));
}

/** A blow lands from a fighter whose kind lays an ailment with its blows (the foes' riders; on only). */
export function blowRiders(b: Battle, by: Unit, to: Unit): void {
  if (!on() || !to.alive || by.side === to.side) return;
  switch (by.def) {
    case 'skeleton':
    case 'spearman':
    case 'boneArcher':
    case 'boneVolley':
    case 'boneCaptain':
      // (grave-rot: one blow in five; the chance hashes the moment, so the fight's own stream does not move)
      if (mixSeed(b.seed, 0x5fa1, b.t, by.id, to.id) % AIL.GRAVE_ROT === 0) poisonFor(b, by, to);
      break;
    case 'lichKing':
      chillFor(b, to, AIL.CHILL_MS, false, true, by);
      break;
    case 'shamanKing':
      shockFor(b, by, to);
      break;
    case 'forgeTitan':
      burnFor(b, by, to);
      break;
    case 'packBlack':
    case 'packRed':
    case 'packWhite':
    case 'alphaWolf':
      bleedFor(b, by, to, 0.1);
      break;
  }
}

/* ------------------------------------------------------------------ ground */

/** A step ends on a tile (on only): lava sets it burning, a swamp's water poisons, water puts out fire. */
export function groundStep(b: Battle, u: Unit): void {
  if (!on() || defOf(u).flies) return;
  const g = tileOf(b, u).ground;
  if (g === 'lava') burnFor(b, u, u, AIL.BURN_MS, 0.05);
  else if (g === 'coals') burnFor(b, u, u, 1500, 0.04);
  else if (g === 'water' || g === 'deep') {
    putOut(u);
    if (b.board.area === 'swamp') poisonFor(b, u, u, 0.02);
  }
}
/** Once a second (on only): standing still on ice chills; a shrine cleanses. */
export function groundSecond(b: Battle, u: Unit): void {
  if (!on() || defOf(u).flies) return;
  const g = tileOf(b, u).ground;
  if (g === 'ice' && !walking(b, u)) chillFor(b, u, 1000);
  else if (g === 'shrine') cleanse(b, u);
}

/* ------------------------------------------------------------------ fear */

/** The tile a feared fighter flees to (a step away from the nearest foe), or -1. */
export function fleeTile(b: Battle, me: Unit, steps: { i: number; u: number; v: number }[]): number {
  const foes = b.units.filter((x) => x.alive && x.side !== me.side);
  if (!foes.length) return -1;
  const dist = (u: number, v: number) => Math.min(...foes.map((f) => Math.max(Math.abs(f.u - u), Math.abs(f.v - v))));
  const now = dist(me.u, me.v);
  let best = -1;
  let far = now;
  for (const s of steps) {
    const d = dist(s.u, s.v);
    if (d > far || (d === far && best >= 0 && s.i < best)) {
      far = d;
      best = s.i;
    }
  }
  return best;
}
