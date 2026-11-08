// npm run web && node tools/art-finish/checks.mjs
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import * as esbuild from 'esbuild';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const dir = 'docs/samples/art-finish';
mkdirSync(dir, { recursive: true });
await esbuild.build({ entryPoints: ['tools/art-finish/lab.ts'], outfile: 'out/art-finish-lab.js', bundle: true, format: 'iife', platform: 'browser', loader: { '.png': 'dataurl', '.webp': 'dataurl' } });
const layouts = JSON.parse(readFileSync('src/art/units/sheets.json'));
const types = { html: 'text/html', js: 'text/javascript', css: 'text/css', png: 'image/png', webp: 'image/webp', opus: 'audio/ogg', woff2: 'font/woff2' };
const server = createServer((req, res) => {
  const path = 'out/web/' + (req.url.split('?')[0].slice(1) || 'index.html');
  if (!existsSync(path)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': types[path.split('.').pop()] || 'application/octet-stream' });
  res.end(readFileSync(path));
}).listen(8819);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const context = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2 });
const page = await context.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await page.addInitScript(() => {
  localStorage.setItem('legends.settings', JSON.stringify({ music: 0, effects: 0, cinematics: false, quips: false }));
  localStorage.setItem('legends.tips', JSON.stringify(['home', 'deploy', 'fight', 'mana', 'skill', 'ult', 'summon', 'crowns', 'calamity', 'tower', 'talents', 'castle', 'spellbook', 'stash', 'equipment', 'recycle', 'retry', 'autoReplay']));
});
const shot = async name => { await page.waitForTimeout(250); await page.screenshot({ path: `${dir}/${name}.png`, animations: 'disabled' }); };
const decoded = selector => page.locator(selector).evaluateAll(async images => {
  await Promise.all(images.map(im => im.decode()));
  return images.every(im => im.naturalWidth > 0);
});
const results = [];
try {
  await page.goto('http://127.0.0.1:8819/?seed=7', { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => window.__game, null, { timeout: 180000 });
  await page.addScriptTag({ path: 'out/art-finish-lab.js' });
  for (const [width, height] of [[393, 852], [360, 780], [412, 915]]) {
    if (process.env.ART_CASE && process.env.ART_CASE !== String(width)) continue;
    await page.setViewportSize({ width, height });
    if (process.env.ART_SCENE === 'maps') {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.evaluate(() => window.__artFinish.map());
      assert.ok(await decoded('.rsSupplies img'));
      await shot(`expedition-${width}`);
      results.push({ width, height, distinctPennants: 3, provisions: true });
      console.log('map capture passed', width);
      continue;
    }
    for (const who of ['pilgrim', 'deserter', 'cartographer']) {
      await page.evaluate(w => window.__artFinish.camp(w), who);
      assert.equal(await page.locator('.rtTravellerPortrait').count(), 1);
      assert.ok(await decoded('.rtTravellerPortrait'));
      assert.equal(await page.locator('.rtTraveller').evaluate(e => e.scrollWidth > e.clientWidth), false);
      await shot(`traveller-${who}-${width}`);
    }
    await page.evaluate(() => window.__artFinish.camp('pilgrim', true));
    assert.ok(await decoded('.rtTravellerPortrait'));
    await shot(`traveller-return-${width}`);
    if (process.env.ART_SCENE === 'portraits') {
      results.push({ width, height, portraits: 3, returnedPortrait: true });
      console.log('portrait captures passed', width);
      continue;
    }
    await page.evaluate(() => window.__artFinish.map());
    assert.equal(await page.locator('.rsSupplies .dmPennant').count(), 3);
    assert.ok(await decoded('.rsSupplies img'));
    assert.equal(await page.locator('.rsSupplies .dmPennant img').evaluateAll(images => new Set(images.map(im => im.src)).size), 3);
    await shot(`expedition-${width}`);
    await page.locator('.rsSupplies .dmPennant').first().click();
    assert.ok((await page.locator('#expeditionOath').textContent()).includes('Oath of Iron'));
    await shot(`oath-info-${width}`);
    await page.locator('#expeditionOath').getByRole('button', { name: 'Close', exact: true }).click();
    await page.evaluate(() => window.__artFinish.shop());
    assert.ok(await decoded('.rtProvisionShop'));
    await shot(`provisions-shop-${width}`);
    await page.evaluate(() => window.__artFinish.equipment());
    await page.getByRole('tab', { name: 'Equipment', exact: true }).click();
    await page.locator('.eqDoll').scrollIntoViewIfNeeded();
    assert.equal(await page.locator('.eqDoll .eqEmptyArt').count(), 7);
    assert.equal(await page.locator('.eqDoll .eqDollPortrait').count(), 1);
    const emptySources = await page.locator('.eqDoll .eqEmptyArt').evaluateAll(nodes => new Set(nodes.map(n => n.style.backgroundImage)).size);
    assert.equal(emptySources, 7);
    await shot(`empty-equipment-${width}`);
    for (const [frame, time] of [1030, 1110, 1190].entries()) {
      const sample = await page.evaluate(t => window.__artFinish.treants(t), time);
      assert.ok(sample.unchanged);
      assert.deepEqual(sample.frames.map(f => f.sheet), ['cls_treant', 'cls_treant_2', 'cls_treant_3']);
      for (const f of sample.frames) {
        assert.ok(f.visible);
        assert.equal(f.x, layouts[f.sheet].w * frame);
        assert.equal(f.y, layouts[f.sheet].h * layouts[f.sheet].rows.indexOf('hurt'));
      }
      if (frame === 1) await shot(`treants-${width}`);
    }
    const normal = await page.evaluate(() => window.__artFinish.effects(false));
    assert.ok(normal.unchanged);
    for (let form = 0; form < 3; form++) {
      assert.equal(new Set(normal.frames.map(row => row[form].frame)).size, 6);
      for (const row of normal.frames) {
        assert.ok(row[form].visible > 20 && row[form].alpha > 0);
        assert.equal(row[form].logicalWidth, 32);
      }
    }
    await shot(`painted-effects-${width}`);
    results.push({ width, height, portraits: 3, returnedPortrait: true, distinctPennants: 3, emptySlots: 7, treants: 3, hurtFrames: 3, spellForms: 3, spellFrames: 6, simulationUnchanged: true });
    console.log('passed', width);
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const calm = await page.evaluate(() => window.__artFinish.effects(true));
  assert.ok(calm.unchanged);
  for (const row of calm.frames) for (const form of row) assert.equal(form.frame, 0);
  await shot('painted-effects-reduced');
  assert.deepEqual(errors, []);
  writeFileSync(`${dir}/browser-results${process.env.ART_SCENE ? '-' + process.env.ART_SCENE : process.env.ART_CASE ? '-' + process.env.ART_CASE : ''}.json`, JSON.stringify({ cases: results, reducedMotion: true, errors }, null, 2) + '\n');
} finally {
  await browser.close();
  server.close();
}
