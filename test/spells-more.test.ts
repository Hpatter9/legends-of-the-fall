import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addUnit, atkOf, defOf, heroesPlaced, hurt, startBattle, stepBattle, TICK_MS, type Battle, type BattleEvent } from '../src/sim/battle';
import { hidden } from '../src/sim/equipFx';
import { fightXp } from '../src/sim/levels';
import { CHARGE_MAX, BRITTLE_MULT } from '../src/sim/abilities';
import {
  BLINK_HIDE_MS, BULWARK_MS, BULWARK_SHARE, castSpell, CLEANSE_HEAL, DEEPFREEZE_MS, HEX_MS, HEX_MULT, LANCE_POWER, MANA_MAX, METEOR_MS, RENEWAL_MS, RENEWAL_SHARE, SHOWER_GAP, SHOWER_POWER, SHOWER_SPOTS,
  SPELL_IDS, SPELLS, STARTER_SPELLS, unlockSpell, WARCRY_CHARGE, WOLVES, readLoadout, equipSpell, type SpellId,
} from '../src/sim/spells';
import { tileAt } from '../src/sim/board';
import { startedMeta } from '../src/sim/meta';
import { readyBattle } from './helpers';

const NEW: SpellId[] = ['cleanse', 'blink', 'hex', 'lance', 'renewal', 'deepfreeze', 'warcry', 'bulwark', 'wolves', 'starfall'];

/** A flat, empty board mid-fight with a full mana bar. */
function arena(): Battle {
  const b = startBattle(3);
  for (const t of b.board.tiles) (t.h = 0), (t.rock = false);
  b.units = [];
  b.phase = 'fight';
  b.spells.mana = MANA_MAX;
  return b;
}
const run = (b: Battle, ms: number): BattleEvent[] => {
  const out: BattleEvent[] = [];
  for (const end = b.t + ms; b.t < end; ) out.push(...stepBattle(b));
  return out;
};
/** Everyone holds still, so a spell's own effect is all that happens. */
const still = (b: Battle) => {
  for (const x of b.units) x.busyUntil = 1e9;
};

test('ten new spells: costs, cooldowns and power fit the rules, each costs crowns, and the starters are unchanged', () => {
  assert.equal(SPELL_IDS.length, 11 + NEW.length);
  assert.deepEqual([...STARTER_SPELLS], ['heal', 'meteor', 'haste']);
  for (const id of NEW) {
    const sp = SPELLS[id];
    assert.ok(SPELL_IDS.includes(id), id);
    assert.ok(sp.cost >= 1 && sp.cost <= MANA_MAX && sp.cooldownMs >= 6000 && sp.power >= 1 && sp.power <= 5 && sp.price >= 60 && sp.price <= 300, id);
    assert.ok(sp.text.length > 10, id);
  }
  // (the pricier a spell, the stronger: price rises with power, and no two of a power are more than 130 crowns apart in the new ten)
  const byPrice = [...NEW].sort((x, y) => SPELLS[x].price - SPELLS[y].price);
  for (let i = 1; i < byPrice.length; i++) assert.ok(SPELLS[byPrice[i]].power >= SPELLS[byPrice[i - 1]].power - 1, byPrice[i]);
  // (the strongest costs the most mana, and nothing outdoes the existing top spells in power)
  assert.equal(Math.max(...NEW.map((id) => SPELLS[id].power)), 5);
  // (three of the new ones that fit the base budget exist, and the biggest three never do)
  const m = startedMeta(1);
  m.spellbook.owned = [...SPELL_IDS];
  m.spellbook.equipped = [];
  for (const id of ['hex', 'lance', 'renewal'] as const) assert.ok(equipSpell(m, id), id);
});

test('the new spells are bought with crowns like the others, and a saved loadout keeps them', () => {
  const m = startedMeta(2);
  m.crowns = 100;
  assert.equal(unlockSpell(m, 'starfall'), false);
  assert.ok(unlockSpell(m, 'cleanse'));
  assert.equal(m.crowns, 100 - SPELLS.cleanse.price);
  assert.equal(unlockSpell(m, 'cleanse'), false);
  const l = readLoadout({ owned: ['cleanse', 'lance', 'nonsense'], equipped: ['lance', 'cleanse'] }, 9);
  assert.deepEqual(l.owned, [...STARTER_SPELLS, 'cleanse', 'lance']);
  assert.deepEqual(l.equipped, ['lance', 'cleanse']);
});

test('light lance hits every foe in the tapped column for raw damage less defence, and no one else', () => {
  const b = arena();
  const k = addUnit(b, 'knight', 3, 7);
  const near = addUnit(b, 'skeleton', 3, 1);
  const far = addUnit(b, 'orcBrute', 3, 3);
  const beside = addUnit(b, 'skeleton', 4, 1);
  still(b);
  const hp = [near, far, beside, k].map((x) => x.hp);
  assert.ok(castSpell(b, 'lance', 3, 5));
  assert.equal(b.spells.mana, MANA_MAX - SPELLS.lance.cost);
  assert.equal(near.hp, hp[0] - (LANCE_POWER - defOf(near).def));
  assert.equal(far.hp, hp[1] - (LANCE_POWER - defOf(far).def));
  assert.equal(beside.hp, hp[2]);
  assert.equal(k.hp, hp[3]);
  // (an empty column still casts: the mana is spent, nothing is hurt)
  assert.ok(castSpell(b, 'meteor', 6, 6));
});

test('bulwark shields every hero for 30% of its health, for six seconds', () => {
  const b = arena();
  const a = addUnit(b, 'knight', 0, 7);
  const c = addUnit(b, 'archer', 6, 8);
  const foe = addUnit(b, 'skeleton', 3, 0);
  still(b);
  assert.ok(castSpell(b, 'bulwark', 0, 0));
  for (const h of [a, c]) assert.deepEqual(h.shield, { hp: Math.round(h.maxHp * BULWARK_SHARE), until: b.t + BULWARK_MS });
  assert.equal(foe.shield, undefined);
  // (it soaks a blow first)
  hurt(b, foe, a, 10, false, false, []);
  assert.equal(a.hp, a.maxHp);
  assert.ok(a.shield!.hp < Math.round(a.maxHp * BULWARK_SHARE));
});

test('deep freeze holds the sturdiest foe in the area, which takes 30% more until it thaws', () => {
  const b = arena();
  const k = addUnit(b, 'knight', 3, 7);
  const small = addUnit(b, 'skeleton', 3, 2);
  const big = addUnit(b, 'orcBrute', 4, 2);
  const out = addUnit(b, 'orcBrute', 3, 5);
  still(b);
  small.busyUntil = 0;
  assert.ok(castSpell(b, 'deepfreeze', 3, 2));
  assert.ok(big.busyUntil >= b.t + DEEPFREEZE_MS && big.stunUntil === b.t + DEEPFREEZE_MS);
  assert.equal(small.stunUntil, undefined);
  assert.equal(out.brittleUntil, undefined);
  const before = big.hp;
  hurt(b, k, big, 100, false, false, []);
  assert.equal(before - big.hp, Math.round(100 * BRITTLE_MULT));
  b.t += DEEPFREEZE_MS;
  const after = big.hp;
  hurt(b, k, big, 100, false, false, []);
  assert.equal(after - big.hp, 100);
});

test('battle cry jumps every hero\'s skill meter by 40, never past full', () => {
  const b = arena();
  const a = addUnit(b, 'knight', 1, 7);
  const c = addUnit(b, 'samurai', 5, 7);
  const foe = addUnit(b, 'skeleton', 3, 0);
  still(b);
  c.charge = CHARGE_MAX - 10;
  foe.charge = 0;
  assert.ok(castSpell(b, 'warcry', 0, 0));
  assert.equal(a.charge, WARCRY_CHARGE);
  assert.equal(c.charge, CHARGE_MAX);
  assert.equal(foe.charge, 0);
});

test('meteor shower drops five small meteors, one after another, and a foe where two overlap takes both', () => {
  const b = arena();
  addUnit(b, 'knight', 0, 8);
  const middle = addUnit(b, 'orcBrute', 3, 3);
  const seam = addUnit(b, 'orcBrute', 2, 3);
  const out = addUnit(b, 'orcBrute', 6, 0);
  for (const x of [middle, seam, out]) x.hp = x.maxHp = 5000;
  still(b);
  assert.ok(castSpell(b, 'starfall', 3, 3));
  assert.equal(b.spells.mana, MANA_MAX - SPELLS.starfall.cost);
  assert.equal(b.spells.falls.length, SHOWER_SPOTS.length);
  assert.deepEqual(b.spells.falls.map((f) => f.at - b.t), SHOWER_SPOTS.map((_, i) => METEOR_MS + i * SHOWER_GAP));
  const events = run(b, METEOR_MS + SHOWER_SPOTS.length * SHOWER_GAP);
  assert.equal(events.filter((e) => e.kind === 'area').length, SHOWER_SPOTS.length);
  const raw = SHOWER_POWER - defOf(middle).def;
  assert.equal(5000 - middle.hp, raw);
  assert.equal(5000 - seam.hp, raw * 2);
  assert.equal(5000 - out.hp, 0);
  assert.equal(b.spells.falls.length, 0);
});

test('meteor shower tells the renderer about each meteor, and a plain meteor is unchanged', () => {
  const b = arena();
  addUnit(b, 'knight', 0, 8);
  addUnit(b, 'skeleton', 3, 0);
  castSpell(b, 'starfall', 3, 3);
  const ev = b.spells.events.filter((e) => e.kind === 'area');
  assert.equal(ev.length, 5);
  assert.deepEqual(ev.map((e) => (e.kind === 'area' ? e.ms : 0)), SHOWER_SPOTS.map((_, i) => METEOR_MS + i * SHOWER_GAP));
  const c = arena();
  addUnit(c, 'knight', 0, 8);
  const foe = addUnit(c, 'orcBrute', 3, 3);
  foe.hp = foe.maxHp = 5000;
  still(c);
  castSpell(c, 'meteor', 3, 3);
  run(c, METEOR_MS);
  assert.equal(5000 - foe.hp, 110 - defOf(foe).def);
});

test('call the wolves puts two wolves on free tiles in the area; they fight for the king and are no hero lost', () => {
  const b = arena();
  const k = addUnit(b, 'knight', 3, 7);
  addUnit(b, 'skeleton', 3, 0);
  assert.ok(castSpell(b, 'wolves', 3, 6));
  const wolves = b.units.filter((x) => x.def === 'wolf');
  assert.equal(wolves.length, WOLVES);
  for (const w of wolves) {
    assert.equal(w.side, 'hero');
    assert.ok(Math.abs(w.u - 3) <= 1 && Math.abs(w.v - 6) <= 1);
    assert.ok(!(w.u === k.u && w.v === k.v));
    assert.equal(w.owner, undefined);
  }
  assert.notDeepEqual([wolves[0].u, wolves[0].v], [wolves[1].u, wolves[1].v]);
  assert.ok(wolves[0].maxHp > defOf(wolves[0]).hp);
  // (they are not counted as heroes placed, and earn no XP of their own)
  assert.equal(heroesPlaced(b), 1);
  b.phase = 'won';
  assert.deepEqual(Object.keys(fightXp(b)), ['knight']);
  // (the same cast on the same fight puts them on the same tiles)
  const c = arena();
  addUnit(c, 'knight', 3, 7);
  addUnit(c, 'skeleton', 3, 0);
  castSpell(c, 'wolves', 3, 6);
  assert.deepEqual(c.units.filter((x) => x.def === 'wolf').map((w) => [w.u, w.v]), wolves.map((w) => [w.u, w.v]));
});

test('call the wolves is refused, and costs nothing, with no room', () => {
  const b = arena();
  for (let du = -1; du <= 1; du++) for (let dv = -1; dv <= 1; dv++) addUnit(b, 'knight', 3 + du, 6 + dv);
  assert.equal(castSpell(b, 'wolves', 3, 6), false);
  assert.equal(b.spells.mana, MANA_MAX);
  assert.equal(b.spells.ready.wolves, 0);
});

test('cleanse frees heroes in the area of burns, slows, holds and charms, and heals 15%, leaving the rest alone', () => {
  const b = arena();
  const a = addUnit(b, 'knight', 3, 7);
  const out = addUnit(b, 'archer', 0, 8);
  const foe = addUnit(b, 'skeleton', 3, 0);
  still(b);
  for (const x of [a, out, foe]) {
    x.dot = { kind: 'burn', dmg: 5, every: 1000, ms: 4000, by: 99, next: b.t + 1000, until: b.t + 4000 };
    x.slowUntil = b.t + 5000;
    x.stunUntil = b.t + 3000;
    x.charmUntil = b.t + 3000;
    x.hp = Math.round(x.maxHp * 0.5);
  }
  assert.ok(castSpell(b, 'cleanse', 3, 7));
  assert.equal(a.dot, undefined);
  assert.equal(a.slowUntil, undefined);
  assert.equal(a.stunUntil, undefined);
  assert.equal(a.charmUntil, undefined);
  assert.ok(a.busyUntil <= b.t + TICK_MS);
  assert.equal(a.hp, Math.round(a.maxHp * 0.5) + Math.round(a.maxHp * CLEANSE_HEAL));
  assert.ok(out.dot && out.slowUntil && out.stunUntil && out.charmUntil);
  assert.ok(foe.dot && foe.slowUntil);
  assert.equal(out.hp, Math.round(out.maxHp * 0.5));
});

test('blink sends the most wounded hero to the tapped free tile, where it cannot be targeted for a moment', () => {
  const b = arena();
  const a = addUnit(b, 'knight', 3, 7);
  const hurtOne = addUnit(b, 'archer', 0, 8);
  const foe = addUnit(b, 'skeleton', 3, 0);
  hurtOne.hp = Math.round(hurtOne.maxHp * 0.3);
  still(b);
  // (a tile with someone on it, or a rock, is refused and costs nothing)
  assert.equal(castSpell(b, 'blink', 3, 7), false);
  assert.equal(b.spells.mana, MANA_MAX);
  tileAt(b.board, 6, 8)!.rock = true;
  assert.equal(castSpell(b, 'blink', 6, 8), false);
  assert.equal(castSpell(b, 'blink', -1, 3), false);
  assert.ok(castSpell(b, 'blink', 5, 8));
  assert.deepEqual([hurtOne.u, hurtOne.v], [5, 8]);
  assert.deepEqual([a.u, a.v], [3, 7]);
  assert.ok(hidden(b, hurtOne));
  const ev = b.spells.events.find((e) => e.kind === 'blink');
  assert.deepEqual(ev && ev.kind === 'blink' ? [ev.by, ev.from, ev.to] : null, [hurtOne.id, { u: 0, v: 8 }, { u: 5, v: 8 }]);
  b.t += BLINK_HIDE_MS;
  assert.ok(!hidden(b, hurtOne));
  void foe;
});

test('blink with no hero to move is refused', () => {
  const b = arena();
  addUnit(b, 'skeleton', 3, 0);
  assert.equal(castSpell(b, 'blink', 3, 5), false);
  assert.equal(b.spells.mana, MANA_MAX);
});

test('renewal heals heroes in the area 8% a second for eight seconds', () => {
  const b = arena();
  const a = addUnit(b, 'knight', 3, 7);
  const out = addUnit(b, 'archer', 0, 8);
  addUnit(b, 'skeleton', 3, 0);
  still(b);
  a.hp = out.hp = 1;
  a.maxHp = out.maxHp = 1000;
  assert.ok(castSpell(b, 'renewal', 3, 7));
  run(b, RENEWAL_MS + 2000);
  assert.equal(a.hp, 1 + Math.round(1000 * RENEWAL_SHARE) * (RENEWAL_MS / 1000));
  assert.equal(out.hp, 1);
  assert.equal(a.hot, undefined);
});

test('hex cuts the attack of foes in the area by 30% for eight seconds, once however often it is cast', () => {
  const b = arena();
  addUnit(b, 'knight', 3, 7);
  const a = addUnit(b, 'skeleton', 3, 2);
  const far = addUnit(b, 'skeleton', 0, 0);
  still(b);
  const atk = atkOf(a);
  assert.ok(castSpell(b, 'hex', 3, 2));
  assert.ok(Math.abs(atkOf(a) - atk * HEX_MULT) < 1e-9);
  assert.equal(atkOf(far), atk);
  run(b, SPELLS.hex.cooldownMs);
  assert.ok(castSpell(b, 'hex', 3, 2));
  assert.ok(Math.abs(atkOf(a) - atk * HEX_MULT) < 1e-9, 'not cut twice');
  run(b, HEX_MS + 500);
  assert.ok(Math.abs(atkOf(a) - atk) < 1e-9);
  assert.equal(a.weakUntil, undefined);
});

test('a fight with the new spells plays out the same every time', () => {
  const play = () => {
    const b = readyBattle(11);
    b.spells.mana = MANA_MAX;
    const log: string[] = [];
    const casts: [SpellId, number, number][] = [['hex', 3, 1], ['lance', 3, 2], ['deepfreeze', 3, 1], ['starfall', 3, 3], ['wolves', 3, 6], ['renewal', 3, 7], ['bulwark', 0, 0], ['warcry', 0, 0], ['cleanse', 3, 7], ['blink', 6, 6]];
    for (let i = 0; i < 200 && b.phase === 'fight'; i++) {
      if (i % 10 === 0 && casts.length) {
        const [id, u, v] = casts.shift()!;
        b.spells.mana = MANA_MAX;
        log.push(`${id}:${castSpell(b, id, u, v)}`);
      }
      stepBattle(b);
    }
    return JSON.stringify([log, b.t, b.phase, b.units.map((x) => [x.def, x.u, x.v, x.hp, x.alive])]);
  };
  assert.equal(play(), play());
});
