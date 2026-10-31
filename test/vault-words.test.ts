import { test } from 'node:test';
import assert from 'node:assert/strict';
import { vaultBullets, vaultInfo, vaultLine, vaultNext } from '../src/vaultRules';
import { bonusGold, BUILDINGS, maxLevel, newCastle } from '../src/sim/castle';
import { armyRun, ARMY_START_GOLD } from '../src/sim/run';
import { ARMIES } from '../src/sim/armies';

test("the vault's numbers are the Treasury's own rules, level by level", () => {
  for (let level = 0; level <= maxLevel('treasury'); level++) {
    const c = { ...newCastle(), treasury: level };
    const v = vaultInfo(c);
    assert.equal(v.gold, bonusGold(c));
    assert.equal(v.nextCost, BUILDINGS.treasury.costs[level] ?? null);
    assert.equal(v.nextGold, level < maxLevel('treasury') ? bonusGold({ ...c, treasury: level + 1 }) : null);
    assert.equal(v.topGold, bonusGold({ ...c, treasury: maxLevel('treasury') }));
    // (and what it says is what a run gets)
    assert.equal(armyRun(1, ARMIES[0].id, ['knight'], c).gold, ARMY_START_GOLD + v.gold);
  }
});

test('the vault in words: the line, the next step, and four bullets', () => {
  const none = vaultInfo(newCastle());
  assert.match(vaultLine(none), /Not built/);
  assert.match(vaultNext(none), /Level 1: \+10 gold for 50 crowns/);
  const two = vaultInfo({ ...newCastle(), treasury: 2 });
  assert.equal(vaultLine(two), 'Every run starts with +20 gold in the purse.');
  const full = vaultInfo({ ...newCastle(), treasury: maxLevel('treasury') });
  assert.match(vaultNext(full), /^Full: \+50 gold/);
  const b = vaultBullets(two);
  assert.equal(b.length, 4);
  assert.match(b[0], /^What goes in: crowns/);
  assert.match(b[1], /^What you get/);
  assert.match(b[2], /^When:.*Not the daily or the Last Stand/);
  assert.match(b[3], /^The limit: level 5, \+50 gold/);
});
