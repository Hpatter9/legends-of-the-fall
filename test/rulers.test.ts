import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BREATH_MS, DEFAULT_RULER, RULERS, SEAT_BREATH, rulerFrame, rulerOf, rulerWords, seatFrame } from '../src/rulerRules';

test('the roster contains eight distinct appearances: five women and three men', () => {
  assert.equal(new Set(RULERS.map((r) => r.id)).size, 8);
  assert.equal(RULERS.filter((r) => r.female).length, 5);
  assert.equal(RULERS.filter((r) => !r.female).length, 3);
});

test('the Iron Stag is the default ruler, first in the picker, and anything unknown falls back to him; The King is retired but still read', () => {
  assert.equal(DEFAULT_RULER, 'iron_stag');
  assert.equal(RULERS[0].id, 'iron_stag');
  assert.equal(rulerOf('iron_stag').female, false);
  for (const v of [undefined, null, 3, 'lichKing']) assert.equal(rulerOf(v).id, 'iron_stag');
  assert.ok(!RULERS.some((r) => (r.id as string) === 'the_king'), 'not in the picker');
  assert.equal(rulerOf('the_king').id, 'iron_stag', 'the old id reads as the Iron Stag');
  assert.equal(rulerWords('The king at his throne.', 'iron_stag'), 'The king at his throne.');
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

test('on the throne the throne never moves: a painted ruler holds one seated frame whatever the time, and only breathes', () => {
  const times = Array.from({ length: 60 }, (_, i) => i * 137);
  for (const r of RULERS) {
    const box = SEAT_BREATH[r.id];
    if (!box) continue;
    // (the head box sits inside the cell)
    assert.ok(box[0] >= 0 && box[2] <= 224 && box[1] >= 2 && box[3] <= 224 && box[0] < box[2] && box[1] < box[3], r.id);
    for (const action of ['seated', 'command'] as const) {
      for (const t of times) {
        const f = seatFrame(r.id, action, t);
        assert.deepEqual([f.action, f.col], ['seated', 0], `${r.id} ${action} at ${t}`);
      }
      // (reduced motion: the still frame, no breath)
      for (const t of times) assert.equal(seatFrame(r.id, action, t, true).breath, false);
    }
    // (a slow breath: in for BREATH_MS, out for BREATH_MS)
    assert.equal(seatFrame(r.id, 'seated', 0).breath, false);
    assert.equal(seatFrame(r.id, 'seated', BREATH_MS + 1).breath, true);
    assert.equal(seatFrame(r.id, 'seated', 2 * BREATH_MS + 1).breath, false);
  }
});
