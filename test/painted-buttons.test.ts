// PAINTED-BUTTONS (docs/notes/painted-buttons.md): the owner's painted buttons. These check that every picture and plate the shared piece
// names has its cut file, that every class it puts on the page is styled, that every painted file the CSS asks for exists, and that the
// build serves the files and caches them for offline play.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { PB_CLASSES, PB_ICONS, PB_PLATES, pbUrl, speedMedal } from '../src/paintedButton';

const css = readFileSync('src/paintedButtons.css', 'utf8');

test('every painted picture and plate has its cut file', () => {
  const all = [...Object.values(PB_ICONS).flat(), ...PB_PLATES];
  assert.equal(new Set(all).size, all.length, 'no name twice');
  for (const n of all) assert.ok(existsSync(`src/art/${pbUrl(n)}`), `src/art/${pbUrl(n)} is cut (tools/painted-buttons/cut.py)`);
  // (and nothing is cut that the piece does not name)
  const files = readdirSync('src/art/ui/buttons').filter((f) => f.endsWith('.webp')).map((f) => f.replace(/\.webp$/, ''));
  for (const f of files) assert.ok((all as string[]).includes(f), `${f}.webp is named in paintedButton.ts`);
});

test('every class the shared piece puts on the page is styled in paintedButtons.css', () => {
  for (const c of PB_CLASSES) assert.match(css, new RegExp(`\\.${c}\\b`), `.${c} has no rule in paintedButtons.css`);
});

test('every painted file the CSS draws exists, and the plates read their slice lines from the cutter', () => {
  for (const [, name] of css.matchAll(/ui\/buttons\/([a-z0-9-]+)\.webp/g)) assert.ok(existsSync(`src/art/ui/buttons/${name}.webp`), `${name}.webp`);
  const slices = readFileSync('src/paintedButtonsSlices.css', 'utf8');
  for (const v of [...css.matchAll(/var\(--([a-z-]+-(?:slice|width))\)/g)].map((m) => m[1])) assert.match(slices, new RegExp(`--${v}:`), `--${v} is written by the cutter`);
});

test('the build serves the painted buttons and caches them for offline play, after every other sheet', () => {
  const build = readFileSync('build.mjs', 'utf8');
  assert.match(build, /readdirSync\('src\/art\/ui\/buttons'\)/);
  assert.match(build, /UI_FILES\.push\(`ui\/buttons\/\$\{f\}`\)/);
  // (loaded last, so the painted faces win over the drawn ones)
  assert.match(build, /readFileSync\('src\/paintedButtons\.css', 'utf8'\)\)\s*\n/);
});

test('the speed medallion has one, two or three chevrons; reduced motion keeps the presses still', () => {
  assert.deepEqual([1, 2, 3, 4].map(speedMedal), ['speed-1', 'speed-2', 'speed-3', 'speed-3']);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{[^}]*transform: none/);
});
