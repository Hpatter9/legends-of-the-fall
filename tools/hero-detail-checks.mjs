// Browser review of hero dossiers, using session-only hero fixtures.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const output = process.env.UI_SAMPLES || 'out/dossier-checks';
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const results = [];
try {
  const context = await browser.newContext({ viewport: { width: 393, height: 852 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => localStorage.setItem('legends.settings', JSON.stringify({ music: 0, effects: 0, cinematics: false, quips: false })));
  await page.goto(`${process.env.GAME_URL || 'http://127.0.0.1:8000'}/?seed=123`, { timeout: 120000 });
  await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
  await page.evaluate(() => document.fonts.ready);
  for (const [width, height] of [[360, 780], [393, 852], [412, 915]]) {
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.evaluate(() => {
      document.getElementById('tipSkip')?.click();
      const g = window.__game;
      g.meta.unlocked = ['knight', 'wizard', 'samuraiCommander', 'cleric', 'archer'];
      g.meta.xp.knight = 4000;
      g.meta.ranked = { ...(g.meta.ranked || {}), knight: 2 };
      g.meta.shards.knight = 5;
      g.meta.equipment = [{ id: 901, base: 'ironSword', rarity: 2, level: 3 }, { id: 902, base: 'thornplate', rarity: 3, level: 3 }, { id: 903, base: 'luckyCharm', rarity: 2, level: 3 }];
      g.meta.equipped = {};
      g.home.open();
      g.home.show('heroes');
    });
    await page.locator('.hcard[data-kind="knight"]').click();
    const moving = page.locator('.dossierAtmosphere');
    const before = await moving.evaluate(e => getComputedStyle(e, '::before').transform);
    await page.screenshot({ path: `${output}/motion-start-${width}.png` });
    await page.waitForTimeout(1000);
    const after = await moving.evaluate(e => getComputedStyle(e, '::before').transform);
    assert.notEqual(before, after, `Magical currents move: ${await moving.evaluate(e => JSON.stringify(e.getAnimations({subtree:true}).map(a => ({name:a.animationName,state:a.playState,time:a.currentTime}))))}`);
    assert.equal(await moving.evaluate(e => {
      const r = e.getBoundingClientRect(); const frame = e.parentElement.getBoundingClientRect();
      return r.left > frame.left && r.right < frame.right && r.top > frame.top && r.bottom < frame.bottom && getComputedStyle(e).pointerEvents === 'none';
    }), true, 'Atmosphere stays inside the frame and does not intercept controls');
    await page.screenshot({ path: `${output}/portrait-${width}.png` });
    assert.equal(await page.getByRole('tab').count(), 4);
    for (const name of ['Overview', 'Progression', 'Equipment', 'Skills']) {
      await page.getByRole('tab', { name, exact: true }).click();
      assert.equal(await page.getByRole('tabpanel').count(), 1);
      const panel = page.getByRole('tabpanel');
      await panel.scrollIntoViewIfNeeded();
      assert.equal(await panel.evaluate(e => e.scrollWidth <= e.clientWidth + 1), true, `${name} fits at ${width}`);
      await page.screenshot({ path: `${output}/${name.toLowerCase()}-${width}.png` });
    }
    await page.getByRole('tab', { name: 'Equipment', exact: true }).click();
    await page.getByRole('button', { name: 'Equip best', exact: true }).click();
    assert.equal(await page.locator('.eqSlot .eqIcon.empty').count(), 0);
    await page.locator('.eqSlot').first().click();
    await page.getByRole('button', { name: 'Unequip', exact: true }).click();
    assert.equal(await page.evaluate(() => !!window.__game.meta.equipped.knight?.weapon), false);
    await page.locator('.eqPanel').getByRole('button', { name: 'Back', exact: true }).click();
    assert.ok(await page.locator('.eqSlot .eqIcon.empty').count() >= 1);
    await page.getByRole('tab', { name: 'Progression', exact: true }).click();
    await page.getByRole('button', { name: 'Open talents', exact: true }).click();
    assert.ok(await page.locator('.tTree').count() >= 1);
    await page.screenshot({ path: `${output}/talents-${width}.png` });
    await page.getByRole('tab', { name: 'Skills', exact: true }).click();
    assert.ok(await page.locator('.dossierAbility').count() >= 3);
    assert.ok(await page.locator('.dossierAbility.locked .ultLock').count() >= 1);
    await page.getByRole('tab', { name: 'Skills', exact: true }).focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.getByRole('tab', { name: 'Overview', exact: true }).getAttribute('aria-selected'), 'true');
    await page.getByRole('button', { name: 'Explore skills' }).click();
    assert.equal(await page.getByRole('tab', { name: 'Skills', exact: true }).getAttribute('aria-selected'), 'true');
    await page.locator('.heroStrip button', { hasText: 'Fire Wizard' }).click();
    assert.equal(await page.getByRole('tab', { name: 'Skills', exact: true }).getAttribute('aria-selected'), 'true');
    assert.equal(await page.locator('.heroDetail').getAttribute('data-class'), 'caster');
    await page.locator('.heroStrip button', { hasText: 'Samurai Commander' }).click();
    const fit = await page.locator('.heroDetail').evaluate(e => ({ width: e.clientWidth, scroll: e.scrollWidth, nameFits: e.querySelector('h3').scrollWidth <= e.querySelector('h3').clientWidth + 1 }));
    assert.ok(fit.scroll <= fit.width + 1 && fit.nameFits, `Long name fits ${width}`);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await page.locator('.dossierAtmosphere').evaluate(e => getComputedStyle(e, '::before').animationName), 'none');
    assert.equal(await page.locator('.dossierAtmosphere').evaluate(e => getComputedStyle(e, '::after').animationName), 'none');
    await page.screenshot({ path: `${output}/long-name-${width}.png` });
    await page.evaluate(() => window.__game.home.openSheet('paladin', true));
    assert.equal(await page.getByRole('tab').count(), 0);
    assert.equal(await page.locator('.heroDetail').evaluate(e => e.scrollWidth <= e.clientWidth + 1), true);
    await page.screenshot({ path: `${output}/locked-${width}.png` });
    await page.locator('.heroBack').click();
    assert.equal(await page.locator('.heroRoster').count(), 1);
    assert.equal(errors.length, 0, errors.join('\n'));
    results.push({ width, height, fit, errors: [...errors], checks: 'moving atmosphere; reduced-motion stops both background effects; frame containment; all four panels; equip and unequip; talent tree; locked hero; skills lock; keyboard wrap; skills shortcut; hero switch retains tab; class styling; long name; reduced motion; back navigation' });
    console.log(`PASS hero dossier ${width}x${height}`);
  }
  writeFileSync(`${output}/results.json`, JSON.stringify(results, null, 2));
} finally { await browser.close(); }
