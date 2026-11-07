// The Vampires' casts (docs/notes/twenty-heroes.md): each one's skill 1, 2 and 3 and its ultimate, brought from the owner's branch
// `feat/twenty-heroes-vampire` (`kits/twentyNew.ts` there) onto main's toolkit. Each is built from parts the game already has: the movement
// toolkit (charges, leaps, blinks, launches, shoves, drags, walls and auras), the ailments and the plain skill strike. No randomness: every
// choice is a fixed order (then by id).

import { atkOf, defOf, wayTo, type Battle, type BattleEvent, type Unit } from '../battle';
import { sk, ult, type Row } from './comingRow';
import { apart, castPower, crowd, durOf, foesOf, mendUnit, near3x3, reachOf } from '../abilities';
import { bleedFor, chillFor, curseFor, shockFor, silenceFor, stunFor } from '../ailments';
import {
  blinkStrike,
  blinkTo,
  charge,
  displace,
  launch,
  leapTo,
  pull,
  raiseAura,
  safeTile,
  shove,
} from '../toolkit';
import { alliesOf, foesNear, freeNear, ms, nearestFoe, strike, strongest } from './common';
import { before, bolt, cut, nearest } from './third';

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

/** Skill 3 — Mist Step (a jab): steps through a wisp of mist to the weakest foe within 2 and cuts it; it bleeds 3s. */
export function mistStep(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const f = foesNear(b, me, 2).sort(weakest).find((x) => blinkStrike(b, me, x, 0.9, out));
  if (!f) return false;
  if (f.alive) bleedFor(b, me, f, 0.08, ms(me, 3000));
  return true;
}

/** Ultimate — Banquet of Blood: he seizes the strongest foe within 3 and drinks deep (half of what he deals comes back to him); the foes beside
 *  it are cursed. One headline (the drink) and one rider (the curse), as the roster's ultimates are. */
export function banquetOfBlood(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const f = foesNear(b, me, 3).sort(strongest)[0];
  if (!f) return false;
  if (apart(me, f) > 1) {
    const spot = freeNear(b, f, 1).sort((x, y) => apart(me, x) - apart(me, y))[0];
    if (spot) leapTo(b, me, spot, out);
  }
  me.facing = wayTo(me, f);
  out.push({ kind: 'swing', by: me.id, to: f.id });
  const was = me.dealt ?? 0;
  strike(b, me, f, 5.0, out, true);
  const dealt = (me.dealt ?? 0) - was;
  if (dealt > 0) mendUnit(me, Math.max(1, Math.round(dealt * 0.5)), out, me);
  for (const x of foesOf(b, me)) if (x !== f && apart(x, f) <= 1) curseFor(b, me, x, ultDur(me, 4000));
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

/** Ultimate — Blood Tithe: every foe within 5 is struck and bleeds; every ally drinks back a tenth of its health. */
export function bloodTithe(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const foes = foesNear(b, me, reachOf(me, 5));
  if (!foes.length) return false;
  for (const f of foes) {
    out.push({ kind: 'arc', from: me.id, to: f.id });
    strike(b, me, f, 1.4, out, true);
    if (f.alive) bleedFor(b, me, f, 0.1, ultDur(me, 5000));
  }
  for (const a of alliesOf(b, me)) mendUnit(a, Math.round(a.maxHp * 0.1 * castPower()), out, me);
  return true;
}

// ============================================================================
// 3. STRIGOI (Sorin) — vampire · assassin (`nightstalker` is his key, kept for saves)
// ============================================================================

/** Skill 1 — Dusk Dive: swoops up to 5 tiles onto a back-line or weak foe, cutting it and silencing it for 1.5s; already in the thick of it, he
 *  cuts and silences the foe before him. */
export function duskDive(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const back = (f: Unit) => defOf(f).range >= 2;
  const ok = charge(b, me, { tiles: reachOf(me, 5), route: 'leap', mult: 1.6, only: back }, out) || charge(b, me, { tiles: reachOf(me, 5), route: 'leap', mult: 1.6 }, out);
  if (!ok) {
    // (with no foe to swoop on, already in the thick of it: he cuts the foe before him, and silences it)
    const f = foesNear(b, me, 1).sort(weakest)[0];
    if (!f) return false;
    me.facing = wayTo(me, f);
    out.push({ kind: 'swing', by: me.id, to: f.id });
    strike(b, me, f, 1.6, out);
    if (f.alive) silenceFor(b, f, ms(me, 1500), me);
    return true;
  }
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

/** Skill 3 — Echolocation (a jab): a bat-shriek at the nearest foe within 3: struck and shocked. */
export function echolocation(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const f = nearest(b, me, 3)[0];
  if (!f) return false;
  bolt(b, me, f, out, 0.85);
  if (f.alive) shockFor(b, me, f, ms(me, 2000));
  return true;
}

/** Ultimate — Belfry Swoop: Abduct grown: he seizes the strongest foe within 6, strikes it and carries it 4 tiles off towards his friends,
 *  where it is dropped and stunned for 2s. */
export function belfrySwoop(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const f = foesNear(b, me, reachOf(me, 6)).sort(strongest)[0];
  if (!f) return false;
  if (apart(me, f) > 1) {
    const spot = freeNear(b, f, 1).sort((x, y) => apart(me, x) - apart(me, y))[0];
    if (spot) blinkTo(b, me, spot, out);
  }
  me.facing = wayTo(me, f);
  out.push({ kind: 'swing', by: me.id, to: f.id });
  strike(b, me, f, 6.8, out, true);
  if (!f.alive) return true;
  const ally = alliesOf(b, me).filter((a) => a !== me).sort((x, y) => apart(f, x) - apart(f, y) || x.id - y.id)[0];
  displace(b, me, f, ally ? wayTo(f, ally) : (wayTo(me, f) + 2) % 4, 4, 'launch', out);
  if (f.alive) stunFor(b, f, ultDur(me, 2000), false, 'stun', me);
  return true;
}

// ============================================================================
// 4. BLOOD GARGOYLE (Gavril) — vampire · bulwark
// ============================================================================

/** Skill 1 — Gargoyle Crash: leaps up to 4 tiles onto a crowd, slamming the 3x3 and shoving adjacent foes a tile outward. */
export function gargoyleCrash(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  return charge(b, me, { tiles: reachOf(me, 4), route: 'leap', mult: 1.45, land: 0.75, shove: 1, stun: ms(me, 800) }, out);
}

/** Skill 2 — Stone Slumber: turns to living granite for 3s: he takes half damage, and the foes within 2 must strike him. */
export function stoneSlumber(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const near = foesNear(b, me, 2);
  if (!near.length) return false;
  const dur = ms(me, 3000);
  me.guardUntil = Math.max(me.guardUntil ?? 0, b.t + dur);
  for (const f of near) f.taunt = { to: me.id, until: b.t + dur };
  out.push({ kind: 'heal', to: me.id, amount: 0, by: me.id });
  return true;
}

/** Skill 3 — Granite Fist (a jab): a stone blow on the foe before him; it is slowed 1.5s. */
export function graniteFist(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const f = before(b, me);
  if (!f) return false;
  cut(b, me, f, out, 0.9);
  if (f.alive) chillFor(b, f, ms(me, 1500), false, false, me);
  return true;
}

/** Ultimate — Cathedral Perch: crashes down on the thickest crowd within 6 tiles and stuns the 3x3 for 2s. */
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

/** Skill 3 — Quick Bolt (a jab): a quick silver bolt at the nearest foe in reach; a foe under half its health takes half as much again. */
export function silverShot(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const f = nearest(b, me, reachOf(me, 5))[0];
  if (!f) return false;
  me.facing = wayTo(me, f);
  out.push({ kind: 'shot', by: me.id, to: f.id, shot: 'arrow', ms: 120 });
  strike(b, me, f, f.hp < f.maxHp * 0.5 ? 1.2 : 0.8, out);
  return true;
}

/** Ultimate — Silver Requiem: vaults to high ground and fires 5 silver stakes across the strongest foes, shoving each. */
export function silverRequiem(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const foes = foesNear(b, me, reachOf(me, 7)).sort(strongest);
  if (!foes.length) return false;
  const safe = safeTile(b, me, 3);
  if (safe) leapTo(b, me, safe, out);
  for (let i = 0; i < 5; i++) {
    const f = foes[i % foes.length];
    if (!f || !f.alive) continue;
    out.push({ kind: 'shot', by: me.id, to: f.id, shot: 'arrow', ms: 120 + i * 70 });
    strike(b, me, f, 1.35, out, true);
    if (f.alive) shove(b, me, f, 1, out);
  }
  return true;
}


// ============================================================================
// The guards' triggers (a guard is cast at once when its trigger holds, and its cast checks the same trigger, as `kits/third.ts`'s)
// ============================================================================

/** The Hemomancer's Crimson Mist: she is under 35% with a foe within 2. */
const mistNeeded = (b: Battle, me: Unit): boolean => me.hp < me.maxHp * 0.35 && foesNear(b, me, 2).length > 0;
/** The Dhampir's Grapple Vault: a foe within 2 of her. */
const vaultNeeded = (b: Battle, me: Unit): boolean => foesNear(b, me, 2).length > 0;
/** The Hemomancer's Blood Chalice is a heal: it waits for a friend within 5 under 40%. */
const chaliceNeeded = (b: Battle, me: Unit): boolean => b.units.some((a) => a.alive && a.side === me.side && a.hp < a.maxHp * 0.4 && apart(a, me) <= 5);

export const VAMPIRE_GUARDS = { mistNeeded, vaultNeeded, chaliceNeeded };

// ============================================================================
// The kits: each Vampire's skill 1 (its own skill, as every hero's old skill is in `KITS`), passive and ultimate, and its three slots
// ============================================================================

/** The five Vampires' kits as written. */
export function vampireRows(): Record<string, Row> {
  return {
    vampireLord: {
      pool: 'stamina',
      role: 'A blood-duellist: lunges through lines, impales and drinks deep',
      passive: { name: 'Noble Thirst', text: 'Heals for 15% of the damage his blows deal', leech: 0.15 },
      s1: { cls: 'strike', cost: 24, cd: 7000, skill: sk('Crimson Lunge', 'Dashes up to 4 tiles through a line of foes, cutting and bleeding each, and drinks a quarter of what he deals', 500, 'attack', crimsonLunge) },
      s2: { cls: 'heavy', cost: 30, cd: 11000, skill: sk('Impaling Thrust', 'Lunges up to 2 tiles at the strongest foe within 3, impaling it and throwing it 2 tiles into the air while drinking 35% of what he deals', 500, 'attack2', impalingThrust) },
      s3: { cls: 'jab', cost: 10, cd: 4000, skill: sk('Mist Step', 'Steps through a wisp of mist to the weakest foe within 2 and cuts it; it bleeds 3s', 350, 'attack', mistStep) },
      ultimate: ult('Banquet of Blood', 'Seizes the strongest foe within 3 and drinks deep, healing half of what he deals; the foes beside it are cursed', 750, banquetOfBlood, { rate: 1.2, power: 1.8 }),
    },
    hemomancer: {
      pool: 'mana',
      role: 'A blood weaver: tethers foes together, pours the chalice and glides in mist',
      passive: { name: 'Chalice Overflow', text: 'Every 3.5s pours a little of the chalice on the most hurt ally', mend: { every: 3500, share: 0.8 } },
      s1: { cls: 'strike', cost: 36, cd: 7000, skill: sk('Sanguine Lash', 'Whips a blood tether between the two nearest foes within 4, dragging the farther one 2 tiles towards the nearer and bleeding both', 600, 'attack', sanguineLash) },
      s2: { cls: 'utility', cost: 42, cd: 14000, more: { heals: true, emergency: chaliceNeeded }, skill: sk('Blood Chalice', 'Drains the strongest foe within 4 and pours the chalice over the most hurt ally, mending it and hastening it for 3s', 600, 'attack2', bloodChalice) },
      s3: { cls: 'guard', cost: 30, cd: 15000, more: { emergency: mistNeeded }, skill: sk('Crimson Mist', 'When she falls under 35% with a foe within 2, she glides in blood-mist to the safest tile within 3, leaving a boiling Blood Pool on her old tile for 5s that slows and bleeds foes', 450, 'defend', (b, me, out) => mistNeeded(b, me) && crimsonMist(b, me, out)) },
      ultimate: ult('Blood Tithe', 'Every foe within 5 tiles is struck and bleeds, and every ally drinks back a tenth of its health', 800, bloodTithe, { rate: 0.9, power: 1.4 }),
    },
    nightstalker: {
      pool: 'stamina',
      role: 'A winged night-hunter: swoops from the dark and carries his prey off',
      passive: { name: 'Predator of the Crypt', text: 'Blows deal 25% more to shooters', prey: 1.25 },
      s1: { cls: 'strike', cost: 22, cd: 6000, skill: sk('Dusk Dive', 'Swoops up to 5 tiles onto a back-line foe (or any, with none), cutting it and silencing it for 1.5s; in the thick of it, he cuts and silences the foe before him', 450, 'attack', duskDive) },
      s2: { cls: 'heavy', cost: 30, cd: 14000, skill: sk('Abduct', 'Snatches the weakest foe within 2 into the air and flings it 2 tiles towards his friends, stunned for 1.2s', 500, 'attack2', abduct) },
      s3: { cls: 'jab', cost: 10, cd: 4000, skill: sk('Echolocation', 'A bat-shriek at the nearest foe within 3: struck and shocked 2s', 350, 'attack', echolocation) },
      ultimate: ult('Belfry Swoop', 'Seizes the strongest foe within 6 tiles and carries it 4 tiles off towards his friends, where it is dropped and stunned for 2s', 700, belfrySwoop, { rate: 1.3, power: 1.9 }),
    },
    bloodGargoyle: {
      pool: 'stamina',
      role: 'A stone sentinel: crashes down from the eaves, turns to granite and will not be moved',
      passive: { name: 'Granite Hide', text: 'Blows from the front lose 30%', block: 0.3 },
      s1: { cls: 'strike', cost: 26, cd: 7000, skill: sk('Gargoyle Crash', 'Leaps up to 4 tiles onto a crowd: the 3x3 is struck, the foe he lands on is stunned 0.8s, and the foes beside him are shoved a tile out', 600, 'attack', gargoyleCrash) },
      s2: { cls: 'utility', cost: 26, cd: 18000, skill: sk('Stone Slumber', 'Turns to living granite for 3s: he takes half damage, and the foes within 2 must strike him', 550, 'defend', stoneSlumber) },
      s3: { cls: 'jab', cost: 10, cd: 3500, skill: sk('Granite Fist', 'A stone blow on the foe before him; it is slowed 1.5s', 350, 'attack', graniteFist) },
      ultimate: ult('Cathedral Perch', 'Crashes down from on high on the thickest crowd within 6 tiles, stunning the 3x3 for 2s', 800, cathedralPerch, { rate: 1.25, power: 1.5 }),
    },
    dhampir: {
      pool: 'stamina',
      role: 'A silver-bolt hunter: vaults clear and pins foes to stone',
      passive: { name: 'Half-Blood Hunter', text: 'Bolts deal 20% more to foes 4 or more tiles away', far: 0.2 },
      s1: { cls: 'strike', cost: 24, cd: 7000, skill: sk('Silver Stake', 'A heavy silver bolt at the strongest foe within 5 shoves it 2 tiles back; if it slams into a wall or a fighter it is pinned for 1.8s', 500, 'attack', silverStake) },
      s2: { cls: 'guard', cost: 16, cd: 14000, more: { emergency: vaultNeeded }, skill: sk('Grapple Vault', 'With a foe within 2, she hooks a grapple to the safest tile within 3 and vaults there, then looses two silver bolts at the nearest foes, each bleeding', 450, 'attack', (b, me, out) => vaultNeeded(b, me) && grappleVault(b, me, out)) },
      s3: { cls: 'jab', cost: 10, cd: 3500, skill: sk('Quick Bolt', 'A quick silver bolt at the nearest foe in reach; a foe under half its health takes half as much again', 350, 'attack', silverShot) },
      ultimate: ult('Silver Requiem', 'Vaults to the safest tile within 3 and fires five silver stakes across the strongest foes within 7 tiles, shoving each', 750, silverRequiem, { rate: 1.0, power: 1.6 }),
    },
  };
}
