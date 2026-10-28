// Render the exact walking cells used by the game as a four-facing loop.
require('./font-cache.cjs');
const fs = require('node:fs');
const sharp = require('sharp');
const layout = require('../../src/art/units/sheets.json');
const { sheetOf } = require('./pack-roster.cjs');
const ids = process.argv.slice(2).length ? process.argv.slice(2) : ['soldier', 'samurai'];
const sheet = id => id === 'soldier' ? 'hero_soldier' : id === 'archer' ? 'hero_samurai_archer' : sheetOf(id);
const width = 1024, rowH = 232;
const out = 'docs/samples/resonance-roster';
fs.mkdirSync('/tmp/resonance-walk', { recursive: true });

(async () => {
  for (let frame = 0; frame < 8; frame++) {
    const pieces = [];
    for (let r = 0; r < ids.length; r++) {
      const front = sheet(ids[r]), rear = layout[front].rear;
      if (!rear) throw Error(`No rear view: ${ids[r]}`);
      if (layout[front].counts.walk !== 8 || layout[rear].counts.walk !== 8) throw Error(`Incomplete walk: ${ids[r]}`);
      for (const [c, id, mirror, name] of [[0, rear, true, 'BACK LEFT'], [1, rear, false, 'BACK RIGHT'], [2, front, true, 'FRONT LEFT'], [3, front, false, 'FRONT RIGHT']]) {
        const l = layout[id], row = l.rows.indexOf('walk');
        const cell = await sharp(`src/art/units/${id}.png`).extract({ left: (frame % l.perRow) * l.w, top: (row + Math.floor(frame / l.perRow)) * l.h, width: l.w, height: l.h }).png().toBuffer();
        let image = sharp(cell);
        if (l.w < 160 || l.h < 128) image = image.extend({ left: Math.max(0, (160 - l.w) / 2), right: Math.max(0, (160 - l.w) / 2), top: Math.max(0, 128 - l.h), bottom: 0, background: '#00000000' });
        const padded = await image.png().toBuffer(), m = await sharp(padded).metadata();
        image = sharp(padded).extract({ left: (m.width - 160) / 2, top: m.height - 128, width: 160, height: 128 });
        if (mirror) image = image.flop();
        pieces.push({ input: await image.resize(240, 192, { kernel: 'nearest' }).png().toBuffer(), left: c * 256 + 8, top: r * rowH + 32 });
        const label = `<svg width="256" height="30"><text x="128" y="15" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#eee1b9">${ids[r]} · ${name}</text></svg>`;
        pieces.push({ input: Buffer.from(label), left: c * 256, top: r * rowH + 6 });
      }
    }
    await sharp({ create: { width, height: rowH * ids.length, channels: 4, background: '#27303d' } }).composite(pieces).png().toFile(`/tmp/resonance-walk/${frame}.png`);
  }
  await sharp(Array.from({ length: 8 }, (_, i) => `/tmp/resonance-walk/${i}.png`), { join: { animated: true } })
    .gif({ delay: Array(8).fill(80), loop: 0, dither: 0 }).toFile(`${out}/walking-four-directions.gif`);
  fs.copyFileSync('/tmp/resonance-walk/0.png', `${out}/walking-four-directions.png`);
})().catch(e => { console.error(e); process.exitCode = 1; });
