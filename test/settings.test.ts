import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULTS, parseSettings } from '../src/settings';

test('nothing saved gives the defaults', () => {
  assert.deepEqual(parseSettings(null), DEFAULTS);
  assert.deepEqual(parseSettings(''), DEFAULTS);
});

test('a saved choice is kept, and the rest stays the default', () => {
  const s = parseSettings(JSON.stringify({ music: 40, speed: 2, saver: true }));
  assert.equal(s.music, 40);
  assert.equal(s.speed, 2);
  assert.equal(s.saver, true);
  assert.equal(s.effects, DEFAULTS.effects);
  assert.equal(s.shake, DEFAULTS.shake);
});

test('volumes are kept within 0 to 100 and whole', () => {
  assert.equal(parseSettings('{"music":250,"effects":-5}').music, 100);
  assert.equal(parseSettings('{"music":250,"effects":-5}').effects, 0);
  assert.equal(parseSettings('{"music":33.6}').music, 34);
  assert.equal(parseSettings('{"music":"loud"}').music, DEFAULTS.music);
});

test('a wrong type or a speed other than 1 or 2 falls back to the default', () => {
  const s = parseSettings('{"shake":"yes","numbers":0,"awake":false,"speed":3}');
  assert.equal(s.shake, DEFAULTS.shake);
  assert.equal(s.numbers, DEFAULTS.numbers);
  assert.equal(s.awake, false);
  assert.equal(s.speed, 1);
});

test('text that is not JSON gives the defaults', () => {
  assert.deepEqual(parseSettings('{not json'), DEFAULTS);
  assert.deepEqual(parseSettings('42'), DEFAULTS);
});
