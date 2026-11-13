// SWINGS: the rendered strokes of melee blows and what a fighter leaves as it falls (docs/notes/swings.md).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SWING, bfxClip, deathClip, swingClip } from '../src/render/blenderFxRules';
import { deathKind } from '../src/render/fxRules';
import { slashOf } from '../src/render/vfxRules';
import { BODY } from '../src/render/onFighterRules';

test('every weapon has its rendered stroke: small, quick, and in the atlases every fight holds', () => {
  for (const name of ['Knight', 'Ogre', 'Skeleton Spearman', 'Kunoichi']) {
    const s = swingClip(slashOf(name));
    assert.ok(s, name);
    const c = bfxClip(s!.key)!;
    assert.ok(c.a <= 1 && !c.loop, s!.key);
    // (as a hit's spark: over in 300 ms, so it is over a body at full strength only for the rule's flash)
    assert.ok(s!.ms <= 300 && s!.ms > BODY.FLASH_MS, s!.key);
  }
  // (four different strokes: a sword's crescent, a club's arc, a spear's thrust, claws)
  assert.equal(new Set(Object.values(SWING).map((s) => s.key)).size, 4);
  // (a thrust is long and thin, a heavy arc the longest stroke and drawn the largest)
  const [thrust, heavy, blade] = [bfxClip('swing-thrust')!, bfxClip('swing-heavy')!, bfxClip('swing-blade')!];
  assert.ok(thrust.w > thrust.h * 2);
  assert.ok(heavy.w * SWING.slashEarth.size > blade.w * SWING.slashLight.size);
});

test('the stroke goes on a fighter by the ON-FIGHTER rule, and the painted slash stays as the fallback', () => {
  const fx = readFileSync('src/render/fx.ts', 'utf8');
  assert.match(fx, /if \(swing && this\.bfxFlash\(swing\.key, to\.x, to\.y - to\.tall \* 0\.5, swing\.size, swing\.ms, turn, left\)\) return;/);
  assert.match(fx, /frames: VFX\[slashOf\(defOf\(attacker\)\.name\)\],/);
  // (the flash: its first frames over the body as they are, the rest by the rule)
  assert.match(fx, /const first = Math\.max\(1, Math\.min\(frames\.length - 1, Math\.round\(UNDER\.FLASH_MS \/ per\)\)\);/);
});

test('every kind of fall has its rendered clip, and a skeleton keeps its painted bones', () => {
  for (const [name, side] of [['Skeleton', 'foe'], ['Imp', 'foe'], ['Ogre', 'foe'], ['Gorgon', 'foe'], ['Knight', 'hero'], ['Goblin', 'foe']] as const) {
    const kind = deathKind(name, side);
    const key = deathClip(kind);
    assert.ok(key, kind);
    const c = bfxClip(key!)!;
    assert.ok(c.a <= 1 && !c.loop && c.ms <= 900, key);
  }
  assert.equal(deathClip('nothing'), undefined);
  const fx = readFileSync('src/render/fx.ts', 'utf8');
  assert.match(fx, /if \(kind === 'bones'\) boneBits\(this\.particles, x, y\);/);
  assert.match(fx, /\} else deathBurst\(this\.particles, kind, x, y, target\.size \?\? 1\);/);
});
