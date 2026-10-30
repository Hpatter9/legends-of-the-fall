// Validate the emitted assets and build review contacts from actual packed cells.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const sharp = require('sharp');
const art = require('../../src/art/awakened/manifest.json');
const roster = require('./roster.json');
const out = 'docs/samples/ascended-heroes';
const issues = [], reviews = [], decoded = [];
const views = new Map();
const sample = [['idle',0,0], ['idle',0,1], ['walk',0,0], ['walk',2,0], ['walk',4,0], ['walk',6,0], ['attack',1,0], ['attack',2,0], ['attack',1,1], ['dead',2,0], ['dead',3,0], ['dead',3,1]];

(async () => {
  let checked = 0;
  for (const spec of roster) {
    const id = art.forms[spec.base];
    if (!id) { issues.push(`${spec.id}: missing form`); continue; }
    for (const sheet of [id, art.layouts[id].rear]) {
      const l = art.layouts[sheet];
      const { data, info } = await sharp(`src/art/awakened/${sheet}.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      assert.equal(info.width, l.w * 4); assert.equal(info.height, l.h * 7);
      views.set(sheet, { data, info }); decoded.push(info.width * info.height * 4);
      for (const row of l.rows) for (let n = 0; n < l.counts[row]; n++) {
        const sx = n % 4 * l.w, sy = (l.rows.indexOf(row) + Math.floor(n / 4)) * l.h;
        let x0 = l.w, x1 = -1, y0 = l.h, y1 = -1, pixels = 0;
        for (let y = 0; y < l.h; y++) for (let x = 0; x < l.w; x++) {
          const alpha = data[((y + sy) * info.width + x + sx) * 4 + 3];
          if (alpha !== 0 && alpha !== 255) issues.push(`${sheet}/${row}/${n}: soft alpha`);
          if (!alpha) continue;
          pixels++; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
        }
        if (!pixels) issues.push(`${sheet}/${row}/${n}: empty`);
        if (x0 < 2 || x1 >= l.w - 2 || y0 < 2) issues.push(`${sheet}/${row}/${n}: no transparent safety margin`);
        if (y1 - y0 + 1 > l.figure * 1.35) reviews.push(`${sheet}/${row}/${n}: tall pose (${y1-y0+1}px vs ${l.figure}px figure)`);
        if (row === 'dead' && n === l.counts.dead - 1 && x1-x0 < (y1-y0)*1.1) reviews.push(`${sheet}: terminal death needs visual review`);
        checked++;
      }
    }
  }
  for (let batch = 0; batch < Math.ceil(roster.length / 7); batch++) {
    const pieces = [];
    for (const [r, spec] of roster.slice(batch * 7, batch * 7 + 7).entries()) {
      const front = art.forms[spec.base]; if (!front) continue;
      const label = Buffer.from(`<svg width="1440" height="24"><text x="8" y="18" fill="#f4d49b" font-size="17" font-family="sans-serif">${spec.name} — idle front/rear | walk 1/3/5/7 | attacks front/rear | dead front/rear</text></svg>`);
      pieces.push({ input: label, left: 0, top: r * 150 });
      for (const [c, [row, n, away]] of sample.entries()) {
        const id = away ? art.layouts[front].rear : front, l = art.layouts[id], v = views.get(id);
        const png = await sharp(v.data, { raw: v.info }).extract({ left: n % 4 * l.w, top: (l.rows.indexOf(row) + Math.floor(n / 4)) * l.h, width: l.w, height: l.h })
          .resize({ width: 116, height: 124, fit: 'inside', kernel: 'nearest' }).png().toBuffer();
        pieces.push({ input: png, left: c * 120, top: r * 150 + 24 });
      }
    }
    await sharp({ create: { width: 1440, height: 1050, channels: 4, background: '#17202b' } }).composite(pieces).png().toFile(`${out}/actions-${batch + 1}.png`);
  }
  const result = { forms: Object.keys(art.forms).length, views: Object.keys(art.layouts).length, checked, decodedMiB: decoded.reduce((a,b)=>a+b,0)/1048576, issues, reviews };
  fs.writeFileSync(`${out}/asset-checks.json`, JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
  if (issues.length) process.exitCode = 1;
})().catch(e => { console.error(e); process.exitCode = 1; });
