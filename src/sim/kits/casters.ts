// The casters' new skills (COMBAT-002): the Fire Wizard's wildfire, the Lightning Mage's marks and overload, the Kitsune's guise, the Satyr's
// pied piper, the Gorgon's stone garden, the Warlock's siphon, the Illusionist's trade, the Time Witch's rewind, the Great Sage's font, the Tyrant's
// condemnation, the Wolf Bard's tune, the Cleric's smite, the Wanderer's flasks, the High Priestess's angel and the Druid's treeform.

import { sightClear } from '../board';
import { addUnit, atkOf, canStrike, strikeDef, wayTo, type Battle, type BattleEvent, type Unit } from '../battle';
import { apart, castPower, crowd, drag, foesOf, mendUnit, near3x3, net } from '../abilities';
import { hurt } from '../battle';
import { addRes, poolOf } from '../heroKits';
import { formOf, UNITS } from '../units';
import { kx, setLook } from './effects';
import { alliesOf, blinkTo, foesNear, free, freeNear, mark, ms, nearestFoe, strike, strongest, stun, toughest } from './common';

const on = (t: number | undefined, b: Battle) => t !== undefined && t > b.t;
const burning = (b: Battle, f: Unit, side: Unit['side']) => f.dot?.kind === 'burn' || b.zones.some((z) => z.side === side && !z.slow && near3x3(f, z));

/** Fire Wizard, Wildfire: every burning foe within 7 erupts: its 3x3 is hurt and set alight, so fire runs through a pack (each foe is struck once). */
export function wildfire(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const foes = foesOf(b, me);
  const lit = foes.filter((f) => apart(me, f) <= 7 && burning(b, f, me.side));
  if (!lit.length) return false;
  const struck = new Set<number>();
  for (const src of lit) {
    out.push({ kind: 'area', by: me.id, id: 'meteor', u: src.u, v: src.v, ms: 0 });
    for (const f of foes) {
      if (struck.has(f.id) || !f.alive || !near3x3(f, src)) continue;
      struck.add(f.id);
      strike(b, me, f, 1.2, out);
      if (f.alive) f.dot = { kind: 'burn', dmg: Math.max(1, Math.round(atkOf(me) * 0.12)), every: 500, ms: 3000, by: me.id, next: b.t + 500, until: b.t + ms(me, 3000) };
    }
  }
  return true;
}

/** Lightning Mage: Chain Lightning leaves each foe it struck Charged for 5s. */
export const charge = (b: Battle, me: Unit, f: Unit, out: BattleEvent[]) => {
  kx(f).charged = b.t + ms(me, 10000);
  mark(out, me, f, 'charged', ms(me, 10000));
};
/** Lightning Mage, Overload: every Charged foe discharges: it is struck, stunned 0.8s, and the bolt arcs to one foe beside it. */
export function overload(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const foes = foesOf(b, me);
  const charged = foes.filter((f) => on(f.kx?.charged, b) && apart(me, f) <= 8);
  if (!charged.length) return false;
  for (const f of charged) {
    kx(f).charged = undefined;
    out.push({ kind: 'arc', from: me.id, to: f.id });
    strike(b, me, f, 1.4, out, true);
    if (f.alive) stun(b, f, ms(me, 800));
    const next = foes.filter((n) => n !== f && n.alive && apart(n, f) <= 2).sort((x, y) => apart(x, f) - apart(y, f) || x.id - y.id)[0];
    if (next) {
      out.push({ kind: 'arc', from: f.id, to: next.id });
      strike(b, me, next, 0.7, out);
    }
  }
  return true;
}

/** Kitsune, Fox Guise: for 5s she takes the shape of the strongest foe within 7: its looks, its reach and shot, and its attack (up to 1.4 times hers); foes pick her last. */
export function foxGuise(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  if (me.kx?.guise && me.kx.guise.until > b.t) return false;
  const f = foesNear(b, me, 7).filter((x) => UNITS[x.def].side === 'foe').sort(strongest)[0];
  if (!f) return false;
  const mult = Math.max(1, Math.min(1.4, atkOf(f) / atkOf(me)));
  me.power = (me.power ?? 1) * mult;
  kx(me).guise = { def: f.def, until: b.t + ms(me, 5000), mult };
  setLook(me, f.look ?? UNITS[f.def].sheet, out);
  return true;
}

/** Satyr, Pied Piper: the foes within 4 dance toward one spot two tiles ahead of him for 2s, bunched up and not striking (it sets up the blasts). */
export function piedPiper(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const near = foesNear(b, me, 4);
  if (!near.length) return false;
  const lead = nearestFoe(b, me)!;
  const way = wayTo(me, lead);
  const spot = { u: me.u + [2, 0, -2, 0][way], v: me.v + [0, 2, 0, -2][way] };
  for (const f of near) {
    for (let i = 0; i < 2 && apart(f, spot) > 0; i++) if (!drag(b, f, spot)) break;
    stun(b, f, ms(me, 2000));
    mark(out, me, f, 'dance', ms(me, 2000));
  }
  out.push({ kind: 'song', by: me.id, ms: ms(me, 2000) });
  return true;
}

/** Gorgon, Stone Garden: every stunned or slowed foe within 5 turns to stone for 2s (with none, the strongest within 5); one that dies as stone stays as a statue that blocks its tile for 6s. */
export function stoneGarden(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const near = foesNear(b, me, 5);
  const held = near.filter((f) => on(f.stunUntil, b) || on(f.slowUntil, b));
  const prey = held.length ? held : near.sort(strongest).slice(0, 1);
  if (!prey.length) return false;
  for (const f of prey) {
    stun(b, f, ms(me, 2000));
    kx(f).stone = b.t + ms(me, 2000);
    out.push({ kind: 'gaze', by: me.id, to: f.id });
    mark(out, me, f, 'stone', ms(me, 2000));
  }
  return true;
}

/** Warlock, Soul Siphon: he channels 2s on the weakest foe in reach, draining it each half second; what he drains heals his most hurt friend. */
export function soulSiphon(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const def = strikeDef(b, me);
  const f = foesOf(b, me)
    .filter((x) => apart(me, x) <= def.range + 1 && sightClear(b.board, me, x))
    .sort((x, y) => x.hp - y.hp || x.id - y.id)[0];
  if (!f) return false;
  me.facing = wayTo(me, f);
  kx(me).siphon = { to: f.id, until: b.t + 2000, next: b.t + 500 };
  out.push({ kind: 'arc', from: f.id, to: me.id });
  return true;
}

/** Illusionist, Trade Places: the friend in most trouble (beside a foe, under 60%) swaps out to a safe tile within 3, and a decoy takes its place; the foes on it keep beating the decoy for 3s. */
export function tradePlaces(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const foes = foesOf(b, me);
  const ally = alliesOf(b, me)
    .filter((a) => a.owner === undefined && !UNITS[a.def].summon && a.hp < a.maxHp * 0.6 && foes.some((f) => apart(f, a) === 1))
    .sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp || x.id - y.id)[0];
  if (!ally) return false;
  const safety = (c: { u: number; v: number }) => Math.min(...foes.map((f) => apart(c, f)));
  const to = freeNear(b, ally, 3).sort((x, y) => safety(y) - safety(x) || apart(ally, x) - apart(ally, y) || x.v - y.v || x.u - y.u)[0];
  if (!to || safety(to) < 2) return false;
  const from = { u: ally.u, v: ally.v };
  blinkTo(b, ally, to, out);
  const d = addUnit(b, 'decoy', from.u, from.v);
  d.owner = me.id;
  d.hp = d.maxHp = Math.max(1, Math.round(me.maxHp * 0.45 * castPower()));
  d.busyUntil = b.t + 1500;
  d.expires = b.t + ms(me, 5000);
  for (const f of foes) if (apart(f, from) <= 2) f.taunt = { to: d.id, until: b.t + ms(me, 3000) };
  return true;
}

/** Time Witch, Rewind: the friend that lost most in the last 4s goes back to how it was: its health (if it had more), its tile (if free), and its new ailments gone. */
export function rewind(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  let best: { a: Unit; then: { hp: number; u: number; v: number }; lost: number } | undefined;
  for (const a of alliesOf(b, me)) {
    const h = a.kx?.hist;
    const then = h?.find((s) => b.t - s.t <= 4000);
    if (!then) continue;
    const lost = (then.hp - a.hp) / a.maxHp;
    if (lost >= 0.2 && (!best || lost > best.lost || (lost === best.lost && a.id < best.a.id))) best = { a, then, lost };
  }
  if (!best) return false;
  const { a, then } = best;
  mendUnit(a, then.hp - a.hp, out, me);
  a.dot = undefined;
  a.stunUntil = undefined;
  a.slowUntil = undefined;
  if ((a.u !== then.u || a.v !== then.v) && free(b, then)) blinkTo(b, a, then, out);
  a.busyUntil = Math.min(a.busyUntil, b.t + 200);
  a.kx!.hist = [];
  mark(out, me, a, 'rewind', 800);
  return true;
}

/** Great Sage, Font of Wisdom: every friend within 4 gains 25 mana or 15 stamina. Needs two friends near under a third of their pools. */
export function fontOfWisdom(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const near = alliesOf(b, me).filter((a) => a !== me && apart(a, me) <= 4 && poolOf(a));
  if (near.filter((a) => a.charge < 34).length < Math.min(2, near.length) || !near.length || !foesOf(b, me).length) return false;
  for (const a of near) {
    addRes(a, poolOf(a) === 'mana' ? 25 : 15);
    out.push({ kind: 'heal', to: a.id, amount: 0, by: me.id });
  }
  return true;
}

/** Tyrant, Condemn: the toughest foe within 7 is condemned for 6s: every hero that can reach it goes for it and deals 20% more; if it falls, every hero gains 10 of its pool. */
export function condemn(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const f = foesNear(b, me, 7)
    .filter((x) => !on(x.kx?.condemned?.until, b))
    .sort(toughest)[0];
  if (!f) return false;
  kx(f).condemned = { by: me.id, until: b.t + ms(me, 6000) };
  mark(out, me, f, 'condemned', ms(me, 6000));
  return true;
}

/** Wolf Bard, Change the Tune: switches his standing song (Dirge: foes within 3 hit a tenth weaker; Anthem: friends within 3 hit a tenth harder) and doubles it for 6s. */
export function changeTune(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  if (!foesNear(b, me, 5).length) return false;
  const k = kx(me);
  k.tune = k.tune === 'anthem' ? 'dirge' : 'anthem';
  k.loud = b.t + ms(me, 6000);
  b.kits = { ...b.kits, songs: true };
  out.push({ kind: 'song', by: me.id, ms: ms(me, 6000) });
  mark(out, me, me, k.tune, ms(me, 6000));
  return true;
}

/** Cleric, Smite: a holy blow on the weakest foe in reach; her friends within 2 of it are healed by what it dealt. */
export function smite(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const def = strikeDef(b, me);
  const f = foesOf(b, me)
    .filter((x) => canStrike(b.board, def, me, x) || apart(me, x) <= 2)
    .sort((x, y) => x.hp - y.hp || x.id - y.id)[0];
  if (!f) return false;
  me.facing = wayTo(me, f);
  const before = me.dealt ?? 0;
  hurt(b, me, f, net(atkOf(me) * 1.4, f), true, false, out, 'skill');
  const dealt = (me.dealt ?? 0) - before;
  for (const a of alliesOf(b, me)) if (apart(a, f) <= 2 && a.hp < a.maxHp) mendUnit(a, dealt, out, me);
  return true;
}

/** Wanderer, Flask Toss: a healing draught (a quarter of its health) for the most hurt friend within 5, if one is under 60%; else a firebrew on the thickest 3x3 within 5. */
export function flaskToss(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const hurtOne = alliesOf(b, me)
    .filter((a) => apart(a, me) <= 5 && a.hp < a.maxHp * 0.6)
    .sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp || x.id - y.id)[0];
  if (hurtOne) {
    mendUnit(hurtOne, hurtOne.maxHp * 0.25 * castPower(), out, me);
    out.push({ kind: 'arc', from: me.id, to: hurtOne.id });
    return true;
  }
  const aim = crowd(b, me, (f) => apart(me, f) <= 5);
  if (!aim) return false;
  b.pending.push({ at: b.t + 600, kind: 'meteor', by: me.id, to: aim.id, dmg: atkOf(me) * 1.3, heavy: false, u: aim.u, v: aim.v });
  out.push({ kind: 'area', by: me.id, id: 'meteor', u: aim.u, v: aim.v, ms: 600 });
  return true;
}
/** The Wanderer's draught is a heal when a friend is badly hurt. */
export const flaskNeeded = (b: Battle, me: Unit) => alliesOf(b, me).some((a) => apart(a, me) <= 5 && a.hp < a.maxHp * 0.35);

/** High Priestess, Guardian Angel: the friend most at risk (the most hurt with a foe within 2) is watched for 4s: the first blow that would fell it leaves it at 1 health and heals it 30%. */
export function guardianAngel(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const foes = foesOf(b, me);
  const a = alliesOf(b, me)
    .filter((x) => x.owner === undefined && !UNITS[x.def].summon && x.hp < x.maxHp * 0.7 && !on(x.kx?.angel, b) && foes.some((f) => apart(f, x) <= 2))
    .sort((x, y) => x.hp / x.maxHp - y.hp / y.maxHp || x.id - y.id)[0];
  if (!a) return false;
  kx(a).angel = b.t + ms(me, 4000);
  mark(out, me, a, 'angel', ms(me, 4000));
  return true;
}

/** Druid, Treeform: for 6s she becomes a treant: a third more health, more defence, and the foes beside her must strike her; she heals 15% when she turns back. */
export function treeform(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  if (me.kx?.tree) return false;
  const near = foesNear(b, me, 2);
  if (!near.length) return false;
  const added = Math.round(me.maxHp / 3);
  me.maxHp += added;
  me.hp += added;
  kx(me).tree = { until: b.t + ms(me, 6000), added };
  for (const f of near) f.taunt = { to: me.id, until: b.t + ms(me, 3000) };
  setLook(me, formOf(UNITS.treant, me.grade ?? 1), out);
  return true;
}

