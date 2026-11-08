// npm run web && node tools/road-art/checks.mjs
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import * as esbuild from 'esbuild';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const dir = 'docs/samples/road-art';
mkdirSync(dir, { recursive: true });
await esbuild.build({ entryPoints: ['tools/road-art/lab.ts'], outfile: 'out/road-art-lab.js', bundle: true, format: 'iife', platform: 'browser', loader: { '.png': 'dataurl', '.webp': 'dataurl' } });
const types = { html: 'text/html', js: 'text/javascript', css: 'text/css', png: 'image/png', webp: 'image/webp', opus: 'audio/ogg', woff2: 'font/woff2' };
const server = createServer((req, res) => {
  const path = req.url === '/__lab.js' ? 'out/road-art-lab.js' : 'out/web/' + (req.url.split('?')[0].slice(1) || 'index.html');
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
 await page.evaluate(()=>window.__roadArt.ready);
 const kinds=await page.evaluate(()=>window.__roadArt.kinds);
 assert.equal(kinds.length,8);
 for(const [width,height] of [[393,852],[360,780],[412,915]]) {
  await page.setViewportSize({width,height});
  const sources=[];
  for(const kind of kinds){
   const options=await page.evaluate(kind=>window.__roadArt.show(kind),kind);
   assert.equal(await page.locator('#events .evRoadArt').count(),1);
   assert.ok(await decoded('#events .evRoadArt'));
   assert.ok(await page.locator('#events .evRoadArt').evaluate(img=>img.naturalWidth===768&&img.naturalHeight===432&&img.getBoundingClientRect().height<=148.1));
   sources.push(await page.locator('#events .evRoadArt').getAttribute('src'));
   assert.equal(await page.locator('#events .opt').count(),options.length);
   assert.deepEqual(await page.locator('#events .opt b').allTextContents(),options.map(o=>o.label));
   assert.deepEqual(await page.locator('#events .opt small').allTextContents(),options.map(o=>o.text));
   assert.deepEqual(await page.locator('#events .opt em').allTextContents(),options.filter(o=>o.cost).map(o=>String(o.cost)));
   assert.ok(await page.locator('#events .evcard').evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight}));
   assert.equal(await page.evaluate(()=>window.__roadArt.unchanged()),true);
   await shot(`${kind}-${width}`);
   for(let i=0;i<options.length;i++){
    const b=page.locator('#events .opt').nth(i);
    await b.scrollIntoViewIfNeeded();
    assert.ok(await b.evaluate(e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&r.height>=44}));
   }
   await page.locator('#events .opt.leave').click();
   assert.equal(await page.locator('#events .evRoadArt').count(),0);
   await page.locator('#events .primary').click();
   assert.equal(await page.locator('#events').isVisible(),false);
  }
  assert.equal(new Set(sources).size,8);
  const options=await page.evaluate(()=>window.__roadArt.show('scout',true));
  assert.deepEqual(await page.locator('#events .opt').evaluateAll(bs=>bs.map(b=>b.disabled)),options.map(o=>o.disabled));
  for(const kind of ['ladyDue','refugeesReturn']){
   await page.evaluate(kind=>window.__roadArt.show(kind),kind);
   assert.equal(await page.locator('#events .evRoadArt').count(),0);
  }
  results.push({width,height,paintings:8,optionsPreserved:true,costsPreserved:true,choicesReachable:true,poorState:true,followupsUnillustrated:true,renderingUnchanged:true});
  console.log('Road paintings passed',width);
 }
 assert.deepEqual(errors,[]);
 writeFileSync(`${dir}/browser-results.json`,JSON.stringify({results,errors},null,2)+'\n');
}finally{await browser.close();server.close();}
