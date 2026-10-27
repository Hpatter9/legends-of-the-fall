// Load the production service worker once, then check a fresh launch and battle artwork without a connection.
import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const context = await browser.newContext({ viewport: { width: 393, height: 852 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => localStorage.setItem('legends.settings', JSON.stringify({ music: 0, effects: 0, cinematics: false, quips: false })));
  await page.goto(`${process.env.GAME_URL || 'http://localhost:8000'}/?seed=7`, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => window.__game, null, { timeout: 180000 });
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => navigator.serviceWorker.controller, null, { timeout: 120000 });
  assert.ok(await page.evaluate(async () => !!await caches.match('game.js', { ignoreSearch: true })));
  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => window.__game, null, { timeout: 180000 });
  const report = await page.evaluate(() => {
    const g = window.__game;
    const before = JSON.stringify(g.b);
    const sp = g.fx.effect({ sheet: 'fireExplosion', scale: 2 }, 0, 0);
    g.fx.step(100);
    return { offline: !navigator.onLine, artPixels: sp.texture.source.width, alpha: sp.alpha, simulationUnchanged: before === JSON.stringify(g.b) };
  });
  assert.ok(report.offline && report.simulationUnchanged && report.alpha > 0);
  assert.equal(report.artPixels, 128);
  assert.deepEqual(errors, []);
  mkdirSync('out/fx-cinematic', { recursive: true });
  writeFileSync('out/fx-cinematic/offline.json', JSON.stringify({ ...report, errors }, null, 2));
  console.log('passed offline launch and painted battle artwork');
} finally { await browser.close(); }
