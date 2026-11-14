import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ARMIES } from '../src/sim/armies';
import { HOLD_SHARE, LAST_SHARE, RESTORM_SHARE, shareOf } from '../src/sim/assault/garrison';

// ASSAULT-RETUNE (docs/notes/assault-retune.md): the Warband regrouped stands at its own share of its hold's, on top of the Mythic tier.
test('the Warband regrouped takes its own share; the Last Hold and a first storming do not', () => {
  for (const a of ARMIES) {
    assert.ok((RESTORM_SHARE[a.id] ?? 0) > 0.5 && RESTORM_SHARE[a.id] < 3, a.id);
    assert.equal(shareOf({ army: a.id }), HOLD_SHARE[a.id]);
    assert.equal(shareOf({ army: a.id, tier: 3 }), HOLD_SHARE[a.id]);
    assert.equal(shareOf({ army: a.id, tier: 4 }), HOLD_SHARE[a.id] * RESTORM_SHARE[a.id]);
    assert.equal(shareOf({ army: a.id, last: true }), HOLD_SHARE[a.id] * LAST_SHARE[a.id]);
    // (a tool's own share is the share, whatever the storming)
    assert.equal(shareOf({ army: a.id, tier: 4, foeShare: 0.2 }), 0.2);
  }
});
