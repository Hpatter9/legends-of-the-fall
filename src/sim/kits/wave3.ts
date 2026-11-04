// The third batch of the twenty heroes (docs/notes/twenty-heroes.md): the Astral Sphinx, the Mirage Dancer, the Plague Doctor, the Bombardier
// and the Astrologer. Their casts come from the owner's branch `feat/twenty-heroes-vampire` (`kits/twentyNew.ts` there), on main's toolkit;
// their rows are written in main's skill system (`kits/comingRow.ts`). No randomness: every choice is a fixed order (then by id).

import { addUnit, atkOf, unitAt, wayTo, type Battle, type BattleEvent, type Unit } from '../battle';
import { apart, castPower, crowd, durOf, foesOf, mendUnit, near3x3, reachOf } from '../abilities';
import { bleedFor, burnFor, charmFor, chillFor, cleanse, poisonFor, silenceFor, weakFor } from '../ailments';
import { blinkStrike, blinkTo, chokeLine, displace, laneLine, launch, leapTo, moveMany, raiseAura, raiseWall, safeTile, shove, swapPlaces, teleportSlash } from '../toolkit';
import { alliesOf, foesNear, freeNear, ms, strike, strongest } from './common';
import { before, bolt, cut, nearest } from './third';
import { sk, ult, type Row } from './comingRow';

const weakest = (x: Unit, y: Unit) => x.hp - y.hp || x.id - y.id;
const farthest = (me: Unit) => (x: Unit, y: Unit) => apart(me, y) - apart(me, x) || x.id - y.id;
const hurtMost = (x: Unit, y: Unit) => x.hp / x.maxHp - y.hp / y.maxHp || x.id - y.id;
const ultDur = (me: Unit, n: number) => durOf(me, Math.round(n * Math.sqrt(castPower())));

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

/** Skill 3 — Riddling Glance (a jab): a riddle in a glance at the nearest foe within 3: struck, and confused for 1s. */
export function riddlingGlance(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const f = nearest(b, me, 3)[0];
  if (!f) return false;
  bolt(b, me, f, out, 0.8);
  if (f.alive) charmFor(b, f, ms(me, 1000), me);
  return true;
}

/** Ultimate — The Last Riddle: every foe within 5 tiles is struck and silenced for 2.5s, none of them able to answer. */
export function lastRiddle(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const foes = foesNear(b, me, 5);
  if (!foes.length) return false;
  for (const f of foes) {
    out.push({ kind: 'arc', from: me.id, to: f.id });
    strike(b, me, f, 1.65, out, true);
    if (f.alive) silenceFor(b, f, ultDur(me, 2500), me);
  }
  return true;
}

// ============================================================================
// 12. MIRAGE DANCER (Zahara) — frontier · trickster
// ============================================================================

/** Skill 1 — Whirling Veils: spins on the spot, cutting the foes within 1, and leaves a sand mirage on a free tile beside her for 4.5s. */
export function whirlingVeils(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const near = foesNear(b, me, 1);
  if (!near.length) return false;
  for (const f of near) {
    out.push({ kind: 'swing', by: me.id, to: f.id });
    strike(b, me, f, 1.5, out);
  }
  const spot = freeNear(b, me, 1)[0];
  if (spot && !unitAt(b, spot.u, spot.v)) {
    const d = addUnit(b, 'decoy', spot.u, spot.v);
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

/** Skill 3 — Veil Flick (a jab): a flick of her sand-heavy veil at the foe before her; it is weakened for 1.5s. */
export function veilFlick(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const f = before(b, me);
  if (!f) return false;
  cut(b, me, f, out, 0.85);
  if (f.alive) weakFor(b, f, ms(me, 1500), me);
  return true;
}

/** Ultimate — Dance of Seven Mirages: a 5-hop slash through the foes, bleeding each, and two sand mirages left behind. */
export function sevenMirages(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const hit = teleportSlash(b, me, { k: 5, reach: reachOf(me, 6), mult: 1.7, order: weakest }, out);
  if (!hit.length) return false;
  for (const f of hit) {
    if (!f.alive) continue;
    bleedFor(b, me, f, 0.08, ultDur(me, 3500));
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

/** Ultimate — Black Miasma: strikes and poisons every foe within 4, and raises a Black Miasma round him for 8s that poisons the foes there. */
export function blackMiasma(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const foes = foesNear(b, me, 4);
  if (!foes.length) return false;
  for (const f of foes) {
    strike(b, me, f, 1.3, out, true);
    if (f.alive) poisonFor(b, me, f);
  }
  raiseAura(b, me, { what: 'Black Miasma', reach: 4, ms: ultDur(me, 8000), every: 1000, foe: { dmg: 0.35 * castPower(), ail: 'poison' } }, out);
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

/** Ultimate — Shell Storm: rocket-jumps to high ground and rains 4 concussion mortar salvos across the field. */
export function shellStorm(b: Battle, me: Unit, out: BattleEvent[]): boolean {
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
// 15. ASTROLOGER (Cyra) — royal · arcanist
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

/** Skill 3 — Star Dart (a jab): a mote of starlight at the nearest foe within 4; it is slowed 1s. */
export function starDart(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const f = nearest(b, me, 4)[0];
  if (!f) return false;
  bolt(b, me, f, out, 0.85);
  if (f.alive) chillFor(b, f, ms(me, 1000), false, false, me);
  return true;
}

/** Ultimate — Supernova Alignment: pulls foes within 6 tiles together and drops two twin supernovas on them (the gravity is hers: she keeps the one pull-in of the twenty's ultimates that drags a crowd). */
export function supernovaAlignment(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const aim = crowd(b, me, (f) => apart(me, f) <= reachOf(me, 6)) ?? foesOf(b, me)[0];
  if (!aim) return false;
  for (const f of foesOf(b, me).filter((x) => apart(x, aim) <= 4)) {
    if (f !== aim) displace(b, me, f, wayTo(f, aim), 2, 'drag', out);
  }
  for (let i = 0; i < 2; i++) {
    b.pending.push({ at: b.t + 600 + i * 350, kind: 'meteor', by: me.id, to: aim.id, dmg: atkOf(me) * 2.4, heavy: true, u: aim.u, v: aim.v });
    out.push({ kind: 'area', by: me.id, id: 'meteor', u: aim.u, v: aim.v, ms: 600 + i * 350 });
  }
  return true;
}


// ============================================================================
// The guards' and heals' triggers (each guard's cast checks the same trigger the AI reads, as `kits/third.ts`'s do)
// ============================================================================

/** The Astrologer's Retrograde Orbit: she is under 35% with a foe within 2. */
const orbitNeeded = (b: Battle, me: Unit): boolean => me.hp < me.maxHp * 0.35 && foesNear(b, me, 2).length > 0;
/** The Bombardier's Blast Jump: a foe within 2 of him (he fights from range, and gets clear). */
const blastNeeded = (b: Battle, me: Unit): boolean => foesNear(b, me, 2).length > 0;
/** The Plague Doctor's Crow Step is a heal: it waits for a friend within 5 under 40%. */
const crowNeeded = (b: Battle, me: Unit): boolean => b.units.some((a) => a.alive && a.side === me.side && a.hp < a.maxHp * 0.4 && apart(a, me) <= 5);

/** The five's kits as written. */
export function wave3Rows(): Record<string, Row> {
  return {
    astralSphinx: {
      pool: 'mana',
      role: 'A star-lioness: pounces across rifts and confounds her foes with riddles',
      passive: { name: 'Starlit Wings', text: 'Slips 15% of blows', dodge: 0.15 },
      s1: { cls: 'strike', cost: 36, cd: 9000, skill: sk('Rift Pounce', 'Steps through a star-rift behind the strongest foe within 4 and strikes it; the other foes beside her are shoved a tile away', 550, 'attack', riftPounce) },
      s2: { cls: 'heavy', cost: 44, cd: 14000, skill: sk('Riddle of Repulsion', 'Puts a riddle to the strongest foe within 4: it is struck, silenced for 2s and thrown 3 tiles away', 550, 'attack2', riddleOfRepulsion) },
      s3: { cls: 'jab', cost: 14, cd: 3500, skill: sk('Riddling Glance', 'A riddle in a glance at the nearest foe within 3: struck, and confused for 1s', 350, 'attack', riddlingGlance) },
      ultimate: ult('The Last Riddle', 'Every foe within 5 tiles is struck and silenced for 2.5s, none of them able to answer', 800, lastRiddle, { rate: 1.05, power: 1.5 }),
    },
    mirageDancer: {
      pool: 'stamina',
      role: 'A dune-dancer: spins in the melee and trades places with her mirages',
      passive: { name: 'Desert Shimmer', text: 'Slips 18% of blows', dodge: 0.18 },
      s1: { cls: 'strike', cost: 24, cd: 7000, skill: sk('Whirling Veils', 'Spins on the spot, cutting the foes beside her, and leaves a sand mirage on a tile beside her for 4.5s', 450, 'attack', whirlingVeils) },
      s2: { cls: 'heavy', cost: 30, cd: 11000, skill: sk('Dune Swap', 'Trades places with her sand mirage (or the farthest foe within 4) and cuts and weakens every foe beside her as she arrives', 500, 'attack2', duneSwap) },
      s3: { cls: 'jab', cost: 10, cd: 3500, skill: sk('Veil Flick', 'A flick of her sand-heavy veil at the foe before her; it is weakened for 1.5s', 300, 'attack', veilFlick) },
      ultimate: ult('Dance of Seven Mirages', 'Slashes through five foes within 6 tiles in turn, bleeding each, and leaves two sand mirages behind', 700, sevenMirages, { rate: 1.25, power: 1.7 }),
    },
    plagueDoctor: {
      pool: 'mana',
      role: 'An ash-apothecary: swings his censer, steps as crows to mend friends and raises thorn quarantines',
      passive: { name: 'Ash Apothecary', text: 'His blows lay a curse that eats at the foe', ignite: { kind: 'curse', dmg: 3, every: 500, ms: 2000 } },
      s1: { cls: 'strike', cost: 36, cd: 7000, skill: sk('Censer Swing', 'Swings his smoking censer: the foes beside him are shoved 2 tiles back, and the thickest crowd within 4 is struck and poisoned on a 3x3', 600, 'attack', censerSwing) },
      s2: { cls: 'utility', cost: 40, cd: 14000, more: { heals: true, emergency: crowNeeded }, skill: sk('Crow Step', 'Scatters into ash-crows and comes together on the safest tile within 3, cleansing and mending the most hurt friend', 560, 'attack2', crowStep) },
      s3: { cls: 'utility', cost: 34, cd: 16000, skill: sk('Quarantine Line', 'Raises a Wall of Thorns 3 tiles across the foes\' way for 6s and drags the nearest foe into the brambles', 600, 'attack2', quarantineLine) },
      ultimate: ult('Black Miasma', 'Strikes and poisons every foe within 4, and raises a Black Miasma round him for 8s that poisons the foes there', 800, blackMiasma, { rate: 0.95, power: 1.4 }),
    },
    bombardier: {
      pool: 'stamina',
      role: 'An iron alchemist: rocket-jumps over the fray, lobs concussion shells and lays firebombs',
      passive: { name: 'Shrapnel Shells', text: 'Shells also strike the foe behind the target for 40%', through: 0.4 },
      s1: { cls: 'strike', cost: 24, cd: 7000, skill: sk('Concussion Mortar', 'A heavy shell on the thickest crowd within 6: the foe at its heart is thrown 2 tiles, the others round it struck and shoved a tile out', 600, 'attack', concussionMortar) },
      s2: { cls: 'guard', cost: 16, cd: 12000, more: { emergency: blastNeeded }, skill: sk('Blast Jump', 'With a foe within 2, a charge at his feet burns and shoves the foes beside him; he rocket-jumps to the safest tile within 3 and fires at the nearest foe', 500, 'attack2', (b, me, out) => blastNeeded(b, me) && blastJump(b, me, out)) },
      s3: { cls: 'utility', cost: 22, cd: 16000, skill: sk('Firebomb Line', 'Skids a tile back and lays a Wall of Fire 3 tiles across the lane most foes are walking, for 6s', 550, 'attack2', firebombLine) },
      ultimate: ult('Shell Storm', 'Rocket-jumps to the safest tile within 3 and rains four salvos of shells across the foes', 850, shellStorm, { rate: 0.9, power: 1.6 }),
    },
    astrologer: {
      pool: 'mana',
      role: 'A star-keeper: pulls foes into gravity wells and glides along orbits',
      passive: { name: 'Chart of the Heavens', text: 'Her starlight deals 25% more to foes 4 or more tiles away', far: 0.25 },
      s1: { cls: 'strike', cost: 36, cd: 7000, skill: sk('Gravity Well', 'A star collapses on the thickest crowd within 5: the foes within 3 of it are dragged 2 tiles in and struck', 650, 'attack', gravityWell) },
      s2: { cls: 'guard', cost: 30, cd: 14000, more: { emergency: orbitNeeded }, skill: sk('Retrograde Orbit', 'When she falls under 35% with a foe within 2, she strikes the nearest foe, flings it 2 tiles back and slows it, and glides to the safest tile within 3', 450, 'attack2', (b, me, out) => orbitNeeded(b, me) && retrogradeOrbit(b, me, out)) },
      s3: { cls: 'jab', cost: 13, cd: 3000, skill: sk('Star Dart', 'A mote of starlight at the nearest foe within 4; it is slowed 1s', 350, 'attack', starDart) },
      ultimate: ult('Supernova Alignment', 'Drags the foes within 4 of the thickest crowd 2 tiles together, then drops two supernovas on it', 850, supernovaAlignment, { rate: 0.95, power: 1.5 }),
    },
  };
}
