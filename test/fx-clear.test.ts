// FX-CLEAR: effects laid over a fighter are see-through, so the fighter under them still reads (docs/notes/fx-clear.md).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OVER_FIGHTER_ALPHA, OVER_FIGHTER_STATUS_ALPHA, coverAlpha, overFighter } from '../src/render/overFighter';
import { AILMENTS, OVER_BODY, STATUS_STYLES, partAlpha } from '../src/render/statusStyles';

test('the over-fighter alphas thin an effect but keep it plainly visible (never gone)', () => {
  for (const a of [OVER_FIGHTER_ALPHA, OVER_FIGHTER_STATUS_ALPHA]) assert.ok(a >= 0.45 && a < 1, `${a}`);
  assert.equal(coverAlpha(0.9, false), 0.9);
  assert.ok(Math.abs(coverAlpha(0.9, true) - 0.9 * OVER_FIGHTER_ALPHA) < 1e-9);
});

test('an effect over a fighter body is found; one off to the side, or on empty ground, is not', () => {
  const bodies = [{ x: 100, y: 200, tall: 50 }];
  // (on the body's middle, small)
  assert.equal(overFighter(100, 175, 8, bodies), true);
  // (a big ring at the feet reaches up over the body)
  assert.equal(overFighter(100, 196, 40, bodies), true);
  // (a small one a tile away)
  assert.equal(overFighter(160, 175, 8, bodies), false);
  // (well over the head, where the chips and numbers go)
  assert.equal(overFighter(100, 120, 10, bodies), false);
  assert.equal(overFighter(100, 175, 8, []), false);
});

test("an ailment's parts in front of the body are thinned; the ground and back parts keep their alpha", () => {
  for (const a of AILMENTS) {
    for (const part of Object.values(STATUS_STYLES[a].parts)) {
      if (!part || part.place === 'icon' || part.place === 'burst') continue;
      const want = OVER_BODY.includes(part.place) ? part.alpha * OVER_FIGHTER_STATUS_ALPHA : part.alpha;
      assert.ok(Math.abs(partAlpha(part) - want) < 1e-9, `${a}.${part.place}`);
      if (part.place === 'ground' || part.place === 'back') assert.equal(partAlpha(part), part.alpha);
      else assert.ok(partAlpha(part) > 0.3, `${a}.${part.place} still shows`);
    }
  }
});

test('the biggest front parts (frozen ice, burning flames) sit low and leave the face clear', () => {
  for (const a of ['freeze', 'burn'] as const) {
    const f = STATUS_STYLES[a].parts.front!;
    // (the top of the part stays below the fighter's head: centre plus half its size, in body heights)
    assert.ok(f.at + f.size / 2 <= 0.55, `${a}: ${f.at} + ${f.size}/2`);
  }
});
