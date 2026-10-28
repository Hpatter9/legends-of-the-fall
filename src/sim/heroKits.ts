// Hero kits (COMBAT-002, docs/notes/hero-kits.md): every hero fights with one pool, mana or stamina, and two skills that cost it
// (skill 1 from level 1, skill 2 from `SKILL2_LEVEL`), and an ultimate (from `ULT_LEVEL`) on its own meter that fills from the
// fight itself (damage dealt and taken, healing given, and time) and is fired by the player's tap (`orders.ts`) or, with Auto on,
// on its own. Foes keep the old way (`KITS`, the charge meter and `gain` in `abilities.ts`): this file is looked up first for a
// placed hero only.
//
// The pool is kept in `Unit.charge` as a share of the pool in percent (0 to `CHARGE_MAX`), so a run's carried charge, the old
// saves and everything that reads `charge` as "how full" stay valid; `resOf` turns it into points of mana or stamina.
//
// Randomness: none here. The skills that roll (the Buccaneer's dice) use the battle's skill stream (`roll`), as every skill does.

import type { Battle, BattleEvent, Unit } from './battle';
import { CHARGE_MAX, kitOf, powered, began, tal, ultimateOf, ultTune, type Skill } from './abilities';
import { UNITS } from './units';
import { HERO_TABLE } from './kits/table';
import { SKILL2_WHEN } from './kits/when';

export type Pool = 'mana' | 'stamina';

/** The pools' numbers (the design's section 1). Mana is a deep, slow pool that pays out in fewer, bigger spells and refills
 *  faster while its hero is left alone; stamina is a small, quick pool that front-liners burn as they go and get back by
 *  being in the thick of it. */
export const RES = {
  MANA_MAX: 100,
  MANA_START: 20,
  MANA_REGEN: 3,
  FOCUS_MULT: 1.5,
  FOCUS_MS: 3000,
  MANA_ON_BLOW: 3,
  STAM_MAX: 60,
  STAM_START: 20,
  STAM_REGEN: 3,
  STAM_ON_BLOW: 2,
  STAM_ON_HIT: 3,
  STAM_ON_DODGE: 1,
  WINDED_MS: 1000,
  GAP_MANA_MS: 5000,
  GAP_STAM_MS: 3000,
  /** A hero skips skill 1 when saving for skill 2 would see it cast within this long (stamina, mana). */
  HOLD_STAM_MS: 1500,
  HOLD_MANA_MS: 3000,
  /** Skill 2 that found nothing to do is not waited for until this long has passed. */
  IDLE_MS: 2000,
  /** A mana healer keeps its heal's cost in reserve while an ally is under this share of its health. */
  RESERVE_UNDER: 0.6,
  /** The pace of every gain above (the refill and the gains from blows): the tuning pass's one knob for how often skills come round, so their
   *  strength and the old skills' cadence stay in step (the design's numbers are at 1). */
  PACE: 0.45,
  /** Once skill 2 is open (level 10), the pool comes back this much faster (mana, stamina): a hero that has learnt its second skill draws on a deeper
   *  well, so both skills come round in a fight. */
  SKILL2_PACE_MANA: 1.6,
  SKILL2_PACE_STAM: 1.15,
} as const;

/** The level skill 2 opens at (skill 1 is open from level 1; the ultimate at `ULT_LEVEL`). */
export const SKILL2_LEVEL = 10;
/** What the old charge gifts (a tier skill's charge rider, a combo's beat, a gear ability, a bard's tune, a kill's charge back) are worth to a hero's pool:
 *  this share of the pool for each point of charge. A cast used to take 100 charge, and a skill now costs about half a pool, so a cast's worth is a cast's worth. */
export const CHARGE_TO_POOL = 0.5;
/** A tier 3 hero's other skill (the one its tier skill does not improve) costs this much less. */
export const TIER3_DISCOUNT = 0.85;

/** The ultimate's meter, from level 30: what fills it (the owner's call: rarer and bigger, about 40 seconds of fighting for an average hero, about 30
 *  for a front-liner and 50 for a support). Per the hero's own max health dealt (or healed) and taken, and per second; times the ultimate's `tuned.rate`
 *  and the hero's `ultRate` talent. A blow turned aside by a guard counts at half (the guard halves the damage that reaches here). */
export const ULT_FILL = {
  DEALT: 16,
  TAKEN: 26,
  PER_SEC: 0.55,
} as const;

/** One of a hero's two skills: the skill, what it costs, how much of the caster's attack it carries (`tune`, the balance knob), the shortest gap
 *  between two casts of it, and the AI's flags. */
export interface Slot {
  skill: Skill;
  cost: number;
  /** Strength: times the caster's attack while it casts (the damage, healing and what is called up). */
  tune: number;
  /** The shortest time between two casts of this skill (ms); the pool's own gap when unset. */
  gap?: number;
  /** A share of the hero's max health it also costs (the Barbarian's and Demon Swordsman's blood). */
  hpCost?: number;
  /** When this holds the skill goes before anything but a queued ultimate (a heal for a dying friend, an escape). */
  emergency?: (b: Battle, me: Unit) => boolean;
  /** A heal: a mana healer keeps its cost in reserve while a friend is badly hurt. */
  heals?: boolean;
  /** Something a hit of this skill leaves on the foe it hit (a mark): called for each foe struck. */
  onHit?: (b: Battle, me: Unit, to: Unit, out: BattleEvent[]) => void;
}

export interface HeroKit {
  pool: Pool;
  s1: Slot;
  s2: Slot;
  /** A new role line for the hero's card (the design's archetype). */
  role: string;
}

/** The per-hero state the kits keep (all optional, so a battle in a save or a test reads as before). */
export interface KitState {
  /** When each skill was last cast (1 and 2), and when skill 2 was last tried and had nothing to do. */
  at1?: number;
  at2?: number;
  idle2?: number;
  /** When it was last struck (a mana hero's focus), and until when a stamina hero is winded. */
  hitAt?: number;
  winded?: number;
}

let table: Record<string, HeroKit> | undefined;
/** Every hero's kit (built on first use: the kits read `KITS`, which is built when `abilities.ts` loads). */
export const HERO_KITS = (): Record<string, HeroKit> => (table ??= HERO_TABLE());

/** A placed hero's kit: only one of the 45 heroes the player places (not a summon, not a foe, not one that changed kit). */
export function heroKitOf(u: Unit): HeroKit | undefined {
  if (u.side !== 'hero' || u.owner !== undefined || u.kit) return undefined;
  if (UNITS[u.def]?.summon) return undefined;
  return HERO_KITS()[u.def];
}

export const poolOf = (u: Unit): Pool | undefined => heroKitOf(u)?.pool;
export const resMax = (pool: Pool): number => (pool === 'mana' ? RES.MANA_MAX : RES.STAM_MAX);
/** The pool's points (mana or stamina). */
export const resOf = (u: Unit, pool: Pool = poolOf(u) ?? 'mana'): number => (u.charge / CHARGE_MAX) * resMax(pool);
/** Add (or take, below zero) points of a hero's pool; nothing for a fighter without one. */
export function addRes(u: Unit, n: number): void {
  const pool = poolOf(u);
  if (!pool || !u.alive) return;
  u.charge = Math.max(0, Math.min(CHARGE_MAX, u.charge + (n / resMax(pool)) * CHARGE_MAX));
}
const ks = (u: Unit): KitState => (u.ks ??= {});

/** The pool a hero starts a fight with (a part of it: one cheap cast's worth of stamina, less than a cast of mana), unless it carries some over from the run's last wave. */
export function startPool(u: Unit, carried?: number): void {
  const pool = poolOf(u);
  if (!pool) return;
  u.charge = carried !== undefined ? Math.min(CHARGE_MAX, carried) : ((pool === 'mana' ? RES.MANA_START : RES.STAM_START) / resMax(pool)) * CHARGE_MAX;
}

/** A blow (or shot) this hero dealt landed. */
export function poolOnDealt(u: Unit): void {
  const pool = poolOf(u);
  if (pool) addRes(u, (pool === 'mana' ? RES.MANA_ON_BLOW : RES.STAM_ON_BLOW) * RES.PACE * skill2Pace(u, pool));
}
/** This hero was struck (a blow or a skill, not burning), or slipped a blow. */
export function poolOnTaken(b: Battle, u: Unit, dodged = false): void {
  const pool = poolOf(u);
  if (!pool) return;
  if (!dodged) ks(u).hitAt = b.t;
  if (pool === 'stamina') addRes(u, (dodged ? RES.STAM_ON_DODGE : RES.STAM_ON_HIT) * RES.PACE * skill2Pace(u, pool));
}

/** How much faster the pool comes back once skill 2 is open. */
const skill2Pace = (u: Unit, pool: Pool): number => (skill2Open(u) ? (pool === 'mana' ? RES.SKILL2_PACE_MANA : RES.SKILL2_PACE_STAM) : 1);

/** The pool's refill a second: the pool's own, faster for a mana hero left alone, none while a stamina hero is winded; times the team's and its gear's refill. */
export function regenOf(b: Battle, u: Unit): number {
  const pool = poolOf(u);
  if (!pool) return 0;
  const k = RES.PACE * skill2Pace(u, pool) * (b.traits?.charge ?? 1) * (1 + (u.eq?.charge ?? 0));
  const s = u.ks;
  if (pool === 'stamina') return s?.winded !== undefined && s.winded > b.t ? 0 : RES.STAM_REGEN * k;
  const focus = s?.hitAt === undefined || b.t - s.hitAt >= RES.FOCUS_MS ? RES.FOCUS_MULT : 1;
  return RES.MANA_REGEN * focus * k;
}

/** Every tick, for a hero with a kit: its pool refills, and its ultimate's meter gains its time share. */
export function tickPool(b: Battle, u: Unit, tickMs: number): void {
  addRes(u, (regenOf(b, u) * tickMs) / 1000);
  fillUlt(u, (ULT_FILL.PER_SEC * tickMs) / 1000);
}

/** Points on a hero's ultimate meter (from level 30; full stays full). */
function fillUlt(u: Unit, n: number): void {
  const ult = ultimateOf(u);
  if (!ult || !u.alive || n <= 0) return;
  const rate = (ultTune(u, ult)?.rate ?? 1) * (1 + tal(u, 'ultRate'));
  u.charge2 = Math.min(CHARGE_MAX, (u.charge2 ?? 0) + n * rate);
}
/** The ultimate meter's share of a fight's damage or healing: `amount` points of health dealt (or healed) or taken by a hero with a kit. */
export function ultOnDamage(u: Unit, amount: number, taken: boolean): void {
  if (amount <= 0 || !heroKitOf(u)) return;
  fillUlt(u, ((taken ? ULT_FILL.TAKEN : ULT_FILL.DEALT) * amount) / u.maxHp);
}

/** Whether a hero's skill 2 is open at the level it fights at. */
export const skill2Open = (u: Unit): boolean => (u.level ?? 1) >= SKILL2_LEVEL;

/** What a skill costs this hero: its slot's cost, less for the skill a tier 3 hero's tier skill does not improve. */
export function costOf(u: Unit, slot: Slot): number {
  const tierSkill = kitOf(u)?.skill;
  return (u.grade ?? 1) >= 3 && slot.skill !== tierSkill ? slot.cost * TIER3_DISCOUNT : slot.cost;
}

const gapOf = (pool: Pool, slot: Slot) => slot.gap ?? (pool === 'mana' ? RES.GAP_MANA_MS : RES.GAP_STAM_MS);
const lastAt = (u: Unit, n: 1 | 2) => (n === 1 ? u.ks?.at1 : u.ks?.at2);

/** Whether the hero could cast this skill now: it can pay (pool and blood), and the gap since its last cast is past. */
export function canPay(b: Battle, u: Unit, hk: HeroKit, n: 1 | 2): boolean {
  const slot = n === 1 ? hk.s1 : hk.s2;
  if (n === 2 && !skill2Open(u)) return false;
  if (resOf(u, hk.pool) + 1e-9 < costOf(u, slot)) return false;
  if (slot.hpCost && u.hp <= u.maxHp * slot.hpCost * 2) return false;
  const at = lastAt(u, n);
  return at === undefined || b.t - at >= gapOf(hk.pool, slot);
}

/** Cast one of a hero's skills (it pays, and its marks are left on what it hit), or false if it had nothing to do. */
function fire(b: Battle, me: Unit, hk: HeroKit, n: 1 | 2, out: BattleEvent[]): boolean {
  const slot = n === 1 ? hk.s1 : hk.s2;
  const from = out.length;
  if (!powered(b, me, slot.skill, slot.tune - 1, out)) return false;
  const cost = costOf(me, slot);
  addRes(me, -cost);
  if (slot.hpCost) me.hp = Math.max(1, Math.round(me.hp - me.maxHp * slot.hpCost));
  const s = ks(me);
  if (n === 1) s.at1 = b.t;
  else s.at2 = b.t;
  if (hk.pool === 'stamina' && resOf(me, hk.pool) < 0.5) s.winded = b.t + RES.WINDED_MS;
  if (slot.onHit) {
    const hit = new Set<number>();
    for (let i = from; i < out.length; i++) {
      const e = out[i];
      if (e.kind === 'hit' && e.by === me.id && !hit.has(e.to)) hit.add(e.to);
    }
    for (const id of hit) {
      const f = b.units.find((x) => x.id === id);
      if (f && f.alive && f.side !== me.side) slot.onHit(b, me, f, out);
    }
  }
  // (a talent's "charge back" gives back that share of what the cast cost)
  const refund = me.eq?.tal?.refund;
  if (refund) addRes(me, (cost * refund) / 100);
  return began(b, me, slot.skill, out, n === 2 ? 'skill2' : 'skill');
}

/** Whether the hero should save skill 1's cost for skill 2. The two take turns: once skill 1 was the last cast, skill 1 waits for skill 2 while
 *  skill 2 has something to do (its `SKILL2_WHEN` look, `kits/when.ts`, and it did not just find nothing). Otherwise skill 1 waits only when saving
 *  would see skill 2 cast within the short hold. */
function holding(b: Battle, me: Unit, hk: HeroKit): boolean {
  if (!skill2Open(me)) return false;
  const s = me.ks;
  if (s?.idle2 !== undefined && b.t - s.idle2 < RES.IDLE_MS) return false;
  const when = SKILL2_WHEN[hk.s2.skill.name];
  if (when && !when(b, me)) return false;
  const need = costOf(me, hk.s2) - resOf(me, hk.pool);
  if (need <= 0) return false;
  if (s?.at1 !== undefined && (s.at2 === undefined || s.at1 > s.at2)) return true;
  const mana = hk.pool === 'mana';
  const hold = mana ? RES.HOLD_MANA_MS : RES.HOLD_STAM_MS;
  const at2 = s?.at2;
  if (at2 !== undefined && b.t + hold < at2 + gapOf(hk.pool, hk.s2)) return false;
  const rate = Math.max(0.1, regenOf(b, me));
  return (need / rate) * 1000 <= hold;
}

/** Whether a mana healer must keep its heal's cost back: a friend is under `RESERVE_UNDER` and this skill is not the heal. */
function reserve(b: Battle, me: Unit, hk: HeroKit, n: 1 | 2): boolean {
  if (hk.pool !== 'mana') return false;
  const slot = n === 1 ? hk.s1 : hk.s2;
  if (slot.heals) return false;
  const heal = hk.s1.heals ? hk.s1 : hk.s2.heals && skill2Open(me) ? hk.s2 : undefined;
  if (!heal) return false;
  if (!b.units.some((a) => a.alive && a.side === me.side && a.hp < a.maxHp * RES.RESERVE_UNDER)) return false;
  return resOf(me, hk.pool) - costOf(me, slot) < costOf(me, heal);
}

/** A free hero with a kit decides what to cast (the design's section 3): a queued ultimate; an emergency; the ultimate on Auto; skill 2, then skill 1,
 *  each when open, affordable, past its gap and with something to do (its cast's own check), skill 1 held back while skill 2 is nearly affordable.
 *  False when it casts nothing (it strikes or walks instead). */
export function castHero(b: Battle, me: Unit, hk: HeroKit, out: BattleEvent[]): boolean {
  const ult = ultimateOf(me);
  if (ult && (me.charge2 ?? 0) >= ult.need && (me.ultOrder !== undefined || b.autoUlt !== false)) {
    if (powered(b, me, ult, (1 + tal(me, 'ultPow')) * (ultTune(me, ult)?.power ?? 1) - 1, out)) {
      me.charge2 = (me.charge2 ?? 0) - ult.need;
      delete me.ultOrder;
      return began(b, me, ult, out, 'ult');
    }
  }
  const order: (1 | 2)[] = skill2Open(me) ? [2, 1] : [1];
  for (const n of order) {
    const slot = n === 1 ? hk.s1 : hk.s2;
    if (slot.emergency && canPay(b, me, hk, n) && slot.emergency(b, me) && fire(b, me, hk, n, out)) return true;
  }
  for (const n of order) {
    if (!canPay(b, me, hk, n)) continue;
    if (n === 1 && holding(b, me, hk)) continue;
    if (reserve(b, me, hk, n)) continue;
    if (fire(b, me, hk, n, out)) return true;
    if (n === 2) ks(me).idle2 = b.t;
  }
  return false;
}

/** The ultimate's meter: whether it is full (for the page's ready glow). */
export const ultFull = (u: Unit): boolean => {
  const ult = ultimateOf(u);
  return !!ult && (u.charge2 ?? 0) >= ult.need;
};
