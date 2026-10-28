import { test } from 'node:test';
import assert from 'node:assert/strict';
import { facesAway, facesRight, setFrame } from '../src/render/iso';
import { heroLook, rearView } from '../src/render/heroFacing';
import type { Rot } from '../src/sim/turn';
import { ALL_HEROES, UNITS } from '../src/sim/units';
import layout from '../src/art/units/sheets.json';

test('four fighter views follow each rotated isometric section', () => {
  const expected = [
    ['front-right', 'front-left', 'back-left', 'back-right'],
    ['front-left', 'back-left', 'back-right', 'front-right'],
    ['back-left', 'back-right', 'front-right', 'front-left'],
    ['back-right', 'front-right', 'front-left', 'back-left'],
  ];
  try {
    for (const rot of [0, 1, 2, 3] as Rot[]) {
      setFrame({ rot, w: 12, d: 16, ou: 9, ov: -4 });
      assert.deepEqual([0, 1, 2, 3].map(dir => `${facesAway(dir) ? 'back' : 'front'}-${facesRight(dir) ? 'right' : 'left'}`), expected[rot]);
    }
  } finally { setFrame(); }
});

test('hero transformations keep their identity and select matching new rear art', () => {
  assert.equal(heroLook('werewolf', 'werewolf_white'), 'hero_res_werewolf');
  assert.equal(heroLook('werewolf', 'werewolf_black'), 'hero_res_werewolf_brute');
  assert.equal(heroLook('druid', 'cls_treant_3'), 'hero_res_treant3');
  assert.equal(heroLook('skeleton', 'skeleton_warrior'), 'skeleton_warrior');
  assert.equal(rearView('hero_soldier'), 'hero_soldier_back');
  assert.equal(rearView('skeleton_warrior'), 'skeleton_warrior');
});

test('every collectible hero has matched front/rear art and a complete alternating stride', () => {
  const sheets = layout as Record<string, { rear?: string; w: number; h: number; figure: number; rows: string[]; counts: Record<string, number> }>;
  for (const id of ALL_HEROES) {
    const front = sheets[UNITS[id].sheet];
    assert.ok(front.rear, `${id}: rear artwork`);
    const rear = sheets[front.rear];
    assert.equal(rear.w, front.w, id);
    assert.equal(rear.h, front.h, id);
    assert.equal(rear.figure, front.figure, id);
    for (const view of [front, rear]) {
      assert.equal(view.counts.walk, 8, id);
      assert.equal(view.rows[view.rows.indexOf('walk') + 1], '_walk', id);
    }
  }
});
