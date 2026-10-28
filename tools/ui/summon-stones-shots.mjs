// Screenshots of the summoning stones at 393x852: an old save loading, the top bar, the chest shop, opening a chest, using 1 and 10
// stones, and the lucky roll (forced with `window.__forceLucky`). Run after `npm run web`; the pictures go to docs/samples/summon-stones-*.png.
//   node tools/ui/summon-stones-shots.mjs [width height]
import { serve, launch, HEROES } from './hp-lib.mjs';
const [W, H] = [Number(process.argv[2] ?? 393), Number(process.argv[3] ?? 852)];
const tag = W === 393 ? '' : `-${W}x${H}`;
const srv = serve();
const browser = await launch();
const base = `http://localhost:${srv.address().port}/`;
const out = (n) => `docs/samples/summon-stones-${n}${tag}.png`;
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, hasTouch: true });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
// (an old save: no stones field, 4,321 crowns, eight heroes, a pity counter and a begun bar)
await page.addInitScript(([heroes]) => {
  if (localStorage.getItem('seeded')) return;
  localStorage.setItem('seeded', '1');
  localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 4321, unlocked: heroes, party: heroes.slice(0, 5), pulls: 57, unlockDry: 2, unlock: { paladin: 1 }, castle: { treasury: 2, barracks: 2, armoury: 2, mageTower: 1, stable: 2, library: 2 }, shards: {}, stars: {}, xp: {}, bestStage: 12, tower: 0, daily: {}, bosses: [], achievements: [], armies: {}, armySeen: [] }));
  localStorage.setItem('lotf-tips-off', '1');
}, [HEROES.slice(0, 8)]);
await page.goto(base);
await page.waitForTimeout(1500);
await page.screenshot({ path: out('old-save') });
await page.waitForTimeout(3500);
await page.screenshot({ path: out('topbar'), clip: { x: 0, y: 0, width: W, height: 120 } });
await page.evaluate(() => { for (const b of document.querySelectorAll('.hmTab')) if (b.textContent.includes('Recruit')) b.click(); });
await page.waitForTimeout(1200);
await page.screenshot({ path: out('recruit') });
// the chest shop
await page.locator('.hlShop').click();
await page.waitForTimeout(600);
await page.screenshot({ path: out('shop') });
// buy a bronze chest and watch it open
await page.locator('.shopBuy').first().click();
await page.waitForTimeout(1200);
await page.screenshot({ path: out('chest-opening') });
await page.waitForTimeout(2800);
await page.screenshot({ path: out('chest-opened') });
await page.locator('.chestGo').click();
await page.waitForTimeout(500);
await page.screenshot({ path: out('shop-after') });
await page.locator('.shopClose').click();
await page.waitForTimeout(600);
// use 1 stone, then 10
const reveal = async (name, n) => {
  await page.locator('.hlBar button').nth(n === 1 ? 0 : 1).click();
  await page.waitForTimeout(500);
  if (await page.evaluate(() => document.querySelector('.hlSkip')?.classList.contains('on'))) await page.mouse.click(200, 400);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: out(`${name}-cards`) });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: out(`${name}-revealed`) });
};
await reveal('use1', 1);
await page.evaluate(() => document.getElementById('gachaClose')?.click());
await page.waitForTimeout(600);
await reveal('use10', 10);
await page.evaluate(() => document.getElementById('gachaClose')?.click());
await page.waitForTimeout(600);
// the lucky roll
await page.evaluate(() => { window.__forceLucky = true; });
await page.locator('.hlBar button').first().click();
await page.waitForTimeout(500);
if (await page.evaluate(() => document.querySelector('.hlSkip')?.classList.contains('on'))) await page.mouse.click(200, 400);
await page.waitForTimeout(900);
await page.screenshot({ path: out('lucky-burst') });
await page.waitForTimeout(3000);
await page.screenshot({ path: out('lucky-reveal') });
await page.evaluate(() => { window.__forceLucky = false; });
await browser.close();
srv.close();
