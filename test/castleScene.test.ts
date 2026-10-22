import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { BUILDING_IDS, maxLevel } from '../src/sim/castle';
import { BLURB, effectText, layoutFor, LIGHTS, LOOKS, lookBox, SPRITE_SIZE, spriteName, stageOf, STAGES, TALL, VENTS, WIDE } from '../src/render/castleSpots';

const LAYOUTS = { tall: TALL, wide: WIDE };
const looksOf = (id: (typeof BUILDING_IDS)[number]) => LOOKS[id];

test('every picture the looks and props name exists, and its size in the table is the file\'s own', () => {
  const dir = 'src/art/castle';
  const files = readdirSync(dir).filter((f) => f.endsWith('.png')).map((f) => f.slice(0, -4));
  assert.deepEqual(Object.keys(SPRITE_SIZE).sort(), files.sort());
  for (const [name, [w, h]] of Object.entries(SPRITE_SIZE)) {
    const png = readFileSync(`${dir}/${name}.png`);
    assert.equal(png.readUInt32BE(16), w, `${name} width`);
    assert.equal(png.readUInt32BE(20), h, `${name} height`);
  }
  for (const id of BUILDING_IDS) for (const look of looksOf(id)) for (const p of look.parts) assert.ok(SPRITE_SIZE[p.sprite], `${id} uses ${p.sprite}`);
  for (const lay of Object.values(LAYOUTS)) for (const p of lay.props) assert.ok(SPRITE_SIZE[p.sprite], p.sprite);
});

test('every upgrade has four looks and a plot inside the yard, in both arrangements', () => {
  for (const [name, lay] of Object.entries(LAYOUTS)) {
    assert.deepEqual(Object.keys(lay.plots).sort(), [...BUILDING_IDS].sort(), name);
    for (const id of BUILDING_IDS) {
      const p = lay.plots[id];
      assert.ok(p.x > 0 && p.x < lay.w, `${name} ${id} across`);
      assert.ok(p.y > lay.wallY + 32 && p.y <= lay.h, `${name} ${id} down`);
      assert.ok(BLURB[id].length > 0, id);
    }
    for (const p of lay.props) assert.ok(p.x > 0 && p.x < lay.w && p.y <= lay.h, `${name} ${p.sprite}`);
    assert.ok(lay.walk.x0 >= 0 && lay.walk.x1 <= lay.w && lay.walk.y1 <= lay.h && lay.walk.y0 > lay.wallY, `${name} walk`);
  }
  for (const id of BUILDING_IDS) assert.equal(looksOf(id).length, STAGES, id);
});

test('a house is never used for two buildings, and every look is bigger than the one before it', () => {
  const HOUSES = ['house1', 'house2', 'house4', 'gb_house', 'gb_shop', 'gb_canopy', 'tt_long', 'tt_gable', 'yurt1', 'yurt2', 'camp3', 'tower1', 'tower2', 'tower3'];
  const owner: Record<string, string> = {};
  for (const id of BUILDING_IDS)
    for (const look of looksOf(id))
      for (const p of look.parts)
        if (HOUSES.includes(p.sprite)) {
          assert.ok(!owner[p.sprite] || owner[p.sprite] === id, `${p.sprite} is in ${owner[p.sprite]} and ${id}`);
          owner[p.sprite] = id;
        }
  for (const id of BUILDING_IDS) {
    const sizes = looksOf(id).map((l) => lookBox(l));
    for (let i = 1; i < sizes.length; i++) assert.ok(sizes[i].w * sizes[i].h > sizes[i - 1].w * sizes[i - 1].h, `${id} look ${i} grows`);
  }
});

test('all four buildings fit inside the yard, and the upright yard is narrow enough for a phone with nothing clipped', () => {
  for (const [name, lay] of Object.entries(LAYOUTS))
    for (const id of BUILDING_IDS) {
      const b = lookBox(looksOf(id)[STAGES - 1]);
      const p = lay.plots[id];
      assert.ok(p.x + b.x0 >= 0 && p.x + b.x1 <= lay.w, `${name} ${id} across`);
      assert.ok(p.y - b.h >= lay.wallY, `${name} ${id} top`);
    }
  assert.ok(TALL.w <= 360 && TALL.h <= 657);
});

test('buildings stand apart: at most a corner overlap, and the road is clear of the plots\' middles', () => {
  for (const [name, lay] of Object.entries(LAYOUTS))
    for (let i = 0; i < BUILDING_IDS.length; i++)
      for (let j = i + 1; j < BUILDING_IDS.length; j++) {
        const a = BUILDING_IDS[i];
        const b = BUILDING_IDS[j];
        const ba = lookBox(looksOf(a)[STAGES - 1]);
        const bb = lookBox(looksOf(b)[STAGES - 1]);
        const ax = lay.plots[a].x + (ba.x0 + ba.x1) / 2;
        const bx = lay.plots[b].x + (bb.x0 + bb.x1) / 2;
        const across = (ba.w + bb.w) / 2 - Math.abs(ax - bx);
        const down = Math.min(ba.h, bb.h) - Math.abs(lay.plots[a].y - lay.plots[b].y);
        assert.ok(across < 24 || down <= 12, `${name} ${a} and ${b} overlap by ${across} across and ${down} down`);
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

test('the upright yard is for portrait screens and the wide one for the rest', () => {
  assert.equal(layoutFor(true), TALL);
  assert.equal(layoutFor(false), WIDE);
});

test('vents and lights sit on the look they belong to', () => {
  for (const id of BUILDING_IDS) {
    assert.equal(VENTS[id].length, STAGES, id);
    assert.equal(LIGHTS[id].length, STAGES, id);
    for (let st = 0; st < STAGES; st++) {
      const b = lookBox(looksOf(id)[st]);
      for (const v of VENTS[id][st]) {
        assert.ok(v.dx >= b.x0 - 2 && v.dx <= b.x1 + 2 && v.dy <= 2 && v.dy >= -b.h - 2, `${id} look ${st} ${v.kind}`);
      }
      for (const l of LIGHTS[id][st]) assert.ok(l.dy <= 0 && l.dy >= -b.h - 4, `${id} light ${st}`);
    }
  }
});

test('the upgrade card words grow with the level', () => {
  assert.equal(effectText('treasury', 3), '+30 starting gold');
  assert.equal(effectText('barracks', 2), '+12% hp for every hero');
  assert.equal(effectText('armoury', 1), '+5% attack for every hero');
  assert.match(effectText('mageTower', 4), /48% faster, \+2 spell power/);
  assert.match(effectText('mageTower', 0), /0% faster, \+0 spell power/);
});
