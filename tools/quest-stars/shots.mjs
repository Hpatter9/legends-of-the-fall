// Screenshots of the quest log with stars (QUESTS-3, Q1) at the three phone sizes: the board (sorted, filtered) and the Active tab.
// `npm run web`, then `node tools/quest-stars/shots.mjs [port]`; pictures go to docs/samples/quest-stars-*.png.
import { createRequire } from 'node:module';
import { serve } from '../battle-ui/lib.mjs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const port = Number(process.argv[2] ?? 8830);
const server = serve('out/web', port);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const HEROES = ['knight', 'samurai', 'archer', 'kunoichi', 'wizard', 'peasant', 'samuraiCommander', 'cleric'];
const rec = () => ({ waves: 15, best: 15, won: 15, clears: 1, stars: { 15: 3 } });
const ARMIES = Object.fromEntries(['orcs', 'undead', 'beasts', 'wildwood', 'labyrinth'].map((a) => [a, rec()]));
const errors = [];
for (const [w, h] of [[393, 852], [360, 780], [412, 915]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${w}x${h}: ${e.message}`));
  await page.goto(`http://localhost:${port}/?x=${Math.random()}`);
  await page.evaluate(([heroes, armies]) => {
    localStorage.clear();
    const d = new Date();
    const today = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
    const q = { day: today, done: [], active: [{ id: 'cellarDoor', progress: 1, more: [0], took: today, v: 1 }, { id: 'gwensLedger', progress: 1, took: today, v: 1 }, { id: 'boneCollector', progress: 12, took: today, v: 1 }], failed: { quietHands: today },
      offers: ['roundForTheHouse', 'twoBladesBridge', 'cartersWheels', 'repGlasses'].map((id) => ({ id, giver: 'gwen', day: today })), drawn: {} };
    const m = { seed: 7, crowns: 4000, stones: 30, unlocked: heroes, party: ['knight', 'samurai', 'archer', 'kunoichi', 'wizard'], pulls: 0, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp: Object.fromEntries(heroes.map((k) => [k, 4_000_000])), bestStage: 14, tower: 0, daily: {}, bosses: [], achievements: [], armies, armySeen: Object.keys(armies), stash: [], scenes: ['opening'], heroesSeen: heroes, quests: q };
    localStorage.setItem('legends.meta', JSON.stringify(m));
    localStorage.setItem('lotf-tips-off', '1');
    localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false }));
  }, [HEROES, ARMIES]);
  await page.goto(`http://localhost:${port}/`);
  await page.waitForFunction(() => document.getElementById('hmBattle'), {}, { timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => document.getElementById('tipSkip')?.click());
  for (let i = 0; i < 16 && (await page.$('.earnedArrival')); i++) {
    await page.evaluate(() => document.querySelector('.earnedArrival')?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
    await page.waitForTimeout(700);
  }
  await page.screenshot({ path: `docs/samples/quest-stars-home-${w}.png` });
  await page.evaluate(() => [...document.querySelectorAll('.hmTab')].find((b) => b.textContent.includes('Heroes')).click());
  await page.waitForTimeout(500);
  await page.evaluate(() => document.querySelector('.tvQuests').click());
  await page.waitForTimeout(500);
  await page.screenshot({ path: `docs/samples/quest-stars-active-${w}.png` });
  await page.evaluate(() => [...document.querySelectorAll('.qlTab')].find((b) => b.textContent.startsWith('Board')).click());
  await page.waitForTimeout(400);
  await page.screenshot({ path: `docs/samples/quest-stars-board-${w}.png` });
  await ctx.close();
}
console.log(errors.length ? errors.join('\n') : 'no page errors');
await browser.close();
server.close?.();
