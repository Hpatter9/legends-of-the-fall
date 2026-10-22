// Screenshots of the Auto button, an auto-deployed board, the auto-replay banner and its summary card, at three
// upright phone sizes: node tools/ui/autoplay-shots.mjs [build dir] [out dir] (serves the build itself; needs playwright and Chromium).
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
const { chromium } = createRequire('/node-tools/node_modules/')('playwright');
const [root, out] = [process.argv[2] ?? 'out/web', process.argv[3] ?? 'docs/samples'];
mkdirSync(out, { recursive: true });
const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', ogg: 'audio/ogg' };
const srv = createServer((q, r) => {
  const p = `${root}/` + (q.url.split('?')[0].slice(1) || 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(8126);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const wait = (page, ms = 400) => page.waitForTimeout(ms);
const skipTips = (page) => page.evaluate(() => document.getElementById('tipSkip')?.click());
for (const [w, h] of [[393, 852], [360, 780], [412, 915]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  page.on('pageerror', (e) => console.log('pageerror', e.message));
  await page.goto('http://localhost:8126/?seed=7');
  await page.waitForSelector('#loading', { state: 'detached' });
  // the Auto button and an auto-deployed board (a fresh run on the first army)
  await wait(page, 600);
  await skipTips(page);
  await page.screenshot({ path: `${out}/autoplay-button-${w}x${h}.png` });
  // (a save that has beaten the first army, with strong heroes, so the farm is quick)
  await page.evaluate(() => {
    const g = window.__game;
    g.home.openArmies();
  });
  await wait(page, 800);
  await page.evaluate(() => {
    const g = window.__game;
    const id = document.querySelector('.asCard').dataset.army;
    localStorage.removeItem('legends.run');
    for (const k of g.meta.unlocked) g.meta.xp[k] = 400000;
    g.meta.armies[id] = { best: 8, won: 8, clears: 1, stars: {} };
    g.home.openArmies();
  });
  await wait(page, 800);
  await page.click('.asAuto');
  await wait(page, 300);
  await page.screenshot({ path: `${out}/autoplay-card-${w}x${h}.png` });
  await page.click('.asFight');
  await wait(page, 600);
  await page.click('#ptGo');
  // (held a moment at the deploy, to show the board as the replay set it out)
  await page.evaluate(() => { window.__game.autoWait = 100000; });
  await wait(page, 1600);
  await page.screenshot({ path: `${out}/autoplay-deployed-${w}x${h}.png` });
  await page.evaluate(() => { window.__game.autoWait = 0; });
  await wait(page, 4500);
  await page.screenshot({ path: `${out}/autoplay-banner-${w}x${h}.png` });
  await page.evaluate(() => { window.__game.setSpeed(3); });
  await page.waitForSelector('#autoSum:not([hidden])', { timeout: 120000 });
  await wait(page, 500);
  await page.screenshot({ path: `${out}/autoplay-summary-${w}x${h}.png` });
  await page.close();
}
await browser.close();
srv.close();
