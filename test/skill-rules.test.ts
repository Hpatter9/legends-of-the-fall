// The skills overhaul's rules as data (docs/notes/skills-overhaul-design.md section 3, docs/notes/skills-1.md): every hero skill has a class and
// a cooldown of its own, a kit lists its skills in slots, and the AI weighs any number of them in a fixed order.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bareBoard } from './bare';
import { addUnit, startBattle, type Battle, type BattleEvent, type Unit } from '../src/sim/battle';
import { CHARGE_MAX } from '../src/sim/abilities';
import { HERO_KITS, SLOT_LEVELS, canPay, castHero, slotOpen, type HeroKit } from '../src/sim/heroKits';
import { CLASSES } from '../src/sim/kits/table';
import { CLASS_RANGE } from '../src/sim/skillRules';
import { ALL_HEROES } from '../src/sim/units';

function arena(): Battle {
  const b = startBattle(3);
  bareBoard(b);
  b.units = [];
  b.phase = 'fight';
  b.kits = {};
  return b;
}
const spawn = (b: Battle, def: string, u: number, v: number, level = 1): Unit => addUnit(b, def, u, v, level > 1 ? { level } : {});

test('every hero kit lists its skills in slots, the first two the same as s1 and s2, each with a class and a cooldown', () => {
  for (const h of ALL_HEROES) {
    const hk = HERO_KITS()[h];
    assert.equal(hk.slots.length, 2, h);
    assert.equal(hk.slots[0], hk.s1, h);
    assert.equal(hk.slots[1], hk.s2, h);
    hk.slots.forEach((s, i) => {
      assert.equal(s.cls, CLASSES[h][i], `${h} skill ${i + 1}`);
      assert.ok(CLASS_RANGE[s.cls], `${h} skill ${i + 1}`);
      assert.ok(s.cd > 0, `${h} skill ${i + 1} has a cooldown`);
    });
  }
});

test('the slots open at their levels: skill 1 from level 1, skill 2 from level 10', () => {
  assert.deepEqual(SLOT_LEVELS, [1, 10]);
  const b = arena();
  const low = spawn(b, 'knight', 1, 1, 9);
  const high = spawn(b, 'knight', 2, 2, 10);
  assert.ok(slotOpen(low, 1) && !slotOpen(low, 2));
  assert.ok(slotOpen(high, 1) && slotOpen(high, 2));
  assert.ok(!slotOpen(high, 3), 'no third slot yet');
});

test('a slot past the kit, or one not yet open, is never paid for or cast', () => {
  const b = arena();
  const k = spawn(b, 'archer', 3, 8);
  spawn(b, 'skeleton', 3, 4);
  const hk = HERO_KITS().archer;
  k.charge = CHARGE_MAX;
  assert.ok(!canPay(b, k, hk, 2), 'skill 2 is shut at level 1');
  assert.ok(!canPay(b, k, hk, 3), 'there is no slot 3');
  // (a kit given a third slot that opens at no level is never cast)
  const three: HeroKit = { ...hk, slots: [...hk.slots, { ...hk.s2 }] };
  const out: BattleEvent[] = [];
  castHero(b, k, three, out);
  assert.equal(k.ks?.at3, undefined);
});
