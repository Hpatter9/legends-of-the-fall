import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newMeta } from '../src/sim/meta';
import { BUILDING_IDS, ROOM_BUILDING_IDS, buildMs } from '../src/sim/castle';
import { CASTLE_SITES, sitePresentation, constructionProgress } from '../src/castleTab';

test('the building ledger includes every castle site once', () => {
  assert.deepEqual([...CASTLE_SITES].sort(), [...BUILDING_IDS, ...ROOM_BUILDING_IDS, 'chapel'].sort());
});
test('building status distinguishes affordability, construction elsewhere, completion and unbuilt benefits', () => {
  const meta = newMeta(7);
  meta.crowns = 1000;
  const unbuilt = sitePresentation(meta, 'treasury', 100);
  assert.equal(unbuilt.levelText, 'Unbuilt');
  assert.equal(unbuilt.benefit, '+10 starting gold');
  assert.equal(unbuilt.action, 'Build');
  assert.equal(unbuilt.ready, true);
  meta.crowns = 0;
  assert.equal(sitePresentation(meta, 'treasury', 100).ready, false);
  meta.crowns = 1000;
  meta.castle.treasury = 2;
  assert.equal(sitePresentation(meta, 'treasury', 100).benefit, '+20 starting gold');
  assert.equal(sitePresentation(meta, 'treasury', 100).cost, 180);
  meta.works = {id:'barracks', level:1, doneAt:10000};
  const busy = sitePresentation(meta, 'treasury', 100);
  assert.equal(busy.action, 'Builders busy');
  assert.equal(busy.ready, false);
  assert.equal(busy.cost, 180, 'next upgrade cost remains available while the builders work elsewhere');
  assert.equal(sitePresentation(meta, 'barracks', 100).action, 'Building');
  meta.castle.treasury = 5;
  assert.equal(sitePresentation(meta, 'treasury', 100).action, 'Complete');
});
test('construction progress uses the actual site duration and clamps old or completed timestamps', () => {
  const meta = newMeta(7);
  assert.equal(constructionProgress(meta, 0), 0);
  for (const id of ['treasury', 'chapel'] as const) {
    const duration = buildMs(id, 1);
    meta.works = {id, level:1, doneAt:duration};
    assert.equal(constructionProgress(meta, -duration), 0);
    assert.equal(constructionProgress(meta, duration / 2), .5);
    assert.equal(constructionProgress(meta, duration + 100), 1);
  }
});
