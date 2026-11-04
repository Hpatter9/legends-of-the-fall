// The second batch of the twenty heroes (docs/notes/twenty-heroes.md): the War Drummer, the Banneret, the Geomancer, the Bell Warden and the
// Falconer. Their casts come from the owner's branch `feat/twenty-heroes-vampire` (`kits/twentyNew.ts` there), on main's toolkit; their rows
// are written in main's skill system (`kits/comingRow.ts`). No randomness: every choice is a fixed order (then by id).

import { tileAt } from '../board';
import { atkOf, defOf, unitAt, type Battle, type BattleEvent, type Unit } from '../battle';
import { BANNER_MULT, apart, castPower, crowd, durOf, foesOf, mendUnit, reachOf } from '../abilities';
import { addRes } from '../heroKits';
import { bleedFor, chillFor, shockFor, silenceFor, stunFor, ward, weakFor } from '../ailments';
import { blinkTo, burrow, canLand, charge, chokeLine, launch, leapTo, mostAtRisk, moveMany, pull, raiseAura, raiseWall, safeTile, shieldLine, shove, swapPlaces } from '../toolkit';
import { alliesOf, foesNear, freeNear, ms, nearestFoe, strike, strongest } from './common';
import { friendInDanger, sk, ult, type Row } from './comingRow';

const farthest = (me: Unit) => (x: Unit, y: Unit) => apart(me, y) - apart(me, x) || x.id - y.id;
const ultDur = (me: Unit, n: number) => durOf(me, Math.round(n * Math.sqrt(castPower())));

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
  // (the shield shows as a ward, as the roster's shields do: a heal of nothing on the friend)
  out.push({ kind: 'heal', to: friend.id, amount: 0, by: me.id });
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
// The guards' triggers (each guard's cast checks the same trigger the AI reads, as `kits/third.ts`'s do)
// ============================================================================

/** The Banneret's Rampart Drop and the Bell Warden's Sanctuary Vault: a friend within reach under 40% with a foe beside it. */
const rampartNeeded = friendInDanger(3, 0.4);
const vaultNeeded = friendInDanger(4, 0.4);
/** The Falconer's Gale Vault: she is under 35% with a foe within 2. */
const galeNeeded = (b: Battle, me: Unit): boolean => me.hp < me.maxHp * 0.35 && foesNear(b, me, 2).length > 0;

/** The five's kits as written. */
export function wave2Rows(): Record<string, Row> {
  return {
    warDrummer: {
      pool: 'stamina',
      role: 'A taiko master: thunder-beats that shove foes and drive his friends forward',
      passive: { name: 'Rhythm of War', text: 'His blows land 6% harder for each friend beside his foe (up to 3): the line strikes on the beat', gang: 0.06 },
      s1: { cls: 'strike', cost: 24, cd: 7000, skill: sk('Thunder Beat', 'Booms his taiko drum: the foes within 2 are struck, shocked and shoved a tile back, and the friends within 3 are hastened for 3s', 550, 'attack', thunderBeat) },
      s2: { cls: 'utility', cost: 26, cd: 16000, skill: sk('Marching Cadence', 'Beats a forward march: the friends within 3 gain a shield of 16% of his health for 4s, and those who fight up close dash up to 2 tiles at the foes', 550, 'attack2', marchingCadence) },
      s3: { cls: 'utility', cost: 22, cd: 18000, skill: sk('Resonant Leap', 'Leaps beside his friends and raises a Taiko Cadence round him for 6s: friends within 3 hit 15% harder and refill their pools, foes there are shocked', 550, 'attack2', resonantLeap) },
      ultimate: ult('Storm of Ten Thousand Drums', 'A thunder cadence over the field: every foe within 6 tiles is struck, shocked and shoved 2 tiles back; every friend is hastened and rallied, and those who fight up close charge', 800, tenThousandDrums, { rate: 1.0, power: 1.3 }),
    },
    banneret: {
      pool: 'stamina',
      role: 'A rampart warden: charges with the standard, drops ramparts and sweeps the line',
      passive: { name: 'Shield-Sister', text: 'Takes 6% less from each ally beside her (up to 3)', huddle: 0.06 },
      s1: { cls: 'strike', cost: 24, cd: 7000, skill: sk('Standard Charge', 'Charges up to 3 tiles along a path to strike and shove a foe, and rallies the friends within 2 (a quarter more attack for 4s)', 550, 'attack', standardCharge) },
      s2: { cls: 'guard', cost: 16, cd: 14000, more: { emergency: rampartNeeded }, skill: sk('Rampart Drop', 'When a friend within 3 falls under 40% with a foe beside it, she leaps beside it, shields them both and raises a Wall of Light 3 tiles across the foes\' way', 450, 'attack2', (b, me, out) => rampartNeeded(b, me) && rampartDrop(b, me, out)) },
      s3: { cls: 'heavy', cost: 30, cd: 12000, skill: sk('Phalanx Sweep', 'Sweeps her banner-lance round her: the foes within 2 are struck, pulled a tile in and stunned for 1s', 500, 'attack2', phalanxSweep) },
      ultimate: ult('Oriflamme of the Keep', 'Leaps to the heart of the fight, heals every friend for a fifth of its health, and raises the Oriflamme round her for 8s: friends within 3 take a quarter less, hit a fifth harder, heal and shrug off ailments', 800, oriflamme, { rate: 1.1, power: 1.3 }),
    },
    geomancer: {
      pool: 'mana',
      role: 'A crag-shaper: raises stone pillars, glides through the earth and pulls with lodestone',
      passive: { name: 'Jagged Bedrock', text: 'A fifth of the damage of a melee blow she takes is sent back', thorns: 0.2 },
      s1: { cls: 'strike', cost: 36, cd: 7000, skill: sk('Tectonic Shove', 'A stone pillar erupts under the strongest foe within 4: it is struck and thrown 2 tiles into the air, and a stone wall stands on its tile for 5s', 650, 'attack', tectonicShove) },
      s2: { cls: 'heavy', cost: 46, cd: 12000, skill: sk('Earthglide', 'Glides through the earth and erupts under a crowd of foes within 5: the foe there is thrown 2 tiles and its neighbours are struck; she is shielded for 5s', 650, 'attack2', earthglide) },
      s3: { cls: 'utility', cost: 36, cd: 14000, skill: sk('Lodestone Pull', 'Her staff turns lodestone: up to three foes within 4 are dragged 2 tiles towards her, struck and slowed for 3s', 600, 'attack2', lodestonePull) },
      ultimate: ult("Mountain's Embrace", 'Raises a Wall of Stone 4 tiles across the foes\' way, hurls crag-meteors on two foes, and shields every friend', 850, mountainsEmbrace, { rate: 1.15, power: 1.5 }),
    },
    bellWarden: {
      pool: 'stamina',
      role: 'A bronze keeper: slams his temple bell, tolls shockwaves and vaults to guard his friends',
      passive: { name: 'Temple Bronze', text: '18% of his blows ring on into a second foe beside the first', arc: 0.18 },
      s1: { cls: 'strike', cost: 26, cd: 7000, skill: sk('Bronze Slam', 'Leaps up to 3 tiles and slams his bronze bell down: the foe he lands on is stunned for 1.2s and the 3x3 is struck', 650, 'attack', bronzeSlam) },
      s2: { cls: 'heavy', cost: 30, cd: 11000, skill: sk('Echoing Toll', 'Rings his temple bell: the foes within 2 are struck, silenced for 1.5s and shoved 2 tiles back, and the friends within 3 are warded for 4s', 550, 'attack2', echoingToll) },
      s3: { cls: 'guard', cost: 16, cd: 14000, more: { emergency: vaultNeeded }, skill: sk('Sanctuary Vault', 'When a friend within 4 falls under 40% with a foe beside it, he swaps places with it (or blinks beside it), takes a fifth less for 4s, shields it, and the foes beside him must strike him', 450, 'defend', (b, me, out) => vaultNeeded(b, me) && sanctuaryVault(b, me, out)) },
      ultimate: ult('Midnight Knell', 'Leaps into the thickest crowd within 5 tiles, strikes and stuns the foes within 3, and tolls the Midnight Knell round him for 8s: foes there are slowed and shocked, friends take a quarter less', 850, midnightKnell, { rate: 1.2, power: 1.4 }),
    },
    falconer: {
      pool: 'stamina',
      role: 'A highland hawker: stoops her falcon on foes, gale-vaults to perches and pins her prey',
      passive: { name: 'Wind-Borne Talons', text: 'Her shots leave the foe bleeding from the talons', rider: { dot: 'bleed', share: 0.12, ms: 3000 } },
      s1: { cls: 'strike', cost: 24, cd: 6000, skill: sk('Falcon Stoop', 'Her falcon dives on the farthest foe within 6: it is struck, weakened for 3.5s and flushed a tile towards her', 500, 'attack', falconStoop) },
      s2: { cls: 'guard', cost: 14, cd: 12000, more: { emergency: galeNeeded }, skill: sk('Gale Vault', 'When she falls under 35% with a foe within 2, a gust shoves the foes beside her a tile back and she vaults to the safest tile within 3, hastened for 3.5s', 450, 'attack2', (b, me, out) => galeNeeded(b, me) && galeVault(b, me, out)) },
      s3: { cls: 'heavy', cost: 30, cd: 11000, skill: sk('Talon Snare', 'Steps to the highest tile within 2 and sends her falcon at the strongest foe within 6: struck, pinned for 1.5s and bleeding', 500, 'attack2', talonSnare) },
      ultimate: ult('Sky Hunt', 'Vaults to the safest tile within 3, is hastened, and calls three dives of falcons down on the foes', 750, skyHunt, { rate: 0.95, power: 1.5 }),
    },
  };
}
