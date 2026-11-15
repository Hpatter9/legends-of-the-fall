// HERO-LIVE-STATS in the Assault (docs/notes/hero-live-stats.md): a real assault (Settings, Developer, Try an Assault: the orcs' hold, "As
// expected", the design party) on Auto at x2; once the platoons have met the foe, the Knight's platoon chosen and its "Stats" order opened;
// then the Wizard's platoon chosen (the panel follows); then "‹ Orders". At 393x852, 360x780 and 412x915 (`SIZES`). After `npm run web`:
//   node tools/hero-live-stats/assault.mjs
// Writes docs/samples/hero-live-assault-<scene>-<w>.png.
import { serve, launch, open, out, wait, SIZES } from '../sweep-1110/lib.mjs';
const PORT = 8933;
const server = serve(PORT);
const browser = await launch();
const dir = out('docs/samples');
const MARCH = Number(process.env.MARCH ?? 45000);
let bad = 0;
const choose = (page, k) => page.evaluate((k) => { const p = document.querySelectorAll('.asPlatoons > .asPort')[k]; p.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); p.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); }, k);
const state = (page) => page.evaluate(() => {
  const l = document.querySelector('#assaultScene .fhLive');
  const r = l?.getBoundingClientRect();
  return {
    open: !!l && !l.hidden,
    name: l?.querySelector('.fhlWho b')?.textContent,
    fight: l?.querySelector('.fhlFight')?.textContent,
    fx: [...(l?.querySelectorAll('.fhlEff span') ?? [])].map((s) => s.textContent),
    box: r ? [Math.round(r.top), Math.round(r.bottom)] : null,
    scroll: l ? l.scrollHeight > l.clientHeight + 1 : null,
    orders: !!document.querySelector('.asOrders:not([hidden])')?.offsetParent,
    pageW: document.documentElement.scrollWidth,
  };
});
for (const [w, h] of SIZES) {
  const { ctx, page, log } = await open(browser, w, h, PORT);
  await page.evaluate(() => window.__game.tryAssault({ army: 'orcs', kind: 'hold', strength: 'expected', heroes: 'design' }));
  await wait(page, 1500);
  await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => /^March/.test(b.textContent.trim()) && b.offsetParent)?.click());
  await page.waitForFunction(() => document.querySelector('#assaultScene .asTop'), null, { timeout: 60000 });
  await wait(page, 2500);
  await page.evaluate(() => {
    const bs = [...document.querySelectorAll('.asTop button')];
    const auto = bs.find((b) => b.textContent === 'Auto');
    if (auto && !auto.classList.contains('on')) auto.click();
    bs.find((b) => b.textContent === 'x1')?.click();
  });
  await wait(page, MARCH);
  const names = await page.evaluate(() => [...document.querySelectorAll('.asPlatoons > .asPort')].map((p) => p.getAttribute('aria-label')));
  const k1 = Math.max(0, names.findIndex((n) => /Kwame|knight/i.test(n ?? '')));
  await choose(page, k1);
  await wait(page, 400);
  await page.screenshot({ path: `${dir}/hero-live-assault-orders-${w}.png` });
  await page.evaluate(() => [...document.querySelectorAll('.asOrders button')].find((b) => b.textContent === 'Stats')?.click());
  await wait(page, 900);
  console.log(w, 'stats', JSON.stringify(await state(page)));
  await page.screenshot({ path: `${dir}/hero-live-assault-stats-${w}.png` });
  await choose(page, (k1 + 2) % 5);
  await wait(page, 900);
  console.log(w, 'another', JSON.stringify(await state(page)));
  await page.screenshot({ path: `${dir}/hero-live-assault-another-${w}.png` });
  await page.evaluate(() => document.querySelector('#assaultScene .fhlBack')?.click());
  await wait(page, 400);
  const back = await state(page);
  console.log(w, 'back', JSON.stringify(back));
  await page.screenshot({ path: `${dir}/hero-live-assault-back-${w}.png` });
  console.log(`${w}x${h}: errors ${log.errors.length}`, log.errors.slice(0, 3));
  bad += log.errors.length;
  await ctx.close();
}
await browser.close();
server.close();
process.exit(bad ? 1 : 0);
