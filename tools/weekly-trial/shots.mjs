// WEEKLY-TRIAL (docs/notes/weekly-trial.md): pictures of the Weekly Trial at the three upright sizes, into docs/samples/weekly-trial/: the
// camp with the Trial beside the Daily (a new week's red dot), its tutorial the first time, the card, a fight under the week's rule (its
// banner over the board), and the reward card at a run's end; and at 393 the card of a week the save has no hero for, and Settings,
// Tutorials. The page's clock is set to a week of the rotation (Powder and String against the Golem Forge) so the pictures are the same
// whenever they are taken. Fails on a page error.
//
//   npm run web && node tools/weekly-trial/shots.mjs
import { createRequire } from 'node:module';
import { existsSync, mkdirSync } from 'node:fs';
import { serve } from '../audit/lib.mjs';

const { chromium } = createRequire(import.meta.url)('playwright');
const exe = ['/opt/pw-browsers/chromium'].find((p) => existsSync(p));
const browser = await chromium.launch({ ...(exe ? { executablePath: exe } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const dir = 'docs/samples/weekly-trial';
mkdirSync(dir, { recursive: true });
const srv = serve('out/web');
const base = `http://localhost:${srv.address().port}/`;
const errors = [];
const HEROES = ['knight', 'samurai', 'kunoichi', 'archer', 'wizard', 'peasant', 'rifleBot', 'ranger', 'cleric'];
/** Wednesday 21 October 2026, mid-morning in Denver: rotation week 0, Powder and String against the Golem Forge. */
const POWDER = new Date(Date.UTC(2026, 9, 21, 16, 0));
/** Wednesday 25 November 2026: rotation week 5, the Wild Kin against the Beasts (Beasts and Wardens only). */
const WILD = new Date(Date.UTC(2026, 10, 25, 16, 0));

async function open(w, h, { when = POWDER, heroes = HEROES, seen = [] } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${w}: ${e.message}`));
  await page.clock.setFixedTime(when);
  await page.addInitScript(([heroes, seen]) => {
    try {
      localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 4000, stones: 6, unlocked: heroes, party: heroes.slice(0, 5), pulls: 3, castle: { treasury: 3, barracks: 3, armoury: 3, mageTower: 2, stable: 3, library: 3 }, shards: {}, stars: {}, xp: {}, bestStage: 12, tower: 0, daily: {}, bosses: [], achievements: [], armies: { orcs: { waves: 10, best: 10, won: 10, clears: 1, stars: {} } }, armySeen: ['orcs'], tutorials: ['shop', 'summoning', 'tavern', 'recruit', 'pause', 'armyWeakness', 'tiers', ...seen] }));
      localStorage.setItem('lotf-tips-off', '1');
      localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false }));
    } catch {}
  }, [heroes, seen]);
  await page.goto(base);
  await page.waitForSelector('#home:not([hidden])', { timeout: 20000 });
  await page.waitForTimeout(1800);
  return { ctx, page };
}
const shot = (page, name) => page.screenshot({ path: `${dir}/${name}.png` });
const clearCards = async (page) => {
  // (the first-hour tips' bubble: "Skip tutorial" silences them all)
  if (await page.locator('#tipSkip').isVisible().catch(() => false)) await page.locator('#tipSkip').click();
  else if (await page.locator('#tipGot').isVisible().catch(() => false)) await page.locator('#tipGot').click();
  for (let i = 0; i < 4 && (await page.locator('#tutorialCard .omPrimary').isVisible()); i++) {
    await page.locator('#tutorialCard .omPrimary').click();
    await page.waitForTimeout(300);
  }
};

for (const [w, h] of [[393, 852], [360, 780], [412, 915]]) {
  const { ctx, page } = await open(w, h);
  await clearCards(page);
  await shot(page, `camp-${w}`);
  await page.locator('#hmTrial').click();
  await page.waitForSelector('#tutorialCard', { timeout: 5000 }).catch(() => errors.push(`${w}: no tutorial on the Trial's first opening`));
  await page.waitForTimeout(500);
  await shot(page, `tutorial-${w}`);
  await clearCards(page);
  await page.waitForTimeout(300);
  await shot(page, `card-${w}`);
  await page.locator('#trialCard .omBody').evaluate((e) => e.scrollTo(0, e.scrollHeight));
  await page.waitForTimeout(300);
  await shot(page, `card-${w}-end`);
  await page.locator('#trialCard .omPrimary').click();
  await page.waitForTimeout(1500);
  await clearCards(page);
  await page.evaluate(() => window.__game.autoArrange(true));
  await page.waitForTimeout(600);
  await shot(page, `deploy-${w}`);
  await page.locator('#fight').click();
  await page.waitForTimeout(4500);
  await clearCards(page);
  await shot(page, `fight-${w}`);
  // (the run's end, all seven waves won: the reward card for what the week paid)
  await page.evaluate(() => {
    const g = window.__game;
    g.run.over = true;
    g.run.cleared = true;
    g.run.trialPaid = [3, 5, 7];
    g.meta.trial.laurels = 1;
    // (as the page's own end of a run leaves it: no run to continue)
    localStorage.removeItem('legends.run');
    g.afterResult();
  });
  await page.waitForTimeout(1200);
  await shot(page, `reward-${w}`);
  await ctx.close();
}

// (a week no hero of this save may enter: the card says what to summon)
{
  const { ctx, page } = await open(393, 852, { when: WILD, heroes: HEROES.slice(0, 5), seen: ['weeklyTrial'] });
  await clearCards(page);
  await page.locator('#hmTrial').click();
  await page.waitForTimeout(800);
  await shot(page, 'card-nobody-393');
  await ctx.close();
}
// (Settings, Tutorials: the Trial's entry among those around the keep)
{
  const { ctx, page } = await open(393, 852, { seen: ['weeklyTrial'] });
  await clearCards(page);
  await page.evaluate(() => window.__game.home && document.querySelector('#hmSettings, .hmSettings, [aria-label="Settings"]')?.click());
  await page.waitForTimeout(800);
  const tut = page.getByText('Tutorials', { exact: true }).first();
  if (await tut.isVisible().catch(() => false)) {
    await tut.click();
    await page.waitForTimeout(800);
    await page.locator('#tutorials .omBody').evaluate((e) => e.scrollTo(0, e.scrollHeight)).catch(() => undefined);
    await page.waitForTimeout(300);
    await shot(page, 'tutorials-page-393');
  } else errors.push('no Tutorials row in Settings');
  await ctx.close();
}

await browser.close();
srv.close();
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`pictures in ${dir}`);
