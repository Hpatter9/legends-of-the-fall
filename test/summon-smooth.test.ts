// SUMMON-SMOOTH (docs/notes/summon-smooth.md): the summoning's show spread so a slow phone keeps its frames: the pure rules (the
// stagger of "Reveal all", how many flourishes play at once and how long the rest wait), the idle boxes found when the game is built,
// and the page's rules that kept a draw from restyling and redrawing the whole page.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { CARD_GAP_MS, FLOURISH_CAP, REVEAL_ALL_GAP_MS, flourishCap, flourishWait, revealAllTimes } from '../src/render/summonRules';
import { IDLE_BOX } from '../src/render/idleBoxData';
import { idleBoxOf } from '../src/render/idleBoxRules';
import layout from '../src/art/units/sheets.json';

test('"Reveal all" turns the cards one after another, quickly: ten in under a second, the first at once', () => {
  assert.deepEqual(revealAllTimes(0), []);
  assert.deepEqual(revealAllTimes(1), [0]);
  const t = revealAllTimes(10);
  assert.equal(t.length, 10);
  assert.equal(t[0], 0);
  for (let i = 1; i < t.length; i++) assert.equal(t[i] - t[i - 1], REVEAL_ALL_GAP_MS);
  assert.ok(t[9] < 1000, 'ten cards in under a second');
  assert.ok(REVEAL_ALL_GAP_MS < CARD_GAP_MS, 'faster than the cards turn by themselves');
  assert.ok(REVEAL_ALL_GAP_MS >= 50, 'never two turns in one frame of a slow phone');
});

test('at most a few flourishes play at once; the rest wait their turn, so every card still has its flourish', () => {
  assert.equal(flourishCap(false), FLOURISH_CAP.full);
  assert.equal(flourishCap(true), FLOURISH_CAP.saver);
  assert.ok(FLOURISH_CAP.saver < FLOURISH_CAP.full && FLOURISH_CAP.saver >= 1);
  // (room: no wait; those over do not count)
  assert.equal(flourishWait([], 100, 5), 0);
  assert.equal(flourishWait([50, 90, 100], 100, 2), 0);
  assert.equal(flourishWait([700, 800], 100, 3), 0);
  // (full: until the earliest of the last `cap` is over)
  assert.equal(flourishWait([700, 800, 900], 100, 3), 600);
  assert.equal(flourishWait([900, 700, 800, 1000], 100, 3), 700, 'the fourth waits for the second to end');
  // (ten cards turned by "Reveal all", each flourish 600 ms long: all ten play, none waits long, never more than the cap together)
  const LEN = 600;
  const ends: number[] = [];
  const starts: number[] = [];
  for (const at of revealAllTimes(10)) {
    const wait = flourishWait(ends, at, FLOURISH_CAP.full);
    starts.push(at + wait);
    ends.push(at + wait + LEN);
  }
  assert.equal(starts.length, 10);
  starts.forEach((s, i) => assert.ok(s - revealAllTimes(10)[i] <= 200, `card ${i} waits ${s - revealAllTimes(10)[i]} ms`));
  for (const s of starts) assert.ok(starts.filter((x) => x <= s && x + LEN > s).length <= FLOURISH_CAP.full);
});

test('every unit sheet has its idle box in the table made at build time, and the table is of the sheets as they are', () => {
  const sheets = layout as Record<string, { w: number; h: number }>;
  assert.equal(Object.keys(IDLE_BOX).length, Object.keys(sheets).length, 'a box for every sheet');
  for (const [name, [x, y, w, h, bytes, file]] of Object.entries(IDLE_BOX)) {
    const l = sheets[name];
    assert.ok(l, `${name} is a sheet`);
    assert.ok(x >= 0 && y >= 0 && w > 0 && h > 0 && x + w <= l.w && y + h <= l.h, `${name}: the box is inside its frame`);
    // (a sheet changed without the table made again: python3 tools/summon-smooth/idle-boxes.py)
    assert.equal(statSync(file).size, bytes, `${name}: the table is of this file`);
  }
  // (the page takes the table's box only for a picture that can be the one it was read from)
  const [name, [x, y, w, h]] = Object.entries(IDLE_BOX)[0];
  const l = sheets[name];
  assert.deepEqual(idleBoxOf(name, l.w * 8, l.h * 8, l.w, l.h), { x, y, w, h });
  assert.equal(idleBoxOf(name, l.w - 1, l.h, l.w, l.h), undefined, 'a picture smaller than a frame is another picture');
  assert.equal(idleBoxOf('no-such-sheet', 100, 100, 10, 10), undefined);
  assert.match(readFileSync('src/render/sheets.ts', 'utf8'), /const made = idleBoxOf\(sheet, img\.naturalWidth, img\.naturalHeight, l\.w, l\.h\);/);
});

test('a draw does not restyle or redraw the whole page: the rules that made it do so are gone', () => {
  // (no rule asks the body about a `hidden` attribute anywhere under it: only of its own children)
  for (const f of ['src/cinematics.css', 'src/sanctuary.css', 'src/pixel.css']) {
    const css = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    for (const m of css.matchAll(/body:has\(([^>\s][^)]*\[hidden\][^)]*)\)/g)) assert.fail(`${f}: body:has(${m[1]}) is asked of every descendant`);
  }
  // (a reveal hides the screens under it by a class on the body and `content-visibility`, not by a rule on every element in them)
  const pixel = readFileSync('src/pixel.css', 'utf8');
  assert.match(pixel, /body\.revealUp > :is\(#stage, #home, #top, #panel, #gacha, #party, \.stallView, \.shopView\) \{ visibility: hidden !important; content-visibility: hidden; \}/);
  assert.ok(!/body:has\(> [^)]*\.tarotReveal/.test(pixel.replace(/\/\*[\s\S]*?\*\//g, '')));
  const tarot = readFileSync('src/summonTarot.ts', 'utf8');
  assert.match(tarot, /revealHost\(\)\.append\(root\);\n\s+document\.body\.classList\.add\('revealUp'\);/);
  assert.match(tarot, /if \(!revealHost\(\)\.childElementCount\) document\.body\.classList\.remove\('revealUp'\);/);
  // (the collection, a portrait of every hero, is drawn only with its panel open; a card's face waits for its sheet to be decoded)
  const gacha = readFileSync('src/gacha.ts', 'utf8');
  assert.match(gacha, /if \(\(\$\('collectionPanel'\) as HTMLDetailsElement\)\.open\) this\.drawCollection\(\);/);
  assert.match(gacha, /const ready = sheetDecoded\(UNITS\[p\.kind\]\.sheet\)\.then\(\(\) => \{/);
  assert.match(gacha, /revealAllTimes\(down\.length\)\.forEach\(/);
  // (a card's flourish takes a kept canvas, waits its turn, and its small glow has no blur of its own)
  const fx = readFileSync('src/summonFx.ts', 'utf8');
  assert.match(fx, /const wait = flourishWait\(ends, now, flourishCap\(!!settings\(\)\.saver\)\);/);
  assert.match(fx, /const pair = spare\.pop\(\) \?\? new Pair\(p\.fw, p\.fh\);/);
  assert.match(fx, /\.sfxCard \.sfxGlow \{ filter: none; \}/);
});
