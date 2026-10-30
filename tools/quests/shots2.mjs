// Screenshots of quests batch 1b at the three phone sizes: the board full of offers from many givers, a hero's own offer (the "!"
// over them in the tavern, and their card), the drop confirm, and the Done tab with a repeatable's count. `npm run web`, then
// `node tools/quests/shots2.mjs [port]`; pictures go to docs/samples/quests-2-*.png.
import { createRequire } from 'node:module';
import { serve } from '../battle-ui/lib.mjs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');

const port = Number(process.argv[2] ?? 8750);
const server = serve('out/web', port);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const HEROES = ['knight', 'samurai', 'archer', 'kunoichi', 'wizard', 'peasant', 'cleric', 'buccaneer', 'dreadPirate', 'beastmaster', 'warlock', 'shambler'];
const rec = (clears) => ({ waves: 15, best: 15, won: 15, clears, stars: { 15: 3 } });
const ARMIES = { orcs: rec(1), undead: rec(1), beasts: rec(1), wildwood: rec(1) };
const SIZES = [[393, 852], [360, 780], [412, 915]];
const errors = [];

const BOARD = ['wantedChieftain', 'tiagoSaltBetweenUs', 'pedlarsPans', 'dogsSecondCourse', 'repBountyBones', 'brothersPatrol', 'royalBanners', 'warlordsMap', 'duchessHatEmergency'];
const ACTIVE = [
  { id: 'selamLantern', progress: 12400 },
  { id: 'repGlasses', progress: 2 },
];

async function boot(w, h, quests) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${w}x${h}: ${e.message}`));
  await page.goto(`http://localhost:${port}/?x=${Math.random()}`);
  await page.evaluate(([heroes, armies, quests]) => {
    localStorage.clear();
    const d = new Date();
    const today = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
    const q = quests && { ...quests, day: today, offers: quests.offers.map((id) => ({ id, giver: 'x', day: today })), active: quests.active.map((a) => ({ ...a, took: today })) };
    const m = { seed: 7, crowns: 4000, stones: 30, unlocked: heroes, party: heroes.slice(0, 5), pulls: 0, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp: { knight: 50000, samurai: 50000 }, bestStage: 14, tower: 0, daily: {}, bosses: [], achievements: [], armies, armySeen: Object.keys(armies), stash: [], scenes: ['opening'], heroesSeen: heroes, duchessTaps: 2 };
    if (q) m.quests = q;
    localStorage.setItem('legends.meta', JSON.stringify(m));
    localStorage.setItem('lotf-tips-off', '1');
  }, [HEROES, ARMIES, quests]);
  await page.goto(`http://localhost:${port}/`);
  await page.waitForFunction(() => document.getElementById('hmBattle'), {}, { timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => document.getElementById('tipSkip')?.click());
  // (the content heroes whose deeds the save has met ride in first: tap each arrival away)
  for (let i = 0; i < 12 && (await page.$('.earnedArrival')); i++) {
    await page.evaluate(() => document.querySelector('.earnedArrival')?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
    await page.waitForTimeout(700);
  }
  return { ctx, page };
}

const heroesTab = (page) => page.evaluate(() => [...document.querySelectorAll('.hmTab')].find((b) => b.textContent.includes('Heroes')).click());
const logTab = (page, name) => page.evaluate((n) => [...document.querySelectorAll('.qlTab')].find((b) => b.textContent.startsWith(n)).click(), name);
const shot = (page, name, w) => page.screenshot({ path: `docs/samples/quests-2-${name}-${w}.png` });

for (const [w, h] of SIZES) {
  const { ctx, page } = await boot(w, h, { active: ACTIVE, offers: BOARD, done: ['cartersWheels', 'repRats', 'roundForTheHouse', 'repGlasses'], times: { repGlasses: 3, repRats: 2 }, last: {} });
  await heroesTab(page);
  await page.waitForTimeout(1500);
  if (!(await page.$('.tvRoom'))) await heroesTab(page);
  await page.waitForTimeout(1000);
  // (the tavern: the heroes with a quest of their own wear the "!", here Tiago: the view is moved to him, as a drag would)
  await page.evaluate(() => {
    const t = window.__game.home.tavern;
    const a = t.actors.get('buccaneer');
    if (a) t.camX = t.clampX(a.x - t.viewW / t.scale / 2);
  });
  await page.waitForTimeout(800);
  // (the hero's own card: Tiago asks)
  await page.evaluate(() => window.__game.home.tavern.quests.onGiver('hero:buccaneer'));
  await page.waitForTimeout(600);
  await shot(page, 'hero-offer', w);
  await page.evaluate(() => document.querySelector('.qcRow button:not(.primary)').click());
  await page.waitForTimeout(600);
  await shot(page, 'tavern', w);
  // (the board: every giver's offers)
  await page.evaluate(() => document.querySelector('.tvQuests').click());
  await page.waitForTimeout(400);
  await logTab(page, 'Board');
  await page.waitForTimeout(300);
  await shot(page, 'board', w);
  await page.evaluate(() => document.querySelector('.qlList').scrollTo(0, 99999));
  await page.waitForTimeout(200);
  await shot(page, 'board-more', w);
  // (the drop confirm on an active quest)
  await logTab(page, 'Active');
  await page.waitForTimeout(300);
  await page.evaluate(() => document.querySelector('.qlDrop').click());
  await page.waitForTimeout(300);
  await shot(page, 'drop', w);
  await page.evaluate(() => document.querySelector('.qlRow.dropping .danger').click());
  await page.waitForTimeout(300);
  await shot(page, 'dropped', w);
  // (Done: the repeatable's count)
  await logTab(page, 'Done');
  await page.waitForTimeout(300);
  await shot(page, 'done', w);
  await ctx.close();
}
await browser.close();
server.close();
console.log(errors.length ? errors.join('\n') : 'no page errors');
