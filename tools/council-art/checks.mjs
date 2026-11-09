// npm run web && node tools/art-finish/checks.mjs
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import * as esbuild from 'esbuild';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const dir = 'docs/samples/council-art';
mkdirSync(dir, { recursive: true });
await esbuild.build({ entryPoints: ['tools/council-art/lab.ts'], outfile: 'out/council-art-lab.js', bundle: true, format: 'iife', platform: 'browser', loader: { '.png': 'dataurl', '.webp': 'dataurl' } });
const types = { html: 'text/html', js: 'text/javascript', css: 'text/css', png: 'image/png', webp: 'image/webp', opus: 'audio/ogg', woff2: 'font/woff2' };
const server = createServer((req, res) => {
  const path = req.url === '/__lab.js' ? 'out/council-art-lab.js' : 'out/web/' + (req.url.split('?')[0].slice(1) || 'index.html');
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
  await page.goto('http://127.0.0.1:8819/?seed=7', {waitUntil:'domcontentloaded',timeout:180000});
  await page.waitForFunction(() => window.__game,null,{timeout:180000});
  // Serve the fixture over HTTP; its image data exceeds the DevTools message-size limit.
  await page.addScriptTag({url:'http://127.0.0.1:8819/__lab.js'});
  for (const [width,height] of [[393,852],[360,780],[412,915]]) {
    await page.setViewportSize({width,height});
    await page.evaluate(() => window.__councilArt.board('news'));
    // (twenty kinds since the Assault's Conquest, which wears the warchief's badge too)
    assert.equal(await page.locator('#nemesisBoard .nmNews').count(),20);
    assert.ok(await decoded('#nemesisBoard .nmNews img'));
    // The repainted symbols are cut at 96px (docs/notes/art-wire-5.md), the two paintings 128px; the existing warchief badge is 88×112.
    assert.equal(await page.locator('#nemesisBoard .nmNews img').evaluateAll(imgs => imgs.filter(i => i.naturalWidth === 96 && i.naturalHeight === 96).length),15);
    assert.equal(await page.locator('#nemesisBoard .nmNews img').evaluateAll(imgs => imgs.filter(i => i.naturalWidth === 128 && i.naturalHeight === 128).length),2);
    assert.equal(await page.locator('#nemesisBoard .nmNews img').evaluateAll(imgs => imgs.filter(i => i.naturalWidth === 88 && i.naturalHeight === 112).length),3);
    assert.equal(await page.locator('#nemesisBoard .nmNews .nmPainted').count(),2);
    assert.ok(await page.locator('#nemesisBoard .nmBoard').evaluate(e => e.getBoundingClientRect().right <= innerWidth));
    await shot(`news-${width}`);
    await page.locator('#nemesisBoard .nmNews').last().scrollIntoViewIfNeeded();
    await shot(`news-bottom-${width}`);
    await page.evaluate(() => window.__councilArt.board('spoils'));
    assert.ok(await decoded('#nemesisBoard .nmToken'));
    assert.equal(await page.locator('#nemesisBoard .nmToken').getAttribute('src'),await page.evaluate(() => window.__councilArt.trophy));
    await shot(`spoils-${width}`);
    await page.evaluate(() => window.__councilArt.manuscript());
    assert.equal(await page.locator('.qcCard .qFace img.painted').count(),1);
    assert.ok(await decoded('.qcCard .qFace img.painted'));
    const manuscript = await page.locator('.qcCard .qFace img').getAttribute('src');
    await shot(`manuscript-${width}`);
    await page.evaluate(() => window.__councilArt.manuscript(true));
    assert.ok(await decoded('#manuscriptLog .qFace img.painted'));
    assert.equal(await page.locator('#manuscriptLog .qFace img').getAttribute('src'),manuscript);
    await shot(`manuscript-log-${width}`);
    results.push({width,height,newsTypes:20,paintedNews:2,trophy:true,manuscriptCardAndLog:true});
    console.log('Council art passed',width);
  }
  assert.deepEqual(errors,[]);
  writeFileSync(`${dir}/browser-results.json`,JSON.stringify({results,errors},null,2)+'\n');
} finally {await browser.close();server.close();}
