// Active skills (Skill 1, Skill 2, Skill 3) and Ultimates for the twenty third-wave heroes (five Vampires and fifteen
// rounding out the twelve existing origins to five heroes each). Every hero uses movement and battlefield toolkit primitives
// (charges, leaps, blinks, grapples, burrows, swaps, pulls, shoves, launches, walls and auras). Pure rules: no randomness
// outside `b.skillRng`.

import { tileAt } from '../board';
import { addUnit, atkOf, defOf, unitAt, wayTo, type Battle, type BattleEvent, type Unit } from '../battle';
import { BANNER_MULT, apart, castPower, crowd, durOf, foesOf, mendUnit, near3x3, reachOf } from '../abilities';
import { addRes } from '../heroKits';
import { bleedFor, burnFor, chillFor, cleanse, curseFor, poisonFor, shockFor, silenceFor, stunFor, ward, weakFor } from '../ailments';
import {
  blinkStrike,
  blinkTo,
  burrow,
  canLand,
  charge,
  chokeLine,
  displace,
  laneLine,
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
  swapPlaces,
  teleportSlash,
} from '../toolkit';
import { alliesOf, foesNear, freeNear, ms, nearestFoe, strike, strongest, toughest } from './common';

const weakest = (x: Unit, y: Unit) => x.hp - y.hp || x.id - y.id;
const farthest = (me: Unit) => (x: Unit, y: Unit) => apart(me, y) - apart(me, x) || x.id - y.id;
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
// 5. DUSK INQUISITOR (Klara, dhampir) — vampire · gunner
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
// 6. WAR DRUMMER (Raiden) — samurai · support
// ============================================================================

/** Skill 1 — Thunder Beat: booms his taiko drum, shoving foes within 2 tiles 1 tile back and hastening allies within 3 tiles for 3s. */
export function thunderBeat(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const near = foesNear(b, me, 2);
  const friends = alliesOf(b, me).filter((a) => apart(me, a) <= 3);
  if (!near.length && friends.length <= 1) return false;
  for (const f of near) {
    strike(b, me, f, 1.25, out);
    if (f.alive) shockFor(b, me, f);
  }
  if (near.length) moveMany(b, me, near, 1, 'shove', out);
  for (const a of friends) {
    a.hasteUntil = Math.max(a.hasteUntil ?? 0, b.t + ms(me, 3000));
    out.push({ kind: 'haste', to: a.id, ms: ms(me, 3000) });
  }
  out.push({ kind: 'song', by: me.id, ms: 700 });
  return true;
}

/** Skill 2 — Marching Cadence: beats a forward charge — he and nearby melee allies dash up to 2 tiles towards the foes and gain a shield. */
export function marchingCadence(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  if (!foesNear(b, me, 6).length) return false;
  const sh = Math.round(me.maxHp * 0.16);
  for (const a of alliesOf(b, me).filter((x) => apart(me, x) <= 3)) {
    a.shield = { hp: sh, until: b.t + ms(me, 4000) };
    if (!defOf(a).shot) charge(b, a, { tiles: 2, route: 'path', mult: 1.1 }, out);
  }
  out.push({ kind: 'song', by: me.id, ms: 800 });
  return true;
}

/** Skill 3 — Resonant Leap: leaps up to 3 tiles to the largest cluster of allies and raises a 3-tile Taiko Cadence aura for 6s. */
export function resonantLeap(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  if (!foesNear(b, me, 6).length) return false;
  const friends = alliesOf(b, me).filter((a) => a !== me && apart(me, a) <= 4);
  if (friends.length) {
    const spot = freeNear(b, friends[0], 1).find((c) => canLand(b, me, c));
    if (spot) leapTo(b, me, spot, out);
  }
  raiseAura(b, me, { what: 'Taiko Cadence', reach: 3, ms: ms(me, 6000), every: 1000, ally: { atk: 0.15, stamina: 3, mana: 4 }, foe: { dmg: 0.2, ail: 'shock' } }, out);
  return true;
}

/** Ultimate — Storm of Ten Thousand Drums: shoves all foes within 5 tiles 2 tiles back, rallies and hastens all allies, and sends melee allies charging. */
export function tenThousandDrums(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const foes = foesNear(b, me, 6);
  if (!foes.length) return false;
  for (const f of foes) {
    strike(b, me, f, 1.3, out, true);
    if (f.alive) shockFor(b, me, f);
  }
  moveMany(b, me, foes, 2, 'shove', out);
  const dur = ultDur(me, 6000);
  for (const a of alliesOf(b, me)) {
    a.hasteUntil = Math.max(a.hasteUntil ?? 0, b.t + dur);
    if (!a.banner) a.power = (a.power ?? 1) * BANNER_MULT;
    a.banner = { until: b.t + dur };
    addRes(a, 15);
    out.push({ kind: 'haste', to: a.id, ms: dur });
    if (!defOf(a).shot && a !== me) charge(b, a, { tiles: 2, route: 'path', mult: 1.2 }, out);
  }
  return true;
}

// ============================================================================
// 7. BANNERET (Isolde) — knightly · warden
// ============================================================================

/** Skill 1 — Standard Charge: charges up to 3 tiles along a path to strike a foe and rallies allies within 2 tiles (+25% attack for 4s). */
export function standardCharge(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  if (!charge(b, me, { tiles: reachOf(me, 3), route: 'path', mult: 1.45, shove: 1 }, out)) return false;
  const dur = ms(me, 4000);
  for (const a of alliesOf(b, me).filter((x) => apart(me, x) <= 2)) {
    if (!a.banner) a.power = (a.power ?? 1) * BANNER_MULT;
    a.banner = { until: b.t + dur };
  }
  out.push({ kind: 'banner', by: me.id, ms: dur });
  return true;
}

/** Skill 2 — Rampart Drop: leaps up to 3 tiles beside the ally most at risk, raising a 3-tile Wall of Light and shielding both. */
export function rampartDrop(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const friend = mostAtRisk(b, me);
  if (!friend || !foesNear(b, me, 6).length) return false;
  if (friend !== me && apart(me, friend) <= 3) {
    const spot = freeNear(b, friend, 1)[0];
    if (spot) leapTo(b, me, spot, out);
  }
  const sh = Math.round(me.maxHp * 0.2);
  me.shield = { hp: sh, until: b.t + ms(me, 4500) };
  friend.shield = { hp: sh, until: b.t + ms(me, 4500) };
  const line = chokeLine(b, me, 3) ?? shieldLine(b, me, 3);
  if (line) raiseWall(b, me, line, 'light', ms(me, 5000), out);
  return true;
}

/** Skill 3 — Phalanx Sweep: sweeps her halberd-banner to pull foes within 2 tiles together in front of her and stun them for 1s. */
export function phalanxSweep(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const near = foesNear(b, me, 2);
  if (!near.length) return false;
  for (const f of near) {
    strike(b, me, f, 1.3, out, true);
    if (f.alive) {
      pull(b, me, f, 1, out);
      stunFor(b, f, ms(me, 1000), false, 'stun', me);
    }
  }
  return true;
}

/** Ultimate — Oriflamme of the Keep: leaps to the heart of the fight, heals all allies 20%, and raises a Royal Standard aura for 8s. */
export function oriflamme(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const f = nearestFoe(b, me);
  if (!f) return false;
  const spot = freeNear(b, f, 1)[0];
  if (spot && apart(me, spot) <= 4) leapTo(b, me, spot, out);
  for (const a of alliesOf(b, me)) mendUnit(a, Math.round(a.maxHp * 0.2 * castPower()), out, me);
  raiseAura(b, me, { what: 'Oriflamme', reach: 3, ms: ultDur(me, 8000), every: 1000, ally: { guard: 0.25, atk: 0.2, heal: 0.04, ward: true }, foe: { dmg: 0.25 } }, out);
  return true;
}

// ============================================================================
// 8. GEOMANCER (Tenzin) — mystic · bulwark
// ============================================================================

/** Skill 1 — Tectonic Shove: erupts a stone pillar under a foe within 4 tiles, launching it 2 tiles and leaving a stone wall tile. */
export function tectonicShove(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const f = foesNear(b, me, reachOf(me, 4)).sort(strongest)[0];
  if (!f) return false;
  const old = { u: f.u, v: f.v };
  strike(b, me, f, 1.45, out, true);
  if (f.alive) launch(b, me, f, 2, out);
  if (!unitAt(b, old.u, old.v)) raiseWall(b, me, [old], 'stone', ms(me, 5000), out);
  return true;
}

/** Skill 2 — Earthglide: burrows beneath the earth and erupts under a crowd of foes within 5 tiles, launching the target and shielding himself. */
export function earthglide(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  if (!burrow(b, me, { reach: reachOf(me, 5), mult: 1.55, launch: 2, splash: 0.85 }, out)) return false;
  me.shield = { hp: Math.round(me.maxHp * 0.2), until: b.t + ms(me, 5000) };
  return true;
}

/** Skill 3 — Lodestone Pull: magnetizes his crag-staff, dragging up to 3 foes within 4 tiles 2 tiles towards him and chilling them. */
export function lodestonePull(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const foes = foesNear(b, me, 4).slice(0, 3);
  if (!foes.length) return false;
  moveMany(b, me, foes, 2, 'drag', out);
  for (const f of foes) {
    strike(b, me, f, 1.2, out);
    if (f.alive) chillFor(b, f, ms(me, 3000), false, false, me);
  }
  return true;
}

/** Ultimate — Mountain's Embrace: raises a 4-tile Wall of Stone choke line, hurls crag-meteors on two crowds, and shields all allies. */
export function mountainsEmbrace(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const foes = foesOf(b, me);
  if (!foes.length) return false;
  const line = chokeLine(b, me, 4);
  if (line) raiseWall(b, me, line, 'stone', ultDur(me, 7000), out);
  for (const a of alliesOf(b, me)) a.shield = { hp: Math.round(a.maxHp * 0.22 * castPower()), until: b.t + ultDur(me, 6000) };
  for (let i = 0; i < 2; i++) {
    const aim = foes[i % foes.length];
    b.pending.push({ at: b.t + 600 + i * 250, kind: 'meteor', by: me.id, to: aim.id, dmg: atkOf(me) * 2.2, heavy: true, u: aim.u, v: aim.v });
    out.push({ kind: 'area', by: me.id, id: 'meteor', u: aim.u, v: aim.v, ms: 600 + i * 250 });
  }
  return true;
}

// ============================================================================
// 9. BELL WARDEN (Kavi) — yokai · bulwark
// ============================================================================

/** Skill 1 — Bronze Slam: leaps up to 3 tiles and slams his bronze bell down, stunning the target for 1.2s and splashing the 3x3. */
export function bronzeSlam(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  return charge(b, me, { tiles: reachOf(me, 3), route: 'leap', mult: 1.45, land: 0.8, stun: ms(me, 1200) }, out);
}

/** Skill 2 — Echoing Toll: rings the temple bell — shoves all foes within 2 tiles 2 tiles back, silences them for 1.5s, and wards allies. */
export function echoingToll(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const near = foesNear(b, me, 2);
  if (!near.length) return false;
  for (const f of near) {
    strike(b, me, f, 1.25, out, true);
    if (f.alive) silenceFor(b, f, ms(me, 1500), me);
  }
  moveMany(b, me, near, 2, 'shove', out);
  for (const a of alliesOf(b, me).filter((x) => apart(me, x) <= 3)) ward(b, a, ms(me, 4000));
  return true;
}

/** Skill 3 — Sanctuary Vault: swaps places with (or blinks beside) the ally most at risk within 4 tiles, guarding both and taunting foes. */
export function sanctuaryVault(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const friend = mostAtRisk(b, me);
  if (!friend || !foesNear(b, me, 5).length) return false;
  if (friend !== me && apart(me, friend) <= 4) {
    if (!swapPlaces(b, me, friend, out)) {
      const spot = freeNear(b, friend, 1)[0];
      if (spot) blinkTo(b, me, spot, out);
    }
  }
  const dur = ms(me, 4000);
  me.guardUntil = Math.max(me.guardUntil ?? 0, b.t + dur);
  friend.shield = { hp: Math.round(me.maxHp * 0.2), until: b.t + dur };
  for (const f of foesNear(b, me, 2)) f.taunt = { to: me.id, until: b.t + dur };
  return true;
}

/** Ultimate — Midnight Knell: leaps into the thickest crowd, stuns foes within 3 tiles, and tolls a resonant bronze aura for 8s. */
export function midnightKnell(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const aim = crowd(b, me, (f) => apart(me, f) <= reachOf(me, 5));
  if (!aim) return false;
  const spot = freeNear(b, aim, 1)[0];
  if (spot) leapTo(b, me, spot, out);
  for (const f of foesNear(b, me, 3)) {
    strike(b, me, f, 1.6, out, true);
    if (f.alive) stunFor(b, f, ultDur(me, 1600), false, 'stun', me);
  }
  raiseAura(b, me, { what: 'Midnight Knell', reach: 3, ms: ultDur(me, 8000), every: 1000, foe: { dmg: 0.35 * castPower(), slow: 1200, ail: 'shock' }, ally: { guard: 0.25 } }, out);
  return true;
}

// ============================================================================
// 10. FALCONER (Aisling) — wild · marksman
// ============================================================================

/** Skill 1 — Falcon Stoop: sends her falcon diving on the farthest foe in reach, weakening it and flushing it 1 tile towards her. */
export function falconStoop(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const f = foesNear(b, me, reachOf(me, 6)).sort(farthest(me))[0];
  if (!f) return false;
  out.push({ kind: 'shot', by: me.id, to: f.id, shot: 'arrow', ms: 150 });
  strike(b, me, f, 1.55, out, true);
  if (f.alive) {
    weakFor(b, f, ms(me, 3500), me);
    pull(b, me, f, 1, out);
  }
  return true;
}

/** Skill 2 — Gale Vault: leaps up to 3 tiles to the safest high perch, shoving any adjacent foe 1 tile back and hastening herself. */
export function galeVault(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const foes = foesNear(b, me, 6);
  if (!foes.length) return false;
  for (const f of foesNear(b, me, 1)) shove(b, me, f, 1, out);
  const safe = safeTile(b, me, 3);
  if (safe) leapTo(b, me, safe, out);
  me.hasteUntil = Math.max(me.hasteUntil ?? 0, b.t + ms(me, 3500));
  out.push({ kind: 'haste', to: me.id, ms: ms(me, 3500) });
  return true;
}

/** Skill 3 — Talon Snare: dashes 2 tiles to a clear firing angle and sends her falcon to pin (stun 1.5s) and bleed the strongest foe. */
export function talonSnare(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const f = foesNear(b, me, reachOf(me, 6)).sort(strongest)[0];
  if (!f) return false;
  const spot = freeNear(b, me, 2).sort((x, y) => tileAt(b.board, y.u, y.v)!.h - tileAt(b.board, x.u, x.v)!.h)[0];
  if (spot) leapTo(b, me, spot, out);
  out.push({ kind: 'shot', by: me.id, to: f.id, shot: 'arrow', ms: 140 });
  strike(b, me, f, 1.45, out, true);
  if (f.alive) {
    stunFor(b, f, ms(me, 1500), true, 'stun', me);
    bleedFor(b, me, f, 0.08, ms(me, 3000));
  }
  return true;
}

/** Ultimate — Sky Hunt: leaps to high ground and calls three kettle-dives of falcons down across separate crowds. */
export function skyHunt(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const foes = foesOf(b, me);
  if (!foes.length) return false;
  const safe = safeTile(b, me, 3);
  if (safe) leapTo(b, me, safe, out);
  me.hasteUntil = Math.max(me.hasteUntil ?? 0, b.t + ultDur(me, 5000));
  for (let i = 0; i < 3; i++) {
    const aim = foes[i % foes.length];
    b.pending.push({ at: b.t + 500 + i * 180, kind: 'rain', by: me.id, to: aim.id, dmg: atkOf(me) * 1.9, heavy: false, u: aim.u, v: aim.v });
    out.push({ kind: 'area', by: me.id, id: 'volley', u: aim.u, v: aim.v, ms: 500 + i * 180 });
  }
  return true;
}

// ============================================================================
// 11. ASTRAL SPHINX (Nenet) — arcane · beast
// ============================================================================

/** Skill 1 — Rift Pounce: blinks through a star-rift behind a foe within 4 tiles, striking it and shoving other adjacent foes 1 tile away. */
export function riftPounce(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const f = foesNear(b, me, reachOf(me, 4)).sort(strongest).find((x) => blinkStrike(b, me, x, 1.55, out));
  if (!f) return false;
  const others = foesNear(b, me, 1).filter((x) => x !== f);
  if (others.length) moveMany(b, me, others, 1, 'shove', out);
  return true;
}

/** Skill 2 — Riddle of Repulsion: poses a cosmic riddle to the strongest foe within 4 tiles, launching it 3 tiles back and silencing it. */
export function riddleOfRepulsion(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const f = foesNear(b, me, 4).sort(strongest)[0];
  if (!f) return false;
  strike(b, me, f, 1.5, out, true);
  if (f.alive) {
    silenceFor(b, f, ms(me, 2000), me);
    launch(b, me, f, 3, out);
  }
  return true;
}

/** Skill 3 — Constellation Swap: swaps places with the ally most at risk within 5 tiles, shielding both and restoring pool. */
export function constellationSwap(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const friend = mostAtRisk(b, me);
  if (!friend || !foesNear(b, me, 6).length) return false;
  if (friend !== me && apart(me, friend) <= 5) {
    if (!swapPlaces(b, me, friend, out)) {
      const spot = freeNear(b, friend, 1)[0];
      if (spot) blinkTo(b, me, spot, out);
    }
  }
  const sh = Math.round(me.maxHp * 0.2);
  me.shield = { hp: sh, until: b.t + ms(me, 4000) };
  friend.shield = { hp: sh, until: b.t + ms(me, 4000) };
  addRes(friend, 15);
  return true;
}

/** Ultimate — Celestial Convergence: drags every foe within 5 tiles into a star-vortex, stuns them for 1.8s, and calls down starlight. */
export function celestialConvergence(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const foes = foesNear(b, me, 5);
  if (!foes.length) return false;
  moveMany(b, me, foes, 2, 'drag', out);
  for (const f of foes) {
    strike(b, me, f, 1.65, out, true);
    if (f.alive) stunFor(b, f, ultDur(me, 1800), false, 'stun', me);
  }
  const aim = foes[0];
  b.pending.push({ at: b.t + 550, kind: 'rain', by: me.id, to: aim.id, dmg: atkOf(me) * 1.8, heavy: true, u: aim.u, v: aim.v });
  out.push({ kind: 'area', by: me.id, id: 'volley', u: aim.u, v: aim.v, ms: 550 });
  return true;
}

// ============================================================================
// 12. MIRAGE DANCER (Zahara) — frontier · trickster
// ============================================================================

/** Skill 1 — Whirling Veils: spins up to 4 tiles through a line of foes, cutting each and leaving a sand decoy on the tile she left. */
export function whirlingVeils(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const old = { u: me.u, v: me.v };
  if (!charge(b, me, { tiles: reachOf(me, 4), route: 'line', through: true, mult: 1.5 }, out)) return false;
  if (!unitAt(b, old.u, old.v)) {
    const d = addUnit(b, 'decoy', old.u, old.v);
    d.hp = d.maxHp = Math.max(1, Math.round(me.maxHp * 0.35));
    d.expires = b.t + ms(me, 4500);
    d.owner = me.id;
  }
  return true;
}

/** Skill 2 — Dune Swap: swaps places with her decoy or a foe within 4 tiles, slashing and weakening every foe beside her arrival tile. */
export function duneSwap(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const decoy = b.units.find((x) => x.alive && x.def === 'decoy' && x.owner === me.id);
  const target = decoy ?? foesNear(b, me, 4).sort(farthest(me))[0];
  if (!target) return false;
  if (!swapPlaces(b, me, target, out)) {
    const spot = freeNear(b, target, 1)[0];
    if (!spot || !blinkTo(b, me, spot, out)) return false;
  }
  for (const f of foesNear(b, me, 1)) {
    strike(b, me, f, 1.55, out, true);
    if (f.alive) weakFor(b, f, ms(me, 3500), me);
  }
  return true;
}

/** Skill 3 — Sirocco Leap: leaps up to 3 tiles over the melee and raises a 3-tile Wind Wall that reflects enemy shots. */
export function siroccoLeap(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  if (!foesNear(b, me, 5).length) return false;
  const ok = charge(b, me, { tiles: 3, route: 'leap', mult: 1.4 }, out);
  const line = shieldLine(b, me, 3) ?? freeNear(b, me, 1).slice(0, 2);
  if (line.length) raiseWall(b, me, line, 'wind', ms(me, 4500), out);
  return ok || line.length > 0;
}

/** Ultimate — Dance of Seven Mirages: summons two sand decoys and performs a 5-hop teleport slash, stunning and bleeding each foe struck. */
export function sevenMirages(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const hit = teleportSlash(b, me, { k: 5, reach: reachOf(me, 6), mult: 1.7, order: weakest }, out);
  if (!hit.length) return false;
  for (const f of hit) {
    if (!f.alive) continue;
    bleedFor(b, me, f, 0.08, ultDur(me, 3500));
    stunFor(b, f, ultDur(me, 1100), false, 'stun', me);
  }
  for (const spot of freeNear(b, me, 2).slice(0, 2)) {
    const d = addUnit(b, 'decoy', spot.u, spot.v);
    d.hp = d.maxHp = Math.max(1, Math.round(me.maxHp * 0.4));
    d.expires = b.t + ultDur(me, 5000);
    d.owner = me.id;
  }
  return true;
}

// ============================================================================
// 13. PLAGUE DOCTOR (Corvus) — undead · arcanist
// ============================================================================

/** Skill 1 — Censer Swing: swings his iron censer to poison a 3x3 crowd of foes while shoving any foe adjacent to him 2 tiles back. */
export function censerSwing(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const aim = crowd(b, me, (f) => apart(me, f) <= reachOf(me, 4));
  if (!aim) return false;
  const close = foesNear(b, me, 1);
  if (close.length) moveMany(b, me, close, 2, 'shove', out);
  out.push({ kind: 'shot', by: me.id, to: aim.id, shot: 'curse', ms: 160 });
  for (const f of foesOf(b, me).filter((x) => near3x3(x, aim))) {
    strike(b, me, f, 1.25, out);
    if (f.alive) poisonFor(b, me, f);
  }
  return true;
}

/** Skill 2 — Crow Step: dissolves into ash-crows, blinking up to 3 tiles to safety while mending and cleansing the most hurt ally. */
export function crowStep(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const ally = alliesOf(b, me).filter((a) => a.hp < a.maxHp).sort(hurtMost)[0] ?? me;
  const safe = safeTile(b, me, 3);
  if (!safe && ally.hp >= ally.maxHp * 0.85) return false;
  if (safe) blinkTo(b, me, safe, out);
  cleanse(b, ally);
  mendUnit(ally, Math.max(1, Math.round(atkOf(me) * 1.8 + ally.maxHp * 0.12)), out, me);
  return true;
}

/** Skill 3 — Quarantine Line: raises a 3-tile Wall of Thorns across the foes' approach and drags the nearest foe into it. */
export function quarantineLine(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const f = foesNear(b, me, 5)[0];
  if (!f) return false;
  const line = chokeLine(b, me, 3) ?? laneLine(b, me, 3) ?? freeNear(b, f, 1).slice(0, 2);
  const laid = raiseWall(b, me, line, 'thorns', ms(me, 6000), out);
  if (laid.length && f.alive) displace(b, me, f, wayTo(f, laid[0]), 1, 'drag', out);
  strike(b, me, f, 1.2, out);
  return true;
}

/** Ultimate — Black Miasma: blinks to a central vantage, shoves adjacent foes away, and raises a 4-tile Miasma aura for 8s. */
export function blackMiasma(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  if (!foesOf(b, me).length) return false;
  const close = foesNear(b, me, 1);
  if (close.length) moveMany(b, me, close, 2, 'shove', out);
  for (const f of foesNear(b, me, 4)) {
    strike(b, me, f, 1.3, out, true);
    if (f.alive) poisonFor(b, me, f);
  }
  raiseAura(b, me, { what: 'Black Miasma', reach: 4, ms: ultDur(me, 8000), every: 1000, foe: { dmg: 0.35 * castPower(), slow: 1200, ail: 'poison' }, ally: { heal: 0.05 } }, out);
  return true;
}

// ============================================================================
// 14. BOMBARDIER (Soren) — machine · gunner
// ============================================================================

/** Skill 1 — Blast Jump: detonates a charge at his feet, scorching and shoving adjacent foes while rocket-jumping up to 3 tiles to safety. */
export function blastJump(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const foes = foesNear(b, me, reachOf(me, 5));
  if (!foes.length) return false;
  const adj = foesNear(b, me, 1);
  for (const f of adj) {
    strike(b, me, f, 1.3, out, true);
    if (f.alive) burnFor(b, me, f, ms(me, 2500));
  }
  if (adj.length) moveMany(b, me, adj, 1, 'shove', out);
  const safe = safeTile(b, me, 3) ?? freeNear(b, me, 2)[0];
  if (safe) leapTo(b, me, safe, out);
  const target = foes[0];
  if (target.alive) {
    out.push({ kind: 'shot', by: me.id, to: target.id, shot: 'bullet', ms: 150 });
    strike(b, me, target, 1.35, out, true);
  }
  return true;
}

/** Skill 2 — Concussion Mortar: lobs a heavy mortar shell onto the thickest crowd within 6 tiles, launching the centre foe and shoving others. */
export function concussionMortar(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const aim = crowd(b, me, (f) => apart(me, f) <= reachOf(me, 6));
  if (!aim) return false;
  out.push({ kind: 'area', by: me.id, id: 'meteor', u: aim.u, v: aim.v, ms: 350 });
  const near = foesOf(b, me).filter((x) => near3x3(x, aim));
  for (const f of near) strike(b, me, f, f === aim ? 1.65 : 1.15, out, true);
  if (aim.alive) launch(b, me, aim, 2, out);
  const rest = near.filter((x) => x !== aim && x.alive);
  if (rest.length) moveMany(b, me, rest, 1, 'shove', out, aim);
  return true;
}

/** Skill 3 — Firebomb Line: skids 1 tile back from recoil and lays a 3-tile Wall of Fire across the foes' lane. */
export function firebombLine(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const line = laneLine(b, me, 3);
  if (!line) return false;
  const back = safeTile(b, me, 1);
  if (back) leapTo(b, me, back, out);
  raiseWall(b, me, line, 'fire', ms(me, 6000), out, { pow: 1.5, onFighters: true });
  return true;
}

/** Ultimate — Carpet Bombardment: rocket-jumps to high ground and rains 4 concussion mortar salvos across the field. */
export function carpetBombardment(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const foes = foesOf(b, me);
  if (!foes.length) return false;
  const safe = safeTile(b, me, 3);
  if (safe) leapTo(b, me, safe, out);
  for (let i = 0; i < 4; i++) {
    const aim = foes[i % foes.length];
    b.pending.push({ at: b.t + 650 + i * 200, kind: 'meteor', by: me.id, to: aim.id, dmg: atkOf(me) * 2.1, heavy: true, u: aim.u, v: aim.v });
    out.push({ kind: 'area', by: me.id, id: 'meteor', u: aim.u, v: aim.v, ms: 650 + i * 200 });
  }
  return true;
}

// ============================================================================
// 15. GRAND ASTROLOGER (Cyra) — royal · arcanist
// ============================================================================

/** Skill 1 — Gravity Well: collapses a star on the thickest crowd within 5 tiles, dragging nearby foes 2 tiles in towards it. */
export function gravityWell(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const aim = crowd(b, me, (f) => apart(me, f) <= reachOf(me, 5));
  if (!aim) return false;
  out.push({ kind: 'shot', by: me.id, to: aim.id, shot: 'fire', ms: 160 });
  const near = foesOf(b, me).filter((x) => apart(x, aim) <= 3);
  for (const f of near) {
    if (f !== aim) displace(b, me, f, wayTo(f, aim), 2, 'drag', out);
    strike(b, me, f, 1.3, out, true);
  }
  return true;
}

/** Skill 2 — Retrograde Orbit: glides 3 tiles along an orbital arc to a safe tile while slinging the nearest foe 2 tiles backward. */
export function retrogradeOrbit(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const f = foesNear(b, me, 4)[0];
  if (!f) return false;
  strike(b, me, f, 1.4, out);
  if (f.alive) {
    shove(b, me, f, 2, out);
    chillFor(b, f, ms(me, 2500), false, false, me);
  }
  const safe = safeTile(b, me, 3);
  if (safe) blinkTo(b, me, safe, out);
  return true;
}

/** Skill 3 — Starlight Bridge: swaps an endangered ally to safety and raises a 3-tile Astrolabe aura that refills pools. */
export function starlightBridge(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  if (!foesOf(b, me).length) return false;
  const friend = mostAtRisk(b, me);
  if (friend && friend !== me && apart(me, friend) <= 4 && friend.hp < friend.maxHp * 0.6) swapPlaces(b, me, friend, out);
  raiseAura(b, me, { what: 'Starlight Bridge', reach: 3, ms: ms(me, 6000), every: 1000, ally: { mana: 6, stamina: 3, atk: 0.15 } }, out);
  return true;
}

/** Ultimate — Supernova Alignment: pulls foes within 6 tiles together and drops two twin supernovas on them. */
export function supernovaAlignment(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const aim = crowd(b, me, (f) => apart(me, f) <= reachOf(me, 6)) ?? foesOf(b, me)[0];
  if (!aim) return false;
  for (const f of foesOf(b, me).filter((x) => apart(x, aim) <= 4)) {
    if (f !== aim) displace(b, me, f, wayTo(f, aim), 2, 'drag', out);
    stunFor(b, f, ultDur(me, 1200), false, 'stun', me);
  }
  for (let i = 0; i < 2; i++) {
    b.pending.push({ at: b.t + 600 + i * 350, kind: 'meteor', by: me.id, to: aim.id, dmg: atkOf(me) * 2.4, heavy: true, u: aim.u, v: aim.v });
    out.push({ kind: 'area', by: me.id, id: 'meteor', u: aim.u, v: aim.v, ms: 600 + i * 350 });
  }
  return true;
}

// ============================================================================
// 16. INQUISITOR (Soraya) — holy · arcanist
// ============================================================================

/** Skill 1 — Chains of Judgement: hurls solar chains at the strongest foe within 5 tiles, dragging it 2 tiles forward, stunning and burning it. */
export function chainsOfJudgement(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const f = foesNear(b, me, reachOf(me, 5)).sort(strongest)[0];
  if (!f) return false;
  out.push({ kind: 'shot', by: me.id, to: f.id, shot: 'holy', ms: 150 });
  strike(b, me, f, 1.45, out, true);
  if (f.alive) {
    pull(b, me, f, 2, out);
    stunFor(b, f, ms(me, 1200), false, 'stun', me);
    burnFor(b, me, f, ms(me, 3000));
  }
  return true;
}

/** Skill 2 — Blazing Edict: leaps 2 tiles to a clear vantage and raises a 3-tile Wall of Light that blocks enemy shots and sears foes. */
export function blazingEdict(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  if (!foesNear(b, me, 6).length) return false;
  const safe = safeTile(b, me, 2);
  if (safe) leapTo(b, me, safe, out);
  const line = chokeLine(b, me, 3) ?? shieldLine(b, me, 3) ?? freeNear(b, me, 2).slice(0, 2);
  raiseWall(b, me, line, 'light', ms(me, 5500), out);
  return true;
}

/** Skill 3 — Purging Scales: tips her golden scales — drains and shoves the healthiest foe within 4 tiles while healing and cleansing the worst-hurt ally. */
export function purgingScales(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const f = foesNear(b, me, 4).sort(toughest)[0];
  const ally = alliesOf(b, me).sort(hurtMost)[0] ?? me;
  if (!f) return false;
  strike(b, me, f, 1.35, out, true);
  if (f.alive) shove(b, me, f, 1, out);
  cleanse(b, ally);
  mendUnit(ally, Math.max(1, Math.round(atkOf(me) * 1.7 + ally.maxHp * 0.12)), out, me);
  return true;
}

/** Ultimate — Solar Tribunal: drags the three strongest foes within 5 tiles into a 4-tile Solar Court aura that burns foes and shields allies. */
export function solarTribunal(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const foes = foesNear(b, me, 6).sort(strongest).slice(0, 3);
  if (!foes.length) return false;
  moveMany(b, me, foes, 2, 'drag', out);
  for (const f of foes) {
    strike(b, me, f, 1.6, out, true);
    if (f.alive) burnFor(b, me, f, ultDur(me, 4000));
  }
  raiseAura(b, me, { what: 'Solar Tribunal', reach: 4, ms: ultDur(me, 8000), every: 1000, foe: { dmg: 0.4 * castPower(), ail: 'burn' }, ally: { guard: 0.2, heal: 0.05 } }, out);
  return true;
}

// ============================================================================
// 17. RELIQUARY SERAPH (Gabriela) — holy · guardian
// ============================================================================

/** Skill 1 — Halo Dive: dives up to 4 tiles onto a foe, stunning it for 1.2s, splashing the 3x3, and shielding nearby allies. */
export function haloDive(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  if (!charge(b, me, { tiles: reachOf(me, 4), route: 'leap', mult: 1.4, land: 0.65, stun: ms(me, 1200) }, out)) return false;
  const sh = Math.round(me.maxHp * 0.15);
  for (const a of alliesOf(b, me).filter((x) => apart(me, x) <= 2)) a.shield = { hp: sh, until: b.t + ms(me, 4000) };
  return true;
}

/** Skill 2 — Sanctuary Wings: beats her wings to shove foes within 2 tiles 2 tiles back and raises a 3-tile Wall of Light. */
export function sanctuaryWings(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const near = foesNear(b, me, 2);
  if (!near.length && !foesNear(b, me, 5).length) return false;
  for (const f of near) strike(b, me, f, 1.2, out);
  if (near.length) moveMany(b, me, near, 2, 'shove', out);
  const line = chokeLine(b, me, 3) ?? shieldLine(b, me, 3) ?? freeNear(b, me, 1).slice(0, 2);
  raiseWall(b, me, line, 'light', ms(me, 5000), out);
  return true;
}

/** Skill 3 — Mercy's Ascent: flies beside the most hurt ally within 5 tiles, healing and warding them and guarding both. */
export function mercysAscent(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const ally = alliesOf(b, me).filter((a) => a.hp < a.maxHp * 0.85).sort(hurtMost)[0];
  if (!ally) return false;
  if (ally !== me && apart(me, ally) <= 5) {
    const spot = freeNear(b, ally, 1)[0];
    if (spot) blinkTo(b, me, spot, out);
  }
  cleanse(b, ally);
  mendUnit(ally, Math.max(1, Math.round(atkOf(me) * 1.8 + ally.maxHp * 0.2)), out, me);
  ally.guardUntil = Math.max(ally.guardUntil ?? 0, b.t + ms(me, 3500));
  me.guardUntil = Math.max(me.guardUntil ?? 0, b.t + ms(me, 3500));
  return true;
}

/** Ultimate — Descent of the Host: soars and crashes down on the thickest crowd, launching adjacent foes 2 tiles out and healing all allies. */
export function descentOfTheHost(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const aim = crowd(b, me, (f) => apart(me, f) <= reachOf(me, 6)) ?? nearestFoe(b, me);
  if (!aim) return false;
  const spot = freeNear(b, aim, 1)[0];
  if (spot) leapTo(b, me, spot, out);
  const near = foesNear(b, me, 2);
  for (const f of near) strike(b, me, f, 1.6, out, true);
  if (near.length) moveMany(b, me, near, 2, 'launch', out);
  for (const a of alliesOf(b, me)) mendUnit(a, Math.round(a.maxHp * 0.22 * castPower()), out, me);
  raiseAura(b, me, { what: 'Reliquary Halo', reach: 3, ms: ultDur(me, 7000), every: 1000, ally: { guard: 0.25, heal: 0.05, ward: true } }, out);
  return true;
}

// ============================================================================
// 18. CORSAIR SURGEON (Tariq) — pirate · support
// ============================================================================

/** Skill 1 — Boarding Swing: swings on a rigging line up to 3 tiles to the most hurt ally, mending them and shoving the nearest foe back with a pistol shot. */
export function boardingSwing(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const ally = alliesOf(b, me).filter((a) => a.hp < a.maxHp * 0.9).sort(hurtMost)[0] ?? me;
  const f = foesNear(b, me, 4)[0];
  if (!f && ally.hp >= ally.maxHp * 0.9) return false;
  if (ally !== me && apart(me, ally) <= 3) {
    const spot = freeNear(b, ally, 1)[0];
    if (spot) leapTo(b, me, spot, out);
  }
  mendUnit(ally, Math.max(1, Math.round(atkOf(me) * 1.7 + ally.maxHp * 0.14)), out, me);
  const nearFoe = foesNear(b, me, 3)[0];
  if (nearFoe) {
    out.push({ kind: 'shot', by: me.id, to: nearFoe.id, shot: 'bullet', ms: 130 });
    strike(b, me, nearFoe, 1.25, out);
    if (nearFoe.alive) shove(b, me, nearFoe, 1, out);
  }
  return true;
}

/** Skill 2 — Sawbones Triage: stitches up the worst-hurt ally within 4 tiles, cleansing and hastening them. */
export function sawbonesTriage(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const ally = alliesOf(b, me).filter((a) => a.hp < a.maxHp * 0.85).sort(hurtMost)[0];
  if (!ally) return false;
  cleanse(b, ally);
  mendUnit(ally, Math.max(1, Math.round(atkOf(me) * 2.1 + ally.maxHp * 0.22)), out, me);
  ally.hasteUntil = Math.max(ally.hasteUntil ?? 0, b.t + ms(me, 3500));
  out.push({ kind: 'haste', to: ally.id, ms: ms(me, 3500) });
  return true;
}

/** Skill 3 — Grappling Extraction: hooks an endangered ally within 4 tiles, swaps them to safety, and drops a powder trap on the tile they left. */
export function grapplingExtraction(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const friend = mostAtRisk(b, me);
  if (!friend || friend === me || apart(me, friend) > 4 || !foesNear(b, friend, 2).length) return false;
  const old = { u: friend.u, v: friend.v };
  if (!swapPlaces(b, me, friend, out)) return false;
  friend.shield = { hp: Math.round(me.maxHp * 0.2), until: b.t + ms(me, 3500) };
  (b.traps ??= []).push({ u: old.u, v: old.v, side: me.side, by: me.id, until: b.t + ms(me, 7000), dmg: Math.round(atkOf(me) * 1.5), hold: ms(me, 1200) });
  out.push({ kind: 'trap', u: old.u, v: old.v, ms: ms(me, 7000) });
  return true;
}

/** Ultimate — Crimson Dispensary: swings to the heart of his crew, heals and cleanses all allies, and raises a Rum & Salt aura for 8s. */
export function crimsonDispensary(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  if (!foesOf(b, me).length) return false;
  for (const a of alliesOf(b, me)) {
    cleanse(b, a);
    mendUnit(a, Math.round(a.maxHp * 0.24 * castPower()), out, me);
  }
  raiseAura(b, me, { what: 'Crimson Dispensary', reach: 3, ms: ultDur(me, 8000), every: 1000, ally: { heal: 0.06, atk: 0.2, stamina: 3, mana: 5 } }, out);
  return true;
}

// ============================================================================
// 19. HARPOONER (Siku) — pirate · gunner
// ============================================================================

/** Skill 1 — Barbed Harpoon: hurls a heavy whaling harpoon at a foe within 5 tiles, dragging it up to 3 tiles towards him and bleeding it. */
export function barbedHarpoon(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const f = foesNear(b, me, reachOf(me, 5)).sort(farthest(me))[0];
  if (!f) return false;
  out.push({ kind: 'shot', by: me.id, to: f.id, shot: 'arrow', ms: 150 });
  strike(b, me, f, 1.5, out, true);
  if (f.alive) {
    bleedFor(b, me, f, 0.08, ms(me, 3500));
    pull(b, me, f, 3, out);
  }
  return true;
}

/** Skill 2 — Floe Slide: slides up to 3 tiles to a flanking perch and raises a 3-tile Wall of Ice that chills foes and shatters on slam. */
export function floeSlide(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  if (!foesNear(b, me, 6).length) return false;
  const safe = safeTile(b, me, 3);
  if (safe) leapTo(b, me, safe, out);
  const line = chokeLine(b, me, 3) ?? freeNear(b, me, 2).slice(0, 3);
  raiseWall(b, me, line, 'ice', ms(me, 6000), out);
  return true;
}

/** Skill 3 — Whaler's Reel: fires a tether into a foe and launches himself up to 3 tiles to slam it 2 tiles back (into any ice wall behind it). */
export function whalersReel(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  return charge(b, me, { tiles: reachOf(me, 3), route: 'leap', mult: 1.65, shove: 2, stun: ms(me, 1000) }, out);
}

/** Ultimate — Leviathan Line: harpoons up to three foes in turn, dragging each 3 tiles forward, chilling them, and calling a freezing wave. */
export function leviathanLine(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const foes = foesNear(b, me, reachOf(me, 6)).sort(farthest(me)).slice(0, 3);
  if (!foes.length) return false;
  for (const f of foes) {
    out.push({ kind: 'shot', by: me.id, to: f.id, shot: 'arrow', ms: 140 });
    strike(b, me, f, 1.65, out, true);
    if (f.alive) {
      pull(b, me, f, 3, out);
      chillFor(b, f, ultDur(me, 4000), false, false, me);
    }
  }
  const line = chokeLine(b, me, 3);
  if (line) raiseWall(b, me, line, 'ice', ultDur(me, 6000), out);
  return true;
}

// ============================================================================
// 20. SEA REAVER (Nakoa) — pirate · vanguard
// ============================================================================

/** Skill 1 — Breaker Rush: surfs a cresting wave up to 4 tiles through a line of foes, striking each and shoving the last hit. */
export function breakerRush(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  return charge(b, me, { tiles: reachOf(me, 4), route: 'line', through: true, mult: 1.5, shove: 1, haste: ms(me, 2000) }, out);
}

/** Skill 2 — Anchor Slam: leaps up to 3 tiles and brings his iron anchor down, launching the target 2 tiles into the air and splashing the 3x3. */
export function anchorSlam(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  return charge(b, me, { tiles: reachOf(me, 3), route: 'leap', mult: 1.65, launch: 2, land: 0.75 }, out);
}

/** Skill 3 — Riptide Undertow: yanks his anchor chain back, dragging all foes within 3 tiles 2 tiles towards him and gaining a tide-shield. */
export function riptideUndertow(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const foes = foesNear(b, me, 3);
  if (!foes.length) return false;
  moveMany(b, me, foes, 2, 'drag', out);
  for (const f of foes) strike(b, me, f, 1.3, out, true);
  me.shield = { hp: Math.round(me.maxHp * 0.22), until: b.t + ms(me, 4000) };
  return true;
}

/** Ultimate — Wrath of the Reef: rides a towering tsunami across a line of foes, launching adjacent foes 2 tiles aside and raising an ice reef. */
export function wrathOfTheReef(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  if (!charge(b, me, { tiles: reachOf(me, 6), route: 'line', through: true, mult: 2.1, launch: 2, land: 0.9 }, out)) {
    if (!charge(b, me, { tiles: reachOf(me, 5), route: 'leap', mult: 2.1, launch: 2, land: 0.9 }, out)) return false;
  }
  const adj = foesNear(b, me, 2);
  if (adj.length) moveMany(b, me, adj, 2, 'launch', out);
  const line = freeNear(b, me, 2).slice(0, 3);
  if (line.length) raiseWall(b, me, line, 'ice', ultDur(me, 6000), out);
  return true;
}
