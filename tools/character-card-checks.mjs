// Real-browser checks for the approved company card design. Uses test-only hero inventories.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const output = process.env.UI_SAMPLES || 'out/card-checks';
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const results = [];
try {
  // Reuse the loaded game: these checks exercise responsive UI, not independent saves.
  const context = await browser.newContext({ viewport: { width: 360, height: 780 } });
  const page = await context.newPage();
  page.setDefaultNavigationTimeout(120000);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => localStorage.setItem('legends.settings', JSON.stringify({ music: 0, effects: 0, cinematics: false, quips: false })));
  await page.goto(`${process.env.GAME_URL || 'http://127.0.0.1:8000'}/?seed=123`);
  await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
  await page.evaluate(() => document.fonts.ready);
  for (const [width, height] of [[360, 780], [393, 852], [412, 915]]) {
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.evaluate(() => {
      document.getElementById('tipSkip')?.click();
      const g = window.__game;
      g.meta.unlocked = ['samurai', 'wizard', 'paladin'];
      g.home.open();
      // Open the fixture directly so the animated camp does not compete with software WebGL.
      g.home.show('heroes');
    });
    await page.getByRole('button', { name: 'Heroes', exact: true }).click();
    const cards = page.locator('.rosGrid .hcard:visible');
    assert.equal(await cards.count(), 3);
    // Both the established class term and the banner's name remain searchable.
    for (const query of ['caster', 'mage']) {
      await page.getByRole('searchbox').fill(query);
      assert.equal(await cards.count(), 1);
      assert.match(await cards.textContent(), /Fire Wizard/);
    }
    await page.getByRole('searchbox').fill('');
    await page.screenshot({ path: `${output}/initial-${width}x${height}.png`, timeout: 90000 });
    await page.locator('.hcard[data-kind="samurai"]').click();
    await page.locator('.heroBack').click();
    assert.equal(await page.locator('.hcard.lastViewed[data-kind="samurai"]').count(), 1);
    await page.getByRole('searchbox').blur();
    await page.evaluate(async () => {
      for (const src of ['ui/hero-brass-frame.png', 'areas/forest/bg3.png']) {
        const image = new Image();
        image.src = src;
        await image.decode();
      }
    });
    await page.screenshot({ path: `${output}/roster-${width}x${height}.png` });
    const fit = await page.locator('.heroRoster').evaluate(sheet => {
      const r = sheet.getBoundingClientRect();
      return { overflow: sheet.scrollWidth > sheet.clientWidth + 1, bottom: r.bottom, navTop: document.getElementById('hmTabs').getBoundingClientRect().top,
        cards: [...sheet.querySelectorAll('.hcard')].map(card => {
          const c = card.getBoundingClientRect(); const b = card.querySelector('.heroLevelRibbon').getBoundingClientRect();
          return { left: c.left, right: c.right, ribbonBottom: b.bottom, nameClipped: card.querySelector('b').scrollHeight > card.querySelector('b').clientHeight + 1 };
        }) };
    });
    assert.ok(!fit.overflow && fit.bottom <= fit.navTop + 1);
    assert.ok(fit.cards.every(c => c.left >= 0 && c.right <= width && c.ribbonBottom < fit.navTop && !c.nameClipped));
    // Unlock the catalogue only in this browser session to exercise long names and all classes.
    await page.evaluate(() => {
      const g = window.__game;
      // Named long heroes and both remaining class banners.
      g.meta.unlocked = [...g.meta.unlocked, 'samuraiCommander', 'demonSwordsman', 'priestess', 'gunslinger', 'dreadPirate', 'timeWitch'];
      g.home.openRoster();
    });
    await page.screenshot({ path: `${output}/long-names-${width}x${height}.png` });
    assert.ok(await page.locator('.hcard').evaluateAll(cards => cards.every((c, i) => {
      const nextRow = cards[i + 3];
      const ribbon = c.querySelector('.heroLevelRibbon').getBoundingClientRect();
      const name = c.querySelector('b');
      return c.scrollWidth <= c.clientWidth + 2 && name.scrollHeight <= name.clientHeight + 1
        && (!nextRow || ribbon.bottom + 5 <= nextRow.getBoundingClientRect().top);
    })), 'Long names fit and level ribbons stay clear of the next row');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await page.locator('.heroCardMotes').first().evaluate(e => getComputedStyle(e).animationName), 'none');
    await page.evaluate(() => document.querySelector('.heroRoster').scrollTop = 0);
    await page.getByRole('searchbox').focus();
    await page.keyboard.press('Tab');
    assert.equal(await page.locator('.hcard').first().evaluate(e => e.matches(':focus-visible')), true);
    assert.equal(errors.length, 0, errors.join('\n'));
    results.push({ width, height, fit, errors, checks: 'class search; last-viewed state; card and ribbon bounds; long names; all classes; reduced motion; keyboard focus' });
    console.log(`PASS character cards ${width}x${height}`);
  }
  writeFileSync(`${output}/results.json`, JSON.stringify(results, null, 2));
} finally { await browser.close(); }
