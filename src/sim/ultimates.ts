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
import { TIMER } from './carry';
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
import { charmFor, cleanse, harmed, setDot, stunFor } from './ailments';
import { fallenFor, raiseFallen } from './kits/revive';
import { startPool } from './heroKits';
import { chokeLine, raiseAura, raiseWall } from './toolkit';
import { chargeNearest, fissureSpires, knightsAura, thunderclap } from './kits/tanks';
import { ORBITAL_THROWS, SWARM_THROWS, jets, reaperDrag, type Throws } from './kits/ranged';
import { CALL, CIRCLE, callLightning, circleOfDeath } from './kits/mages';
import { berserkerLeap, burningLine, cavalryCharge, hellChains, lastBlowLaunch, lightningStorm } from './kits/melee';

/** A duration in ms, as the caster's `dur` talent lengthens it, and the ultimate's strength: a stronger ultimate holds, guards and hastens a little longer (by the square root of its strength). */
const dur = (me: Unit, ms: number): number => durOf(me, Math.round(ms * Math.sqrt(castPower())));
/** A share of a max hp (a shield, a heal, a drink), times the ultimate's strength. */
const share = (x: number): number => x * castPower();
const alliesOf = (b: Battle, me: Unit): Unit[] => b.units.filter((a) => a.alive && a.side === me.side);
const byId = (x: Unit, y: Unit) => x.id - y.id;
const strongest = (x: Unit, y: Unit) => atkOf(y) - atkOf(x) || x.id - y.id;
const stun = (b: Battle, f: Unit, ms: number) => {
  stunFor(b, f, ms);
};
/** Whether some ally is hurt (or burning, bleeding or cursed): what a healing ultimate waits for. */
const wounded = (b: Battle, me: Unit, share = 0.8): boolean => alliesOf(b, me).some((a) => harmed(a) || a.hp < a.maxHp * share);
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
  /** What the first salvo throws when it lands (RPG-SPELLS batch 5: the Orbital Strike); with `throwsAll`, every salvo (batch 6: the
   *  Meteor Swarm). */
  throws?: Throws;
  throwsAll?: boolean;
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
    b.pending.push({ at: b.t + ms, kind: o.kind, by: me.id, to: aim.id, dmg: atkOf(me) * o.mult, heavy: o.kind === 'meteor', u: aim.u, v: aim.v, ...(o.barrels ? { barrels: true } : {}), ...(o.throws && (i === 0 || o.throwsAll) ? { throws: o.throws } : {}) });
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
      setDot(b, f, { kind: 'curse', dmg: Math.max(1, Math.round(atkOf(me) * o.curse.dot)), every: HEX_EVERY, ms, by: me.id, next: b.t + HEX_EVERY, until: b.t + ms });
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
    if (o.cleanse) cleanse(b, a);
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
  // (each lasts 30s of fighting time and carries into the next wave: SUMMON-TIMERS, `carry.ts`)
  for (let i = 0; i < total; i++) called = callSummon(b, me, kind, total - 1, TIMER.ultBeast) || called;
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
function fists(b: Battle, me: Unit, out: BattleEvent[], foesN: number, blows: number, mult: number, holdMs: number, throwLast = false): boolean {
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
    if (throwLast) lastBlowLaunch(b, me, f, out);
  }
  return true;
}


/** Werewolf: the moon rises; his frenzy is full to the brim for a while, and a quarter of his health comes back. */
function fullMoon(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const f = kitOf(me)?.passive.frenzy;
  if (!f || !foesOf(b, me).some((x) => apart(me, x) <= 7)) return false;
  // (SUMMON-TIMERS: a hero's moon is up 15s of fighting time, where it was 7s, and carries into the next wave)
  const time = dur(me, me.side === 'hero' ? TIMER.moon : 7000);
  me.frenzy = { n: f.max + 2 + tal(me, 'frenzyMax'), until: b.t + time };
  mendUnit(me, me.maxHp * share(0.25), out);
  // (both his forms at once while the moon is up: the Hunter's speed and bleed, the Brute's hide and splash)
  (me.kx ??= {}).moon = b.t + time;
  if (me.side === 'hero') me.kx.moonMs = time;
  setLook(me, 'werewolf_black', out);
  out.push({ kind: 'frenzy', by: me.id, n: me.frenzy.n });
  return true;
}

/** Lancer: a charge down a long line at the weakest foe in it, and the whole line of riders gallops after. */
/** Lancer, Cavalry Charge (RPG-SPELLS batch 4; it was Charge of the Knights, one charge at one foe): a ride through the line, each foe struck
 *  and thrown aside, and the riders near him gallop faster. */
function cavalry(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  if (!cavalryCharge(b, me, out, 2.4)) return false;
  me.hasteUntil = Math.max(me.hasteUntil ?? 0, b.t + dur(me, 4000));
  out.push({ kind: 'haste', to: me.id, ms: dur(me, 4000) });
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
    if (f.alive) setDot(b, f, { kind: 'burn', dmg: Math.max(1, Math.round(atkOf(me) * 0.15)), every: 500, ms, by: me.id, next: b.t + 500, until: b.t + ms });
  }
  // (RPG-SPELLS batch 4: the line she breathed down stays alight for 4s, a fire wall)
  const far = best.reduce((a, f) => (apart(me, f) > apart(me, a) ? f : a), best[0]);
  burningLine(b, me, far, dur(me, 4000), out);
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
  // (none rise in the Last Stand: there the fallen stay down; a hero raised once this wave, by a revive or before, stays down too: `fallenFor`)
  const fallen = fallenFor(b, me).sort((x, y) => (x.diedAt ?? 0) - (y.diedAt ?? 0) || x.id - y.id);
  if (!fallen.length && !wounded(b, me)) return false;
  for (const x of fallen.slice(0, MASS_RISE)) raiseFallen(b, me, x, MASS_SHARE, out, startPool);
  bless(b, me, out, { heal: 5, cleanse: true });
  // (a Wall of Light rises between the foes and her friends: her side walks through it, the foes cannot, and their shots stop at it)
  const line = chokeLine(b, me, LIGHT_WALL);
  if (line) raiseWall(b, me, line, 'light', dur(me, LIGHT_MS), out);
  return true;
}

/** Mass Resurrection (RPG-SPELLS batch 2): how many rise, at what share of their health, and the Wall of Light's length and time. */
const MASS_RISE = 3;
const MASS_SHARE = 0.4;
const LIGHT_WALL = 3;
const LIGHT_MS = 5000;
/** The Druid's Wall of Thorns: its length and time. */
const THORN_WALL = 4;
const THORN_MS = 8000;

/** The Cleric's Spirit Guardians (RPG-SPELLS batch 2): an aura round her for 10s (reach 3): foes in it are hurt (a share of her attack, times
 *  the ultimate's strength) and slowed each second; friends in it heal a share of their health each second; the friends in it as it rises are
 *  cleansed. Cast when a foe is within 3 of her or a friend is hurt. (The design's 8s, reach 2 and 2% a second were tuned up so the Last Stand,
 *  where Divine Intervention's team-wide heal carried a long run, stays within a wave of where it was.) */
const GUARDIAN_MS = 10000;
const GUARDIAN_REACH = 3;
const GUARDIAN_DMG = 0.35;
const GUARDIAN_HEAL = 0.08;
const GUARDIAN_SLOW = 1200;
function spiritGuardians(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  if (!foesOf(b, me).some((f) => apart(me, f) <= 3) && !wounded(b, me)) return false;
  const reach = reachOf(me, GUARDIAN_REACH);
  for (const a of alliesOf(b, me)) if (apart(me, a) <= reach) cleanse(b, a);
  raiseAura(b, me, { what: 'Spirit Guardians', reach, ms: dur(me, GUARDIAN_MS), every: 1000, ally: { heal: share(GUARDIAN_HEAL) }, foe: { dmg: GUARDIAN_DMG * castPower(), slow: GUARDIAN_SLOW } }, out);
  return true;
}

/** Siege Bot: a great shell on the thickest crowd, and a second on the same spot a moment after. */
const orbital = (b: Battle, me: Unit, out: BattleEvent[]) => sky(b, me, out, { n: 1, reach: 8, mult: 6.5, ms: 1000, kind: 'meteor', gap: 0, echo: { gap: 600, share: 0.5 }, throws: ORBITAL_THROWS });

/** Time Witch: every foe within eight tiles is stopped where it stands; her friends race on. */
function timeStop(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  if (!smite(b, me, out, { reach: 8, mult: 0, stun: 2600, arcs: true })) return false;
  bless(b, me, out, { haste: 5000 });
  return true;
}

/** The eight heroes whose ultimates are in `abilities.ts`: they are retuned here with the rest. */
const FIRST_EIGHT = ['kitsune', 'karasu', 'yamabushi', 'gorgon', 'samuraiCommander', 'sage', 'demonSwordsman', 'tyrant'];

/** Each hero's ultimate balance from level 30 up (COMBAT-002, docs/notes/hero-kits.md): `rate`, how fast its meter fills (times the fight's own fill,
 *  `ULT_FILL` in `heroKits.ts`), and `power` (times the caster's attack while it casts; a stun, guard, shield or heal scales with it too). Retuned for
 *  ULT-CHARGE (docs/notes/ult-charge.md), when the meter came to fill once or twice a fight: no power below what it was (the owner: "make it still
 *  hit hard"), and the roster held level by the meters, so the ultimates whose worth is what they do rather than what they deal come round less often
 *  and a few heroes whose kits fall behind against the stronger foes a level-30 team now meets (the Samurai, Ninja Monk, Buccaneer, Demon Swordsman)
 *  fire theirs more than twice in a long fight. `test/hero-balance-ultimates.test.ts` holds every hero within the band of the roster average with them. */
const TUNE: Record<string, NonNullable<Skill['tuned']>> = {
  knight: { rate: 1.46, power: 0.82 },
  samurai: { rate: 2.33, power: 3.141 },
  kunoichi: { rate: 1.65, power: 3.13 },
  archer: { rate: 0.65, power: 1.192 },
  wizard: { rate: 0.51, power: 1.73 }, // (RPG-SPELLS batch 6: 1.44 before; it carries the Wall of Fire's lighter skill 2 at level 30)
  peasant: { rate: 1.11, power: 0.805 },
  ninjaMonk: { rate: 2.41, power: 3.381 },
  wanderer: { rate: 0.37, power: 1.203 },
  lightningMage: { rate: 0.92, power: 1.363 },
  kitsune: { rate: 0.8, power: 2.953 }, // (RPG-SPELLS batch 7: Mass Polymorph; 0.6 and 0.71 were the Nine-Tailed Dream's charm, far stronger a hold)
  karasu: { rate: 0.77, power: 5.634 }, // (RPG-SPELLS batch 7: the Cloud of Daggers cuts a second at a time; 3.07 was Feather Storm's one blow)
  yamabushi: { rate: 1.85, power: 3.294 },
  werewolf: { rate: 0.73, power: 2.208 }, // (RPG-SPELLS batch 7: 3.05 before; the howl's fear made Full Moon +6.6 at level 30)
  minotaur: { rate: 1.51, power: 2.983 },
  satyr: { rate: 0.69, power: 0.879 },
  gorgon: { rate: 1.29, power: 2.347 },
  samuraiCommander: { rate: 0.95, power: 1.391 }, // (the skills overhaul's batch 4: rate 1.1 before; with Command Strike he stood +6.2 at level 30, and Rally Cry's banner does not scale with power)
  paladin: { rate: 1.31, power: 0.886 },
  cleric: { rate: 1, power: 0.92 }, // (RPG-SPELLS batch 2: Spirit Guardians, an aura round her, in place of Divine Intervention's team-wide heal: 0.58 and 1.12 before)
  druid: { rate: 1.19, power: 0.38 },
  barbarian: { rate: 0.9, power: 2.158 },
  ranger: { rate: 0.84, power: 1.162 },
  warlock: { rate: 0.5, power: 1.0 }, // (RPG-SPELLS batch 6: 1.07 before; the Circle of Death's ring made it +6.3 at level 30)
  illusionist: { rate: 1.08, power: 0.535 },
  gunslinger: { rate: 0.37, power: 1.78 },
  shambler: { rate: 1.04, power: 0.709 }, // (RPG-SPELLS batch 7: 0.9 before; the burrow and its launch) // (0.99 until STATUS-FX: Plague Tide's curse now also turns the foes' healing to harm)
  rifleBot: { rate: 1.01, power: 1.972 },
  mercenary: { rate: 1.21, power: 2.811 },
  mummy: { rate: 0.99, power: 0.465 },
  buccaneer: { rate: 3.11, power: 3.373 },
  wolfBard: { rate: 0.93, power: 0.525 },
  beastmaster: { rate: 0.7, power: 0.65 },
  kraken: { rate: 1.37, power: 1.079 },
  lancer: { rate: 2.3, power: 3.29 }, // (RPG-SPELLS batch 4: Cavalry Charge through a line; 1.61 for one charge at one foe)
  reaper: { rate: 1.79, power: 2.511 }, // (RPG-SPELLS batch 5: power 2.6, was 3.07; the drag made the sweep +4.8 at level 30)
  timeWitch: { rate: 1.09, power: 0.85 },
  arcBlade: { rate: 0.59, power: 1.878 }, // (RPG-SPELLS batch 4: Lightning Storm, a teleport slash with its stuns; 2.42 for Thunder Cascade)
  dreadPirate: { rate: 1.06, power: 1.376 },
  siegeBot: { rate: 0.5, power: 2.347 },
  priestess: { rate: 0.38, power: 0.403 },
  dragoon: { rate: 1.1, power: 2.85 },
  juggernaut: { rate: 1.55, power: 1.57 },
  sage: { rate: 1.7, power: 1.743 },
  demonSwordsman: { rate: 1.8, power: 2.766 }, // (RPG-SPELLS batch 4: Metamorphosis drags three foes in first; 2.06 before)
  tyrant: { rate: 0.88, power: 1.601 },
};

/** Every hero's ultimate: the first eight's (as `first` gives them) and the rest's, which unlock at `ULT_LEVEL`; `abilities.ts` puts them in its kits. */
export function heroUltimates(first: (kind: string) => Skill | undefined): Record<string, Skill> {
  const ult = (name: string, text: string, castMs: number, anim: Skill['anim'], cast: Skill['cast'], key?: string): Skill => ({ name, ...(key ? { key } : {}), text, need: CHARGE_MAX, dealt: 0, taken: 0, perSec: 0, castMs, anim, unlock: ULT_LEVEL, cast });
  const inSight = (b: Battle, me: Unit, reach = 9) => foesOf(b, me).some((f) => apart(me, f) <= reach);
  const all: Record<string, Skill> = {
    // ---- the front line ----
    // (RPG-SPELLS batch 3: the tanks' and supports' ultimates, renamed, with what the toolkit adds: the Knight's aura, the Peasant's charge,
    // the Fissure's spires, the Bard's thunderclap; the Commander's charge is below, with the first eight)
    knight: ult('Indomitable', 'Every foe within 5 tiles must go for him for 6s; he takes half damage, a quarter of his health forms a shield, and the allies within 2 of him take a fifth less for 6s', 700, 'defend', (b, me, out) => {
      if (!fortify(b, me, out, { reach: 5, taunt: 6000, guard: 6000, shield: 0.25 })) return false;
      knightsAura(b, me, dur(me, 6000), out);
      return true;
    }, 'Last Bastion'),
    peasant: ult('Call to Arms', 'Every ally closes ranks and takes half damage for 6s, a sixth of their health comes back, and he leads a charge of up to 3 tiles at the nearest foe', 700, 'attack2', (b, me, out) => {
      if (!inSight(b, me)) return false;
      bless(b, me, out, { guard: 6000, healShare: 1 / 6 });
      chargeNearest(b, me, 3, 1.5, out);
      return true;
    }, 'Mass Muster'),
    paladin: ult('Holy Nova', 'Foes within 4 tiles are struck and must go for him for 5s; the allies near him are healed and shielded', 800, 'attack2', (b, me, out) =>
      fortify(b, me, out, { reach: 4, taunt: 5000, guard: 5000, allies: 3, heal: 7, smite: 1.2 }), 'Divine Aegis'),
    juggernaut: ult('Fissure', 'The ground splits: every foe within 6 tiles is hurt hard and held still for 2s, and rock spires rise where the rift is widest for 6s', 900, 'attack', (b, me, out) => {
      if (!smite(b, me, out, { reach: 6, mult: 2.2, stun: 2000 })) return false;
      fissureSpires(b, me, dur(me, 6000), out);
      return true;
    }, 'Cataclysm'),
    minotaur: ult('Stampede', 'Up to three charges in a row, each at the weakest foe in line, shoving and stunning', 600, 'attack2', stampede),
    kraken: ult('Maelstrom', 'A whirlpool drags every foe within 6 tiles toward him, hurts and slows it', 800, 'attack2', (b, me, out) =>
      smite(b, me, out, { reach: 6, mult: 1.8, slow: 4000, stun: 800, pull: true })),
    mummy: ult('Curse of the Pharaoh', 'Every foe within 5 tiles is cursed and slowed for 6s, the Mummy is shielded, and the two strongest foes are his puppets for 2s', 800, 'attack2', (b, me, out) => {
      if (!smite(b, me, out, { reach: 5, mult: 0.8, slow: 6000, curse: { ms: 6000, dot: 0.5 }, shield: 0.3 })) return false;
      const foes = foesOf(b, me);
      if (foes.length > 2)
        for (const f of foes.filter((x) => apart(me, x) <= 5).sort(strongest).slice(0, 2)) {
          charmFor(b, f, dur(me, 2000));
          f.taunt = undefined;
          out.push({ kind: 'arc', from: me.id, to: f.id });
        }
      return true;
    }),
    shambler: ult('Plague Tide', 'A wave of rot leaves every foe within 5 tiles cursed for 7s; he drinks from them', 800, 'attack2', (b, me, out) =>
      smite(b, me, out, { reach: 5, mult: 0.7, curse: { ms: 7000, dot: 0.6 }, drink: { each: 0.05, cap: 0.3 } })),
    // ---- the blades ----
    // (RPG-SPELLS batch 4: the melee heroes' ultimates, renamed, with what the toolkit adds; the Demon Swordsman's is below, with the first eight)
    samurai: ult('Issen', '"The one cut": dashes up to 7 tiles in a line, cutting every foe on it with a huge blow', 500, 'attack2', (b, me, out) => iaido(b, me, out, 7, 3.0), 'Heaven-Splitting Cut'),
    kunoichi: ult('Assassinate', 'A teleport slash: she slips behind the four weakest foes in turn and backstabs each', 600, 'attack2', (b, me, out) => blinks(b, me, out, 4, 1.4, (x, y) => x.hp - y.hp || x.id - y.id), 'Shadow Dance'),
    mercenary: ult('Killing Spree', 'Slips beside the three hardest-hitting foes in turn and cuts each hard', 600, 'attack2', (b, me, out) => blinks(b, me, out, 3, 2.1, strongest), 'Contract Killer'),
    ninjaMonk: ult('Hundred-Hand Strike', 'Five blows on each of the three nearest foes, each stunned for 1.2s; the last blow throws each 2 tiles', 700, 'attack2', (b, me, out) => fists(b, me, out, 3, 5, 0.65, 1200, true), 'Hundred Fists'),
    barbarian: ult('Berserker Leap', 'He leaps up to 4 tiles onto the thickest crowd: the 3x3 round him is struck and shoved a tile out; he drinks a third of what it deals and runs fast for 5s', 700, 'attack2', (b, me, out) => berserkerLeap(b, me, out, 3.0, dur(me, 5000), (n) => mendUnit(me, n, out)), 'Bloodlust'),
    werewolf: ult('Full Moon', 'His frenzy fills to the brim and he is both his forms at once for 15s (it carries into the next wave), and a quarter of his health comes back', 700, 'attack2', fullMoon),
    lancer: ult('Cavalry Charge', 'He rides up to 7 tiles in a line through every foe on it, each struck and thrown a tile aside, and the riders near him gallop faster for 4s', 700, 'attack2', cavalry, 'Charge of the Knights'),
    reaper: ult('Harvest of Souls', 'The scythe\'s sweep drags every foe within 5 tiles a tile towards him, then cuts them all; those under a third of their health are reaped for far more, each kill feeds him and rises as a wraith for 12s', 800, 'attack2', (b, me, out) => {
      // (RPG-SPELLS batch 5: the sweep drags them in first)
      if (!foesOf(b, me).some((f) => apart(me, f) <= reachOf(me, 5))) return false;
      reaperDrag(b, me, reachOf(me, 5), out);
      return harvest(b, me, out);
    }),
    dragoon: ult('Inferno Breath', 'Fire down the longest line of foes, up to 8 tiles, burning each for 5s; the line stays alight for 4s', 800, 'attack2', infernoBreath),
    arcBlade: ult('Lightning Storm', 'He becomes lightning: a teleport slash through up to six foes within 6 tiles, each shocked and stunned for 1.4s, then back where he started', 700, 'attack2', (b, me, out) =>
      lightningStorm(b, me, out, 1.9, dur(me, 1400)), 'Thunder Cascade'),
    buccaneer: ult('Keelhaul', 'Hooks the three nearest shooters (or foes) in beside him; each cut is a roll of the die (x1 to x3), and each is held 1.5s', 700, 'attack2', keelhaul),
    // ---- the guile ----
    illusionist: ult('Hall of Mirrors', 'Four decoys appear round her and every foe within 6 tiles turns on them for 4.5s', 800, 'attack2', hallOfMirrors),
    // (RPG-SPELLS batch 6: a ring of death holds round him as well)
    warlock: ult('Circle of Death', 'Every foe within 7 tiles is cursed and burns for 6s, and he drinks from each; a ring of death holds round him for 6s: a foe within 2 takes 0.3 of his attack a second, and he drinks a third of it', 800, 'attack2', (b, me, out) => {
      if (!smite(b, me, out, { reach: 7, mult: 1.0, curse: { ms: 6000, dot: 0.45 }, drink: { each: 0.06, cap: 0.36 } })) return false;
      circleOfDeath(b, me, out, dur(me, CIRCLE.MS));
      return true;
    }, 'Soul Harvest'),
    // ---- the shooters ----
    archer: ult('Hail of Arrows', 'Five volleys fall on separate crowds across the field', 700, 'attack2', (b, me, out) =>
      sky(b, me, out, { n: 5, reach: 9, mult: 1.6, ms: 600, kind: 'rain', gap: 140, repeat: true }), 'Arrow Storm'),
    wizard: ult('Meteor Swarm', 'Three meteors fall on separate crowds, each leaving the ground burning; the foe at the heart of each is thrown a tile', 900, 'attack', (b, me, out) =>
      sky(b, me, out, { n: 3, reach: 8, mult: 2.6, ms: 1000, kind: 'meteor', gap: 220, repeat: true, throws: SWARM_THROWS, throwsAll: true }), 'Armageddon'),
    // (RPG-SPELLS batch 6: a storm cloud that strikes once a second, where six bolts fell at once)
    lightningMage: ult('Call Lightning', 'A storm cloud gathers over her for 6s: each second a bolt strikes the toughest foe within 6 tiles, stunned for 0.8s and Charged', 800, 'attack', (b, me, out) =>
      callLightning(b, me, out, dur(me, CALL.MS)), 'Thunderstorm'),
    ranger: ult('Entangle', 'A net of vines hurts every foe in sight within 8 tiles and holds it for 2.2s; each takes a third more from every blow for 6s', 800, 'attack2', (b, me, out) =>
      smite(b, me, out, { reach: 8, sight: true, mult: 1.0, stun: 2200, brittle: 6000 }), "Hunter's Net"),
    gunslinger: ult('High Noon', 'Six shots at the hardest-hitting foes in reach', 700, 'attack2', (b, me, out) =>
      shots(b, me, out, { n: 6, mult: 2.6, order: strongest, shot: 'bullet' })),
    rifleBot: ult('Overclock', 'It jets to the highest ground in reach, then hits half as hard again and shoots faster for 7s, and fires four shots at the weakest foe', 700, 'attack2', (b, me, out) => {
      // (RPG-SPELLS batch 5: it jets to the heights, or clear of a foe beside it, first)
      if (!foesOf(b, me).length) return false;
      jets(b, me, out);
      if (!shots(b, me, out, { n: 4, mult: 0.9, order: (x, y) => x.hp - y.hp || x.id - y.id, shot: 'bullet', one: true })) return false;
      if (me.form === undefined) me.power = (me.power ?? 1) * FORM_MULT;
      me.form = { until: b.t + dur(me, 7000) };
      me.hasteUntil = Math.max(me.hasteUntil ?? 0, b.t + dur(me, 7000));
      out.push({ kind: 'haste', to: me.id, ms: dur(me, 7000) });
      return true;
    }),
    siegeBot: ult('Orbital Strike', 'A great shell on the thickest crowd, throwing every foe in the 3x3 2 tiles outward, and a second on the same spot a moment after', 900, 'attack', orbital),
    dreadPirate: ult('Ghost Fleet', 'Three broadsides from the ghost fleet fall on separate crowds and set off the powder barrels there', 800, 'attack2', (b, me, out) =>
      sky(b, me, out, { n: 3, reach: 8, mult: 2.4, ms: 800, kind: 'rain', gap: 200, repeat: true, barrels: true })),
    timeWitch: ult('Time Stop', 'Every foe within 8 tiles is stopped where it stands for 2.6s, while her friends are hastened for 5s', 900, 'attack2', timeStop),
    // ---- the healers and callers ----
    // (RPG-SPELLS batch 2: Divine Intervention became Spirit Guardians, an aura round her)
    cleric: ult('Spirit Guardians', 'Spirits circle her for 10s: foes within 3 are hurt each second and slowed; friends within 3 heal each second, and are cleansed as the spirits come', 900, 'attack2', spiritGuardians, 'Divine Intervention'),
    wanderer: ult('Panacea', 'A cure for every ill: every ally is healed, shielded for 3s and hastened for 4s', 800, 'attack2', (b, me, out) => {
      if (!wounded(b, me)) return false;
      bless(b, me, out, { heal: 9, guard: 3000, haste: 4000 });
      return true;
    }, 'Dawn Light'),
    priestess: ult('Mass Resurrection', 'Up to three fallen heroes rise with 40% of their health (each once a wave), every ally is healed and cleansed, and a Wall of Light rises between the foes and her friends for 5s', 1000, 'attack2', resurrection, 'Resurrection'),
    wolfBard: ult('Battle Hymn', 'The opening chord shoves the foes within 2 tiles 2 tiles back; then allies are hastened and rallied (attack up a quarter) for 6s, and every foe within 7 tiles is slowed', 800, 'attack2', (b, me, out) => {
      if (!inSight(b, me)) return false;
      thunderclap(b, me, out);
      smite(b, me, out, { reach: 7, mult: 0, slow: 5000 });
      bless(b, me, out, { haste: 6000, banner: 6000, song: 6000 });
      return true;
    }),
    satyr: ult('Bacchanal', 'Allies are hastened for 6s, mended over time and their skills surge', 800, 'attack2', (b, me, out) => {
      if (!inSight(b, me)) return false;
      bless(b, me, out, { haste: 6000, hot: { amount: 1.0, ms: 6000 }, charge: 30, song: 6000 });
      return true;
    }),
    beastmaster: ult('Conjure Animals', 'Four wolves answer his call at once, for 30s of fighting, wave to wave', 800, 'attack2', (b, me) => summon(b, me, 'wolf', 4), 'Hunt of the Pack'),
    druid: ult('Wall of Thorns', 'A hedge of thorns rises across the foes\' way for 8s, two treants rise at her side for 30s, and every ally is healed', 900, 'attack2', (b, me, out) => {
      if (!summon(b, me, 'treant', 2)) return false;
      bless(b, me, out, { heal: 4 });
      const line = chokeLine(b, me, THORN_WALL);
      if (line) raiseWall(b, me, line, 'thorns', dur(me, THORN_MS), out);
      return true;
    }, 'Heart of the Grove'),
  };
  // the first eight heroes' ultimates are copied and gated at `ULT_LEVEL` like the rest (a foe's own copy of one, such as the Gorgon Queen's, stays as it was) and all forty-five take their balance
  for (const kind of FIRST_EIGHT) all[kind] = { ...first(kind)!, unlock: ULT_LEVEL };
  // (RPG-SPELLS batch 4: the Demon Swordsman's Demon Form is Metamorphosis, and chains of hellfire drag the three nearest foes within 4 to him first;
  // the hero's copy only)
  const form = all.demonSwordsman;
  all.demonSwordsman = {
    ...form,
    name: 'Metamorphosis',
    key: 'Demon Form',
    text: 'Chains of hellfire drag the three nearest foes within 4 tiles to him; for 15s (it carries into the next wave) he hits half as hard again, and a fifth of his health comes back',
    cast: (b, me, out) => {
      hellChains(b, me, out);
      return form.cast(b, me, out);
    },
  };
  // (RPG-SPELLS batch 3: the Samurai Commander's Rally Cry is the Rallying Cry, and his melee allies charge; the hero's copy only, so a foe that
  // borrows the old one keeps it)
  const rally = all.samuraiCommander;
  all.samuraiCommander = {
    ...rally,
    name: 'Rallying Cry',
    key: 'Rally Cry',
    text: 'The war banner flies over every ally: attack up a quarter for 9s and a quarter of their health back; every melee ally within 4 charges up to 2 tiles at its nearest foe',
    cast: (b, me, out) => {
      if (!rally.cast(b, me, out)) return false;
      for (const a of alliesOf(b, me).filter((x) => x !== me && apart(x, me) <= 4).sort(byId)) chargeNearest(b, a, 2, 1.2, out);
      return true;
    },
  };
  for (const [kind, t] of Object.entries(TUNE)) all[kind].tuned = t;
  return all;
}
