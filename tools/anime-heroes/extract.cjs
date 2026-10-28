// Split generated three-panel production atlases into individual hero assets.
const fs = require('node:fs');
const sharp = require('sharp');

// Like the battle atlases, a long weapon can cross a nominal cell gutter.
// Assign whole transparent components before packing, so neighbouring fragments
// stay with their owner rather than appearing on another hero's card.
async function cutouts(input, ids) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const labels = new Int32Array(info.width * info.height), parts = [];
  for (let start = 0; start < labels.length; start++) {
    if (labels[start] || data[start * 4 + 3] < 64) continue;
    const label = parts.length + 1, stack = [start], pixels = [];
    let sx = 0;
    labels[start] = label;
    while (stack.length) {
      const p = stack.pop(), x = p % info.width, y = Math.floor(p / info.width);
      pixels.push(p); sx += x;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy, next = ny * info.width + nx;
        if (nx < 0 || nx >= info.width || ny < 0 || ny >= info.height || labels[next] || data[next * 4 + 3] < 64) continue;
        labels[next] = label; stack.push(next);
      }
    }
    parts.push({ label, pixels, col: Math.min(2, Math.floor(sx / pixels.length / (info.width / 3))) });
  }
  const assigned = parts.flatMap(part => {
    let x0 = info.width, x1 = 0;
    for (const p of part.pixels) { x0 = Math.min(x0, p % info.width); x1 = Math.max(x1, p % info.width); }
    if (x1 - x0 <= info.width / 3 * 1.35 || part.pixels.length < 25000) return [part];
    // Touching paintings cannot be assigned as one actor. Keep their original
    // cell division, as for touching action poses in the animation atlases.
    const cells = [[], [], []];
    for (const p of part.pixels) cells[Math.min(2, Math.floor((p % info.width) / (info.width / 3)))].push(p);
    return cells.map((pixels, col) => ({ pixels, col }));
  });
  for (let col = 0; col < 3; col++) {
    const candidates = assigned.filter(p => p.col === col);
    const largest = Math.max(...candidates.map(p => p.pixels.length));
    const selected = candidates.filter(p => p.pixels.length >= Math.max(50, largest * .03));
    if (!selected.some(p => p.pixels.length > 5000)) throw new Error(`Missing cutout: ${ids[col]}`);
    const output = Buffer.alloc(data.length), mask = new Uint8Array(labels.length);
    let left = info.width, right = 0, top = info.height, bottom = 0;
    for (const part of selected) for (const p of part.pixels) {
      const x = p % info.width, y = Math.floor(p / info.width);
      left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
      // Preserve the source's antialiased outline around each selected piece.
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && nx < info.width && ny >= 0 && ny < info.height) mask[ny * info.width + nx] = 1;
      }
    }
    for (let p = 0; p < mask.length; p++) if (mask[p]) data.copy(output, p * 4, p * 4, p * 4 + 4);
    left = Math.max(0, left - 3); top = Math.max(0, top - 3);
    right = Math.min(info.width - 1, right + 3); bottom = Math.min(info.height - 1, bottom + 3);
    await sharp(output, { raw: { width: info.width, height: info.height, channels: 4 } })
      .extract({ left, top, width: right - left + 1, height: bottom - top + 1 })
      .resize(480, 992, { fit: 'contain', background: '#00000000' })
      .extend({ top: 16, bottom: 16, left: 16, right: 16, background: '#00000000' })
      .png().toFile(`tools/anime-heroes/source/${ids[col]}.png`);
  }
}
(async () => {
  for (const folder of ['scenes', 'source']) {
    const root = `tools/anime-heroes/${folder}`;
    for (const name of fs.readdirSync(root).filter(n => /^atlas-.*\.png$/.test(n))) {
      const ids = name.slice(6, -4).split('-');
      if (ids.length !== 3) throw new Error(`Expected three heroes: ${name}`);
      const input = `${root}/${name}`, metadata = await sharp(input).metadata();
      if (folder === 'source') { await cutouts(input, ids); console.log(folder, ids.join(', ')); continue; }
      for (let i = 0; i < ids.length; i++) {
        const left = Math.round(i * metadata.width / 3), right = Math.round((i + 1) * metadata.width / 3);
        await sharp(input).extract({ left, top: 0, width: right - left, height: metadata.height }).png().toFile(`${root}/${ids[i]}.png`);
      }
      console.log(folder, ids.join(', '));
    }
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
