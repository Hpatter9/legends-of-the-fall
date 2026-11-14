// RELEASE-AUDIT (docs/notes/release-audit-code.md, `src/homeMotionRules.ts`): the home screen's painted scenes move only on their own
// tab, and none moves under a page over the whole home screen (Settings, the achievements, codex or armies page).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { homeMotion, type HomeLook } from '../src/homeMotionRules';

const at = (l: Partial<HomeLook>): HomeLook => ({ tab: 'battle', sheet: false, covered: false, pulling: false, card: false, castleOpen: true, ...l });

test('only the scene of the tab showing moves', () => {
  assert.deepEqual(homeMotion(at({ tab: 'battle' })), { camp: 'move', tavern: 'stop', hall: 'stop', library: 'stop', castle: 'stop' });
  assert.deepEqual(homeMotion(at({ tab: 'heroes' })), { camp: 'stop', tavern: 'move', hall: 'stop', library: 'stop', castle: 'stop' });
  assert.deepEqual(homeMotion(at({ tab: 'recruit' })), { camp: 'stop', tavern: 'stop', hall: 'move', library: 'stop', castle: 'stop' });
  assert.deepEqual(homeMotion(at({ tab: 'spells' })), { camp: 'stop', tavern: 'stop', hall: 'stop', library: 'move', castle: 'stop' });
  assert.deepEqual(homeMotion(at({ tab: 'castle' })), { camp: 'stop', tavern: 'stop', hall: 'stop', library: 'stop', castle: 'move' });
});

test('nothing moves under Settings or a page over the whole home screen', () => {
  for (const tab of ['battle', 'heroes', 'recruit', 'spells', 'castle'] as const) {
    const go = homeMotion(at({ tab, covered: true }));
    assert.deepEqual(Object.values(go), ['stop', 'stop', 'stop', 'stop', 'stop'], tab);
  }
});

test('as before: a sheet stills the camp and the tavern, a building card the courtyard, a shut Castle never moves', () => {
  assert.equal(homeMotion(at({ tab: 'battle', sheet: true })).camp, 'stop');
  assert.equal(homeMotion(at({ tab: 'heroes', sheet: true })).tavern, 'stop');
  assert.equal(homeMotion(at({ tab: 'castle', card: true })).castle, 'stop');
  assert.equal(homeMotion(at({ tab: 'castle', castleOpen: false })).castle, 'stop');
});

test('a pull in flight is never cut short, not even by a page over it', () => {
  assert.equal(homeMotion(at({ tab: 'recruit', pulling: true })).hall, 'keep');
  assert.equal(homeMotion(at({ tab: 'recruit', pulling: true, covered: true })).hall, 'keep');
  assert.equal(homeMotion(at({ tab: 'recruit', pulling: false, covered: true })).hall, 'stop');
});

test('the home screen asks the rules, and watches Settings and the sub-page come and go', () => {
  const src = readFileSync('src/home.ts', 'utf8');
  assert.match(src, /homeMotion\(\{/);
  assert.match(src, /for \(const id of \['settings', 'hmSub'\]\) watchCover\.observe/);
});
