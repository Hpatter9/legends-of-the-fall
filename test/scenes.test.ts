import { test } from 'node:test';
import assert from 'node:assert/strict';
import { beamKind, fanSpots, hallLayout, MIN_H, pullTimeline, ROOM_W, WALL_H } from '../src/render/hallSpots';
import { CANDLES, LECTERN, LIB_H, LIB_W } from '../src/render/libraryLayout';

test('the hall keeps its circle on the floor, clear of the wall, for any page height', () => {
  for (const h of [200, 280, 310, 360, 420]) {
    const l = hallLayout(h);
    assert.ok(l.h >= MIN_H);
    assert.ok(l.circle.y > WALL_H + 20 && l.circle.y < l.h - 90, `circle at ${h}`);
    assert.equal(l.circle.x, ROOM_W / 2);
    for (const b of [...l.pillars, ...l.braziers, l.summoner]) assert.ok(b.x > 0 && b.x < ROOM_W && b.y < l.h, 'inside the room');
  }
});

test('a pull fans out over the circle: up to five in a row, then two rows, nobody off the room', () => {
  const l = hallLayout(300);
  for (const n of [1, 5, 10]) {
    const spots = fanSpots(n, l.circle.x, l.circle.y);
    assert.equal(spots.length, n);
    for (const s of spots) assert.ok(s.x >= 16 && s.x <= ROOM_W - 16);
    assert.equal(new Set(spots.map((s) => `${s.x},${s.y}`)).size, n, 'no two on one spot');
  }
  assert.equal(new Set(fanSpots(5, 96, 100).map((s) => s.y)).size, 1);
  assert.equal(new Set(fanSpots(10, 96, 100).map((s) => s.y)).size, 2);
});

test('the beam is gold for a pull with a new hero in it and blue for a pull of repeats', () => {
  assert.equal(beamKind(true), 'light');
  assert.equal(beamKind(false), 'star');
});

test('a pull plays charge, flare, beam, then the heroes one after another, then hands over', () => {
  const t = pullTimeline(10);
  assert.ok(t.charge < t.flare && t.flare < t.beam);
  assert.equal(t.heroAt.length, 10);
  for (let i = 1; i < 10; i++) assert.ok(t.heroAt[i] > t.heroAt[i - 1]);
  assert.ok(t.heroAt[0] > t.flare);
  assert.ok(t.done > t.heroAt[9] + t.rise);
  assert.ok(t.done < 6000, 'a ten pull does not make the player wait');
  assert.ok(pullTimeline(1).done < t.done);
});

test('reduced motion is a short flash with every hero there at once', () => {
  const t = pullTimeline(10, true);
  assert.ok(t.done <= 1000);
  assert.ok(t.heroAt.every((a) => a === t.heroAt[0]));
});

test('the library puts its candles and its lectern inside the room', () => {
  for (const c of CANDLES) assert.ok(c.x > 0 && c.x < LIB_W && c.y > 0 && c.y < LIB_H);
  assert.ok(LECTERN.x === LIB_W / 2 && LECTERN.y <= LIB_H);
});
