// The Vampires' casts (docs/notes/twenty-heroes.md): each one's skill 1, 2 and 3 and its ultimate, brought from the owner's branch
// `feat/twenty-heroes-vampire` (`kits/twentyNew.ts` there) onto main's toolkit. Each is built from parts the game already has: the movement
// toolkit (charges, leaps, blinks, launches, shoves, drags, walls and auras), the ailments and the plain skill strike. No randomness: every
// choice is a fixed order (then by id).

import { atkOf, defOf, wayTo, type Battle, type BattleEvent, type Unit } from '../battle';
import type { HeroKit, Pool, Slot } from '../heroKits';
import type { SkillClass } from '../skillRules';
import { apart, type Kit, type Passive, type Skill, castPower, crowd, durOf, foesOf, mendUnit, near3x3, reachOf } from '../abilities';
import { bleedFor, curseFor, shockFor, silenceFor, stunFor, weakFor } from '../ailments';
import {
  blinkStrike,
  blinkTo,
  charge,
  chokeLine,
  displace,
  launch,
  leapTo,
  mostAtRisk,
  moveMany,
  pull,
  raiseAura,
  raiseWall,
  safeTile,
  shieldLine,
  shove,
  teleportSlash,
} from '../toolkit';
import { alliesOf, foesNear, freeNear, ms, nearestFoe, strike, strongest } from './common';

const weakest = (x: Unit, y: Unit) => x.hp - y.hp || x.id - y.id;
const hurtMost = (x: Unit, y: Unit) => x.hp / x.maxHp - y.hp / y.maxHp || x.id - y.id;
const ultDur = (me: Unit, n: number) => durOf(me, Math.round(n * Math.sqrt(castPower())));

// ============================================================================
// 1. VAMPIRE LORD (Vladislav) — vampire · blade
// ============================================================================

/** Skill 1 — Crimson Lunge: dashes up to 4 tiles through a line of foes, cutting and bleeding each, and drinking 25% of what he deals. */
export function crimsonLunge(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const before = me.dealt ?? 0;
  const from = out.length;
  if (!charge(b, me, { tiles: reachOf(me, 4), route: 'line', through: true, mult: 1.55 }, out)) return false;
  const dealt = (me.dealt ?? 0) - before;
  if (dealt > 0) mendUnit(me, Math.max(1, Math.round(dealt * 0.25)), out, me);
  for (let i = from; i < out.length; i++) {
    const e = out[i];
    if (e.kind === 'hit' && e.by === me.id) {
      const f = b.units.find((x) => x.id === e.to);
      if (f && f.alive) bleedFor(b, me, f, 0.08, ms(me, 3000));
    }
  }
  return true;
}

/** Skill 2 — Impaling Thrust: lunges 2 tiles at the strongest foe within 3, impaling and launching it 2 tiles while drinking its blood. */
export function impalingThrust(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const f = foesNear(b, me, 3).sort(strongest)[0];
  if (!f) return false;
  if (apart(me, f) > 1) {
    const spot = freeNear(b, f, 1).sort((x, y) => apart(me, x) - apart(me, y))[0];
    if (spot) leapTo(b, me, spot, out);
  }
  me.facing = wayTo(me, f);
  const before = me.dealt ?? 0;
  strike(b, me, f, 1.85, out, true);
  const dealt = (me.dealt ?? 0) - before;
  if (dealt > 0) mendUnit(me, Math.max(1, Math.round(dealt * 0.35)), out, me);
  if (f.alive) launch(b, me, f, 2, out);
  return true;
}

/** Skill 3 — Mist Step: dissolves into crimson mist, blinking behind the weakest foe within 5 tiles, cutting it and hastening himself for 3s. */
export function mistStep(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const f = foesNear(b, me, 5).sort(weakest).find((x) => blinkStrike(b, me, x, 1.65, out));
  if (!f) return false;
  if (f.alive) bleedFor(b, me, f, 0.08, ms(me, 3000));
  me.hasteUntil = Math.max(me.hasteUntil ?? 0, b.t + ms(me, 3000));
  out.push({ kind: 'haste', to: me.id, ms: ms(me, 3000) });
  return true;
}

/** Ultimate — Red Eclipse: teleports in a crimson slash across up to 5 foes within 6 tiles, bleeding and cursing each, then raises a Blood Feast aura. */
export function redEclipse(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const hit = teleportSlash(b, me, { k: 5, reach: reachOf(me, 6), mult: 1.75, order: weakest }, out);
  if (!hit.length) return false;
  for (const f of hit) {
    if (!f.alive) continue;
    bleedFor(b, me, f, 0.1, ultDur(me, 4000));
    curseFor(b, me, f, ultDur(me, 5000));
  }
  raiseAura(b, me, { what: 'Red Eclipse', reach: 3, ms: ultDur(me, 6000), every: 1000, foe: { dmg: 0.35 * castPower(), ail: 'bleed', drink: 0.5 }, ally: { atk: 0.15 } }, out);
  return true;
}

// ============================================================================
// 2. HEMOMANCER (Carmilla) — vampire · caster
// ============================================================================

/** Skill 1 — Sanguine Lash: whips a blood tether between two foes within 4 tiles, yanking the farther one 2 tiles towards the nearer and bleeding both. */
export function sanguineLash(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const foes = foesNear(b, me, reachOf(me, 4)).sort((x, y) => apart(me, x) - apart(me, y) || x.id - y.id);
  if (!foes.length) return false;
  const f1 = foes[0];
  const f2 = foes[1];
  out.push({ kind: 'shot', by: me.id, to: f1.id, shot: 'curse', ms: 160 });
  strike(b, me, f1, 1.35, out);
  if (f1.alive) bleedFor(b, me, f1, 0.08, ms(me, 3000));
  if (f2) {
    out.push({ kind: 'arc', from: f1.id, to: f2.id });
    strike(b, me, f2, 1.25, out);
    if (f2.alive) {
      bleedFor(b, me, f2, 0.08, ms(me, 3000));
      displace(b, me, f2, wayTo(f2, f1), 2, 'drag', out);
    }
  } else if (f1.alive) {
    pull(b, me, f1, 1, out);
  }
  return true;
}

/** Skill 2 — Blood Chalice: drains a foe within 4 tiles and pours the crimson draught over the most hurt ally, mending and hastening them. */
export function bloodChalice(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const f = foesNear(b, me, reachOf(me, 4)).sort(strongest)[0];
  const ally = alliesOf(b, me).filter((a) => a.hp < a.maxHp).sort(hurtMost)[0] ?? me;
  if (!f && ally.hp >= ally.maxHp * 0.85) return false;
  if (f) {
    out.push({ kind: 'shot', by: me.id, to: f.id, shot: 'curse', ms: 160 });
    strike(b, me, f, 1.3, out);
    if (f.alive) curseFor(b, me, f, ms(me, 4000));
  }
  mendUnit(ally, Math.max(1, Math.round(atkOf(me) * 1.9 + ally.maxHp * 0.14)), out, me);
  ally.hasteUntil = Math.max(ally.hasteUntil ?? 0, b.t + ms(me, 3000));
  out.push({ kind: 'haste', to: ally.id, ms: ms(me, 3000) });
  return true;
}

/** Skill 3 — Crimson Mist: glides in blood-mist to the safest tile within 3, leaving a boiling Blood Pool aura on her old tile for 5s. */
export function crimsonMist(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  if (!foesNear(b, me, 5).length) return false;
  const old = { u: me.u, v: me.v };
  const safe = safeTile(b, me, 3) ?? freeNear(b, me, 2)[0];
  if (safe) blinkTo(b, me, safe, out);
  raiseAura(b, me, { what: 'Crimson Mist', at: old, reach: 2, ms: ms(me, 5000), every: 1000, foe: { dmg: 0.35, slow: 1200, ail: 'bleed', drink: 0.4 } }, out);
  return true;
}

/** Ultimate — Exsanguinate: drags every foe within 5 tiles towards the thickest crowd, curses and bleeds them, and mends the entire party. */
export function exsanguinate(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const foes = foesNear(b, me, reachOf(me, 6));
  if (!foes.length) return false;
  const hub = crowd(b, me, (f) => apart(me, f) <= reachOf(me, 6)) ?? foes[0];
  for (const f of foes) {
    if (f !== hub && apart(f, hub) <= 4) displace(b, me, f, wayTo(f, hub), 2, 'drag', out);
    strike(b, me, f, 1.5, out, true);
    if (f.alive) {
      bleedFor(b, me, f, 0.1, ultDur(me, 5000));
      curseFor(b, me, f, ultDur(me, 5000));
    }
  }
  for (const a of alliesOf(b, me)) mendUnit(a, Math.round(a.maxHp * 0.22 * castPower()), out, me);
  return true;
}

// ============================================================================
// 3. NIGHTSTALKER (Sorin) — vampire · assassin
// ============================================================================

/** Skill 1 — Dusk Dive: swoops up to 5 tiles onto a back-line or weak foe, cutting it and silencing it for 1.5s. */
export function duskDive(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const back = (f: Unit) => defOf(f).range >= 2;
  const ok = charge(b, me, { tiles: reachOf(me, 5), route: 'leap', mult: 1.6, only: back }, out) || charge(b, me, { tiles: reachOf(me, 5), route: 'leap', mult: 1.6 }, out);
  if (!ok) return false;
  const f = nearestFoe(b, me);
  if (f && apart(me, f) <= 1 && f.alive) silenceFor(b, f, ms(me, 1500), me);
  return true;
}

/** Skill 2 — Abduct: snatches an adjacent foe into the air and flings it 2 tiles back towards his allies, stunning it. */
export function abduct(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const f = foesNear(b, me, 2).sort(weakest)[0];
  if (!f) return false;
  const ally = alliesOf(b, me).filter((a) => a !== me).sort((x, y) => apart(f, x) - apart(f, y))[0];
  const way = ally ? wayTo(f, ally) : (wayTo(me, f) + 2) % 4;
  strike(b, me, f, 1.5, out, true);
  if (f.alive) {
    displace(b, me, f, way, 2, 'launch', out);
    stunFor(b, f, ms(me, 1200), false, 'stun', me);
  }
  return true;
}

/** Skill 3 — Echolocation: emits a bat-shriek that shocks and weakens foes within 3 tiles, then blinks behind the strongest among them. */
export function echolocation(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const near = foesNear(b, me, 4);
  if (!near.length) return false;
  for (const f of near) {
    shockFor(b, me, f);
    weakFor(b, f, ms(me, 3500), me);
  }
  const top = [...near].sort(strongest)[0];
  blinkStrike(b, me, top, 1.6, out);
  return true;
}

/** Ultimate — Midnight Hunt: vanishes into the night and executes a 4-hop teleport slash across the weakest foes, launching the final target. */
export function midnightHunt(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const hit = teleportSlash(b, me, { k: 4, reach: reachOf(me, 7), mult: 1.9, order: weakest }, out);
  if (!hit.length) return false;
  me.hideUntil = Math.max(me.hideUntil ?? 0, b.t + ultDur(me, 2200));
  const last = hit[hit.length - 1];
  if (last && last.alive) launch(b, me, last, 2, out);
  return true;
}

// ============================================================================
// 4. BLOOD GARGOYLE (Gavril) — vampire · bulwark
// ============================================================================

/** Skill 1 — Gargoyle Crash: leaps up to 4 tiles onto a crowd, slamming the 3x3 and shoving adjacent foes a tile outward. */
export function gargoyleCrash(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  return charge(b, me, { tiles: reachOf(me, 4), route: 'leap', mult: 1.45, land: 0.75, shove: 1, stun: ms(me, 800) }, out);
}

/** Skill 2 — Stone Slumber: turns to living granite for 4s, gaining a 25% max HP shield, taunting nearby foes, and raising a Stone Dust aura. */
export function stoneSlumber(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const near = foesNear(b, me, 3);
  if (!near.length) return false;
  const dur = ms(me, 4000);
  me.guardUntil = Math.max(me.guardUntil ?? 0, b.t + dur);
  me.shield = { hp: Math.round(me.maxHp * 0.25), until: b.t + dur };
  mendUnit(me, Math.round(me.maxHp * 0.1), out, me);
  for (const f of near) f.taunt = { to: me.id, until: b.t + dur };
  raiseAura(b, me, { what: 'Stone Slumber', reach: 2, ms: dur, every: 1000, foe: { dmg: 0.25, slow: 1200 }, ally: { guard: 0.15 } }, out);
  return true;
}

/** Skill 3 — Wing Buffet: beats stone wings to shove adjacent foes 2 tiles back, then leaps 2 tiles to guard the ally most at risk. */
export function wingBuffet(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const near = foesNear(b, me, 2);
  const friend = mostAtRisk(b, me);
  if (!near.length && !friend) return false;
  if (near.length) {
    for (const f of near) strike(b, me, f, 1.1, out);
    moveMany(b, me, near, 2, 'shove', out);
  }
  if (friend && friend !== me && apart(me, friend) <= 3) {
    const spot = freeNear(b, friend, 1)[0];
    if (spot) leapTo(b, me, spot, out);
    friend.shield = { hp: Math.round(me.maxHp * 0.18), until: b.t + ms(me, 3500) };
  }
  return true;
}

/** Ultimate — Cathedral Perch: crashes down on the thickest crowd within 6 tiles, stuns the 3x3 for 2s, and raises a 3-tile Wall of Stone. */
export function cathedralPerch(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const aim = crowd(b, me, (f) => apart(me, f) <= reachOf(me, 6));
  if (!aim) return false;
  const spot = freeNear(b, aim, 1)[0];
  if (spot) leapTo(b, me, spot, out);
  for (const f of foesOf(b, me)) {
    if (near3x3(f, me)) {
      strike(b, me, f, 1.8, out, true);
      if (f.alive) stunFor(b, f, ultDur(me, 2000), false, 'stun', me);
    }
  }
  const line = chokeLine(b, me, 3) ?? freeNear(b, aim, 2).slice(0, 2);
  if (line.length) raiseWall(b, me, line, 'stone', ultDur(me, 6000), out);
  return true;
}

// ============================================================================
// 5. DHAMPIR (Klara) — vampire · gunner
// ============================================================================

/** Skill 1 — Silver Stake: fires a heavy silver bolt that shoves its target 2 tiles back and pins (stuns) it if it hits a wall or fighter. */
export function silverStake(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const f = foesNear(b, me, reachOf(me, 5)).sort(strongest)[0];
  if (!f) return false;
  me.facing = wayTo(me, f);
  out.push({ kind: 'shot', by: me.id, to: f.id, shot: 'arrow', ms: 140 });
  strike(b, me, f, 1.65, out, true);
  if (f.alive) {
    const plan = shove(b, me, f, 2, out);
    if (plan?.slam && f.alive) stunFor(b, f, ms(me, 1800), false, 'stun', me);
  }
  return true;
}

/** Skill 2 — Grapple Vault: fires a grappling hook to vault up to 3 tiles to safe high ground, then looses two silver bolts at the nearest foe. */
export function grappleVault(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const foes = foesNear(b, me, reachOf(me, 6));
  if (!foes.length) return false;
  const safe = safeTile(b, me, 3);
  if (safe) leapTo(b, me, safe, out);
  const targets = foesNear(b, me, reachOf(me, 6)).sort((x, y) => apart(me, x) - apart(me, y) || x.id - y.id);
  for (let i = 0; i < 2 && targets.length; i++) {
    const f = targets[i % targets.length];
    if (!f.alive) continue;
    out.push({ kind: 'shot', by: me.id, to: f.id, shot: 'arrow', ms: 120 + i * 90 });
    strike(b, me, f, 1.15, out);
    if (f.alive) bleedFor(b, me, f, 0.06, ms(me, 2500));
  }
  return true;
}

/** Skill 3 — Consecrated Trap: tumbles 1 tile aside and raises a 2-tile Wall of Light plus a silver snare on her old tile. */
export function consecratedTrap(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  if (!foesNear(b, me, 5).length) return false;
  const old = { u: me.u, v: me.v };
  const side = freeNear(b, me, 1)[0];
  if (side) leapTo(b, me, side, out);
  (b.traps ??= []).push({ u: old.u, v: old.v, side: me.side, by: me.id, until: b.t + ms(me, 8000), dmg: Math.round(atkOf(me) * 1.4), hold: ms(me, 1500) });
  out.push({ kind: 'trap', u: old.u, v: old.v, ms: ms(me, 8000) });
  const line = shieldLine(b, me, 2) ?? [old];
  raiseWall(b, me, line, 'light', ms(me, 5000), out);
  return true;
}

/** Ultimate — Judgement of Dusk: vaults to high ground and fires 5 silver stakes across the strongest foes, shoving and cursing each. */
export function judgementOfDusk(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const foes = foesNear(b, me, reachOf(me, 7)).sort(strongest);
  if (!foes.length) return false;
  const safe = safeTile(b, me, 3);
  if (safe) leapTo(b, me, safe, out);
  for (let i = 0; i < 5; i++) {
    const f = foes[i % foes.length];
    if (!f || !f.alive) continue;
    out.push({ kind: 'shot', by: me.id, to: f.id, shot: 'arrow', ms: 120 + i * 70 });
    strike(b, me, f, 1.35, out, true);
    if (f.alive) {
      curseFor(b, me, f, ultDur(me, 5000));
      shove(b, me, f, 1, out);
    }
  }
  return true;
}


// ============================================================================
// The guards' triggers (a guard is cast at once when its trigger holds, and its cast checks the same trigger, as `kits/third.ts`'s)
// ============================================================================

/** The Hemomancer's Crimson Mist: she is under 35% with a foe within 2. */
const mistNeeded = (b: Battle, me: Unit): boolean => me.hp < me.maxHp * 0.35 && foesNear(b, me, 2).length > 0;
/** The Blood Gargoyle's Wing Buffet: a friend within 3 (or he) is under 40% with a foe beside it. */
const buffetNeeded = (b: Battle, me: Unit): boolean =>
  b.units.some((a) => a.alive && a.side === me.side && a.owner === undefined && apart(a, me) <= 3 && a.hp < a.maxHp * 0.4 && foesNear(b, a, 1).length > 0);
/** The Dhampir's Grapple Vault: a foe within 2 of her. */
const vaultNeeded = (b: Battle, me: Unit): boolean => foesNear(b, me, 2).length > 0;
/** The Hemomancer's Blood Chalice is a heal: it waits for a friend within 5 under 40%. */
const chaliceNeeded = (b: Battle, me: Unit): boolean => b.units.some((a) => a.alive && a.side === me.side && a.hp < a.maxHp * 0.4 && apart(a, me) <= 5);

export const VAMPIRE_GUARDS = { mistNeeded, buffetNeeded, vaultNeeded, chaliceNeeded };

// ============================================================================
// The kits: each Vampire's skill 1 (its own skill, as every hero's old skill is in `KITS`), passive and ultimate, and its three slots
// ============================================================================

/** A skill (its old charge numbers are unused: a hero's skills cost its pool). */
const sk = (name: string, text: string, castMs: number, anim: Skill['anim'], cast: Skill['cast']): Skill => ({ name, text, need: 100, dealt: 0, taken: 0, perSec: 0, castMs, anim, cast });
/** An ultimate: opens at level 30 (`ULT_LEVEL`), with its balance knobs. */
const ult = (name: string, text: string, castMs: number, cast: Skill['cast'], tuned: { rate: number; power: number }): Skill => ({ ...sk(name, text, castMs, 'attack2', cast), unlock: 30, tuned });
const bleedDot = { kind: 'bleed' as const, dmg: 4, every: 500, ms: 3000 };

/** One Vampire's kit, as written. */
interface Row {
  pool: Pool;
  role: string;
  passive: Passive;
  s1: { skill: Skill; cls: SkillClass; cost: number; cd: number; more?: Partial<Slot> };
  s2: { skill: Skill; cls: SkillClass; cost: number; cd: number; more?: Partial<Slot> };
  s3: { skill: Skill; cls: SkillClass; cost: number; cd: number; more?: Partial<Slot> };
  ultimate: Skill;
}

/** Each slot's strength (its `tune`, times the caster's attack while it casts): the roster's defaults (`STAM_TUNE`, `MANA_TUNE`, 1 for skill 2
 *  and 0.8 for skill 3) until the hero sweep tunes them, as it tuned the 45 (`tools/kits/tune.ts`). */
export const VAMPIRE_TUNE: Readonly<Record<string, readonly [number, number, number]>> = {
  vampireLord: [0.5, 1, 0.8],
  hemomancer: [0.7, 1, 0.8],
  nightstalker: [0.5, 1, 0.8],
  bloodGargoyle: [0.5, 1, 0.8],
  dhampir: [0.5, 1, 0.8],
};

function rows(): Record<string, Row> {
  return {
    vampireLord: {
      pool: 'stamina',
      role: 'A blood-duellist: lunges through lines, impales and steps through crimson mist',
      passive: { name: 'Noble Thirst', text: 'Heals for 18% of the damage his blows deal, and 15% of blows crit for x1.6 and bleed', leech: 0.18, crit: { chance: 0.15, mult: 1.6, bleed: bleedDot } },
      s1: { cls: 'strike', cost: 24, cd: 7000, skill: sk('Crimson Lunge', 'Dashes up to 4 tiles through a line of foes, cutting and bleeding each, and drinks a quarter of what he deals', 500, 'attack', crimsonLunge) },
      s2: { cls: 'heavy', cost: 30, cd: 11000, skill: sk('Impaling Thrust', 'Lunges up to 2 tiles at the strongest foe within 3, impaling it and throwing it 2 tiles into the air while drinking 35% of what he deals', 500, 'attack2', impalingThrust) },
      s3: { cls: 'jab', cost: 10, cd: 4000, skill: sk('Mist Step', 'Dissolves into crimson mist and steps behind the weakest foe within 5, cutting and bleeding it; he is hastened for 3s', 350, 'attack', mistStep) },
      ultimate: ult('Red Eclipse', 'Teleports in a crimson slash across up to five foes within 6 tiles, bleeding and cursing each, and raises a Blood Feast aura round him for 6s', 750, redEclipse, { rate: 1.2, power: 1.8 }),
    },
    hemomancer: {
      pool: 'mana',
      role: 'A blood weaver: tethers foes together, pours the chalice, and glides in mist',
      passive: { name: 'Chalice Overflow', text: 'Every 2.5s mends the most hurt ally, and her blows leech 12% of the damage dealt', mend: { every: 2500, share: 0.65 }, leech: 0.12 },
      s1: { cls: 'strike', cost: 36, cd: 7000, skill: sk('Sanguine Lash', 'Whips a blood tether between the two nearest foes within 4, dragging the farther one 2 tiles towards the nearer and bleeding both', 600, 'attack', sanguineLash) },
      s2: { cls: 'utility', cost: 42, cd: 14000, more: { heals: true, emergency: chaliceNeeded }, skill: sk('Blood Chalice', 'Drains the strongest foe within 4 and pours the chalice over the most hurt ally, mending it and hastening it for 3s', 600, 'attack2', bloodChalice) },
      s3: { cls: 'guard', cost: 30, cd: 15000, more: { emergency: mistNeeded }, skill: sk('Crimson Mist', 'When she falls under 35% with a foe within 2, she glides in blood-mist to the safest tile within 3, leaving a boiling Blood Pool on her old tile for 5s that slows and bleeds foes', 450, 'defend', (b, me, out) => mistNeeded(b, me) && crimsonMist(b, me, out)) },
      ultimate: ult('Exsanguinate', 'Drags every foe within 6 tiles towards the thickest crowd, curses and bleeds them all, and mends every ally for 22% of their health', 800, exsanguinate, { rate: 0.9, power: 1.4 }),
    },
    nightstalker: {
      pool: 'stamina',
      role: 'A winged strigoi: swoops from the dark, abducts prey and strikes by echolocation',
      passive: { name: 'Predator of the Crypt', text: '25% of blows crit for x1.7 and bleed, and blows deal 25% more to shooters', crit: { chance: 0.25, mult: 1.7, bleed: bleedDot }, prey: 1.25 },
      s1: { cls: 'strike', cost: 24, cd: 7000, skill: sk('Dusk Dive', 'Swoops up to 5 tiles onto a back-line foe (or any, with none), cutting it and silencing it for 1.5s', 450, 'attack', duskDive) },
      s2: { cls: 'heavy', cost: 30, cd: 11000, skill: sk('Abduct', 'Snatches the weakest foe within 2 into the air and flings it 2 tiles towards his friends, stunned for 1.2s', 500, 'attack2', abduct) },
      s3: { cls: 'utility', cost: 22, cd: 14000, skill: sk('Echolocation', 'A bat-shriek shocks and weakens the foes within 4 for 3.5s, then he steps behind the strongest of them and cuts it', 450, 'attack2', echolocation) },
      ultimate: ult('Midnight Hunt', 'Vanishes into the dark and slashes through the four weakest foes within 7 tiles in turn, throwing the last into the air', 700, midnightHunt, { rate: 1.3, power: 1.9 }),
    },
    bloodGargoyle: {
      pool: 'stamina',
      role: 'A stone sentinel: crashes down from the eaves, turns to granite and shields his friends',
      passive: { name: 'Granite Hide', text: 'Blows from the front lose 30% (he heals 40% of what he blocks), and he takes a quarter less from shots', block: 0.3, blockHeal: 0.4, scales: 0.25 },
      s1: { cls: 'strike', cost: 26, cd: 7000, skill: sk('Gargoyle Crash', 'Leaps up to 4 tiles onto a crowd: the 3x3 is struck, the foe he lands on is stunned 0.8s, and the foes beside him are shoved a tile out', 600, 'attack', gargoyleCrash) },
      s2: { cls: 'utility', cost: 26, cd: 16000, skill: sk('Stone Slumber', 'Turns to living granite for 4s: takes half damage behind a shield of a quarter of his health, the foes within 3 must strike him, and stone dust slows the foes near him', 550, 'defend', stoneSlumber) },
      s3: { cls: 'guard', cost: 16, cd: 14000, more: { emergency: buffetNeeded }, skill: sk('Wing Buffet', 'When a friend within 3 falls under 40% with a foe beside it, his stone wings shove the foes within 2 two tiles back and he leaps beside the friend most at risk, shielding it', 400, 'attack2', (b, me, out) => buffetNeeded(b, me) && wingBuffet(b, me, out)) },
      ultimate: ult('Cathedral Perch', 'Soars and crashes down on the thickest crowd within 6 tiles, stunning the 3x3 for 2s, and raises a Wall of Stone across the foes\' way', 800, cathedralPerch, { rate: 1.25, power: 1.5 }),
    },
    dhampir: {
      pool: 'stamina',
      role: 'A silver-bolt hunter: vaults clear and pins foes to stone',
      passive: { name: 'Half-Blood Hunter', text: 'Bolts ignore 3 defence, deal 20% more at 4 tiles or more, and leech 10%', pierce: 3, far: 0.2, leech: 0.1 },
      s1: { cls: 'strike', cost: 24, cd: 7000, skill: sk('Silver Stake', 'A heavy silver bolt at the strongest foe within 5 shoves it 2 tiles back; if it slams into a wall or a fighter it is pinned for 1.8s', 500, 'attack', silverStake) },
      s2: { cls: 'guard', cost: 16, cd: 14000, more: { emergency: vaultNeeded }, skill: sk('Grapple Vault', 'With a foe within 2, she hooks a grapple to the safest tile within 3 and vaults there, then looses two silver bolts at the nearest foes, each bleeding', 450, 'attack', (b, me, out) => vaultNeeded(b, me) && grappleVault(b, me, out)) },
      s3: { cls: 'utility', cost: 22, cd: 16000, skill: sk('Consecrated Trap', 'Tumbles a tile aside and leaves a silver snare on her old tile for 8s (it holds the foe that steps in), behind a Wall of Light 2 tiles across for 5s', 500, 'attack2', consecratedTrap) },
      ultimate: ult('Judgement of Dusk', 'Vaults to the safest tile within 3 and fires five consecrated silver stakes across the strongest foes within 7 tiles, shoving and cursing each', 750, judgementOfDusk, { rate: 1.0, power: 1.6 }),
    },
  };
}

let built: { kits: Record<string, Kit>; heroKits: Record<string, HeroKit> } | undefined;
function build() {
  if (built) return built;
  const kits: Record<string, Kit> = {};
  const heroKits: Record<string, HeroKit> = {};
  for (const [kind, r] of Object.entries(rows())) {
    const t = VAMPIRE_TUNE[kind];
    const slot = (s: Row['s1'], tune: number): Slot => ({ skill: s.skill, cls: s.cls, cost: s.cost, cd: s.cd, tune, ...(s.more ?? {}) });
    const s1 = slot(r.s1, t[0]);
    const s2 = slot(r.s2, t[1]);
    const s3 = slot(r.s3, t[2]);
    kits[kind] = { skill: r.s1.skill, passive: r.passive, ultimate: r.ultimate };
    heroKits[kind] = { pool: r.pool, s1, s2, s3, slots: [s1, s2, s3], role: r.role };
  }
  return (built = { kits, heroKits });
}

/** The Vampires' kits as `KITS` holds the roster's (skill 1, passive, ultimate), until they join the roster. */
export const comingKits = (): Record<string, Kit> => build().kits;
/** The Vampires' three-slot kits as `HERO_KITS` holds the roster's, until they join the roster. */
export const comingHeroKits = (): Record<string, HeroKit> => build().heroKits;
