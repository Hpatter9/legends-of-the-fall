// Screenshots of TAVERN-RANKUP at the three phone sizes: the gold chevrons over the tavern's heroes (one beside a quest "!"), the
// Upgrades button and its quick list, one row taken in place, the "Upgrade all" confirm and its result, the hero sheet's
// "Next upgrade" hop, and the All heroes cards. `npm run web`, then `node tools/tavern-rankup/shots.mjs [port]`; pictures go to
// docs/samples/rankup-*.png. Page errors are listed at the end.
import { createRequire } from 'node:module';
import { serve } from '../battle-ui/lib.mjs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');

const port = Number(process.argv[2] ?? 8900);
const server = serve('out/web', port);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const HEROES = ['knight', 'samurai', 'archer', 'kunoichi', 'wizard', 'peasant', 'cleric', 'buccaneer'];
const SIZES = (process.argv[3] ? [process.argv[3].split('x').map(Number)] : [[393, 852], [360, 780], [412, 915]]);
const rec = (clears) => ({ waves: 15, best: 15, won: 15, clears, stars: { 15: 3 } });
const ARMIES = { orcs: rec(1), undead: rec(1), beasts: rec(1), wildwood: rec(1) };
const errors = [];

async function boot(w, h) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true });
  const page = await ctx.newPage();
  // (a busy machine can be slow to load the page)
  page.setDefaultTimeout(180000);
  page.setDefaultNavigationTimeout(180000);
  page.on('pageerror', (e) => errors.push(`${w}x${h}: ${e.message}`));
  await page.goto(`http://localhost:${port}/?x=${Math.random()}`);
  await page.evaluate(([heroes, armies]) => {
    localStorage.clear();
    const d = new Date();
    const today = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
    const m = {
      seed: 7, crowns: 4000, stones: 0, unlocked: heroes, party: heroes.slice(0, 5), pulls: 0,
      castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 },
      // (knight: two ranks earned and a quest of his own; samurai and Tiago: one; archer: at the top with its awakening paid for; wizard: short of ore)
      shards: { knight: 3, samurai: 1, buccaneer: 1, archer: 30, wizard: 30, cleric: 0 },
      ranked: { knight: 0, samurai: 0, buccaneer: 0, archer: 4, wizard: 4 },
      ores: { marksman: 10, caster: 4 },
      stars: {}, xp: { knight: 50000, samurai: 50000 }, bestStage: 14, tower: 0, daily: {}, bosses: [], achievements: [], armies, armySeen: Object.keys(armies), stash: [],
      scenes: ['opening', 'awaken'], heroesSeen: heroes, duchessTaps: 2,
      quests: { active: [], offers: [{ id: 'kwameShieldPractice', giver: 'patron', day: today }], done: [], day: today, last: {} },
    };
    localStorage.setItem('legends.meta', JSON.stringify(m));
    localStorage.setItem('lotf-tips-off', '1');
  }, [HEROES, ARMIES]);
  await page.goto(`http://localhost:${port}/`);
  await page.waitForFunction(() => document.getElementById('hmBattle'), {}, { timeout: 180000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => document.getElementById('tipSkip')?.click());
  // (any story scene due on this save is skipped)
  for (let i = 0; i < 8; i++) {
    const on = await page.evaluate(() => { const b = [...document.querySelectorAll('.csSkip')].find((x) => x.offsetParent); b?.click(); return !!b; });
    if (!on) break;
    await page.waitForTimeout(900);
  }
  for (let i = 0; i < 12 && (await page.$('.earnedArrival')); i++) {
    await page.evaluate(() => document.querySelector('.earnedArrival')?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
    await page.waitForTimeout(700);
  }
  return { ctx, page };
}

const heroesTab = (page) => page.evaluate(() => [...document.querySelectorAll('.hmTab')].find((b) => b.textContent.includes('Heroes')).click());
const shot = (page, name, w) => { console.log('shot', name, w); return page.screenshot({ path: `docs/samples/rankup-${name}-${w}.png` }); };
const lookAt = (page, kind) => page.evaluate((k) => {
  const t = window.__game.home.tavern;
  const a = t.actors.get(k);
  if (a) t.camX = t.clampX(a.x - t.viewW / t.scale / 2);
}, kind);

for (const [w, h] of SIZES) {
  let { ctx, page } = await boot(w, h);
  await heroesTab(page);
  await page.waitForTimeout(1500);
  if (!(await page.$('.tvRoom'))) await heroesTab(page);
  await page.waitForTimeout(1000);
  // (Kwame wears the quest "!" and the chevron side by side; Tiago in the hearth hall just the chevron)
  // (the tab's page slides in: wait until it has settled)
  await page.waitForTimeout(2500);
  await lookAt(page, 'knight');
  await page.waitForTimeout(900);
  await shot(page, 'tavern', w);
  await lookAt(page, 'buccaneer');
  await page.waitForTimeout(700);
  await shot(page, 'tavern-hearth', w);
  // (the quick list)
  await page.evaluate(() => document.querySelector('.tvUpgrades').click());
  await page.waitForTimeout(800);
  await shot(page, 'list', w);
  // (one row taken: it changes where it is, with the short flourish)
  await page.evaluate(() => document.querySelector('.ulRow[data-kind="knight"] .ulGo').click());
  await page.waitForTimeout(350);
  await shot(page, 'list-took', w);
  await page.evaluate(() => document.querySelector('.ulAll').click());
  await page.waitForTimeout(300);
  await shot(page, 'list-confirm', w);
  await page.evaluate(() => document.querySelector('.ulAskBtns .primary').click());
  await page.waitForTimeout(1800);
  await shot(page, 'list-done', w);
  await page.evaluate(() => document.querySelector('.ulClose').click());
  await page.waitForTimeout(600);
  // (the scene queued by the archer's first awakening plays: skip it if it shows)
  await page.evaluate(() => [...document.querySelectorAll('.csSkip')].find((x) => x.offsetParent)?.click());
  await page.waitForTimeout(400);
  await ctx.close();
  // (a fresh save: the hero sheet's hop, and the All heroes cards)
  ({ ctx, page } = await boot(w, h));
  await heroesTab(page);
  await page.waitForTimeout(1200);
  await page.evaluate(() => window.__game.home.openSheet('cleric'));
  await page.waitForTimeout(900);
  await shot(page, 'sheet-hop', w);
  await page.evaluate(() => document.querySelector('.heroNextUp').click());
  await page.waitForTimeout(900);
  await shot(page, 'sheet-next', w);
  await page.evaluate(() => window.__game.home.openRoster());
  await page.waitForTimeout(900);
  await shot(page, 'roster', w);
  await ctx.close();
}
await browser.close();
server.close();
console.log(errors.length ? `PAGE ERRORS:\n${errors.join('\n')}` : 'no page errors');
