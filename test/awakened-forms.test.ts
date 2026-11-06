import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { ALL_HEROES, TWENTY_HEROES, formOf, UNITS } from '../src/sim/units';
import { AWAKENED_SHEETS_LATER, awakenedSheet, battleSheet, combatAuraStep, lookSheet } from '../src/render/awakenLook';
import { heroLook, rearView } from '../src/render/heroFacing';
import { auraParts } from '../src/render/auraStyles';
import art from '../src/art/awakened/manifest.json';
import originalArt from '../src/art/units/sheets.json';

test('permanent equipment and combat aura strength progress independently for every hero', () => {
  for (const kind of ALL_HEROES) {
    for (const grade of [1, 2, 3, 4]) {
      const base = formOf(UNITS[kind], grade);
      assert.equal(lookSheet(kind, 4, grade), base, `${kind}: top rank is not awakening`);
      const upgraded = battleSheet(kind, 1, grade);
      // (a hero whose awakened sheets come later keeps its plain sprite, awakened: the owner's deferral)
      if (AWAKENED_SHEETS_LATER.has(kind)) assert.equal(upgraded, base, `${kind}: keeps its plain sprite until its awakened sheets come`);
      else assert.notEqual(upgraded, base, `${kind}: awakened at tier ${grade}`);
      assert.equal(battleSheet(kind, 2, grade), upgraded, `${kind}: second step keeps equipment`);
      const parts = auraParts(kind, combatAuraStep(grade));
      assert.equal(parts.length === 0, grade === 1, `${kind}: tier one has no combat aura`);
      assert.deepEqual(parts, auraParts(kind, Math.min(2, grade - 1)), `${kind}: existing aura artwork reused`);
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
  const layouts = art.layouts as Record<string, { w: number; h: number; figure: number; perRow: number; rear?: string; rows: string[]; counts: Record<string, number>; aliases?: Record<string, string> }>;
  assert.equal(Object.keys(art.forms).length, ALL_HEROES.length - AWAKENED_SHEETS_LATER.size + 4, 'every hero but those whose sheets come later, and four supporting transformations');
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
  const originals = originalArt as Record<string, { rows: string[] }>;
  for (const kind of ALL_HEROES.filter((k) => !AWAKENED_SHEETS_LATER.has(k))) {
    const upgraded = layouts[battleSheet(kind, 1, 1)];
    for (const row of originals[UNITS[kind].sheet].rows) {
      if (row === '_walk') continue;
      assert.ok(upgraded.rows.includes(row) || upgraded.rows.includes(upgraded.aliases?.[row] ?? ''), `${kind}: retains ${row}`);
    }
  }
});

test('the heroes whose awakened sheets come later are new heroes with none yet, each with its awakened menu figure', () => {
  const forms = art.forms as Record<string, string>;
  for (const kind of AWAKENED_SHEETS_LATER) {
    assert.ok(TWENTY_HEROES.includes(kind), `${kind}: only the twenty may wait`);
    assert.equal(forms[UNITS[kind].sheet], undefined, `${kind}: its awakened sheets are in, so it leaves the list`);
    assert.ok(existsSync(`src/art/heroes/awakened-${kind}.webp`), `${kind}: its awakened figure for the menus`);
  }
});
