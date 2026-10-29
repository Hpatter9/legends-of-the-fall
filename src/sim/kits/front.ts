// The front line's new skills (COMBAT-002): the Knight's bash, the Samurai's parry, the Peasant's pikes, the Paladin's vow, the Juggernaut's
// rampart, the Kraken Mate's flood, the Shambler's meal, the Mummy's strings, the Yamabushi's turning wind and the Minotaur's rush.

import { atkOf, defOf, wayTo, type Battle, type BattleEvent, type Unit } from '../battle';
import { DIR, apart, foesOf, kitOf, mendUnit, slowFor } from '../abilities';
import { UNITS } from '../units';
import { kx, layTerrain, KIT } from './effects';
import { alliesOf, foesNear, free, mark, ms, nearestFoe, shove, strike, strongest, stun } from './common';
import { charmFor } from '../ailments';

/** Knight, Shield Bash: the strongest foe beside him is struck, stunned 1.5s and shoved back a tile. */
export function shieldBash(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const f = foesNear(b, me, 1).sort(strongest)[0];
  if (!f) return false;
  me.facing = wayTo(me, f);
  strike(b, me, f, 1.2, out, true);
  if (!f.alive) return true;
  stun(b, f, ms(me, 1500));
  if (!kitOf(f)?.passive.steady) shove(b, f, me, 1);
  return true;
}

/** Samurai, Parry Stance: for 2.5s every melee blow on him is parried and answered with a cut (`KIT.PARRY_MULT`). Only with a foe beside him. */
export function parryStance(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  if (!foesNear(b, me, 1).some((f) => !UNITS[f.def].shot)) return false;
  kx(me).parry = b.t + ms(me, 2500);
  mark(out, me, me, 'parry', ms(me, 2500));
  return true;
}

/** Peasant, Brace Spears: pikes on the three tiles in front of him (toward the nearest foe) for 5s; a foe stepping on one is struck and stopped 1s. */
export function braceSpears(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const f = nearestFoe(b, me);
  if (!f || apart(me, f) > 5) return false;
  const way = wayTo(me, f);
  const [du, dv] = DIR[way];
  const front = { u: me.u + du, v: me.v + dv };
  const side = DIR[(way + 1) % 4];
  const traps = (b.traps ??= []);
  let laid = 0;
  for (const c of [front, { u: front.u + side[0], v: front.v + side[1] }, { u: front.u - side[0], v: front.v - side[1] }]) {
    if (!free(b, c) || traps.some((x) => x.u === c.u && x.v === c.v)) continue;
    traps.push({ u: c.u, v: c.v, side: me.side, by: me.id, until: b.t + ms(me, 5000), dmg: atkOf(me) * 1.2, hold: 1000 });
    out.push({ kind: 'trap', u: c.u, v: c.v, ms: ms(me, 5000) });
    laid++;
  }
  me.facing = way;
  return laid > 0;
}

/** Paladin, Martyr's Vow: for 5s half of what his friends within 3 would take is his instead. Needs a friend near and a foe in the fight. */
export function martyrsVow(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  if (!alliesOf(b, me).some((a) => a !== me && apart(a, me) <= KIT.VOW_REACH) || !foesNear(b, me, 4).length) return false;
  kx(me).vow = b.t + ms(me, 5000);
  b.kits = { ...b.kits, vows: true };
  mark(out, me, me, 'vow', ms(me, 5000));
  return true;
}

/** Juggernaut, Raise Rampart: the three tiles in front of him (toward the nearest foe) rise into a wall for 10s that foes must walk round; the foes beside
 *  it are struck and held a moment as the ground heaves. */
export function raiseRampart(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const f = nearestFoe(b, me);
  if (!f || apart(me, f) > 5) return false;
  const way = wayTo(me, f);
  const [du, dv] = DIR[way];
  const front = { u: me.u + du, v: me.v + dv };
  const side = DIR[(way + 1) % 4];
  let laid = 0;
  const line = [front, { u: front.u + side[0], v: front.v + side[1] }, { u: front.u - side[0], v: front.v - side[1] }];
  for (const c of line) if (free(b, c) && layTerrain(b, c, 'rampart', ms(me, 10000), out)) laid++;
  if (!laid) return false;
  me.facing = way;
  // (the ground heaves as it rises: the foes beside the new wall are struck and thrown off their feet a moment)
  for (const f of foesOf(b, me)) {
    if (!line.some((c) => Math.abs(c.u - f.u) + Math.abs(c.v - f.v) === 1)) continue;
    strike(b, me, f, 1.0, out);
    if (f.alive) stun(b, f, ms(me, 1000));
  }
  return true;
}

/** Kraken Mate, Flood: the 3x3 round him turns to shallow water for 8s (it slows whoever walks it), and the foes in it are slowed 2s. */
export function flood(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const near = foesOf(b, me).filter((f) => Math.abs(f.u - me.u) <= 1 && Math.abs(f.v - me.v) <= 1);
  if (!near.length) return false;
  for (let dv = -1; dv <= 1; dv++) for (let du = -1; du <= 1; du++) layTerrain(b, { u: me.u + du, v: me.v + dv }, 'flood', ms(me, 8000), out);
  for (const f of near) {
    strike(b, me, f, 0.6, out);
    if (f.alive) slowFor(b, f, ms(me, 2000));
  }
  return true;
}

/** Shambler, Devour: eats a body that fell beside him in the last 10s: heals a fifth of his health and grows a tenth bigger for the fight (three times at most). */
export function devour(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const body = b.units
    .filter((x) => !x.alive && x.side !== me.side && x.diedAt !== undefined && b.t - x.diedAt <= 10000 && apart(x, me) <= 2 && !x.kx?.spent && !defOf(x).summon)
    .sort((x, y) => (y.diedAt ?? 0) - (x.diedAt ?? 0) || x.id - y.id)[0];
  if (!body) return false;
  kx(body).spent = true;
  const k = kx(me);
  if ((k.grown ?? 0) < 3) {
    const more = Math.round(me.maxHp * 0.1);
    me.maxHp += more;
    me.hp += more;
    k.grown = (k.grown ?? 0) + 1;
  }
  mendUnit(me, me.maxHp * 0.2, out);
  out.push({ kind: 'arc', from: body.id, to: me.id });
  return true;
}

/** Mummy, Puppet Strings: the hardest-hitting foe within 4 is bound for 3s: it walks to, and strikes, its own side. */
export function puppetStrings(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const foes = foesOf(b, me);
  if (foes.length < 2) return false;
  const f = foes.filter((x) => apart(me, x) <= 4 && !(x.charmUntil !== undefined && x.charmUntil > b.t)).sort(strongest)[0];
  if (!f) return false;
  charmFor(b, f, ms(me, 3000));
  f.taunt = undefined;
  f.busyUntil = Math.min(f.busyUntil, b.t + 300);
  out.push({ kind: 'arc', from: me.id, to: f.id });
  mark(out, me, f, 'puppet', ms(me, 3000));
  return true;
}

/** Yamabushi Tengu, Turning Wind: the foes beside him are struck and shoved back, and for 4s shots aimed at his friends within 2 are blown back at the
 *  shooter for half. Only with a shooter on the field. */
export function turningWind(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  if (!foesOf(b, me).some((f) => UNITS[f.def].shot && apart(f, me) <= 8)) return false;
  // (the wind turns about him: the foes beside him are struck and shoved back a tile)
  for (const f of foesNear(b, me, 1)) {
    strike(b, me, f, 0.8, out);
    if (f.alive && !kitOf(f)?.passive.steady) shove(b, f, me, 1);
  }
  kx(me).reflect = b.t + ms(me, 4000);
  out.push({ kind: 'song', by: me.id, ms: ms(me, 4000) });
  return true;
}

/** Minotaur, Bull Rush: every foe beside him is struck and shoved two tiles; one that hits something is stunned 1.5s. */
export function bullRush(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const near = foesNear(b, me, 1);
  if (!near.length) return false;
  for (const f of near) {
    strike(b, me, f, 1.0, out, true);
    if (!f.alive) continue;
    const stopped = kitOf(f)?.passive.steady ? true : shove(b, f, me, 2);
    f.busyUntil = Math.max(f.busyUntil, b.t + 400);
    if (stopped) stun(b, f, ms(me, 1500));
  }
  return true;
}

