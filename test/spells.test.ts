import { bareBoard } from './bare';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addUnit, hurt, startBattle, stepBattle, TICK_MS, type Battle, type BattleEvent } from '../src/sim/battle';
import { castSpell, HASTE_MS, HEAL_SHARE, isHasted, MANA_MAX, MANA_PER_SEC, MANA_START, METEOR_MS, SPELLS, SPELL_IDS, RALLY_MULT, RALLY_MS, SHIELD_SHARE, SHIELD_MS, SMITE_POWER, CHAIN_POWER, FREEZE_MS, SLOW_MS, POISON_DMG, QUAKE_POWER, RESURRECT_SHARE, isSlowed, speedOf } from '../src/sim/spells';
import { defOf } from '../src/sim/battle';
import { tileAt } from '../src/sim/board';
import { readyBattle } from './helpers';

/** A flat, empty board mid-fight. */
function arena(): Battle {
  const b = startBattle(3);
  bareBoard(b);
  b.units = [];
  b.phase = 'fight';
  return b;
}
const run = (b: Battle, ms: number): BattleEvent[] => {
  const out: BattleEvent[] = [];
  for (const end = b.t + ms; b.t < end; ) out.push(...stepBattle(b));
  return out;
};

test('mana fills slowly, a tick at a time, and stops at the top', () => {
  const b = arena();
  addUnit(b, 'knight', 3, 7);
  addUnit(b, 'skeleton', 3, 0);
  assert.equal(b.spells.mana, MANA_START);
  run(b, 3000);
  assert.equal(b.spells.mana, MANA_START + 3 * MANA_PER_SEC);
  b.units[0].hp = b.units[0].maxHp = 1e9;
  b.units[1].hp = b.units[1].maxHp = 1e9;
  run(b, 20000);
  assert.equal(b.spells.mana, MANA_MAX);
});

test('a cast is refused without mana, in cooldown, off the board, or outside a fight', () => {
  const b = arena();
  addUnit(b, 'knight', 3, 7);
  addUnit(b, 'skeleton', 3, 0);
  b.spells.mana = SPELLS.meteor.cost - 0.5;
  assert.equal(castSpell(b, 'meteor', 3, 0), false);
  assert.equal(b.spells.mana, SPELLS.meteor.cost - 0.5);
  b.spells.mana = MANA_MAX;
  assert.equal(castSpell(b, 'heal', -1, 0), false);
  assert.equal(castSpell(b, 'heal', 3, 7), true);
  assert.equal(b.spells.mana, MANA_MAX - SPELLS.heal.cost);
  // cooling down
  assert.equal(castSpell(b, 'heal', 3, 7), false);
  run(b, SPELLS.heal.cooldownMs);
  assert.equal(castSpell(b, 'heal', 3, 7), true);
  const d = startBattle(1);
  d.spells.mana = MANA_MAX;
  assert.equal(castSpell(d, 'heal', 3, 7), false);
});

test('heal restores heroes in the 3x3 only, never past full', () => {
  const b = arena();
  const near = addUnit(b, 'knight', 3, 7);
  const edge = addUnit(b, 'samurai', 4, 6);
  const far = addUnit(b, 'archer', 0, 8);
  const full = addUnit(b, 'kunoichi', 2, 8);
  addUnit(b, 'skeleton', 3, 0);
  b.spells.mana = MANA_MAX;
  for (const x of [near, edge, far]) x.hp = 10;
  full.hp = full.maxHp - 5;
  assert.ok(castSpell(b, 'heal', 3, 7));
  assert.equal(near.hp, 10 + Math.round(near.maxHp * HEAL_SHARE));
  assert.equal(edge.hp, 10 + Math.round(edge.maxHp * HEAL_SHARE));
  assert.equal(far.hp, 10);
  assert.equal(full.hp, full.maxHp);
  const heals = stepBattle(b).filter((e) => e.kind === 'heal');
  assert.equal(heals.length, 3);
});

test('meteor hits the foes in the 3x3 after its delay, and spares heroes and far foes', () => {
  const b = arena();
  const hero = addUnit(b, 'knight', 3, 3);
  const a = addUnit(b, 'skeleton', 3, 2);
  const c = addUnit(b, 'skeleton', 4, 1);
  const far = addUnit(b, 'skeleton', 0, 0);
  b.spells.mana = MANA_MAX;
  for (const x of b.units) x.busyUntil = 1e9; // (everyone holds still)
  assert.ok(castSpell(b, 'meteor', 3, 2));
  const heroHp = hero.hp;
  const out: BattleEvent[] = [];
  while (b.t < METEOR_MS - TICK_MS) out.push(...stepBattle(b));
  assert.equal(a.hp, a.maxHp);
  out.push(...stepBattle(b), ...stepBattle(b));
  assert.ok(a.hp < a.maxHp && c.hp < c.maxHp);
  assert.ok(far.hp > a.hp || far.hp === far.maxHp);
  assert.equal(far.hp, far.maxHp);
  assert.equal(hero.hp, heroHp);
  assert.ok(out.some((e) => e.kind === 'spell' && e.id === 'meteor'));
  assert.ok(out.filter((e) => e.kind === 'hit' && e.by === 0).length >= 2);
});

test('haste speeds up attacks and walking for a while, then wears off', () => {
  const swingGap = (hasted: boolean): number => {
    const b = arena();
    const k = addUnit(b, 'samurai', 3, 5);
    // (its pool emptied, so it swings rather than casts: this is about the swing's pace)
    k.charge = 0;
    addUnit(b, 'skeleton', 3, 4).hp = 1e9;
    if (hasted) {
      b.spells.mana = MANA_MAX;
      assert.ok(castSpell(b, 'haste', 3, 5));
      assert.ok(k.hasteUntil === b.t + HASTE_MS);
    }
    stepBattle(b);
    return k.busyUntil - b.t;
  };
  const slow = swingGap(false);
  const fast = swingGap(true);
  assert.ok(fast < slow * 0.75);
  const b = arena();
  const k = addUnit(b, 'knight', 3, 7);
  addUnit(b, 'skeleton', 3, 0);
  b.spells.mana = MANA_MAX;
  castSpell(b, 'haste', 3, 7);
  assert.ok(isHasted(b, k));
  run(b, HASTE_MS + TICK_MS);
  assert.ok(!isHasted(b, k));
});

test('the same casts at the same ticks play out the same', () => {
  const play = (): string => {
    const b = readyBattle(11);
    b.phase = 'fight';
    const heroes = b.units.filter((x) => x.side === 'hero');
    for (let i = 0; i < 400 && b.phase === 'fight'; i++) {
      if (i === 50) castSpell(b, 'haste', heroes[0].u, heroes[0].v);
      if (i === 120) castSpell(b, 'meteor', 3, 3);
      if (i === 200) castSpell(b, 'heal', heroes[1].u, heroes[1].v);
      stepBattle(b);
    }
    return JSON.stringify([b.t, b.spells, b.units.map((x) => [x.id, x.u, x.v, x.hp, x.alive])]);
  };
  assert.equal(play(), play());
});

test('mana comes back at half the old pace, and a full bar buys only a few casts', () => {
  assert.ok(MANA_PER_SEC <= 0.5);
  assert.ok(MANA_START >= 2 && MANA_START < MANA_MAX);
  // a 40s fight gives the mana for 2 to 5 casts of the usual spells
  const gained = MANA_START + 40 * MANA_PER_SEC;
  const typical = SPELL_IDS.reduce((n, id) => n + SPELLS[id].cost, 0) / SPELL_IDS.length;
  assert.ok(gained / typical >= 2 && gained / typical <= 6);
});

/** Everyone holds still, so a spell's own effect is all that happens. */
const still = (b: Battle) => {
  for (const x of b.units) x.busyUntil = 1e9;
};

test('every spell has a cost, a cooldown and a power', () => {
  for (const id of SPELL_IDS) {
    const sp = SPELLS[id];
    assert.ok(sp.cost >= 1 && sp.cost <= MANA_MAX && sp.cooldownMs > 0 && sp.power >= 1 && sp.power <= 5, id);
  }
  assert.ok(SPELL_IDS.length >= 10);
});

test('shield soaks damage for a while, then is spent or expires', () => {
  const b = arena();
  const k = addUnit(b, 'knight', 3, 7);
  const near = addUnit(b, 'archer', 4, 7);
  const far = addUnit(b, 'archer', 0, 8);
  const foe = addUnit(b, 'skeleton', 3, 0);
  still(b);
  b.spells.mana = MANA_MAX;
  assert.ok(castSpell(b, 'shield', 3, 7));
  assert.equal(k.shield?.hp, Math.round(k.maxHp * SHIELD_SHARE));
  assert.ok(near.shield && !far.shield);
  const before = k.hp;
  const soak = k.shield!.hp;
  hurt(b, foe, k, 5, false, false, []);
  assert.equal(k.hp, before);
  assert.ok(k.shield && k.shield.hp < soak);
  hurt(b, foe, k, 1000, false, false, []);
  assert.ok(k.hp < before && before - k.hp <= 1000 - soak);
  assert.equal(k.shield, undefined);
  // an unspent shield runs out with time
  near.hp = near.maxHp;
  run(b, SHIELD_MS + TICK_MS);
  hurt(b, foe, near, 50, false, false, []);
  assert.ok(near.hp < near.maxHp);
});

test('smite strikes the sturdiest foe in the area only', () => {
  const b = arena();
  addUnit(b, 'knight', 3, 7);
  const weak = addUnit(b, 'skeleton', 3, 2);
  const strong = addUnit(b, 'skeleton', 4, 2);
  const far = addUnit(b, 'skeleton', 0, 0);
  strong.hp = strong.maxHp = 5000;
  still(b);
  b.spells.mana = MANA_MAX;
  assert.ok(castSpell(b, 'smite', 3, 2));
  assert.equal(strong.hp, 5000 - (SMITE_POWER - defOf(strong).def));
  assert.equal(weak.hp, weak.maxHp);
  assert.equal(far.hp, far.maxHp);
});

test('chain lightning leaps to up to three more foes, weaker each time', () => {
  const b = arena();
  addUnit(b, 'knight', 3, 7);
  const line = [0, 1, 2, 3, 4].map((u) => addUnit(b, 'skeleton', u, 1));
  for (const f of line) f.hp = f.maxHp = 5000;
  const lone = addUnit(b, 'skeleton', 6, 8);
  lone.hp = lone.maxHp = 5000;
  still(b);
  b.spells.mana = MANA_MAX;
  assert.ok(castSpell(b, 'chain', 0, 1));
  const out = stepBattle(b);
  const lost = line.map((f) => f.maxHp - f.hp);
  assert.equal(lost.filter((n) => n > 0).length, 4);
  assert.equal(lost[4], 0);
  assert.equal(lost[0], Math.max(1, CHAIN_POWER - defOf(line[0]).def));
  assert.ok(lost[0] > lost[1] && lost[1] > lost[2] && lost[2] > lost[3]);
  assert.equal(lone.hp, lone.maxHp);
  assert.equal(out.filter((e) => e.kind === 'arc').length, 3);
});

test('frost nova freezes foes in the area, then slows them, and spares the rest', () => {
  const b = arena();
  addUnit(b, 'knight', 3, 7);
  const a = addUnit(b, 'skeleton', 3, 2);
  const far = addUnit(b, 'skeleton', 0, 0);
  const t0 = b.t;
  b.spells.mana = MANA_MAX;
  assert.ok(castSpell(b, 'frost', 3, 2));
  assert.ok(a.busyUntil >= t0 + FREEZE_MS);
  assert.ok(a.slowUntil === t0 + SLOW_MS);
  assert.ok(far.slowUntil === undefined);
  assert.equal(speedOf(b, a), 0.5);
  assert.equal(speedOf(b, far), 1);
  run(b, SLOW_MS + TICK_MS);
  assert.equal(speedOf(b, a), 1);
});

test('a slowed fighter swings and walks at half speed, and is back to normal once it wears off', () => {
  // the first swing's wait (busyUntil from the swing) for a knight beside a skeleton, slowed or not
  const swingGap = (slowed: boolean): number => {
    const b = arena();
    const k = addUnit(b, 'knight', 3, 7);
    addUnit(b, 'skeleton', 3, 6).hp = 1e9;
    if (slowed) k.slowUntil = b.t + SLOW_MS;
    for (let i = 0; i < 200; i++) {
      if (stepBattle(b).some((e) => e.kind === 'swing' && e.by === k.id)) return k.busyUntil - b.t;
    }
    assert.fail('the knight never swung');
  };
  const fast = swingGap(false);
  const slow = swingGap(true);
  assert.ok(slow >= fast * 1.9 && slow <= fast * 2.1, `slow ${slow} vs fast ${fast}`);

  const b = arena();
  const k = addUnit(b, 'knight', 3, 7);
  addUnit(b, 'skeleton', 3, 0).hp = 1e9;
  assert.equal(speedOf(b, k), 1);
  k.slowUntil = b.t + SLOW_MS;
  assert.equal(isSlowed(b, k), true);
  assert.ok(speedOf(b, k) < 1);
  run(b, SLOW_MS + TICK_MS);
  assert.equal(isSlowed(b, k), false);
  assert.equal(speedOf(b, k), 1);
});

test('rally raises every hero\'s attack once, then it wears off', () => {
  const b = arena();
  const a = addUnit(b, 'knight', 3, 7);
  const c = addUnit(b, 'archer', 0, 8);
  const foe = addUnit(b, 'skeleton', 3, 0);
  foe.hp = foe.maxHp = 1e9;
  still(b);
  b.spells.mana = MANA_MAX;
  assert.ok(castSpell(b, 'rally', 0, 0));
  assert.equal(a.power, RALLY_MULT);
  assert.equal(c.power, RALLY_MULT);
  assert.equal(foe.power, undefined);
  b.spells.ready.rally = 0;
  assert.ok(castSpell(b, 'rally', 0, 0));
  assert.equal(a.power, RALLY_MULT);
  run(b, RALLY_MS + 2 * TICK_MS);
  assert.ok(Math.abs((a.power ?? 0) - 1) < 1e-9);
  assert.equal(a.rallyUntil, undefined);
});

test('earthquake hits foes on low ground only', () => {
  const b = arena();
  addUnit(b, 'knight', 3, 7);
  const low = addUnit(b, 'skeleton', 3, 2);
  const high = addUnit(b, 'skeleton', 4, 2);
  tileAt(b.board, 3, 2)!.h = 0;
  tileAt(b.board, 4, 2)!.h = 3;
  still(b);
  b.spells.mana = MANA_MAX;
  assert.ok(castSpell(b, 'quake', 0, 0));
  assert.equal(low.hp, low.maxHp - Math.max(1, QUAKE_POWER - defOf(low).def));
  assert.equal(high.hp, high.maxHp);
});

test('poison cloud bites the foes inside it every second for a while', () => {
  const b = arena();
  addUnit(b, 'knight', 3, 7);
  const inside = addUnit(b, 'skeleton', 3, 2);
  const outside = addUnit(b, 'skeleton', 0, 0);
  inside.hp = inside.maxHp = 5000;
  still(b);
  b.spells.mana = MANA_MAX;
  assert.ok(castSpell(b, 'poison', 3, 2));
  run(b, 3000);
  assert.equal(inside.hp, 5000 - 3 * POISON_DMG);
  run(b, 10000);
  assert.equal(inside.hp, 5000 - 6 * POISON_DMG);
  assert.equal(outside.hp, outside.maxHp);
  assert.equal(b.spells.clouds.length, 0);
});

test('resurrect lifts a fallen hero in the area at part health, and refuses with nobody to lift', () => {
  const b = arena();
  const k = addUnit(b, 'knight', 3, 7);
  const lost = addUnit(b, 'archer', 4, 7);
  addUnit(b, 'skeleton', 3, 0);
  still(b);
  b.spells.mana = MANA_MAX;
  assert.equal(castSpell(b, 'resurrect', 3, 7), false);
  assert.equal(b.spells.mana, MANA_MAX);
  lost.alive = false;
  lost.hp = 0;
  lost.diedAt = 500;
  assert.equal(castSpell(b, 'resurrect', 0, 0), false);
  assert.ok(castSpell(b, 'resurrect', 3, 7));
  assert.ok(lost.alive && lost.diedAt === undefined);
  assert.equal(lost.hp, Math.round(lost.maxHp * RESURRECT_SHARE));
  assert.ok(k.alive);
});

test('new spells cast at the same ticks play out the same', () => {
  const play = (): string => {
    const b = readyBattle(5);
    b.phase = 'fight';
    b.spells.mana = MANA_MAX;
    for (let i = 0; i < 300 && b.phase === 'fight'; i++) {
      if (i === 20) castSpell(b, 'rally', 0, 0);
      if (i === 40) castSpell(b, 'chain', 3, 1);
      if (i === 60) castSpell(b, 'poison', 3, 2);
      if (i === 80) castSpell(b, 'frost', 3, 2);
      stepBattle(b);
    }
    return JSON.stringify([b.t, b.spells, b.units.map((x) => [x.id, x.hp, x.alive])]);
  };
  assert.equal(play(), play());
});
