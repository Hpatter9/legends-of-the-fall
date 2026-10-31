// The shop's shot scripts' shared bits: the audit's server and Chromium, a save with every hero and plenty of crowns (and `extra`
// on top), and the opening cutscene skipped.
import { serve, launch, HEROES } from '../audit/lib.mjs';
export { serve, launch, HEROES };
export const SIZES = [[393, 852], [360, 780], [412, 915]];
/** A page at w x h on the save; `extra` is merged into the meta. The save is written once, so a reload keeps what the page changed. */
export async function boot(browser, port, w, h, extra = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => { errors.push(e.message); console.log('PAGE ERROR', e.message); });
  const xp = Object.fromEntries(HEROES.map((k) => [k, 60000]));
  const meta = { seed: 7, crowns: 25000, stones: 10, unlocked: HEROES, party: ['knight', 'barbarian', 'wizard', 'cleric', 'archer'], pulls: 0, castle: { treasury: 5, barracks: 5, armoury: 3, mageTower: 4, stable: 5, library: 2 }, shards: {}, stars: {}, xp, bestStage: 30, tower: 0, daily: {}, bosses: [], achievements: [], armies: {}, armySeen: [], stash: [], heroesSeen: HEROES, ...extra };
  await page.addInitScript((meta) => {
    if (localStorage.getItem('seeded')) return;
    localStorage.setItem('seeded', '1');
    localStorage.setItem('legends.meta', JSON.stringify(meta));
    localStorage.setItem('lotf-tips-off', '1');
  }, meta);
  await page.goto(`http://localhost:${port}/`);
  await page.waitForTimeout(3500);
  for (let i = 0; i < 8; i++) {
    const skipped = await page.evaluate(() => {
      const b = [...document.querySelectorAll('button')].find((x) => x.offsetParent && /^Skip/.test(x.textContent ?? ''));
      if (b) b.click();
      return !!b;
    });
    if (!skipped) break;
    await page.waitForTimeout(900);
  }
  return { ctx, page, errors };
}
