// Real page checks; hold the game bundle to inspect its otherwise brief loading screen.
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const root = 'out/web/';
const types = { html:'text/html', js:'text/javascript', png:'image/png', woff2:'font/woff2', opus:'audio/ogg', webmanifest:'application/manifest+json' };
const server = createServer((q,r) => {
  const path = root + (q.url.split('?')[0].slice(1) || 'index.html');
  if (!existsSync(path)) { r.writeHead(404); r.end(); return; }
  r.setHeader('Content-Type', types[path.split('.').pop()] || 'application/octet-stream');
  r.end(readFileSync(path));
}).listen(8167, '127.0.0.1');
const browser = await chromium.launch({executablePath:'/usr/bin/chromium', args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const samples = process.env.LOADING_SAMPLES || 'docs/samples/loading';
const offlineOnly = process.argv.includes('--offline-only');
const results = offlineOnly ? JSON.parse(readFileSync(`${samples}/checks.json`, 'utf8')).filter(r => r.width) : [];
mkdirSync(samples, {recursive:true});
try {
  for (const [width,height] of (offlineOnly ? [] : [[393,852],[360,780],[412,915]])) {
    const context=await browser.newContext({viewport:{width,height}});
    const page=await context.newPage(); await page.bringToFront(); const errors=[];
    page.on('pageerror',e=>{errors.push(e.message); console.error(e.message);});
    let release;
    const held=new Promise(ok=>release=ok);
    await page.route('**/game.js',async route=>{await held; await route.continue();});
    await page.goto('http://localhost:8167/?seed=741',{waitUntil:'commit'});
    await page.locator('.ldFooter').waitFor();
    await page.evaluate(()=>document.fonts.ready);
    const evidence=await page.evaluate(async()=>{
      const art=document.querySelector('.ldArt');
      const url=getComputedStyle(art).backgroundImage.slice(5,-2);
      const im=new Image(); im.src=url; await im.decode();
      const box=document.querySelector('.ldFooter').getBoundingClientRect();
      return {artWidth:im.naturalWidth,footerVisible:box.top>0 && box.bottom<=innerHeight,overflow:document.documentElement.scrollWidth>innerWidth,animations:document.getAnimations().length};
    });
    const layers = await page.evaluate(async () => {
      const gleam = document.querySelector('.ldGleam');
      const mask = gleam.closest('.ldCrownMask');
      const im = new Image(); im.src = getComputedStyle(mask).maskImage.slice(5,-2); await im.decode();
      const canvas = document.createElement('canvas'); canvas.width=im.width; canvas.height=im.height;
      const ctx=canvas.getContext('2d'); ctx.drawImage(im,0,0);
      const alpha=(x,y)=>ctx.getImageData(x,y,1,1).data[3];
      return { crownMask: alpha(425,400)>0 && alpha(425,100)===0 && alpha(20,850)===0 && alpha(425,1200)===0,
        cloudLayers: document.querySelectorAll('.ldClouds').length, snowflakes: document.querySelectorAll('.ldSnow i').length };
    });
    assert(layers.crownMask, 'Gold mask must exclude banners, clouds and landscape');
    assert.equal(layers.cloudLayers, 2); assert.equal(layers.snowflakes, 36);
    assert(evidence.artWidth>800); assert(evidence.footerVisible); assert(!evidence.overflow); assert(evidence.animations>=17);
    const title = await page.locator('.ldTitle').boundingBox();
    const footer = await page.locator('.ldFooter').boundingBox();
    assert(title.y + title.height < footer.y, 'Title and footer must not overlap');
    for (const selector of ['.ldGleam', '.ldCrownLight', '.ldBar i', '.ldClouds', '.ldSnow i']) {
      const motion = await page.locator(selector).first().evaluate(e => e.getAnimations().map(a => a.currentTime));
      await page.waitForFunction(({ selector, motion }) =>
        document.querySelector(selector).getAnimations().some((a, i) => a.currentTime > motion[i]),
        { selector, motion }, { timeout: 10000 });
    }
    await page.screenshot({path:`${samples}/keep-${width}x${height}.png`});
    const before=await page.locator('.ldMist').first().evaluate(e=>getComputedStyle(e).transform);
    await page.waitForTimeout(450);
    assert.notEqual(await page.locator('.ldMist').first().evaluate(e=>getComputedStyle(e).transform),before);
    await page.emulateMedia({reducedMotion:'reduce'});
    assert.equal(await page.evaluate(()=>document.getAnimations().length),0);
    await page.screenshot({path:`${samples}/reduced-${width}x${height}.png`});
    await page.emulateMedia({reducedMotion:'no-preference'});
    release();
    await page.waitForFunction(()=>!!window.__game,null,{timeout:60000}).catch(async e=>{console.error(await page.locator('#loading').textContent().catch(()=>'')); await page.screenshot({path:`${samples}/startup-debug.png`}); throw e;});
    assert.equal(await page.locator('#loading').count(),0);
    assert.deepEqual(errors,[]);
    results.push({width,height,...evidence,...layers,movement:true,reducedMotion:true,startup:true,pageErrors:errors});
    await context.close();
    writeFileSync(`${samples}/checks.json`,JSON.stringify(results,null,2)+'\n');
    console.log(`${width}x${height}: layout, crown mask, motion, reduced motion and startup passed`);
  }
  // Use an un-routed context so Chromium's real service worker can own requests.
  const context=await browser.newContext({viewport:{width:393,height:852}});
  const page=await context.newPage();
  await page.goto('http://localhost:8167/?seed=741', {waitUntil:'commit'});
  await page.waitForFunction(()=>!!window.__game,null,{timeout:60000}).catch(async e=>{console.error(await page.locator('#loading').textContent().catch(()=>'')); await page.screenshot({path:`${samples}/startup-debug.png`}); throw e;});
  await page.evaluate(async()=>{await navigator.serviceWorker.ready;});
  await page.waitForFunction(()=>!!navigator.serviceWorker.controller,null,{timeout:60000});
  await page.waitForFunction(async()=>{const c=await caches.open((await caches.keys())[0]);return !!(await c.match('./index.html'));},null,{timeout:60000});
  await context.setOffline(true);
  await page.reload({waitUntil:'commit'});
  await page.waitForFunction(()=>!!window.__game,null,{timeout:60000}).catch(async e=>{console.error(await page.locator('#loading').textContent().catch(()=>'')); await page.screenshot({path:`${samples}/startup-debug.png`}); throw e;});
  assert.equal(await page.locator('#loading').count(),0);
  const cached=await page.evaluate(async()=>{
    const res=await caches.match('./index.html'); return (await res.text()).includes('data:image/webp;base64,');
  });
  assert(cached); results.push({offlineReload:true,artEmbeddedInCachedPage:true});
  await context.close();
  writeFileSync(`${samples}/checks.json`,JSON.stringify(results,null,2)+'\n');
  console.log(JSON.stringify(results,null,2));
} finally {await browser.close();server.close();}
