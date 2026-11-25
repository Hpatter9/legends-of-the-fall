// PIXELLAB-ART (docs/notes/pixellab-art.md): the pieces made with PixelLab from the game's own art. A reskinned sheet is its kin's sheet
// redrawn frame by frame, so it keeps the kin's grid and the rules read the kin's look; every army's bosses have a trophy on the wall.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { KIN_SHEET, kinSheet } from '../src/sim/foes';
import { UNITS } from '../src/sim/units';
import { ARMIES, bossesOf } from '../src/sim/armies';
import { foeFamilyOf } from '../src/sim/stats';

const sheets = JSON.parse(readFileSync('src/art/units/sheets.json', 'utf8'));
const pieces = JSON.parse(readFileSync('tools/pixellab/pieces.json', 'utf8')) as Record<string, { source: string; out: string }>;
const sheetsTs = readFileSync('src/render/sheets.ts', 'utf8');

test('every reskinned sheet that is in the game is on its kin\'s grid, registered, and read as its kin by the rules', () => {
  const used = new Set(Object.values(UNITS).map((u) => u.sheet));
  let n = 0;
  for (const p of Object.values(pieces)) {
    if (!used.has(p.out)) continue;
    n++;
    assert.ok(existsSync(`src/art/units/${p.out}.png`), p.out);
    assert.equal(KIN_SHEET[p.out], p.source, `${p.out}'s kin`);
    for (const k of ['w', 'h', 'perRow', 'rows', 'counts', 'facesRight']) assert.deepEqual(sheets[p.out][k], sheets[p.source][k], `${p.out}.${k}`);
    assert.match(sheetsTs, new RegExp(`\\n  ${p.out}: \\w+,`), `${p.out} has a URL`);
  }
  assert.ok(n >= 5, 'the mid-bosses and the grave skeletons at least');
  // (the two mid-bosses and the three risen wear their own, and the rules see the soldier's)
  assert.equal(UNITS.alphaWolf.sheet, 'alpha_werewolf');
  assert.equal(UNITS.nineTails.sheet, 'nine_tails');
  for (const k of ['graveWarrior', 'graveSpear', 'graveArcher']) assert.match(UNITS[k].sheet, /^summon_grave_/, k);
  assert.equal(kinSheet('alpha_werewolf'), 'werewolf_black');
  assert.equal(foeFamilyOf(UNITS.alphaWolf), foeFamilyOf({ ...UNITS.alphaWolf, sheet: 'werewolf_black' }));
});

test('every army\'s bosses, mid and final, have a painted trophy and a place on the wall', () => {
  const art = readFileSync('src/trophyArt.ts', 'utf8');
  const wall = readFileSync('src/trophyWall.ts', 'utf8');
  for (const a of ARMIES) {
    for (const { id } of bossesOf(a)) {
      if (!UNITS[id] || /^eidolon|^cal/.test(id)) continue;
      assert.match(art, new RegExp(`import ${id} from '\\./art/trophies/${id}\\.webp'`), `${id}'s trophy (${a.id})`);
      assert.ok(existsSync(`src/art/trophies/${id}.webp`), id);
      assert.match(wall, new RegExp(`id: '${id}',`), `${id} on the wall`);
    }
  }
});
