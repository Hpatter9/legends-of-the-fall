import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ALL_HEROES } from '../src/sim/units';
import { DOORWAYS, ROOM_W, SPOTS } from '../src/render/tavernSpots';
import { ACTIVITIES, beatOf, DARTBOARD, HEARTHS, LIFE, lifeSeed, partnersOf, puffs, STAGE } from '../src/render/tavernLife';

test('every hero has one activity of their own, with a reason, and nobody else is in the list', () => {
  assert.deepEqual(Object.keys(LIFE).sort(), [...ALL_HEROES].sort());
  for (const [k, l] of Object.entries(LIFE)) {
    assert.ok(ACTIVITIES[l.act], `${k}: ${l.act} is an activity`);
    assert.ok(l.why.length > 20, `${k} says why`);
  }
  // (a full tavern shows plenty of different things going on)
  assert.ok(new Set(Object.values(LIFE).map((l) => l.act)).size >= 18);
});

test('the activity fits the furniture: sitters have a seat, standers have none', () => {
  for (const [k, l] of Object.entries(LIFE)) {
    const posture = ACTIVITIES[l.act].posture;
    if (posture === 'sit') assert.notEqual(SPOTS[k].seat, 'none', `${k} sits to ${l.act}`);
    if (posture === 'stand') assert.equal(SPOTS[k].seat, 'none', `${k} stands to ${l.act}`);
  }
});

test('the activity fits the place: darts at the board, the bard on the stage, hands to a hearth, cards at a card table', () => {
  const room = (x: number) => Math.floor(x / ROOM_W);
  for (const [k, l] of Object.entries(LIFE)) {
    const s = SPOTS[k];
    if (l.act === 'darts') {
      assert.equal(room(s.x), room(DARTBOARD.x), `${k} in the games room`);
      assert.ok(s.x > DARTBOARD.x + 20 && s.x < DARTBOARD.x + 100, `${k} at the line, not under the board`);
      assert.equal(s.facing, -1, `${k} faces the board`);
    }
    if (l.act === 'sing') assert.ok(s.x > STAGE.x0 && s.x < STAGE.x1 && s.y < 200, `${k} on the stage`);
    if (l.act === 'hearth') {
      const h = HEARTHS.reduce((a, b) => (Math.abs(b - s.x) < Math.abs(a - s.x) ? b : a));
      assert.ok(Math.abs(h - s.x) < 60, `${k} by a hearth`);
      assert.equal(s.facing, h > s.x ? 1 : -1, `${k} faces the fire`);
    }
    if (l.act === 'cards') assert.equal(room(s.x), 2, `${k} at a card table in the games room`);
    if (l.act === 'dance' || l.act === 'cheer') assert.ok(Math.abs(s.x - (STAGE.x0 + STAGE.x1) / 2) < 120, `${k} near the stage`);
    for (const d of DOORWAYS) assert.ok(Math.abs(s.x - d) > 30, `${k} clear of a doorway`);
  }
});

test('pairs and groups belong together: an arm-wrestle is two rivals face to face, a listener faces the teller', () => {
  for (const [k, l] of Object.entries(LIFE)) {
    if (l.act === 'armwrestle') {
      const r = l.with!;
      assert.equal(LIFE[r].act, 'armwrestle', `${k}'s rival wrestles too`);
      assert.equal(LIFE[r].with, k, `${k} and ${r} wrestle each other`);
      assert.equal(SPOTS[k].y, SPOTS[r].y, 'side by side');
      assert.ok(Math.abs(SPOTS[k].x - SPOTS[r].x) < 70, 'close enough to lock hands');
      assert.equal(SPOTS[k].facing, SPOTS[r].x > SPOTS[k].x ? 1 : -1, `${k} faces ${r}`);
    }
    if (l.act === 'listen') {
      const t = l.with!;
      assert.equal(LIFE[t].act, 'story', `${k} listens to a teller`);
      assert.ok(Math.abs(SPOTS[t].x - SPOTS[k].x) < 80 && Math.floor(SPOTS[t].x / ROOM_W) === Math.floor(SPOTS[k].x / ROOM_W), `${k} at ${t}'s table`);
      assert.equal(SPOTS[k].facing, SPOTS[t].x > SPOTS[k].x ? 1 : -1, `${k} faces ${t}`);
    }
  }
  // (every teller has an audience)
  for (const [k, l] of Object.entries(LIFE)) if (l.act === 'story') assert.ok(partnersOf(k).length >= 1, k);
});

test('the same hero does the same thing the same way every time: rhythms come from the name, never chance', () => {
  for (const k of ALL_HEROES) {
    assert.equal(lifeSeed(k), lifeSeed(k));
    assert.ok(lifeSeed(k) >= 0 && lifeSeed(k) < 1);
    for (const t of [0, 1234, 98765]) assert.equal(beatOf(k, t), beatOf(k, t));
  }
  // (the rhythms differ from hero to hero, so a room does not move in lockstep)
  assert.ok(new Set(ALL_HEROES.map(lifeSeed)).size > 40);
  // (the two darts players take turns: never both throwing at once)
  const darts = Object.keys(LIFE).filter((k) => LIFE[k].act === 'darts');
  assert.equal(darts.length, 2);
  for (let t = 0; t < 20000; t += 50) assert.ok(beatOf(darts[0], t) < 0 || beatOf(darts[1], t) < 0, `both throw at ${t}`);
  // (the two arm-wrestlers strain as one)
  const [a, b] = Object.keys(LIFE).filter((k) => LIFE[k].act === 'armwrestle');
  for (let t = 0; t < 20000; t += 100) assert.equal(beatOf(a, t), beatOf(b, t));
});

test('a beat comes round as often as the activity says, and lasts as long', () => {
  for (const k of ALL_HEROES) {
    const info = ACTIVITIES[LIFE[k].act];
    let on = 0;
    const span = info.every * 4;
    for (let t = 0; t < span; t += 10) if (beatOf(k, t) >= 0) on++;
    assert.ok(Math.abs(on * 10 - info.lasts * 4) <= 40, `${k}: ${on * 10} ms of beat in four rounds`);
  }
});

test('the little things given off (notes, z\'s, steam) are counted out from the clock: one each period, alive for their life', () => {
  assert.deepEqual(puffs(0, 1000, 2500), [{ age: 0, n: 0 }]);
  const now = puffs(5200, 1000, 2500);
  assert.deepEqual(now.map((p) => p.n), [5, 4, 3]);
  for (const p of now) assert.ok(p.age >= 0 && p.age < 1);
  assert.deepEqual(puffs(5200, 1000, 2500), now);
});
