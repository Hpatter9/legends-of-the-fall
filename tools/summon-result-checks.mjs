// Controlled presentation fixtures; no recruiting, saves or simulation rules are changed.
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const results = [], errors = [];
// Seed enough crowns to inspect enabled repeat actions without charging a player save.
try {
  const context = await browser.newContext({ viewport: { width: 393, height: 852 } });
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => localStorage.setItem('legends.settings', JSON.stringify({ music: 0, effects: 0, cinematics: false, quips: false })));
  await page.goto(`${process.env.GAME_URL || 'http://localhost:8000'}/?seed=123`);
  await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
  await page.evaluate(async () => { await document.fonts.ready; document.getElementById('tipSkip')?.click(); window.__game.meta.crowns = 5000; window.__game.home.open(); window.__game.home.show('recruit'); });
  const show = async got => {
    await page.evaluate(got => { document.getElementById('gacha').hidden = false; window.__game.gacha.reveal(got); }, got);
  };
  const newHero = { kind: 'warlock', isNew: true, shards: 0, unlock: 1, have: 39, need: 39 };
  const recruitment = { kind: 'samuraiCommander', isNew: false, shards: 0, unlock: 1, have: 28, need: 39 };
  const rank = { kind: 'archer', isNew: false, shards: 2 };
  const crowns = { kind: 'priestess', isNew: false, shards: 0, crowns: 5 };
  for (const [width, height] of [[360, 780], [393, 852], [412, 915]]) {
    await page.setViewportSize({ width, height });
    for (const [state, reward, expected] of [['new', newHero, 'Joined your company'], ['recruitment', recruitment, '+1 shard'], ['rank', rank, '+2 shards'], ['crowns', crowns, '+5 crowns']]) {
      await show([reward]);
      await page.locator('#reveal .flip').press('Space');
      await page.waitForTimeout(600);
      await page.locator('#reveal .flip').evaluate(e => e.blur());
      assert.equal(await page.locator('.resultReward em').textContent(), expected);
      if (state === 'recruitment') {
        assert.equal(await page.locator('.resultProgressLabel').textContent(), '28 / 39 to recruit');
        assert.equal(await page.locator('.resultReward [role="progressbar"]').getAttribute('aria-valuenow'), '28');
      }
      const fit = await page.evaluate(() => {
        const root = document.getElementById('gacha');
        const body = root.querySelector('.gachaBody');
        const button = document.getElementById('gachaClose').getBoundingClientRect();
        const name = root.querySelector('.summonCaption b');
        return { overflow: body.scrollWidth > body.clientWidth, button: { top: button.top, bottom: button.bottom, height: button.height }, nameHeight: name.scrollHeight, plaqueHeight: name.parentElement.clientHeight };
      });
      assert.ok(!fit.overflow && fit.button.height >= 44 && fit.button.bottom <= height);
      assert.ok(fit.nameHeight <= fit.plaqueHeight + 2, `${state} name fits plaque at ${width}`);
      await page.screenshot({ path: `docs/samples/summon-results-${state}-${width}x${height}.png` });
      results.push({ width, height, state, fit });
    }
    const ten = [newHero, recruitment, rank, crowns, { ...rank, kind: 'demonSwordsman' }, { ...recruitment, kind: 'samuraiCommander' }, { ...rank, kind: 'wizard' }, { ...rank, kind: 'paladin' }, { ...rank, kind: 'gunslinger' }, { ...rank, kind: 'timeWitch' }];
    await show(ten);
    await page.locator('#revealAll').click();
    await page.waitForTimeout(650);
    assert.equal(await page.locator('#reveal .up').count(), 10);
    assert.equal(await page.locator('#revealAll').isVisible(), false);
    assert.match(await page.locator('#resultSummary').textContent(), /10 rewards revealed · 1 new ally/);
    assert.ok(await page.locator('.summonCaption b').evaluateAll(names => names.every(n => n.scrollHeight <= n.parentElement.clientHeight + 2)), `Gallery names fit ${width}`);
    await page.screenshot({ path: `docs/samples/summon-results-ten-top-${width}x${height}.png` });
    await page.locator('.gachaBody').evaluate(e => { e.scrollTop = e.scrollHeight; });
    assert.ok(await page.locator('#gachaClose').isVisible());
    await page.screenshot({ path: `docs/samples/summon-results-ten-bottom-${width}x${height}.png` });
    // Leaving mid-reveal must cancel old timers before a new result is shown.
    await show(ten);
    await page.locator('#gachaClose').click();
    await show([crowns]);
    await page.waitForTimeout(3100);
    assert.equal(await page.locator('#reveal .up').count(), 1);
    assert.equal(await page.locator('.resultReward em').textContent(), '+5 crowns');
    await page.locator('#gachaClose').click();
    // Collection view resets result-only controls and remains reachable.
    await page.locator('.hlOdds').click();
    assert.equal(await page.locator('#resultIntro').isVisible(), false);
    assert.ok(await page.locator('#collection').isVisible());
    await page.locator('#gachaClose').click();
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await show([newHero]);
  await page.waitForFunction(() => document.querySelector('#reveal .up'));
  assert.equal(await page.locator('#reveal .face').evaluate(e => getComputedStyle(e).transitionDuration), '0s');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.waitForFunction(async () => !!(await caches.match(new URL('ui/summon-reveal-frame.png', location.href).href)));
  await context.setOffline(true);
  await page.reload();
  await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
  await show([newHero]);
  await page.waitForFunction(() => document.querySelector('#reveal .up'));
  const loaded = await page.evaluate(async () => { const im = new Image(); im.src = 'ui/summon-reveal-frame.png'; await im.decode(); return im.naturalWidth; });
  assert.ok(loaded > 0);
  assert.deepEqual(errors, []);
  results.push({ tenResults: 'passed', revealAll: 'passed', keyboard: 'passed', earlyClose: 'passed', collection: 'passed', reducedMotion: 'passed', offlineFrame: 'passed', pageErrors: errors });
  writeFileSync('docs/samples/summon-results-checks.json', JSON.stringify(results, null, 2));
  console.log('Summon result checks passed:', results.length);
} finally { await browser.close(); }
