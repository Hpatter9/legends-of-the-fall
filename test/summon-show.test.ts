import test from 'node:test';
import assert from 'node:assert/strict';
import { cardTimes, drawOrder, HEROES_AFTER_MS, HEROES_AT_ONCE_MS, shardTotals } from '../src/render/summonRules';
import type { Pull } from '../src/sim/meta';

// SUMMON-SHOW (the owner: "Have the tarot cards, shards only show first. Then after that the unlocked heroes can show."):
// a draw's shard cards all come before any new hero, and the new heroes come one after another, the last one held.
const shard = (kind: string, n = 1, have?: number, need?: number): Pull => ({ kind, isNew: false, shards: have === undefined ? n : 0, ...(have !== undefined ? { unlock: n, have, need } : {}) });
const hero = (kind: string, lucky = false): Pull => ({ kind, isNew: true, shards: 0, ...(lucky ? { lucky } : {}) });

test('a ten-draw shows every shard card before any new hero, each in the order drawn', () => {
  const got = [shard('a'), hero('h1'), shard('b'), shard('c'), hero('h2'), shard('a'), shard('d'), shard('e'), hero('h3'), shard('b')];
  const o = drawOrder(got);
  assert.deepEqual(o.cards, [0, 2, 3, 5, 6, 7, 9]);
  assert.deepEqual(o.heroes, [1, 4, 8]);
  assert.equal(o.held, 8, 'the last new hero is the one held');
  assert.equal(o.heroesAfter, HEROES_AFTER_MS);
  // (every result is shown once)
  assert.deepEqual([...o.cards, ...o.heroes].sort((x, y) => x - y), [...got.keys()]);
});

test('a draw of shards only has no heroes and nothing held', () => {
  const o = drawOrder(Array.from({ length: 10 }, (_, i) => shard(`k${i % 3}`)));
  assert.equal(o.cards.length, 10);
  assert.deepEqual(o.heroes, []);
  assert.equal(o.held, -1);
  assert.equal(o.heroesAfter, 0);
});

test('a draw of new heroes only has no cards, and its first reveal comes almost at once', () => {
  const o = drawOrder(Array.from({ length: 10 }, (_, i) => hero(`h${i}`)));
  assert.deepEqual(o.cards, []);
  assert.equal(o.heroes.length, 10);
  assert.equal(o.held, 9);
  assert.equal(o.heroesAfter, HEROES_AT_ONCE_MS);
});

test('a single draw keeps working: one card, or one hero held', () => {
  assert.deepEqual(drawOrder([shard('a')]), { cards: [0], heroes: [], held: -1, heroesAfter: 0 });
  assert.deepEqual(drawOrder([hero('h')]), { cards: [], heroes: [0], held: 0, heroesAfter: HEROES_AT_ONCE_MS });
});

test('the shard cards turn one after another, quickly', () => {
  const t = cardTimes(10);
  assert.equal(t.length, 10);
  for (let i = 1; i < t.length; i++) assert.ok(t[i] > t[i - 1]);
  assert.ok(t[9] < 2000, 'ten cards turn within two seconds');
});

test('the shard totals list each hero once, its whole share and its bar after the last card', () => {
  const got = [shard('a', 1, 4, 15), shard('r', 2), hero('h'), shard('a', 1, 5, 15), { ...shard('t', 0), crowns: 40 }, shard('h', 1, 14, 15), shard('r', 1)];
  const t = shardTotals(got);
  assert.deepEqual(t.map((x) => x.kind), ['a', 'r', 't', 'h']);
  const a = t[0];
  assert.equal(a.cards, 2);
  assert.equal(a.unlock, 2);
  assert.equal(a.have, 5);
  assert.equal(a.need, 15);
  assert.equal(t[1].rank, 3);
  assert.equal(t[2].crowns, 40);
  assert.equal(t[3].joins, true, 'a hero whose shards are in the draw and who joins in it is marked');
  assert.equal(a.joins, false);
});

// SUMMON-SHOW part 2: the Blender show's timing, and its manifest against the sheets on disk.
import { readFileSync, existsSync, statSync } from 'node:fs';
import { decodedBytes, flourishAt, heroShowAt, SHOW_AT, skipShowTo } from '../src/render/summonRules';
import { SUMMON_FX } from '../src/render/summonFxData';

test('a new hero\'s show: the charge, the rift, the burst, then the aftermath looping under it', () => {
  const at = (t: number) => heroShowAt(t, SUMMON_FX).map((f) => f.piece);
  assert.deepEqual(at(0), ['charge']);
  assert.deepEqual(at(SHOW_AT.rift - 1), ['charge']);
  assert.deepEqual(at(SHOW_AT.rift), ['rift']);
  assert.deepEqual(at(SHOW_AT.burst), ['burst']);
  const burstEnd = SHOW_AT.burst + SUMMON_FX.burst.n * SUMMON_FX.burst.ms;
  assert.deepEqual(at(burstEnd - 100), ['after', 'burst'], 'the aftermath fades in under the end of the burst');
  assert.deepEqual(at(burstEnd), ['after']);
  assert.deepEqual(at(60000), ['after'], 'the aftermath stays while the hero is held');
  // (each piece played once ends on its last frame, and the whole show is three to four seconds before it settles)
  assert.equal(heroShowAt(SHOW_AT.rift - 1, SUMMON_FX)[0].frame, SUMMON_FX.charge.n - 1);
  assert.ok(burstEnd >= 2600 && burstEnd <= 4000);
  for (let t = 0; t < 8000; t += 37) for (const f of heroShowAt(t, SUMMON_FX)) assert.ok(f.frame >= 0 && f.frame < SUMMON_FX[f.piece].n && f.alpha > 0 && f.alpha <= 1);
});

test('a skipped show still plays the arrival\'s burst', () => {
  assert.equal(skipShowTo(500), SHOW_AT.burst);
  assert.equal(skipShowTo(3000), 3000);
});

test('a shard card\'s flourish is under a second and ends', () => {
  const f = SUMMON_FX.flourish;
  assert.ok(f.n * f.ms < 1000);
  assert.equal(flourishAt(0, f), 0);
  assert.equal(flourishAt(f.n * f.ms, f), -1);
});

/** A WebP's size, from its header (VP8L lossless or VP8X). */
function webpSize(path: string): { w: number; h: number } {
  const b = readFileSync(path);
  const kind = b.toString('ascii', 12, 16);
  if (kind === 'VP8L') {
    const bits = b.readUInt32LE(21);
    return { w: (bits & 0x3fff) + 1, h: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (kind === 'VP8X') return { w: b.readUIntLE(24, 3) + 1, h: b.readUIntLE(27, 3) + 1 };
  return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
}

test('the show\'s manifest matches its sheets, and they stay light', () => {
  const sheets: { w: number; h: number }[] = [];
  let bytes = 0;
  for (const p of Object.values(SUMMON_FX)) {
    const path = `src/art/fx/summon/${p.file}`;
    assert.ok(existsSync(path), path);
    const s = webpSize(path);
    const rows = Math.ceil(p.n / p.cols);
    assert.deepEqual(s, { w: p.w * p.cols, h: p.h * rows }, p.file);
    assert.ok(p.x >= 0 && p.y >= 0 && p.x + p.w <= p.fw && p.y + p.h <= p.fh, `${p.file} lies in its frame`);
    sheets.push(s);
    bytes += statSync(path).size;
    if (p.glow) {
      const g = webpSize(`src/art/fx/summon/${p.glow}`);
      assert.deepEqual(g, { w: Math.ceil(p.w / 4) * p.cols, h: Math.ceil(p.h / 4) * rows }, p.glow);
      sheets.push(g);
      bytes += statSync(`src/art/fx/summon/${p.glow}`).size;
    }
  }
  assert.ok(bytes < 200_000, `the show is ${bytes} bytes`);
  assert.ok(decodedBytes(sheets) < 8_000_000, `the show decodes to ${decodedBytes(sheets)} bytes`);
  // (the page loads them by URL: the service worker must keep them)
  assert.match(readFileSync('build.mjs', 'utf8'), /SUMMON_FX_FILES\.map/);
});
