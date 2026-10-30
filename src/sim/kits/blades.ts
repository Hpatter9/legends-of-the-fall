// The blades' new skills (COMBAT-002): the Kunoichi's smoke, the Ninja Monk's palm, the Karasu's theft, the Werewolf's two forms, the Barbarian's
// fury, the Mercenary's bounty, the Buccaneer's dice, the Lancer's wheel, the Reaper's bound soul, the Arc Blade's grounding, the Dragoon's jump and
// the Demon Swordsman's blood price.

import { canStrike, strikeDef, tileOf, wayTo, atkOf, type Battle, type BattleEvent, type Pending, type Unit } from '../battle';
import { apart, crowd, foesOf, mendUnit, net, near3x3, roll } from '../abilities';
import { hurt } from '../battle';
import { addRes } from '../heroKits';
import { kx, raiseWraith, setLook } from './effects';
import { alliesOf, blinkTo, foesNear, freeNear, mark, ms, strike, strongest, stun } from './common';
import { chillFor, setDot } from '../ailments';
import { diveLaunch, smokeBlink, stepOfTheWind, THUNDER_STORE, thunderShove } from './melee';

/** Kunoichi, Smoke Bomb: she cannot be targeted for 2s, the foes in the 3x3 round her miss half their blows for 3s, and her next blow crits. */
export function smokeBomb(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const near = foesOf(b, me).filter((f) => Math.abs(f.u - me.u) <= 1 && Math.abs(f.v - me.v) <= 1);
  if (!near.length) return false;
  me.hideUntil = b.t + ms(me, 2000);
  for (const f of near) {
    kx(f).smoke = b.t + ms(me, 3000);
    mark(out, me, f, 'smoke', ms(me, 3000));
  }
  kx(me).critNext = true;
  // (RPG-SPELLS batch 4: then she blinks clear, to the safest free tile within 3)
  smokeBlink(b, me, out);
  return true;
}
/** Smoke when she is in trouble: under a quarter of her health with a foe beside her. */
export const smokeNeeded = (b: Battle, me: Unit) => me.hp < me.maxHp * 0.25 && foesNear(b, me, 1).length > 0;

/** Ninja Monk, Stillness Palm: spends his Flow (one stack a blow on the same foe, up to five) in one palm: more for each stack, and the foe loses 30 of its skill charge. */
export function stillnessPalm(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const def = strikeDef(b, me);
  let inReach = foesOf(b, me).filter((x) => canStrike(b.board, def, me, x));
  // (RPG-SPELLS batch 4, Step of the Wind: with nobody in reach, he leaps beside the foe with the fullest skill meter within 4)
  if (!inReach.length) {
    const to = stepOfTheWind(b, me, out);
    if (!to) return false;
    inReach = [to];
  }
  const flow = me.kx?.flow;
  const f = inReach.find((x) => x.id === flow?.to) ?? inReach.sort((x, y) => x.hp - y.hp || x.id - y.id)[0];
  const n = flow && flow.to === f.id ? flow.n : 0;
  me.facing = wayTo(me, f);
  strike(b, me, f, 0.8 + 0.45 * n, out, true);
  if (f.alive) f.charge = Math.max(0, f.charge - 30);
  kx(me).flow = undefined;
  return true;
}

/** Karasu Tengu, Pilfer: dives on the foe with the fullest skill meter, steals half its charge and any shield it holds; his friends near the landing gain 10 of their pool. */
export function pilfer(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const foes = foesOf(b, me).sort((x, y) => (y.shield ? 1 : 0) - (x.shield ? 1 : 0) || y.charge - x.charge || x.id - y.id);
  for (const f of foes) {
    const to = freeNear(b, f, 1)[0];
    if (!to) continue;
    blinkTo(b, me, to, out);
    me.facing = wayTo(me, f);
    strike(b, me, f, 1.5, out, true);
    f.charge = Math.round(f.charge / 2);
    if (f.shield) {
      me.shield = f.shield;
      f.shield = undefined;
    }
    for (const a of alliesOf(b, me)) if (a !== me && apart(a, me) <= 2) addRes(a, 10);
    return true;
  }
  return false;
}

/** Werewolf, Shift: changes between the Hunter (the white wolf: quicker, bites that bleed) and the Brute (the black wolf: takes a quarter less, blows that splash).
 *  He goes Brute under half health or with three foes beside him, else Hunter; at most once in 4s. */
export function shift(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  if (!foesNear(b, me, 4).length) return false;
  const k = kx(me);
  if (k.wolfAt !== undefined && b.t - k.wolfAt < 4000) return false;
  const want = me.hp < me.maxHp * 0.5 || foesNear(b, me, 1).length >= 3 ? 'brute' : 'hunter';
  if (k.wolf === want) return false;
  k.wolf = want;
  k.wolfAt = b.t;
  if (!(k.moon !== undefined && k.moon > b.t)) setLook(me, want === 'brute' ? 'werewolf_black' : 'werewolf_white', out);
  mark(out, me, me, want, 4000);
  return true;
}

/** Barbarian, Blood Fury (paid in blood too): for 4s his blows come 30% faster and drink an eighth of what they deal, and he cannot fall below 1 health. */
export function bloodFury(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  if (!foesNear(b, me, 2).length || (me.kx?.fury ?? 0) > b.t) return false;
  kx(me).fury = b.t + ms(me, 4000);
  out.push({ kind: 'frenzy', by: me.id, n: 3 });
  return true;
}

/** Mercenary, Mark for Coin: a thrown blade strikes the strongest foe within 7 and marks it for 10s: every hero deals a quarter more to it, and if it dies marked he heals a fifth and his stamina fills. */
export function markForCoin(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const f = foesNear(b, me, 7)
    .filter((x) => !(x.kx?.bounty && x.kx.bounty.until > b.t))
    .sort(strongest)[0];
  if (!f) return false;
  // (a thrown blade marks it)
  out.push({ kind: 'shot', by: me.id, to: f.id, shot: 'arrow', ms: 120 + apart(me, f) * 40 });
  strike(b, me, f, 1.0, out);
  kx(f).bounty = { by: me.id, until: b.t + ms(me, 10000) };
  mark(out, me, f, 'bounty', ms(me, 10000));
  return true;
}

/** Buccaneer, Roll the Bones: two dice from the skill stream decide the cut on the weakest foe in reach: 2 to 4 a weak cut and he is slowed; 5 to 9 x1.6;
 *  10 or 11 x2.2 and it bleeds; doubles or 12 x3 and every friend is hastened 3s. */
export function rollTheBones(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const def = strikeDef(b, me);
  const f = foesOf(b, me)
    .filter((x) => canStrike(b.board, def, me, x))
    .sort((x, y) => x.hp - y.hp || x.id - y.id)[0];
  if (!f) return false;
  const d1 = 1 + Math.floor(roll(b) * 6);
  const d2 = 1 + Math.floor(roll(b) * 6);
  const sum = d1 + d2;
  const top = d1 === d2 || sum === 12;
  const mult = top ? 3 : sum >= 10 ? 2.2 : sum >= 5 ? 1.6 : 1;
  me.facing = wayTo(me, f);
  mark(out, me, me, `dice ${d1} ${d2}`, 1200);
  strike(b, me, f, mult, out, mult >= 2.2);
  if (sum >= 10 && !top && f.alive) setDot(b, f, { kind: 'bleed', dmg: Math.max(1, Math.round(atkOf(me) * 0.15)), every: 500, ms: 3000, by: me.id, next: b.t + 500, until: b.t + 3000 });
  if (sum <= 4 && !top) chillFor(b, me, 2000);
  if (top)
    for (const a of alliesOf(b, me)) {
      a.hasteUntil = Math.max(a.hasteUntil ?? 0, b.t + ms(me, 3000));
      out.push({ kind: 'haste', to: a.id, ms: ms(me, 3000) });
    }
  return true;
}

/** Lancer, Wheel About: with a foe beside him, he rides up to 3 tiles clear of the melee and gains full Momentum (his next blow +50%). */
export function wheelAbout(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const foes = foesOf(b, me);
  if (!foes.some((f) => apart(f, me) === 1)) return false;
  const safety = (c: { u: number; v: number }) => Math.min(...foes.map((f) => apart(c, f)));
  const h = tileOf(b, me).h;
  const to = freeNear(b, me, 3)
    .filter((c) => Math.abs((b.board.tiles[c.v * b.board.w + c.u]?.h ?? h) - h) <= 3)
    .sort((x, y) => safety(y) - safety(x) || apart(me, x) - apart(me, y) || x.v - y.v || x.u - y.u)[0];
  if (!to || safety(to) < 2) return false;
  const from = { u: me.u, v: me.v };
  me.step = { u: from.u, v: from.v, h, at: b.t, ms: 300 };
  me.u = to.u;
  me.v = to.v;
  out.push({ kind: 'dash', by: me.id, from, to });
  const k = kx(me);
  k.momentum = 5;
  k.lastWay = undefined;
  me.hasteUntil = Math.max(me.hasteUntil ?? 0, b.t + 1500);
  return true;
}

/** Reaper, Bound Soul: the last foe that fell within 4 rises as a wraith on his side for 8s, at half its health and attack (a boss gives only a wisp). */
export function boundSoul(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const body = b.units
    .filter((x) => !x.alive && x.side !== me.side && x.diedAt !== undefined && b.t - x.diedAt <= 12000 && apart(x, me) <= 4 && !x.kx?.spent && x.owner === undefined)
    .sort((x, y) => (y.diedAt ?? 0) - (x.diedAt ?? 0) || x.id - y.id)[0];
  if (!body) return false;
  return raiseWraith(b, me, body, ms(me, 8000), out);
}

/** Arc Blade, Grounding: lets go what his passive stored (30% of the damage he takes, up to four times his attack) as a nova on every foe within 2, and heals a tenth. */
export function grounding(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const stored = me.kx?.stored ?? 0;
  const near = foesNear(b, me, 2);
  if (!near.length || stored < atkOf(me) * THUNDER_STORE) return false;
  out.push({ kind: 'burst', by: me.id, reach: 2, tone: 'tier' });
  for (const f of near) {
    out.push({ kind: 'arc', from: me.id, to: f.id });
    hurt(b, me, f, net(atkOf(me) + stored * 0.6, f), true, false, out, 'skill');
  }
  kx(me).stored = 0;
  mendUnit(me, me.maxHp * 0.1, out);
  // (RPG-SPELLS batch 4, Thunderwave: the foes within 2 are shoved 2 tiles back)
  thunderShove(b, me, out);
  return true;
}

/** Queen Dragoon, Jump: she leaps out of the fight (cannot be targeted for 1.2s) and lands on the thickest crowd within 7: double on the one she lands on, and the 3x3 is struck and held a moment. */
export function jump(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  const aim = crowd(b, me, (f) => apart(me, f) <= 7 && apart(me, f) >= 2);
  if (!aim) return false;
  const to = freeNear(b, aim, 1).sort((x, y) => apart(me, x) - apart(me, y) || x.v - y.v || x.u - y.u)[0];
  if (!to) return false;
  blinkTo(b, me, to, out);
  me.facing = wayTo(me, aim);
  me.hideUntil = b.t + 1200;
  b.pending.push({ at: b.t + 1200, kind: 'jump', by: me.id, to: aim.id, dmg: atkOf(me), heavy: true, u: aim.u, v: aim.v });
  out.push({ kind: 'area', by: me.id, id: 'volley', u: aim.u, v: aim.v, ms: 1200 });
  return true;
}
/** The Dragoon lands: double on her mark (if it is still within a tile of where it stood), the attack and a 0.5s hold on the rest of the 3x3. */
export function settleJump(b: Battle, p: Pending, out: BattleEvent[]): void {
  const me = b.units.find((x) => x.id === p.by);
  if (!me || !me.alive) return;
  out.push({ kind: 'burst', by: me.id, reach: 1, tone: 'tier' });
  for (const f of foesOf(b, me)) {
    if (!near3x3(f, { u: p.u!, v: p.v! })) continue;
    hurt(b, me, f, net(p.dmg * (f.id === p.to ? 2 : 1), f), f.id === p.to, false, out, 'skill');
    if (f.alive) stun(b, f, 600);
  }
  // (RPG-SPELLS batch 4, Dragon Dive: the 3x3 round her landing is thrown a tile outward)
  diveLaunch(b, me, p, out);
}

/** Demon Swordsman, Blood Price (paid in blood too): his next three blows deal 60% more and drink 30% of what they deal. */
export function bloodPrice(b: Battle, me: Unit, out: BattleEvent[]): boolean {
  if (!foesNear(b, me, 2).length || (me.kx?.blood ?? 0) > 0) return false;
  kx(me).blood = 3;
  out.push({ kind: 'frenzy', by: me.id, n: 3 });
  return true;
}

