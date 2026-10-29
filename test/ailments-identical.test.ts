// STATUS-FX step one: moving the old effects (damage over time, holds, slows, curses, cleanses) into the one ailment model changed
// nothing. With the new ailments switched off, seeded fights of every mode play out exactly as they did on main before the change:
// the same events, tick by tick, and the same health at the end (`tools/status-fx/logs.ts`; the fixture was recorded on main's code).
// (TIER-PROMISES re-recorded three of its scenarios, `army`, `daily` and `tower`, whose merged heroes' tier skills now do what their words say: the
// owner's ask, `docs/notes/tier-promises.md`. Only those three moved; the proof stands for every other mode.)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scenarioHashes } from '../tools/status-fx/logs';
import { AILMENT_SWITCH } from '../src/sim/ailments';
import recorded from './fixtures/ailment-logs.json';
import { ARMIES } from '../src/sim/armies';
import { CAL_SCALE } from '../src/sim/calamity';
import { DAILY_ANSWER } from '../src/sim/modes';
import { KITS } from '../src/sim/abilities';

// (MERGE-TWO, the owner's change to merging, re-recorded the three scenarios that hire and merge: `army`, `daily` and `tower` (two of a kind merge,
// by the greedy player's Auto merge, and the spire's foes grow faster); every other scenario's hash is the one recorded on main)
// (the balance pass that followed, step two, moved a few foe strengths and the Shambler's Plague Tide to answer the ailments: they are put back to
// main's for this proof)
test('with the new ailments off, every mode plays as it did before the ailment model', () => {
  const was = AILMENT_SWITCH.on;
  const infernal = ARMIES.find((a) => a.id === 'infernal') as unknown as { start: number };
  // (LATE-RETUNE made the Yokai and the Golem Forge tougher on Normal, `docs/notes/late-retune.md`: put back to the strengths recorded)
  type Strength = { start: number; mid?: { hp: number; atk: number }; last?: { hp: number; atk: number } };
  const yokai = ARMIES.find((a) => a.id === 'yokai') as unknown as Strength;
  const golems = ARMIES.find((a) => a.id === 'golems') as unknown as Strength;
  const late = { yokai: { ...yokai }, golems: golems.start };
  const plague = KITS.shambler.ultimate!.tuned!;
  const tuned = { start: infernal.start, bossHp: CAL_SCALE.bossHp, ult: DAILY_ANSWER.ult, plague: plague.power };
  AILMENT_SWITCH.on = false;
  infernal.start = 10;
  Object.assign(yokai, { start: 12.5, mid: { hp: 2200, atk: 52 }, last: { hp: 2500, atk: 50 } });
  golems.start = 12.7;
  CAL_SCALE.bossHp = 1;
  DAILY_ANSWER.ult = 0.17;
  plague.power = 0.99;
  try {
    assert.deepEqual(scenarioHashes(), recorded);
  } finally {
    AILMENT_SWITCH.on = was;
    infernal.start = tuned.start;
    Object.assign(yokai, late.yokai);
    golems.start = late.golems;
    CAL_SCALE.bossHp = tuned.bossHp;
    DAILY_ANSWER.ult = tuned.ult;
    plague.power = tuned.plague;
  }
});
