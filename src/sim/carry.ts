// SUMMON-TIMERS (the owner's "the hero summons should be on a timer so they last more than one round; same with the shapeshift";
// docs/notes/summon-timers.md, section 6 of docs/notes/skills-overhaul-design.md): a hero's summons and shapes last a timer of fighting time,
// not the wave. The timer runs while a fight runs and waits between waves; what is left of it (and a summon's health) is kept on the run's
// hero (`Owned.summons`, `Owned.form`) and put back as the next wave's fight begins. The Last Stand, whose waves are one fight, runs on.
//
// What ends one: its timer; a summon falling; its hero falling (a shape at once; a summon fights on to the wave's end but is not kept);
// its hero not fielded in the next wave (benched, recycled or merged away); the run's end. The Illusionist's decoys stay short and end
// with the wave (the owner's answer).
//
// Pure rules: no Pixi, no DOM, and no randomness at all (the tiles are taken in a fixed order).

import { tileAt, standable, type At } from './board';
import { addUnit, defOf, type Battle, type Unit } from './battle';
import { formOf, UNITS } from './units';
import type { Owned, Run } from './run';

/** Each timer's length (ms of fighting time), before the caster's `dur` talent. A foe that borrows one of these moves keeps its old time. */
export const TIMER = {
  /** The Druid's treant and the Beastmaster's wolves (Conjure Treant, Summon Beast, Pack Tactics with no wolf; a combo's or a rider's). */
  beast: 60000,
  /** The ultimates' callings: Conjure Animals' four wolves, Wall of Thorns' two treants. */
  ultBeast: 30000,
  /** The Reaper's Animate Dead. */
  wraith: 20000,
  /** The Reaper's Harvest of Souls: each kill's wraith. */
  harvest: 12000,
  /** The Samurai Commander's Plant the Standard. */
  standard: 30000,
  /** The Werewolf's Shapechange: the Hunter or the Brute. */
  wolfForm: 40000,
  /** The Druid's Wild Shape. */
  wildShape: 20000,
  /** The Kitsune's Alter Self. */
  alterSelf: 15000,
  /** The ultimates' forms: the Werewolf's Full Moon, the Demon Swordsman's Metamorphosis. */
  moon: 15000,
  demon: 15000,
} as const;

/** A summon or shape may be called again (renewing its timer) only once it has this share of its time left or less. */
export const RENEW_AT = 0.25;

/** Whether summons and shapes are kept between waves (on as the game ships; the balance tool turns it off to measure the timers alone). */
export const CARRY = { on: true };

/** The summon kinds that are kept between waves (a decoy, an imp or a skeleton is not). */
export const KEPT_KINDS: readonly string[] = ['treant', 'wolf', 'direWolf', 'wraith', 'standard'];

/** A summon kept on its hero between waves: its kind, its share of health, its timer's ms left and full length; a wraith also keeps the
 *  health, attack and shape of the foe it was. */
export interface KeptSummon {
  kind: string;
  hp: number;
  left: number;
  full: number;
  max?: number;
  atk?: number;
  look?: string;
}

/** A shape kept on its hero between waves: which (`key`), its timer's ms left and full length, and what it needs to be put back. */
export interface KeptForm {
  key: 'wolf' | 'moon' | 'tree' | 'guise' | 'demon';
  left: number;
  full: number;
  /** The Werewolf's form. */
  wolf?: 'hunter' | 'brute';
  /** The Full Moon's frenzy. */
  n?: number;
  /** The Kitsune's borrowed kind, attack share and looks (kept even if that foe is gone). */
  def?: string;
  mult?: number;
  look?: string;
}

/** What a placed hero brings into a fight from the last wave (put on the field as the fight begins, `startKept`). */
export interface Kept {
  summons?: KeptSummon[];
  form?: KeptForm[];
}

/** A hero side's timer: `ms` stretched by the caster's `dur` talent for a hero, the move's old time `was` for a foe that borrows it. */
export const timerFor = (me: Unit, ms: number, was: number, dur: (u: Unit, n: number) => number): number => (me.side === 'hero' ? dur(me, ms) : dur(me, was));

/** Start a summon's timer (it fades when it runs out, `kitTick`). */
export function timeSummon(b: Battle, u: Unit, ms: number): void {
  u.expires = b.t + ms;
  u.life = ms;
}

/** The summon of `kind` called by `me` that is nearest its end, if it has a quarter of its time left or less: casting again renews it. */
export function renewable(b: Battle, me: Unit, kinds: readonly string[]): Unit | undefined {
  return b.units
    .filter((x) => x.alive && x.owner === me.id && kinds.includes(x.def) && x.expires !== undefined && x.life)
    .sort((x, y) => x.expires! - y.expires! || x.id - y.id)
    .find((x) => x.expires! - b.t <= x.life! * RENEW_AT);
}

/** Whether a shape that runs until `until` (of full length `full`) may be cast again: none, or a quarter of its time left or less. */
export const shapeRenewable = (b: Battle, until: number | undefined, full: number | undefined): boolean =>
  until === undefined || until <= b.t || until - b.t <= (full ?? 0) * RENEW_AT;

/** The shapes a fighter wears now, each with its time left and full length. */
export function shapesOf(u: Unit, t: number): { key: KeptForm['key']; left: number; full: number }[] {
  const out: { key: KeptForm['key']; left: number; full: number }[] = [];
  const x = u.kx;
  const add = (key: KeptForm['key'], until: number | undefined, full: number | undefined) => {
    if (until !== undefined && full && until > t) out.push({ key, left: until - t, full });
  };
  if (x) {
    if (x.wolf) add('wolf', x.wolfUntil, x.wolfMs);
    add('moon', x.moon, x.moonMs);
    if (x.tree) add('tree', x.tree.until, x.tree.ms);
    if (x.guise) add('guise', x.guise.until, x.guise.ms);
  }
  if (u.def === 'demonSwordsman' && u.form) add('demon', u.form.until, u.form.ms);
  return out;
}

/** The timer the page shows on a fighter (a ring by its health bar): a summon's, or the shape with the most time left. Null for none
 *  (a decoy, whose time is short and is not shown, has no `life`). */
export function timerOf(u: Unit, t: number): { left: number; full: number; shape: boolean } | null {
  if (!u.alive) return null;
  if (u.owner !== undefined && u.expires !== undefined && u.life) return { left: Math.max(0, u.expires - t), full: u.life, shape: false };
  const s = shapesOf(u, t).sort((a, c) => c.left - a.left)[0];
  return s ? { left: s.left, full: s.full, shape: true } : null;
}

/** What hero `u` keeps from a fight just won: its summons still standing (in the order they came) and its shapes, with their time left. */
export function keptOf(b: Battle, u: Unit): Kept {
  const summons: KeptSummon[] = b.units
    .filter((x) => x.alive && x.side === 'hero' && x.owner === u.id && KEPT_KINDS.includes(x.def) && x.expires !== undefined && x.life && x.expires > b.t)
    .sort((x, y) => x.id - y.id)
    .map((x) => ({
      kind: x.def,
      hp: x.hp / x.maxHp,
      left: x.expires! - b.t,
      full: x.life!,
      ...(x.def === 'wraith' ? { max: x.maxHp, atk: x.power ?? 1, ...(x.look ? { look: x.look } : {}) } : {}),
    }));
  const form: KeptForm[] = shapesOf(u, b.t).map((s) => {
    const f: KeptForm = { key: s.key, left: s.left, full: s.full };
    if (s.key === 'wolf') f.wolf = u.kx!.wolf;
    if (s.key === 'moon') f.n = u.frenzy && u.frenzy.until > b.t ? u.frenzy.n : 0;
    if (s.key === 'guise') {
      f.def = u.kx!.guise!.def;
      f.mult = u.kx!.guise!.mult;
      if (u.kx!.guise!.look ?? u.look) f.look = u.kx!.guise!.look ?? u.look;
    }
    return f;
  });
  return { ...(summons.length ? { summons } : {}), ...(form.length ? { form } : {}) };
}

/** After a wave is won (`keepCharges`): each hero of the run keeps its summons and shapes for the next wave, if it still stands. One that
 *  fell, or that sat the wave out, keeps none: what it had is dismissed. */
export function keepSummons(run: Run, b: Battle): void {
  for (const h of run.roster) {
    h.summons = undefined;
    h.form = undefined;
    if (!CARRY.on) continue;
    const u = b.units.find((x) => x.side === 'hero' && x.tag === h.id && x.owner === undefined);
    if (!u || !u.alive) continue;
    const k = keptOf(b, u);
    if (k.summons) h.summons = k.summons;
    if (k.form) h.form = k.form;
  }
}

/** What a run's hero brings to its next fight, for its `Boost` (nothing for a hero with none, so its boost is as it was). Nonsense from a
 *  save (an unknown kind, a timer at or below 0) is dropped. */
export function keptBoost(h: Owned): { kept?: Kept } {
  const summons = (h.summons ?? []).filter((s) => KEPT_KINDS.includes(s?.kind) && s.left > 0 && s.full > 0 && s.hp > 0);
  const form = (h.form ?? []).filter((f) => f && ['wolf', 'moon', 'tree', 'guise', 'demon'].includes(f.key) && f.left > 0 && f.full > 0 && (f.key !== 'guise' || !!UNITS[f.def ?? '']));
  if (!summons.length && !form.length) return {};
  return { kept: { ...(summons.length ? { summons } : {}), ...(form.length ? { form } : {}) } };
}

const apart = (a: At, c: At) => Math.abs(a.u - c.u) + Math.abs(a.v - c.v);

/** The free tile within `reach` of `me` (and no more than `climb` up or down) nearest the nearest foe: the tile rule `callSummon` uses. */
export function summonSpot(b: Battle, me: Unit, reach: number, climb: number): At | undefined {
  const foes = b.units.filter((f) => f.alive && f.side !== me.side).sort((x, y) => apart(me, x) - apart(me, y) || x.id - y.id);
  const near = foes[0];
  if (!near) return undefined;
  const h = tileAt(b.board, me.u, me.v)?.h ?? 0;
  const spots: At[] = [];
  for (let dv = -reach; dv <= reach; dv++)
    for (let du = -reach; du <= reach; du++) {
      const at = { u: me.u + du, v: me.v + dv };
      const t = tileAt(b.board, at.u, at.v);
      if (apart(me, at) >= 1 && apart(me, at) <= reach * 2 && t && standable(t) && !b.units.some((x) => x.alive && x.u === at.u && x.v === at.v) && Math.abs(t.h - h) <= climb) spots.push(at);
    }
  return spots.sort((x, y) => apart(x, near) - apart(y, near) || apart(me, x) - apart(me, y) || x.v - y.v || x.u - y.u)[0];
}

const wayTo = (a: At, c: At): number => {
  const du = c.u - a.u;
  const dv = c.v - a.v;
  return Math.abs(du) >= Math.abs(dv) ? (du >= 0 ? 0 : 2) : dv >= 0 ? 1 : 3;
};

/** The fight begins (`fight`): every placed hero's kept summons stand up on the free tiles beside it nearest the foes, and its kept shapes
 *  are put back on it (looks, stats and rules), with what was left of their timers. Summons first, so a shape's attack does not lift them. */
export function startKept(b: Battle): void {
  const callers = b.units.filter((u) => u.kept && u.alive && u.side === 'hero').sort((x, y) => x.id - y.id);
  for (const me of callers) {
    const k = me.kept!;
    me.kept = undefined;
    b.kits ??= {};
    for (const s of k.summons ?? []) keepSummon(b, me, s);
    for (const f of k.form ?? []) keepForm(b, me, f);
  }
}

function keepSummon(b: Battle, me: Unit, s: KeptSummon): void {
  const at = summonSpot(b, me, s.kind === 'standard' ? 1 : 2, 2);
  if (!at) return;
  let u: Unit;
  if (s.kind === 'wraith') {
    const max = Math.max(1, Math.round(s.max ?? UNITS.wraith.hp));
    u = { id: b.nextId++, def: 'wraith', side: 'hero', u: at.u, v: at.v, hp: max, maxHp: max, facing: 3, alive: true, busyUntil: 400, charge: 0 };
    u.power = Math.max(0.1, s.atk ?? 1);
    if (s.look) u.look = s.look;
    b.units.push(u);
  } else if (s.kind === 'standard') {
    u = addUnit(b, 'standard', at.u, at.v);
    u.maxHp = Math.max(1, Math.round(me.maxHp / 4));
    b.kits = { ...b.kits, standards: true };
  } else u = addUnit(b, s.kind, at.u, at.v, { atk: me.power ?? 1, hp: me.maxHp / defOf(me).hp, grade: me.grade });
  u.hp = Math.max(1, Math.min(u.maxHp, Math.round(u.maxHp * s.hp)));
  u.owner = me.id;
  u.expires = b.t + s.left;
  u.life = s.full;
  const foe = b.units.filter((f) => f.alive && f.side !== 'hero').sort((x, y) => apart(u, x) - apart(u, y) || x.id - y.id)[0];
  u.facing = foe ? wayTo(u, foe) : me.facing;
}

/** The looks the Werewolf's forms are drawn with. */
export const WOLF_LOOK = { hunter: 'werewolf_white', brute: 'werewolf_black' } as const;
/** The Demon Swordsman's form multiplies his attack by this (`FORM_MULT` in abilities.ts; kept here too so this file need not import it). */
const DEMON_MULT = 1.5;

function keepForm(b: Battle, me: Unit, f: KeptForm): void {
  const x = (me.kx ??= {});
  const until = b.t + f.left;
  if (f.key === 'wolf' && f.wolf) {
    x.wolf = f.wolf;
    x.wolfUntil = until;
    x.wolfMs = f.full;
    if (!(x.moon !== undefined && x.moon > b.t)) me.look = WOLF_LOOK[f.wolf];
  } else if (f.key === 'moon') {
    x.moon = until;
    x.moonMs = f.full;
    if (f.n) me.frenzy = { n: f.n, until };
    me.look = WOLF_LOOK.brute;
  } else if (f.key === 'tree' && !x.tree) {
    const added = Math.round(me.maxHp * TREE_SHARE);
    me.maxHp += added;
    me.hp += added;
    x.tree = { until, added, ms: f.full };
    me.look = formOf(UNITS.treant, me.grade ?? 1);
  } else if (f.key === 'guise' && f.def && UNITS[f.def] && !x.guise) {
    const mult = Math.max(1, f.mult ?? 1);
    me.power = (me.power ?? 1) * mult;
    x.guise = { def: f.def, until, mult, ms: f.full, ...(f.look ? { look: f.look } : {}) };
    me.look = f.look ?? UNITS[f.def].sheet;
  } else if (f.key === 'demon' && me.form === undefined) {
    me.power = (me.power ?? 1) * DEMON_MULT;
    me.form = { until, ms: f.full };
  }
}

/** The most the Kitsune's guise lifts her attack by (x1.4 before the timers, when it lasted 5s; tuned with them: docs/notes/summon-timers.md). */
export const GUISE_CAP = 1.3;
/** The share of her health the Druid's Wild Shape adds (a third before the timers; tuned with them: docs/notes/summon-timers.md). */
export const TREE_SHARE = 0.2;

/** A hero falls: its shapes end at once (its attack and health as they were, its own looks), so a hero raised again rises in its own shape. */
export function endShapes(u: Unit): void {
  const x = u.kx;
  if (x) {
    if (x.wolf && x.wolfUntil !== undefined) x.wolf = x.wolfUntil = x.wolfMs = undefined;
    x.moon = x.moonMs = undefined;
    if (x.tree) {
      u.maxHp -= x.tree.added;
      u.hp = Math.min(u.hp, u.maxHp);
      x.tree = undefined;
    }
    if (x.guise) {
      u.power = (u.power ?? 1) / x.guise.mult;
      x.guise = undefined;
    }
  }
  if (u.def === 'demonSwordsman' && u.form) {
    u.power = (u.power ?? 1) / DEMON_MULT;
    u.form = undefined;
  }
  delete u.look;
}
