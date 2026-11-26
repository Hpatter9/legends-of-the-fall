// EIDOLON-SMOOTH (docs/notes/eidolon-smooth.md): an Eidolon's call kept from costing a slow phone its frames: the ground's pictures cut
// to the tiles as shapes (no mask a row), every picture of the chosen Eidolon named to be made ready ahead, and the page's rules that had
// each piece of a call restyle the whole page.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { cutToBox, rowShapes } from '../src/render/groundCutRules';
import { fxUrl, groundSheets, pageSheets, warmDue } from '../src/eidolonWarmRules';
import { EIDOLONS } from '../src/sim/eidolons';
import { fighterSheets, regroup } from '../src/render/texReadyRules';
import { STAGED } from '../src/eidolonStage';
import { RING, STRIKE_FX } from '../src/eidolonFx';

const area = (p: number[]) => { let a = 0; for (let i = 0; i < p.length; i += 2) { const j = (i + 2) % p.length; a += p[i] * p[j + 1] - p[j] * p[i + 1]; } return Math.abs(a) / 2; };
const diamond = (x: number, y: number, hw: number, hh: number) => [x, y - hh, x + hw, y, x, y + hh, x - hw, y];

test('a shape cut to a rectangle: whole inside, nothing outside, the part across an edge', () => {
  const box = { left: 0, top: 0, w: 100, h: 60 };
  assert.deepEqual(cutToBox(diamond(50, 30, 20, 10), box), diamond(50, 30, 20, 10), 'wholly inside: as it was');
  assert.deepEqual(cutToBox(diamond(200, 30, 20, 10), box), [], 'wholly outside: nothing');
  assert.deepEqual(cutToBox(diamond(50, -40, 20, 10), box), []);
  // (half over the left edge: half its area is left, and no corner lies outside)
  const half = cutToBox(diamond(0, 30, 20, 10), box);
  assert.ok(Math.abs(area(half) - area(diamond(0, 30, 20, 10)) / 2) < 1e-6);
  for (let i = 0; i < half.length; i += 2) assert.ok(half[i] >= 0 && half[i] <= 100 && half[i + 1] >= 0 && half[i + 1] <= 60);
  // (over a corner: a quarter)
  assert.ok(Math.abs(area(cutToBox(diamond(0, 0, 20, 10), box)) - area(diamond(0, 0, 20, 10)) / 4) < 1e-6);
});

test("a row's tile tops under a picture: each tile's own part of the picture, a pixel over at each side, and none for a tile out of reach", () => {
  const box = { left: 100, top: 50, w: 200, h: 100 };
  const TW = 64, TH = 32;
  const one = rowShapes([{ x: 200, y: 100 }], TW, TH, box);
  assert.equal(one.positions.length, 8, 'four corners');
  assert.deepEqual(one.indices, [0, 1, 2, 0, 2, 3], 'two triangles');
  // (the corners are the old mask's: the top a pixel over on every side)
  assert.deepEqual(one.positions, [200, 100 - 17, 200 + 33, 100, 200, 100 + 17, 200 - 33, 100]);
  // (each corner carries the place of the picture that lies there: the middle of the picture at its middle)
  assert.deepEqual(one.uvs.slice(0, 2), [0.5, (83 - 50) / 100]);
  for (const v of one.uvs) assert.ok(v >= 0 && v <= 1, 'never a part of the sheet beside the frame');
  // (a tile the picture never reaches gives nothing; one across its edge is cut there)
  assert.deepEqual(rowShapes([{ x: 600, y: 100 }], TW, TH, box), { positions: [], uvs: [], indices: [] });
  const two = rowShapes([{ x: 200, y: 100 }, { x: 600, y: 100 }, { x: 100, y: 100 }], TW, TH, box);
  assert.ok(two.positions.length > 8 && two.positions.length <= 8 + 16);
  for (let i = 0; i < two.positions.length; i += 2) assert.ok(two.positions[i] >= 100 && two.positions[i] <= 300);
  for (const v of two.uvs) assert.ok(v >= 0 && v <= 1);
  for (const i of two.indices) assert.ok(i < two.positions.length / 2);
  // (a whole row of a board stays small enough to be drawn with its neighbours in one go)
  const row = rowShapes(Array.from({ length: 9 }, (_, i) => ({ x: 100 + i * 64, y: 100 })), TW, TH, { left: 0, top: 0, w: 1000, h: 200 });
  assert.ok(row.positions.length / 2 <= 100);
});

test('every Eidolon names the pictures of its call, each a file the game has, so all are made ready before the horn is blown', () => {
  for (const e of EIDOLONS) {
    const urls = pageSheets(e.id);
    assert.ok(urls.length >= 5, `${e.id} names its sheets`);
    assert.equal(new Set(urls).size, urls.length, 'each once');
    for (const u of urls) assert.ok(existsSync(`src/art/${u}`), `${u} is in the game`);
    const look = STRIKE_FX[e.id];
    for (const s of [look.pillar, look.burst, look.extra, look.after]) assert.ok(urls.includes(fxUrl(s.sheet)));
    assert.ok(urls.includes(fxUrl(RING.sheet)));
    const st = STAGED[e.id];
    assert.ok(st, `${e.id} is staged`);
    for (const sh of [st.pillar, st.explosion, st.fire, st.smoke, st.embers]) assert.ok(urls.includes(`eidolons/fx/${sh.sheet}.webp`));
    assert.deepEqual(groundSheets(e.id), [st.sigil, st.scorch, st.cracks]);
  }
  assert.deepEqual(pageSheets('nobody'), []);
  assert.deepEqual(groundSheets('nobody'), []);
});

test('the warming is done once for the chosen Eidolon, whether or not the horn is full, and again only for another', () => {
  assert.equal(warmDue('askel', null), true);
  assert.equal(warmDue('askel', 'askel'), false);
  assert.equal(warmDue('nivra', 'askel'), true);
  assert.equal(warmDue(null, null), false);
  assert.equal(warmDue(undefined, 'askel'), false);
  const call = readFileSync('src/eidolonCall.ts', 'utf8');
  // (asked for when a new board is seen, its heroes still being placed, and again as the fight is armed; never only with a full horn)
  assert.match(call, /this\.warm\(chosenOf\(this\.opts\.meta\(\)\)\)/);
  assert.match(call, /this\.warm\(id\);/);
  // (EIDOLON-SMOOTH 2: held where the call's canvases draw from)
  assert.match(call, /urls\.map\(holdImage\)/);
  assert.match(readFileSync('src/callCanvas.ts', 'utf8'), /i\.decode\(\)/, 'decoded ahead, not on the frame it first shows');
});

test('the ground sheets draw with no mask, and they and the aura atlas are handed to the graphics card ahead of the fight', () => {
  const ground = readFileSync('src/render/groundSheet.ts', 'utf8');
  assert.doesNotMatch(ground, /\.mask\s*=/, 'no mask a row: a stencil pass each, every frame');
  assert.match(ground, /rowShapes\(/);
  assert.match(ground, /keepReady\(`eidolon-ground-/);
  assert.match(readFileSync('src/render/awakenAura.ts', 'utf8'), /keepReady\('aura-atlas'/);
});

test('no rule of the page asks `:has()` of every descendant of the page or of the fight panel: each piece of a call restyled them whole', () => {
  const css = ['src/index.html', 'src/warRoom.css', 'src/paintedDeployment.css', 'src/pixel.css', 'src/eidolons.css'].map((f) => readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')).join('\n');
  // (`body:has(> x)` looks only at the page's own children; `body:has(x)` and `#panel:has(x)` at everything inside)
  assert.doesNotMatch(css, /body(\[[^\]]*\])?:has\(\s*[^>\s]/, 'body:has() only of its own children');
  assert.doesNotMatch(css, /#panel:has\(/);
  assert.match(css, /#panel\.canMerge #traitHint/);
  assert.match(readFileSync('src/main.ts', 'utf8'), /classList\.toggle\('canMerge', pairs > 0\)/);
});

test("a fight's fighters' sheets are kept ready, their views from behind too, and only for that fight", () => {
  const rear = (s: string) => (s === 'knight' ? 'knight_back' : s === 'orc' ? 'orc_back' : s);
  const has = (s: string) => s !== 'orc_back';
  // (each once; a view the game has no sheet for is left out; a fighter with no view from behind gives its own sheet once)
  assert.deepEqual(fighterSheets(['knight', 'orc', 'knight', 'wisp'], rear, has), ['knight', 'knight_back', 'orc', 'wisp']);
  assert.deepEqual(fighterSheets([], rear, has), []);
  // (named afresh for the next fight: the last fight's are let go, every other kept sheet stays)
  const next = regroup(['spell-sheet-a', 'fighter:knight', 'fighter:orc', 'aura-atlas'], 'fighter', ['knight', 'wolf']);
  assert.deepEqual(next.drop, ['fighter:orc']);
  assert.deepEqual(next.keep.sort(), ['aura-atlas', 'fighter:knight', 'fighter:wolf', 'spell-sheet-a']);
  assert.match(readFileSync('src/main.ts', 'utf8'), /keepGroup\('fighter', /);
});
