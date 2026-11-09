import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { newMeta, stonesOf } from '../src/sim/meta';
import { devGrant } from '../src/sim/devGrant';
import { ALL_HEROES } from '../src/sim/units';
import { isContent } from '../src/sim/unlockRules';

// The developer grant in Settings (the owner's testing tool): crowns, shards of every hero or summoning stones, a hundred or a thousand a tap.
test('the developer grant adds crowns', () => {
  const m = newMeta(1);
  devGrant(m, 'crowns', 1000);
  assert.equal(m.crowns, 1000);
});

test('the developer grant gives every hero shards: owned heroes rank up, the rest join', () => {
  const m = newMeta(1);
  m.unlocked.push('knight');
  const said = devGrant(m, 'shards', 100);
  assert.ok((m.shards.knight ?? 0) > 0);
  for (const kind of ALL_HEROES) if (!isContent(kind)) assert.ok(m.unlocked.includes(kind), `${kind} joined`);
  assert.match(said, /shards to every hero/);
});

test('the developer grant adds summoning stones, a hundred or a thousand a tap', () => {
  const m = newMeta(1);
  const before = stonesOf(m);
  assert.match(devGrant(m, 'stones', 100), /\+100 summoning stones/);
  assert.equal(stonesOf(m), before + 100);
  devGrant(m, 'stones', 1000);
  assert.equal(stonesOf(m), before + 1100);
  assert.equal(m.crowns, 0, 'stones give no crowns');
  // (an old save with no stones field at all)
  delete m.stones;
  devGrant(m, 'stones', 100);
  assert.equal(m.stones, 100);
});

test('Build Town (in Settings › Developer since 0.437.0) raises every castle upgrade a level, wraps the top back to 1, builds the Chapel and sees to 5000 crowns', async () => {
  const { BUILDING_IDS, maxLevel } = await import('../src/sim/castle');
  const m = newMeta(1);
  m.crowns = 200;
  m.castle.treasury = maxLevel('treasury');
  m.castle.barracks = 2;
  const said = devGrant(m, 'town', 0);
  assert.match(said, /Built the town/);
  assert.equal(m.castle.treasury, 1, 'the top level wraps to 1');
  assert.equal(m.castle.barracks, 3);
  for (const id of BUILDING_IDS) assert.ok(m.castle[id] >= 1);
  assert.equal(m.chapel, true);
  assert.equal(m.crowns, 5000);
  m.crowns = 9000;
  devGrant(m, 'town', 0);
  assert.equal(m.crowns, 9000, 'never takes crowns away');
});

test('the Castle tab no longer carries Build Town; the Developer page does', () => {
  const home = readFileSync('src/home.ts', 'utf8');
  const settings = readFileSync('src/settings.ts', 'utf8');
  assert.ok(!home.includes("'Build Town'"));
  assert.ok(settings.includes("devGrantFn?.('town', 0)"));
});
