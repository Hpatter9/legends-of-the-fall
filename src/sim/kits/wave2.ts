// The second batch of the twenty heroes (docs/notes/twenty-heroes.md): the War Drummer, the Banneret, the Geomancer, the Bell Warden and the
// Falconer. Their casts come from the owner's branch `feat/twenty-heroes-vampire` (`kits/twentyNew.ts` there), on main's toolkit; their rows
// are written in main's skill system (`kits/comingRow.ts`). No randomness: every choice is a fixed order (then by id).

import { tileAt } from '../board';
import { atkOf, defOf, wayTo, type Battle, type BattleEvent, type Unit } from '../battle';
import { BANNER_MULT, apart, castPower, durOf, foesOf, mendUnit, reachOf } from '../abilities';
import { bleedFor, chillFor, shockFor, silenceFor, stunFor, ward, weakFor } from '../ailments';
import { blinkTo, charge, chokeLine, launch, leapTo, mostAtRisk, moveMany, pull, raiseAura, raiseWall, safeTile, shove, swapPlaces } from '../toolkit';
import { alliesOf, foesNear, freeNear, ms, strike, strongest } from './common';
import { before, cut } from './third';
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

/** Skill 3 — Drum Strike (a jab): cracks his drumstick on the foe before him; it is shocked. */
export function drumStrike(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const f = before(b, me);
  if (!f) return false;
  cut(b, me, f, out, 0.9);
  if (f.alive) shockFor(b, me, f, ms(me, 1500));
  return true;
}

/** Ultimate — Ten Thousand Drums: every foe within 6 tiles is struck and shoved 2 tiles back, and every friend is hastened. */
export function tenThousandDrums(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const foes = foesNear(b, me, 6);
  if (!foes.length) return false;
  for (const f of foes) strike(b, me, f, 1.3, out, true);
  moveMany(b, me, foes.filter((f) => f.alive), 2, 'shove', out);
  const dur = ultDur(me, 5000);
  for (const a of alliesOf(b, me)) {
    a.hasteUntil = Math.max(a.hasteUntil ?? 0, b.t + dur);
    out.push({ kind: 'haste', to: a.id, ms: dur });
  }
  out.push({ kind: 'song', by: me.id, ms: 900 });
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

/** Skill 2 — Phalanx Sweep: sweeps her halberd-banner to pull foes within 2 tiles together in front of her and stun them for 1s. */
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

/** Skill 3 — Banner Jab (a jab): a jab of the banner-lance at the foe before her; it is weakened 2s. */
export function bannerJab(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const f = before(b, me);
  if (!f) return false;
  cut(b, me, f, out, 0.9);
  if (f.alive) weakFor(b, f, ms(me, 2000), me);
  return true;
}

/** Ultimate — Oriflamme of the Keep: heals every friend for a fifth of its health and raises the Oriflamme round her for 8s, under which
 *  friends within 3 take a quarter less. */
export function oriflamme(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  if (!foesNear(b, me, 8).length) return false;
  for (const a of alliesOf(b, me)) mendUnit(a, Math.round(a.maxHp * 0.2 * castPower()), out, me);
  raiseAura(b, me, { what: 'Oriflamme', reach: 3, ms: ultDur(me, 8000), every: 1000, ally: { guard: 0.25 } }, out);
  out.push({ kind: 'banner', by: me.id, ms: ultDur(me, 8000) });
  return true;
}

// ============================================================================
// 8. GEOMANCER (Tenzin) — mystic · bulwark
// ============================================================================

/** Skill 1 — Tectonic Shove: erupts a stone pillar under a foe within 4 tiles, launching it 2 tiles. */
export function tectonicShove(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const f = foesNear(b, me, reachOf(me, 4)).sort(strongest)[0];
  if (!f) return false;
  strike(b, me, f, 1.45, out, true);
  if (f.alive) launch(b, me, f, 2, out);
  return true;
}

/** Skill 2 — Lodestone Pull: the tank's job: magnetises her crag-staff, dragging up to 3 foes within 4 tiles 2 tiles towards her and chilling them. */
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

/** Skill 3 — Crag Staff (a jab): a blow of her staff on the foe before her, and a shard of stone at another foe beside her. */
export function cragStaff(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const f = before(b, me);
  if (!f) return false;
  cut(b, me, f, out, 0.85);
  const g = foesNear(b, me, 1).filter((x) => x !== f).sort((x, y) => x.hp - y.hp || x.id - y.id)[0];
  if (g) strike(b, me, g, 0.5, out);
  return true;
}

/** Ultimate — Mountain's Embrace: raises a Wall of Stone 4 tiles across the foes' way and shields every friend. */
export function mountainsEmbrace(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  if (!foesOf(b, me).length) return false;
  const line = chokeLine(b, me, 4);
  if (line) raiseWall(b, me, line, 'stone', ultDur(me, 7000), out);
  for (const a of alliesOf(b, me)) {
    a.shield = { hp: Math.round(a.maxHp * 0.25 * castPower()), until: b.t + ultDur(me, 6000) };
    out.push({ kind: 'heal', to: a.id, amount: 0, by: me.id });
  }
  return true;
}

// ============================================================================
// 9. BELL WARDEN (Kavi) — yokai · bulwark
// ============================================================================

/** Skill 1 — Bronze Peal: tolls his bell over the foes beside him: each is struck, and the strongest of them silenced for 1.5s. */
export function bronzePeal(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const near = foesNear(b, me, reachOf(me, 1)).sort(strongest);
  if (!near.length) return false;
  me.facing = wayTo(me, near[0]);
  out.push({ kind: 'swing', by: me.id, to: near[0].id });
  for (const f of near) strike(b, me, f, f === near[0] ? 1.5 : 1.0, out, true);
  if (near[0].alive) silenceFor(b, near[0], ms(me, 1500), me);
  return true;
}

/** Skill 2 — Echoing Toll: rings the temple bell: shoves all foes within 2 tiles 2 tiles back, and wards the friends within 3. */
export function echoingToll(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const near = foesNear(b, me, 2);
  if (!near.length) return false;
  for (const f of near) strike(b, me, f, 1.25, out, true);
  moveMany(b, me, near.filter((f) => f.alive), 2, 'shove', out);
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

/** Ultimate — Midnight Knell: stillness: the foes within 3 are struck and stunned, and the knell tolls round him for 8s, slowing the foes there. */
export function midnightKnell(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const near = foesNear(b, me, 3);
  if (!near.length) return false;
  for (const f of near) {
    strike(b, me, f, 1.6, out, true);
    if (f.alive) stunFor(b, f, ultDur(me, 1600), false, 'stun', me);
  }
  raiseAura(b, me, { what: 'Midnight Knell', reach: 3, ms: ultDur(me, 8000), every: 1000, foe: { slow: 1200 } }, out);
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

/** Skill 3 — Gale Vault: leaps up to 3 tiles to the safest high perch, shoving any adjacent foe 1 tile back and hastening herself. */
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

/** Skill 2 — Talon Snare: dashes 2 tiles to a clear firing angle and sends her falcon to pin (stun 1.5s) and bleed the strongest foe. */
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

/** The Bell Warden's Sanctuary Vault: a friend within 4 under 40% with a foe beside it. */
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
      s3: { cls: 'jab', cost: 10, cd: 3500, skill: sk('Drum Strike', 'Cracks his drumstick on the foe before him; it is shocked', 350, 'attack', drumStrike) },
      ultimate: ult('Ten Thousand Drums', 'A thunder cadence over the field: every foe within 6 tiles is struck and shoved 2 tiles back, and every friend is hastened', 800, tenThousandDrums, { rate: 1.0, power: 1.3 }),
    },
    banneret: {
      pool: 'stamina',
      role: 'A rampart warden: charges with the standard and sweeps the line',
      passive: { name: 'Shield-Sister', text: 'Takes 6% less from each ally beside her (up to 3)', huddle: 0.06 },
      s1: { cls: 'strike', cost: 24, cd: 7000, skill: sk('Standard Charge', 'Charges up to 3 tiles along a path to strike and shove a foe, and rallies the friends within 2 (a quarter more attack for 4s)', 550, 'attack', standardCharge) },
      s2: { cls: 'heavy', cost: 30, cd: 12000, skill: sk('Phalanx Sweep', 'Sweeps her banner-lance round her: the foes within 2 are struck, pulled a tile in and stunned for 1s', 500, 'attack2', phalanxSweep) },
      s3: { cls: 'jab', cost: 10, cd: 3500, skill: sk('Banner Jab', 'A jab of the banner-lance at the foe before her; it is weakened 2s', 350, 'attack', bannerJab) },
      ultimate: ult('Oriflamme of the Keep', 'Heals every friend for a fifth of its health and raises the Oriflamme round her for 8s: friends within 3 take a quarter less', 800, oriflamme, { rate: 1.1, power: 1.3 }),
    },
    geomancer: {
      pool: 'mana',
      role: 'A crag-shaper: holds the line, raises stone pillars and draws foes in with lodestone',
      passive: { name: 'Jagged Bedrock', text: 'A fifth of the damage of a melee blow she takes is sent back', thorns: 0.2 },
      s1: { cls: 'strike', cost: 36, cd: 7000, skill: sk('Tectonic Shove', 'A stone pillar erupts under the strongest foe within 4: it is struck and thrown 2 tiles into the air', 650, 'attack', tectonicShove) },
      s2: { cls: 'utility', cost: 40, cd: 14000, skill: sk('Lodestone Pull', 'Her staff turns lodestone: up to three foes within 4 are dragged 2 tiles towards her, struck and slowed for 3s', 600, 'attack2', lodestonePull) },
      s3: { cls: 'jab', cost: 12, cd: 3500, skill: sk('Crag Staff', 'A blow of her staff on the foe before her, and a shard of stone at another foe beside her', 350, 'attack', cragStaff) },
      ultimate: ult("Mountain's Embrace", 'Raises a Wall of Stone 4 tiles across the foes\' way and shields every friend for a quarter of its health', 850, mountainsEmbrace, { rate: 1.15, power: 1.5 }),
    },
    bellWarden: {
      pool: 'stamina',
      role: 'A bronze keeper of sound and stillness: his bell silences, shoves and stills the foe, and he takes a friend\'s place in danger',
      passive: { name: 'Temple Bronze', text: '18% of his blows ring on into a second foe beside the first', arc: 0.18 },
      s1: { cls: 'strike', cost: 24, cd: 7000, skill: sk('Bronze Peal', 'Tolls his bell over the foes beside him: each is struck, and the strongest of them silenced for 1.5s', 550, 'attack', bronzePeal) },
      s2: { cls: 'heavy', cost: 30, cd: 11000, skill: sk('Echoing Toll', 'Rings his temple bell: the foes within 2 are struck and shoved 2 tiles back, and the friends within 3 are warded for 4s', 550, 'attack2', echoingToll) },
      s3: { cls: 'guard', cost: 16, cd: 14000, more: { emergency: vaultNeeded }, skill: sk('Sanctuary Vault', 'When a friend within 4 falls under 40% with a foe beside it, he swaps places with it (or blinks beside it), takes a fifth less for 4s, shields it, and the foes beside him must strike him', 450, 'defend', (b, me, out) => vaultNeeded(b, me) && sanctuaryVault(b, me, out)) },
      ultimate: ult('Midnight Knell', 'Stillness: the foes within 3 are struck and stunned, and the knell tolls round him for 8s, slowing the foes there', 850, midnightKnell, { rate: 1.2, power: 1.4 }),
    },
    falconer: {
      pool: 'stamina',
      role: 'A highland hawker: stoops her falcon on foes, gale-vaults to perches and pins her prey',
      passive: { name: 'Wind-Borne Talons', text: 'Her shots leave the foe bleeding from the talons', rider: { dot: 'bleed', share: 0.04, ms: 3000 } },
      s1: { cls: 'strike', cost: 24, cd: 6000, skill: sk('Falcon Stoop', 'Her falcon dives on the farthest foe within 6: it is struck, weakened for 3.5s and flushed a tile towards her', 500, 'attack', falconStoop) },
      s2: { cls: 'heavy', cost: 30, cd: 11000, skill: sk('Talon Snare', 'Steps to the highest tile within 2 and sends her falcon at the strongest foe within 6: struck, pinned for 1.5s and bleeding', 500, 'attack2', talonSnare) },
      s3: { cls: 'guard', cost: 14, cd: 12000, more: { emergency: galeNeeded }, skill: sk('Gale Vault', 'When she falls under 35% with a foe within 2, a gust shoves the foes beside her a tile back and she vaults to the safest tile within 3, hastened for 3.5s', 450, 'attack2', (b, me, out) => galeNeeded(b, me) && galeVault(b, me, out)) },
      ultimate: ult('Sky Hunt', 'Vaults to the safest tile within 3 and calls three dives of falcons down on the foes', 750, skyHunt, { rate: 0.95, power: 1.5 }),
    },
  };
}
