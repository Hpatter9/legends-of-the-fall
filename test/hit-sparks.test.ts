// HIT-SPARKS (docs/notes/hit-sparks.md): what plays where a blow lands is a rendered clip in the blow's element, small and quick,
// with the painted spark as its fallback.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { HIT_SPARK, hitSpark, type HitKind } from '../src/render/blenderFxRules';
import { BFX_CLIPS, BFX_CORE } from '../src/render/blenderFxData';
import { ELEMENTS } from '../src/render/fxRules';
import { BODY } from '../src/render/onFighterRules';

const KINDS = Object.keys(HIT_SPARK) as HitKind[];

test('every kind of landing has its spark in every element, in the atlases every fight holds', () => {
  assert.deepEqual(KINDS.sort(), ['backstab', 'block', 'blow', 'burst', 'crit']);
  for (const el of ELEMENTS) {
    for (const clip of ['blow', 'cut']) {
      const c = BFX_CLIPS[`hit-${clip}-${el}`];
      assert.ok(c, `hit-${clip}-${el}`);
      // (a fight loads nothing more for a spark: it lies with the spells and the ground loops)
      assert.ok(BFX_CORE.includes(c.a), `hit-${clip}-${el} in atlas ${c.a}`);
      assert.ok(!c.loop);
    }
    for (const kind of KINDS) assert.ok(hitSpark(kind, el, 0.2), `${kind} in ${el}`);
  }
  // (a shot's burst is in the shot's own element; a plain blow, a block, a backstab and a crit have their own)
  assert.equal(hitSpark('burst', 'fire', 0)!.key, 'hit-blow-fire');
  assert.equal(hitSpark('burst', 'poison', 0)!.key, 'hit-blow-poison');
  assert.equal(hitSpark('blow', 'fire', 0)!.key, 'hit-blow-light');
  // (a block has its own shape, the director's order: an arc in pale steel, whatever struck it)
  assert.equal(hitSpark('block', 'fire', 0)!.key, 'hit-block');
  assert.ok(BFX_CORE.includes(BFX_CLIPS['hit-block'].a) && !BFX_CLIPS['hit-block'].loop);
  assert.equal(hitSpark('backstab', 'fire', 0)!.key, 'hit-cut-dark');
  assert.equal(hitSpark('crit', 'fire', 0)!.key, 'hit-cut-light');
});

test('a spark is quick, grows with the blow, and a crit is plainly the largest', () => {
  for (const kind of KINDS) {
    assert.ok(HIT_SPARK[kind].ms < 300, `${kind}: ${HIT_SPARK[kind].ms} ms`);
    assert.ok(BFX_CLIPS[hitSpark(kind, 'light', 0)!.key].ms < 300);
  }
  // (a scratch is small, a third of the target's health is the spark at its largest)
  assert.ok(hitSpark('blow', 'light', 0)!.size < hitSpark('blow', 'light', 0.2)!.size);
  assert.equal(hitSpark('blow', 'light', 0.34)!.size, hitSpark('blow', 'light', 0.9)!.size);
  // (the least crit is larger than the greatest plain blow or burst, and its clip is the larger picture)
  const most = Math.max(hitSpark('blow', 'light', 1)!.size, hitSpark('burst', 'fire', 1)!.size);
  const crit = BFX_CLIPS['hit-cut-light'];
  const blow = BFX_CLIPS['hit-blow-light'];
  assert.ok(hitSpark('crit', 'light', 0)!.size * crit.w > most * blow.w, 'a crit no larger than a blow');
});

test('the renderer plays the spark, the painted one only when its clip is not held; over a body it is whole for the brief flash alone', () => {
  const fx = readFileSync('src/render/fx.ts', 'utf8');
  assert.match(fx, /if \(!this\.bfxHit\('block', 'ice', to\.x, to\.y - to\.tall \* 0\.5, 0\)\) this\.anim\(\{ frames: VFX\.hitLight \}/);
  assert.match(fx, /if \(!this\.bfxHit\('burst', impactElement\(m\), hx, hy, e\.dmg \/ target\.maxHp\)\) \{/);
  assert.match(fx, /\} else if \(!this\.bfxHit\('blow', 'light', hx, hy, e\.dmg \/ target\.maxHp\)\) this\.anim\(impact,/);
  assert.match(fx, /if \(!this\.bfxHit\('backstab', 'dark',/);
  assert.match(fx, /if \(!this\.bfxHit\('crit', 'light',/);
  // (the first frames, no longer than the rule's flash, are drawn as they are; the rest goes under the ON-FIGHTER rule)
  assert.ok(BODY.FLASH_MS <= 150);
  assert.match(fx, /const first = Math\.max\(1, Math\.min\(frames\.length - 1, Math\.round\(UNDER\.FLASH_MS \/ per\)\)\);/);
  // (the spark's two parts are now laid by `bfxFlash`, which a swing's stroke shares: the same two spawns, with a pose)
  assert.match(fx, /\.\.\.pose, frames: frames\.slice\(0, first\), frameMs: per, life: first \* per, prio: true, solid: true, bare: true \}\);/);
  assert.match(fx, /\.\.\.pose, frames: frames\.slice\(first\), frameMs: per, life: \(frames\.length - first\) \* per, delay: first \* per, prio: true \}\);/);
  const parts = readFileSync('src/render/particles.ts', 'utf8');
  assert.match(parts, /const low = b\.bare \? null : this\.under\?\.\(/);
});
