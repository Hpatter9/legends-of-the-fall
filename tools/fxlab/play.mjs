// Plays fights on the real page with every hero's skill and ultimate charged and reports page errors and the frame time:
//   node tools/fxlab/play.mjs     (after `npm run web`; PORT)
import * as esbuild from 'esbuild';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
await esbuild.build({ entryPoints: ['tools/fxlab/lab.ts'], outfile: 'out/lab.js', bundle: true, format: 'iife', platform: 'browser', target: 'es2022', logLevel: 'warning' });
const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json' };
const srv = createServer((q, r) => {
  const p = 'out/web/' + (q.url.split('?')[0].slice(1) || 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(Number(process.env.PORT ?? 8128));
const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const heroes = Object.keys(JSON.parse(readFileSync('tools/fxlab/heroes.json', 'utf8')));
const page = await (await browser.newContext({ viewport: { width: 393, height: 852 } })).newPage();
let errors = 0;
page.on('pageerror', (e) => { errors++; console.log('PAGE ERROR', e.message.split('\n')[0]); });
page.on('console', (m) => { if (m.type() === 'error') { errors++; console.log('CONSOLE', m.text().slice(0, 200)); } });
await page.goto('http://localhost:' + (process.env.PORT ?? 8128) + '/?seed=7');
await page.waitForFunction(() => window.__game, null, { timeout: 30000 });
await page.addScriptTag({ path: 'out/lab.js' });
await page.waitForTimeout(800);
// nine fights of five heroes (the whole roster, charged and levelled so the ultimates go) against mixed bands, run for 40 s of fight time each
const bands = ['orcs', 'skeletons', 'werewolves', 'mixed', 'minotaurs'];
for (let i = 0; i < heroes.length; i += 5) {
  const team = heroes.slice(i, i + 5);
  await page.evaluate((s) => { window.__lab.setup(s); window.__lab.speed(0); }, { heroes: team, band: bands[(i / 5) % bands.length], charged: true, level: 40, power: 0.5, seed: 7 + i });
  await page.waitForTimeout(150);
  await page.evaluate(() => window.__lab.go());
  const seen = new Set();
  for (let k = 0; k < 400; k++) {
    const ev = await page.evaluate(() => window.__lab.advance(100));
    ev.filter((e) => e[1] === 'skill').forEach((e) => seen.add(e[2]));
    if (k % 20 === 0) await page.evaluate((id) => window.__lab.look(1.6), 0);
  }
  console.log('fight', i / 5 + 1, team.join(','), '->', [...seen].join(', '));
}
// the frame time of a busy fight at real speed
await page.evaluate(() => { window.__lab.setup({ heroes: ['wizard', 'yamabushi', 'kitsune', 'cleric', 'juggernaut'], band: 'mixed', charged: true, level: 40, power: 0.3 }); window.__lab.speed(1); window.__lab.look(1.6); });
await page.evaluate(() => window.__lab.go());
console.log('frames', JSON.stringify(await page.evaluate(() => window.__lab.frames(6000))));
console.log('page errors:', errors);
await browser.close(); srv.close();
