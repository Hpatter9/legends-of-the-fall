// Rear atlases also carry a deliberately articulated front walk in their last
// row. Install that walk, retain the original front actions, and register a rear
// sheet. Left views use the renderer's existing mirror, giving four facings.
const fs = require('node:fs');
const sharp = require('sharp');
const assert = require('node:assert/strict');
const { pack, sheetOf, w, h } = require('./pack-roster.cjs');
const specs = [...require('./roster.json'), ...require('./variants.json')];
specs.unshift({ id: 'soldier', size: 50 }, { id: 'archer', size: 50 });
const selected = new Set(process.argv.slice(2));
const frontOf = id => id === 'soldier' ? 'hero_soldier' : id === 'archer' ? 'hero_samurai_archer' : sheetOf(id);

(async () => {
  const path = 'src/art/units/sheets.json', layout = JSON.parse(fs.readFileSync(path, 'utf8'));
  for (const spec of specs.filter(s => !selected.size || selected.has(s.id))) {
    const source = `tools/resonance/source/turning/${spec.id}.png`, front = frontOf(spec.id);
    if (!fs.existsSync(source) || !layout[front]) { console.log(`${spec.id}: awaiting front/rear`); continue; }
    try {
      const base = layout[front], rear = front + '_back';
      const metaPath = source.replace(/\.png$/, '.json');
      const fullRear = fs.existsSync(metaPath) && JSON.parse(fs.readFileSync(metaPath, 'utf8')).format === 'fullRear';
      const result = await pack(spec, { path: source, sheet: rear, figure: base.figure,
        rows: ['idle', 'walk', 'attack', 'hurt', 'dead', fullRear ? 'attack2' : 'frontWalk'], report: 'turning' });
      const rearPath = `src/art/units/${rear}.png`;
      const frontWalk = await sharp(rearPath).extract({ left: 0, top: 5 * h, width: w * 4, height: h }).png().toBuffer();
      // Keep the original front art unchanged apart from padding when the two
      // pilot sheets have smaller cells than the rest of the roster.
      const frontPath = `src/art/units/${front}.png`, frontRaw = await sharp(frontPath).raw().toBuffer({ resolveWithObject: true });
      const pieces = [];
      for (let r = 0; r < base.rows.length; r++) for (let c = 0; c < base.counts[base.rows[r]]; c++) {
        const buffer = await sharp(frontRaw.data, { raw: frontRaw.info })
          .extract({ left: (c % base.perRow) * base.w, top: (r + Math.floor(c / base.perRow)) * base.h, width: base.w, height: base.h }).png().toBuffer();
        pieces.push({ input: buffer, left: (c % base.perRow) * w + Math.round((w - base.w) / 2), top: (r + Math.floor(c / base.perRow)) * h + h - base.h });
      }
      const padded = await sharp({ create: { width: w * base.perRow, height: h * base.rows.length, channels: 4, background: '#00000000' } })
        .composite(pieces).png().toBuffer();
      const walkRow = base.rows.indexOf('walk'); assert.ok(walkRow >= 0);
      // Replace transparent pixels too: clear the old row before placing its new
      // cycle, so a previous leg or trailing weapon cannot remain underneath.
      const { data, info } = await sharp(padded).raw().toBuffer({ resolveWithObject: true });
      if (!fullRear) data.fill(0, walkRow * h * info.width * 4, (walkRow + 1) * h * info.width * 4);
      await sharp(data, { raw: info }).composite(fullRear ? [] : [{ input: frontWalk, left: 0, top: walkRow * h }]).png().toFile(frontPath);
      // A rear skill can reuse its attack gesture. The last source row faces the
      // camera and is used only as the front walk, never as a rear cast.
      const attack = await sharp(rearPath).extract({ left: 0, top: 2 * h, width: w * 4, height: h }).png().toBuffer();
      const rearRaw = await sharp(rearPath).raw().toBuffer({ resolveWithObject: true });
      if (!fullRear) rearRaw.data.fill(0, 5 * h * rearRaw.info.width * 4);
      await sharp(rearRaw.data, { raw: rearRaw.info }).composite(fullRear ? [] : [{ input: attack, left: 0, top: 5 * h }]).png().toFile(rearPath);
      layout[front] = { ...base, w, h, rear, counts: { ...base.counts, walk: fullRear ? base.counts.walk : 4 } };
      layout[rear] = { ...result.layout, front, rows: ['idle', 'walk', 'attack', 'hurt', 'dead', 'attack2'],
        counts: { idle: 4, walk: 4, attack: 4, hurt: 4, dead: 4, attack2: 4 } };
      fs.writeFileSync(path, JSON.stringify(layout, null, 1) + '\n');
      console.log(spec.id, JSON.stringify({ rear, warnings: result.warnings }));
    } catch (e) { console.error(`${spec.id}: ${e.message}`); process.exitCode = 1; }
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
