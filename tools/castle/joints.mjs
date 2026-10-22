// Renders the wall ring alone (no buildings, props or heroes) at 2 device pixels per scene pixel (a 1100 px wide frame at DPR 2) and cuts 3x nearest-neighbour crops of every joint into
// docs/samples/castle-wall-joints.png:  node tools/castle/joints.mjs   (after `npm run web`)
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const root = 'out/web';
const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', json: 'application/json' };
const srv = createServer((q, r) => { const p = `${root}/` + (q.url.split('?')[0].slice(1) || 'index.html'); if (!existsSync(p)) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' }); r.end(readFileSync(p)); }).listen(8137);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await (await browser.newContext({ viewport: { width: 1100, height: 900 }, deviceScaleFactor: 2, hasTouch: true })).newPage();
const H = ['knight', 'samurai', 'kunoichi', 'archer', 'wizard'];
await page.addInitScript(([h]) => { window.__castleWallsOnly = true; localStorage.setItem('lotf-tips-off', '1'); localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 0, unlocked: h, party: h, pulls: 0, dry: 0, dryMythic: 0, castle: {}, shards: {}, stars: {}, xp: {}, bestStage: 3, tower: 0, daily: {}, bosses: [], achievements: [] })); }, [H]);
await page.goto(`http://localhost:${srv.address().port}/`);
await page.waitForTimeout(1200);
await page.locator('.hmTab').nth(3).click();
await page.waitForTimeout(2500);
const url = await page.evaluate(() => document.querySelector('.ctRoom').toDataURL());
writeFileSync(process.argv[2] ?? '/tmp/castle-walls.png', Buffer.from(url.split(',')[1], 'base64'));
await browser.close();
srv.close();
