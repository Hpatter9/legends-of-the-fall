// Package generated artwork without painting pixels. Front/rear views share a
// scale and ground line; transparent padding is trimmed symmetrically as a pair.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const sharp = require('sharp');
const specs = require('./roster.json');
const selections = require('./pose-selection.json');
const extraClips = require('./extra-clips.json');
const selected = new Set(process.argv.slice(2));
const rows = ['idle', 'walk', '_walk', 'attack', 'hurt', 'dead', 'attack2'];
const out = 'src/art/awakened';
fs.mkdirSync(out, { recursive: true });
fs.mkdirSync('docs/samples/ascended-heroes/packing', { recursive: true });

async function pack(spec) {
  const input = `tools/ascended/source/${spec.id}.png`;
  if (!fs.existsSync(input)) return;
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const cw = info.width / 8, ch = info.height / 7;
  const seen = new Uint8Array(info.width * info.height);
  const groups = Array.from({ length: 56 }, () => []), warnings = [];
  // Assign complete connected components by centre, preserving weapons that
  // overhang a nominal gutter. Record touching actors for visual review.
  for (let start = 0; start < seen.length; start++) {
    if (seen[start] || data[start * 4 + 3] < 128) continue;
    const todo = [start], points = [];
    seen[start] = 1;
    let sx = 0, sy = 0, x0 = info.width, x1 = 0, y0 = info.height, y1 = 0;
    while (todo.length) {
      const at = todo.pop(), x = at % info.width, y = Math.floor(at / info.width);
      points.push(at); sx += x; sy += y;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy, next = ny * info.width + nx;
        if (nx < 0 || nx >= info.width || ny < 0 || ny >= info.height || seen[next] || data[next * 4 + 3] < 128) continue;
        seen[next] = 1; todo.push(next);
      }
    }
    if (points.length < 15) continue;
    const col = Math.min(7, Math.floor(sx / points.length / cw));
    const row = Math.min(6, Math.floor(sy / points.length / ch));
    if (x1 - x0 > cw * 1.65 || y1 - y0 > ch * 1.65) {
      warnings.push({ row, col, box: [x0, y0, x1, y1], issue: 'touching actors: inspect cell edges' });
      for (const p of points) groups[Math.min(6, Math.floor(Math.floor(p / info.width) / ch)) * 8 + Math.min(7, Math.floor(p % info.width / cw))].push(p);
    } else groups[row * 8 + col].push(...points);
  }
  for (const [target, source] of Object.entries(selections[spec.id] ?? {})) {
    assert.ok(groups[source]?.length > 150, `${spec.id}: missing selected pose ${source}`);
    groups[Number(target)] = groups[source];
  }
  const extra = extraClips[spec.id];
  // The supplementary sheet replaces incomplete source action rows, not their
  // missing pixels. A temporary group only lets idle/walk parsing proceed.
  if (extra) for (const slot of Object.keys(extra.mapping)) groups[Number(slot)] = groups[0];
  fs.writeFileSync(`docs/samples/ascended-heroes/packing/${spec.id}-groups.json`, JSON.stringify(groups.map((p, i) => ({ slot: i, pixels: p.length, box: p.length ? [Math.min(...p.map(v => v % info.width)), Math.min(...p.map(v => Math.floor(v / info.width))), Math.max(...p.map(v => v % info.width)), Math.max(...p.map(v => Math.floor(v / info.width)))] : null })), null, 1) + '\n');
  const frames = groups.map((points, i) => {
    assert.ok(points.length > 150, `${spec.id}: empty ${rows[Math.floor(i / 8)]} ${i % 8}`);
    let x0 = info.width, y0 = info.height, x1 = -1, y1 = -1;
    for (const p of points) { const x = p % info.width, y = Math.floor(p / info.width); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    const w = x1 - x0 + 1, h = y1 - y0 + 1, raw = Buffer.alloc(w * h * 4);
    for (const p of points) { const d = ((Math.floor(p / info.width) - y0) * w + p % info.width - x0) * 4; data.copy(raw, d, p * 4, p * 4 + 3); raw[d + 3] = 255; }
    return { raw, w, h, x0, y0, row: Math.floor(i / 8), col: i % 8 };
  });
  if (extra) {
    const { data: pixels, info: source } = await sharp(`tools/ascended/source/${extra.file}`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const clips = [];
    for (let i = 0; i < extra.columns * extra.rows; i++) {
      const left = Math.round(i % extra.columns * source.width / extra.columns), right = Math.round((i % extra.columns + 1) * source.width / extra.columns);
      const top = Math.round(Math.floor(i / extra.columns) * source.height / extra.rows), bottom = Math.round((Math.floor(i / extra.columns) + 1) * source.height / extra.rows);
      let x0 = right, y0 = bottom, x1 = -1, y1 = -1;
      for (let y = top; y < bottom; y++) for (let x = left; x < right; x++) if (pixels[(y * source.width + x) * 4 + 3] >= 128) {
        x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      }
      assert.ok(x1 > x0 && y1 > y0, `${spec.id}: empty supplementary pose ${i}`);
      const w = x1 - x0 + 1, h = y1 - y0 + 1, raw = Buffer.alloc(w * h * 4);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const src = ((y + y0) * source.width + x + x0) * 4, dst = (y * w + x) * 4;
        if (pixels[src + 3] < 128) continue;
        pixels.copy(raw, dst, src, src + 3); raw[dst + 3] = 255;
      }
      clips.push({ raw, w, h });
    }
    const normalise = Math.max(...frames.slice(0, 8).map(f => f.h)) / clips[extra.standing].h;
    for (const [target, index] of Object.entries(extra.mapping)) {
      const clip = clips[index], w = Math.round(clip.w * normalise), h = Math.round(clip.h * normalise);
      const raw = await sharp(clip.raw, { raw: { width: clip.w, height: clip.h, channels: 4 } }).resize(w, h, { kernel: 'nearest' }).raw().toBuffer();
      frames[Number(target)] = { ...frames[Number(target)], raw, w, h };
    }
  }
  const figure = spec.figure;
  // Menu illustrations use the same new equipment as the battle sprite. This
  // is an extracted idle pose, enlarged without smoothing or repainting.
  if (!spec.id.startsWith('treant') && spec.id !== 'werewolfBrute') {
    const f = frames[0];
    await sharp(f.raw, { raw: { width: f.w, height: f.h, channels: 4 } }).resize(f.w * 4, f.h * 4, { kernel: 'nearest' }).webp({ lossless: true }).toFile(`src/art/heroes/awakened-${spec.id}.webp`);
  }
  const scale = figure / Math.max(...frames.slice(0, 8).map(f => f.h));
  // Uniform scale across every pose and view; never squash an actor to fit.
  const w = Math.ceil(Math.max(...frames.map(f => f.w * scale)) / 2) * 2 + 8;
  const h = Math.ceil(Math.max(...frames.map(f => f.h * scale))) + 4;
  const names = [`awakened_${spec.id}`, `awakened_${spec.id}_back`], layouts = {};
  for (let facing = 0; facing < 2; facing++) {
    const pieces = [];
    for (const f of frames.filter(f => Math.floor(f.col / 4) === facing)) {
      const width = Math.max(1, Math.round(f.w * scale)), height = Math.max(1, Math.round(f.h * scale));
      const buffer = await sharp(f.raw, { raw: { width: f.w, height: f.h, channels: 4 } }).resize(width, height, { kernel: 'nearest' }).png().toBuffer();
      pieces.push({ input: buffer, left: f.col % 4 * w + Math.round((w - width) / 2), top: f.row * h + h - height });
    }
    await sharp({ create: { width: w * 4, height: h * 7, channels: 4, background: '#00000000' } }).composite(pieces).png().toFile(`${out}/${names[facing]}.png`);
    layouts[names[facing]] = { w, h, perRow: 4, rows, counts: { idle: 4, walk: 8, _walk: 0, attack: 4, hurt: 4, dead: 4, attack2: 4 }, figure, facesRight: true, lies: true, ...(facing ? { front: names[0] } : { rear: names[1] }) };
  }
  fs.writeFileSync(`docs/samples/ascended-heroes/packing/${spec.id}.json`, JSON.stringify({ id: spec.id, inputSize: [info.width, info.height], cell: [w, h], scale, warnings }, null, 2) + '\n');
  return { base: spec.base, sheet: names[0], layouts, warnings };
}

(async () => {
  const file = `${out}/manifest.json`;
  const manifest = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : { forms: {}, layouts: {} };
  for (const s of specs.filter(s => !selected.size || selected.has(s.id))) {
    try {
      const result = await pack(s);
      if (!result) continue;
      manifest.forms[result.base] = result.sheet;
      Object.assign(manifest.layouts, result.layouts);
      fs.writeFileSync(file, JSON.stringify(manifest, null, 1) + '\n');
      console.log(`${s.id}: packed 56 frames, ${result.warnings.length} warnings`);
    } catch (e) { console.error(e.message); process.exitCode = 1; }
  }
  const ids = Object.keys(manifest.layouts);
  fs.writeFileSync('src/render/awakenedArt.ts', '// Generated by tools/ascended/pack.cjs.\n' + ids.map((id, i) => `import art${i} from '../art/awakened/${id}.png';`).join('\n') + '\nexport const AWAKENED_URLS: Record<string, string> = {\n' + ids.map((id, i) => `  ${id}: art${i},`).join('\n') + '\n};\n');
})().catch(e => { console.error(e); process.exitCode = 1; });
