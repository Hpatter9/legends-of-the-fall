// Shared set-up for the Last Stand's shot scripts: serves out/web, boots a save with the Tower's place open, and walks into the Stand.
import { serve, boot as bootPage } from '../battle-ui/lib.mjs';
import { createRequire } from 'node:module';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
export { serve };
/** Headless Chromium on software GL (`--use-angle=swiftshader`: the older `--use-gl` leaves bands unpainted). */
export const launch = () => chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
export const SIZES = [[393, 852], [360, 780], [412, 915]];
const PARTY = ['knight', 'samurai', 'kunoichi', 'archer', 'wizard', 'paladin', 'cleric', 'ranger'];
/** A page on a save whose Tower place is open (and whose heroes sit at `level`); `fresh` clears the Stand's own save. */
export async function boot(browser, w, h, level = 20, port = 8139, dpr = 1) {
  const out = dpr === 1 ? await bootPage(browser, w, h, port) : await bootDpr(browser, w, h, port, dpr);
  const { page } = out;
  await page.evaluate(([heroes, level]) => {
    const m = JSON.parse(localStorage.getItem('legends.meta'));
    m.opened = ['tower', 'castle'];
    m.unlocked = heroes;
    m.party = heroes.slice(0, 5);
    m.xp = Object.fromEntries(heroes.map((h) => [h, level > 1 ? Math.round(30 * (level - 1) * level * (level > 20 ? 4 : 1)) : 0]));
    localStorage.setItem('legends.meta', JSON.stringify(m));
    localStorage.removeItem('legends.stand');
  }, [PARTY, level]);
  await page.reload();
  await page.waitForTimeout(2200);
  await page.evaluate(() => document.getElementById('tipSkip')?.click());
  return out;
}
/** The same as the battle-ui boot, on a screen with `dpr` device pixels to a CSS pixel. */
async function bootDpr(browser, w, h, port, dpr) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, hasTouch: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => { errors.push(e.message); console.log('PAGE ERROR', e.message); });
  await page.goto(`http://localhost:${port}/?x=${Math.random()}`);
  await page.evaluate(() => localStorage.clear());
  await page.evaluate(([heroes]) => {
    localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 1200, unlocked: heroes, party: heroes.slice(0, 5), pulls: 0, dry: 0, dryMythic: 0, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp: {}, bestStage: 14, tower: 9, daily: {}, bosses: [], achievements: [], armies: {}, armySeen: [], stash: [] }));
    localStorage.setItem('lotf-tips-off', '1');
  }, [PARTY]);
  await page.goto(`http://localhost:${port}/`);
  await page.waitForTimeout(2200);
  await page.evaluate(() => document.getElementById('tipSkip')?.click());
  return { ctx, page, errors };
}
export async function enter(page) {
  await page.evaluate(() => document.getElementById('hmTower').click());
  await page.waitForTimeout(1200);
  // (the choice of the eight: the party is filled up by Auto fill and taken)
  if (await page.evaluate(() => !!document.querySelector('.stPick:not([hidden])'))) {
    await page.evaluate(() => [...document.querySelectorAll('.stPick button')].find((b) => b.textContent === 'Auto fill')?.click());
    await page.evaluate(() => document.querySelector('.stPick .primary').click());
    await page.waitForTimeout(800);
  }
}
