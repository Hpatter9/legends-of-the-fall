import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { ALL_HEROES, formOf, UNITS } from '../src/sim/units';
import { awakenedSheet, battleSheet, combatAuraStep, lookSheet } from '../src/render/awakenLook';
import { heroLook, rearView } from '../src/render/heroFacing';
import { auraParts } from '../src/render/auraStyles';
import art from '../src/art/awakened/manifest.json';

test('permanent equipment and combat aura strength progress independently for every hero', () => {
  for (const kind of ALL_HEROES) {
    for (const grade of [1, 2, 3]) {
      const base = formOf(UNITS[kind], grade);
      assert.equal(lookSheet(kind, 4, grade), base, `${kind}: top rank is not awakening`);
      const upgraded = battleSheet(kind, 1, grade);
      assert.notEqual(upgraded, base, `${kind}: awakened at tier ${grade}`);
      assert.equal(battleSheet(kind, 2, grade), upgraded, `${kind}: second step keeps equipment`);
      const parts = auraParts(kind, combatAuraStep(grade));
      assert.equal(parts.length === 0, grade === 1, `${kind}: tier one has no combat aura`);
      assert.deepEqual(parts, auraParts(kind, grade - 1), `${kind}: existing aura artwork reused`);
    }
    assert.ok(existsSync(`src/art/heroes/awakened-${kind}.webp`), `${kind}: matching menu gear`);
  }
  assert.deepEqual([0, 1, 2, 3, 4].map(combatAuraStep), [0, 0, 1, 2, 2]);
});

test('upgraded werewolf and druid transformations retain four facings without changing enemy disguises', () => {
  for (const [kind, look, expected] of [
    ['werewolf', 'werewolf_white', 'awakened_werewolf'],
    ['werewolf', 'werewolf_black', 'awakened_werewolfBrute'],
    ['druid', 'cls_treant', 'awakened_treant'],
    ['druid', 'cls_treant_2', 'awakened_treant2'],
    ['druid', 'cls_treant_3', 'awakened_treant3'],
  ]) {
    const base = heroLook(kind, look);
    assert.equal(awakenedSheet(base, 0), base);
    assert.equal(awakenedSheet(base, 1), expected);
    assert.equal(rearView(expected), `${expected}_back`);
  }
  assert.equal(awakenedSheet('skeleton_warrior', 2), 'skeleton_warrior');
  assert.equal(rearView('skeleton_warrior'), 'skeleton_warrior');
});

test('every upgraded animation has production assets, matched views and complete eight-frame walking', () => {
  const layouts = art.layouts as Record<string, { w: number; h: number; figure: number; perRow: number; rear?: string; rows: string[]; counts: Record<string, number> }>;
  assert.equal(Object.keys(art.forms).length, 49, '45 heroes and four supporting transformations');
  for (const id of Object.values(art.forms)) {
    const front = layouts[id];
    assert.equal(front.rear, `${id}_back`);
    const rear = layouts[front.rear!];
    assert.deepEqual([rear.w, rear.h, rear.figure], [front.w, front.h, front.figure]);
    for (const name of [id, front.rear!]) {
      const layout = layouts[name];
      assert.equal(layout.counts.walk, 8, `${name}: eight walking poses`);
      assert.equal(layout.rows[layout.rows.indexOf('walk') + 1], '_walk');
      for (const row of ['idle', 'attack', 'hurt', 'dead', 'attack2']) assert.ok(layout.counts[row] > 0, `${name}: ${row}`);
      const png = readFileSync(`src/art/awakened/${name}.png`);
      assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [layout.w * layout.perRow, layout.h * layout.rows.length], `${name}: layout matches actual image`);
    }
  }
});
