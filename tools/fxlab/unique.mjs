// Plays every hero's skill and ultimate in turn on the real page and saves a frame strip of each:
//   node tools/fxlab/unique.mjs [hero,hero | all] [--no-build]       (PORT; ONLY=skill|ult)
// Strips go to docs/samples/unique-spells/<hero>-skill.png and <hero>-ult.png, and two contact sheets (skills.png, ults.png)
// show the peak frame of each side by side. The fight is stepped by hand (the lab's `advance`), so frames land on the moment asked for.
import * as esbuild from 'esbuild';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');

await esbuild.build({ entryPoints: ['tools/fxlab/lab.ts'], outfile: 'out/lab.js', bundle: true, format: 'iife', platform: 'browser', target: 'es2022', logLevel: 'warning' });
const root = 'out/web';
const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json' };
const srv = createServer((q, r) => {
  const p = `${root}/` + (q.url.split('?')[0].slice(1) || 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(Number(process.env.PORT ?? 8127));
const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });

// the heroes and their skill and ultimate names, written by the audit (tools/fxlab/heroes.json)
const HEROES = JSON.parse(readFileSync('tools/fxlab/heroes.json', 'utf8'));
const arg = process.argv[2];
const ids = !arg || arg.startsWith('--') || arg === 'all' ? Object.keys(HEROES) : arg.split(',');
const kinds = process.env.ONLY ? [process.env.ONLY] : ['skill', 'ult'];
const FRAMES = 8, STEP = 110, W = 393, H = 852, CROP = { x: 0, y: 150, width: W, height: 560 };
mkdirSync('docs/samples/unique-spells', { recursive: true });
mkdirSync('out/uniqueframes', { recursive: true });

const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
let errors = 0;
page.on('pageerror', (e) => { errors++; console.log('PAGE ERROR', e.message.split('\n')[0]); });
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE', m.text().slice(0, 200)); });
await page.goto('http://localhost:' + (process.env.PORT ?? 8127) + '/?seed=7');
await page.waitForFunction(() => window.__game, null, { timeout: 30000 });
await page.addScriptTag({ path: 'out/lab.js' });
await page.waitForTimeout(800);

for (const id of ids) {
  for (const kind of kinds) {
    const info = HEROES[id];
    if (!info || (kind === 'ult' && !info.ult)) continue;
    const name = kind === 'ult' ? info.ult : info.skill;
    const allies = info.heal ? ['knight', 'samurai', 'archer'] : ['knight', 'samurai'];
    try {
      await page.evaluate((s) => { window.__lab.setup(s); window.__lab.speed(0); }, { heroes: [id, ...allies.filter((a) => a !== id)], band: 'orcs', charge: kind, level: 40, wound: info.heal ? 0.4 : undefined, seed: 7 });
      await page.waitForTimeout(250);
      await page.evaluate(() => window.__lab.go());
      let found = false;
      for (let k = 0; k < 400 && !found; k++) found = (await page.evaluate(() => window.__lab.advance(100))).some((e) => e[1] === 'skill' && e[2] === name);
      if (!found) { console.log('  never cast:', id, kind, name); continue; }
      await page.evaluate(() => window.__lab.pin());
      await page.evaluate(() => window.__lab.advance(200));
      const files = [];
      for (let i = 0; i < FRAMES; i++) {
        await page.evaluate(([z, id]) => window.__lab.lookBetween(z, id), [1.7, id]);
        await page.waitForTimeout(40);
        const f = `out/uniqueframes/${id}-${kind}-${i}.png`;
        writeFileSync(f, await page.screenshot({ clip: CROP }));
        files.push(f);
        await page.evaluate((ms) => window.__lab.advance(ms), STEP);
      }
      execFileSync('python3', ['-I', 'tools/fxlab/strip.py', `docs/samples/unique-spells/${id}-${kind}.png`, ...files]);
      console.log('ok', id, kind, name);
    } catch (e) { console.log('FAILED', id, kind, e.message.split('\n')[0]); }
  }
}
console.log('page errors:', errors);
await browser.close(); srv.close();
