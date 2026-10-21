import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addUnit, startBattle, stepBattle, TICK_MS, type Battle, type BattleEvent } from '../src/sim/battle';
import { castSpell, HASTE_MS, HEAL_SHARE, isHasted, MANA_MAX, MANA_START, METEOR_MS, SPELLS } from '../src/sim/spells';
import { readyBattle } from './helpers';

/** A flat, empty board mid-fight. */
function arena(): Battle {
  const b = startBattle(3);
  for (const t of b.board.tiles) (t.h = 0), (t.rock = false);
  b.units = [];
  b.phase = 'fight';
  return b;
}
const run = (b: Battle, ms: number): BattleEvent[] => {
  const out: BattleEvent[] = [];
  for (const end = b.t + ms; b.t < end; ) out.push(...stepBattle(b));
  return out;
};

test('mana fills a second at a time and stops at the top', () => {
  const b = arena();
  addUnit(b, 'knight', 3, 7);
  addUnit(b, 'skeleton', 3, 0);
  assert.equal(b.spells.mana, MANA_START);
  run(b, 3000);
  assert.equal(b.spells.mana, MANA_START + 3);
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
