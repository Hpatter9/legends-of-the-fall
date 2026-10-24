// Renders the epic music: `node tools/epic-music/render.mjs [id ...]` writes WAVs to a scratch folder and encodes the
// tracks to Opus in src/audio/. Each file holds one loop plus a second of its own start again, so the page can loop a
// window of it without caring how a decoder trims the ends. `--wav` skips the encode; `--out DIR` sets the scratch folder.

import { mkdirSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { SR } from './dsp.mjs';
import { stats } from './song.mjs';

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const optIdx = args.indexOf('--out');
const scratch = optIdx >= 0 ? args[optIdx + 1] : '/tmp/epic-music';
const ids = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--out');
const root = new URL('../../', import.meta.url).pathname;
mkdirSync(scratch, { recursive: true });
mkdirSync(`${root}src/audio`, { recursive: true });

const files = readdirSync(new URL('./tracks/', import.meta.url)).filter((f) => f.endsWith('.mjs') && !f.startsWith('_')).map((f) => f.replace('.mjs', ''));
const want = ids.length ? ids : files;

function wav(L, R, n, pad) {
  const total = n + pad;
  const buf = Buffer.alloc(44 + total * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + total * 4, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28);
  buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(total * 4, 40);
  for (let i = 0; i < total; i++) {
    const j = i % n;
    buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(L[j] * 32767))), 44 + i * 4);
    buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(R[j] * 32767))), 46 + i * 4);
  }
  return buf;
}

const manifest = {};
for (const id of want) {
  const t0 = Date.now();
  const mod = await import(`./tracks/${id}.mjs`);
  const song = mod.default();
  // (`--encode-only` re-encodes the WAVs a last run left in the scratch folder, for a change of bitrate)
  if (flag('--encode-only')) {
    const kbps = song.kbps ?? 37;
    execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', `${scratch}/${id}.wav`, '-c:a', 'libopus', '-b:a', `${kbps}k`, '-vbr', 'constrained', '-application', 'audio', '-compression_level', '10', `${root}src/audio/${id}.opus`]);
    const bytes = statSync(`${root}src/audio/${id}.opus`).size;
    console.log(`${id}: ${(bytes / 1024).toFixed(0)} KB at ${kbps} kbps`);
    manifest[id] = { loop: song.loop, seconds: +song.loopSeconds.toFixed(4) + (song.loop ? 0 : song.tail), bytes };
    continue;
  }
  const { L, R, N } = song.render();
  const st = stats(L, R);
  const rev = song.review();
  // (the seam: the step across the loop's join against the steps either side of it)
  let dsum = 0;
  for (let k = 1; k < 400; k++) dsum += (L[k] - L[k - 1]) ** 2 + (L[N - k] - L[N - k - 1]) ** 2;
  const seam = Math.abs(L[0] - L[N - 1]) / Math.sqrt(dsum / 798);
  const pad = song.loop ? SR : 0;
  writeFileSync(`${scratch}/${id}.wav`, wav(L, R, N, pad));
  let bytes = 0;
  if (!flag('--wav')) {
    const kbps = song.kbps ?? 37;
    execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', `${scratch}/${id}.wav`, '-c:a', 'libopus', '-b:a', `${kbps}k`, '-vbr', 'constrained', '-application', 'audio', '-compression_level', '10', `${root}src/audio/${id}.opus`]);
    bytes = statSync(`${root}src/audio/${id}.opus`).size;
  }
  console.log(`${id}: ${(N / SR).toFixed(1)}s ${song.bpm}bpm rms ${st.rmsDb} peak ${st.peakDb} crest ${st.crest} bands[62..8k] ${st.bands} seam ${seam.toFixed(2)} · melody on chord tones ${(rev.share * 100).toFixed(0)}% · ${bytes ? (bytes / 1024).toFixed(0) + ' KB' : 'wav only'} · ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  for (const o of rev.odd.slice(0, 12)) console.log(`   ${o}`);
  manifest[id] = { loop: song.loop, seconds: +(N / SR).toFixed(4), bytes };
}
writeFileSync(`${scratch}/last-render.json`, JSON.stringify(manifest, null, 1));
