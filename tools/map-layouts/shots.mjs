// Screenshots for the map-layouts pass, at the upright phone sizes:
//   node tools/map-layouts/shots.mjs <web dir> [prefix]
// Writes docs/samples/<prefix>-<scene>-<w>x<h>.png (prefix defaults to map-layouts). For each size: a board of each layout (found by
// scanning stages), then a fight on the first one played to its end with page errors counted. Needs Playwright, as the other shot scripts.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const [root = 'out/web', prefix = 'map-layouts'] = process.argv.slice(2);
const only = process.env.LAYOUTS ? process.env.LAYOUTS.split(',') : ['river', 'hill', 'pass', 'fort', 'islands', 'ring', 'plateaus', 'plain'];
const sizes = process.env.SIZES ? process.env.SIZES.split(',').map((s) => s.split('x').map(Number)) : [[393, 852], [360, 780], [412, 915]];
const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', ogg: 'audio/ogg', css: 'text/css' };
const srv = createServer((q, r) => {
  const p = `${root}/` + (q.url.split('?')[0].slice(1) || 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(8134);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let errors = 0;
for (const [w, h] of sizes) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => { errors++; console.log('PAGE ERROR', e.message); });
  const shot = (name) => page.screenshot({ path: `docs/samples/${prefix}-${name}-${w}x${h}.png` });
  await page.goto('http://localhost:8134/?x=' + Math.random());
  await page.evaluate(() => localStorage.clear());
  await page.goto('http://localhost:8134/');
  await page.waitForTimeout(2200);
  await page.waitForSelector('.stPack', { timeout: 30000 });
  await page.click('.stPack:nth-child(2)');
  await page.click('.stGo');
  await page.getByText('Skip', { exact: true }).click({ timeout: 15000 }).catch(() => {});
  await page.waitForFunction(() => window.__game, null, { timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => { for (const b of document.querySelectorAll('#tip button')) if (b.id === 'tipSkip') b.click(); });
  const found = {};
  for (const id of only) {
    const stage = await page.evaluate((want) => {
      const g = window.__game;
      for (let stage = 1; stage <= 150; stage++) {
        const r = JSON.parse(JSON.stringify(g.run));
        Object.assign(r, { mode: { kind: 'run' }, stage, over: false, cleared: false, gold: 500, event: undefined });
        document.getElementById('home').hidden = true;
        g.startRun(r);
        if (g.b.board.layout === want && document.getElementById('bossBar').hidden && !g.b.units.some((u) => u.side === 'foe' && u.size)) {
          for (let k = 0; k < 4; k++) document.getElementById('summon').click();
          document.getElementById('auto').click();
          return stage;
        }
      }
      return 0;
    }, id);
    found[id] = stage;
    if (!stage) { console.log('no board for', id); continue; }
    // (a boss's title card plays for a few seconds when a stage begins: wait it out)
    await page.waitForTimeout(4600);
    await shot(id);
  }
  console.log(w, h, JSON.stringify(found));
  // a fight on the first layout found, played to its end (the fight speed up), with the page errors counted
  const first = only.find((id) => found[id]);
  if (first && !process.env.NOFIGHT) {
    await page.evaluate(({ stage }) => {
      const g = window.__game;
      const r = JSON.parse(JSON.stringify(g.run));
      Object.assign(r, { mode: { kind: 'run' }, stage, over: false, cleared: false, gold: 500, event: undefined });
      document.getElementById('home').hidden = true;
      g.startRun(r);
      for (let k = 0; k < 4; k++) document.getElementById('summon').click();
      document.getElementById('auto').click();
      document.getElementById('fight')?.click();
    }, { stage: found[first] });
    let shotMid = false;
    for (let i = 0; i < 900; i++) {
      await page.waitForTimeout(200);
      const [phase, t] = await page.evaluate(() => [window.__game.b.phase, window.__game.b.t]);
      if (!shotMid && t > 8000) { await shot('fight'); shotMid = true; }
      if (phase !== 'fight') break;
    }
    console.log('fight ended', await page.evaluate(() => window.__game.b.phase));
  }
  await ctx.close();
}
console.log('page errors:', errors);
await browser.close();
srv.close();
