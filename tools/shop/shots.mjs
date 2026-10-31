// Screenshots of Hester's Stall, the skill books and gear wear (SHOP-BOOKS-GEAR) at the three phone sizes. Run after `npm run web`;
// the pictures go to docs/samples/shop-*.png (with the size in the name for any size but 393x852).
//   node tools/shop/shots.mjs [port]
import { serve, launch, boot, SIZES } from './lib.mjs';
const port = Number(process.argv[2] ?? 8941);
const srv = serve('out/web', port);
const browser = await launch();
const gear = [
  { id: 1, base: 'runedBlade', rarity: 3, level: 7, wear: 50 },
  { id: 2, base: 'leatherJerkin', rarity: 2, level: 4, wear: 44 },
  { id: 3, base: 'luckyCharm', rarity: 1, level: 3, wear: 6 },
  { id: 4, base: 'ironSword', rarity: 1, level: 1 },
  { id: 5, base: 'ironSword', rarity: 1, level: 2, wear: 12 },
  { id: 6, base: 'katana', rarity: 1, level: 3 },
  { id: 7, base: 'katana', rarity: 1, level: 1 },
  { id: 8, base: 'frostbrand', rarity: 3, level: 9, wear: 30 },
  { id: 9, base: 'huntersBow', rarity: 2, level: 4 },
  { id: 10, base: 'plateCuirass', rarity: 2, level: 5, wear: 47 },
];
const extra = {
  equipment: gear, equipped: { knight: { weapon: 1, armour: 2, trinket: 3 }, archer: { armour: 10 } }, nextItem: 11,
  books: { firstFires: 1, shieldwallDrill: 2, riverbankIaido: 1, pocketbook: 1 },
  learned: { knight: ['whirlingStep'] }, loadout: { knight: ['whirlingStep', 'own2'] },
  study: { archer: { book: 'boatswainsHook', done: 2 } },
  stall: { day: 0, sold: {}, spent: 4600 },
};
const show = async (page, sel) => {
  // (the sheet's tabs stay stuck at its top: the panel is scrolled to just under them)
  await page.evaluate((sel) => {
    const e = document.querySelector(sel);
    e?.scrollIntoView({ block: 'start' });
    const tabs = document.querySelector('.heroTabs');
    if (e && tabs) e.closest('.hsheet')?.scrollBy?.(0, -tabs.getBoundingClientRect().height - 8);
  }, sel);
  await page.waitForTimeout(400);
};
const click = async (page, sel, text) => {
  await page.evaluate(([sel, text]) => { const e = [...document.querySelectorAll(sel)].find((x) => !text || x.textContent.includes(text)); e?.click(); }, [sel, text]);
  await page.waitForTimeout(900);
};
for (const [w, h] of SIZES) {
  const tag = w === 393 ? '' : `-${w}x${h}`;
  const out = (n) => `docs/samples/shop-${n}${tag}.png`;
  const { ctx, page, errors } = await boot(browser, port, w, h, extra);
  await page.screenshot({ path: out('camp') });
  await click(page, '#hmStall');
  await page.waitForTimeout(800);
  await page.screenshot({ path: out('books') });
  if (w === 393) {
    await click(page, '.hsWare');
    await page.screenshot({ path: out('book-page') });
    await click(page, '.hsShut');
    await click(page, '.hsTab', 'Gear');
    await page.screenshot({ path: out('gear') });
    await click(page, '.hsTab', 'Chests');
    await page.screenshot({ path: out('chests') });
    await click(page, '.hsTab', 'Repair');
    await page.screenshot({ path: out('repair') });
  }
  await click(page, '.hsTab', 'Sell');
  await page.screenshot({ path: out('sell') });
  await click(page, '.hsBack');
  // (the knight's sheet, on its Skills tab: the Skill book panel)
  await click(page, '.hmTab', 'Heroes');
  await click(page, 'button', 'All heroes');
  await click(page, '.hcard', 'Kwame');
  await click(page, '.heroTabs button, [role=tab]', 'Skills');
  await show(page, '.kbPanel');
  await page.screenshot({ path: out('skill-book') });
  if (w === 393) {
    await click(page, '.kbSlot');
    await show(page, '.kbPanel');
    await page.screenshot({ path: out('skill-picker') });
    await click(page, '.kbPanel button', 'Back');
    await click(page, '.kbRead');
    await show(page, '.kbPanel');
    await page.screenshot({ path: out('read-a-book') });
    await click(page, '.kbPanel button', 'Back');
    await click(page, '.heroTabs button, [role=tab]', 'Equipment');
    await show(page, '.eqPanel');
    await page.screenshot({ path: out('equipment-wear') });
    await click(page, '.eqSlot');
    await show(page, '.eqPanel');
    await page.screenshot({ path: out('equipment-repair') });
  }
  console.log(w, h, errors.length ? `${errors.length} page errors` : 'no page errors');
  await ctx.close();
}
await browser.close();
srv.close();
