// Screenshots of the remade heroes on an upright phone (393x852): fights, the party list, a hero sheet, the tavern.
//   node tools/pixellab/heroes/shots.mjs <prefix>      (serves out/web; pictures go to docs/samples/<prefix>-<name>.png)
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const prefix = process.argv[2] ?? 'hero-art';
const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', ogg: 'audio/ogg', css: 'text/css' };
const srv = createServer((q, r) => {
  const p = 'out/web/' + (q.url.split('?')[0].slice(1) || 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(8137);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const SQUADS = { a: ['wolfBard', 'dragoon', 'mercenary', 'kraken', 'juggernaut'], b: ['priestess', 'sage', 'lancer', 'buccaneer', 'tyrant'], c: ['timeWitch', 'beastmaster', 'demonSwordsman', 'dreadPirate', 'mummy'] };
const ALL = [...new Set(Object.values(SQUADS).flat().concat(['knight', 'samurai', 'paladin', 'shambler', 'reaper']))];
for (const [tag, w, h] of [['393', 393, 852]]) {
  for (const [name, squad] of Object.entries(SQUADS)) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
    await page.goto('http://localhost:8137/?seed=7');
    await page.waitForTimeout(2000);
    await page.evaluate(([squad, all]) => {
      const m = window.__game.meta;
      m.unlocked = [...new Set([...m.unlocked, ...all])];
      m.party = squad;
      m.awakened = { wolfBard: 2, dragoon: 1, priestess: 2, buccaneer: 1 };
      localStorage.setItem('legends.meta', JSON.stringify(m));
      localStorage.setItem('lotf-tips-off', '1');
    }, [squad, ALL]);
    await page.reload();
    await page.waitForTimeout(2500);
    await page.evaluate(() => { for (const b of document.querySelectorAll('#tip button')) if (b.id === 'tipSkip') b.click(); });
    await page.evaluate(() => { const g = window.__game; g.run.stage = 3; g.newBattle(); });
    await page.waitForTimeout(300);
    await page.evaluate(() => window.__game.endIntro?.());
    // (gold for a full squad, hired and placed by the Auto button)
    await page.evaluate(() => { window.__game.run.gold = 999; });
    for (let i = 0; i < 3; i++) { await page.locator('button', { hasText: /^Hire/ }).first().click().catch(() => {}); await page.waitForTimeout(250); }
    await page.locator('button', { hasText: 'Auto' }).first().click().catch(() => {});
    await page.waitForTimeout(800);
    await page.screenshot({ path: `docs/samples/${prefix}-deploy-${name}-${tag}.png` });
    await page.evaluate(() => window.__game.begin());
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `docs/samples/${prefix}-fight-${name}-${tag}.png` });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `docs/samples/${prefix}-fight2-${name}-${tag}.png` });
    if (name === 'a') {
      await page.evaluate(() => window.__game.party.open('edit', () => {}));
      await page.waitForTimeout(1000);
      await page.screenshot({ path: `docs/samples/${prefix}-party-${tag}.png` });
      await page.locator('.ptCard', { hasText: 'Wolf Bard' }).locator('.ptInfo').click();
      await page.waitForTimeout(700);
      await page.screenshot({ path: `docs/samples/${prefix}-sheet-wolfbard-${tag}.png` });
    }
    if (name === 'c') {
      // the home pages (camp, tavern, hall, castle) with the new heroes about
      await page.reload();
      await page.waitForTimeout(2500);
      await page.evaluate(() => { for (const b of document.querySelectorAll('#tip button')) if (b.id === 'tipSkip') b.click(); });
      await page.click('#homeBtn');
      await page.waitForTimeout(1800);
      const n = await page.locator('.hmTab').count();
      for (let i = 0; i < n; i++) {
        await page.locator('.hmTab').nth(i).click();
        await page.waitForTimeout(2200);
        await page.screenshot({ path: `docs/samples/${prefix}-home-${i}-${tag}.png` });
      }
    }
    await ctx.close();
  }
}
srv.close();
await browser.close();
