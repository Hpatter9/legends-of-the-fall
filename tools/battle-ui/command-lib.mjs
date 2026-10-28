// Battle command review helper: route built files locally, boot a save and enter combat.
import { createRequire } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
const { chromium } = createRequire('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/')('playwright-core');
const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', ogg: 'audio/ogg', css: 'text/css' };
export const HEROES = ['knight', 'samurai', 'kunoichi', 'archer', 'wizard', 'paladin', 'cleric', 'werewolf'];
export const launch = () => chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
export async function boot(browser, w, h, port = 8139, meta = null) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => { errors.push(e.message); console.log('PAGE ERROR', e.message); });
  await page.route('http://localhost:8139/**', async route => {
    const name = new URL(route.request().url()).pathname.slice(1) || 'index.html';
    const path = `out/web/${name}`;
    if (!existsSync(path)) return route.fulfill({status:404,body:''});
    await route.fulfill({body:readFileSync(path),contentType:types[path.split('.').pop()] ?? 'application/octet-stream'});
  });
  await page.goto(`http://localhost:${port}/?x=${Math.random()}`);
  await page.evaluate(() => localStorage.clear());
  await page.evaluate(([heroes, meta]) => {
    if (meta !== 'new') localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 1200, unlocked: heroes, party: heroes.slice(0, 5), pulls: 0, dry: 0, dryMythic: 0, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp: { knight: 5000, samurai: 5000 }, bestStage: 14, tower: 9, daily: {}, bosses: [], achievements: [], armies: {}, armySeen: [], stash: [] }));
    localStorage.setItem('lotf-tips-off', '1');
    localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false }));
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
