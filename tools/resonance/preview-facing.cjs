// Render the exact walking cells used by the game as a four-facing loop.
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const sharp = require('sharp');
const layout = require('../../src/art/units/sheets.json');
const { sheetOf } = require('./pack-roster.cjs');
const ids = process.argv.slice(2).length ? process.argv.slice(2) : ['soldier', 'samurai'];
const sheet = id => id === 'soldier' ? 'hero_soldier' : id === 'archer' ? 'hero_samurai_archer' : sheetOf(id);
const width = 1024, rowH = 232;
const out = 'docs/samples/resonance-roster';
fs.mkdirSync('/tmp/resonance-walk', { recursive: true });

(async () => {
  for (let frame = 0; frame < 4; frame++) {
    const pieces = [];
    for (let r = 0; r < ids.length; r++) {
      const front = sheet(ids[r]), rear = layout[front].rear;
      if (!rear) throw Error(`No rear view: ${ids[r]}`);
      for (const [c, id, mirror, name] of [[0, rear, true, 'BACK LEFT'], [1, rear, false, 'BACK RIGHT'], [2, front, true, 'FRONT LEFT'], [3, front, false, 'FRONT RIGHT']]) {
        const l = layout[id], row = l.rows.indexOf('walk');
        let image = sharp(`src/art/units/${id}.png`).extract({ left: frame * l.w + (l.w - 160) / 2, top: row * l.h + l.h - 128, width: 160, height: 128 });
        if (mirror) image = image.flop();
        pieces.push({ input: await image.resize(240, 192, { kernel: 'nearest' }).png().toBuffer(), left: c * 256 + 8, top: r * rowH + 32 });
        const label = `<svg width="256" height="30"><text x="128" y="15" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#eee1b9">${ids[r]} · ${name}</text></svg>`;
        pieces.push({ input: Buffer.from(label), left: c * 256, top: r * rowH + 6 });
      }
    }
    await sharp({ create: { width, height: rowH * ids.length, channels: 4, background: '#27303d' } }).composite(pieces).png().toFile(`/tmp/resonance-walk/${frame}.png`);
  }
  execFileSync('convert', ['-delay', '16', '-loop', '0', ...[0, 1, 2, 3].map(i => `/tmp/resonance-walk/${i}.png`), `${out}/walking-four-directions.gif`]);
  fs.copyFileSync('/tmp/resonance-walk/0.png', `${out}/walking-four-directions.png`);
})().catch(e => { console.error(e); process.exitCode = 1; });
