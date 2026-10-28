// Pack the generated 4 x 6 atlases into the game's bottom-aligned animation cells.
// No painted pixels: crops, hard alpha and nearest-neighbour sampling only.
// node tools/resonance/pack.cjs soldier <atlas.png>
const { readFileSync, writeFileSync } = require('node:fs');
const assert = require('node:assert/strict');
const sharp = require('sharp');

const [kind, input] = process.argv.slice(2);
assert.ok(['soldier', 'archer'].includes(kind) && input, 'Expected soldier|archer and an atlas PNG');
const rows = ['idle', 'walk', 'attack', 'hurt', 'dead', kind === 'soldier' ? 'defend' : 'attack2'];
const id = kind === 'soldier' ? 'hero_soldier' : 'hero_samurai_archer';
const w = 192, h = 128;

(async () => {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(info.width, 1024);
  assert.equal(info.height, 1536);
  const pieces = [];
  // The archer's tall bow crosses the nominal horizontal grid. Use the actual
  // transparent gutters rather than cutting a bow tip or a boot at y = 256.
  const bands = kind === 'archer' ? [0, 271, 516, 773, 1023, 1245, 1536] : [0, 256, 512, 768, 1024, 1280, 1536];
  for (let row = 0; row < 6; row++) {
    const rowY = bands[row], rowH = bands[row + 1] - rowY;
    const labels = new Int32Array(1024 * rowH);
    const components = [];
    for (let y = 0; y < rowH; y++) for (let x = 0; x < 1024; x++) {
      const start = y * 1024 + x;
      if (labels[start] || data[((rowY + y) * 1024 + x) * 4 + 3] < 128) continue;
      const label = components.length + 1;
      const stack = [start];
      labels[start] = label;
      const c = { label, n: 0, x0: x, x1: x, y0: y, y1: y };
      while (stack.length) {
        const p = stack.pop(), px = p % 1024, py = Math.floor(p / 1024);
        c.n++;
        c.x0 = Math.min(c.x0, px); c.x1 = Math.max(c.x1, px);
        c.y0 = Math.min(c.y0, py); c.y1 = Math.max(c.y1, py);
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const nx = px + dx, ny = py + dy, np = ny * 1024 + nx;
          if (nx < 0 || nx >= 1024 || ny < 0 || ny >= rowH || labels[np]) continue;
          if (data[((rowY + ny) * 1024 + nx) * 4 + 3] < 128) continue;
          labels[np] = label; stack.push(np);
        }
      }
      components.push(c);
    }
    const owners = new Map();
    for (const c of components.filter(c => c.n >= 100)) {
      // A sword may extend into the next cell. Keep that connected figure whole;
      // only split two touching figures when a component spans almost two cells.
      owners.set(c.label, c.x1 - c.x0 > 400 ? -1 : Math.min(3, Math.floor((c.x0 + c.x1) / 512)));
    }
    for (let col = 0; col < 4; col++) {
      const raw = Buffer.alloc(1024 * rowH * 4);
      let x0 = 1024, y0 = rowH, x1 = -1, y1 = -1;
      for (let y = 0; y < rowH; y++) for (let x = 0; x < 1024; x++) {
        const owner = owners.get(labels[y * 1024 + x]);
        if (owner !== col && !(owner === -1 && Math.floor(x / 256) === col)) continue;
        const src = ((rowY + y) * 1024 + x) * 4, dst = (y * 1024 + x) * 4;
        data.copy(raw, dst, src, src + 3); raw[dst + 3] = 255;
        x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      }
      assert.ok(x1 > x0 && y1 > y0, `Empty ${rows[row]} ${col}`);
      const scale = kind === 'soldier' ? 96 / 219 : 0.4;
      const width = Math.round((x1 - x0 + 1) * scale), height = Math.round((y1 - y0 + 1) * scale);
      const left = Math.round(w / 2 + (x0 - (col * 256 + 128)) * scale);
      assert.ok(left >= 0 && left + width <= w && height <= h, `Clipped ${rows[row]} ${col}`);
      const buffer = await sharp(raw, { raw: { width: 1024, height: rowH, channels: 4 } })
        .extract({ left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 })
        .resize(width, height, { kernel: 'nearest' }).png().toBuffer();
      pieces.push({ input: buffer, left: col * w + left, top: row * h + h - height });
      console.log(rows[row], col, { source: [x0, y0, x1, y1], width, height, left });
    }
  }
  if (kind === 'soldier') {
    // The generated follow-through touched its neighbour's blade. Finish the
    // slash with intact lowered-blade and ready poses instead of a cut weapon.
    for (const [target, source] of [[10, 22], [11, 0]]) {
      pieces[target] = { ...pieces[source], left: (target % 4) * w + pieces[source].left % w, top: 2 * h + pieces[source].top % h };
    }
  }
  await sharp({ create: { width: w * 4, height: h * 6, channels: 4, background: '#00000000' } })
    .composite(pieces).png().toFile(`src/art/units/${id}.png`);
  const path = 'src/art/units/sheets.json';
  const layout = JSON.parse(readFileSync(path, 'utf8'));
  layout[id] = { w, h, perRow: 4, rows, counts: Object.fromEntries(rows.map(r => [r, 4])), figure: kind === 'soldier' ? 96 : 100, facesRight: true, lies: true };
  writeFileSync(path, JSON.stringify(layout, null, 1) + '\n');
})().catch(e => { console.error(e); process.exitCode = 1; });
