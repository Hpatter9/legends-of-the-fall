// Screenshots for recycling and the 15-wave armies at the upright phone size (393x852):
//   node tools/sellwaves/shots.mjs <web dir>
// Writes docs/samples/sell-waves-{recycle-prompt,recycled,army-card}.png (needs Playwright, as the other shot scripts).
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
const shot = (name) => page.screenshot({ path: `docs/samples/sell-waves-${name}.png` });
await page.goto('http://localhost:8133/?x=' + Math.random());
await page.evaluate(() => localStorage.clear());
await page.goto('http://localhost:8133/');
await page.waitForTimeout(2200);
await page.evaluate(() => { for (const b of document.querySelectorAll('#tip button')) if (b.id === 'tipSkip') b.click(); });
// 1. the bench with a recycle prompt: an army run with a grade-2 hero chosen, after one tap on Recycle (it asks "Sure?")
await page.evaluate(() => {
  const g = window.__game;
  const r = JSON.parse(JSON.stringify(g.run));
  Object.assign(r, { mode: { kind: 'army', army: 'orcs' }, stage: 3, over: false, cleared: false, gold: 900, event: undefined });
  document.getElementById('home').hidden = true;
  g.startRun(r);
  for (let i = 0; i < 12; i++) document.getElementById('summon').click();
  for (const h of g.run.roster.slice(0, 5)) {
    if (g.b.units.some((u) => u.tag === h.id)) continue;
    const t = g.freeTile();
    if (t) g.put(String(h.id), t);
  }
});
await page.waitForTimeout(900);
const info = await page.evaluate(() => {
  const g = window.__game;
  const h = g.run.roster.find((x) => x.grade > 1) ?? g.run.roster[g.run.roster.length - 1];
  return { id: h.id, grade: h.grade, gold: g.run.gold, heroes: g.run.roster.length };
});
console.log('before', info);
await page.evaluate(() => document.getElementById('bench').scrollTo(0, 0));
const card = page.locator(`#bench .card[data-id="${info.id}"]`);
await card.scrollIntoViewIfNeeded();
await card.dispatchEvent('pointerdown', { clientX: 0, clientY: 0, button: 0 });
await page.evaluate((id) => {
  const c = document.querySelector(`#bench .card[data-id="${id}"]`);
  const r = c.getBoundingClientRect();
  const ev = (t) => new PointerEvent(t, { clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, bubbles: true, pointerId: 1 });
  c.dispatchEvent(ev('pointerdown'));
  window.dispatchEvent(ev('pointerup'));
}, info.id);
await page.waitForTimeout(300);
await page.locator(`#bench .card[data-id="${info.id}"] .recycle`).click();
await page.waitForTimeout(300);
await shot('recycle-prompt');
// 2. confirm: the hero is gone, the gold is up
await page.locator(`#bench .card[data-id="${info.id}"] .recycle`).click();
await page.waitForTimeout(200);
await shot('recycled-puff');
await page.waitForTimeout(1200);
console.log('after', await page.evaluate(() => ({ gold: window.__game.run.gold, heroes: window.__game.run.roster.length })));
await shot('recycled');
// 3. an army card with 15 waves
await page.evaluate(() => { window.__game.meta.crowns = 300; window.__game.home.open(); });
await page.waitForTimeout(300);
await page.evaluate(() => window.__game.home.openArmies());
await page.waitForTimeout(500);
await shot('army-card');
await browser.close();
srv.close();
