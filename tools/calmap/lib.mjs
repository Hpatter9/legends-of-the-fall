// Shared bits of the calamity map's screenshot scripts: a static server for out/web, a started meta, and a browser.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
export const SIZES = [[393, 852], [360, 780], [412, 915]];
export const HEROES = ['knight', 'samurai', 'kunoichi', 'archer', 'wizard', 'paladin', 'cleric'];
const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', ogg: 'audio/ogg', css: 'text/css' };
export function serve(root = 'out/web', port = 8139) {
  return createServer((q, r) => {
    const p = `${root}/` + (q.url.split('?')[0].slice(1) || 'index.html');
    if (!existsSync(p)) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
    r.end(readFileSync(p));
  }).listen(port);
}
export const launch = () => chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
/** A page at (w, h) with a rich started meta, on the home screen. */
export async function openHome(browser, w, h, port = 8139, dpr = 2) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
  page.on('console', (m) => m.type() === 'error' && console.log('CONSOLE', m.text()));
  await page.goto(`http://localhost:${port}/?x=` + Math.random());
  await page.evaluate(() => localStorage.clear());
  await page.evaluate((heroes) => {
    localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 1200, unlocked: heroes, party: heroes.slice(0, 5), pulls: 0, dry: 0, dryMythic: 0, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp: { knight: 5000, samurai: 5000 }, bestStage: 14, tower: 9, daily: {}, bosses: [], achievements: [], armies: {}, armySeen: [], stash: [] }));
    localStorage.setItem('lotf-tips-off', '1');
  }, HEROES);
  await page.goto(`http://localhost:${port}/`);
  await page.waitForTimeout(2200);
  await page.evaluate(() => document.getElementById('tipSkip')?.click());
  return { ctx, page };
}
