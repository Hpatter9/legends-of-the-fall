// Measures the page's mix: every music track and sting at its playing level, every cue, the king's spells, the ambience beds and a
// few whole fights (their sounds alone, by family, and over the battle track), all rendered by the page's own audio code in
// headless Chromium (`probe.ts`) and metered in LUFS (BS.1770) with peaks. Prints the tables `docs/notes/audio-mix.md` holds.
//
//   npm run web && node tools/audio-mix/measure.mjs [port] [--json out.json] [--only music,cues,spells,beds,fights]
import * as esbuild from 'esbuild';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');

const args = process.argv.slice(2);
const port = +(args.find((a) => /^\d+$/.test(a)) ?? 8790);
const jsonAt = args.includes('--json') ? args[args.indexOf('--json') + 1] : null;
const only = args.includes('--only') ? new Set(args[args.indexOf('--only') + 1].split(',')) : null;
const want = (k) => !only || only.has(k);
if (!existsSync('out/web/audio')) throw new Error('build the page first: npm run web');

mkdirSync('out/audio-mix', { recursive: true });
await esbuild.build({ entryPoints: ['tools/audio-mix/probe.ts'], outfile: 'out/audio-mix/probe.js', bundle: true, format: 'iife', platform: 'browser', target: 'es2022', loader: { '.png': 'dataurl', '.webp': 'dataurl' }, logLevel: 'warning' });
writeFileSync('out/audio-mix/probe.html', '<!doctype html><meta charset="utf-8"><title>mix</title><script src="probe.js"></script>');

const types = { html: 'text/html', js: 'text/javascript', opus: 'audio/ogg' };
const srv = createServer((q, r) => {
  const u = q.url.split('?')[0].slice(1);
  const p = u.startsWith('probe') ? `out/audio-mix/${u}` : `out/web/${u}`;
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(port);

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage();
page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
await page.goto(`http://localhost:${port}/probe.html`);
await page.waitForFunction(() => window.__mix);
const run = (fn, ...a) => page.evaluate(([fn, a]) => window.__mix[fn](...a), [fn, a]);

const f = (x) => (Number.isFinite(x) ? x.toFixed(1) : '-');
const row = (name, m, extra = '') => `| ${name} | ${f(m.lufs)} | ${f(m.mMax)} | ${f(m.peak)} | ${(m.overLimit * 100).toFixed(1)} |${extra}`;
const HEAD = '| | integrated LUFS | momentary max | peak dBFS | % over limiter |\n|---|---|---|---|---|';
const out = { gains: await run('gains') };

if (want('music')) {
  const TRACKS = ['camp', 'tavern', 'deploy', 'tower', 'calmap', 'battle', 'boss', 'triumph', 'opening', 'gorvak', 'herald2', 'herald3', 'herald4', 'herald5', 'herald6', 'comic', 'solemn', 'spire'];
  out.music = {};
  console.log('\n## Music (at its playing level)\n' + HEAD);
  for (const id of TRACKS) {
    const m = await run('music', id, 1);
    out.music[id] = m;
    console.log(row(id, m));
  }
  const bed = await run('music', 'triumph', await page.evaluate(() => window.__mix.VICTORY_BED));
  out.music.triumphBed = bed;
  console.log(row('triumph (as the victory bed)', bed));
  for (const id of ['victory', 'defeat']) {
    const m = await run('sting', id);
    out.music[id] = m;
    console.log(row(`${id} sting`, m));
  }
}
if (want('cues')) {
  const cues = await run('allCues');
  out.cues = cues;
  console.log('\n## Cues (each once, at its mixing gain)\n' + HEAD);
  for (const [k, m] of Object.entries(cues)) console.log(row(k, m));
}
if (want('spells')) {
  const sp = await run('spells');
  out.spells = sp;
  console.log("\n## The king's spells (cast and effect)\n" + HEAD);
  for (const [k, m] of Object.entries(sp)) console.log(row(k, m));
}
if (want('beds')) {
  out.beds = {};
  console.log('\n## Ambience beds\n' + HEAD);
  for (const s of ['camp', 'tavern', 'field', 'tower1', 'tower3']) {
    try {
      const m = await run('bed', s);
      out.beds[s] = m;
      console.log(row(s, m));
    } catch (e) {
      console.log(`| ${s} | (${e.message}) |`);
    }
  }
}
if (want('fights')) {
  out.fights = {};
  const FIGHTS = [
    [7, 'skeletons', ['knight', 'samurai', 'kunoichi', 'archer', 'wizard'], 'battle'],
    [11, 'orcs', ['paladin', 'cleric', 'ranger', 'barbarian', 'lightningMage'], 'battle'],
    [3, 'ogres', ['knight', 'samurai', 'ninjaMonk', 'archer', 'warlock'], 'battle'],
    [5, 'demonLord', ['knight', 'samurai', 'kunoichi', 'archer', 'wizard'], 'boss'],
  ];
  for (const [seed, band, heroes, track] of FIGHTS) {
    const r = await run('fightMix', seed, band, heroes, track);
    const name = `${band} (seed ${seed}, ${r.seconds} s, ${r.cues} cues, over ${track})`;
    out.fights[name] = r;
    console.log(`\n## Fight: ${name}\n` + HEAD);
    for (const k of ['all', 'hits', 'shots', 'skills', 'deaths', 'musicAlone', 'withMusic']) if (r[k]) console.log(row(k, r[k]));
  }
}
if (jsonAt) writeFileSync(jsonAt, JSON.stringify(out, null, 1));
await browser.close();
srv.close();
