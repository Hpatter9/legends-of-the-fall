import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { RELICS } from '../src/sim/relics';

// INT-341: every relic has its own painted icon in src/art/relics/<id>.webp (128 x 128), and every painting there is a relic's.
test('every relic has a painted icon, and every painted icon is a relic\'s', () => {
  const files = readdirSync('src/art/relics').filter((f) => f.endsWith('.webp')).map((f) => f.slice(0, -5));
  assert.deepEqual(files.sort(), Object.keys(RELICS).sort());
  const items = readFileSync('src/render/items.ts', 'utf8');
  for (const id of files) assert.ok(items.includes(`'${id}'`), `${id} is listed as painted in items.ts`);
  for (const id of files.slice(0, 6)) {
    const b = readFileSync(`src/art/relics/${id}.webp`);
    assert.equal(b.toString('ascii', 0, 4), 'RIFF', id);
    assert.equal(b.toString('ascii', 8, 12), 'WEBP', id);
  }
});
