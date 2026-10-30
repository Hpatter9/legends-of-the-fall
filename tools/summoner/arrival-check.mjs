// Real-browser arrival checks. Run after npm run web; PLAYWRIGHT_MODULE and CHROMIUM_PATH can select local tools.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE ?? '/opt/codex/cua_node/lib/node_modules/playwright');
const mime = { html:'text/html', js:'text/javascript', png:'image/png', webp:'image/webp', woff2:'font/woff2', opus:'audio/ogg' };
const server = createServer((req,res) => {
  const path = `out/web/${new URL(req.url,'http://localhost').pathname.slice(1) || 'index.html'}`;
  if (!existsSync(path)) { res.writeHead(404); res.end(); return; }
  res.setHeader('Content-Type',mime[path.split('.').pop()] ?? 'application/json');
  res.end(readFileSync(path));
});
await new Promise(resolve => server.listen(0,resolve));
const base = `http://localhost:${server.address().port}`;
const out = 'docs/samples/summon-arrival';
mkdirSync(out,{recursive:true});
const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH ?? '/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const results = [];
try {
  for (const [width,height,reduced] of [[393,852,false],[360,780,false],[412,915,false],[393,852,true]]) {
    const context = await browser.newContext({viewport:{width,height},reducedMotion:reduced?'reduce':'no-preference',hasTouch:true});
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(() => {
      const owned = ['knight','samurai','kunoichi','archer','wizard','peasant','ninjaMonk','wanderer'];
      localStorage.setItem('legends.meta',JSON.stringify({seed:7,crowns:4000,unlocked:owned,party:owned.slice(0,5),pulls:0,castle:{},shards:{},stars:{},xp:{},bestStage:30,tower:0,daily:{},bosses:[],achievements:[],armies:{},armySeen:[],stones:60,heroesSeen:owned}));
      localStorage.setItem('lotf-tips-off','1');
      localStorage.setItem('legends.settings',JSON.stringify({music:0,effects:0,cinematics:false,quips:false}));
    });
    await page.goto(base);
    await page.waitForFunction(()=>window.__game && window.__tarot,null,{timeout:90000});
    const tag = `${width}${reduced?'-reduced':''}`;
    console.log('Checking',tag);
    const show = async(kind='knight',opts={})=>page.evaluate(({kind,opts})=>{
      window.__arrivalObserver?.disconnect();
      void window.__tarot.firstReveal(window.__game.meta,kind,opts);
      const sprite=document.querySelector('.tarotReveal .trFigure');
      window.__arrivalFrames=[];
      window.__arrivalObserver=new MutationObserver(()=>window.__arrivalFrames.push({anim:sprite.dataset.anim,frame:sprite.dataset.frame}));
      window.__arrivalObserver.observe(sprite,{attributes:true,attributeFilter:['data-frame','data-anim']});
    },{kind,opts});
    const dismiss = async()=>{
      await page.waitForTimeout(470);
      await page.mouse.click(width/2,height-25);
      await page.waitForSelector('.tarotReveal',{state:'detached'});
    };
    await show();
    await page.waitForSelector('.tarotReveal[data-stage="1"]');
    await page.screenshot({path:`${out}/charge-${tag}.png`});
    if (!reduced) {
      await page.waitForSelector('.tarotReveal[data-stage="2"]');
      assert.equal(await page.locator('.tarotReveal .summonerActor').getAttribute('data-pose'),'shield');
      await page.waitForTimeout(90);
      await page.screenshot({path:`${out}/impact-${tag}.png`});

    }
    await page.waitForSelector('.tarotReveal[data-stage="4"]');
    await page.waitForSelector('.trFigure[data-anim="idle"]');
    const attackFrames=await page.evaluate(()=>window.__arrivalFrames.filter(f=>f.anim==='attack').map(f=>f.frame));
    if(reduced) assert.equal(attackFrames.length,0,'Reduced motion stays idle');
    else assert.ok(new Set(attackFrames).size>=2,'Attack advances through battle frames before idle');
    await page.waitForTimeout(500);
    const fit = await page.locator('.tarotReveal').evaluate(root=>{
      const box=sel=>root.querySelector(sel).getBoundingClientRect().toJSON();
      const art=root.querySelector('.trArtwork'), sprite=root.querySelector('.trFigure');
      return {artLoaded:art.complete&&art.naturalWidth>0,sprite:box('.trFigure'),plate:box('.trPlate'),hint:box('.trHint'),width:innerWidth,height:innerHeight,visible:getComputedStyle(sprite).opacity,animation:getComputedStyle(root.querySelector('.trSparks i')).animationName,frame:sprite.dataset.frame};
    });
    assert.ok(fit.artLoaded);
    assert.equal(fit.visible,'1');
    assert.ok(fit.sprite.x>=0&&fit.sprite.right<=width&&fit.sprite.bottom<=fit.plate.top+3,`Sprite fits above plaque: ${JSON.stringify(fit)}`);
    assert.ok(fit.plate.x>=0&&fit.plate.right<=width&&fit.plate.bottom<fit.hint.top,'Plaque and continue fit');
    if (reduced) { assert.equal(fit.animation,'none'); assert.equal(fit.frame,'0'); }
    else {
      const idle = await page.locator('.trFigure').getAttribute('data-frame');
      await page.waitForTimeout(180);
      assert.notEqual(await page.locator('.trFigure').getAttribute('data-frame'),idle,'Idle keeps animating');
    }
    await page.screenshot({path:`${out}/revealed-${tag}.png`});
    await dismiss();
    assert.ok(await page.evaluate(()=>JSON.parse(localStorage.getItem('legends.meta')).heroesSeen.includes('knight')));
    // Skipping exposes the final hero; a quick second tap cannot acknowledge it.
    await show('samurai');
    await page.waitForTimeout(480);
    await page.mouse.click(width/2,height/2);
    await page.mouse.click(width/2,height/2);
    assert.equal(await page.locator('.tarotReveal').getAttribute('data-stage'),'4');
    assert.equal(await page.locator('.trFigure').getAttribute('data-anim'),'idle');
    await dismiss();
    if(width===393&&!reduced) {
      // Long names and very different body/weapon proportions use the same layout.
      for(const kind of ['samuraiCommander','werewolf','demonSwordsman','kitsune','siegeBot']) {
        await show(kind);
        await page.waitForSelector('.tarotReveal[data-stage="4"]');
        await page.waitForTimeout(500);
        assert.ok(await page.locator('.trFigure').evaluate(c=>c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===3&&v>8)),`${kind} sprite has pixels`);
        assert.ok(await page.locator('.trPlate').evaluate(e=>e.getBoundingClientRect().top>=document.querySelector('.trFigure').getBoundingClientRect().bottom-3),`${kind} fits`);
        await page.screenshot({path:`${out}/${kind}.png`});
        await dismiss();
      }
      // A real lucky stone still goes through the queued scene and returns to the reward cards.
      await page.evaluate(()=>{window.__forceLucky=true;window.__game.home.open();window.__game.home.show('recruit');window.__game.home.summon(1);});
      await page.waitForSelector('.tarotReveal');
      await page.waitForSelector('.tarotReveal[data-stage="4"]');
      await dismiss();
      await page.waitForFunction(()=>!document.getElementById('pull1').disabled);
      assert.equal(await page.locator('.tarotResult.joined .tarotSide.front').evaluate(e=>e.style.filter),'');
      // Both full artwork and bundle/sheets remain usable after an offline reload.
      console.log('Checking offline reload');
      await page.evaluate(async()=>{await navigator.serviceWorker.ready;});
      await page.waitForFunction(async()=>!!(await caches.match(new URL('heroes/knight.webp',location.href))));
      await context.setOffline(true);
      await page.reload();
      await page.waitForFunction(()=>window.__game&&window.__tarot,null,{timeout:90000});
      await show();
      await page.waitForSelector('.tarotReveal[data-stage="4"]');
      assert.ok(await page.locator('.trArtwork').evaluate(e=>e.complete&&e.naturalWidth>0));
      await page.screenshot({path:`${out}/offline.png`});
      await dismiss();
    }
    assert.deepEqual(errors,[]);
    results.push({width,height,reduced,fit,errors});
    console.log('Passed',tag);
    await context.close();
  }
  writeFileSync(`${out}/checks.json`,JSON.stringify(results,null,2));
  console.log('Arrival passed: attack once, idle, skip guard, save acknowledgement, 3 phone sizes, reduced motion, varied heroes, real stone and offline reload.');
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
