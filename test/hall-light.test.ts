// HALL-LIGHT (docs/notes/hall-light.md): the Hall of Heroes scrolls lightly: each hero's portrait is a cached picture (an <img> of its sheet's
// portrait, made once a sheet), never a canvas of its own, and what moves on the roster under the Hall's sheet waits while the Hall is open.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('the Hall\'s hero cells show a cached picture, not a canvas each', () => {
  const src = readFileSync('src/hallView.ts', 'utf8');
  const cells = src.slice(src.indexOf("const grid = section('Every hero')"));
  assert.ok(!/portrait\(/.test(cells), 'no portrait canvas made in the cells');
  assert.match(cells, /picOf\(UNITS\[r\.kind\]\.sheet\)/);
  assert.match(src, /PICS\.set\(sheet, url\)/, 'one picture a sheet, kept');
  assert.match(src, /if \(!hasSheet\(sheet\)\) return null;/, 'a sheet not loaded yet keeps nothing blank');
});

test('the roster under the Hall holds its animations while the Hall is open', () => {
  const css = readFileSync('src/warRoom.css', 'utf8');
  assert.match(css, /body:has\(#hallOfHeroes\) #hmSheet \* \{ animation-play-state: paused !important; \}/);
  assert.match(readFileSync('src/hallView.ts', 'utf8'), /id: 'hallOfHeroes'/);
});
