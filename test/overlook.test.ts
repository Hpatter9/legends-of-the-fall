import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ARMIES, bossesOf } from '../src/sim/armies';
import { overlookCrew, overlookLayout, overlookRanks, SCOUT_CAMPS, scoutCamp } from '../src/render/overlookLayout';

test('the overlook shows each army’s field troops, leaving its bosses for the leader', () => {
  for (const army of ARMIES) {
    const crew = overlookCrew(army);
    assert.ok(crew.length > 0, army.id);
    assert.equal(crew.length, new Set(crew).size);
    const bosses = new Set(bossesOf(army).map((b) => b.id));
    assert.ok(crew.every((k) => !bosses.has(k)), army.id);
    for (const wave of army.waves) {
      for (const foe of wave.foes) if (!bosses.has(foe)) assert.ok(crew.includes(foe));
    }
  }
});

test('portrait layouts keep mode controls, chests and party on separate ground', () => {
  for (const [w, h] of [[360, 535], [393, 607], [412, 670]]) {
    const c = overlookLayout(w, h);
    const { daily, tower, calamity } = c.places;
    assert.ok(daily.box.x + daily.box.w < tower.box.x);
    for (const p of [daily, tower, calamity]) {
      assert.ok(p.box.x >= 0 && p.box.x + p.box.w <= w);
      assert.ok(p.box.y >= 0 && p.box.y + p.box.h <= h);
      assert.ok(p.box.w >= 44 && p.box.h >= 44);
    }
    assert.ok(calamity.box.y + calamity.box.h < h * 0.3);
    assert.ok(c.heroes.every((p) => p.y > h * 0.7 && p.y < daily.box.y - 30));
    assert.ok(c.stash.x + c.stash.w < w / 2 - 109, 'chests clear of army plaque');
    assert.ok(c.stash.y + c.stash.h <= daily.box.y);
    const ranks = overlookRanks(w, h);
    assert.ok(ranks.length > 0 && ranks.length < 30);
    assert.deepEqual(ranks, overlookRanks(w, h));
    assert.ok(ranks.every((p) => p.x > w * 0.2 && p.x < w * 0.95 && p.y > h * 0.38 && p.y < h * 0.63));
  }
});


test('every army has its own camp painting and a different arrangement of occupants', () => {
  const paintings = new Set<string>();
  const patrols = new Set<string>();
  for (const army of ARMIES) {
    assert.ok(Object.hasOwn(SCOUT_CAMPS, army.id), army.id);
    const camp = scoutCamp(army.id);
    paintings.add(`${camp.atlas}:${camp.row}`);
    const ranks = overlookRanks(393, 607, army.id);
    patrols.add(JSON.stringify(ranks));
    assert.ok(ranks.length >= 8 && ranks.length < 30, 'small groups around the camp');
    assert.ok(ranks.every((p) => p.x > 0 && p.x < 393 && p.y > 607 * 0.32 && p.y < 607 * 0.64));
    assert.ok(camp.boss.every((v) => v > 0 && v < 1));
  }
  assert.equal(paintings.size, ARMIES.length);
  assert.equal(patrols.size, ARMIES.length);
  assert.equal(scoutCamp('unknown'), SCOUT_CAMPS.orcs);
});
