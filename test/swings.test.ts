// SWINGS: the rendered strokes of melee blows and what a fighter leaves as it falls (docs/notes/swings.md).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BLINK_CUT, BFX_SCALE, SWING, bfxClip, blinkCut, deathClip, strandLay, swingClip } from '../src/render/blenderFxRules';
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

test('a blink that strikes has its rendered streak, fitted to the hop, and the crossed cut on the foe; the painted ones are the fallback', () => {
  const look = blinkCut();
  assert.ok(look);
  const [streak, cut] = [bfxClip(BLINK_CUT.streak)!, bfxClip(BLINK_CUT.cut)!];
  // (both in the atlases every fight holds, and quick: the streak a long thin stroke)
  assert.ok(streak.a <= 1 && cut.a <= 1 && BLINK_CUT.ms < 300 && BLINK_CUT.CUT_MS < 300);
  assert.ok(streak.w > streak.h * 4);
  // (the cut lands after the streak sets off)
  assert.ok(BLINK_CUT.CUT_LAG > 0 && BLINK_CUT.CUT_LAG < BLINK_CUT.ms);
  // (one stroke for a hop of up to one and a half of its length, never stretched beyond that; two for a longer one)
  const own = streak.w * BFX_SCALE;
  assert.equal(strandLay(0, 0, own * 1.4, 0, own, BLINK_CUT.STRETCH).at.length, 1);
  assert.equal(strandLay(0, 0, own * 1.6, 0, own, BLINK_CUT.STRETCH).at.length, 2);
  assert.ok(strandLay(0, 0, own * 2.9, 0, own, BLINK_CUT.STRETCH).stretch <= BLINK_CUT.STRETCH);
  const fx = readFileSync('src/render/fx.ts', 'utf8');
  assert.match(fx, /if \(foe && !this\.bfxBlinkCut\(x0, y0 - lift, x1, y1 - lift, foe\.x, foe\.y - foe\.tall \* 0\.5, delay\)\) \{/);
  assert.match(fx, /this\.paintAlong\(PAINT\.slash, x0, y0 - lift, x1, y1 - lift, \{ delay \}\);/);
});
