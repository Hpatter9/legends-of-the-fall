// Screenshots of the remade foes at 393x852: the boss card and the fight, for each army wave that has one.
//   node tools/art-cleanup/shots.mjs [prefix]     (serves out/web; pictures go to docs/samples/<prefix>-<name>-393.png)
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const prefix = process.argv[2] ?? 'art-cleanup';
const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', ogg: 'audio/ogg', css: 'text/css' };
const srv = createServer((q, r) => {
  const p = 'out/web/' + (q.url.split('?')[0].slice(1) || 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(8141);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const WAVES = [['wildwood', 5, 'thorn'], ['wildwood', 10, 'raider'], ['wildwood', 15, 'spearlord'], ['beasts', 15, 'boar'], ['ogres', 8, 'shaman'], ['infernal', 8, 'devil'],
  ['golems', 3, 'golems-a'], ['golems', 5, 'golems-b'], ['golems', 8, 'sapphire'], ['golems', 15, 'forge']];
for (const [army, stage, name] of WAVES) {
  const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
  await page.goto('http://localhost:8141/?seed=7');
  await page.waitForTimeout(2000);
  await page.evaluate(() => localStorage.setItem('lotf-tips-off', '1'));
  await page.reload();
  await page.waitForTimeout(2500);
  await page.evaluate(() => { for (const b of document.querySelectorAll('#tip button')) if (b.id === 'tipSkip') b.click(); });
  await page.evaluate(([army, stage]) => { const g = window.__game; g.run.mode = { kind: 'army', army }; g.run.stage = stage; g.run.gold = 999; g.newBattle(); }, [army, stage]);
  await page.waitForTimeout(700);
  await page.screenshot({ path: `docs/samples/${prefix}-card-${name}-393.png` });
  await page.evaluate(() => window.__game.endIntro?.());
  await page.waitForTimeout(300);
  for (let i = 0; i < 3; i++) { await page.locator('button', { hasText: /^Hire/ }).first().click().catch(() => {}); await page.waitForTimeout(200); }
  await page.locator('button', { hasText: 'Auto' }).first().click().catch(() => {});
  await page.waitForTimeout(600);
  await page.evaluate(() => window.__game.begin());
  await page.waitForTimeout(3500);
  await page.screenshot({ path: `docs/samples/${prefix}-fight-${name}-393.png` });
  await ctx.close();
}
srv.close();
await browser.close();
