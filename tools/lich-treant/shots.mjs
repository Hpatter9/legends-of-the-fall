// Fight screenshots at 393x852 with the Lich King and with a grade-3 Druid's treant: node tools/lich-treant/shots.mjs <web dir>
// Writes docs/samples/lich-treant-fight-lich.png and lich-treant-fight-treant.png (needs Playwright, as the other shot scripts).
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const [root = 'out/web'] = process.argv.slice(2);
const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', ogg: 'audio/ogg', css: 'text/css' };
const srv = createServer((q, r) => {
  const p = `${root}/` + (q.url.split('?')[0].slice(1) || 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(8133);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
const load = async () => {
  await page.goto('http://localhost:8133/?x=' + Math.random());
  await page.evaluate(() => localStorage.clear());
  await page.goto('http://localhost:8133/');
  await page.waitForTimeout(2200);
  await page.evaluate(() => { for (const b of document.querySelectorAll('#tip button')) if (b.id === 'tipSkip') b.click(); });
};
const start = (army, wave, druid) =>
  page.evaluate(([army, wave, druid]) => {
    const g = window.__game;
    const r = JSON.parse(JSON.stringify(g.run));
    Object.assign(r, { mode: { kind: 'army', army }, stage: wave, over: false, cleared: false, gold: 500, event: undefined });
    document.getElementById('home').hidden = true;
    g.startRun(r);
    for (let i = 0; i < 4; i++) document.getElementById('summon').click();
    if (druid) g.run.roster[0] = { ...g.run.roster[0], kind: 'druid', grade: 3 };
    for (const h of g.run.roster.slice(0, 5)) {
      if (g.b.units.some((u) => u.tag === h.id)) continue;
      const t = g.freeTile();
      if (t) g.put(String(h.id), t);
    }
  }, [army, wave, druid]);
await load();
await start('undead', 8, false);
await page.waitForTimeout(900);
await page.evaluate(() => { window.__game.endIntro(); window.__game.begin(); });
await page.waitForTimeout(9000);
await page.screenshot({ path: 'docs/samples/lich-treant-fight-lich.png' });
await load();
await start('orcs', 3, true);
await page.waitForTimeout(300);
await page.evaluate(() => { window.__game.begin(); const h = window.__game.b.units.find((u) => u.side === 'hero'); h.def = 'druid'; h.grade = 3; h.charge = 1e6; });
await page.waitForTimeout(5000);
console.log(await page.evaluate(() => window.__game.b.units.map((u) => `${u.def}:${u.grade ?? 1}:${u.alive}`).join(' ')));
await page.screenshot({ path: 'docs/samples/lich-treant-fight-treant.png' });
await browser.close();
srv.close();
