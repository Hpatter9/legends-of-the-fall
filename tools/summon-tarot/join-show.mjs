// Does every join play its unlock scene (the first-time reveal, `summonTarot.ts`)? Plays pulls that are sure to recruit (every
// hero not owned sits one shard short, or the lucky roll is forced) from the hall and from the cards, 1 and 10 at a time, with a
// double tap, after a tab change and from the collection; and loads a save whose last join missed its reveal. Reports for each
// whether a hero joined and whether its reveal played. (SUMMON-TAROT, the owner's bug report.)
//   npm run web && node tools/summon-tarot/join-show.mjs [port]      (ONLY=<words> for the scenarios whose names hold them)
import { serve, HEROES, saveScript } from '../audit/lib.mjs';
import { createRequire } from 'node:module';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const port = Number(process.argv[2] ?? 8250);
const srv = serve('out/web', port);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const OWNED = HEROES.slice(0, 8);
const short = Object.fromEntries(HEROES.slice(8).map((k) => [k, 200]));
const W = Number(process.env.W ?? 393), H = Number(process.env.H ?? 852);

async function page0(extra = {}) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, hasTouch: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => { errors.push(e.message); console.log('PAGE ERROR', e.message); });
  await page.addInitScript(saveScript(), [OWNED, { stones: 60, unlock: short, heroesSeen: OWNED, ...extra }]);
  await page.goto(`http://localhost:${port}/`);
  await page.waitForFunction(() => [...document.querySelectorAll('.hmTab')].some((b) => b.offsetWidth), {}, { timeout: 90000 });
  await page.waitForTimeout(500);
  await page.evaluate(() => document.getElementById('tipSkip')?.click());
  return { ctx, page, errors };
}
const toRecruit = (page) => page.evaluate(() => { for (const b of document.querySelectorAll('.hmTab')) if (b.textContent.includes('Recruit')) b.click(); });
/** Every first-time reveal shown until the screen settles: each is tapped to its end and closed; returns the heroes revealed. */
async function settle(page, ms = 90000) {
  const seen = [];
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const on = await page.evaluate(() => document.querySelector('.tarotReveal h3')?.textContent ?? null);
    if (on) {
      seen.push(on);
      // (wait for the whole scene, then a tap closes it)
      await page.waitForFunction(() => document.querySelector('.tarotReveal')?.dataset.stage === '4', {}, { timeout: 15000 });
      await page.waitForTimeout(500);
      await page.mouse.click(W / 2, H / 2);
      await page.waitForTimeout(300);
      continue;
    }
    const idle = await page.evaluate(() => !document.getElementById('gacha').hidden && !document.getElementById('pull1').disabled && !document.querySelector('.tarotReveal'));
    if (idle && Date.now() - t0 > 1500) break;
    await page.waitForTimeout(150);
  }
  return seen;
}
const joinsShown = (page) => page.evaluate(() => [...document.querySelectorAll('#reveal .tarotResult.joined')].map((r) => ({ kind: r.dataset.kind, figure: !!r.querySelector('.tarotFig') })));
const rows = [];
const ONLY = process.env.ONLY;
async function scenario(name, fn, extra) {
  if (ONLY && !ONLY.split(' ').some((w) => name.includes(w))) return;
  const { ctx, page, errors } = await page0(extra);
  try {
    await fn(page, async (label) => {
      const revealed = await settle(page);
      const joins = await joinsShown(page);
      const { seen, unseen, owned } = await page.evaluate(() => {
        const m = JSON.parse(localStorage.getItem('legends.meta'));
        return { seen: m.heroesSeen.length, owned: m.unlocked.length, unseen: m.unlocked.filter((k) => !m.heroesSeen.includes(k)).length };
      });
      // (cards closed early, by a stray tap on Continue, show no figure: the reveal still has to have played)
      const closed = await page.evaluate(() => document.getElementById('gacha').hidden);
      rows.push({ name, label, joins: joins.length, reveals: revealed.length, figures: joins.filter((j) => j.figure).length, owned, seenSaved: seen, unseen, ok: owned > 8 && unseen === 0 && revealed.length === joins.length && (closed || joins.every((j) => j.figure)) });
    });
  } finally {
    if (errors.length) rows.push({ name, label: 'page errors', ok: false, errors: errors.join(' | ') });
    await ctx.close();
  }
}
const hallPull = async (page, n) => page.locator('.hlBar button').nth(n === 1 ? 0 : 1).click();
const cardsPull = async (page, n) => page.evaluate((n) => document.getElementById(n === 1 ? 'pull1' : 'pull10').click(), n);
const lucky = (page, on) => page.evaluate((on) => { window.__forceLucky = on; }, on);

await scenario('hall 1-pull', async (page, log) => {
  await toRecruit(page); await page.waitForTimeout(1200);
  await hallPull(page, 1); await log('pull 1');
  await page.evaluate(() => document.getElementById('gachaClose').click()); await page.waitForTimeout(1200);
  await hallPull(page, 1); await log('pull 2 (back in the hall)');
});
await scenario('hall 1-pull at once', async (page, log) => {
  await toRecruit(page);
  await hallPull(page, 1); await log('pull 1, no wait after the tab');
});
await scenario('from the cards', async (page, log) => {
  await toRecruit(page); await page.waitForTimeout(1200);
  await hallPull(page, 1); await log('hall pull');
  await cardsPull(page, 1); await log('cards: 1 again');
  await cardsPull(page, 10); await log('cards: 10 again');
});
await scenario('hall 10-pull', async (page, log) => {
  await toRecruit(page); await page.waitForTimeout(1200);
  await hallPull(page, 10); await log('pull 10');
});
await scenario('lucky', async (page, log) => {
  await toRecruit(page); await page.waitForTimeout(1200);
  await lucky(page, true);
  await hallPull(page, 1); await log('hall lucky');
  await cardsPull(page, 1); await log('cards lucky');
  await cardsPull(page, 10); await log('cards lucky ten');
}, { unlock: {} });
await scenario('after a tab change', async (page, log) => {
  await toRecruit(page); await page.waitForTimeout(800);
  await page.evaluate(() => { for (const b of document.querySelectorAll('.hmTab')) if (b.textContent.includes('Heroes')) b.click(); });
  await page.waitForTimeout(500);
  await toRecruit(page);
  await hallPull(page, 1); await log('pull at once after a tab change');
});
await scenario('from the collection', async (page, log) => {
  await toRecruit(page); await page.waitForTimeout(1200);
  await page.evaluate(() => [...document.querySelectorAll('button, a')].find((b) => /View heroes/.test(b.textContent))?.click());
  await page.waitForTimeout(600);
  await cardsPull(page, 1); await log('pull from the collection screen');
});
await scenario('double tap', async (page, log) => {
  await toRecruit(page); await page.waitForTimeout(1200);
  await page.locator('.hlBar button').first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  const box = await page.locator('.hlBar button').first().boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(250);
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(250);
  await page.mouse.click(W / 2, H / 2);
  // (the stray taps must not have closed the reveal: it is still there, at most jumped to the hero in full view)
  const still = await page.evaluate(() => document.querySelector('.tarotReveal')?.dataset.stage ?? 'none');
  if (process.env.DEBUG) { console.log(box, await page.evaluate(() => [document.getElementById('gacha').hidden, localStorage.getItem('legends.meta').length])); await page.screenshot({ path: 'out/shots/dbl.png' }); }
  await log(`double tap then a stray tap: the reveal at beat ${still}`);
});
await scenario('missed reveal on load', async (page, log) => {
  // (the save's last join never had its reveal: it plays when the home screen opens)
  const revealed = await settle(page, 8000);
  rows.push({ name: 'missed reveal on load', label: 'home opens', reveals: revealed.length, ok: revealed.length === 1 });
}, { unlocked: [...OWNED, 'kitsune'], heroesSeen: OWNED });
console.table(rows);
const bad = rows.filter((r) => !r.ok);
console.log(bad.length ? `FAILED: ${bad.length}` : 'every join played its reveal');
await browser.close();
srv.close();
process.exit(bad.length ? 1 : 0);
