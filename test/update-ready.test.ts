// UPDATE-READY (docs/notes/release-fixes-3.md, `src/updateReadyRules.ts`): the "A new version is ready" card comes up on the home screen
// only, once a new version's worker has taken over from an old one, and once a session; never in a fight or under a card.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isNewVersion, updateDue, type UpdateLook } from '../src/updateReadyRules';
import { UPDATE_WORDS } from '../src/updateReady';

const at = (l: Partial<UpdateLook>): UpdateLook => ({ ready: true, shown: false, home: true, fighting: false, covered: false, ...l });

test('on the home screen, once a new version is ready, once a session', () => {
  assert.equal(updateDue(at({})), true);
  assert.equal(updateDue(at({ ready: false })), false, 'no new version');
  assert.equal(updateDue(at({ shown: true })), false, 'already offered: Later means later');
});

test('never in a fight, off the home screen or under a card', () => {
  assert.equal(updateDue(at({ fighting: true })), false);
  assert.equal(updateDue(at({ home: false })), false);
  assert.equal(updateDue(at({ covered: true })), false);
  // (a fight under the home screen still counts as a fight)
  assert.equal(updateDue(at({ home: true, fighting: true })), false);
});

test('the first visit taking charge is no new version', () => {
  assert.equal(isNewVersion(false), false);
  assert.equal(isNewVersion(true), true);
});

test('the words, and the page asks only from the home screen', () => {
  assert.equal(UPDATE_WORDS.title, 'A new version is ready');
  assert.equal(UPDATE_WORDS.reload, 'Reload');
  const src = readFileSync('src/main.ts', 'utf8');
  assert.match(src, /watchUpdate\(\(\) => \(\{\s*home: this\.homeUp,/);
  assert.match(src, /if \(!this\.homeUp\) return;\s*tips\.update\(\);\s*offerUpdate\(\);/);
  // (Reload is the player's tap only: nothing reloads by itself)
  const card = readFileSync('src/updateReady.ts', 'utf8');
  assert.equal(card.match(/location\.reload\(\)/g)?.length, 1);
  assert.match(card, /onClick: \(\) => location\.reload\(\)/);
});
