// npm run web && node tools/art-finish/checks.mjs
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import * as esbuild from 'esbuild';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const dir = 'docs/samples/art-release-393';
mkdirSync(dir, { recursive: true });
await esbuild.build({ entryPoints: ['tools/art-release-393/lab.ts'], outfile: 'out/art-release-393-lab.js', bundle: true, format: 'iife', platform: 'browser', loader: { '.png': 'dataurl', '.webp': 'dataurl' } });
const types = { html: 'text/html', js: 'text/javascript', css: 'text/css', png: 'image/png', webp: 'image/webp', opus: 'audio/ogg', woff2: 'font/woff2' };
const server = createServer((req, res) => {
  const path = req.url === '/__lab.js' ? 'out/art-release-393-lab.js' : 'out/web/' + (req.url.split('?')[0].slice(1) || 'index.html');
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
const results=[];
try {
  await page.goto('http://127.0.0.1:8819/?seed=7',{waitUntil:'domcontentloaded',timeout:180000});
  await page.waitForFunction(()=>window.__game,null,{timeout:180000});
  await page.addScriptTag({url:'http://127.0.0.1:8819/__lab.js'});
  await page.evaluate(()=>window.__dynastyArt.ready);
  for(const [width,height] of [[393,852],[360,780],[412,915]]) {
    await page.setViewportSize({width,height});
    assert.ok(await page.locator('body').innerText().then(t=>t.includes('0.393.0')));
    await page.evaluate(()=>window.__questPortraits.card('oswy'));
    assert.ok(await decoded('.qcCard .qFace img.painted'));
    await shot(`quest-${width}`);
    await page.evaluate(()=>window.__councilArt.board('news'));
    assert.equal(await page.locator('#nemesisBoard .nmNews').count(),19);
    assert.ok(await decoded('#nemesisBoard .nmNews img'));
    await page.evaluate(()=>window.__councilArt.manuscript());
    assert.ok(await decoded('.qcCard .qFace img.painted'));
    await page.evaluate(()=>window.__councilArt.board('spoils'));
    assert.ok(await decoded('#nemesisBoard .nmToken'));
    await page.evaluate(()=>window.__dynastyArt.houses());
    assert.ok(await decoded('#housesPage .hsFate, #housesPage .hsHouseCrest'));
    await shot(`houses-${width}`);
    await page.evaluate(()=>window.__dynastyArt.line());
    assert.ok(await decoded('#houseLine .hsHeirloomChip img'));
    await page.evaluate(()=>window.__dynastyArt.season(0));
    assert.ok(await decoded('#seasonCard .hsSeasonBig'));
    await page.evaluate(()=>window.__dynastyArt.council());
    await shot(`council-${width}`);
    await page.evaluate(()=>window.__dynastyArt.traits(0));
    assert.equal(await page.locator('#nemesisCard .nmTraitIcon').count(),3);
    assert.ok(await decoded('#nemesisCard .nmTraitIcon'));
    await page.evaluate(()=>window.__dynastyArt.traits(0,true));
    assert.equal(await page.locator('#nemesisCard .nmTraitIcon').count(),0);
    await page.evaluate(()=>{
      document.querySelectorAll('.omVeil').forEach(e=>e.dispatchEvent(new Event('omclose')));
      window.__trophyPaint.open(true);
    });
    assert.equal(await page.locator('#trophyPaintFixture .twPlaque.unlocked').count(),18);
    assert.ok(await decoded('#trophyPaintFixture .twPlaque img'));
    await shot(`trophies-${width}`);
    await page.locator('#trophyPaintFixture .twPlaque').first().click();
    assert.ok(await decoded('#trophyPaintFixture .twDetailBadge img'));
    await page.locator('#trophyPaintFixture .twDetailClose').click();
    await page.locator('#trophyPaintFixture .twCloseBtn').click();
    assert.equal(await page.locator('#trophyPaintFixture').isVisible(),false);
    results.push({width,height,release:'0.393.0',quest:true,manuscript:true,news:19,trophies:18,dynasty:true,unknownTraitsHidden:true});
    console.log('Release art checks passed',width);
  }
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.evaluate(()=>window.__trophyPaint.open(true));
  await page.locator('#trophyPaintFixture .twPlaque').first().click();
  assert.equal(await page.locator('#trophyPaintFixture .twDetailOverlay').evaluate(e=>getComputedStyle(e).animationName),'none');
  assert.deepEqual(errors,[]);
  writeFileSync(`${dir}/browser-results.json`,JSON.stringify({results,reducedMotion:true,errors},null,2)+'\n');
}finally{await browser.close();server.close();}
