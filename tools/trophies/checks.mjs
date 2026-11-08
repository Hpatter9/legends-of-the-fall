// npm run web && node tools/art-finish/checks.mjs
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import * as esbuild from 'esbuild';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const dir = 'docs/samples/trophies';
mkdirSync(dir, { recursive: true });
await esbuild.build({ entryPoints: ['tools/trophies/lab.ts'], outfile: 'out/trophy-paint-lab.js', bundle: true, format: 'iife', platform: 'browser', loader: { '.png': 'dataurl', '.webp': 'dataurl' } });
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
  await page.addScriptTag({ path: 'out/trophy-paint-lab.js' });
  for (const [width,height] of [[393,852],[360,780],[412,915]]) {
    await page.setViewportSize({width,height});
    await page.evaluate(() => window.__trophyPaint.open(true));
    await page.locator('#trophyPaintFixture .twFilterChip').first().click();
    assert.equal(await page.locator('#trophyPaintFixture .twPlaque.unlocked').count(),18);
    assert.ok(await decoded('#trophyPaintFixture .twPlaque .twPainting'));
    assert.equal(await page.locator('#trophyPaintFixture .twPlaque .twPainting').evaluateAll(imgs => new Set(imgs.map(i => i.src)).size),18);
    await shot(`wall-${width}`);
    await page.locator('#trophyPaintFixture .twRackFrame').evaluate(e => e.scrollTop = e.scrollHeight);
    await shot(`wall-bottom-${width}`);
    for (let i=0;i<18;i++) {
      await page.locator('#trophyPaintFixture .twPlaque').nth(i).click();
      assert.ok(await decoded('#trophyPaintFixture .twDetailBadge .twPainting'));
      assert.equal(await page.locator('#trophyPaintFixture .twDetailBadge .twPainting').getAttribute('src'), await page.locator('#trophyPaintFixture .twPlaque .twPainting').nth(i).getAttribute('src'));
      assert.ok(await page.locator('#trophyPaintFixture .twDetailBox').evaluate(e => {
        const r=e.getBoundingClientRect();
        return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight;
      }));
      if ([1,5,10,17].includes(i)) await shot(`detail-${i}-${width}`);
      await page.locator('#trophyPaintFixture .twDetailClose').click();
    }
    await page.locator('#trophyPaintFixture .twFilterChip').nth(1).click();
    assert.equal(await page.locator('#trophyPaintFixture .twPlaque').count(),6);
    await page.locator('#trophyPaintFixture .twFilterChip').nth(2).click();
    assert.equal(await page.locator('#trophyPaintFixture .twPlaque').count(),12);
    await page.locator('#trophyPaintFixture .twFilterChip').first().click();
    await page.evaluate(() => window.__trophyPaint.open(false));
    assert.equal(await page.locator('#trophyPaintFixture .twPlaque.locked').count(),18);
    assert.equal(await page.locator('#trophyPaintFixture .twPlaque .twPainting').evaluateAll(imgs => new Set(imgs.map(i => i.src)).size),1);
    assert.ok(await decoded('#trophyPaintFixture .twPlaque .twPainting'));
    await shot(`locked-${width}`);
    await page.locator('#trophyPaintFixture .twPlaque').first().click();
    assert.ok(await decoded('#trophyPaintFixture .twDetailBadge .twPainting'));
    assert.equal(await page.locator('#trophyPaintFixture .twQuote').count(),0);
    await shot(`locked-detail-${width}`);
    await page.locator('#trophyPaintFixture .twDetailClose').click();
    await page.locator('#trophyPaintFixture .twCloseBtn').click();
    assert.equal(await page.locator('#trophyPaintFixture').isVisible(),false);
    results.push({width,height,uniqueTrophies:18,details:18,locked:true,filters:true,close:true});
    console.log('Trophy paintings passed',width);
  }
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.evaluate(() => window.__trophyPaint.open(true));
  await page.locator('#trophyPaintFixture .twPlaque').first().click();
  assert.equal(await page.locator('#trophyPaintFixture .twDetailOverlay').evaluate(e => getComputedStyle(e).animationName),'none');
  await shot('reduced-motion');
  await page.evaluate(() => window.__trophyPaint.close());
  assert.equal(await page.locator('#trophyPaintFixture').isVisible(),false);
  assert.deepEqual(errors,[]);
  writeFileSync(`${dir}/browser-results.json`,JSON.stringify({results,reducedMotion:true,errors},null,2)+'\n');
} finally {
  await browser.close();
  server.close();
}
