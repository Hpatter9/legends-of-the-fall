import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RULERS, rulerFrame, rulerWords } from '../src/rulerRules';

test('the roster contains eight distinct appearances: five women and three men', () => {
  assert.equal(new Set(RULERS.map((r) => r.id)).size, 8);
  assert.equal(RULERS.filter((r) => r.female).length, 5);
  assert.equal(RULERS.filter((r) => !r.female).length, 3);
});

test('death and actions finish without restarting; idle and walking keep moving', () => {
  assert.equal(rulerFrame('dead', 0), 0);
  assert.equal(rulerFrame('dead', 360), 2);
  for (const action of ['dead', 'cast', 'strike', 'hurt', 'command'] as const) {
    assert.equal(rulerFrame(action, 720), 3);
    assert.equal(rulerFrame(action, 9000), 3);
  }
  assert.equal(rulerFrame('walk', 520), 0);
  assert.equal(rulerFrame('seated', 1400), 0);
  assert.equal(rulerFrame('dead', 0, true), 3);
  assert.equal(rulerFrame('cast', 0, true), 2);
});

test('queen text changes the player reference without renaming enemy kings or kingdoms', () => {
  assert.equal(rulerWords('The king faces the Lich King in the kingdom.', 'frost_witch'), 'The queen faces the Lich King in the kingdom.');
  assert.equal(rulerWords('The king at his throne.', 'sun_viper'), 'The queen at her throne.');
  assert.equal(rulerWords('The king faces the Oni King.', 'iron_stag'), 'The king faces the Oni King.');
});
