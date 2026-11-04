// The fourth batch of the twenty heroes (docs/notes/twenty-heroes.md): the Inquisitor, the Seraph, the Corsair Surgeon, the Harpooner and the
// Sea Reaver. Their casts come from the owner's branch `feat/twenty-heroes-vampire` (`kits/twentyNew.ts` there), on main's toolkit; their
// rows are written in main's skill system (`kits/comingRow.ts`). No randomness: every choice is a fixed order (then by id).

import { atkOf, type Battle, type BattleEvent, type Unit } from '../battle';
import { apart, castPower, crowd, durOf, foesOf, mendUnit, reachOf } from '../abilities';
import { bleedFor, burnFor, chillFor, cleanse, stunFor } from '../ailments';
import { blinkTo, charge, chokeLine, leapTo, moveMany, pull, raiseAura, raiseWall, safeTile, shieldLine, shove, swapPlaces } from '../toolkit';
import { alliesOf, foesNear, freeNear, ms, nearestFoe, strike, strongest, toughest } from './common';
import { REVIVE, type ReviveFace } from './revive';
import { sk, ult, type Row } from './comingRow';

const farthest = (me: Unit) => (x: Unit, y: Unit) => apart(me, y) - apart(me, x) || x.id - y.id;
const hurtMost = (x: Unit, y: Unit) => x.hp / x.maxHp - y.hp / y.maxHp || x.id - y.id;
const ultDur = (me: Unit, n: number) => durOf(me, Math.round(n * Math.sqrt(castPower())));

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
// 17. SERAPH (Gabriela) — holy · guardian
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
  // (a friend, never himself: the most hurt within 4 with a foe within 2 of it)
  const friend = alliesOf(b, me).filter((a) => a !== me && apart(me, a) <= 4 && foesNear(b, a, 2).length > 0).sort(hurtMost)[0];
  if (!friend) return false;
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

// ============================================================================
// The heals', guards' and revives' cases (each guard's cast checks the same trigger the AI reads, as `kits/third.ts`'s do)
// ============================================================================

/** A heal waits for a friend within 5 under 40%. */
const healNeeded = (b: Battle, me: Unit): boolean => b.units.some((a) => a.alive && a.side === me.side && a.hp < a.maxHp * 0.4 && apart(a, me) <= 5);
/** The Inquisitor's Purging Scales: a friend within 5 under 40%. */
const scalesNeeded = healNeeded;
/** The Corsair Surgeon's Grappling Extraction: a friend within 4 (not himself) under 40% with a foe beside it. */
const extractNeeded = (b: Battle, me: Unit): boolean =>
  b.units.some((a) => a.alive && a !== me && a.side === me.side && a.owner === undefined && apart(a, me) <= 4 && a.hp < a.maxHp * 0.4 && foesNear(b, a, 1).length > 0);

/** A healer's revive face, as `kits/revive.ts` writes the four roster healers' (its cast is never called: `castRevive` does the work). */
const face = (name: string, text: string): ReviveFace => ({
  skill: { name, key: `Revive: ${name}`, text, need: 100, dealt: 0, taken: 0, perSec: 0, castMs: REVIVE.CAST_MS, anim: 'attack2', cast: () => false },
});

/** The five's kits as written. */
export function wave4Rows(): Record<string, Row> {
  return {
    inquisitor: {
      pool: 'mana',
      role: 'A sun-judge: chains the wicked in place, raises blazing edicts and tips the scales',
      passive: { name: 'Sun-Forged Verdict', text: 'Her shots set the foe burning', ignite: { kind: 'burn', dmg: 3, every: 500, ms: 2000 } },
      s1: { cls: 'strike', cost: 36, cd: 7000, skill: sk('Chains of Judgement', 'Hurls solar chains at the strongest foe within 5: it is struck, dragged 2 tiles towards her, stunned for 1.2s and burning', 600, 'attack', chainsOfJudgement) },
      s2: { cls: 'utility', cost: 36, cd: 16000, skill: sk('Blazing Edict', 'Leaps to the safest tile within 2 and raises a Wall of Light 3 tiles across the foes\' way for 5.5s', 550, 'attack2', blazingEdict) },
      s3: { cls: 'guard', cost: 30, cd: 15000, more: { heals: true, emergency: scalesNeeded }, skill: sk('Purging Scales', 'When a friend within 5 falls under 40%, she tips her golden scales: the healthiest foe within 4 is struck and shoved a tile, and the most hurt friend is cleansed and mended', 450, 'attack2', (b, me, out) => scalesNeeded(b, me) && purgingScales(b, me, out)) },
      ultimate: ult('Solar Tribunal', 'Drags the three strongest foes within 6 tiles 2 tiles in, strikes them and sets them burning, and raises a Solar Tribunal round her for 8s: foes there burn, friends take a fifth less and heal', 800, solarTribunal, { rate: 1.0, power: 1.5 }),
    },
    seraph: {
      pool: 'mana',
      role: 'A winged guardian: dives on the wicked, lifts her friends up and raises the fallen',
      passive: { name: 'Reliquary Halo', text: 'Allies within 2 tiles (and she) take 6% less from every blow', halo: 0.06 },
      s1: { cls: 'strike', cost: 36, cd: 7000, skill: sk('Halo Dive', 'Dives up to 4 tiles onto a foe: it is stunned for 1.2s, the 3x3 is struck, and the friends within 2 of her are shielded for 4s', 550, 'attack', haloDive) },
      s2: { cls: 'utility', cost: 42, cd: 14000, more: { heals: true, emergency: healNeeded, revive: face('Reliquary Grace', 'Golden wings enfold the nearest fallen friend: it rises at 30% health, cleansed (once every 30s; each friend once a wave)') }, skill: sk("Mercy's Ascent", 'Flies beside the most hurt friend within 5, cleanses and mends it, and both take a fifth less for 3.5s', 550, 'attack2', mercysAscent) },
      s3: { cls: 'utility', cost: 34, cd: 16000, skill: sk('Sanctuary Wings', 'Her wings beat: the foes within 2 are struck and shoved 2 tiles back, and a Wall of Light rises 3 tiles across their way for 5s', 550, 'attack2', sanctuaryWings) },
      ultimate: ult('Descent of the Host', 'Crashes down on the thickest crowd within 6 tiles, throwing the foes round her 2 tiles out, mends every friend, and raises a Reliquary Halo round her for 7s', 850, descentOfTheHost, { rate: 1.05, power: 1.3 }),
    },
    corsairSurgeon: {
      pool: 'mana',
      role: 'A reef sawbones: swings in by rope to mend friends, stitches wounds and hooks his friends clear',
      passive: { name: 'Field Sawbones', text: 'Every 3s stitches up the most hurt ally', mend: { every: 3000, share: 0.9 } },
      s1: { cls: 'strike', cost: 36, cd: 7000, more: { heals: true }, skill: sk('Boarding Swing', 'Swings on a rigging line beside the most hurt friend within 3 and mends it, and his pistol shoves the nearest foe a tile back', 550, 'attack', boardingSwing) },
      s2: { cls: 'utility', cost: 40, cd: 12000, more: { heals: true, emergency: healNeeded, revive: face('Smelling Salts', 'A sharp draught wakes the nearest fallen friend: it rises at 30% health, cleansed (once every 30s; each friend once a wave)') }, skill: sk('Sawbones Triage', 'Stitches up the most hurt friend: cleansed, mended and hastened for 3.5s', 550, 'attack2', sawbonesTriage) },
      s3: { cls: 'guard', cost: 30, cd: 15000, more: { emergency: extractNeeded }, skill: sk('Grappling Extraction', 'When a friend within 4 falls under 40% with a foe beside it, he hooks it out: they trade places, it is shielded, and a powder trap waits on the tile it left', 450, 'attack2', (b, me, out) => extractNeeded(b, me) && grapplingExtraction(b, me, out)) },
      ultimate: ult('Crimson Dispensary', 'Cleanses every friend and mends it for a quarter of its health, and raises a Rum and Salt round him for 8s: friends there heal, hit a fifth harder and refill their pools', 800, crimsonDispensary, { rate: 0.9, power: 1.2 }),
    },
    harpooner: {
      pool: 'stamina',
      role: 'A floe whaler: reels distant prey in on a barbed line, slides on the ice and slams his catch',
      passive: { name: 'Chill-Iron Barbs', text: 'Harpoons deal 20% more to a foe under half health', finish: { under: 0.5, mult: 1.2 } },
      s1: { cls: 'strike', cost: 24, cd: 7000, skill: sk('Barbed Harpoon', 'Hurls a whaling harpoon at the farthest foe within 5: it is struck, bleeds and is dragged up to 3 tiles towards him', 550, 'attack', barbedHarpoon) },
      s2: { cls: 'utility', cost: 22, cd: 16000, skill: sk('Floe Slide', 'Slides to the safest tile within 3 and raises a Wall of Ice 3 tiles across the foes\' way for 6s', 550, 'attack2', floeSlide) },
      s3: { cls: 'heavy', cost: 30, cd: 11000, skill: sk("Whaler's Reel", 'Reels himself up to 3 tiles onto a foe: it is struck, stunned for 1s and slammed 2 tiles back', 500, 'attack2', whalersReel) },
      ultimate: ult('Leviathan Line', 'Harpoons the three farthest foes within 6 tiles in turn, each struck, dragged 3 tiles in and slowed, and raises a Wall of Ice', 800, leviathanLine, { rate: 1.1, power: 1.6 }),
    },
    seaReaver: {
      pool: 'stamina',
      role: 'A hull-breaker: rides a cresting wave into the line, slams his anchor and drags foes in',
      passive: { name: 'Rising Tide', text: 'Attack grows by up to 60% as his health falls', rage: 0.6 },
      s1: { cls: 'strike', cost: 24, cd: 7000, skill: sk('Breaker Rush', 'Surfs a cresting wave up to 4 tiles through a line of foes, striking each and shoving the last, and is hastened for 2s', 500, 'attack', breakerRush) },
      s2: { cls: 'heavy', cost: 32, cd: 12000, skill: sk('Anchor Slam', 'Leaps up to 3 tiles and brings his anchor down: the foe there is thrown 2 tiles into the air and the 3x3 is struck', 550, 'attack2', anchorSlam) },
      s3: { cls: 'utility', cost: 22, cd: 16000, skill: sk('Riptide Undertow', 'Hauls his anchor chain in: the foes within 3 are dragged 2 tiles towards him and struck, and a tide-shield of 22% of his health holds for 4s', 500, 'attack2', riptideUndertow) },
      ultimate: ult('Wrath of the Reef', 'Surfs a towering wave through a line of foes (or leaps on them), throwing the foes round him 2 tiles aside, and raises a reef of ice', 750, wrathOfTheReef, { rate: 1.25, power: 1.8 }),
    },
  };
}
