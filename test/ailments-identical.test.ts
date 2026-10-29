// STATUS-FX step one: moving the old effects (damage over time, holds, slows, curses, cleanses) into the one ailment model changed
// nothing. With the new ailments switched off, seeded fights of every mode play out exactly as they did on main before the change:
// the same events, tick by tick, and the same health at the end (`tools/status-fx/logs.ts`; the fixture was recorded on main's code).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scenarioHashes } from '../tools/status-fx/logs';
import { AILMENT_SWITCH } from '../src/sim/ailments';
import recorded from './fixtures/ailment-logs.json';

test('with the new ailments off, every mode plays as it did before the ailment model', () => {
  const was = AILMENT_SWITCH.on;
  AILMENT_SWITCH.on = false;
  try {
    assert.deepEqual(scenarioHashes(), recorded);
  } finally {
    AILMENT_SWITCH.on = was;
  }
});
