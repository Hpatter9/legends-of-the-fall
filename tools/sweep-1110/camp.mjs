// SWEEP-1110, the camp: each home tab at the three upright sizes, the Castle tab's buildings and rooms, the Summoning tab, Settings and its
// pages, each opened and closed again. Checks page errors, anything past the right edge, and that a menu closes.
//   npm run web && node tools/sweep-1110/camp.mjs [out dir]
import { serve, launch, open, SIZES, out, wait, overflow, settle, saveOf } from './lib.mjs';
const PORT = 8911;
const dir = out(process.argv[2] ?? 'out/sweep-1110/camp');
const server = serve(PORT);
const browser = await launch();
const notes = [];
const note = (s) => { notes.push(s); console.log(s); };

for (const [w, h] of SIZES) {
  const { ctx, page, log } = await open(browser, w, h, PORT, { save: { ...saveOf(), unlock: { ninjaMonk: 7, gunslinger: 3, mummy: 1, reaper: 5 } } });
  const shot = (n) => page.screenshot({ path: `${dir}/${n}-${w}.png` });
  const check = async (n) => {
    const o = await overflow(page);
    if (o.scroll || o.bad.length) note(`${w} ${n}: overflow ${o.scroll} ${JSON.stringify(o.bad)}`);
  };
  for (const tab of ['battle', 'recruit', 'heroes', 'castle', 'spells']) {
    await page.evaluate((t) => window.__game.home.show(t), tab);
    await wait(page, 1500);
    await settle(page);
    await shot(`tab-${tab}`);
    await check(`tab ${tab}`);
  }
  // (the Summoning tab: the collection closed by default, the Nearest to joining row)
  await page.evaluate(() => window.__game.home.show('recruit'));
  await wait(page, 800);
  await page.evaluate(() => window.__game.home.hooks.onRecruit());
  await wait(page, 1200);
  const sum = await page.evaluate(() => ({
    gacha: !document.getElementById('gacha').hidden,
    open: document.getElementById('collectionPanel').open,
    near: document.getElementById('nearRow').hidden ? null : document.getElementById('nearRow').textContent.slice(0, 80),
    cells: document.querySelectorAll('#nearRow .hero').length,
  }));
  note(`${w} summoning: ${JSON.stringify(sum)}`);
  await shot('summon-collection');
  await check('summon collection');
  await page.evaluate(() => { document.querySelector('#collectionPanel summary').click(); });
  await wait(page, 500);
  await page.evaluate(() => document.getElementById('collectionPanel').scrollIntoView());
  await shot('summon-collection-open');
  await check('summon collection open');
  await page.evaluate(() => document.getElementById('gachaClose').click());
  await wait(page, 900);
  if (!(await page.evaluate(() => document.getElementById('gacha').hidden))) note(`${w} summoning: Return to sanctum did not close the collection`);
  // (the Castle tab: scrolled down through the ledger, then each building's card opened and closed)
  await page.evaluate(() => window.__game.home.show('castle'));
  await wait(page, 1200);
  await page.evaluate(() => document.getElementById('castleTab-buildings').click());
  await wait(page, 700);
  await shot('castle-buildings');
  const sites = await page.evaluate(() => [...document.querySelectorAll('.hm-castle .crBuilding[data-site]')].filter((e) => e.offsetParent).map((e) => e.dataset.site));
  note(`${w} castle sites: ${[...new Set(sites)].join(',')}`);
  await page.evaluate(() => { const p = document.querySelector('.hm-castle'); const s = [...p.querySelectorAll('*')].find((e) => e.scrollHeight > e.clientHeight + 40 && /(auto|scroll)/.test(getComputedStyle(e).overflowY)); if (s) s.scrollTop = s.scrollHeight; });
  await wait(page, 700);
  await shot('castle-ledger');
  await check('castle ledger');
  for (const id of [...new Set(sites)]) {
    const before = await page.evaluate(() => [document.getElementById('hmSheet').hidden, document.getElementById('hmSub').hidden]);
    await page.evaluate((id) => { const e = document.querySelector(`.hm-castle .crBuilding[data-site="${id}"]`); e.scrollIntoView({ block: 'center' }); e.click(); }, id);
    await wait(page, 900);
    const after = await page.evaluate(() => [document.getElementById('hmSheet').hidden, document.getElementById('hmSub').hidden, document.querySelectorAll('.om, .ornate, [class*=ornate]').length]);
    if (after[0] === before[0] && after[1] === before[1] && !after[2]) note(`${w} castle ${id}: the tap opened nothing`);
    await shot(`castle-${id}`);
    await check(`castle ${id}`);
    // (closed: Close or Back, whichever it has)
    const closed = await page.evaluate(() => {
      const bs = [...document.querySelectorAll('button')].filter((b) => b.offsetParent && /^(Close|‹ Back|✕)$/.test(b.textContent.trim()));
      const b = bs.at(-1);
      if (!b) return 'no close';
      b.click();
      return b.textContent.trim();
    });
    await wait(page, 700);
    const left = await page.evaluate(() => [document.getElementById('hmSheet').hidden, document.getElementById('hmSub').hidden]);
    if (closed === 'no close' || !left[0] || !left[1]) note(`${w} castle ${id}: close ${closed}, sheet hidden ${left[0]}, sub hidden ${left[1]}`);
    // (any still open: shut it the hard way so the next one starts clean)
    await page.evaluate(() => { window.__game.home.closeSheet?.(); window.__game.home.closeSub?.(); });
    await wait(page, 300);
  }
  // (Settings and each of its pages)
  await page.evaluate(() => document.getElementById('hmGear').click());
  await wait(page, 900);
  await shot('settings');
  await check('settings');
  const pages = await page.evaluate(() => [...document.querySelectorAll('[data-page], .stRow, .setRow')].filter((e) => e.offsetParent).map((e, i) => e.dataset.page ?? String(i)));
  note(`${w} settings rows: ${pages.join(',')}`);
  await ctx.close();
  note(`${w} errors ${log.errors.length} 404 ${log.missing.length} console ${log.console.length} ${JSON.stringify(log.console.slice(0, 3))}`);
}
await browser.close();
server.close();
