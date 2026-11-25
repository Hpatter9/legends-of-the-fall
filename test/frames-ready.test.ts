import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { frameAt, framesReady } from '../src/render/framesReadyRules';

test('a list of frames that load out of order is whole only when every place is filled, whatever its length', () => {
  // (the castle's goat: the last of eight pictures arrives first, and the list is at once eight long)
  const frames: (string | undefined)[] = [];
  frames[7] = 'h';
  assert.equal(frames.length, 8);
  assert.equal(framesReady(frames, 8), false);
  assert.equal(frameAt(frames, 4), undefined);
  assert.equal(frameAt(frames, 7), 'h');
  for (let i = 0; i < 7; i++) {
    frames[i] = String(i);
    assert.equal(framesReady(frames, 8), i === 6, `after ${i + 1} more`);
  }
  assert.equal(frameAt(frames, 4), '4');
  assert.equal(framesReady([], 0), true);
  assert.equal(frameAt(frames, 99), undefined);
});

test('the castle paints its goat by that rule, never by the list\'s length, and never draws a frame it does not have', () => {
  const castle = readFileSync('src/castle.ts', 'utf8');
  assert.ok(!/duchess\.length/.test(castle), 'the length is not asked');
  assert.match(castle, /if \(this\.goat && framesReady\(this\.terrace\.duchess, DUCHESS_FRAMES\)\) \{/);
  assert.match(castle, /const pose = frameAt\(this\.terrace\.duchess, frame\);\n\s+if \(pose\) g\.drawImage\(pose,/);
  // (and the painter calls back when its loading is done, which paints the hall again with her in it)
  assert.match(castle, /new CrownTerracePainter\(\(\) => \{ if \(this\.meta\) this\.paintGreatHall\(\); \}\)/);
});
