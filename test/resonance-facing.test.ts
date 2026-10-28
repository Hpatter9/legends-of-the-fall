import { test } from 'node:test';
import assert from 'node:assert/strict';
import { facesAway, facesRight, setFrame } from '../src/render/iso';
import { heroLook, rearView } from '../src/render/heroFacing';
import type { Rot } from '../src/sim/turn';

test('four fighter views follow each rotated isometric section', () => {
  const expected = [
    ['front-right', 'front-left', 'back-left', 'back-right'],
    ['back-right', 'front-right', 'front-left', 'back-left'],
    ['back-left', 'back-right', 'front-right', 'front-left'],
    ['front-left', 'back-left', 'back-right', 'front-right'],
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
