// Shared set-up for the battle-ui shot scripts: serves out/web, boots a save, and walks into a Calamity or ordinary fight.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', ogg: 'audio/ogg', css: 'text/css' };
export const HEROES = ['knight', 'samurai', 'kunoichi', 'archer', 'wizard', 'paladin', 'cleric', 'werewolf'];
export function serve(root = 'out/web', port = 8139) {
  return createServer((q, r) => {
    const p = `${root}/` + (q.url.split('?')[0].slice(1) || 'index.html');
    if (!existsSync(p)) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
    r.end(readFileSync(p));
  }).listen(port);
}
export const launch = () => chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
export async function boot(browser, w, h, port = 8139, meta = null) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => { errors.push(e.message); console.log('PAGE ERROR', e.message); });
  await page.goto(`http://localhost:${port}/?x=${Math.random()}`);
  await page.evaluate(() => localStorage.clear());
  await page.evaluate(([heroes, meta]) => {
    if (meta !== 'new') localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 1200, unlocked: heroes, party: heroes.slice(0, 5), pulls: 0, dry: 0, dryMythic: 0, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp: { knight: 5000, samurai: 5000 }, bestStage: 14, tower: 9, daily: {}, bosses: [], achievements: [], armies: {}, armySeen: [], stash: [] }));
    localStorage.setItem('lotf-tips-off', '1');
  }, [HEROES, meta]);
  await page.goto(`http://localhost:${port}/`);
  await page.waitForTimeout(2200);
  await page.evaluate(() => document.getElementById('tipSkip')?.click());
  return { ctx, page, errors };
}
/** Into a Calamity fight (deploy phase) with a roster of ten, a werewolf among them. Uses the calmap save helpers. */
export async function calamityFight(page) {
  const esbuild = await import('esbuild');
  const { mkdirSync } = await import('node:fs');
  mkdirSync('out/shots', { recursive: true });
  await esbuild.build({ entryPoints: ['tools/battle-ui/saves.ts'], bundle: true, platform: 'node', format: 'esm', outfile: 'out/shots/bu-saves.mjs', logLevel: 'error' });
  const S = await import('../../out/shots/bu-saves.mjs');
  await page.evaluate((json) => localStorage.setItem('legends.calamity', json), JSON.stringify(S.big(11)));
  await page.reload();
  await page.waitForTimeout(2000);
  await page.evaluate(() => document.getElementById('tipSkip')?.click());
  await page.evaluate(() => { document.getElementById('hmCalamity').click(); });
  await page.waitForTimeout(1800);
  await page.evaluate(() => document.querySelector('.cmSpot.open .cmHit').click());
  await page.waitForTimeout(300);
  await page.evaluate(() => document.querySelector('.rtGo').click());
  await page.waitForTimeout(2500);
}
