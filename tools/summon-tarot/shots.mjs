// SUMMON-TAROT screenshots, in the real page: a single shard's card (a real stone), a real ten-stone draw with a join (the spread
// as the cards turn, the join's unlock scene, the spread after), and the first-time reveal held at each beat through `__tarot`
// (so the beats are caught exactly). Also at 360x780 and 412x915 (W, H), and with reduced motion (REDUCED=1).
//   npm run web && node tools/summon-tarot/shots.mjs [port]
import { serve, HEROES, saveScript } from '../audit/lib.mjs';
import { createRequire } from 'node:module';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const port = Number(process.argv[2] ?? 8253);
const srv = serve('out/web', port);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const W = Number(process.env.W ?? 393), H = Number(process.env.H ?? 852);
const REDUCED = !!process.env.REDUCED;
const tag = REDUCED ? '-reduced' : W !== 393 ? `-${W}x${H}` : '';
const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, hasTouch: true, reducedMotion: REDUCED ? 'reduce' : 'no-preference' });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => { errors.push(e.message); console.log('PAGE ERROR', e.message); });
const OWNED = HEROES.slice(0, 8);
// (one hero with its bar all but full, so the ten-stone draw brings it in; a few begun, so the shard cards show their bars)
await page.addInitScript(saveScript(), [OWNED, { stones: 60, heroesSeen: OWNED, unlock: { kitsune: 4, karasu: 2, werewolf: 6, lightningMage: 200 }, shards: { knight: 3, samurai: 1 } }]);
await page.goto(`http://localhost:${port}/`);
await page.waitForFunction(() => [...document.querySelectorAll('.hmTab')].some((b) => b.offsetWidth), {}, { timeout: 90000 });
await page.waitForTimeout(500);
await page.evaluate(() => document.getElementById('tipSkip')?.click());
await page.evaluate(() => { for (const b of document.querySelectorAll('.hmTab')) if (b.textContent.includes('Recruit')) b.click(); });
await page.waitForTimeout(1500);
const shot = (name) => page.screenshot({ path: `docs/samples/summon-tarot-${name}${tag}.png` });
const tapReveal = async () => {
  await page.waitForFunction(() => document.querySelector('.tarotReveal')?.dataset.stage === '4', {}, { timeout: 20000 });
  await page.waitForTimeout(600);
  await page.mouse.click(W / 2, H / 2);
  await page.waitForTimeout(500);
};

// 1. one stone: a shard (the hero with 200 shards is set aside first, so this one is a shard)
await page.evaluate(() => { const m = window.__game.meta; m.unlock.lightningMage = 1; });
await page.locator('.hlBar button').first().click();
await page.waitForFunction(() => !document.getElementById('gacha').hidden, {}, { timeout: 20000 });
await page.waitForTimeout(1300);
await shot('single');

// 2. ten stones, from the cards, with one hero all but in
await page.evaluate(() => { window.__game.meta.unlock.lightningMage = 200; });
await page.evaluate(() => document.getElementById('pull10').click());
await page.waitForFunction(() => document.querySelectorAll('#reveal .tarotResult.up').length === 10, {}, { timeout: 20000 });
await page.waitForTimeout(550);
if (!REDUCED) await shot('ten-spread');
const joined = await page.evaluate(() => document.querySelectorAll('#reveal .tarotResult.joined').length);
if (joined) {
  await page.waitForSelector('.tarotReveal', { timeout: 20000 });
  await page.waitForTimeout(REDUCED ? 1400 : 3300);
  if (!REDUCED) await shot('ten-reveal');
  await tapReveal();
  for (let i = 1; i < joined; i++) await tapReveal();
}
await page.waitForTimeout(600);
await shot('ten-after');

// 3. the first-time reveal held at each beat (a join by shards, and a lucky stone)
const beats = REDUCED ? [1, 4] : [1, 2, 3, 4];
for (const [kind, lucky] of [['kitsune', false], ['gorgon', true]]) {
  for (const hold of beats) {
    await page.evaluate(([kind, lucky, hold]) => { void window.__tarot.firstReveal(window.__game.meta, kind, { lucky, hold }); }, [kind, lucky, hold]);
    await page.waitForTimeout(REDUCED ? (hold === 1 ? 500 : 1500) : [0, 700, 1250, 2400, 3700][hold]);
    await shot(`reveal-${kind}-${hold}`);
    await page.evaluate(() => document.querySelectorAll('.tarotReveal').forEach((e) => e.remove()));
  }
  if (W !== 393) break;
}
console.log(JSON.stringify({ size: `${W}x${H}`, reduced: REDUCED, joined, errors }));
await browser.close();
srv.close();
