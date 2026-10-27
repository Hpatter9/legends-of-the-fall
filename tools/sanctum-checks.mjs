// Real-browser checks for the owner-approved royal arcane sanctum.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const output = 'docs/samples';
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const results = [];
try {
  const context = await browser.newContext({ viewport: { width: 393, height: 852 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => localStorage.setItem('legends.settings', JSON.stringify({ music: 0, effects: 0, cinematics: false, quips: false })));
  await page.goto('http://localhost:8000/?seed=123');
  await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
  await page.evaluate(async () => { await document.fonts.ready; });
  for (const [width, height] of [[360, 780], [393, 852], [412, 915]]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => {
      document.getElementById('tipSkip')?.click();
      const g = window.__game;
      g.meta.crowns = 5000;
      g.home.open();
      g.home.show('recruit');
    });
    await page.waitForFunction(() => window.__hall?.root.querySelector('canvas')?.width > 0);
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${output}/sanctum-${width}x${height}.png` });
    const fit = await page.locator('.hlWrap').evaluate(e => {
      const r = e.getBoundingClientRect(), low = e.querySelector('.hlLow').getBoundingClientRect(), head = e.querySelector('.hlHead').getBoundingClientRect();
      return { width: r.width, height: r.height, overflow: e.scrollWidth > e.clientWidth, altarY: r.top + r.height * .545, controlsTop: low.top, headBottom: head.bottom,
        buttons: [...e.querySelectorAll('.hlBar button')].map(b => { const x = b.getBoundingClientRect(); return { left: x.left, right: x.right, bottom: x.bottom, height: x.height }; }) };
    });
    assert.ok(!fit.overflow && fit.altarY < fit.controlsTop && fit.altarY > fit.headBottom);
    assert.ok(fit.buttons.every(b => b.left >= 0 && b.right <= width && b.bottom <= height && b.height >= 44));
    await page.locator('.hlBar button').first().click();
    await page.waitForSelector('.hlSkip.on');
    assert.ok(await page.locator('.hlWrap').evaluate(e => e.classList.contains('isCasting')));
    await page.waitForTimeout(450);
    await page.screenshot({ path: `${output}/sanctum-ritual-${width}x${height}.png` });
    await page.locator('.hlSkip').click();
    await page.waitForSelector('#gacha:not([hidden])');
    await page.waitForFunction(() => document.querySelector('#reveal .flip.up'));
    await page.waitForTimeout(650);
    await page.screenshot({ path: `${output}/sanctum-result-${width}x${height}.png` });
    assert.equal(await page.locator('#reveal.single .flip').count(), 1);
    await page.locator('#gachaClose').click();
    await page.waitForFunction(() => !document.querySelector('.hlWrap').classList.contains('isCasting'));
    results.push({ width, height, fit, singlePull: 'passed' });
  }
  // Ten-pull, repeat ritual, keyboard reveal, low funds and reduced motion.
  await page.locator('.hlBar button').last().click();
  await page.waitForSelector('.hlSkip.on');
  await page.locator('.hlSkip').click();
  await page.waitForSelector('#gacha:not([hidden])');
  assert.equal(await page.locator('#reveal .flip').count(), 10);
  await page.locator('#reveal .flip').last().focus();
  await page.keyboard.press('Enter');
  assert.ok(await page.locator('#reveal .flip').last().evaluate(e => e.classList.contains('up')));
  await page.waitForFunction(() => !document.querySelector('#pull1').disabled);
  await page.screenshot({ path: `${output}/sanctum-ten-pull.png` });
  await page.locator('#gachaClose').click();
  await page.locator('.hlBar button').first().click();
  await page.waitForSelector('#gacha:not([hidden])', { timeout: 15000 });
  await page.waitForFunction(() => !document.querySelector('#pull1').disabled);
  await page.locator('#gachaClose').click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator('.hlBar button').first().click();
  await page.waitForSelector('#gacha:not([hidden])', { timeout: 15000 });
  await page.waitForFunction(() => !document.querySelector('#pull1').disabled);
  await page.locator('#gachaClose').click();
  await page.evaluate(() => { window.__game.meta.crowns = 0; window.__game.home.show('recruit'); });
  assert.ok(await page.locator('.hlBar button').evaluateAll(bs => bs.every(b => b.disabled)));
  assert.equal(errors.length, 0, errors.join('\n'));
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.waitForFunction(async () => { const keys = await caches.keys(); return keys.length > 0 && !!(await caches.match(new URL('game.js', location.href).href)); });
  await context.setOffline(true);
  await page.reload();
  await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
  await page.evaluate(() => { window.__game.home.open(); window.__game.home.show('recruit'); });
  await page.waitForFunction(() => window.__hall?.root.querySelector('canvas')?.width > 0);
  await page.screenshot({ path: `${output}/sanctum-offline.png` });
  assert.equal(errors.length, 0, errors.join('\n'));
  results.push({ tenPull: 'passed', fullRitual: 'passed', keyboard: 'passed', reducedMotion: 'passed', lowFunds: 'passed', offlineReload: 'passed', pageErrors: errors });
  writeFileSync(`${output}/sanctum-checks.json`, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results));
} finally { await browser.close(); }
