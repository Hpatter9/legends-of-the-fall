// Browser checks for the roster, hero navigation and equipment, at the three portrait sizes.
// Serve `out/web` first. Playwright is a separate developer tool, not a game dependency.
// GAME_URL and PLAYWRIGHT_MODULE may select a server and an installed Playwright module.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const url = process.env.GAME_URL || 'http://127.0.0.1:8000';
const samples = process.env.UI_SAMPLES || 'out/ui-checks';
mkdirSync(samples, { recursive: true });
const browser = await chromium.launch({ args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const results = [];
try {
  for (const [width, height] of [[360, 780], [393, 852], [412, 915]]) {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.addInitScript(() => {
      localStorage.setItem('legends.settings', JSON.stringify({ music: 0, effects: 0, cinematics: false, quips: false }));
    });
    const load = async () => {
      await page.goto(`${url}/?seed=123`);
      await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
      await page.evaluate(() => document.getElementById('tipSkip')?.click());
    };
    await load();
    await page.evaluate(() => window.__game.home.open());
    await page.getByRole('button', { name: 'Heroes', exact: true }).click();
    await page.locator('.heroRoster').waitFor();
    const cards = page.locator('.rosGrid .hcard:visible');
    const total = await cards.count();
    assert.ok(total > 0, 'Starter heroes are visible');
    await page.getByRole('searchbox').fill('no such hero 12345');
    assert.equal(await cards.count(), 0);
    assert.equal(await page.getByRole('status').filter({ hasText: '0 heroes found' }).count(), 1);
    await page.getByRole('searchbox').fill('');
    assert.equal(await cards.count(), total);
    await page.screenshot({ path: `${samples}/roster-${width}x${height}.png` });

    // A locked hero stays locked and still explains its unlock route.
    await page.locator('.heroRoster .rosRow').first().click();
    assert.equal(await page.getByRole('tab').count(), 0);
    await page.locator('.heroBack').click();
    await cards.first().click();
    assert.equal(await page.getByRole('tab', { selected: true }).textContent(), 'Overview');
    await page.getByRole('tab', { name: 'Equipment', exact: true }).click();
    assert.equal(await page.locator('.eqSlots button').count(), 3);
    assert.equal(await page.locator('.heroTabPanel:visible').count(), 1);
    await page.locator('.heroStrip button').nth(1).click();
    assert.equal(await page.getByRole('tab', { selected: true }).textContent(), 'Equipment');
    // Keyboard navigation uses one tab stop and moves focus with arrow keys.
    await page.getByRole('tab', { name: 'Equipment', exact: true }).focus();
    await page.keyboard.press('ArrowLeft');
    assert.equal(await page.getByRole('tab', { selected: true }).textContent(), 'Progression');
    await page.keyboard.press('End');
    assert.equal(await page.getByRole('tab', { selected: true }).textContent(), 'Equipment');

    // Test-only inventory, made of valid existing catalogue entries, never a player save.
    await page.evaluate(() => {
      const g = window.__game;
      const bases = ['ironSword', 'plateCuirass', 'ironRing', 'claymore', 'ironSword', 'ironSword', 'ironSword'];
      g.meta.equipment = bases.map((base, i) => ({ id: i + 1, base, rarity: i < 4 ? 3 : 1, level: 18 }));
      g.meta.equipped = {};
      g.meta.nextItem = 8;
      g.home.openSheet(g.meta.unlocked[0], true, 'equipment');
    });
    await page.locator('#hero-equipment').getByRole('button', { name: 'Equip best', exact: true }).click();
    assert.equal(await page.locator('.eqSlotLevel').count(), 3);
    await page.locator('.eqSlot').first().click();
    assert.ok(await page.locator('.eqStat').count() > 0, 'Item comparison stats appear');
    const unequip = page.getByRole('button', { name: 'Unequip', exact: true });
    assert.ok(await unequip.count() > 0, 'Worn item can be removed');
    await unequip.click();
    await page.locator('#hero-equipment').getByRole('button', { name: 'Back', exact: true }).click();
    assert.equal(await page.locator('.eqSlotLevel').count(), 2);
    await page.locator('#hero-equipment').getByRole('button', { name: 'Equip best', exact: true }).click();
    await page.locator('#hero-equipment').getByRole('button', { name: 'Combine', exact: false }).last().click();
    await page.locator('#hero-equipment').getByRole('button', { name: 'Combine', exact: true }).click();
    await page.locator('#hero-equipment').getByRole('button', { name: 'Back', exact: true }).click();
    await page.locator('#hero-equipment').getByRole('button', { name: 'All sets', exact: true }).click();
    assert.ok(await page.locator('.eqSet').count() > 0);
    await page.locator('#hero-equipment').getByRole('button', { name: 'Back', exact: true }).click();
    await page.locator('.heroDetail').evaluate((e) => { e.scrollTop = 0; });
    await page.screenshot({ path: `${samples}/equipment-${width}x${height}.png` });

    const bounds = await page.evaluate(() => {
      const sheet = document.querySelector('.heroDetail');
      const tabs = document.getElementById('hmTabs');
      return { sheetRight: sheet.getBoundingClientRect().right, sheetBottom: sheet.getBoundingClientRect().bottom, tabsTop: tabs.getBoundingClientRect().top, overflow: sheet.scrollWidth > sheet.clientWidth + 1 };
    });
    assert.ok(bounds.sheetRight <= width && !bounds.overflow, 'No horizontal overflow');
    assert.ok(bounds.sheetBottom <= bounds.tabsTop + 1, 'Persistent navigation stays clear of hero details');
    await page.getByRole('button', { name: 'Battle', exact: true }).click();
    assert.equal(await page.locator('.heroDetail:visible').count(), 0);
    // All original destinations remain available in the main navigation.
    for (const name of ['Recruit', 'Castle', 'Spells', 'Heroes']) {
      await page.getByRole('button', { name, exact: true }).click();
    }
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('legends.meta')));
    assert.ok(saved.equipped && Object.keys(saved.equipped).length > 0);
    await load();
    assert.deepEqual(await page.evaluate(() => window.__game.meta.equipped), saved.equipped, 'Equipment survives reload');
    assert.equal(errors.length, 0, errors.join('\n'));
    results.push({ width, height, checks: 'roster search; locked hero; hero switching; tab keyboard; equip/unequip; combine; sets; navigation; bounds; save reload', errors });
    console.log(`PASS ${width}x${height}`);
    await context.close();
  }
  writeFileSync(`${samples}/results.json`, JSON.stringify(results, null, 2));
} finally {
  await browser.close();
}
