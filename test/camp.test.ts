import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BUTTON_ZONE, campLayout, groundCells, PLACE, SIZES, starsFor, TABLE } from '../src/render/campSpots';

// the war camp's scene on the three phones (css pixels; a scene pixel is about one): the Battle page's area less the bottom bar (100px)
const PHONES: [number, number][] = [[393, 588], [360, 516], [412, 651]];

test('every camp picture is the size the plan says', () => {
  for (const [name, [w, h]] of Object.entries(SIZES)) {
    const dir = ['wall', 'campfire', 'rack', 'barrels', 'crates', 'cart', 'woodpile', 'hay', 'pine', 'bush', 'rocks', 'grass_tile', 'banner', 'chests'].includes(name) ? 'castle' : 'camp';
    const png = readFileSync(`src/art/${dir}/${name}.png`);
    assert.equal(png.readUInt32BE(16), w, `${name} width`);
    assert.equal(png.readUInt32BE(20), h, `${name} height`);
  }
});

test('the five heroes stand apart, round the fire, clear of the Battle! button, on all three phones', () => {
  for (const [w, h] of PHONES) {
    const c = campLayout(w, h);
    assert.equal(c.heroes.length, 5);
    for (const s of c.heroes) {
      assert.ok(s.x > 30 && s.x < w - 30, `hero inside at ${w}`);
      assert.ok(s.y < c.buttonTop - 20, `hero above the button at ${w}x${h}`);
    }
    for (const [i, a] of c.heroes.entries())
      for (const b of c.heroes.slice(i + 1)) assert.ok(Math.hypot(a.x - b.x, (a.y - b.y) * 2) > 40, 'no two heroes on one spot');
    // (the strongest stands in front, in the middle)
    assert.ok(c.heroes[0].y === Math.max(...c.heroes.map((s) => s.y)) && c.heroes[0].x === c.fire.x);
  }
});

test('the fire, the table, the cart and the notice boards are on screen and clear of the button', () => {
  for (const [w, h] of PHONES) {
    const c = campLayout(w, h);
    assert.ok(c.fire.x === c.cx && c.fire.y < c.buttonTop - 80);
    assert.equal(c.buttonTop, h - BUTTON_ZONE);
    assert.ok(c.table.x - TABLE.w / 2 > 0 && c.table.x + TABLE.w / 2 < w && c.table.y < c.buttonTop);
    assert.ok(c.cart.y < c.buttonTop && c.cart.x < c.cx, 'the cart is on the left');
    // (the stash's mount sits over the cart, inside the frame)
    const s = c.stash;
    assert.ok(s.x >= 0 && s.x + s.w < c.cx && s.y > 0 && s.y + s.h <= c.cart.y);
    for (const p of [c.places.tower, c.places.daily, c.places.calamity]) {
      const b = p.plate;
      assert.ok(b.x >= 0 && b.x + b.w <= w && b.w === PLACE.plate.w && b.y > 0, 'a plate is on the screen');
      assert.ok(p.box.x >= 0 && p.box.x + p.box.w <= w && p.box.y >= 0, 'the tap box is on the screen');
      assert.ok(p.box.w >= 96 && p.box.h >= 96, 'a generous tap box');
      assert.ok(b.y + b.h < c.fire.y - 40, 'places stand above the fire');
    }
    const { tower, daily, calamity } = c.places;
    assert.ok(tower.plate.x + tower.plate.w + 8 <= calamity.plate.x && calamity.plate.x + calamity.plate.w + 8 <= daily.plate.x, 'the three plates stand at least 8px apart');
  }
});

test('the wall runs off both edges and the ground covers the scene', () => {
  for (const [w, h] of PHONES) {
    const c = campLayout(w, h);
    const left = c.wall.filter((p) => p.x < c.cx);
    const right = c.wall.filter((p) => p.x > c.cx);
    assert.equal(left.length, right.length);
    assert.ok(Math.min(...left.map((p) => p.x)) - SIZES.wall[0] / 2 < 0, 'the left run leaves the screen');
    assert.ok(Math.max(...right.map((p) => p.x)) + SIZES.wall[0] / 2 > w, 'the right run leaves the screen');
    const cells = groundCells(c);
    // (a diamond's centre is under the fire, and every point below the gate is within a tile of some centre)
    assert.ok(cells.some((p) => p.x === c.fire.x && p.y === c.fire.y - 16));
    for (const [x, y] of [[5, h - 5], [w - 5, h - 5], [w / 2, c.gateY + 80], [3, c.gateY + 40]]) assert.ok(cells.some((p) => Math.abs(p.x - x) / 45 + Math.abs(p.y - y) / 26 <= 1.001), `ground at ${x},${y}`);
  }
});

test('the stars are fixed by the layout and stay in the sky above the wall', () => {
  const c = campLayout(393, 688);
  const a = starsFor(c);
  assert.deepEqual(a, starsFor(c));
  assert.ok(a.length > 20);
  for (const s of a) assert.ok(s.x >= 0 && s.x < c.w && s.y >= 4 && s.y < c.gateY - 30 && s.at >= 0 && s.at < 1);
});
