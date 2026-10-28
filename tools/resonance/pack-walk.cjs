// Eight front and eight rear poses, with a reserved continuation row rather
// than padding every other animation to eight columns.
const fs = require('node:fs');
const sharp = require('sharp');
const { pack, sheetOf, w, h } = require('./atlas.cjs');
const specs = [{ id: 'soldier', size: 50 }, { id: 'archer', size: 50 }, ...require('./roster.json'), ...require('./variants.json')];
const selected = new Set(process.argv.slice(2));
const frontOf = id => id === 'soldier' ? 'hero_soldier' : id === 'archer' ? 'hero_samurai_archer' : sheetOf(id);

(async () => {
  const path = 'src/art/units/sheets.json', layout = JSON.parse(fs.readFileSync(path, 'utf8'));
  for (const spec of specs.filter(s => !selected.size || selected.has(s.id))) {
    const source = `tools/resonance/source/walk/${spec.id}.png`, front = frontOf(spec.id), rear = layout[front]?.rear;
    if (!fs.existsSync(source) || !rear) { console.log(`${spec.id}: awaiting walk/rear`); continue; }
    try {
      const packed = `out/resonance-walk/${spec.id}.png`;
      await pack(spec, { path: source, output: packed, figure: layout[front].figure,
        rows: ['frontA', 'frontB', 'rearA', 'rearB'], report: 'walk' });
      for (const [sheet, sourceRow] of [[front, 0], [rear, 2]]) {
        const l = layout[sheet], rows = l.rows.filter(row => row !== '_walk'), walkAt = rows.indexOf('walk');
        rows.splice(walkAt + 1, 0, '_walk');
        const original = await sharp(`src/art/units/${sheet}.png`).raw().toBuffer({ resolveWithObject: true }), pieces = [];
        for (let r = 0; r < rows.length; r++) {
          const name = rows[r];
          if (name === 'walk' || name === '_walk') {
            const src = sourceRow + (name === '_walk' ? 1 : 0);
            pieces.push({ input: await sharp(packed).extract({ left: 0, top: src * h, width: w * 4, height: h }).png().toBuffer(), left: 0, top: r * h });
          } else {
            const src = l.rows.indexOf(name);
            for (let c = 0; c < l.counts[name]; c++) pieces.push({
              input: await sharp(original.data, { raw: original.info }).extract({ left: c * l.w, top: src * l.h, width: l.w, height: l.h }).png().toBuffer(),
              left: c * w + (w - l.w) / 2, top: r * h + h - l.h,
            });
          }
        }
        await sharp({ create: { width: w * 4, height: h * rows.length, channels: 4, background: '#00000000' } }).composite(pieces).png().toFile(`src/art/units/${sheet}.png`);
        layout[sheet] = { ...l, w, h, rows, counts: { ...l.counts, walk: 8, _walk: 0 } };
      }
      fs.writeFileSync(path, JSON.stringify(layout, null, 1) + '\n');
      console.log(`${spec.id}: eight front and eight rear walking poses installed`);
    } catch (e) { console.error(`${spec.id}: ${e.message}`); process.exitCode = 1; }
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
