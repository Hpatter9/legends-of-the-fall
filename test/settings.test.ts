import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULTS, parseSettings, SAVE_KEYS } from '../src/settings';
import { SLOT_KEYS } from '../src/sim/run';

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

test('Start over wipes every run in progress: the ordinary one and the spire and Calamity slots (a new game starts them all afresh)', () => {
  for (const k of ['legends.meta', 'legends.run', ...Object.values(SLOT_KEYS)]) assert.ok(SAVE_KEYS.includes(k), k);
  assert.ok(!SAVE_KEYS.includes('legends.settings') && !SAVE_KEYS.includes('legends.sound'));
});

test('the chosen ruler is saved by identity; missing and malformed choices get the Iron Stag', () => {
  assert.equal(parseSettings(null).ruler, 'iron_stag');
  assert.equal(parseSettings('{"music":40}').ruler, 'iron_stag', 'settings saved before the rulers');
  assert.equal(parseSettings('{"ruler":"frost_witch"}').ruler, 'frost_witch');
  assert.equal(parseSettings('{"ruler":"iron_stag"}').ruler, 'iron_stag');
  for (const ruler of [null, 2, {}, 'lichKing', 'unknown']) {
    assert.equal(parseSettings(JSON.stringify({ ruler })).ruler, 'iron_stag');
  }
});

// The King was retired in DEFAULT-RULER (the owner's call): a save that chose him loads as the Iron Stag, quietly, with every other setting kept.
test('a saved The King loads as the Iron Stag and keeps every other setting', () => {
  const saved = { ruler: 'the_king', rulerPicked: true, music: 40, effects: 25, speed: 2, shake: false, quips: false };
  const got = parseSettings(JSON.stringify(saved));
  assert.equal(got.ruler, 'iron_stag');
  assert.deepEqual({ ...got, ruler: 'x' }, { ...parseSettings(JSON.stringify({ ...saved, ruler: 'iron_stag' })), ruler: 'x' });
  assert.equal(got.music, 40);
  assert.equal(got.speed, 2);
  assert.equal(got.shake, false);
  assert.equal(parseSettings('{"ruler":"the_king"}').ruler, 'iron_stag', 'a King never picked in the picker too');
  assert.equal(parseSettings('{"ruler":"sun_viper"}').ruler, 'sun_viper');
  assert.equal(parseSettings('{"ruler":"iron_stag","rulerPicked":true}').rulerPicked, true);
});
