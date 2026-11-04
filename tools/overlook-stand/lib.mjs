// Shared set-up for the overlook's Last Stand shots and checks: serves out/web, boots a save with the Last Stand and the
// Calamity open, and opens the Battle tab.
import { createRequire } from 'node:module';
import { serve } from '../battle-ui/lib.mjs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
export { serve };
export const SIZES = [[393, 852], [360, 780], [412, 915]];
export const launch = () => chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const HEROES = ['knight', 'samurai', 'kunoichi', 'archer', 'wizard', 'paladin', 'cleric', 'ranger'];
/** A page at w x h on a save with every mode open (heroes at level 20; `extra` is merged into the save). */
export async function boot(browser, w, h, port, extra = {}) {
  // (a busy machine now and then crashes a tab on the large bundle: try again on a fresh one)
  for (let i = 0; ; i++) {
    try {
      return await bootOnce(browser, w, h, port, extra);
    } catch (e) {
      if (i >= 2) throw e;
      console.log(`boot retry: ${e.message.split('\n')[0]}`);
    }
  }
}
async function bootOnce(browser, w, h, port, extra) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true });
  const page = await ctx.newPage().catch(async (e) => { await ctx.close(); throw e; });
  const errors = [];
  page.on('pageerror', (e) => { errors.push(e.message); console.log('PAGE ERROR', e.message); });
  await page.goto(`http://localhost:${port}/?x=${Math.random()}`, { timeout: 120000 });
  await page.evaluate(() => localStorage.clear());
  await page.evaluate(([heroes, extra]) => {
    const xp = Object.fromEntries(heroes.map((h) => [h, 30 * 19 * 20]));
    localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 1200, unlocked: heroes, party: heroes.slice(0, 5), pulls: 0, dry: 0, dryMythic: 0, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp, bestStage: 14, tower: 9, daily: {}, bosses: [], achievements: [], armies: {}, armies: { orcs: { best: 8, won: 8, clears: 1, stars: { 1: 3, 2: 3 } } }, armySeen: ['orcs', 'undead'], stash: [], opened: ['tower', 'castle', 'calamity', 'daily'], scenes: ['opening', 'gorvak'], heroesSeen: heroes, featuresTold: ['autoMerge', 'autoPlace'], ...extra }));
    localStorage.setItem('lotf-tips-off', '1');
  }, [HEROES, extra]);
  await page.goto(`http://localhost:${port}/`, { timeout: 120000 });
  await page.waitForFunction(() => document.getElementById('hmDaily'), {}, { timeout: 60000 });
  await page.waitForTimeout(1500);
  await skipAll(page);
  return { ctx, page, errors };
}
/** Close whatever plays over the home screen (a scene's Skip, a tip) until the Battle tab shows. */
export async function skipAll(page) {
  for (let i = 0; i < 12; i++) {
    const did = await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find((e) => e.offsetParent && /^(Skip|Got it|Continue)$/.test(e.textContent.trim()) && !e.closest('#home'));
      document.getElementById('tipSkip')?.click();
      if (b) b.click();
      return !!b;
    });
    if (!did) break;
    await page.waitForTimeout(700);
  }
}
