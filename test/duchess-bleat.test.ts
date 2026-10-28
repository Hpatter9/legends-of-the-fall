import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startBattle } from '../src/sim/battle';
import { bleatCabbage, bleatStartle } from '../src/sim/duchessBleat';

// The Lucky Bleat changes the fight only through these sim rules (the page picks the effect, as with a spell).
test('a startling bleat stuns the foe nearest the heroes for its time', () => {
  const b = startBattle(3);
  const foe = bleatStartle(b, 400);
  assert.ok(foe && foe.side === 'foe');
  assert.equal(foe.stunUntil, b.t + 400);
  assert.ok(foe.busyUntil >= b.t + 400);
});

test('a kicked cabbage lands on a standable tile on the heroes\' side and is kept on the battle', () => {
  const b = startBattle(3);
  const [u, v] = bleatCabbage(b, 0.1);
  assert.ok(v >= b.board.d - 2);
  assert.deepEqual(b.cabbages, [{ u, v, healPercent: 0.1 }]);
  assert.doesNotThrow(() => structuredClone(b));
});
