import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ENEMY_MOTION_SHEETS, idleFrame } from '../src/render/enemyMotion';

test('expanded enemy idle timing is slow, staggered and holds a pose with reduced motion', () => {
  for (const sheet of ENEMY_MOTION_SHEETS) {
    assert.equal(idleFrame(sheet, 299, 0, false), 0);
    assert.equal(idleFrame(sheet, 300, 0, false), 1);
    assert.equal(idleFrame(sheet, 1199, 0, false), 3);
    assert.equal(idleFrame(sheet, 1200, 0, false), 0);
    assert.ok(new Set(Array.from({ length: 9 }, (_, id) => idleFrame(sheet, 400, id, false))).size > 1);
    for (const time of [0, 300, 900, 123456]) assert.equal(idleFrame(sheet, time, 5, true), 0);
  }
  for (const time of [0, 109, 110, 1210]) {
    assert.equal(idleFrame('knight_1', time, 5, false), Math.floor(time / 110));
    assert.equal(idleFrame('knight_1', time, 5, true), Math.floor(time / 110));
  }
});

test('expanded enemy sheets contain every idle and hurt frame the renderer can request', () => {
  const layouts = JSON.parse(readFileSync('src/art/units/sheets.json', 'utf8'));
  for (const sheet of ENEMY_MOTION_SHEETS) {
    const entry = layouts[sheet];
    assert.ok(entry.rows.includes('idle') && entry.rows.includes('hurt'), sheet);
    assert.equal(entry.counts.idle, 4, sheet);
    assert.equal(entry.counts.hurt, 3, sheet);
    const png = readFileSync(`src/art/units/${sheet}.png`);
    assert.equal(png.readUInt32BE(16), entry.w * entry.perRow, `${sheet} width`);
    assert.equal(png.readUInt32BE(20), entry.h * entry.rows.length, `${sheet} height`);
  }
});
