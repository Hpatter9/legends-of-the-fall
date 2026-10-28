import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newMeta } from '../src/sim/meta';
import { devGrant } from '../src/sim/devGrant';
import { ALL_HEROES } from '../src/sim/units';
import { isContent } from '../src/sim/unlockRules';

// The developer grant in Settings (the owner's testing tool): crowns, or shards of every hero, a hundred or a thousand a tap.
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
