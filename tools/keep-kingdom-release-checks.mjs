// Shared-style smoke checks: both board sizes, combat, portrait fit and offline reload.
// Run against a production web build served on localhost (required for its service worker).
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import * as esbuild from 'esbuild';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const url = process.env.GAME_URL || 'http://localhost:8000';
const samples = process.env.UI_SAMPLES || 'out/ui-release';
mkdirSync(samples, { recursive: true });
await esbuild.build({ entryPoints: ['tools/battle-ui/saves.ts'], bundle: true, platform: 'node', format: 'esm', outfile: 'out/ui-release-fixture.mjs', logLevel: 'error' });
const { big } = await import('../out/ui-release-fixture.mjs');
const areas = ['highlands', 'forest', 'snow', 'desert', 'volcano', 'dungeon', 'plains', 'autumn', 'swamp', 'graveyard', 'ruins', 'temple', 'crystal', 'forge', 'shrine', 'warcamp', 'oasis'];
const browser = await chromium.launch({ args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const results = [];
try {
  for (const [width, height] of [[360, 780], [393, 852], [412, 915]]) {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, hasTouch: true });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    await page.addInitScript(() => localStorage.setItem('legends.settings', JSON.stringify({ music: 0, effects: 0, cinematics: false, quips: false })));
    await page.goto(`${url}/?seed=123`);
    await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
    await page.evaluate(() => document.getElementById('tipSkip')?.click());
    await page.locator('#summon').click();
    await page.locator('#auto').click();
    assert.ok(await page.evaluate(() => window.__game.b.units.some((u) => u.side === 'hero')), 'Auto deploy places heroes');
    assert.deepEqual(await page.evaluate(() => [window.__game.b.board.w, window.__game.b.board.d]), [8, 11]);
    const checkFit = async () => {
      const fit = await page.evaluate(() => {
        const panel = document.getElementById('panel').getBoundingClientRect();
        const top = document.getElementById('top').getBoundingClientRect();
        const fight = document.getElementById('fight').getBoundingClientRect();
        return { room: panel.top - top.bottom, right: panel.right, bottom: panel.bottom, fightHeight: fight.height };
      });
      assert.ok(fit.room > 150 && fit.right <= width + 1 && fit.bottom <= height + 1, 'Board has room above the controls');
      assert.ok(fit.fightHeight >= 40, 'Fight is a touch-sized control');
    };
    await checkFit();
    await page.screenshot({ path: `${samples}/deploy-${width}x${height}.png` });
    await page.locator('#fight').click();
    await page.waitForFunction(() => window.__game.b.t > 0, null, { timeout: 15000 });
    assert.equal(await page.evaluate(() => window.__game.b.phase), 'fight');
    await page.screenshot({ path: `${samples}/fight-${width}x${height}.png` });
    if (width === 393) {
      await page.evaluate(() => window.__game.setSpeed(2));
      await page.waitForFunction(() => !document.getElementById('result').hidden, null, { timeout: 120000 });
      await page.screenshot({ path: `${samples}/result-${width}x${height}.png` });
    }
    // Reuse the existing Calamity screenshot fixture, with a known fight on its larger board.
    const run = big(11);
    run.tower.cur = { id: run.tower.map[0].id, kind: 'fight', fight: { band: ['wolfBlack', 'wolfRed', 'wolfWhite'], stage: { foes: { hp: 0.9, atk: 0.9 }, size: { w: 10, d: 13 }, area: 'forest' } } };
    await page.evaluate((run) => {
      const g = window.__game;
      g.resumeSlot(run);
      g.endIntro();
      g.autoArrange(true);
    }, run);
    assert.deepEqual(await page.evaluate(() => [window.__game.b.board.w, window.__game.b.board.d]), [10, 13]);
    await checkFit();
    await page.screenshot({ path: `${samples}/calamity-${width}x${height}.png` });
    await page.locator('#fight').click();
    await page.waitForFunction(() => window.__game.b.t > 0, null, { timeout: 15000 });
    if (width === 393) {
      for (const area of areas) {
        await page.evaluate((area) => {
          const g = window.__game;
          g.run.tower.cur.fight.stage.area = area;
          g.newBattle();
          g.endIntro();
          g.autoArrange(true);
        }, area);
        await checkFit();
      }
    }
    // Wait for the actual service worker's entire precache, then reload offline.
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await page.waitForFunction(() => window.__game && navigator.serviceWorker.controller, null, { timeout: 90000 });
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('legends.meta')));
    await context.setOffline(true);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
    assert.deepEqual(await page.evaluate(() => window.__game.meta.unlocked), saved.unlocked, 'Offline reload preserves the roster');
    await page.evaluate(() => { window.__game.home.open(); window.__game.home.show('heroes'); });
    assert.ok(await page.locator('.heroRoster .hcard:visible').count() > 0);
    assert.equal(errors.length, 0, errors.join('\n'));
    results.push({ width, height, boards: ['8x11', '10x13'], combat: true, offlineReload: true, areaFit: width === 393 ? areas : ['forest'], errors });
    console.log(`PASS release ${width}x${height}, combat and offline reload`);
    await context.close();
  }
  writeFileSync(`${samples}/results.json`, JSON.stringify(results, null, 2));
} finally { await browser.close(); }
