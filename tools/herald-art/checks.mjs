// npm run web && node tools/herald-art/checks.mjs
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import * as esbuild from 'esbuild';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const dir = 'docs/samples/herald-art';
mkdirSync(dir, { recursive: true });
await esbuild.build({ entryPoints: ['tools/herald-art/lab.ts'], outfile: 'out/herald-art-lab.js', bundle: true, format: 'iife', platform: 'browser', loader: { '.png': 'dataurl', '.webp': 'dataurl' } });
const types = { html: 'text/html', js: 'text/javascript', css: 'text/css', png: 'image/png', webp: 'image/webp', opus: 'audio/ogg', woff2: 'font/woff2' };
const server = createServer((req, res) => {
  const path = req.url === '/__lab.js' ? 'out/herald-art-lab.js' : 'out/web/' + (req.url.split('?')[0].slice(1) || 'index.html');
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
 const ids=await page.evaluate(()=>window.__heraldArt.ids);
 for(const [width,height] of [[393,852],[360,780],[412,915]]){
  await page.setViewportSize({width,height});
  const sources=[];
  for(const id of ids){
   await page.evaluate(id=>window.__heraldArt.intro(id),id);
   assert.equal(await page.locator('#bossCard').isVisible(),true);
   assert.ok(await decoded('#bossCard .heraldIntro'));
   assert.equal(await page.locator('#bossCard canvas').count(),0);
   await page.locator('#bossCard .heraldIntro').evaluate(e=>Promise.all(e.getAnimations().map(a=>a.finished)));
   assert.ok(await page.locator('#bossCard .heraldIntro').evaluate(e=>{const r=e.getBoundingClientRect();return e.naturalWidth===512&&r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight}));
   sources.push(await page.locator('#bossCard .heraldIntro').getAttribute('src'));
   await shot(`intro-${id}-${width}`);
   await page.locator('#bossCard').click();
   assert.equal(await page.locator('#bossCard').isVisible(),false);
  }
  assert.equal(new Set(sources).size,6);
  await page.evaluate(()=>window.__heraldArt.intro('orcWarlord'));
  assert.equal(await page.locator('#bossCard canvas').count(),1);
  assert.equal(await page.locator('#bossCard .heraldIntro').count(),0);
  await page.locator('#bossCard').click();
  await page.evaluate(()=>window.__heraldArt.codex());
  await page.locator('#hmSub .cxTab').filter({hasText:'Bestiary'}).click();
  assert.equal(await page.locator('#hmSub .cxCard.calamity .cxHerald').count(),6);
  assert.ok(await decoded('#hmSub .cxCard.calamity .cxHerald'));
  for(let i=0;i<6;i++){
   await page.locator('#hmSub .cxCard.calamity').nth(i).click();
   assert.ok(await decoded('#hmSub .cxOverlay .cxHerald'));
   assert.equal(await page.locator('#hmSub .cxOverlay .cxHerald').getAttribute('src'),await page.locator('#hmSub .cxCard.calamity .cxHerald').nth(i).getAttribute('src'));
   if(i===0||i===5)await shot(`codex-${i}-${width}`);
   await page.locator('#hmSub .cxOverlay button').filter({hasText:'Close'}).click();
  }
  await page.evaluate(()=>window.__heraldArt.codex(false));
  await page.locator('#hmSub .cxTab').filter({hasText:'Bestiary'}).click();
  assert.equal(await page.locator('#hmSub .cxCard.calamity .cxHerald').count(),0);
  assert.deepEqual(await page.locator('#hmSub .cxCard.calamity b').allTextContents(),Array(6).fill('???'));
  await page.locator('#hmSub .cxCard.calamity').first().click();
  assert.equal(await page.locator('#hmSub .cxOverlay .cxHerald').count(),0);
  await shot(`unknown-${width}`);
  results.push({width,height,busts:6,codexFaces:6,unknownConcealed:true,spriteFallback:true,closeWorks:true});
  console.log('Herald paintings passed',width);
 }
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.evaluate(()=>window.__heraldArt.intro('calBoss1'));
 assert.equal(await page.locator('#bossCard .heraldIntro').evaluate(e=>getComputedStyle(e).animationName),'bcDim');
 assert.equal(errors.length,0,[...new Set(errors)].join('\n'));
 writeFileSync(`${dir}/browser-results.json`,JSON.stringify({results,reducedMotion:true,errors},null,2)+'\n');
}finally{await browser.close();server.close();}
