// Does every join play the unlock show? Plays pulls that are sure to recruit (every hero not owned sits one shard short,
// or the lucky roll is forced) from the hall and from the card reveal, 1 and 10 at a time, and reports for each pull
// whether a hero joined and whether the hall's show ran. (SUMMON-TAROT, the owner's bug report.)
//   npm run web && node tools/summon-tarot/join-show.mjs [port]
import { serve, HEROES, saveScript } from '../audit/lib.mjs';
import { createRequire } from 'node:module';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const port = Number(process.argv[2] ?? 8250);
const srv = serve('out/web', port);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const OWNED = HEROES.slice(0, 8);
const short = Object.fromEntries(HEROES.slice(8).map((k) => [k, 200]));

async function page0(extra = {}) {
  const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
  await page.addInitScript(saveScript(), [OWNED, { stones: 60, unlock: short, ...extra }]);
  await page.goto(`http://localhost:${port}/`);
  await page.waitForFunction(() => [...document.querySelectorAll('.hmTab')].some((b) => b.offsetWidth), {}, { timeout: 90000 });
  await page.waitForTimeout(500);
  await page.evaluate(() => document.getElementById('tipSkip')?.click());
  return { ctx, page };
}
const toRecruit = (page) => page.evaluate(() => { for (const b of document.querySelectorAll('.hmTab')) if (b.textContent.includes('Recruit')) b.click(); });
/** Watch for the show over `ms`: true once the hall's skip pad is on. */
const watch = (page, ms = 1500) => page.evaluate((ms) => new Promise((done) => {
  const t0 = performance.now();
  const tick = () => {
    if (document.querySelector('.hlSkip.on')) return done(true);
    if (performance.now() - t0 > ms) return done(false);
    requestAnimationFrame(tick);
  };
  tick();
}), ms);
/** Skip a running show, wait for the reveal, and count the joins in it. */
async function settle(page) {
  if (await page.evaluate(() => !!document.querySelector('.hlSkip.on'))) await page.mouse.click(200, 400);
  await page.waitForFunction(() => !document.getElementById('gacha').hidden, {}, { timeout: 20000 });
  return page.evaluate(() => document.querySelectorAll('#reveal .flip.new').length);
}
const rows = [];
const ONLY = process.env.ONLY;
async function scenario(name, fn) {
  if (ONLY && !name.includes(ONLY)) return;
  const { ctx, page } = await page0();
  try { await fn(page, (label, show, joins) => rows.push({ name, label, joins, show })); } finally { await ctx.close(); }
}
const hallPull = async (page, n) => { await page.locator('.hlBar button').nth(n === 1 ? 0 : 1).click(); const show = await watch(page); return [show, await settle(page)]; };
const againPull = async (page, n) => { await page.evaluate((n) => document.getElementById(n === 1 ? 'pull1' : 'pull10').click(), n); const show = await watch(page); return [show, await settle(page)]; };
const lucky = (page, on) => page.evaluate((on) => { window.__forceLucky = on; }, on);

await scenario('hall 1-pull after load (settled)', async (page, log) => {
  await toRecruit(page); await page.waitForTimeout(1200);
  const [s, j] = await hallPull(page, 1); log('pull 1', s, j);
  await page.evaluate(() => document.getElementById('gachaClose').click()); await page.waitForTimeout(1200);
  const [s2, j2] = await hallPull(page, 1); log('pull 2 (back in hall)', s2, j2);
});
await scenario('hall 1-pull at once (no wait after the tab)', async (page, log) => {
  await toRecruit(page);
  const [s, j] = await hallPull(page, 1); log('pull 1', s, j);
});
await scenario('from the reveal screen', async (page, log) => {
  await toRecruit(page); await page.waitForTimeout(1200);
  const [s, j] = await hallPull(page, 1); log('hall pull', s, j);
  const [s2, j2] = await againPull(page, 1); log('reveal: 1 again', s2, j2);
  const [s3, j3] = await againPull(page, 10); log('reveal: 10 again', s3, j3);
});
await scenario('hall 10-pull', async (page, log) => {
  await toRecruit(page); await page.waitForTimeout(1200);
  const [s, j] = await hallPull(page, 10); log('pull 10', s, j);
});
await scenario('lucky', async (page, log) => {
  await toRecruit(page); await page.waitForTimeout(1200);
  await lucky(page, true);
  const [s, j] = await hallPull(page, 1); log('hall lucky', s, j);
  const [s2, j2] = await againPull(page, 1); log('reveal lucky', s2, j2);
});
await scenario('after another tab', async (page, log) => {
  await toRecruit(page); await page.waitForTimeout(800);
  await page.evaluate(() => { for (const b of document.querySelectorAll('.hmTab')) if (b.textContent.includes('Heroes')) b.click(); });
  await page.waitForTimeout(500);
  await toRecruit(page);
  const [s, j] = await hallPull(page, 1); log('pull at once after a tab change', s, j);
});
await scenario('from the collection (View heroes) then Use 1 stone', async (page, log) => {
  await toRecruit(page); await page.waitForTimeout(1200);
  await page.evaluate(() => [...document.querySelectorAll('button, a')].find((b) => /View heroes/.test(b.textContent))?.click());
  await page.waitForTimeout(600);
  const [s, j] = await againPull(page, 1); log('pull from the collection screen', s, j);
});
await scenario('double tap on Use 1 stone', async (page, log) => {
  await toRecruit(page); await page.waitForTimeout(1200);
  const box = await page.locator('.hlBar button').first().boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(250);
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  const t0 = Date.now();
  await page.waitForFunction(() => !document.getElementById('gacha').hidden, {}, { timeout: 20000 });
  const j = await page.evaluate(() => document.querySelectorAll('#reveal .flip.new').length);
  log(`second tap 250 ms later: results after ${Date.now() - t0 + 250} ms (the full show is about 5 s)`, true, j);
});
console.table(rows);
await browser.close();
srv.close();
