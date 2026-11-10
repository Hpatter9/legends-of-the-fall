// SWEEP-1110, offline: the first visit fills the service worker's cache, then the network is cut and the page reloaded; the Castle tab, the
// Summoning collection, an army's fight and an assault on the Elder Root are opened with no network. Any request that fails is a file the
// cache missed.   npm run web && node tools/sweep-1110/offline.mjs
import { serve, launch, open, wait, out } from './lib.mjs';
const PORT = 8916;
const dir = out('out/sweep-1110/offline');
const server = serve(PORT);
const browser = await launch();
const { ctx, page, log } = await open(browser, 393, 852, PORT, { offline: true });
await page.waitForFunction(async () => { const ks = await caches.keys(); if (!ks.length) return false; const c = await caches.open(ks[0]); return (await c.keys()).length > 1000; }, null, { timeout: 120000, polling: 1000 });
console.log('cache filled');
await ctx.setOffline(true);
const failed = [];
page.on('requestfailed', (r) => failed.push(r.url()));
await page.reload();
await page.waitForFunction(() => !!window.__game?.home, null, { timeout: 60000 });
await wait(page, 2000);
for (const t of ['castle', 'recruit', 'heroes', 'spells']) { await page.evaluate((t) => window.__game.home.show(t), t); await wait(page, 1200); }
await page.screenshot({ path: `${dir}/castle-offline.png` });
await page.evaluate(() => window.__game.home.hooks.onRecruit());
await wait(page, 1200);
await page.evaluate(() => document.getElementById('gachaClose').click());
await page.evaluate(() => { const g = window.__game; const r = JSON.parse(JSON.stringify(g.run)); Object.assign(r, { seed: 9, mode: { kind: 'army', army: 'undead', tier: 0 }, stage: 2, over: false, cleared: false, gold: 0, roster: ['knight', 'cleric', 'archer', 'wizard', 'samurai'].map((kind, i) => ({ id: 100 + i, kind, grade: 1 })), squad: [], nextId: 200 }); document.getElementById('home').hidden = true; g.startRun(r); });
await wait(page, 1500);
await page.evaluate(() => { window.__game.autoArrange(true); document.getElementById('fight').click(); });
await wait(page, 4000);
await page.screenshot({ path: `${dir}/fight-offline.png` });
await page.evaluate(() => { window.__game.home.open(); window.__game.home.openAssault('wildwood'); });
await wait(page, 1200);
for (let i = 0; i < 4; i++) {
  const ok = await page.evaluate(() => { const bs = [...document.querySelectorAll('button')].filter((x) => x.offsetParent); const m = bs.find((x) => /^March/.test(x.textContent.trim())); if (m) { m.click(); return true; } bs.find((x) => x.textContent.trim() === 'Close')?.click(); return false; });
  if (ok) break;
  await wait(page, 800);
}
await wait(page, 8000);
await page.screenshot({ path: `${dir}/assault-offline.png` });
console.log('field up', await page.evaluate(() => !!document.querySelector('#assaultScene .asTop')));
console.log('failed requests', failed.length, failed.slice(0, 10));
console.log('errors', log.errors.length, log.errors.slice(0, 3));
await ctx.close();
await browser.close();
server.close();
