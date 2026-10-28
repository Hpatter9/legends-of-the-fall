// Lossless alpha selection/cropping, followed by nearest-neighbour sampling.
// Connected figures are assigned as whole components, so a long staff may cross
// a nominal row gutter without losing its tip or a boot.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const sharp = require('sharp');
const w = 256, h = 144;
const sheetOf = id => `hero_res_${id.replace(/[A-Z]/g, c => '_' + c.toLowerCase())}`;

async function pack(spec, options = {}) {
  const input = options.path ?? `tools/resonance/source/roster/${spec.id}.png`;
  if (!fs.existsSync(input)) return null;
  const rows = options.rows ?? ['idle', 'walk', 'attack', 'hurt', 'dead', 'attack2'];
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const cell = info.width / 4;
  assert.ok(Number.isInteger(cell), spec.id);
  assert.equal(info.height, rows.length * cell, spec.id);
  const labels = new Uint8Array(info.width * info.height), groups = Array.from({ length: rows.length * 4 }, () => []);
  const report = { id: spec.id, frames: [], warnings: [] };
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    const start = y * info.width + x;
    if (labels[start] || data[start * 4 + 3] < 128) continue;
    const stack = [start], points = [];
    let sumX = 0, sumY = 0, x0 = x, x1 = x, y0 = y, y1 = y;
    labels[start] = 1;
    while (stack.length) {
      const p = stack.pop(), px = p % info.width, py = Math.floor(p / info.width);
      points.push(p); sumX += px; sumY += py;
      x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = px + dx, ny = py + dy, np = ny * info.width + nx;
        if (nx < 0 || nx >= info.width || ny < 0 || ny >= info.height || labels[np] || data[np * 4 + 3] < 128) continue;
        labels[np] = 1; stack.push(np);
      }
    }
    if (points.length < 100) continue;
    const row = Math.min(rows.length - 1, Math.floor(sumY / points.length / cell));
    const col = Math.min(3, Math.floor(sumX / points.length / cell));
    const merged = x1 - x0 > cell * 1.5 || y1 - y0 > cell * 1.5;
    if (merged) report.warnings.push({ kind: 'touching', row: rows[row], box: [x0, y0, x1, y1] });
    for (const p of points) {
      const slot = merged ? Math.min(rows.length - 1, Math.floor(p / info.width / cell)) * 4 + Math.floor(p % info.width / cell) : row * 4 + col;
      groups[slot].push(p);
    }
  }
  const frames = [];
  for (let i = 0; i < groups.length; i++) {
    const points = groups[i];
    assert.ok(points.length > 500, `${spec.id}: missing ${rows[Math.floor(i / 4)]} ${i % 4}`);
    let x0 = info.width, x1 = 0, y0 = info.height, y1 = 0;
    for (const p of points) { const x = p % info.width, y = Math.floor(p / info.width); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    const width = x1 - x0 + 1, height = y1 - y0 + 1, raw = Buffer.alloc(width * height * 4);
    for (const p of points) {
      const dst = ((Math.floor(p / info.width) - y0) * width + p % info.width - x0) * 4;
      data.copy(raw, dst, p * 4, p * 4 + 3); raw[dst + 3] = 255;
    }
    frames.push({ raw, x0, y0, x1, y1, width, height, row: Math.floor(i / 4), col: i % 4 });
  }
  const figure = options.figure ?? spec.figure ?? 96, factor = figure / frames[0].height, pieces = [];
  for (const f of frames) {
    const width = Math.round(f.width * factor), height = Math.round(f.height * factor);
    const left = Math.round(w / 2 + (f.x0 - (f.col * cell + cell / 2)) * factor);
    assert.ok(left > 0 && left + width < w && height < h, `${spec.id}: clipped ${rows[f.row]} ${f.col}, ${width}x${height} at ${left}`);
    pieces.push({ input: await sharp(f.raw, { raw: { width: f.width, height: f.height, channels: 4 } }).resize(width, height, { kernel: 'nearest' }).png().toBuffer(),
      left: f.col * w + left, top: f.row * h + h - height });
    report.frames.push({ row: rows[f.row], col: f.col, box: [f.x0, f.y0, f.x1, f.y1], width, height, left });
  }
  const sheet = options.sheet ?? sheetOf(spec.id), output = options.output ?? `src/art/units/${sheet}.png`;
  fs.mkdirSync(path.dirname(output), { recursive: true });
  await sharp({ create: { width: w * 4, height: h * rows.length, channels: 4, background: '#00000000' } }).composite(pieces).png().toFile(output);
  fs.writeFileSync(`docs/samples/resonance-roster/${spec.id}-${options.report ?? 'packing'}.json`, JSON.stringify(report, null, 2) + '\n');
  return { sheet, output, warnings: report.warnings, scale: spec.size / figure,
    layout: { w, h, perRow: 4, rows, counts: Object.fromEntries(rows.map(row => [row, 4])), figure, facesRight: true, lies: rows.includes('dead') } };
}
module.exports = { pack, sheetOf, w, h };
