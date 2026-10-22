import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addUnit, creditOf, heroesPlaced, startBattle } from '../src/sim/battle';
import { fightXp, XP_PER_DAMAGE } from '../src/sim/levels';
import { startStats, tally } from '../src/sim/fightStats';

// A decoy, treant or imp a skill calls up is its caller's: its damage, healing, kills and the blows it takes count for the
// caller's row and XP, and it is not a hero of its own (it does not count as placed, or as fallen).
const setUp = () => {
  const b = startBattle(5);
  const me = addUnit(b, 'illusionist', 2, 7, {}, 1);
  const stats = startStats(b.units);
  const d = addUnit(b, 'decoy', 3, 7);
  d.owner = me.id;
  return { b, me, d, stats };
};

test("a decoy's damage, kills and blows taken count for the illusionist's row", () => {
  const { b, me, d, stats } = setUp();
  const foe = b.units.find((u) => u.side === 'foe')!;
  tally(stats, [{ kind: 'hit', by: d.id, to: foe.id, dmg: 30, killed: true } as never, { kind: 'hit', by: foe.id, to: d.id, dmg: 12 } as never], b.units);
  const row = stats.find((s) => s.id === me.id)!;
  assert.equal(row.dealt, 30);
  assert.equal(row.kills, 1);
  assert.equal(row.taken, 12);
  assert.equal(stats.some((s) => s.kind === 'decoy'), false);
  assert.equal(creditOf(b, d), me);
});

test("a decoy's XP goes to the illusionist, and the decoy is not a hero placed", () => {
  const { b, d } = setUp();
  const before = fightXp(b).illusionist;
  d.dealt = XP_PER_DAMAGE * 10;
  const after = fightXp(b);
  assert.equal(after.decoy, undefined);
  assert.equal(after.illusionist, before + 10);
  assert.equal(heroesPlaced(b), 1);
});
