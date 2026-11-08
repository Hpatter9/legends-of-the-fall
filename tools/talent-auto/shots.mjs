// TALENT-AUTO's browser check (`docs/notes/talent-auto.md`) at the three upright phone sizes: the Upgrades list with "Auto all talents",
// its confirm (each hero, its points and its picks), the knight's tree with its Auto button, Auto's box (what it would learn, in
// order) and the tree after Confirm; then "Spend all" in the list, which leaves every hero with nothing more to learn. Writes
// docs/samples/talent-auto-*.png.
//   npm run web && node tools/talent-auto/shots.mjs [port] [WxH]
import { createRequire } from 'node:module';
import { serve } from '../battle-ui/lib.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');

const port = Number(process.argv[2] ?? 9013);
const server = serve('out/web', port);
const browser = await chromium.launch();
const HEROES = ['knight', 'samurai', 'kunoichi', 'archer', 'wizard', 'peasant', 'cleric', 'buccaneer'];
const errors = [];
let bad = 0;

async function boot(w, h, extra) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true });
  const page = await ctx.newPage();
  page.setDefaultTimeout(240000);
  page.on('pageerror', (e) => errors.push(`${w}x${h}: ${e.message}`));
  await page.goto(`http://localhost:${port}/?x=${Math.random()}`);
  await page.evaluate(([heroes, extra]) => {
    localStorage.clear();
    const rec = { waves: 15, best: 15, won: 15, clears: 1, stars: { 15: 3 } };
    const m = {
      seed: 7, crowns: 4000, stones: 0, unlocked: heroes, party: heroes.slice(0, 5), pulls: 0,
      castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 },
      shards: {}, ranked: {}, stars: {}, xp: {}, bestStage: 14, tower: 0, daily: {}, bosses: [], achievements: [], armies: { orcs: rec, undead: rec }, armySeen: ['orcs', 'undead'], stash: [],
      scenes: ['opening', 'awaken'], heroesSeen: heroes, duchessTaps: 2, ...extra,
    };
    localStorage.setItem('legends.meta', JSON.stringify(m));
    localStorage.setItem('lotf-tips-off', '1');
  }, [HEROES, extra]);
  await page.goto(`http://localhost:${port}/`);
  await page.waitForFunction(() => window.__game?.home && document.getElementById('hmBattle'), {}, { timeout: 240000 });
  await page.waitForTimeout(1500);
  await skipAll(page);
  return { ctx, page };
}
async function skipAll(page) {
  await page.evaluate(() => document.getElementById('tipSkip')?.click());
  for (let i = 0; i < 10; i++) {
    const on = await page.evaluate(() => { const b = [...document.querySelectorAll('.csSkip')].find((x) => x.offsetParent); b?.click(); return !!b; });
    if (!on) break;
    await page.waitForTimeout(800);
  }
  for (let i = 0; i < 12 && (await page.$('.earnedArrival')); i++) {
    await page.evaluate(() => document.querySelector('.earnedArrival')?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
    await page.waitForTimeout(600);
  }
}
const shot = (page, name) => page.screenshot({ path: `docs/samples/${name}.png` });
/** Whether an element lies wholly inside the viewport (nothing cut off at the phone's edges). */
const inside = (page, sel) => page.evaluate((sel) => {
  const e = document.querySelector(sel);
  if (!e) return false;
  const r = e.getBoundingClientRect();
  return r.left >= 0 && r.top >= 0 && r.right <= innerWidth + 0.5 && r.bottom <= innerHeight + 0.5;
}, sel);
const talentsOf = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('legends.meta')).talents ?? {});

const SIZES = process.argv[3] ? [process.argv[3].split('x').map(Number)] : [[393, 852], [360, 780], [412, 915]];
for (const [w, h] of SIZES) {
  const size = `${w}x${h}`;
  // (the knight at about level 21 with seven points; the cleric and the archer with a few)
  const { ctx, page } = await boot(w, h, { xp: { knight: 30000, cleric: 3000, archer: 1200 } });
  await page.evaluate(() => [...document.querySelectorAll('.hmTab')].find((b) => b.textContent.includes('Heroes')).click());
  await page.waitForTimeout(3000);
  await page.evaluate(() => document.querySelector('.tvUpgrades').click());
  await page.waitForTimeout(800);
  // ---- the list's Auto all and its confirm
  const autoBtn = await page.evaluate(() => document.querySelector('.ulAuto')?.textContent ?? '');
  const footIn = await inside(page, '.ulAuto');
  await shot(page, `talent-auto-rows-${size}`);
  await page.evaluate(() => document.querySelector('.ulAuto').click());
  await page.waitForTimeout(400);
  const plans = await page.evaluate(() => [...document.querySelectorAll('.ulPlan')].map((p) => p.textContent));
  const askIn = await inside(page, '.ulAsk');
  await shot(page, `talent-auto-list-${size}`);
  await page.evaluate(() => [...document.querySelectorAll('.ulAskBtns button')].find((b) => b.textContent === 'Cancel').click());
  await page.waitForTimeout(200);
  // ---- the knight's tree: Auto, its box, and Confirm
  await page.evaluate(() => document.querySelector('.ulTalent[data-kind="knight"] .ulGo').click());
  await page.waitForTimeout(1200);
  await page.evaluate(() => document.querySelector('.tAuto')?.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(300);
  const treeBtn = await page.evaluate(() => document.querySelector('.tAuto')?.textContent ?? '');
  await shot(page, `talent-auto-tree-${size}`);
  await page.evaluate(() => document.querySelector('.tAuto').click());
  await page.waitForTimeout(400);
  const box = await page.evaluate(() => [...document.querySelectorAll('.tPlan li b')].map((b) => b.textContent));
  const boxIn = await inside(page, '.tModal .tBox');
  await shot(page, `talent-auto-preview-${size}`);
  await page.evaluate(() => [...document.querySelectorAll('.tModal .tBtns button')].find((b) => b.textContent === 'Confirm').click());
  await page.waitForTimeout(600);
  const knight = (await talentsOf(page)).knight?.picks ?? [];
  const after = await page.evaluate(() => ({ auto: !!document.querySelector('.tAuto'), points: document.querySelector('.tPoints')?.textContent }));
  await page.evaluate(() => document.querySelector('.tTree')?.scrollIntoView({ block: 'start' }));
  await page.waitForTimeout(300);
  await shot(page, `talent-auto-done-${size}`);
  // ---- Spend all in the list, for the heroes left
  await page.evaluate(() => document.querySelector('.tvUpgrades')?.click() ?? [...document.querySelectorAll('.hmTab')].find((b) => b.textContent.includes('Heroes')).click());
  await page.waitForTimeout(800);
  if (!(await page.$('.ulCard'))) {
    await page.evaluate(() => document.querySelector('.tvUpgrades')?.click());
    await page.waitForTimeout(800);
  }
  await page.evaluate(() => document.querySelector('.ulAuto')?.click());
  await page.waitForTimeout(300);
  await page.evaluate(() => [...document.querySelectorAll('.ulAskBtns button')].find((b) => b.textContent === 'Spend all')?.click());
  await page.waitForTimeout(400);
  const left = await page.evaluate(() => ({ auto: document.querySelector('.ulAuto')?.textContent, rows: [...document.querySelectorAll('.ulTalent .ulWhat')].map((r) => r.textContent) }));
  const all = await talentsOf(page);
  console.log(size, JSON.stringify({ autoBtn, footIn, plans, askIn, treeBtn, box, boxIn, knight, after, left, picked: Object.fromEntries(Object.entries(all).map(([k, v]) => [k, v.picks.length])) }));
  if (!(autoBtn.startsWith('Auto all talents') && footIn && plans.length >= 2 && askIn && treeBtn.startsWith('Auto') && box.length && boxIn && knight.length === box.length && !after.auto && left.rows.every((r) => r.includes('all spent')) && (all.cleric?.picks.length ?? 0) > 0)) bad++;
  await ctx.close();
}
await browser.close();
server.close();
console.log(errors.length ? `PAGE ERRORS:\n${errors.join('\n')}` : 'no page errors');
process.exit(bad ? 1 : 0);
