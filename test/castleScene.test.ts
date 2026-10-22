import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BUILDING_IDS, maxLevel } from '../src/sim/castle';
import { BLURB, effectText, layoutFor, spriteName, stageOf, STAGES, TALL, VENTS, WIDE } from '../src/render/castleSpots';

// the trimmed pictures' largest sizes at the grand look (px), as the art pack has them
const GRAND: Record<string, [number, number]> = { treasury: [108, 116], barracks: [112, 128], armoury: [106, 111], mageTower: [72, 151] };
const LAYOUTS = { wide: WIDE, tall: TALL };

test('every upgrade has a plot inside the courtyard, in both arrangements', () => {
  for (const [name, lay] of Object.entries(LAYOUTS)) {
    assert.deepEqual(Object.keys(lay.plots).sort(), [...BUILDING_IDS].sort(), name);
    for (const id of BUILDING_IDS) {
      const p = lay.plots[id];
      assert.ok(p.x > 0 && p.x < lay.w, `${name} ${id} across`);
      assert.ok(p.y > lay.groundY && p.y <= lay.h, `${name} ${id} down`);
      assert.ok(BLURB[id].length > 0, id);
    }
    for (const p of lay.props) assert.ok(p.x > 0 && p.x < lay.w && p.y <= lay.h, `${name} ${p.sprite}`);
    assert.ok(lay.walk.x0 >= 0 && lay.walk.x1 <= lay.w && lay.walk.y1 <= lay.h && lay.walk.y0 > lay.groundY, `${name} walk`);
  }
});

test('the grand buildings fit inside the yard, so nothing is clipped without panning', () => {
  for (const [name, lay] of Object.entries(LAYOUTS))
    for (const id of BUILDING_IDS) {
      const [w, h] = GRAND[id];
      const p = lay.plots[id];
      assert.ok(p.x - w / 2 >= 0 && p.x + w / 2 <= lay.w, `${name} ${id} across`);
      assert.ok(p.y - h >= 0, `${name} ${id} top`);
    }
});

test('upright, the yard is narrow enough for a phone at scale 2 and every building shows in one phone screen', () => {
  assert.ok(TALL.w * 2 <= 393);
  const top = Math.min(...BUILDING_IDS.map((id) => TALL.plots[id].y - GRAND[id][1]));
  const bottom = Math.max(...BUILDING_IDS.map((id) => TALL.plots[id].y));
  // (a phone's page is about 690 px tall: 345 scene pixels, with room for a name tag above the top building)
  assert.ok(bottom - (top - 24) <= 345, `${bottom - top} rows`);
  assert.ok(TALL.openTop <= top - 8);
});

test('buildings stand apart: at most a corner overlap (the scene sorts by foot line, so the nearer is in front)', () => {
  for (const [name, lay] of Object.entries(LAYOUTS))
    for (let i = 0; i < BUILDING_IDS.length; i++)
      for (let j = i + 1; j < BUILDING_IDS.length; j++) {
        const a = BUILDING_IDS[i];
        const b = BUILDING_IDS[j];
        const [pa, pb] = [lay.plots[a], lay.plots[b]];
        const across = (GRAND[a][0] + GRAND[b][0]) / 2 - Math.abs(pa.x - pb.x);
        const down = Math.min(GRAND[a][1], GRAND[b][1]) - Math.abs(pa.y - pb.y);
        assert.ok(across < 30 || down <= 12, `${name} ${a} and ${b} overlap by ${across} across and ${down} down`);
      }
});

test('a building has a plot at level 0, the grand look at its top level, and every look in between is reached in order', () => {
  assert.equal(STAGES, 4);
  for (const id of BUILDING_IDS) {
    const seen: number[] = [];
    for (let l = 0; l <= maxLevel(id); l++) seen.push(stageOf(id, l));
    assert.equal(seen[0], 0, id);
    assert.equal(seen[seen.length - 1], STAGES - 1, id);
    assert.deepEqual([...seen].sort((a, b) => a - b), seen, `${id} never shrinks`);
    assert.deepEqual([...new Set(seen)], [0, 1, 2, 3], `${id} shows all four looks`);
  }
  assert.equal(stageOf('treasury', -3), 0);
  assert.equal(stageOf('treasury', 99), STAGES - 1);
  assert.equal(spriteName('mageTower', 2), 'mageTower2');
});

test('the tall yard is for portrait screens and the wide one for the rest', () => {
  assert.equal(layoutFor(true), TALL);
  assert.equal(layoutFor(false), WIDE);
});

test('vents sit inside the picture, at looks that exist', () => {
  for (const id of BUILDING_IDS)
    for (const v of VENTS[id]) {
      assert.ok(v.fx >= 0 && v.fx <= 1 && v.fy >= 0 && v.fy <= 1, id);
      for (const s of v.stages) assert.ok(s >= 1 && s < STAGES, `${id} stage ${s}`);
    }
});

test('the upgrade card words grow with the level', () => {
  assert.equal(effectText('treasury', 3), '+30 starting gold');
  assert.equal(effectText('barracks', 2), '+12% hp for every hero');
  assert.equal(effectText('armoury', 1), '+5% attack for every hero');
  assert.match(effectText('mageTower', 4), /48% faster, \+2 spell power/);
  assert.match(effectText('mageTower', 0), /0% faster, \+0 spell power/);
});
