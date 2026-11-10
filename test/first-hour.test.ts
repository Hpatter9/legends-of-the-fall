// FIRST-HOUR (docs/notes/first-hour.md): the rules fixed after playing a new save's first hour.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { roman } from '../src/sim/roman';
import { modesHidden, namesHiddenMode, setModesHidden } from '../src/sim/hiddenModes';
import { LOADING_TIPS } from '../src/quipData';
import { devGrant } from '../src/sim/devGrant';
import { modeOpen } from '../src/sim/modeUnlock';
import { newMeta } from '../src/sim/meta';
import { sceneList, sceneOfHiddenMode } from '../src/sim/sceneRules';
import { FOE_ENTRIES, whereMet } from '../src/sim/codex';
import { ALL_HEROES } from '../src/sim/units';
import { ARMIES } from '../src/sim/armies';
import { hireHintWords, TIPS } from '../src/tips';

test('a hero\'s card number is a true Roman numeral for every hero', () => {
  assert.equal(roman(67), 'LXVII');
  assert.equal(roman(69), 'LXIX');
  assert.equal(roman(75), 'LXXV');
  assert.equal(roman(18), 'XVIII');
  assert.equal(roman(40), 'XL');
  assert.equal(roman(49), 'XLIX');
  assert.equal(roman(90), 'XC');
  for (let n = 1; n <= Math.max(100, ALL_HEROES.length); n++) assert.match(roman(n), /^(C|XC|L?X{0,3}|XL)(IX|IV|V?I{0,3})$/, `${n}`);
});

test('while the modes are hidden no loading tip names them, and plenty of tips are left', () => {
  assert.equal(modesHidden(), true);
  const shown = LOADING_TIPS.filter((t) => !namesHiddenMode(t));
  assert.ok(shown.length >= 20);
  assert.ok(shown.length < LOADING_TIPS.length, 'some tips are about the modes');
  for (const t of shown) assert.doesNotMatch(t, /Last Stand|Calamity/);
  setModesHidden(false);
  assert.equal(namesHiddenMode('the Last Stand never ends'), false, 'nothing is held back once the modes are shown');
  setModesHidden(true);
});

test('Build Town opens the castle gate (the Castle tab has no testing door of its own)', () => {
  const m = newMeta(5);
  assert.equal(modeOpen(m, 'castle'), false);
  devGrant(m, 'town', 0);
  assert.equal(modeOpen(m, 'castle'), true);
  devGrant(m, 'town', 0);
  assert.equal(m.opened?.filter((k) => k === 'castle').length, 1, 'written once');
});

test('the Scenes list of a new save shows no scene of a hidden mode', () => {
  const rows = sceneList(newMeta(9));
  assert.ok(rows.length > 5);
  for (const r of rows) {
    assert.doesNotMatch(r.text, /Calamity|Last Stand|Ascension|first elite/, r.id);
    assert.equal(sceneOfHiddenMode(r.id), false, r.id);
  }
  setModesHidden(false);
  assert.ok(sceneList(newMeta(9)).some((r) => /Calamity/.test(r.text)), 'they come back with the modes');
  setModesHidden(true);
});

test('where a foe is met names no hidden mode for a foe of the armies', () => {
  const orcs = ARMIES[0];
  const defs = new Set(orcs.waves.flatMap((w) => w.foes));
  const met = FOE_ENTRIES.filter((e) => e.defs.some((d) => defs.has(d)));
  assert.ok(met.length >= 3);
  for (const e of met) for (const line of whereMet(e)) assert.doesNotMatch(line, /Last Stand|Calamity/, `${e.id}: ${line}`);
});

test('the hire hint counts the party picked, and the first-run tips name what is on the screen', () => {
  assert.match(hireHintWords(3), /your three are the pool/);
  assert.match(hireHintWords(5), /your five are the pool/);
  assert.match(hireHintWords(0), /your heroes are the pool/);
  assert.match(TIPS.mana.text, /SPELL/);
  assert.match(TIPS.recycle.text, /Recycle spot appears/);
  assert.match(TIPS.runes.text, /Tap Runes/);
});
