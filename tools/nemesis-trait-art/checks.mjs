// npm run web && node tools/nemesis-trait-art/checks.mjs
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import * as esbuild from 'esbuild';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const dir = 'docs/samples/nemesis-traits';
mkdirSync(dir, { recursive: true });
await esbuild.build({ entryPoints: ['tools/nemesis-trait-art/lab.ts'], outfile: 'out/nemesis-trait-art-lab.js', bundle: true, format: 'iife', platform: 'browser', loader: { '.png': 'dataurl', '.webp': 'dataurl' } });
const types = { html: 'text/html', js: 'text/javascript', css: 'text/css', png: 'image/png', webp: 'image/webp', opus: 'audio/ogg', woff2: 'font/woff2' };
const server = createServer((req, res) => {
  const path = req.url === '/__lab.js' ? 'out/nemesis-trait-art-lab.js' : 'out/web/' + (req.url.split('?')[0].slice(1) || 'index.html');
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
  await page.evaluate(()=>window.__traitArt.ready);
  assert.equal(await page.evaluate(()=>window.__traitArt.total),24);
  assert.equal(await page.evaluate(()=>window.__traitArt.covered),true);
  assert.equal(await page.evaluate(()=>window.__traitArt.unique),24);
  for(const [width,height] of [[393,852],[360,780],[412,915]]) {
    await page.setViewportSize({width,height});
    for(let i=0;i<8;i++) {
      await page.evaluate(i=>window.__traitArt.show(i),i);
      assert.equal(await page.locator('#nemesisCard .nmTraitIcon').count(),3);
      assert.ok(await decoded('#nemesisCard .nmTraitIcon'));
      assert.ok(await page.locator('#nemesisCard .nmTraitIcon').evaluateAll(imgs=>imgs.every(img=>(img.naturalWidth===128 || img.naturalWidth===96) && img.width===28 && getComputedStyle(img).imageRendering==='auto')));
      assert.ok(await page.locator('#nemesisCard .nmSecret').evaluateAll(rows=>rows.every(e=>e.getBoundingClientRect().left>=0 && e.getBoundingClientRect().right<=innerWidth)));
      if(width===393 || i===0 || i===7) await shot(`traits-${i}-${width}`);
      await page.evaluate(i=>window.__traitArt.show(i,true),i);
      assert.equal(await page.locator('#nemesisCard .nmTraitIcon').count(),0);
      assert.equal(await page.locator('#nemesisCard .nmSecret.hidden').count(),3);
    }
    await shot(`unknown-${width}`);
    assert.equal(await page.evaluate(()=>window.__traitArt.unchanged()),true);
    results.push({width,height,modelledTraits:24,uniqueIcons:24,learnedIcons:24,hiddenIcons:0,displaySize:28,metaUnchanged:true});
    console.log('Trait art passed',width);
  }
  assert.deepEqual(errors,[]);
  writeFileSync(`${dir}/browser-results.json`,JSON.stringify({results,errors},null,2)+'\n');
}finally{await browser.close();server.close();}
