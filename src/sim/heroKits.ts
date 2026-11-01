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
import { CHARGE_MAX, keyOf, kitOf, powered, began, tal, ultimateOf, ultTune, type Skill } from './abilities';
import { UNITS } from './units';
import { kitWithLoadout } from './books';
import { HERO_TABLE } from './kits/table';
import { SKILL2_WHEN } from './kits/when';
import { REVIVE, fallenFor, raiseFallen, type ReviveFace } from './kits/revive';
import { CLASS_WEIGHT, type SkillClass } from './skillRules';
import { relicCharge } from './relicFight';

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
  /** The breath (the skills overhaul's rule 5): after a skill's cast ends, this long before the hero casts another of its skills (the ultimate,
   *  a healer's revive and a guard's emergency ignore it), so heroes still strike and walk between casts. (The pools' own gaps, 3 s for
   *  stamina and 5 s for mana, went with the overhaul's batch 2: every skill has a cooldown of its own, from its class.) */
  BREATH_MS: 800,
  /** A hero passes over a lighter skill when saving would see a heavier one, whose cooldown ends within this long, paid for (stamina, mana). */
  HOLD_STAM_MS: 1500,
  HOLD_MANA_MS: 3000,
  /** A skill that found nothing to do is not saved for until this long has passed. */
  IDLE_MS: 2000,
  /** A mana healer keeps its heal's cost in reserve while an ally is under this share of its health. */
  RESERVE_UNDER: 0.6,
  /** The pace of every gain above (the refill and the gains from blows): the tuning pass's one knob for how often skills come round, so their
   *  strength and the old skills' cadence stay in step (the design's numbers are at 1). */
  PACE: 0.45,
  /** Once skill 2 is open (level 10), the pool comes back this much faster (mana, stamina): a hero that has learnt its second skill draws on a deeper
   *  well, so both skills come round in a fight. */
  SKILL2_PACE_MANA: 1.45,
  SKILL2_PACE_STAM: 1.05,
  /** Once skill 3 is open (level 20), the pool comes back this much faster again (the skills overhaul's `SKILL3_PACE`, batch 4): a third skill
   *  to feed, so the well deepens a little more. */
  SKILL3_PACE: 1.1,
} as const;

/** The level skill 2 opens at (skill 1 is open from level 1; the ultimate at `ULT_LEVEL`). */
export const SKILL2_LEVEL = 10;
/** The level skill 3 opens at (the skills overhaul's batch 4, the owner's answer: halfway between skill 2 and the ultimate). */
export const SKILL3_LEVEL = 20;
/** What the old charge gifts (a tier skill's charge rider, a combo's beat, a gear ability, a bard's tune, a kill's charge back) are worth to a hero's pool:
 *  this share of the pool for each point of charge. A cast used to take 100 charge, and a skill now costs about half a pool, so a cast's worth is a cast's worth. */
export const CHARGE_TO_POOL = 0.5;

/** The ultimate's meter, from level 30: what fills it. Per the hero's own max health dealt (or healed) and taken, and per second; times the ultimate's
 *  `tuned.rate` and the hero's `ultRate` talent. A blow turned aside by a guard counts at half (the guard halves the damage that reaches here).
 *  The owner's call (ULT-CHARGE, docs/notes/ult-charge.md): an ultimate once or twice a battle, the first by about mid-fight in an ordinary wave and a
 *  second in a long or boss fight. So every fight starts with the meter `START` full (or what the hero carried from the run's last wave, if more), and
 *  it fills about two and a half times as fast as it did: an average hero's first ultimate comes about 12 s into an army wave (about 30 s for a
 *  meter from empty, less in a fierce fight). It was about 40 s from empty, and most fights (20 to 30 s) ended before it filled. */
export const ULT_FILL = {
  DEALT: 40,
  TAKEN: 64,
  PER_SEC: 1.6,
  START: 60,
  /** The Last Stand's heroes fill at this share of the pace (`Unit.ultPace`): its waves follow on from each other in one long battle, so the meter
   *  carries from wave to wave and fills a little slower, about once a wave, keeping the Stand's pace (`stand.test.ts`) where its own tuning put it. */
  STAND: 0.5,
};

/** One of a hero's skills: the skill, its class, what it costs, how much of the caster's attack it carries (`tune`, the balance knob), its
 *  cooldown, and the AI's flags. */
export interface Slot {
  skill: Skill;
  /** Its class (the skills overhaul, `skillRules.ts`): the range its cost, cooldown and cast time sit in, and how the AI weighs it. */
  cls: SkillClass;
  cost: number;
  /** Strength: times the caster's attack while it casts (the damage, healing and what is called up). */
  tune: number;
  /** Its cooldown: the shortest time between two casts of this skill (ms), from the start of one cast. */
  cd: number;
  /** A share of the hero's max health it also costs (the Barbarian's and Demon Swordsman's blood). */
  hpCost?: number;
  /** When this holds the skill goes before anything but a queued ultimate (a heal for a dying friend, an escape). */
  emergency?: (b: Battle, me: Unit) => boolean;
  /** A heal: a mana healer keeps its cost in reserve while a friend is badly hurt. */
  heals?: boolean;
  /** Something a hit of this skill leaves on the foe it hit (a mark): called for each foe struck. */
  onHit?: (b: Battle, me: Unit, to: Unit, out: BattleEvent[]) => void;
  /** A healer's skill 2 has a revive face (RPG-SPELLS batch 2, `kits/revive.ts`): cast instead when a friend lies fallen and it is ready. */
  revive?: ReviveFace;
}

export interface HeroKit {
  pool: Pool;
  /** Its skills in slot order (skill 1 opens at level 1, skill 2 at `SKILL2_LEVEL`, skill 3 at `SKILL3_LEVEL`). `s1` and `s2` are the first two,
   *  the same objects; `s3` the third, when the kit has one. */
  slots: Slot[];
  s1: Slot;
  s2: Slot;
  s3?: Slot;
  /** A new role line for the hero's card (the design's archetype). */
  role: string;
}

/** The per-hero state the kits keep (all optional, so a battle in a save or a test reads as before). */
export interface KitState {
  /** When each skill was last cast (slots 1, 2 and 3), and when each was last tried and had nothing to do. */
  at1?: number;
  at2?: number;
  at3?: number;
  idle1?: number;
  idle2?: number;
  idle3?: number;
  /** Until when the hero takes its breath after a cast (`RES.BREATH_MS`). */
  breath?: number;
  /** When it was last struck (a mana hero's focus), and until when a stamina hero is winded. */
  hitAt?: number;
  winded?: number;
  /** When a healer last cast its revive face. */
  atRev?: number;
}

let table: Record<string, HeroKit> | undefined;
/** Every hero's kit (built on first use: the kits read `KITS`, which is built when `abilities.ts` loads). */
export const HERO_KITS = (): Record<string, HeroKit> => (table ??= HERO_TABLE());

/** A placed hero's kit: only one of the 45 heroes the player places (not a summon, not a foe, not one that changed kit). */
export function heroKitOf(u: Unit): HeroKit | undefined {
  if (u.side !== 'hero' || u.owner !== undefined || u.kit) return undefined;
  if (UNITS[u.def]?.summon) return undefined;
  // (a hero with skills from books in its slots: its kit with those two, `books.ts`)
  if (u.book) return kitWithLoadout(u.def, u.book);
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

/** How much faster the pool comes back once skill 2 is open, and again once skill 3 is (for a kit that has one). */
const skill2Pace = (u: Unit, pool: Pool): number =>
  (skill2Open(u) ? (pool === 'mana' ? RES.SKILL2_PACE_MANA : RES.SKILL2_PACE_STAM) : 1) * (skill3Open(u) && heroKitOf(u)?.s3 ? RES.SKILL3_PACE : 1);

/** The pool's refill a second: the pool's own, faster for a mana hero left alone, none while a stamina hero is winded; times the team's and its gear's refill. */
export function regenOf(b: Battle, u: Unit): number {
  const pool = poolOf(u);
  if (!pool) return 0;
  const k = RES.PACE * skill2Pace(u, pool) * (b.traits?.charge ?? 1) * (1 + (u.eq?.charge ?? 0)) * relicCharge(b, u);
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
  const rate = (ultTune(u, ult)?.rate ?? 1) * (1 + tal(u, 'ultRate')) * (u.ultPace ?? 1);
  u.charge2 = Math.min(CHARGE_MAX, (u.charge2 ?? 0) + n * rate);
}
/** The ultimate meter's share of a fight's damage or healing: `amount` points of health dealt (or healed) or taken by a hero with a kit. */
export function ultOnDamage(u: Unit, amount: number, taken: boolean): void {
  if (amount <= 0 || !heroKitOf(u)) return;
  fillUlt(u, ((taken ? ULT_FILL.TAKEN : ULT_FILL.DEALT) * amount) / u.maxHp);
}

/** Whether a hero's skill 2 is open at the level it fights at. */
export const skill2Open = (u: Unit): boolean => (u.level ?? 1) >= SKILL2_LEVEL;
/** Whether a hero's skill 3 is open at the level it fights at. */
export const skill3Open = (u: Unit): boolean => (u.level ?? 1) >= SKILL3_LEVEL;

/** What a skill costs this hero: its slot's cost (the same at every rank since the skills overhaul's batch 3: the tier 3 discount went with the
 *  tier skills). */
export const costOf = (_u: Unit, slot: Slot): number => slot.cost;

/** The level each slot opens at (slot 1, 2, ...). */
export const SLOT_LEVELS: readonly number[] = [1, SKILL2_LEVEL, SKILL3_LEVEL];
/** Whether a hero's skill in slot `n` (1, 2, ...) is open at the level it fights at. */
export const slotOpen = (u: Unit, n: number): boolean => (u.level ?? 1) >= (SLOT_LEVELS[n - 1] ?? Infinity);
/** The open slots, from the highest down (skill 2 is weighed before skill 1). */
const openSlots = (u: Unit, hk: HeroKit): number[] => hk.slots.map((_, i) => i + 1).filter((n) => slotOpen(u, n)).reverse();

type SlotKey = 'at1' | 'at2' | 'at3';
type IdleKey = 'idle1' | 'idle2' | 'idle3';
/** When slot `n` was last cast, and when it last found nothing to do. */
export const lastAt = (u: Unit, n: number): number | undefined => u.ks?.[`at${n}` as SlotKey];
const idleAt = (u: Unit, n: number): number | undefined => u.ks?.[`idle${n}` as IdleKey];

/** Whether the hero could cast its skill in slot `n` now: it is open, it can pay (pool and blood), and its cooldown has run. */
export function canPay(b: Battle, u: Unit, hk: HeroKit, n: number): boolean {
  const slot = hk.slots[n - 1];
  if (!slot || !slotOpen(u, n)) return false;
  if (resOf(u, hk.pool) + 1e-9 < costOf(u, slot)) return false;
  if (slot.hpCost && u.hp <= u.maxHp * slot.hpCost * 2) return false;
  const at = lastAt(u, n);
  return at === undefined || b.t - at >= slot.cd;
}

/** Whether the hero is still taking its breath after its last cast. */
const breathing = (b: Battle, u: Unit): boolean => u.ks?.breath !== undefined && b.t < u.ks.breath;

/** Cast one of a hero's skills (it pays, and its marks are left on what it hit), or false if it had nothing to do. */
function fire(b: Battle, me: Unit, hk: HeroKit, n: number, out: BattleEvent[]): boolean {
  const slot = hk.slots[n - 1];
  const from = out.length;
  if (!powered(b, me, slot.skill, slot.tune - 1, out)) return false;
  const cost = costOf(me, slot);
  addRes(me, -cost);
  if (slot.hpCost) me.hp = Math.max(1, Math.round(me.hp - me.maxHp * slot.hpCost));
  const s = ks(me);
  s[`at${n}` as SlotKey] = b.t;
  // (with no breath, none is kept: an interrupted cast leaves the hero free at once, as before the rule)
  if (RES.BREATH_MS > 0) s.breath = b.t + slot.skill.castMs + RES.BREATH_MS;
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
  // (skill 3 counts as skill 1 for the talents' cast effects: most are cheap, quick jabs, which would otherwise double their worth)
  return began(b, me, slot.skill, out, n === 2 ? 'skill2' : 'skill');
}

/** Whether a skill has something to do, as far as saving for it goes: its `SKILL2_WHEN` look (`kits/when.ts`), and it did not just find nothing. */
function hasWork(b: Battle, me: Unit, hk: HeroKit, m: number): boolean {
  const idle = idleAt(me, m);
  if (idle !== undefined && b.t - idle < RES.IDLE_MS) return false;
  const when = SKILL2_WHEN[keyOf(hk.slots[m - 1].skill)];
  return !when || when(b, me);
}

/** Whether the hero should pass over slot `n` to save for slot `m` (the design's step 5, the old holding rule made general): `m` is of a heavier
 *  class and has something to do, its cooldown ends within the hold, and paying for `n` now would leave it short when its cooldown ends. So a
 *  heavy skill is saved for (its cost is what holds it back), and a lighter one waits only while the heavier one is coming round. A jab is held
 *  the same way (the skills overhaul's batch 4: at the measured income a jab cast whenever it is ready drinks nearly the whole refill, so the
 *  design's "a jab is never held" starved the heavies); with nothing heavier coming round it jabs whenever its cooldown allows. */
function holdsFor(b: Battle, me: Unit, hk: HeroKit, n: number, m: number): boolean {
  const light = hk.slots[n - 1];
  const heavy = hk.slots[m - 1];
  if (CLASS_WEIGHT[heavy.cls] <= CLASS_WEIGHT[light.cls]) return false;
  if (!hasWork(b, me, hk, m)) return false;
  const hold = hk.pool === 'mana' ? RES.HOLD_MANA_MS : RES.HOLD_STAM_MS;
  const at = lastAt(me, m);
  const cdLeft = at === undefined ? 0 : Math.max(0, at + heavy.cd - b.t);
  if (cdLeft > hold) return false;
  const rate = Math.max(0.1, regenOf(b, me));
  const res = resOf(me, hk.pool);
  const cost = costOf(me, heavy);
  return res - costOf(me, light) + (rate * cdLeft) / 1000 < cost;
}

/** Whether the hero should pass over slot `n` to save for another open slot. */
function holding(b: Battle, me: Unit, hk: HeroKit, n: number): boolean {
  for (let m = 1; m <= hk.slots.length; m++) if (m !== n && slotOpen(me, m) && holdsFor(b, me, hk, n, m)) return true;
  return false;
}

/** Whether a mana healer must keep its heal's cost back: a friend is under `RESERVE_UNDER` and this skill is not the heal. */
function reserve(b: Battle, me: Unit, hk: HeroKit, n: number): boolean {
  if (hk.pool !== 'mana') return false;
  const slot = hk.slots[n - 1];
  if (slot.heals) return false;
  const heal = hk.slots.find((x, i) => x.heals && slotOpen(me, i + 1));
  if (!heal) return false;
  if (!b.units.some((a) => a.alive && a.side === me.side && a.hp < a.maxHp * RES.RESERVE_UNDER)) return false;
  return resOf(me, hk.pool) - costOf(me, slot) < costOf(me, heal);
}

/** The order a hero weighs its open skills in (the design's steps 4 and 6): heavy, then utility, then strike, then jab, then guard; among
 *  equals the one cast longest ago first (so two strikes take turns), then the higher slot. A fixed order over the fight's state. */
function pickOrder(me: Unit, hk: HeroKit, open: number[]): number[] {
  const at = (n: number) => lastAt(me, n) ?? -Infinity;
  return [...open].sort((x, y) => CLASS_WEIGHT[hk.slots[y - 1].cls] - CLASS_WEIGHT[hk.slots[x - 1].cls] || at(x) - at(y) || y - x);
}

/** A free hero with a kit decides what to cast (the design's section 3): a healer's revive; a queued ultimate; an emergency; the ultimate on
 *  Auto; then its skills in `pickOrder`, each when open, affordable, off cooldown, past its breath and with something to do (its cast's own
 *  check), a lighter one passed over while saving would soon pay for a heavier one (`holding`). False when it casts nothing (it strikes or walks instead). */
export function castHero(b: Battle, me: Unit, hk: HeroKit, out: BattleEvent[]): boolean {
  // (a healer's revive goes before anything but an ultimate the player has queued, RPG-SPELLS batch 2)
  if (hk.s2.revive && me.ultOrder === undefined && castRevive(b, me, hk, out)) return true;
  const ult = ultimateOf(me);
  if (ult && (me.charge2 ?? 0) >= ult.need && (me.ultOrder !== undefined || b.autoUlt !== false)) {
    if (powered(b, me, ult, (1 + tal(me, 'ultPow')) * (ultTune(me, ult)?.power ?? 1) - 1, out)) {
      me.charge2 = (me.charge2 ?? 0) - ult.need;
      delete me.ultOrder;
      return began(b, me, ult, out, 'ult');
    }
  }
  const open = openSlots(me, hk);
  const breath = breathing(b, me);
  // (emergencies: guards first, then the highest slot first; only a guard's ignores the breath)
  const urgent = [...open].sort((x, y) => Number(hk.slots[y - 1].cls === 'guard') - Number(hk.slots[x - 1].cls === 'guard'));
  for (const n of urgent) {
    const slot = hk.slots[n - 1];
    if (breath && slot.cls !== 'guard') continue;
    if (slot.emergency && canPay(b, me, hk, n) && slot.emergency(b, me) && fire(b, me, hk, n, out)) return true;
  }
  if (breath) return false;
  for (const n of pickOrder(me, hk, open)) {
    if (!canPay(b, me, hk, n)) continue;
    if (holding(b, me, hk, n)) continue;
    if (reserve(b, me, hk, n)) continue;
    if (fire(b, me, hk, n, out)) return true;
    ks(me)[`idle${n}` as IdleKey] = b.t;
  }
  return false;
}

/** As a fight begins: every placed hero whose ultimate is open starts with its meter at least `ULT_FILL.START` (a carried meter that is fuller is kept). */
export function startUlt(u: Unit): void {
  if (!heroKitOf(u) || !ultimateOf(u)) return;
  u.charge2 = Math.min(CHARGE_MAX, Math.max(u.charge2 ?? 0, ULT_FILL.START));
}

/** The ultimate's meter: whether it is full (for the page's ready glow). */
export const ultFull = (u: Unit): boolean => {
  const ult = ultimateOf(u);
  return !!ult && (u.charge2 ?? 0) >= ult.need;
};

/** The words a fighter's skill shows, from the key its `skill` event carries: the name of the skill of that key in the fighter's own kit
 *  (its two hero skills, its kit's skill and ultimate), so a foe that kept a skill's old name shows that one; the key when none matches. */
export function skillShown(u: Unit, key: string): string {
  const hk = heroKitOf(u);
  const kit = kitOf(u);
  for (const s of [...(hk?.slots.map((x) => x.skill) ?? []), hk?.s2.revive?.skill, kit?.skill, ultimateOf(u), kit?.ultimate]) if (s && keyOf(s) === key) return s.name;
  return key;
}

/** What a healer's revive costs: its skill 2's cost and `REVIVE.EXTRA` more (the tier 3 discount does not apply). */
export const reviveCost = (hk: HeroKit): number => hk.s2.cost + REVIVE.EXTRA;

/** Whether a healer's revive face is ready now: it has one and skill 2 is open, it is not the Last Stand, the wave's two skill revives
 *  are not spent, its own 30 s have come round, it can pay, and a friend lies fallen who has not been raised this wave. */
export function reviveReady(b: Battle, me: Unit): boolean {
  const hk = heroKitOf(me);
  if (!hk?.s2.revive || !me.alive || !skill2Open(me) || b.stand) return false;
  if ((b.revives ?? 0) >= REVIVE.PER_WAVE) return false;
  const at = me.ks?.atRev;
  if (at !== undefined && b.t - at < REVIVE.GAP_MS) return false;
  if (resOf(me, hk.pool) + 1e-9 < reviveCost(hk)) return false;
  return fallenFor(b, me).length > 0;
}

/** Cast a healer's revive: the fallen friend nearest it rises (`raiseFallen`), the healer pays and is busy casting. False when it is not ready. */
function castRevive(b: Battle, me: Unit, hk: HeroKit, out: BattleEvent[]): boolean {
  if (!reviveReady(b, me)) return false;
  const x = fallenFor(b, me)[0];
  addRes(me, -reviveCost(hk));
  ks(me).atRev = b.t;
  b.revives = (b.revives ?? 0) + 1;
  raiseFallen(b, me, x, REVIVE.SHARE, out, (u) => startPool(u));
  return began(b, me, hk.s2.revive!.skill, out, 'skill2');
}
