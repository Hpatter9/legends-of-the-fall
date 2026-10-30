import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compareVersions, EARLIER, releaseOf, UPDATES, updatesUnseen } from '../src/updates';

const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string };

test('the newest update is the version in package.json (a release adds its entry when it bumps the version)', () => {
  assert.equal(UPDATES[0].version, pkg.version, `add an entry for ${pkg.version} at the top of UPDATES in src/updates.ts`);
});

test('the updates run newest first, with no version twice, and the earlier ranges carry on below them', () => {
  for (let i = 1; i < UPDATES.length; i++) assert.ok(compareVersions(UPDATES[i - 1].version, UPDATES[i].version) > 0, `${UPDATES[i - 1].version} before ${UPDATES[i].version}`);
  assert.ok(compareVersions(EARLIER[0].to, UPDATES[UPDATES.length - 1].version) < 0);
  for (let i = 1; i < EARLIER.length; i++) assert.ok(compareVersions(EARLIER[i].to, EARLIER[i - 1].from) < 0);
  for (const e of EARLIER) assert.ok(compareVersions(e.from, e.to) <= 0 && e.summary.length > 0);
});

test('each update is short: a title, a known-shape date and one to five plain lines', () => {
  assert.ok(UPDATES.length >= 40);
  for (const u of UPDATES) {
    assert.match(u.version, /^\d+\.\d+\.\d+$/);
    if (u.date) assert.match(u.date, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(u.title.length > 0 && u.title.length <= 50, u.version);
    assert.ok(u.notes.length >= 1 && u.notes.length <= 5, u.version);
    for (const n of u.notes) assert.ok(n.length > 0 && n.length <= 160, `${u.version}: ${n}`);
  }
});

test('versions compare by number, and the "New" dot shows until the current release is seen', () => {
  assert.ok(compareVersions('0.100.0', '0.99.0') > 0);
  assert.equal(releaseOf('0.233.0 · abc1234'), '0.233.0');
  assert.equal(updatesUnseen(null, '0.233.0 · abc1234'), true);
  assert.equal(updatesUnseen('0.232.0', '0.233.0 · abc1234'), true);
  assert.equal(updatesUnseen('0.233.0', '0.233.0 · abc1234 · dev-1'), false);
});
