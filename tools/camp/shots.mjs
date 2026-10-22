// Serves out/web and takes the war camp's samples on upright phones: node tools/camp/shots.mjs <before|after>   (PORT; DPR default 2)
// Pictures go to docs/samples/camp-<tag>-<size>.png (the Battle tab at rest, with a hero sheet open, and a few seconds on).
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const root = 'out/web';
const tag = process.argv[2] ?? 'after';
const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', ogg: 'audio/ogg' };
const srv = createServer((q, r) => {
  const p = `${root}/` + (q.url.split('?')[0].slice(1) || 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(Number(process.env.PORT ?? 8131));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const HEROES = ['knight', 'samurai', 'kunoichi', 'archer', 'wizard'];
const DPR = Number(process.env.DPR ?? 2);
const SIZES = { '393x852': { width: 393, height: 852 }, '360x780': { width: 360, height: 780 }, '412x915': { width: 412, height: 915 } };
mkdirSync('docs/samples', { recursive: true });
const meta = { seed: 7, crowns: 300, unlocked: HEROES, party: HEROES, pulls: 0, dry: 0, dryMythic: 0, castle: { treasury: 0, barracks: 0, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp: {}, bestStage: 3, tower: 0, daily: {}, bosses: [], achievements: [], armies: {} };
for (const [size, vp] of Object.entries(SIZES)) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: DPR, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
  page.on('console', (m) => m.type() === 'error' && console.log('console error', m.text()));
  await page.addInitScript(([m]) => { try { localStorage.setItem('legends.meta', JSON.stringify(m)); localStorage.setItem('legends.tips', JSON.stringify(['home','deploy','fight','mana','skill','summon','crowns'])); } catch {} }, [meta]);
  await page.goto(`http://localhost:${srv.address().port}/`);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `docs/samples/camp-${tag}-${size}.png` });
  if (process.env.EXTRA) {
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `docs/samples/camp-${tag}-${size}-later.png` });
  }
  console.log(size, await page.evaluate(() => { const r = document.getElementById('hmPages').getBoundingClientRect(); return [r.width, r.height]; }));
  await ctx.close();
}
await browser.close();
srv.close();
