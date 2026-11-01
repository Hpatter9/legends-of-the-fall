// The lost techniques (LOST-TECHNIQUES, docs/notes/lost-techniques.md): four skills that are in no hero's kit, each the end of a quest
// chain (`questData/lost.ts`), taught by a Legendary book (`bookData.ts`). Unlike the other books they have no source hero: each is built
// here from the movement toolkit and the kits' marks, and `books.ts` turns one into a slot for whoever reads it (its cost the same share
// of the reader's pool, whatever the pool). They are tuned a little over the kits' band, as the design allows (about 10% over a hero's best
// loadout), and the cooldowns keep them to a few casts a fight.
//
//   - The Ninefold Cut (Manual): blinks from foe to foe, up to four in turn, cutting each; the last cut is double and bleeds.
//   - Words of Unmaking (Grimoire): a line of void across the thickest lane: the foes in it lose shields and good effects, are slowed,
//     and take 30% more while marked.
//   - The Hymn of the Long Dawn (Hymnal): for 4 s every friend within 3 heals each second and cannot fall below 1 health; once a wave.
//   - The Old Hunger (Bestiary): leaps on the hardest-hitting foe, pins it, shoves the rest away and heals for each foe struck.
//
// Pure rules: no Pixi, no DOM, no randomness (every choice is a fixed order, then by id).

import { DIRS, type At } from '../board';
import { atkOf, wayTo, type Battle, type BattleEvent, type Unit } from '../battle';
import { apart, CHARGE_MAX, foesOf, mendUnit, type Skill } from '../abilities';
import { bleedFor, chillFor, stunFor } from '../ailments';
import { canLand, chargePlans, laneLine, leapTo, moveMany, raiseAura } from '../toolkit';
import { kx } from './effects';
import { mark, ms, strike, strongest } from './common';
import type { Slot } from '../heroKits';
import type { SkillClass } from '../skillRules';

/** A foe's tile beside which `me` could land when starting from `from`: the free tile beside it nearest `from` (then by row and column). */
function landingBeside(b: Battle, me: Unit, f: Unit, from: At, taken: readonly At[]): At | undefined {
  let best: { at: At; d: number } | undefined;
  for (const [du, dv] of DIRS) {
    const at = { u: f.u + du, v: f.v + dv };
    if (taken.some((t) => t.u === at.u && t.v === at.v) || !canLand(b, me, at)) continue;
    const d = apart(from, at);
    if (!best || d < best.d || (d === best.d && (at.v < best.at.v || (at.v === best.at.v && at.u < best.at.u)))) best = { at, d };
  }
  return best?.at;
}

/* ------------------------------------------------------------------ The Ninefold Cut */

/** Up to `CUTS` foes in turn, each the nearest unstruck foe within `REACH` of where the last cut left him; each cut is a hit of the skill's
 *  strength, the last `LAST` times that and bleeding. */
export const NINEFOLD = { CUTS: 4, REACH: 3, LAST: 2, BLEED: 0.08, BLEED_MS: 3000 } as const;
export function ninefoldCut(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  // (the chain is planned first, on where he would stand after each blink, so the last cut is known to be the last)
  const plan: { f: Unit; at?: At }[] = [];
  let here: At = { u: me.u, v: me.v };
  const foes = foesOf(b, me).filter((f) => !f.under);
  const taken: At[] = [];
  for (let i = 0; i < NINEFOLD.CUTS; i++) {
    const next = foes
      .filter((f) => !plan.some((p) => p.f === f) && apart(here, f) <= NINEFOLD.REACH)
      .sort((x, y) => apart(here, x) - apart(here, y) || x.hp - y.hp || x.id - y.id);
    let step: { f: Unit; at?: At } | undefined;
    for (const f of next) {
      if (apart(here, f) <= 1) {
        step = { f };
        break;
      }
      const at = landingBeside(b, me, f, here, taken);
      if (at) {
        step = { f, at };
        break;
      }
    }
    if (!step) break;
    plan.push(step);
    if (step.at) {
      taken.push(step.at);
      here = step.at;
    }
  }
  if (!plan.length) return false;
  plan.forEach(({ f, at }, i) => {
    if (!me.alive) return;
    if (at && canLand(b, me, at)) {
      const from = { u: me.u, v: me.v };
      me.u = at.u;
      me.v = at.v;
      me.step = undefined;
      out.push({ kind: 'blink', by: me.id, from, to: { ...at } });
    }
    if (!f.alive) return;
    me.facing = wayTo(me, f);
    out.push({ kind: 'swing', by: me.id, to: f.id });
    const last = i === plan.length - 1;
    strike(b, me, f, last ? NINEFOLD.LAST : 1, out, last);
    if (last && f.alive) bleedFor(b, me, f, NINEFOLD.BLEED, ms(me, NINEFOLD.BLEED_MS));
  });
  return true;
}

/* ------------------------------------------------------------------ Words of Unmaking */

/** A line of void `LEN` tiles long across the thickest lane (the wall of fire's own lane), for `MS`: whoever stands within a tile of it loses
 *  its shield and its good effects (haste, a guard, a ward), is slowed, and takes `MORE` more from every blow while the mark lasts. The
 *  caster needs a foe within `REACH`, and two or more foes in the lane. */
export const UNMAKING = { LEN: 4, MS: 5000, REACH: 7, NEAR: 1, FOES: 2, MORE: 0.3 } as const;
export function wordsOfUnmaking(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const foes = foesOf(b, me).filter((f) => !f.under);
  if (!foes.some((f) => apart(me, f) <= UNMAKING.REACH)) return false;
  const line = laneLine(b, me, UNMAKING.LEN);
  if (!line) return false;
  const caught = foes.filter((f) => line.some((t) => apart(f, t) <= UNMAKING.NEAR));
  if (caught.length < UNMAKING.FOES) return false;
  const t = ms(me, UNMAKING.MS);
  const mid = line[Math.floor(line.length / 2)];
  out.push({ kind: 'aura', by: me.id, at: { ...mid }, reach: Math.ceil(UNMAKING.LEN / 2), what: 'unmaking', ms: t });
  for (const f of caught) {
    delete f.shield;
    f.hasteUntil = undefined;
    delete f.auraGuard;
    chillFor(b, f, t, false, false, me);
    kx(f).exposed = { until: b.t + t, mult: UNMAKING.MORE, by: me.id };
    mark(out, me, f, 'curse', t);
  }
  return true;
}

/* ------------------------------------------------------------------ The Hymn of the Long Dawn */

/** For `MS` every friend within `REACH` of the singer heals `HEAL` of the skill's strength a second and cannot fall below 1 health. Once a
 *  fight, and only when a friend near is hurt (under `UNDER` of its health). */
export const HYMN = { REACH: 3, MS: 4000, EVERY: 1000, HEAL: 0.35, UNDER: 0.6 } as const;
export function hymnOfTheLongDawn(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  if (kx(me).hymned) return false;
  const near = b.units.filter((a) => a.alive && a.side === me.side && !a.under && apart(me, a) <= HYMN.REACH);
  if (!near.some((a) => a.hp < a.maxHp * HYMN.UNDER)) return false;
  kx(me).hymned = true;
  const t = ms(me, HYMN.MS);
  for (const a of near) kx(a).dawn = Math.max(kx(a).dawn ?? 0, b.t + t);
  raiseAura(b, me, { what: 'long dawn', reach: HYMN.REACH, ms: t, every: HYMN.EVERY, ally: { flat: Math.round(atkOf(me) * HYMN.HEAL) } }, out);
  // (the first line is sung at once)
  for (const a of near) mendUnit(a, atkOf(me) * HYMN.HEAL, out, me);
  return true;
}

/* ------------------------------------------------------------------ The Old Hunger */

/** Leaps on the hardest-hitting foe within `REACH`, strikes it (the skill's strength) and pins it `PIN` ms, strikes every other foe within `NEAR`
 *  of where it lands for `SPLASH` as much and shoves each two tiles away, and heals `HEAL` of its health for each foe struck. */
export const HUNGER = { REACH: 5, PIN: 1500, NEAR: 2, SPLASH: 0.4, SHOVE: 2, HEAL: 0.04 } as const;
export function oldHunger(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const target = foesOf(b, me)
    .filter((f) => !f.under && apart(me, f) <= HUNGER.REACH)
    .sort(strongest)[0];
  if (!target) return false;
  if (apart(me, target) > 1) {
    const plan = chargePlans(b, me, { tiles: HUNGER.REACH, route: 'leap', mult: 0, only: (f) => f === target })[0];
    if (!plan || !leapTo(b, me, plan.end, out)) return false;
  }
  me.facing = wayTo(me, target);
  out.push({ kind: 'swing', by: me.id, to: target.id });
  let struck = 0;
  strike(b, me, target, 1, out, true);
  struck++;
  if (target.alive) stunFor(b, target, ms(me, HUNGER.PIN), false, 'stun', me);
  const rest = foesOf(b, me).filter((f) => f !== target && !f.under && apart(me, f) <= HUNGER.NEAR);
  for (const f of rest) {
    strike(b, me, f, HUNGER.SPLASH, out);
    struck++;
  }
  moveMany(b, me, rest.filter((f) => f.alive), HUNGER.SHOVE, 'shove', out);
  mendUnit(me, me.maxHp * HUNGER.HEAL * struck, out);
  return true;
}

/* ------------------------------------------------------------------ the table */

/** A lost technique: its skill, class, and cost as a share of the reader's pool (so half a pool is half a pool, mana or stamina). */
export interface LostDef {
  skill: Skill;
  cls: SkillClass;
  /** The cost as a share of the pool (0 to 1). */
  share: number;
  cd: number;
  /** Its strength: times the reader's attack while it casts (the balance knob; `docs/notes/lost-techniques.md`). */
  tune: number;
}

const sk = (name: string, key: string, text: string, castMs: number, anim: Skill['anim'], cast: Skill['cast']): Skill => ({ name, key, text, need: CHARGE_MAX, dealt: 0, taken: 0, perSec: 0, castMs, anim, cast });

export const LOST: Readonly<Record<string, LostDef>> = {
  ninefoldCut: {
    skill: sk('The Ninefold Cut', 'ninefoldCut', 'Blinks from foe to foe, up to four in turn (the nearest unstruck within 3 each time), cutting each; the last cut is double and bleeds 3s', 700, 'attack2', ninefoldCut),
    cls: 'heavy',
    share: 0.5,
    cd: 11000,
    tune: 0.68,
  },
  wordsOfUnmaking: {
    skill: sk('Words of Unmaking', 'wordsOfUnmaking', 'A line of void 4 tiles long across the thickest lane for 5s: the foes in it lose shields and good effects, are slowed, and take 30% more while marked', 800, 'attack2', wordsOfUnmaking),
    cls: 'utility',
    share: 0.5,
    cd: 16000,
    tune: 1,
  },
  longDawn: {
    skill: sk('The Hymn of the Long Dawn', 'longDawn', 'For 4s every friend within 3 heals each second and cannot fall below 1 health; once a fight, when a friend near is hurt', 700, 'defend', hymnOfTheLongDawn),
    cls: 'utility',
    share: 0.45,
    cd: 20000,
    tune: 1,
  },
  oldHunger: {
    skill: sk('The Old Hunger', 'oldHunger', 'Leaps on the hardest-hitting foe within 5, pins it for 2s, shoves every other foe within 2 two tiles away, and heals 8% for each foe struck', 700, 'attack', oldHunger),
    cls: 'heavy',
    share: 0.5,
    cd: 12000,
    tune: 0.5,
  },
};

/** The slot a lost technique makes for a reader whose pool is `pool` (`resMax` of it is the pool's size in points). */
export function lostSlot(id: string, poolMax: number): Slot | undefined {
  const d = LOST[id];
  if (!d) return undefined;
  return { skill: d.skill, cls: d.cls, cost: Math.round(d.share * poolMax * 10) / 10, tune: d.tune, cd: d.cd, ...(id === 'longDawn' ? { heals: true } : {}) };
}
