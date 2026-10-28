// Contact sheets of every front/rear stride, in playback order, for leg review.
require('./font-cache.cjs');
const fs = require('node:fs');
const sharp = require('sharp');
const layout = require('../../src/art/units/sheets.json');
const { sheetOf } = require('./atlas.cjs');
const specs = [{ id: 'soldier', name: 'Soldier' }, { id: 'archer', name: 'Samurai Archer' }, ...require('./roster.json'), ...require('./variants.json')];
const frontOf = id => id === 'soldier' ? 'hero_soldier' : id === 'archer' ? 'hero_samurai_archer' : sheetOf(id);

(async () => {
  for (let group = 0; group < Math.ceil(specs.length / 5); group++) {
    const members = specs.slice(group * 5, group * 5 + 5), pieces = [];
    for (let j = 0; j < members.length; j++) {
      const s = members[j], front = frontOf(s.id);
      for (const [side, id] of [[0, front], [1, layout[front].rear]]) {
        const l = layout[id], { data, info } = await sharp(`src/art/units/${id}.png`).raw().toBuffer({ resolveWithObject: true });
        const row = l.rows.indexOf('walk'), ry = (j * 2 + side) * 144;
        const label = `<svg width="1280" height="16"><text x="8" y="13" font-size="12" fill="#e9dfc2">${s.name} — ${side ? 'BACK' : 'FRONT'} — frames 1–8</text></svg>`;
        pieces.push({ input: Buffer.from(label), left: 0, top: ry });
        for (let n = 0; n < 8; n++) {
          const raw = Buffer.alloc(160 * 128 * 4), cw = Math.min(l.w, 160), ch = Math.min(l.h, 128);
          const sx = n % l.perRow * l.w + Math.max(0, (l.w - 160) / 2), sy = (row + Math.floor(n / l.perRow)) * l.h + Math.max(0, l.h - 128);
          const dx = Math.max(0, (160 - l.w) / 2), dy = Math.max(0, 128 - l.h);
          for (let y = 0; y < ch; y++) {
            const start = ((sy + y) * info.width + sx) * 4;
            data.copy(raw, ((dy + y) * 160 + dx) * 4, start, start + cw * 4);
          }
          pieces.push({ input: await sharp(raw, { raw: { width: 160, height: 128, channels: 4 } }).png().toBuffer(), left: n * 160, top: ry + 16 });
        }
      }
    }
    await sharp({ create: { width: 1280, height: members.length * 288, channels: 4, background: '#29323d' } }).composite(pieces).png()
      .toFile(`docs/samples/resonance-roster/walk-review-${String(group + 1).padStart(2, '0')}.png`);
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
