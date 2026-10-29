// Real-browser gallery review, including keyboard dismissal and offline art.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
await (await import('esbuild')).build({ entryPoints: ['tools/resonance/fixture.ts'], outfile: 'out/web/art-fixture.js', bundle: true, platform: 'browser', format: 'iife', globalName: 'ART_FIXTURE', logLevel: 'silent' });
const out = 'docs/samples/anime-heroes';
mkdirSync(out, { recursive: true });
const mime = { html: 'text/html', js: 'text/javascript', png: 'image/png', webp: 'image/webp', json: 'application/json', webmanifest: 'application/manifest+json', woff2: 'font/woff2', opus: 'audio/ogg' };
const server = createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (pathname === '/favicon.ico') { res.writeHead(204); return res.end(); }
  try {
    const path = `out/web${pathname === '/' ? '/index.html' : pathname}`;
    res.setHeader('Content-Type', mime[path.split('.').pop()] || 'application/octet-stream');
    res.end(readFileSync(path));
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = `http://localhost:${server.address().port}`;
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const results = [];
try {
  for (const [width, height] of [[393, 852], [360, 780], [412, 915]]) {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, serviceWorkers: 'allow' });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 250)); });
    await page.addInitScript(() => {
      localStorage.setItem('lotf-tips-off', '1');
      localStorage.setItem('legends.settings', JSON.stringify({ music: 0, effects: 0, cinematics: false, quips: false }));
    });
    await page.goto(`${url}/?seed=7`, { timeout: 120000 });
    await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
    await page.addScriptTag({ url: `${url}/art-fixture.js` });
    const all = await page.evaluate(() => {
      const g = window.__game;
      document.getElementById('tipSkip')?.click();
      g.meta.unlocked = [...window.ART_FIXTURE.ALL_HEROES];
      g.home.open(); g.home.show('heroes');
      return window.ART_FIXTURE.ALL_HEROES;
    });
    await page.locator('.heroRoster .heroAnimeArt').evaluateAll(images => Promise.all(images.map(i => i.decode())));
    assert.equal(await page.locator('.hcard .heroAnimeArt').count(), 45);
    await page.screenshot({ path: `${out}/roster-${width}.png` });
    const targets = width === 393 ? all : ['kitsune', 'gorgon', 'illusionist', 'timeWitch', 'lancer'];
    for (const id of targets) {
      await page.locator(`.hcard[data-kind="${id}"]`).click();
      const trigger = page.locator('.heroArtOpen');
      await trigger.locator('img').evaluate(i => i.decode());
      await trigger.click();
      const modal = page.locator('dialog.heroArtViewer');
      await modal.locator('img').evaluate(i => i.decode());
      assert.equal(await modal.locator('img').getAttribute('src'), `heroes/${id}.webp`);
      const fit = await modal.evaluate(e => {
        const r = e.getBoundingClientRect(), image = e.querySelector('img').getBoundingClientRect();
        return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight && e.scrollWidth <= e.clientWidth + 1 && image.bottom < r.bottom;
      });
      assert.ok(fit, `${id}: full artwork fits ${width}`);
      await page.keyboard.press('Tab');
      assert.equal(await modal.evaluate(e => e.contains(document.activeElement)), true, 'Focus remains in modal');
      if (['kitsune', 'gorgon', 'illusionist', 'timeWitch', 'lancer'].includes(id)) await page.screenshot({ path: `${out}/full-${id}-${width}.png` });
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.querySelector('dialog.heroArtViewer'));
      assert.equal(await modal.count(), 0);
      assert.equal(await trigger.evaluate(e => e === document.activeElement), true, 'Focus restored');
      if (id === 'kitsune') {
        await trigger.click();
        await page.getByRole('button', { name: 'Close full artwork', exact: true }).click();
        await page.waitForFunction(() => !document.querySelector('dialog.heroArtViewer'));
        assert.equal(await modal.count(), 0);
        await page.screenshot({ path: `${out}/detail-${width}.png` });
      }
      await page.locator('.heroBack').click();
    }
    await page.getByRole('searchbox').fill('Time Witch');
    assert.equal(await page.locator('.hcard:visible').count(), 1);
    await page.getByRole('searchbox').fill('');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.locator('.hcard[data-kind="timeWitch"]').click();
    assert.equal(await page.locator('.dossierAtmosphere').evaluate(e => getComputedStyle(e, '::before').animationName), 'none');
    await page.getByRole('tab', { name: 'Skills', exact: true }).click();
    assert.ok(await page.locator('.dossierAbility').count() >= 3);
    if (width === 393) {
      await page.evaluate(async () => { await navigator.serviceWorker.ready; });
      await page.waitForFunction(() => navigator.serviceWorker.controller, null, { timeout: 120000 });
      const cached = await page.evaluate(async () => {
        const cache = await caches.open((await caches.keys()).find(k => k.startsWith('legends-')));
        return (await cache.keys()).filter(r => new URL(r.url).pathname.startsWith('/heroes/')).length;
      });
      assert.equal(cached, 90, 'Every portrait and full artwork cached');
      await page.evaluate(() => localStorage.setItem('legends.meta', JSON.stringify(window.__game.meta)));
      await context.setOffline(true);
      await page.reload({ timeout: 120000 });
      await page.waitForFunction(() => window.__game, null, { timeout: 90000 });
      await page.evaluate(() => {
        document.getElementById('tipSkip')?.click();
        window.__game.home.open(); window.__game.home.show('heroes');
      });
      await page.locator('.hcard[data-kind="kitsune"]').click();
      await page.locator('.heroArtOpen').click();
      await page.locator('dialog.heroArtViewer img').evaluate(i => i.decode());
      await page.screenshot({ path: `${out}/offline-${width}.png` });
    }
    assert.deepEqual(errors, [], 'No browser errors');
    results.push({ width, height, heroesReviewed: targets.length, errors, offline: width === 393 });
    await context.close();
  }
  writeFileSync(`${out}/checks.json`, JSON.stringify(results, null, 2) + '\n');
  console.log(JSON.stringify(results));
} finally { await browser.close(); server.close(); }
