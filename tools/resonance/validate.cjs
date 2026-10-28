const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const sharp = require('sharp');
const esbuild = require('esbuild');
esbuild.buildSync({ entryPoints: ['tools/resonance/fixture.ts'], outfile: 'out/resonance-fixture.cjs', bundle: true, platform: 'node', format: 'cjs', logLevel: 'silent' });
const { ALL_HEROES, UNITS, layout } = require(path.resolve('out/resonance-fixture.cjs'));

(async () => {
  const pairs = Object.entries(layout).filter(([id, l]) => id.startsWith('hero_') && l.rear);
  assert.equal(pairs.length, 50);
  assert.equal(ALL_HEROES.length, 45);
  for (const kind of ALL_HEROES) assert.ok(layout[UNITS[kind].sheet].rear, `${kind}: rear view`);
  let frames = 0, walkFrames = 0;
  const reviews = [];
  for (const [front, first] of pairs) {
    const rear = layout[first.rear];
    assert.equal(rear.front, front);
    for (const key of ['w', 'h', 'figure', 'perRow']) assert.equal(first[key], rear[key], `${front}: matched ${key}`);
    for (const id of [front, first.rear]) {
      const l = layout[id];
      assert.equal(l.counts.walk, 8, id);
      assert.equal(l.rows[l.rows.indexOf('walk') + 1], '_walk', id);
      const { data, info } = await sharp(`src/art/units/${id}.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      assert.equal(info.width, l.w * l.perRow, id);
      assert.equal(info.height, l.h * l.rows.length, id);
      for (let i = 3; i < data.length; i += 4) assert.ok(data[i] === 0 || data[i] === 255, `${id}: alpha`);
      const walking = new Set();
      for (const [row, name] of l.rows.entries()) for (let n = 0; n < l.counts[name]; n++) {
        const sx = (n % l.perRow) * l.w, sy = (row + Math.floor(n / l.perRow)) * l.h;
        assert.ok(sy + l.h <= info.height, `${id} ${name}: span`);
        const hash = createHash('sha256');
        let pixels = 0, x0 = l.w, x1 = 0, y0 = l.h, y1 = 0;
        for (let y = 0; y < l.h; y++) {
          const start = ((sy + y) * info.width + sx) * 4;
          hash.update(data.subarray(start, start + l.w * 4));
          for (let x = 0; x < l.w; x++) if (data[start + x * 4 + 3]) {
            pixels++; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
          }
        }
        assert.ok(pixels > 300, `${id} ${name} ${n}: visible`);
        assert.ok(x0 > 0 && x1 < l.w - 1 && y0 > 0, `${id} ${name} ${n}: no cut edge`);
        if (name === 'walk') { walking.add(hash.digest('hex')); walkFrames++; }
        if (name === 'dead' && n === l.counts.dead - 1 && x1 - x0 <= y1 - y0) reviews.push({ id, check: 'death silhouette', width: x1 - x0, height: y1 - y0 });
        frames++;
      }
      assert.equal(walking.size, 8, `${id}: eight distinct walking poses`);
    }
  }
  const result = { heroes: ALL_HEROES.length, pairs: pairs.length, directionsPerHero: 4, walkingClips: pairs.length * 2, walkingFrames: walkFrames, checkedFrames: frames, hardAlpha: true, frameBounds: 'pass', reviews };
  fs.writeFileSync('docs/samples/resonance-roster/asset-checks.json', JSON.stringify(result, null, 2) + '\n');
  console.log(result);
})().catch(e => { console.error(e); process.exitCode = 1; });
