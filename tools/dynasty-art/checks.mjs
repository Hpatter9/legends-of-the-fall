// npm run web && node tools/art-finish/checks.mjs
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import * as esbuild from 'esbuild';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const dir = 'docs/samples/dynasty-art';
mkdirSync(dir, { recursive: true });
await esbuild.build({ entryPoints: ['tools/dynasty-art/lab.ts'], outfile: 'out/dynasty-art-lab.js', bundle: true, format: 'iife', platform: 'browser', loader: { '.png': 'dataurl', '.webp': 'dataurl' } });
const types = { html: 'text/html', js: 'text/javascript', css: 'text/css', png: 'image/png', webp: 'image/webp', opus: 'audio/ogg', woff2: 'font/woff2' };
const server = createServer((req, res) => {
  const path = req.url === '/__lab.js' ? 'out/dynasty-art-lab.js' : 'out/web/' + (req.url.split('?')[0].slice(1) || 'index.html');
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
  const backdrop=selector=>page.locator(selector).evaluate(async card=>{
    const bg=card.style.backgroundImage;
    const match=bg.match(/url\("?(data:[^"]+)"?\)/);
    if(!match) return false;
    const img=new Image();img.src=match[1];await img.decode();
    return img.naturalWidth===768 && getComputedStyle(card).backgroundSize.split(',').every(size=>size.trim()==='cover');
  });
  for(const [width,height] of [[393,852],[360,780],[412,915]]) {
    await page.setViewportSize({width,height});
    await page.evaluate(()=>window.__dynastyArt.houses());
    assert.ok(await backdrop('#housesPage .hsPage'));
    assert.ok(await decoded('#housesPage .hsHouseCrest, #housesPage .hsFate'));
    assert.equal(await page.locator('#housesPage .hsFate').evaluateAll(imgs=>new Set(imgs.map(i=>i.src)).size)>=4,true);
    await shot(`houses-${width}`);
    await page.evaluate(()=>window.__dynastyArt.line());
    assert.ok(await backdrop('#houseLine .hsPage'));
    assert.ok(await decoded('#houseLine .hsHeirloomChip img'));
    assert.equal(await page.locator('#houseLine .hsHeirloomChip img').count(),1);
    await shot(`line-${width}`);
    const seasons=[];
    for(let i=0;i<4;i++) {
      await page.evaluate(i=>window.__dynastyArt.season(i),i);
      assert.ok(await decoded('#seasonCard .hsSeasonBig'));
      seasons.push(await page.locator('#seasonCard .hsSeasonBig').getAttribute('src'));
      if(i===0 || width===393) await shot(`season-${i}-${width}`);
    }
    assert.equal(new Set(seasons).size,4);
    await page.evaluate(()=>window.__dynastyArt.council());
    assert.ok(await backdrop('#nemesisBoard .nmBoard'));
    await shot(`council-${width}`);
    for(let i=0;i<4;i++) {
      await page.evaluate(i=>window.__dynastyArt.traits(i),i);
      assert.equal(await page.locator('#nemesisCard .nmTraitIcon').count(),3);
      assert.ok(await decoded('#nemesisCard .nmTraitIcon'));
      if(i===0 || width===393) await shot(`traits-${i}-${width}`);
      await page.evaluate(i=>window.__dynastyArt.traits(i,true),i);
      assert.equal(await page.locator('#nemesisCard .nmTraitIcon').count(),0);
      assert.equal(await page.locator('#nemesisCard .nmSecret.hidden').count(),3);
    }
    await shot(`unknown-${width}`);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    results.push({width,height,backdrops:2,seasons:4,fates:4,house:true,heirloom:true,learnedTraits:12,unknownTraitsHidden:true});
    console.log('Dynasty art passed',width);
  }
  assert.deepEqual(errors,[]);
  writeFileSync(`${dir}/browser-results.json`,JSON.stringify({results,errors},null,2)+'\n');
}finally{await browser.close();server.close();}
