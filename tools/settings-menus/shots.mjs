// Browser checks and shots for the Settings pickers (the ruler and Duchess's costume) and the developer row's stones.
// Run from the repo root after `npm run web`: node tools/settings-menus/shots.mjs
import assert from 'node:assert/strict';
import { serve, launch, boot } from '../battle-ui/lib.mjs';
const PORT = 8240;
const server = serve('out/web', PORT);
const browser = await launch();
const shown = (page) => page.evaluate(() => { const o = document.querySelector('.spOverlay'); return !!o && !o.hidden && getComputedStyle(o).display !== 'none'; });
let bad = 0;
const SIZES = process.argv[2] ? [process.argv[2].split('x').map(Number)] : [[393, 852], [360, 780], [412, 915]];
for (const [w, h] of SIZES) {
  const { ctx, page, errors } = await boot(browser, w, h, PORT);
  await page.locator('#hmGear').click();
  await page.locator('.setMenu[data-page="ruler"]').click(); // (the ruler sits in its own submenu since the options were condensed)
  await page.locator('.rulerOpen').waitFor();
  assert.equal(await page.locator('.rulerChoice').count(), 0, 'the eight are not laid out in the page');
  await page.screenshot({ path: `docs/samples/settings-menus-closed-${w}x${h}.png` });
  // open, then pick the third
  await page.locator('.rulerOpen').click();
  assert.ok(await shown(page));
  assert.equal(await page.locator('.rulerChoice').count(), 8);
  await page.screenshot({ path: `docs/samples/settings-menus-rulers-${w}x${h}.png` });
  await page.locator('.rulerChoice').nth(2).click();
  assert.ok(!(await shown(page)), 'a pick closes it');
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('legends.settings')).ruler), 'ash_empress');
  assert.match(await page.locator('.rulerRow em').innerText(), /Ash Empress/);
  // ✕, the backdrop and Escape each close it
  await page.locator('.rulerOpen').click();
  assert.equal(await page.locator('.rulerChoice[aria-pressed="true"]').getAttribute('aria-label'), 'Ash Empress, The Conqueror');
  await page.locator('.spClose').click();
  assert.ok(!(await shown(page)), '✕ closes it');
  await page.locator('.rulerOpen').click();
  await page.mouse.click(3, h - 3);
  assert.ok(!(await shown(page)), 'the backdrop closes it');
  await page.locator('.rulerOpen').click();
  await page.keyboard.press('Escape');
  assert.ok(!(await shown(page)), 'Escape closes it');
  // closing Settings with the picker up closes the picker too
  await page.locator('.rulerOpen').click();
  await page.evaluate(() => document.getElementById('settingsClose').click());
  assert.ok(!(await shown(page)));
  await page.locator('#hmGear').click();
  // Duchess's costume picker
  await page.locator('.costumeOpen').click();
  assert.equal(await page.locator('.costumeChoice').count(), 4);
  await page.screenshot({ path: `docs/samples/settings-menus-costume-${w}x${h}.png` });
  await page.locator('.costumeChoice.locked').first().click({ force: true });
  assert.ok(await shown(page), 'a locked costume does not pick');
  await page.keyboard.press('Escape');
  // the developer row: six buttons, the stones among them
  const dev = page.locator('.devGrant');
  await dev.scrollIntoViewIfNeeded();
  assert.equal(await dev.locator('button').count(), 6);
  const over = await dev.evaluate((g) => [...g.querySelectorAll('button')].some((b) => b.scrollWidth > b.clientWidth + 1 || b.getBoundingClientRect().right > innerWidth));
  assert.ok(!over, 'the six fit');
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem('legends.meta')).stones ?? 0);
  await dev.getByText('+1000 stones').click();
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('legends.meta')).stones), before + 1000);
  await page.locator('.setting', { has: dev }).screenshot({ path: `docs/samples/settings-menus-dev-${w}x${h}.png` });
  await page.screenshot({ path: `docs/samples/settings-menus-devpage-${w}x${h}.png` });
  if (errors.length) { bad++; console.log('errors', errors); }
  console.log('PASS', w, h);
  await ctx.close();
}
await browser.close();
server.close();
process.exit(bad ? 1 : 0);
