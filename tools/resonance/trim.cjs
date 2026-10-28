// Remove only transparent padding. The front/rear pair keeps an identical
// centre and ground line, so turning does not shift the body on its tile.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const sharp = require('sharp');

(async () => {
  const path = 'src/art/units/sheets.json', layout = JSON.parse(fs.readFileSync(path, 'utf8'));
  const pairs = Object.entries(layout).filter(([id, l]) => l.rear && id.startsWith('hero_'));
  let before = 0, after = 0;
  for (const [id, front] of pairs) {
    const ids = [id, front.rear], originals = [];
    let radius = 0, top = front.h;
    for (const sheet of ids) {
      const l = layout[sheet]; assert.equal(l.w, front.w); assert.equal(l.h, front.h);
      const original = await sharp(`src/art/units/${sheet}.png`).raw().toBuffer({ resolveWithObject: true });
      const { data, info } = original;
      for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) if (data[(y * info.width + x) * 4 + 3]) {
        radius = Math.max(radius, Math.abs(x % l.w - l.w / 2)); top = Math.min(top, y % l.h);
      }
      originals.push({ sheet, l, ...original }); before += info.width * info.height * 4;
    }
    const w = Math.min(front.w, Math.ceil(radius + 2) * 2), h = front.h - Math.max(0, top - 2);
    for (const original of originals) {
      const { sheet, l, data, info } = original, pieces = [];
      for (let r = 0; r < l.rows.length; r++) for (let c = 0; c < l.perRow; c++) pieces.push({
        input: await sharp(data, { raw: info }).extract({ left: c * l.w + (l.w - w) / 2, top: r * l.h + l.h - h, width: w, height: h }).png().toBuffer(),
        left: c * w, top: r * h,
      });
      await sharp({ create: { width: w * l.perRow, height: h * l.rows.length, channels: 4, background: '#00000000' } }).composite(pieces).png().toFile(`src/art/units/${sheet}.png`);
      layout[sheet] = { ...l, w, h }; after += w * l.perRow * h * l.rows.length * 4;
    }
    fs.writeFileSync(path, JSON.stringify(layout, null, 1) + '\n');
  }
  const result = { pairs: pairs.length, beforeMiB: before / 1048576, afterMiB: after / 1048576, reduction: 1 - after / before };
  fs.writeFileSync('docs/samples/resonance-roster/texture-memory.json', JSON.stringify(result, null, 2) + '\n');
  console.log(result);
})().catch(e => { console.error(e); process.exitCode = 1; });
