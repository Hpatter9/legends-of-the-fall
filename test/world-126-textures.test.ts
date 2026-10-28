import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ColumnTextures, columnKey } from '../src/render/columnTextures';

const fixture = (count = 2, bytes = 20) => {
  let next = 0;
  const destroyed: number[] = [];
  const cache = new ColumnTextures<number>(v => destroyed.push(v), count, bytes);
  return { cache, destroyed, get: (key: string, size = 10) => cache.acquire(key, size, () => ++next) };
};
test('identical active, demoted and temporary bake leases share a source and release once', () => {
  const {cache, destroyed, get} = fixture();
  const active = get('a'), demoted = get('a'), bake = get('a');
  assert.equal(active.value, bake.value);
  bake.release(); bake.release();
  cache.clear();
  assert.deepEqual(destroyed, []);
  active.release();
  assert.deepEqual(destroyed, []);
  demoted.release();
  assert.deepEqual(destroyed, [active.value]);
  assert.equal(cache.stats.live, 0);
});
test('pinned entries survive eviction pressure; overflow dies on release', () => {
  const {cache, destroyed, get} = fixture(1, 10);
  const active = get('active'), overflow = get('overflow');
  assert.equal(cache.stats.retained, 1);
  overflow.release(); overflow.release();
  assert.deepEqual(destroyed, [overflow.value]);
  const shared = get('active');
  assert.equal(shared.value, active.value);
  assert.ok(!destroyed.includes(active.value));
  shared.release(); active.release(); cache.clear();
  assert.equal(cache.stats.live, 0);
});
test('idle least-recently-used sources make room within count and byte budgets', () => {
  const {cache, destroyed, get} = fixture();
  const a = get('a'); a.release();
  const b = get('b'); b.release();
  get('a').release();
  const c = get('c'); c.release();
  assert.deepEqual(destroyed, [b.value]);
  assert.equal(cache.stats.retainedBytes, 20);
  cache.clear();
  assert.equal(cache.stats.liveBytes, 0);
  assert.equal(new Set(destroyed).size, 3);
});
test('oversized sources are transient and repeated theme changes retain bounded memory', () => {
  const {cache, destroyed, get} = fixture();
  const large = get('large', 21);
  assert.equal(cache.stats.retained, 0);
  large.release();
  for (let i = 0; i < 2000; i++) {
    get(`theme-${i}`).release();
    assert.ok(cache.stats.retained <= 2 && cache.stats.retainedBytes <= 20);
  }
  cache.clear();
  assert.equal(cache.stats.live, 0);
  assert.equal(destroyed.length, 2001);
});
test('appearance identity includes every painter input, signed and fractional foundation offsets', () => {
  const key = (u = 0, v = 0) => columnKey('forest', false, 1, false, undefined, 0, 1, u, v);
  assert.equal(key(5, 0), key());
  assert.notEqual(key(-1, 0), key(4, 0));
  assert.notEqual(key(0.5, 0), key());
  const original = ['forest', false, 1, false, undefined, 0, 1, 0, 0] as const;
  for (const [index, replacement] of [[0,'snow'],[1,true],[2,2],[3,true],[4,'deep'],[5,1],[6,2],[7,1],[8,1]] as const) {
    const changed = [...original] as Parameters<typeof columnKey>;
    Object.assign(changed, { [index]: replacement });
    assert.notEqual(columnKey(...original), columnKey(...changed));
  }
});
