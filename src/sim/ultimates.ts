// The heroes' ultimates (docs/notes/ultimates.md). Eight heroes (Kitsune, Karasu Tengu, Yamabushi Tengu, Gorgon, Samurai Commander,
// Great Sage, Demon Swordsman, Tyrant) wrote theirs first, in `abilities.ts`; this file gives every other hero its own and gates all
// forty-five, each unlocked when the hero fights at `ULT_LEVEL` (a kind's lasting level, or the in-run level in the spire and Calamity).
//
// Each ultimate is a thin config on one of a few engines, built from the skills' own helpers (`abilities.ts` exports them):
//   sky      salvos on separate crowds (volleys, meteors, shells)       smite    a burst round the caster (stun, slow, curse, pull)
//   bless    the team healed, cleansed, shielded, hastened, rallied     fortify  foes drawn to the caster, who and his allies guard
//   summon   fighters called up at the caster's side                    strikes  a chain of blinks or shots at separate foes
// Damage and healing are written in terms of `atkOf(me)`, so a talent's `ultPow` (which lifts the caster's attack while the
// ultimate casts) lifts all of it. Nothing here draws from the fight's main random stream.
//
// `heroUltimates` is a function (called once by `abilities.ts` when its table is built) because this file and `abilities.ts` import
// each other, and the constants and helpers it reads are only safe to read once both have loaded.

import { sightClear, standable, tileAt, type At } from './board';
import { setLook } from './kits/effects';
import { addUnit, atkOf, canStrike, defOf, hurt, strikeDef, tileOf, unitAt, wayTo, type Battle, type BattleEvent, type Unit } from './battle';
import {
  BANNER_MULT,
  CHARGE_MAX,
  DIR,
  FORM_MULT,
  HEX_EVERY,
  ULT_LEVEL,
  apart,
  blinkStrike,
  callSummon,
  castPower,
  chargeAt,
  crowd,
  drag,
  durOf,
  foesOf,
  gain,
  iaido,
  kitOf,
  lineFoes,
  mendUnit,
  roll,
  near3x3,
  net,
  reachOf,
  slowFor,
  tal,
  type Skill,
} from './abilities';

/** A duration in ms, as the caster's `dur` talent lengthens it, and the ultimate's strength: a stronger ultimate holds, guards and hastens a little longer (by the square root of its strength). */
const dur = (me: Unit, ms: number): number => durOf(me, Math.round(ms * Math.sqrt(castPower())));
/** A share of a max hp (a shield, a heal, a drink), times the ultimate's strength. */
const share = (x: number): number => x * castPower();
const alliesOf = (b: Battle, me: Unit): Unit[] => b.units.filter((a) => a.alive && a.side === me.side);
const byId = (x: Unit, y: Unit) => x.id - y.id;
const strongest = (x: Unit, y: Unit) => atkOf(y) - atkOf(x) || x.id - y.id;
const stun = (b: Battle, f: Unit, ms: number) => {
  f.busyUntil = Math.max(f.busyUntil, b.t + ms);
  f.stunUntil = Math.max(f.stunUntil ?? 0, b.t + ms);
};
/** Whether some ally is hurt (or burning, bleeding or cursed): what a healing ultimate waits for. */
const wounded = (b: Battle, me: Unit, share = 0.8): boolean => alliesOf(b, me).some((a) => a.dot || a.hp < a.maxHp * share);
/** Free, standable tiles within `radius` of the caster that it (or a fighter its size) could stand on, nearest first. */
function spotsNear(b: Battle, me: Unit, radius: number, climb: number): At[] {
  const h = tileOf(b, me).h;
  const spots: At[] = [];
  for (let dv = -radius; dv <= radius; dv++)
    for (let du = -radius; du <= radius; du++) {
      const at = { u: me.u + du, v: me.v + dv };
      const t = tileAt(b.board, at.u, at.v);
      if (apart(me, at) >= 1 && t && standable(t) && !unitAt(b, at.u, at.v) && Math.abs(t.h - h) <= climb) spots.push(at);
    }
  return spots.sort((x, y) => apart(me, x) - apart(me, y) || x.v - y.v || x.u - y.u);
}

// ---- sky: salvos on separate crowds ----

interface Sky {
  /** How many salvos, the reach they may be aimed within, the attack share each carries, and the ms before the first lands. */
  n: number;
  reach: number;
  mult: number;
  ms: number;
  /** A volley (arrows, shot, cannon-fire) or a meteor (heavy, and it leaves the ground burning). */
  kind: 'rain' | 'meteor';
  /** Ms between one salvo landing and the next. */
  gap: number;
  /** Once every separate crowd has been aimed at, the rest fall on the thickest crowds again (else they are not thrown). */
  repeat?: boolean;
  /** A second blow on each spot this many ms after, for this share of the first. */
  echo?: { gap: number; share: number };
  /** Each salvo sets off the powder barrels where it lands. */
  barrels?: boolean;
}
function sky(b: Battle, me: Unit, out: BattleEvent[], o: Sky): boolean {
  const aimed: Unit[] = [];
  const count = o.n + tal(me, 'extra');
  for (let i = 0; i < count; i++) {
    let aim = crowd(b, me, (f) => apart(me, f) <= reachOf(me, o.reach) && !aimed.some((a) => near3x3(f, a)));
    if (!aim && o.repeat && aimed.length) aim = aimed[i % aimed.length];
    if (!aim) break;
    aimed.push(aim);
    const ms = o.ms + i * o.gap;
    const id = o.kind === 'meteor' ? 'meteor' : 'volley';
    b.pending.push({ at: b.t + ms, kind: o.kind, by: me.id, to: aim.id, dmg: atkOf(me) * o.mult, heavy: o.kind === 'meteor', u: aim.u, v: aim.v, ...(o.barrels ? { barrels: true } : {}) });
    out.push({ kind: 'area', by: me.id, id, u: aim.u, v: aim.v, ms });
    if (o.echo) {
      b.pending.push({ at: b.t + ms + o.echo.gap, kind: o.kind, by: me.id, to: aim.id, dmg: atkOf(me) * o.mult * o.echo.share, heavy: o.kind === 'meteor', u: aim.u, v: aim.v });
      out.push({ kind: 'area', by: me.id, id, u: aim.u, v: aim.v, ms: ms + o.echo.gap });
    }
  }
  return aimed.length > 0;
}

// ---- smite: a burst round the caster ----

interface Smite {
  /** Tiles round the caster, and whether a foe must be in its sight. */
  reach: number;
  sight?: boolean;
  /** The attack share each foe takes (0 for none), and the strongest/weakest-first limit on how many are struck. */
  mult: number;
  top?: number;
  order?: (x: Unit, y: Unit) => number;
  /** Ms a foe is held, slowed, or left brittle (it takes a third more from every blow). */
  stun?: number;
  slow?: number;
  brittle?: number;
  /** Each foe is dragged a tile toward the caster. */
  pull?: boolean;
  /** Each foe is cursed (burns, and feeds the caster) for ms, `dot` of the attack every half second. */
  curse?: { ms: number; dot: number };
  /** Draw a bolt from the caster to each foe. */
  arcs?: boolean;
  /** The caster drinks this share of its max hp for each foe struck, up to `cap`; or is shielded this share of it. */
  drink?: { each: number; cap: number };
  shield?: number;
}
function smite(b: Battle, me: Unit, out: BattleEvent[], o: Smite): boolean {
  let foes = foesOf(b, me)
    .filter((f) => apart(me, f) <= reachOf(me, o.reach) && (!o.sight || sightClear(b.board, me, f)))
    .sort(o.order ?? byId);
  if (!foes.length) return false;
  if (o.top) foes = foes.slice(0, o.top);
  me.facing = wayTo(me, foes[0]);
  for (const f of foes) {
    if (o.arcs) out.push({ kind: 'arc', from: me.id, to: f.id });
    if (o.mult) hurt(b, me, f, net(atkOf(me) * o.mult, f), false, false, out, 'skill');
    if (!f.alive) continue;
    if (o.stun) stun(b, f, dur(me, o.stun));
    if (o.slow) slowFor(b, f, dur(me, o.slow));
    if (o.brittle) f.brittleUntil = Math.max(f.brittleUntil ?? 0, b.t + dur(me, o.brittle));
    if (o.pull && drag(b, f, me)) f.busyUntil = Math.max(f.busyUntil, b.t + 400);
    if (o.curse) {
      const ms = dur(me, o.curse.ms);
      f.dot = { kind: 'curse', dmg: Math.max(1, Math.round(atkOf(me) * o.curse.dot)), every: HEX_EVERY, ms, by: me.id, next: b.t + HEX_EVERY, until: b.t + ms };
    }
  }
  if (o.drink) mendUnit(me, share(Math.min(o.drink.cap, o.drink.each * foes.length)) * me.maxHp, out);
  if (o.shield) me.shield = { hp: Math.round(me.maxHp * share(o.shield)), until: b.t + dur(me, 5000) };
  return true;
}

// ---- bless: the team ----

interface Bless {
  /** Allies within this many tiles of the caster are touched (all of them when unset). */
  reach?: number;
  /** Healing: attack multiples, and shares of each ally's max hp; and the healing over time (an attack multiple a second for ms). */
  heal?: number;
  healShare?: number;
  hot?: { amount: number; ms: number };
  cleanse?: boolean;
  /** A shield of this share of each ally's max hp for 4s; a guard (half damage) and a haste, in ms. */
  shield?: number;
  guard?: number;
  haste?: number;
  /** A war banner (attack up a quarter), in ms; and skill charge given. */
  banner?: number;
  charge?: number;
  /** A song event for the renderer, in ms. */
  song?: number;
}
function bless(b: Battle, me: Unit, out: BattleEvent[], o: Bless): void {
  for (const a of alliesOf(b, me)) {
    if (o.reach !== undefined && apart(me, a) > reachOf(me, o.reach)) continue;
    if (o.cleanse) a.dot = undefined;
    if (o.heal) mendUnit(a, atkOf(me) * o.heal, out, me);
    if (o.healShare) mendUnit(a, a.maxHp * share(o.healShare), out, me);
    if (o.hot) a.hot = { amount: atkOf(me) * o.hot.amount, every: 1000, next: b.t + 1000, until: b.t + dur(me, o.hot.ms), by: me.id };
    if (o.shield) a.shield = { hp: Math.round(a.maxHp * share(o.shield)), until: b.t + dur(me, 4000) };
    if (o.guard) a.guardUntil = Math.max(a.guardUntil ?? 0, b.t + dur(me, o.guard));
    if (o.haste) {
      a.hasteUntil = Math.max(a.hasteUntil ?? 0, b.t + dur(me, o.haste));
      out.push({ kind: 'haste', to: a.id, ms: dur(me, o.haste) });
    }
    if (o.banner) {
      // (a second banner only lengthens the first: the attack is raised once)
      if (a.banner === undefined) a.power = (a.power ?? 1) * BANNER_MULT;
      a.banner = { until: b.t + dur(me, o.banner) };
    }
    if (o.charge) gain(a, o.charge);
    if (!o.heal && !o.healShare && !o.haste) out.push({ kind: 'heal', to: a.id, amount: 0, by: me.id });
  }
  if (o.banner) out.push({ kind: 'banner', by: me.id, ms: dur(me, o.banner) });
  if (o.song) out.push({ kind: 'song', by: me.id, ms: dur(me, o.song) });
}

// ---- fortify: foes drawn to the caster ----

interface Fortify {
  reach: number;
  taunt: number;
  guard: number;
  /** Allies within this many tiles of the caster guard too, and are healed (an attack multiple). */
  allies?: number;
  heal?: number;
  shield?: number;
  /** Foes within reach take this attack share too (a holy rebuke). */
  smite?: number;
}
function fortify(b: Battle, me: Unit, out: BattleEvent[], o: Fortify): boolean {
  const near = foesOf(b, me).filter((f) => apart(me, f) <= reachOf(me, o.reach));
  if (!near.length) return false;
  for (const f of near) {
    f.taunt = { to: me.id, until: b.t + dur(me, o.taunt) };
    if (o.smite) hurt(b, me, f, net(atkOf(me) * o.smite, f), false, false, out, 'skill');
  }
  me.guardUntil = Math.max(me.guardUntil ?? 0, b.t + dur(me, o.guard));
  if (o.shield) me.shield = { hp: Math.round(me.maxHp * share(o.shield)), until: b.t + dur(me, o.guard) };
  for (const a of alliesOf(b, me))
    if (a !== me && o.allies !== undefined && apart(me, a) <= reachOf(me, o.allies)) {
      a.guardUntil = Math.max(a.guardUntil ?? 0, b.t + dur(me, o.guard));
      if (o.heal) mendUnit(a, atkOf(me) * o.heal, out, me);
    }
  return true;
}

// ---- summon: fighters called up at the caster's side ----

/** `n` fighters of `kind` in all, counting those already standing (the skill's own call is one at a time). */
function summon(b: Battle, me: Unit, kind: string, n: number): boolean {
  const total = n + tal(me, 'extra');
  let called = false;
  for (let i = 0; i < total; i++) called = callSummon(b, me, kind, total - 1) || called;
  return called;
}

// ---- strikes: chains of blinks and shots ----

/** The caster blinks behind `n` separate foes in turn, one after another, `order` picking each. */
function blinks(b: Battle, me: Unit, out: BattleEvent[], n: number, mult: number, order: (x: Unit, y: Unit) => number): boolean {
  const done = new Set<number>();
  for (let i = 0; i < n + tal(me, 'extra'); i++) if (!blinkStrike(b, me, out, mult, order, done)) break;
  return done.size > 0;
}

interface Shots {
  n: number;
  mult: number;
  order: (x: Unit, y: Unit) => number;
  shot: 'bullet' | 'arrow' | 'fire';
  /** One foe takes every shot (else each takes one, the next foe on after it). */
  one?: boolean;
}
/** Shots from where the caster stands at foes in its reach, `order` picking them. */
function shots(b: Battle, me: Unit, out: BattleEvent[], o: Shots): boolean {
  const def = strikeDef(b, me);
  const foes = foesOf(b, me)
    .filter((f) => canStrike(b.board, def, me, f))
    .sort(o.order);
  if (!foes.length) return false;
  const n = o.n + tal(me, 'extra');
  for (let i = 0; i < n; i++) {
    const f = o.one ? foes[0] : foes.filter((x) => x.alive)[i % Math.max(1, foes.filter((x) => x.alive).length)];
    if (!f || !f.alive) break;
    me.facing = wayTo(me, f);
    out.push({ kind: 'shot', by: me.id, to: f.id, shot: o.shot, ms: 120 + apart(me, f) * 40 });
    hurt(b, me, f, net(atkOf(me) * o.mult, f), i === n - 1, false, out, 'skill');
  }
  return true;
}

// ---- the odd ones ----

/** Mass strikes from a close fight: `n` quick blows on each of the foes in reach, and each is held a moment. */
function fists(b: Battle, me: Unit, out: BattleEvent[], foesN: number, blows: number, mult: number, holdMs: number): boolean {
  const def = strikeDef(b, me);
  const foes = foesOf(b, me)
    .filter((f) => canStrike(b.board, def, me, f))
    .sort((x, y) => apart(me, x) - apart(me, y) || x.hp - y.hp || x.id - y.id)
    .slice(0, foesN + tal(me, 'extra'));
  if (!foes.length) return false;
  for (const f of foes) {
    me.facing = wayTo(me, f);
    for (let i = 0; i < blows && f.alive; i++) hurt(b, me, f, net(atkOf(me) * mult, f), i === blows - 1, false, out, 'skill');
    if (f.alive) stun(b, f, dur(me, holdMs));
  }
  return true;
}

/** Barbarian: a whirling slaughter of the 3x3 round him; he drinks a quarter of it and runs hot. */
function bloodlust(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const wide = 1 + tal(me, 'reach');
  const near = foesOf(b, me).filter((f) => Math.abs(me.u - f.u) <= wide && Math.abs(me.v - f.v) <= wide);
  if (!near.length) return false;
  const before = me.dealt ?? 0;
  for (const f of near) hurt(b, me, f, net(atkOf(me) * 3.0, f), true, false, out, 'skill');
  mendUnit(me, ((me.dealt ?? 0) - before) * 0.3, out);
  me.hasteUntil = Math.max(me.hasteUntil ?? 0, b.t + dur(me, 5000));
  out.push({ kind: 'haste', to: me.id, ms: dur(me, 5000) });
  return true;
}

/** Werewolf: the moon rises; his frenzy is full to the brim for a while, and a quarter of his health comes back. */
function fullMoon(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const f = kitOf(me)?.passive.frenzy;
  if (!f || !foesOf(b, me).some((x) => apart(me, x) <= 7)) return false;
  me.frenzy = { n: f.max + 2 + tal(me, 'frenzyMax'), until: b.t + dur(me, 7000) };
  mendUnit(me, me.maxHp * share(0.25), out);
  // (both his forms at once while the moon is up: the Hunter's speed and bleed, the Brute's hide and splash)
  (me.kx ??= {}).moon = b.t + dur(me, 7000);
  setLook(me, 'werewolf_black', out);
  out.push({ kind: 'frenzy', by: me.id, n: me.frenzy.n });
  return true;
}

/** Lancer: a charge down a long line at the weakest foe in it, and the whole line of riders gallops after. */
function knightsCharge(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  if (!chargeAt(b, me, out, { tiles: 7, mult: 3.6, stun: false, knock: true, haste: 4000 })) return false;
  bless(b, me, out, { reach: 4, haste: 4000 });
  return true;
}

/** Minotaur: up to three charges in a row, each at the weakest foe in line, shoving and stunning it. */
function stampede(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  let n = 0;
  for (let i = 0; i < 3 + tal(me, 'extra'); i++) {
    if (!chargeAt(b, me, out, { tiles: 5, mult: 2.4, stun: true, knock: true, haste: 0 })) break;
    n++;
  }
  return n > 0;
}

/** Reaper: every foe within five tiles is cut, those under a third of their health are reaped for far more, and each kill feeds him. */
function harvest(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const near = foesOf(b, me).filter((f) => apart(me, f) <= reachOf(me, 5));
  if (!near.length) return false;
  // (each foe it kills rises as a wraith for him for 5s)
  (me.kx ??= {}).harvest = b.t + 100;
  let kills = 0;
  for (const f of near) {
    const doomed = f.hp < f.maxHp * 0.35;
    hurt(b, me, f, net(atkOf(me) * (doomed ? 3.6 : 1.1), f), doomed, false, out, 'skill');
    if (!f.alive) kills++;
  }
  if (kills) mendUnit(me, share(Math.min(0.4, 0.1 * kills)) * me.maxHp, out);
  return true;
}

/** Queen Dragoon: fire down the longest line of foes, hurting each and setting it alight. */
function infernoBreath(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const foes = foesOf(b, me);
  const len = reachOf(me, 8);
  let best: Unit[] = [];
  let bestHp = 0;
  for (const aim of foes.filter((f) => apart(me, f) <= len)) {
    const hit = lineFoes(foes, me, aim, len);
    const hp = hit.reduce((n, f) => n + f.hp, 0);
    if (hit.length > best.length || (hit.length === best.length && hp < bestHp)) (best = hit), (bestHp = hp);
  }
  if (!best.length) return false;
  me.facing = wayTo(me, best[0]);
  const ms = dur(me, 5000);
  for (const f of best.sort((x, y) => apart(me, x) - apart(me, y) || x.id - y.id)) {
    out.push({ kind: 'shot', by: me.id, to: f.id, shot: 'fire', ms: 120 + apart(me, f) * 40 });
    hurt(b, me, f, net(atkOf(me) * 2.8, f), true, false, out, 'skill');
    if (f.alive) f.dot = { kind: 'burn', dmg: Math.max(1, Math.round(atkOf(me) * 0.15)), every: 500, ms, by: me.id, next: b.t + 500, until: b.t + ms };
  }
  return true;
}

/** Buccaneer: up to three foes (shooters first) are hooked in beside him, each cut hard and held a moment. */
function keelhaul(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const far = foesOf(b, me)
    .filter((f) => apart(me, f) >= 2 && apart(me, f) <= reachOf(me, 6) && !kitOf(f)?.passive.steady)
    .sort((x, y) => Number(!!defOf(y).shot) - Number(!!defOf(x).shot) || apart(me, x) - apart(me, y) || x.id - y.id);
  let hooked = 0;
  for (const f of far) {
    if (hooked >= 3 + tal(me, 'extra')) break;
    const to = DIR.map(([du, dv]) => ({ u: me.u + du, v: me.v + dv }))
      .filter((c) => {
        const t = tileAt(b.board, c.u, c.v);
        return t && standable(t) && !unitAt(b, c.u, c.v);
      })
      .sort((x, y) => apart(x, f) - apart(y, f) || x.v - y.v || x.u - y.u)[0];
    if (!to) break;
    f.step = { u: f.u, v: f.v, h: tileOf(b, f).h, at: b.t, ms: 250 };
    f.u = to.u;
    f.v = to.v;
    me.facing = wayTo(me, f);
    out.push({ kind: 'arc', from: me.id, to: f.id });
    // (each cut is a die from the skill stream: x1 to x3)
    const die = 1 + Math.floor(roll(b) * 6);
    hurt(b, me, f, net(atkOf(me) * (1 + (die - 1) * 0.4), f), die >= 4, false, out, 'skill');
    if (f.alive) stun(b, f, dur(me, 1500));
    hooked++;
  }
  return hooked > 0;
}

/** Illusionist: four decoys appear round her, and every foe within six tiles turns on the nearest of them. */
function hallOfMirrors(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const foes = foesOf(b, me).filter((f) => apart(me, f) <= reachOf(me, 6));
  if (!foes.length) return false;
  const spots = spotsNear(b, me, 3, defOf(me).jump).slice(0, 4);
  if (!spots.length) return false;
  const decoys = spots.map((at) => {
    const d = addUnit(b, 'decoy', at.u, at.v);
    d.owner = me.id;
    d.hp = d.maxHp = Math.max(1, Math.round(me.maxHp * Math.min(1, share(0.5))));
    d.facing = wayTo(d, foes[0]);
    d.busyUntil = b.t + 1000;
    out.push({ kind: 'heal', to: d.id, amount: 0, by: me.id });
    return d;
  });
  for (const f of foes) f.taunt = { to: [...decoys].sort((x, y) => apart(f, x) - apart(f, y) || x.id - y.id)[0].id, until: b.t + dur(me, 4500) };
  return true;
}

/** High Priestess: up to two fallen heroes rise with half their health, and everyone is healed. */
function resurrection(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const fallen = b.units.filter((a) => !a.alive && a.side === me.side && a.owner === undefined && !defOf(a).summon).sort((x, y) => (x.diedAt ?? 0) - (y.diedAt ?? 0) || x.id - y.id);
  if (!fallen.length && !wounded(b, me)) return false;
  for (const x of fallen.slice(0, 2)) {
    x.alive = true;
    x.hp = Math.max(1, Math.round(x.maxHp * 0.5));
    x.diedAt = undefined;
    x.busyUntil = b.t + 500;
    x.charge = 0;
    x.charge2 = undefined;
    x.dot = undefined;
    out.push({ kind: 'heal', to: x.id, amount: x.hp });
  }
  bless(b, me, out, { heal: 5, cleanse: true });
  return true;
}

/** Siege Bot: a great shell on the thickest crowd, and a second on the same spot a moment after. */
const orbital = (b: Battle, me: Unit, out: BattleEvent[]) => sky(b, me, out, { n: 1, reach: 8, mult: 6.5, ms: 1000, kind: 'meteor', gap: 0, echo: { gap: 600, share: 0.5 } });

/** Time Witch: every foe within eight tiles is stopped where it stands; her friends race on. */
function timeStop(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  if (!smite(b, me, out, { reach: 8, mult: 0, stun: 2600, arcs: true })) return false;
  bless(b, me, out, { haste: 5000 });
  return true;
}

/** The eight heroes whose ultimates are in `abilities.ts`: they are retuned here with the rest. */
const FIRST_EIGHT = ['kitsune', 'karasu', 'yamabushi', 'gorgon', 'samuraiCommander', 'sage', 'demonSwordsman', 'tyrant'];

/** Each hero's ultimate balance from level 30 up (COMBAT-002, docs/notes/hero-kits.md): `rate`, how fast its meter fills (times the fight's own fill,
 *  `ULT_FILL` in `heroKits.ts`: about 30 s of fighting for a front-liner, 40 for most, 50 for a support), and `power` (times the caster's attack while
 *  it casts; a stun, guard, shield or heal scales with it too), never below what it was before the hero kits (the owner's call: rarer and bigger).
 *  `test/hero-balance-ultimates.test.ts` holds every hero within the band of the roster average with them. */
const TUNE: Record<string, NonNullable<Skill['tuned']>> = {
  knight: { rate: 1.86, power: 0.78 },
  samurai: { rate: 0.84, power: 2.43 },
  kunoichi: { rate: 0.6, power: 0.76 },
  archer: { rate: 0.77, power: 1.15 },
  wizard: { rate: 0.7, power: 1.06 },
  peasant: { rate: 1.95, power: 0.77 },
  ninjaMonk: { rate: 0.96, power: 1.64 },
  wanderer: { rate: 0.58, power: 0.96 },
  lightningMage: { rate: 0.72, power: 0.57 },
  kitsune: { rate: 0.66, power: 0.71 },
  karasu: { rate: 0.54, power: 1.52 },
  yamabushi: { rate: 1.4, power: 2.53 },
  werewolf: { rate: 0.61, power: 1.72 },
  minotaur: { rate: 1.41, power: 2.32 },
  satyr: { rate: 0.67, power: 0.53 },
  gorgon: { rate: 1.06, power: 1.51 },
  samuraiCommander: { rate: 0.85, power: 1.4 },
  paladin: { rate: 1.53, power: 0.83 },
  cleric: { rate: 0.76, power: 1.12 },
  druid: { rate: 1.15, power: 0.4 },
  barbarian: { rate: 0.84, power: 0.72 },
  ranger: { rate: 0.8, power: 1.03 },
  warlock: { rate: 0.72, power: 0.91 },
  illusionist: { rate: 1.15, power: 0.47 },
  gunslinger: { rate: 0.73, power: 1.7 },
  shambler: { rate: 1.53, power: 0.43 },
  rifleBot: { rate: 0.76, power: 0.98 },
  mercenary: { rate: 0.59, power: 1.67 },
  mummy: { rate: 1.7, power: 0.49 },
  buccaneer: { rate: 0.76, power: 1.21 },
  wolfBard: { rate: 1.04, power: 0.49 },
  beastmaster: { rate: 0.93, power: 0.59 },
  kraken: { rate: 1.62, power: 0.88 },
  lancer: { rate: 0.67, power: 1.02 },
  reaper: { rate: 0.55, power: 0.91 },
  timeWitch: { rate: 0.97, power: 0.61 },
  arcBlade: { rate: 0.54, power: 0.81 },
  dreadPirate: { rate: 1.4, power: 1.24 },
  siegeBot: { rate: 1.18, power: 2.06 },
  priestess: { rate: 0.87, power: 0.43 },
  dragoon: { rate: 0.69, power: 1.34 },
  juggernaut: { rate: 1.87, power: 1.39 },
  sage: { rate: 0.95, power: 1.51 },
  demonSwordsman: { rate: 0.79, power: 2.45 },
  tyrant: { rate: 1.18, power: 1.82 },
};

/** Every hero's ultimate: the first eight's (as `first` gives them) and the rest's, which unlock at `ULT_LEVEL`; `abilities.ts` puts them in its kits. */
export function heroUltimates(first: (kind: string) => Skill | undefined): Record<string, Skill> {
  const ult = (name: string, text: string, castMs: number, anim: Skill['anim'], cast: Skill['cast']): Skill => ({ name, text, need: CHARGE_MAX, dealt: 0, taken: 0, perSec: 0, castMs, anim, unlock: ULT_LEVEL, cast });
  const inSight = (b: Battle, me: Unit, reach = 9) => foesOf(b, me).some((f) => apart(me, f) <= reach);
  const all: Record<string, Skill> = {
    // ---- the front line ----
    knight: ult('Last Bastion', 'Every foe within 5 tiles must go for him for 6s; he takes half damage and a quarter of his health forms a shield', 700, 'defend', (b, me, out) =>
      fortify(b, me, out, { reach: 5, taunt: 6000, guard: 6000, shield: 0.25 })),
    peasant: ult('Mass Muster', 'Every ally closes ranks and takes half damage for 6s, and a sixth of their health comes back', 700, 'attack2', (b, me, out) => {
      if (!inSight(b, me)) return false;
      bless(b, me, out, { guard: 6000, healShare: 1 / 6 });
      return true;
    }),
    paladin: ult('Divine Aegis', 'Foes within 4 tiles are struck and must go for him for 5s; the allies near him are healed and shielded', 800, 'attack2', (b, me, out) =>
      fortify(b, me, out, { reach: 4, taunt: 5000, guard: 5000, allies: 3, heal: 7, smite: 1.2 })),
    juggernaut: ult('Cataclysm', 'The ground splits: every foe within 6 tiles is hurt hard and held still for 2s', 900, 'attack', (b, me, out) =>
      smite(b, me, out, { reach: 6, mult: 2.2, stun: 2000 })),
    minotaur: ult('Stampede', 'Up to three charges in a row, each at the weakest foe in line, shoving and stunning', 600, 'attack2', stampede),
    kraken: ult('Maelstrom', 'A whirlpool drags every foe within 6 tiles toward him, hurts and slows it', 800, 'attack2', (b, me, out) =>
      smite(b, me, out, { reach: 6, mult: 1.8, slow: 4000, stun: 800, pull: true })),
    mummy: ult('Curse of the Pharaoh', 'Every foe within 5 tiles is cursed and slowed for 6s, the Mummy is shielded, and the two strongest foes are his puppets for 2s', 800, 'attack2', (b, me, out) => {
      if (!smite(b, me, out, { reach: 5, mult: 0.8, slow: 6000, curse: { ms: 6000, dot: 0.5 }, shield: 0.3 })) return false;
      const foes = foesOf(b, me);
      if (foes.length > 2)
        for (const f of foes.filter((x) => apart(me, x) <= 5).sort(strongest).slice(0, 2)) {
          f.charmUntil = b.t + dur(me, 2000);
          f.taunt = undefined;
          out.push({ kind: 'arc', from: me.id, to: f.id });
        }
      return true;
    }),
    shambler: ult('Plague Tide', 'A wave of rot leaves every foe within 5 tiles cursed for 7s; he drinks from them', 800, 'attack2', (b, me, out) =>
      smite(b, me, out, { reach: 5, mult: 0.7, curse: { ms: 7000, dot: 0.6 }, drink: { each: 0.05, cap: 0.3 } })),
    // ---- the blades ----
    samurai: ult('Heaven-Splitting Cut', 'Dashes up to 7 tiles in a line, cutting every foe on it with a huge blow', 500, 'attack2', (b, me, out) => iaido(b, me, out, 7, 3.0)),
    kunoichi: ult('Shadow Dance', 'Slips behind the four weakest foes in turn and backstabs each', 600, 'attack2', (b, me, out) => blinks(b, me, out, 4, 1.4, (x, y) => x.hp - y.hp || x.id - y.id)),
    mercenary: ult('Contract Killer', 'Slips beside the three hardest-hitting foes in turn and cuts each hard', 600, 'attack2', (b, me, out) => blinks(b, me, out, 3, 2.1, strongest)),
    ninjaMonk: ult('Hundred Fists', 'Five blows on each of the three nearest foes, and each is stunned for 1.2s', 700, 'attack2', (b, me, out) => fists(b, me, out, 3, 5, 0.65, 1200)),
    barbarian: ult('Bloodlust', 'A whirl of blows round him; he drinks a third of what they deal and runs fast for 5s', 700, 'attack2', bloodlust),
    werewolf: ult('Full Moon', 'His frenzy fills to the brim and he is both his forms at once for 7s, and a quarter of his health comes back', 700, 'attack2', fullMoon),
    lancer: ult('Charge of the Knights', 'A long charge for a huge blow, and the riders near him gallop faster for 4s', 700, 'attack2', knightsCharge),
    reaper: ult('Harvest of Souls', 'Every foe within 5 tiles is cut; those under a third of their health are reaped for far more, each kill feeds him and rises as a wraith for 5s', 800, 'attack2', harvest),
    dragoon: ult('Inferno Breath', 'Fire down the longest line of foes, up to 8 tiles, burning each for 5s', 800, 'attack2', infernoBreath),
    arcBlade: ult('Thunder Cascade', 'Lightning leaps to every foe within 6 tiles, hurting and stunning each for 1.4s', 700, 'attack2', (b, me, out) =>
      smite(b, me, out, { reach: 6, mult: 1.9, stun: 1400, arcs: true })),
    buccaneer: ult('Keelhaul', 'Hooks the three nearest shooters (or foes) in beside him; each cut is a roll of the die (x1 to x3), and each is held 1.5s', 700, 'attack2', keelhaul),
    // ---- the guile ----
    illusionist: ult('Hall of Mirrors', 'Four decoys appear round her and every foe within 6 tiles turns on them for 4.5s', 800, 'attack2', hallOfMirrors),
    warlock: ult('Soul Harvest', 'Every foe within 7 tiles is cursed and burns for 6s; he drinks from each', 800, 'attack2', (b, me, out) =>
      smite(b, me, out, { reach: 7, mult: 1.0, curse: { ms: 6000, dot: 0.45 }, drink: { each: 0.06, cap: 0.36 } })),
    // ---- the shooters ----
    archer: ult('Arrow Storm', 'Five volleys fall on separate crowds across the field', 700, 'attack2', (b, me, out) =>
      sky(b, me, out, { n: 5, reach: 9, mult: 1.6, ms: 600, kind: 'rain', gap: 140, repeat: true })),
    wizard: ult('Armageddon', 'Three meteors fall on separate crowds, each leaving the ground burning', 900, 'attack', (b, me, out) =>
      sky(b, me, out, { n: 3, reach: 8, mult: 2.6, ms: 1000, kind: 'meteor', gap: 220, repeat: true })),
    lightningMage: ult('Thunderstorm', 'Bolts strike the six toughest foes within 8 tiles, each stunned for 0.8s', 800, 'attack', (b, me, out) =>
      smite(b, me, out, { reach: 8, mult: 2.4, top: 6, order: (x, y) => y.hp - x.hp || x.id - y.id, stun: 800, arcs: true, sight: false })),
    ranger: ult("Hunter's Net", 'A net of vines hurts every foe in sight within 8 tiles and holds it for 2.2s; each takes a third more from every blow for 6s', 800, 'attack2', (b, me, out) =>
      smite(b, me, out, { reach: 8, sight: true, mult: 1.0, stun: 2200, brittle: 6000 })),
    gunslinger: ult('High Noon', 'Six shots at the hardest-hitting foes in reach', 700, 'attack2', (b, me, out) =>
      shots(b, me, out, { n: 6, mult: 2.6, order: strongest, shot: 'bullet' })),
    rifleBot: ult('Overclock', 'Hits half as hard again and shoots faster for 7s, and fires four shots at the weakest foe', 700, 'attack2', (b, me, out) => {
      if (!shots(b, me, out, { n: 4, mult: 0.9, order: (x, y) => x.hp - y.hp || x.id - y.id, shot: 'bullet', one: true })) return false;
      if (me.form === undefined) me.power = (me.power ?? 1) * FORM_MULT;
      me.form = { until: b.t + dur(me, 7000) };
      me.hasteUntil = Math.max(me.hasteUntil ?? 0, b.t + dur(me, 7000));
      out.push({ kind: 'haste', to: me.id, ms: dur(me, 7000) });
      return true;
    }),
    siegeBot: ult('Orbital Strike', 'A great shell on the thickest crowd, and a second on the same spot a moment after', 900, 'attack', orbital),
    dreadPirate: ult('Ghost Fleet', 'Three broadsides from the ghost fleet fall on separate crowds and set off the powder barrels there', 800, 'attack2', (b, me, out) =>
      sky(b, me, out, { n: 3, reach: 8, mult: 2.4, ms: 800, kind: 'rain', gap: 200, repeat: true, barrels: true })),
    timeWitch: ult('Time Stop', 'Every foe within 8 tiles is stopped where it stands for 2.6s, while her friends are hastened for 5s', 900, 'attack2', timeStop),
    // ---- the healers and callers ----
    cleric: ult('Divine Intervention', 'Every ally is cleansed, healed, shielded and mended over 5s', 900, 'attack2', (b, me, out) => {
      if (!wounded(b, me)) return false;
      bless(b, me, out, { heal: 9, cleanse: true, shield: 0.12, hot: { amount: 1.5, ms: 5000 } });
      return true;
    }),
    wanderer: ult('Dawn Light', 'A dawn heals every ally, shields them for 3s and hastens them for 4s', 800, 'attack2', (b, me, out) => {
      if (!wounded(b, me)) return false;
      bless(b, me, out, { heal: 9, guard: 3000, haste: 4000 });
      return true;
    }),
    priestess: ult('Resurrection', 'Up to two fallen heroes rise with half their health, and every ally is healed and cleansed', 1000, 'attack2', resurrection),
    wolfBard: ult('Battle Hymn', 'Allies are hastened and rallied (attack up a quarter) for 6s; every foe within 7 tiles is slowed', 800, 'attack2', (b, me, out) => {
      if (!inSight(b, me)) return false;
      smite(b, me, out, { reach: 7, mult: 0, slow: 5000 });
      bless(b, me, out, { haste: 6000, banner: 6000, song: 6000 });
      return true;
    }),
    satyr: ult('Bacchanal', 'Allies are hastened for 6s, mended over time and their skills surge', 800, 'attack2', (b, me, out) => {
      if (!inSight(b, me)) return false;
      bless(b, me, out, { haste: 6000, hot: { amount: 1.0, ms: 6000 }, charge: 30, song: 6000 });
      return true;
    }),
    beastmaster: ult('Hunt of the Pack', 'Four wolves answer his call at once', 800, 'attack2', (b, me) => summon(b, me, 'wolf', 4)),
    druid: ult('Heart of the Grove', 'Two treants rise at her side and every ally is healed', 900, 'attack2', (b, me, out) => {
      if (!summon(b, me, 'treant', 2)) return false;
      bless(b, me, out, { heal: 4 });
      return true;
    }),
  };
  // the first eight heroes' ultimates are copied and gated at `ULT_LEVEL` like the rest (a foe's own copy of one, such as the Gorgon Queen's, stays as it was) and all forty-five take their balance
  for (const kind of FIRST_EIGHT) all[kind] = { ...first(kind)!, unlock: ULT_LEVEL };
  for (const [kind, t] of Object.entries(TUNE)) all[kind].tuned = t;
  return all;
}
