// BOSS-BIG on the page (`bossBigRules.ts`): the cut-in never holds the fight (the owner's later rule); the marks fill in and never blink out; the bursts
// spread over the marks; every signature has a sound.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BOSS_BIG_LOOK, burstTiles, markFill, markLook } from '../src/bossBigRules';
import { cuesFor } from '../src/render/soundRules';
import type { Battle, BattleEvent } from '../src/sim/battle';

test('the cut-in is a short band over a running fight: about a second, and nothing in the rules holds the fight for it', async () => {
  assert.ok(BOSS_BIG_LOOK.BAND_MS >= 800 && BOSS_BIG_LOOK.BAND_MS <= 1400);
  const rules = await import('../src/bossBigRules');
  assert.equal('heldCut' in rules, false);
});

test('a mark fills in over the windup, always surer, and never fades below its floor', () => {
  let last = -1;
  for (let t = 0; t <= 2000; t += 50) {
    const k = markFill(t, 2000);
    assert.ok(k >= last, 'it only fills');
    last = k;
    for (const calm of [false, true]) {
      const l = markLook(t, 2000, calm);
      assert.ok(l.fill >= BOSS_BIG_LOOK.FILL_FROM * 0.9 && l.edge >= 0.75, `steady at ${t}`);
    }
  }
  assert.equal(markFill(2000, 2000), 1);
  // (with the screen kept still it does not breathe)
  assert.equal(markLook(1000, 2000, true).fill, markLook(1000, 2000, true).fill);
});

test('the blow’s bursts spread over the marks, fewer on battery saver', () => {
  const w = 8;
  const tiles: number[] = [];
  for (let v = 2; v <= 8; v++) for (let u = 0; u < 8; u++) tiles.push(v * w + u);
  const full = burstTiles(tiles, w, false);
  assert.equal(full.length, BOSS_BIG_LOOK.BURSTS);
  for (let i = 0; i < full.length; i++) for (let j = i + 1; j < full.length; j++) assert.ok((full[i].u - full[j].u) ** 2 + (full[i].v - full[j].v) ** 2 >= 4, 'apart');
  assert.equal(burstTiles(tiles, w, true).length, BOSS_BIG_LOOK.BURSTS_SAVER);
  assert.equal(burstTiles([3 * w + 3], w, false).length, 1);
  assert.deepEqual(burstTiles([], w, false), []);
});

test('a windup sounds its dark sting, a blow its deep boom, a fizzle nothing', () => {
  const b = { units: [] } as unknown as Battle;
  const ev = (phase: 'warn' | 'land' | 'fizzle'): BattleEvent => ({ kind: 'bossSig', phase, by: 1, n: 1, key: 'x', name: 'X', el: 'fire', tiles: [], ms: 2000, rage: false });
  assert.deepEqual(cuesFor(b, ev('warn')).map((c) => c.cue), ['bossSlash']);
  assert.deepEqual(cuesFor(b, ev('land')).map((c) => c.cue), ['bossImpact']);
  assert.deepEqual(cuesFor(b, ev('fizzle')), []);
});
