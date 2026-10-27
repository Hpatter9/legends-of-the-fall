import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { attackMotion } from '../src/render/motionRules';

describe('attack presentation', () => {
  it('starts and ends at rest and clamps outside the swing', () => {
    assert.deepEqual(attackMotion(0), { offset: 0, stretch: 0 });
    assert.deepEqual(attackMotion(1), { offset: 0, stretch: 0 });
    assert.deepEqual(attackMotion(-1), attackMotion(0));
    assert.deepEqual(attackMotion(2), attackMotion(1));
  });
  it('draws back before a forward strike and settles without snapping', () => {
    assert.ok(attackMotion(0.2).offset < 0);
    assert.ok(attackMotion(0.45).offset > attackMotion(0.8).offset);
    for (const join of [0.25, 0.45]) {
      const a = attackMotion(join - 0.00001);
      const b = attackMotion(join + 0.00001);
      assert.ok(Math.abs(a.offset - b.offset) < 0.01);
      assert.ok(Math.abs(a.stretch - b.stretch) < 0.01);
    }
  });
});
