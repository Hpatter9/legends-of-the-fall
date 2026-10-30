// The monster heroes' reworked moves (RPG-SPELLS batch 7, docs/notes/rpg-spells-design.md section 4.8, docs/notes/spells-b7.md), built on the
// movement toolkit (`toolkit/`): the Kitsune's fox-fire blink and Mass Polymorph, the Karasu's swoop from behind and Cloud of Daggers, the
// Yamabushi's Gust of Wind, Wind Wall and Tempest, the Werewolf's Pounce and howl, the Minotaur's goring launches, the Shambler's Contagion
// and burrowing Plague Tide, the Mummy's Hold Person and sand-wind, and the Kraken Mate's tentacles, Tidal Wave and deeper Maelstrom.
//
// The skill 1s and the ultimates are put on the heroes' own kits by `monsterKits`, which `abilities.ts` calls after the foes that borrow these
// kits (the wolf packs, the maze minotaurs and gorgons, the grove satyrs, the yokai) have taken their own copies: so a foe keeps the old move.
// No randomness: every choice is a fixed order.

import { DIRS, sightClear, type At } from '../board';
import { atkOf, blowMult, canStrike, defOf, hurt, strikeDef, tileOf, wayTo, type Battle, type BattleEvent, type Unit } from '../battle';
import { HEX_EVERY, apart, castPower, chargeAt, crowd, durOf, foesOf, mendUnit, net, reachOf, type Kit, type Skill } from '../abilities';
import { ailBoss, chillFor, fearFor, setDot, silenceFor, stunFor } from '../ailments';
import { behindTile, blinkTo, burrow, burrowTarget, canLand, displace, leapTo, moveMany, pull, raiseAura, raiseWall, shieldLine, shove } from '../toolkit';
import { foxGuise } from './casters';
import { ms, strongest } from './common';
import { kx, setLook } from './effects';

/** An ultimate's time, as `ultimates.ts` reckons it: the caster's `dur` talent, and the ultimate's strength (its square root). */
const ultMs = (me: Unit, n: number): number => durOf(me, Math.round(n * Math.sqrt(castPower())));
const weakest = (x: Unit, y: Unit) => x.hp - y.hp || x.id - y.id;
/** The free tile beside `f` that `me` can land on, nearest to `me` (then the lower index). */
function besideTile(b: Battle, me: Unit, f: Unit): At | undefined {
  return DIRS.map(([du, dv]) => ({ u: f.u + du, v: f.v + dv }))
    .filter((at) => canLand(b, me, at))
    .sort((x, y) => apart(me, x) - apart(me, y) || x.v * b.board.w + x.u - (y.v * b.board.w + y.u))[0];
}

// ---- the skill 1s ----

/** Karasu Tengu, Swoop (was Dive): drops behind a shooter (else the weakest foe) within 6, and strikes it for double. */
export const SWOOP_REACH = 6;
export function swoop(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const foes = foesOf(b, me)
    .filter((f) => apart(me, f) <= reachOf(me, SWOOP_REACH))
    .sort(weakest);
  for (const f of [...foes.filter((x) => defOf(x).shot), ...foes.filter((x) => !defOf(x).shot)]) {
    const to = behindTile(b, me, f);
    if (!to) continue;
    blinkTo(b, me, to, out);
    me.facing = wayTo(me, f);
    hurt(b, me, f, net(atkOf(me) * 2.0 * blowMult(tileOf(b, me).h, tileOf(b, f).h, me.facing, f.facing), f), true, false, out, 'skill');
    return true;
  }
  return false;
}

/** Yamabushi Tengu, Gust of Wind (was Wind Gust): the foes within 2 are hurt and shoved 2 tiles back (a fall or a slam hurts more). */
export function gustOfWind(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const near = foesOf(b, me)
    .filter((f) => apart(me, f) <= reachOf(me, 2))
    .sort((x, y) => apart(me, y) - apart(me, x) || x.id - y.id);
  if (!near.length) return false;
  for (const f of near) {
    hurt(b, me, f, net(atkOf(me) * 0.9, f), false, false, out, 'skill');
    if (f.alive) shove(b, me, f, 2, out);
  }
  return true;
}

/** Werewolf, Pounce (was Ravage): with no foe in reach, he first leaps (up to 4 tiles) beside the weakest foe within 4; then the bite. */
export const POUNCE_REACH = 4;
export function pounce(bite: Skill['cast']): Skill['cast'] {
  return (b, me, out) => {
    const def = strikeDef(b, me);
    const foes = foesOf(b, me);
    if (!foes.some((f) => canStrike(b.board, def, me, f))) {
      const f = foes.filter((x) => apart(me, x) <= POUNCE_REACH + 1).sort(weakest)[0];
      const to = f && besideTile(b, me, f);
      if (!to || apart(me, to) > POUNCE_REACH || !leapTo(b, me, to, out)) return false;
      me.facing = wayTo(me, f);
    }
    return bite(b, me, out);
  };
}

/** Minotaur, Gore Charge: the charge's blow now launches the foe 2 tiles (it is stunned 1.5s, as before). */
export const goreCharge = (b: Battle, me: Unit, out: BattleEvent[]) => chargeAt(b, me, out, { tiles: 4, mult: 2, stun: true, knock: false, haste: 0, launch: 2 });

/** Shambler, Contagion (was Rotting Touch): a cloud of rot round him for 6s (reach 2): each second the foes inside are hurt and cursed, and
 *  he drinks half of the harm. As strong as the skill when it rose. */
export const CONTAGION = { MS: 6000, REACH: 2, DMG: 0.3, DRINK: 0.5 } as const;
export function contagion(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  if (!foesOf(b, me).some((f) => apart(me, f) <= reachOf(me, CONTAGION.REACH))) return false;
  raiseAura(b, me, { what: 'contagion rot', reach: reachOf(me, CONTAGION.REACH), ms: durOf(me, CONTAGION.MS), every: 1000, foe: { dmg: CONTAGION.DMG * castPower(), ail: 'curse', drink: CONTAGION.DRINK } }, out);
  return true;
}

/** Mummy, Hold Person (was Binding Wraps): the wraps, and the hardest-hitting foe they lash is held still 1.5s. */
export function holdPerson(wraps: Skill['cast']): Skill['cast'] {
  return (b, me, out) => {
    const near = foesOf(b, me).filter((f) => apart(me, f) <= reachOf(me, 2));
    if (!wraps(b, me, out)) return false;
    const f = near.filter((x) => x.alive).sort(strongest)[0];
    if (f) stunFor(b, f, durOf(me, 1500), true, 'stun', me);
    return true;
  };
}

/** Kraken Mate, Grasping Tentacles (was Undertow): the undertow, and the farthest shooter among the foes it caught is dragged all the way to him. */
export function graspingTentacles(undertow: Skill['cast']): Skill['cast'] {
  return (b, me, out) => {
    const near = foesOf(b, me).filter((f) => apart(me, f) <= reachOf(me, 4));
    if (!undertow(b, me, out)) return false;
    const f = near.filter((x) => x.alive && defOf(x).shot && apart(me, x) > 1).sort((x, y) => apart(me, y) - apart(me, x) || x.id - y.id)[0];
    if (f) pull(b, me, f, apart(me, f) - 1, out);
    return true;
  };
}

// ---- the skill 2s ----

/** Kitsune, Alter Self (was Fox Guise): she first blinks in fox-fire beside the strongest foe in sight within 7, then takes its shape. */
export function alterSelf(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  if (me.kx?.guise && me.kx.guise.until > b.t) return false;
  const f = foesOf(b, me)
    .filter((x) => apart(me, x) <= 7 && sightClear(b.board, me, x))
    .sort(strongest)[0];
  if (f && apart(me, f) > 1) {
    const to = besideTile(b, me, f);
    if (to) blinkTo(b, me, to, out);
  }
  return foxGuise(b, me, out);
}

/** Yamabushi Tengu, Wind Wall (was Turning Wind): a wall of wind 3 tiles long in front of the friends a shooter is aiming at, for 4s: shots
 *  through it fly back at the shooter for half. */
export function windWall(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  if (!foesOf(b, me).some((f) => defOf(f).shot && apart(f, me) <= 8)) return false;
  const line = shieldLine(b, me, 3);
  if (!line) return false;
  return raiseWall(b, me, line, 'wind', ms(me, 4000), out, { onFighters: true }).length > 0;
}

/** The lane a Tidal Wave rolls down: the way (0-3) whose three-wide lane, 1 to 5 tiles out, holds the most foes (two or more). */
export function tidalLane(b: Battle, me: Unit): { way: number; foes: Unit[] } | undefined {
  let best: { way: number; foes: Unit[] } | undefined;
  for (let way = 0; way < 4; way++) {
    const [du, dv] = DIRS[way];
    const foes = foesOf(b, me).filter((f) => {
      const along = (f.u - me.u) * du + (f.v - me.v) * dv;
      const side = Math.abs((f.u - me.u) * dv - (f.v - me.v) * du);
      return along >= 1 && along <= 5 && side <= 1;
    });
    if (foes.length >= 2 && (!best || foes.length > best.foes.length)) best = { way, foes };
  }
  return best;
}
/** Kraken Mate, Tidal Wave (was Flood): a wave rolls down the lane with most foes, hurting each and shoving it 2 tiles; where it breaks (a
 *  tile past the farthest), it freezes into a Wall of Ice 3 tiles across, for 6s. */
export function tidalWave(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const lane = tidalLane(b, me);
  if (!lane) return false;
  const [du, dv] = DIRS[lane.way];
  const along = (f: At) => (f.u - me.u) * du + (f.v - me.v) * dv;
  // (the farthest first, so the near ones are not stopped by the ones behind)
  for (const f of [...lane.foes].sort((x, y) => along(y) - along(x) || x.id - y.id)) {
    hurt(b, me, f, net(atkOf(me) * 1.0, f), false, false, out, 'skill');
    if (f.alive) displace(b, me, f, lane.way, 2, 'shove', out);
  }
  const far = Math.max(0, ...lane.foes.filter((f) => f.alive).map(along)) + 1;
  const mid = { u: me.u + du * far, v: me.v + dv * far };
  raiseWall(b, me, [-1, 0, 1].map((s) => ({ u: mid.u + dv * s, v: mid.v + du * s })), 'ice', ms(me, 6000), out);
  return true;
}

// ---- the ultimates ----

/** The Kitsune's Mass Polymorph: the three strongest foes in sight within 7 become little foxes for 4s: a fifth of their attack, no casts,
 *  slowed. A boss keeps its shape and is only weakened and silenced, for half the time. */
export const POLY = { MS: 4000, N: 3, REACH: 7, MULT: 0.2 } as const;
export function massPolymorph(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const prey = foesOf(b, me)
    .filter((f) => apart(me, f) <= POLY.REACH && sightClear(b.board, me, f) && !f.kx?.poly)
    .sort(strongest)
    .slice(0, POLY.N);
  if (!prey.length) return false;
  const long = ultMs(me, POLY.MS);
  for (const f of prey) {
    const boss = ailBoss(f);
    const t = boss ? Math.round(long / 2) : long;
    f.power = (f.power ?? 1) * POLY.MULT;
    kx(f).poly = { until: b.t + t, mult: POLY.MULT, ...(boss ? {} : { look: f.look ?? null }) };
    silenceFor(b, f, t, me);
    if (!boss) {
      chillFor(b, f, t, false, false, me);
      setLook(f, 'kitsune', out);
    }
    out.push({ kind: 'mark', to: f.id, by: me.id, what: 'polymorph', ms: t });
  }
  return true;
}
/** A polymorph runs out (`kitTick`): the attack comes back, and the foe its own shape. */
export function unPolymorph(u: Unit, out: BattleEvent[]): void {
  const p = u.kx?.poly;
  if (!p) return;
  u.power = (u.power ?? 1) / p.mult;
  if (p.look !== undefined) setLook(u, p.look ?? undefined, out);
  u.kx!.poly = undefined;
}

/** The Karasu Tengu's Cloud of Daggers: a whirling cloud of razor feathers on the thickest knot of foes within 7, for 4s: a foe in it takes
 *  0.8 of his attack a second and bleeds. As strong as the ultimate when it was called. */
export const DAGGERS = { MS: 4000, REACH: 1, DMG: 0.8 } as const;
export function cloudOfDaggers(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const aim = crowd(b, me, (f) => apart(me, f) <= 7);
  if (!aim) return false;
  raiseAura(b, me, { what: 'cloud of daggers', at: { u: aim.u, v: aim.v }, reach: DAGGERS.REACH, ms: ultMs(me, DAGGERS.MS), every: 1000, foe: { dmg: DAGGERS.DMG * castPower(), ail: 'bleed' } }, out);
  return true;
}

/** The Yamabushi's Tempest: every foe within 4 is hurt hard, stunned 1.5s and launched 2 tiles. */
export function tempest(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const near = foesOf(b, me)
    .filter((f) => apart(me, f) <= 4)
    .sort((x, y) => apart(me, y) - apart(me, x) || x.id - y.id);
  if (!near.length) return false;
  for (const f of near) {
    hurt(b, me, f, net(atkOf(me) * 1.8, f), false, false, out, 'skill');
    if (!f.alive) continue;
    stunFor(b, f, durOf(me, 1500), true, 'stun', me);
    displace(b, me, f, wayTo(me, f), 2, 'launch', out);
  }
  return true;
}

/** The Werewolf's Full Moon howl: the foes within 3 are frightened (they run from him) for 2s. */
export function howl(moon: Skill['cast']): Skill['cast'] {
  return (b, me, out) => {
    if (!moon(b, me, out)) return false;
    for (const f of foesOf(b, me)) if (apart(me, f) <= 3) fearFor(b, f, ultMs(me, 2000), me);
    out.push({ kind: 'song', by: me.id, ms: 600 });
    return true;
  };
}

/** The Minotaur's Stampede: up to three charges in a row, each at the weakest foe in line; each foe struck is launched 2 tiles. */
export function stampede(b: Battle, me: Unit, out: BattleEvent[], extra: number): boolean {
  let n = 0;
  for (let i = 0; i < 3 + extra; i++) {
    if (!chargeAt(b, me, out, { tiles: 5, mult: 2.4, stun: true, knock: false, haste: 0, launch: 2 })) break;
    n++;
  }
  return n > 0;
}

/** The Shambler's Plague Tide: he sinks into the grave-earth and bursts out in the thickest crowd within 6 (the foe there is launched 2 tiles);
 *  the wave of rot from there (`plagueWave`, when he is up) leaves every foe within 5 cursed for 7s, and he drinks from them. */
export function plagueTide(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const target = burrowTarget(b, me, 6);
  if (!target) return false;
  const k = castPower();
  kx(me).tide = { pow: k, ms: ultMs(me, 7000) };
  return burrow(b, me, { reach: 6, mult: 1.0 * k, launch: 2, splash: 0.4 * k }, out, target);
}
export function plagueWave(b: Battle, me: Unit, out: BattleEvent[]): void {
  const t = me.kx?.tide;
  if (!t) return;
  me.kx!.tide = undefined;
  const near = foesOf(b, me).filter((f) => apart(me, f) <= 5);
  for (const f of near) {
    out.push({ kind: 'arc', from: me.id, to: f.id });
    hurt(b, me, f, net(atkOf(me) * 0.7 * t.pow, f), false, false, out, 'skill');
    if (f.alive) setDot(b, f, { kind: 'curse', dmg: Math.max(1, Math.round(atkOf(me) * 0.6 * t.pow)), every: HEX_EVERY, ms: t.ms, by: me.id, next: b.t + HEX_EVERY, until: b.t + t.ms });
  }
  if (near.length) mendUnit(me, Math.min(0.3, 0.05 * near.length) * t.pow * me.maxHp, out);
}

/** The Mummy's and the Kraken Mate's ultimates drag their foes in first: every foe within `reach` (not already beside) a tile towards him. */
export function dragIn(reach: number, then: Skill['cast']): Skill['cast'] {
  return (b, me, out) => {
    const near = foesOf(b, me).filter((f) => apart(me, f) > 1 && apart(me, f) <= reach);
    if (!foesOf(b, me).some((f) => apart(me, f) <= reach)) return false;
    moveMany(b, me, near, 1, 'drag', out);
    return then(b, me, out);
  };
}

/** Put the reworked skill 1s and ultimates on the ten monster heroes' own kits (called once, after the foes took their own copies). */
export function monsterKits(KITS: Record<string, Kit>, extra: (me: Unit) => number): void {
  const re = (s: Skill, name: string, text: string, cast?: Skill['cast']): Skill => ({ ...s, name, key: s.key ?? s.name, text, ...(cast ? { cast } : {}) });
  const set = (kind: string, skill?: Skill, ultimate?: Skill) => {
    KITS[kind] = { ...KITS[kind], ...(skill ? { skill } : {}), ...(ultimate ? { ultimate } : {}) };
  };
  const k = (kind: string) => KITS[kind];
  set('kitsune', re(k('kitsune').skill, 'Charm Monster', k('kitsune').skill.text),
    re(k('kitsune').ultimate!, 'Mass Polymorph', 'The three strongest foes in sight become little foxes for 4s: a fifth of their attack, no casts, slowed (a boss keeps its shape, and is weakened and silenced for half the time)', massPolymorph));
  set('karasu', re(k('karasu').skill, 'Swoop', 'Drops behind a shooter (else the weakest foe) within 6 and strikes it for double', swoop),
    re(k('karasu').ultimate!, 'Cloud of Daggers', 'A whirling cloud of razor feathers hangs on the thickest knot of foes for 4s: a foe in it is hurt each second and bleeds', cloudOfDaggers));
  set('yamabushi', re(k('yamabushi').skill, 'Gust of Wind', 'The foes within 2 tiles are hurt and shoved 2 tiles back; a fall or a slam hurts more', gustOfWind),
    re(k('yamabushi').ultimate!, 'Tempest', 'A great gale: every foe within 4 tiles is hurt hard, stunned for 1.5s and launched 2 tiles', tempest));
  set('werewolf', re(k('werewolf').skill, 'Pounce', 'Leaps up to 4 tiles onto the weakest foe and bites it for double, healing him half of what it deals', pounce(k('werewolf').skill.cast)),
    re(k('werewolf').ultimate!, 'Full Moon', 'Both his forms at once for 7s, a quarter of his health back, and a howl: the foes within 3 tiles are frightened', howl(k('werewolf').ultimate!.cast)));
  set('minotaur', re(k('minotaur').skill, 'Gore Charge', 'Charges up to 4 tiles in a line at a foe, gores it for double and launches it 2 tiles; it is stunned for 1.5s', goreCharge),
    re(k('minotaur').ultimate!, 'Stampede', 'Up to three charges in a row, each at the weakest foe in line; each foe struck is launched 2 tiles and stunned', (b, me, out) => stampede(b, me, out, extra(me))));
  set('gorgon', undefined, re(k('gorgon').ultimate!, 'Gaze of Medusa', k('gorgon').ultimate!.text));
  set('shambler', re(k('shambler').skill, 'Contagion', 'A cloud of rot hangs round him for 6s: the foes within 2 tiles are hurt and cursed each second, and he drinks half of it', contagion),
    re(k('shambler').ultimate!, 'Plague Tide', 'He sinks into the grave-earth and bursts out in the thickest crowd within 6 tiles, launching the foe there; the wave of rot leaves every foe within 5 cursed for 7s, and he drinks from them', plagueTide));
  set('mummy', re(k('mummy').skill, 'Hold Person', 'Bandages lash every foe within 2 tiles and slow it for 3s; the hardest-hitting of them is held still for 1.5s', holdPerson(k('mummy').skill.cast)),
    re(k('mummy').ultimate!, 'Curse of the Pharaoh', 'A sand-wind drags every foe within 5 tiles a tile towards him; each is cursed and slowed for 6s, he is shielded, and the two strongest are his puppets for 2s', dragIn(5, k('mummy').ultimate!.cast)));
  set('kraken', re(k('kraken').skill, 'Grasping Tentacles', 'Tentacles drag every foe within 4 tiles a tile closer, hurt and slowed for 2s; the farthest shooter among them is dragged all the way to him', graspingTentacles(k('kraken').skill.cast)),
    re(k('kraken').ultimate!, 'Maelstrom', 'A whirlpool drags every foe within 6 tiles up to 2 tiles towards him, hurts and slows it', dragIn(6, k('kraken').ultimate!.cast)));
}

/** The kits' timed things of this batch (`kitTick`): a polymorph runs out; the Shambler, up from his burrow, sends his wave of rot. */
export function monsterTick(b: Battle, u: Unit, out: BattleEvent[]): void {
  const x = u.kx!;
  if (x.poly && b.t >= x.poly.until) unPolymorph(u, out);
  if (x.tide && !u.under) plagueWave(b, u, out);
}
