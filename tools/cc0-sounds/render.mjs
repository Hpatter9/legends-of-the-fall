// CC0-SOUNDS: cuts every take in `sources.mjs` from the packs fetch.mjs downloaded, and writes the game's files and their manifest.
//
// 1. Cut: each source is decoded to mono 48 kHz (ffmpeg), its leading and trailing silence cut, started `at` seconds in, re-pitched by
//    `rate`, filtered (`hp`, `lp`), kept to `dur` seconds, given a 4 ms fade in and a fade out over its last fifth, laid with the other
//    layers of a composite take, and brought to a peak of -1 dBFS. It is encoded as mono Opus (32 kbps) to src/sfx/cues/<cue>-<n>.opus.
// 2. Level: in headless Chromium (`probe.ts`), each cue's synthesised voice and each new file are played through the same path at gain
//    1 and metered (the loudest 400 ms, LUFS). A file's `gain` makes it as loud as the synth it replaces, so the measured mix
//    (`CUES` gains, docs/notes/audio-mix.md) holds, and with it the fight's level against the music.
// 3. src/render/cueSampleManifest.ts: every file's cue, length, size and gain.
//
//   NODE_USE_ENV_PROXY=1 node tools/cc0-sounds/fetch.mjs && node tools/cc0-sounds/render.mjs [cue ...]
import * as esbuild from 'esbuild';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { TAKES } from './sources.mjs';
import { CACHE, singleOf } from './fetch.mjs';

const RATE = 48000;
const OUT = 'src/sfx/cues';
const only = new Set(process.argv.slice(2).filter((a) => !a.startsWith('-')));

/** A source decoded to mono 48 kHz floats. */
function decode(path, filters) {
  const af = ['aformat=channel_layouts=mono', `aresample=${RATE}`, ...filters].join(',');
  const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', path, '-af', af, '-f', 'f32le', '-ac', '1', '-ar', `${RATE}`, '-'], { maxBuffer: 1 << 28 });
  return new Float32Array(raw.buffer, raw.byteOffset, raw.length / 4);
}

/** Where a sample first and last passes -50 dB of the source's peak. */
function bounds(x) {
  let peak = 0;
  for (const v of x) peak = Math.max(peak, Math.abs(v));
  const thr = peak * 10 ** (-50 / 20);
  let a = 0, b = x.length - 1;
  while (a < b && Math.abs(x[a]) < thr) a++;
  while (b > a && Math.abs(x[b]) < thr) b--;
  return [a, b + 1];
}

/** One layer, cut as its options say. */
function cut(l) {
  const path = l.path ? `${CACHE}/${l.pack}/${l.path}` : singleOf(l.pack);
  const filters = [];
  if (l.rate) filters.push(`asetrate=${Math.round(RATE * l.rate)}`, `aresample=${RATE}`);
  if (l.hp) filters.push(`highpass=f=${l.hp}`);
  if (l.lp) filters.push(`lowpass=f=${l.lp}`);
  const x = decode(path, filters);
  const [a0, b] = bounds(x);
  const a = Math.min(b, a0 + Math.round((l.at ?? 0) * RATE));
  const len = Math.min(b - a, l.dur ? Math.round(l.dur * RATE) : Infinity);
  const y = x.slice(a, a + len);
  const fin = Math.min(y.length, Math.round(0.004 * RATE));
  for (let i = 0; i < fin; i++) y[i] *= i / fin;
  const fout = Math.round(y.length * 0.2);
  for (let i = 0; i < fout; i++) y[y.length - 1 - i] *= (i / fout) ** 1.5;
  return y;
}

/** A take (one cut, or several laid together), at a peak of -1 dBFS. */
function take(tk) {
  const layers = tk.mix ?? [{ ...tk, start: 0 }];
  const parts = layers.map((l) => ({ at: Math.round((l.start ?? 0) * RATE), x: cut(l) }));
  const y = new Float32Array(Math.max(...parts.map((p) => p.at + p.x.length)));
  for (const p of parts) for (let i = 0; i < p.x.length; i++) y[p.at + i] += p.x[i];
  let peak = 0;
  for (const v of y) peak = Math.max(peak, Math.abs(v));
  const g = 10 ** (-1 / 20) / Math.max(1e-6, peak);
  for (let i = 0; i < y.length; i++) y[i] *= g;
  return y;
}

function encode(y, file) {
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'f32le', '-ar', `${RATE}`, '-ac', '1', '-i', '-', '-c:a', 'libopus', '-b:a', '32k', '-application', 'audio',
    '-map_metadata', '-1', file], { input: Buffer.from(y.buffer, y.byteOffset, y.byteLength) });
}

// 1. cut and encode
mkdirSync(OUT, { recursive: true });
const want = Object.keys(TAKES).filter((c) => !only.size || only.has(c));
if (!only.size) for (const f of readdirSync(OUT)) rmSync(`${OUT}/${f}`);
for (const cue of want) {
  TAKES[cue].forEach((tk, i) => encode(take(tk), `${OUT}/${cue}-${i + 1}.opus`));
}

// 2. level, in Chromium
mkdirSync('out/cc0-sounds', { recursive: true });
await esbuild.build({ entryPoints: ['tools/cc0-sounds/probe.ts'], outfile: 'out/cc0-sounds/probe.js', bundle: true, format: 'iife', platform: 'browser', target: 'es2022',
  loader: { '.png': 'dataurl', '.webp': 'dataurl', '.jpg': 'dataurl', '.json': 'json' }, logLevel: 'warning' });
writeFileSync('out/cc0-sounds/probe.html', '<!doctype html><meta charset="utf-8"><title>cc0</title><script src="probe.js"></script>');
const srv = createServer((q, r) => {
  const u = decodeURIComponent(q.url.split('?')[0].slice(1));
  const p = u.startsWith('cues/') ? `${OUT}/${u.slice(5)}` : `out/cc0-sounds/${u}`;
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': p.endsWith('.js') ? 'text/javascript' : p.endsWith('.html') ? 'text/html' : 'audio/ogg' });
  r.end(readFileSync(p));
}).listen(8793);
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
await page.goto('http://localhost:8793/probe.html');
await page.waitForFunction(() => window.__cc0);

const old = existsSync('src/render/cueSampleManifest.ts') ? readFileSync('src/render/cueSampleManifest.ts', 'utf8') : '';
const prior = JSON.parse(old.match(/\/\* data \*\/ ([\s\S]*?) \/\* end \*\//)?.[1] ?? '{}');
const manifest = {};
const rows = [];
for (const cue of Object.keys(TAKES)) {
  if (!want.includes(cue)) { if (prior[cue]) manifest[cue] = prior[cue]; continue; }
  const s = await page.evaluate((n) => window.__cc0.synth(n), cue);
  manifest[cue] = [];
  for (let i = 1; i <= TAKES[cue].length; i++) {
    const file = `${cue}-${i}`;
    const m = await page.evaluate((u) => window.__cc0.sample(u), `cues/${file}.opus`);
    // (as loud as the synth by the meter, but a peak held under +3 dB at gain 1: the master's limiter catches the rest)
    let db = s.mMax - m.mMax;
    db = Math.min(db, 3 - m.peak);
    const gain = +(10 ** (db / 20)).toFixed(3);
    const bytes = statSync(`${OUT}/${file}.opus`).size;
    manifest[cue].push({ file, seconds: +m.seconds.toFixed(3), bytes, gain });
    rows.push(`${file}\t${m.seconds.toFixed(2)} s\t${bytes} B\tsynth ${s.mMax.toFixed(1)}\tfile ${m.mMax.toFixed(1)}\tgain ${gain}`);
  }
}
await browser.close();
srv.close();
console.log(rows.join('\n'));

// 3. the manifest
const total = Object.values(manifest).flat().reduce((n, f) => n + f.bytes, 0);
writeFileSync('src/render/cueSampleManifest.ts', `// Written by tools/cc0-sounds/render.mjs: do not edit. Every recorded cue's files (src/sfx/cues/<file>.opus, served as
// sfx/cues/<file>.opus), each one's length in seconds, its size in bytes and the gain that makes it as loud as the synth it replaces.
// ${Object.values(manifest).flat().length} files, ${(total / 1024).toFixed(0)} KB. The sources and their licences: tools/cc0-sounds/sources.mjs, CREDITS.md.

export interface CueSampleFile {
  file: string;
  seconds: number;
  bytes: number;
  gain: number;
}

export const CUE_SAMPLE_FILES = /* data */ ${JSON.stringify(manifest)} /* end */ as const satisfies Record<string, readonly CueSampleFile[]>;
`);
console.log(`${Object.values(manifest).flat().length} files, ${(total / 1024).toFixed(1)} KB`);
