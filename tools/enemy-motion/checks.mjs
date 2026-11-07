// npm run web && node tools/enemy-motion/checks.mjs
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import * as esbuild from 'esbuild';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const layouts = JSON.parse(readFileSync('src/art/units/sheets.json'));
await esbuild.build({ entryPoints: ['tools/enemy-motion/lab.ts'], outfile: 'out/enemy-motion-lab.js', bundle: true, format: 'iife', platform: 'browser' });
const dir = 'docs/samples/enemy-motion';
mkdirSync(dir, { recursive: true });
const types = { html: 'text/html', js: 'text/javascript', css: 'text/css', webp: 'image/webp', png: 'image/png', opus: 'audio/ogg', woff2: 'font/woff2' };
const server = createServer((req, res) => {
  const path = 'out/web/' + (req.url.split('?')[0].slice(1) || 'index.html');
  if (!existsSync(path)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': types[path.split('.').pop()] || 'application/octet-stream' });
  res.end(readFileSync(path));
}).listen(8818);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const results = [];
const context = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2 });
const page = await context.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await page.addInitScript(() => {
  localStorage.setItem('legends.settings', JSON.stringify({ music: 0, effects: 0, cinematics: false, quips: false }));
  localStorage.setItem('legends.tips', JSON.stringify(['home', 'deploy', 'fight', 'mana', 'skill', 'ult', 'summon', 'crowns']));
});
let loaded = false;
try {
  for (const [width, height, reduced] of [[393, 852, false], [360, 780, false], [412, 915, false], [393, 852, true]]) {
    const tag = `${width}${reduced ? '-reduced' : ''}`;
    if (process.env.MOTION_CASE && process.env.MOTION_CASE !== tag) continue;
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' });
    if (!loaded) {
      await page.goto('http://127.0.0.1:8818/?seed=7', { waitUntil: 'domcontentloaded', timeout: 180000 });
      await page.waitForFunction(() => window.__game, null, { timeout: 180000 });
      await page.addScriptTag({ path: 'out/enemy-motion-lab.js' });
      loaded = true;
    }
    await page.evaluate(() => window.__enemyMotion.setup());
    const idle = [];
    for (const time of [1200, 1500, 1800, 2100]) idle.push(await page.evaluate(t => window.__enemyMotion.pose(t), time));
    for (const sample of idle) {
      assert.ok(sample.simulationUnchanged);
      assert.equal(sample.frames.length, 9);
      for (const frame of sample.frames) {
        const entry = layouts[frame.sheet];
        assert.ok(frame.visible && frame.alpha > 0);
        assert.equal(frame.y, entry.rows.indexOf('idle') * entry.h);
        if (reduced) assert.equal(frame.x, 0);
      }
    }
    for (let i = 0; i < 9; i++) {
      assert.equal(new Set(idle.map(s => s.frames[i].source)).size, 1, 'One stable texture source');
      assert.equal(new Set(idle.map(s => s.frames[i].x)).size, reduced ? 1 : 4, 'Idle coverage');
    }
    await page.screenshot({ path: `${dir}/idle-${tag}.png` });
    for (const [index, time] of [1030, 1110, 1190].entries()) {
      const sample = await page.evaluate(t => window.__enemyMotion.pose(t, true), time);
      assert.ok(sample.simulationUnchanged);
      for (const frame of sample.frames) {
        const entry = layouts[frame.sheet];
        assert.equal(frame.y, entry.rows.indexOf('hurt') * entry.h);
        assert.equal(frame.x, index * entry.w);
      }
      if (index === 1) await page.screenshot({ path: `${dir}/hurt-${tag}.png` });
    }
    assert.deepEqual(errors, []);
    results.push({ width, height, reduced, enemies: 9, idleFrames: reduced ? 1 : 4, hurtFrames: 3, simulationUnchanged: true, errors });
    console.log('passed', tag);
  }
  writeFileSync(`${dir}/browser-results${process.env.MOTION_CASE ? '-' + process.env.MOTION_CASE : ''}.json`, JSON.stringify(results, null, 2) + '\n');
} finally {
  await browser.close();
  server.close();
}
