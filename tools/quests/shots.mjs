// Screenshots of the quests (batch 1) at the three phone sizes: the tavern with Gwen's "!", her offer, the log's tabs, the Battle
// tab's tracked chip, and a done quest's hand-in. `npm run web`, then `node tools/quests/shots.mjs [port]`; pictures go to
// docs/samples/quests-1-*.png.
import { createRequire } from 'node:module';
import { serve } from '../battle-ui/lib.mjs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');

const port = Number(process.argv[2] ?? 8731);
const server = serve('out/web', port);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const HEROES = ['knight', 'samurai', 'archer', 'kunoichi', 'wizard', 'peasant', 'cleric'];
const rec = (clears) => ({ waves: 15, best: 15, won: 15, clears, stars: { 15: 3 } });
const SIZES = [[393, 852], [360, 780], [412, 915]];
const errors = [];

async function boot(w, h, quests) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${w}x${h}: ${e.message}`));
  await page.goto(`http://localhost:${port}/?x=${Math.random()}`);
  await page.evaluate(([heroes, armies, quests]) => {
    localStorage.clear();
    const m = { seed: 7, crowns: 400, stones: 3, unlocked: heroes, party: heroes.slice(0, 5), pulls: 0, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp: { knight: 5000, samurai: 5000 }, bestStage: 14, tower: 0, daily: {}, bosses: [], achievements: [], armies, armySeen: Object.keys(armies), stash: [], scenes: ['opening'], heroesSeen: heroes };
    if (quests) m.quests = quests;
    localStorage.setItem('legends.meta', JSON.stringify(m));
    localStorage.setItem('lotf-tips-off', '1');
  }, [HEROES, { orcs: rec(1), undead: rec(1) }, quests]);
  await page.goto(`http://localhost:${port}/`);
  await page.waitForFunction(() => document.getElementById('hmBattle'), {}, { timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => document.getElementById('tipSkip')?.click());
  return { ctx, page };
}

/** Tap a spot of the tavern's scene (room pixels), worked out from the canvas the way the tavern places its view. */
async function tapRoom(page, rx, ry) {
  const at = await page.evaluate(([rx, ry]) => {
    const c = document.querySelector('.tvRoom');
    const r = c.getBoundingClientRect();
    const s = r.height >= 296 * 3 ? 3 : 2;
    const camX = Math.max(0, Math.min(384 * 3 - r.width / s, 256 - r.width / s / 2));
    const camY = Math.max(-72, 296 + 26 - r.height / s);
    return [r.left + (rx - camX) * s, r.top + (ry - camY) * s];
  }, [rx, ry]);
  await page.mouse.click(at[0], at[1]);
}

const heroesTab = (page) => page.evaluate(() => [...document.querySelectorAll('.hmTab')].find((b) => b.textContent.includes('Heroes')).click());
const shot = (page, name, w) => page.screenshot({ path: `docs/samples/quests-1-${name}-${w}.png` });

for (const [w, h] of SIZES) {
  // a fresh look: the day's offers drawn, Gwen with her "!"
  let { ctx, page } = await boot(w, h, null);
  await heroesTab(page);
  await page.waitForTimeout(1500);
  await shot(page, 'tavern', w);
  await tapRoom(page, 273, 158);
  await page.waitForTimeout(600);
  await shot(page, 'offer', w);
  await page.evaluate(() => document.querySelector('.qcRow .primary').click());
  await page.waitForTimeout(300);
  await page.evaluate(() => document.querySelector('.tvQuests').click());
  await page.waitForTimeout(400);
  await shot(page, 'log-active', w);
  await page.evaluate(() => [...document.querySelectorAll('.qlTab')].find((b) => b.textContent.startsWith('Board')).click());
  await page.waitForTimeout(300);
  await shot(page, 'log-board', w);
  await page.evaluate(() => document.querySelector('.qlShut').click());
  await page.evaluate(() => [...document.querySelectorAll('.hmTab')].find((b) => b.textContent.includes('Battle')).click());
  await page.waitForTimeout(800);
  await shot(page, 'chip', w);
  await ctx.close();
  // a done quest: Gwen's tick, the hand-in, the Done tab
  ({ ctx, page } = await boot(w, h, { active: [{ id: 'cartersWheels', progress: 3, took: 20261030 }, { id: 'roundForTheHouse', progress: 4, took: 20261030 }], offers: [], done: [] }));
  await heroesTab(page);
  await page.waitForTimeout(1500);
  await shot(page, 'ready', w);
  await tapRoom(page, 273, 158);
  await page.waitForTimeout(600);
  await page.evaluate(() => document.querySelector('.qcRow .primary').click());
  await page.waitForTimeout(400);
  await shot(page, 'handin', w);
  await page.evaluate(() => document.querySelector('.qcRow .primary').click());
  await page.evaluate(() => document.querySelector('.tvQuests').click());
  await page.evaluate(() => [...document.querySelectorAll('.qlTab')].find((b) => b.textContent.startsWith('Done')).click());
  await page.waitForTimeout(300);
  await shot(page, 'log-done', w);
  await ctx.close();
}
await browser.close();
server.close();
console.log(errors.length ? errors.join('\n') : 'no page errors');
