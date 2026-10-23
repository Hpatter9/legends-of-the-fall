// Screenshots for the lands pass: every land's deploy view, and a few weathers, at the upright phone sizes:
//   node tools/map-lands/shots.mjs <web dir> <out dir>
// Writes <out dir>/land-<land>-<w>x<h>.png and weather-<weather>-<land>-<w>x<h>.png (needs Playwright, as the other shot scripts);
// tools/map-lands/sheet.py lays them out into the contact sheets in docs/samples.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const [root = 'out/web', out = 'out/shots'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', ogg: 'audio/ogg', css: 'text/css' };
const srv = createServer((q, r) => {
  const p = `${root}/` + (q.url.split('?')[0].slice(1) || 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(8134);
const LANDS = ['highlands', 'forest', 'snow', 'desert', 'volcano', 'dungeon', 'plains', 'autumn', 'swamp', 'graveyard', 'ruins', 'temple', 'crystal', 'forge', 'shrine', 'warcamp', 'oasis'];
const WEATHERS = [['rain', 'plains'], ['snow', 'snow'], ['fog', 'swamp'], ['leaves', 'autumn'], ['embers', 'forge'], ['ash', 'volcano'], ['night', 'shrine'], ['night', 'warcamp']];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let errors = 0;
for (const [w, h] of [[393, 852], [360, 780], [412, 915]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => { errors++; console.log('PAGE ERROR', e.message); });
  page.on('console', (m) => { if (m.type() === 'error') { errors++; console.log('CONSOLE ERROR', m.text()); } });
  await page.goto('http://localhost:8134/?x=' + Math.random());
  await page.evaluate(() => localStorage.clear());
  // (an address with a seed is a test page: the first starter pack, no cinematic)
  await page.goto('http://localhost:8134/?seed=7');
  await page.waitForFunction(() => window.__game, null, { timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => { for (const b of document.querySelectorAll('#tip button')) if (b.id === 'tipSkip') b.click(); });
  const start = (area, weather) => page.evaluate(([area, weather]) => {
    const g = window.__game;
    const r = JSON.parse(JSON.stringify(g.run));
    Object.assign(r, { mode: { kind: 'run' }, stage: 3, area, over: false, cleared: false, gold: 500, event: undefined });
    document.getElementById('home').hidden = true;
    g.startRun(r);
    for (let k = 0; k < 4; k++) document.getElementById('summon').click();
    document.getElementById('auto').click();
    if (weather) g.previewWeather(weather);
  }, [area, weather]);
  for (const land of LANDS) {
    await start(land, 'clear');
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${out}/land-${land}-${w}x${h}.png` });
  }
  for (const [weather, land] of WEATHERS) {
    await start(land, weather);
    await page.waitForTimeout(1600);
    await page.screenshot({ path: `${out}/weather-${weather}-${land}-${w}x${h}.png` });
  }
  await ctx.close();
}
console.log('page errors:', errors);
await browser.close();
srv.close();
