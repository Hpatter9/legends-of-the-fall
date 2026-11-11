// Real-game portrait, character selection, construction and offline checks. Run after npm run web.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const { chromium } = createRequire(existsSync('/opt/codex/cua_node/lib/node_modules/playwright') ? '/opt/codex/cua_node/lib/node_modules/' : import.meta.url)('playwright');
const roster = JSON.parse(readFileSync('art-source/crown-terrace/hero-roster.json','utf8')).map(h=>h.kind);
const rulers = ['iron_stag','sun_viper','frost_witch','ash_empress','rose_duchess','moon_oracle','storm_corsair','gilded_necromancer'];
const tops = {treasury:5,barracks:7,armoury:7,mageTower:4,stable:5,library:5,chapel:3,smithy:3,watchtower:3,hall:4,drillYard:2};
const port=Number(process.env.PORT||8735);
const dir='docs/samples/crown-terrace'; mkdirSync(dir,{recursive:true});
const results=[];
const server=createServer((q,r)=>{
  const file=`out/web/${q.url.split('?')[0].slice(1)||'index.html'}`;
  if (!existsSync(file)) {r.writeHead(404);r.end();return;}
  const types={html:'text/html',js:'text/javascript',png:'image/png',webp:'image/webp',woff2:'font/woff2',webmanifest:'application/manifest+json'};
  r.writeHead(200,{'content-type':types[file.split('.').pop()]||'application/octet-stream'});
  r.end(readFileSync(file));
}).listen(port);
const browser=await chromium.launch({executablePath:existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try {
  for (const [width,height] of [[393,852],[360,780],[412,915]].filter(([w])=>!process.env.SIZE||w===Number(process.env.SIZE))) {
    console.log(`Crown Terrace ${width}: loading`);
    const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:2,reducedMotion:width===412?'reduce':'no-preference'});
    const page=await context.newPage();
    const errors=[],missing=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('response',r=>{if(r.url().includes('/crown-terrace/')&&r.status()>=400)missing.push(r.url());});
    await page.addInitScript(()=>{
      if(localStorage.getItem('crown-fixture'))return;
      localStorage.setItem('crown-fixture','1');
      const party=['knight','cleric','wizard','archer','samurai'];
      localStorage.setItem('legends.meta',JSON.stringify({seed:7,crowns:50000,stones:25,unlocked:[...party,'paladin','druid'],party,starter:{packs:[],pick:0},castle:{treasury:0,barracks:0,armoury:0,mageTower:0,stable:0,library:0},chapel:false,shards:{},stars:{},xp:Object.fromEntries(party.map(k=>[k,29760])),bestStage:14,daily:{},bosses:[],armies:{},armySeen:[],achievements:[],stash:[],opened:['castle','tower','calamity']}));
      localStorage.setItem('lotf-tips-off','1');
      localStorage.setItem('legends.settings',JSON.stringify({cinematics:false,ruler:'iron_stag'}));
    });
    async function open() {
      await page.waitForFunction(()=>!!window.__game?.home,null,{timeout:120000});
      await page.evaluate(()=>{document.getElementById('tipSkip')?.click();window.__game.home.open();window.__game.home.show('castle');});
      await page.waitForFunction(()=>{
        const c=window.__game.home.castle;
        return c.terrace.backgrounds.size===8&&c.terrace.buildings.size===37&&c.terrace.duchess.filter(Boolean).length===8&&c.goat&&c.heroKinds.every(k=>c.terrace.heroes.has(k))&&c.terrace.rulers.has(c.root.dataset.ruler);
      },null,{timeout:120000});
      await page.locator('#castleTab-hall').click();
      await page.evaluate(()=>document.querySelector('.crScroll').scrollTop=0);
    }
    async function still() {await page.evaluate(()=>window.__game.home.castle.stop());}
    async function start() {await page.evaluate(()=>window.__game.home.castle.start());}
    async function tap(x,y) {
      await page.locator('.ctHonorCanvas').scrollIntoViewIfNeeded();
      const b=await page.locator('.ctHonorCanvas').boundingBox();
      await page.mouse.click(b.x+x/800*b.width,b.y+y/1200*b.height);
    }
    async function screenshot(name,scene=false) {
      if (!scene) await page.evaluate(()=>document.querySelector('.crScroll').scrollTop=0);
      await (scene?page.locator('.ctHonorCanvas'):page).screenshot({path:`${dir}/${name}-${width}.jpg`,type:'jpeg',quality:86});
    }
    async function chooseRuler(id) {
      await page.locator('.crChangeRuler').click();
      assert.equal(await page.locator('#castleCourt [data-ruler]').count(),8);
      await page.locator(`#castleCourt [data-ruler="${id}"]`).click();
      await page.waitForFunction(id=>{const c=window.__game.home.castle;return c.root.dataset.ruler===id&&c.terrace.rulers.has(id);},id);
    }
    await page.goto(`http://localhost:${port}/`,{waitUntil:'domcontentloaded',timeout:120000});
    await open();
    await page.waitForTimeout(350);
    await screenshot('empty');
    const party=await page.evaluate(()=>[...window.__game.home.meta.party]);
    const before=await page.locator('.ctHonorCanvas').evaluate(c=>c.toDataURL());
    await page.waitForTimeout(1500);
    const after=await page.locator('.ctHonorCanvas').evaluate(c=>c.toDataURL());
    assert.equal(before===after,width===412,'visible motion follows reduced motion');
    // Actual selectors, with duplicate swaps, persisted preferences and no battle-party mutation.
    await page.locator('.crChooseCourt').click();
    await page.locator('#castleCourt [data-slot="0"]').click();
    await page.locator('#castleCourt [data-hero="cleric"]').click();
    await page.locator('#castleCourt .omBack').click();
    await page.waitForFunction(()=>window.__game.home.castle.heroKinds[0]==='cleric'&&window.__game.home.castle.terrace.heroes.has('cleric'));
    const duplicate=await page.evaluate(()=>window.__game.home.castle.heroKinds[2]);
    await page.locator('.crChooseCourt').click();
    await page.locator('#castleCourt [data-slot="0"]').click();
    await page.locator(`#castleCourt [data-hero="${duplicate}"]`).click();
    await page.locator('#castleCourt .omBack').click();
    assert.equal(await page.evaluate(()=>new Set(window.__game.home.castle.heroKinds).size),4);
    assert.deepEqual(await page.evaluate(()=>window.__game.home.meta.party),party,'court preserves party');
    await page.locator('.crChangeRuler').click();
    await screenshot('ruler-picker');
    await page.keyboard.press('Escape');
    for (const id of width===393?rulers:['frost_witch','iron_stag']) {
      await chooseRuler(id);
      if(width===393)await screenshot(id,true);
    }
    await chooseRuler('iron_stag');
    console.log(`Crown Terrace ${width}: selectors and rulers passed`);
    // UI starts real works: the old completed level remains until the existing home timer settles it.
    await page.locator('#castleTab-buildings').click();
    assert.equal(await page.locator('.crBuilding').count(),11);
    await page.locator('.crBuilding[data-site="barracks"]').click();
    await page.locator('#castleCard .omPrimary').click();
    assert.equal(await page.evaluate(()=>window.__game.home.meta.works?.id),'barracks');
    assert.equal(await page.evaluate(()=>window.__game.home.meta.castle.barracks),0);
    await page.evaluate(()=>window.__game.home.closeSheet());
    await page.locator('#castleTab-hall').click();
    await still();
    const construction=await page.locator('.ctHonorCanvas').evaluate(c=>c.toDataURL());
    await screenshot('construction',true);
    await page.evaluate(()=>{const h=window.__game.home;h.meta.works.doneAt=Date.now()-1;h.tickWorks();});
    await page.locator('#builtPop').click();
    await still();
    assert.equal(await page.evaluate(()=>window.__game.home.meta.castle.barracks),1);
    assert.notEqual(await page.locator('.ctHonorCanvas').evaluate(c=>c.toDataURL()),construction,'completed site changes kingdom');
    // Every site changes independently; all exact levels and all source cutouts are covered by the unit/art checks.
    await page.evaluate(tops=>{const h=window.__game.home;Object.assign(h.meta.castle,tops);h.meta.chapel=true;h.castle.update(h.meta);},tops);
    await start(); await page.waitForTimeout(1600); await still();
    await screenshot('completed');
    await screenshot('completed-scene',true);
    await start();
    await tap(622,590);
    assert.ok(await page.evaluate(()=>{const c=window.__game.home.castle;return c.kingDecreeUntil>c.now;}),'ruler responds');
    await tap(205,715);
    assert.ok(await page.evaluate(()=>{const c=window.__game.home.castle;return c.heroFlourishUntil[2]>c.now;}),'companion greeting');
    await still();
    await page.evaluate(()=>{const c=window.__game.home.castle;c.goat.mode='nest';c.goat.x=168;});
    await tap(168,942);
    assert.ok(await page.evaluate(()=>!!window.__game.home.meta.duchessTreat),'Duchess treat updates live save');
    await page.locator('.crTrophies').click();
    assert.ok(await page.locator('.crPage > .twOverlay').isVisible());
    await page.evaluate(()=>window.__game.home.castle.trophyModal.close());
    await page.locator('#castleTab-buildings').click();
    for(const id of Object.keys(tops)) {
      await page.locator(`.crBuilding[data-site="${id}"]`).click();
      assert.ok(await page.locator('#castleCard').isVisible(),`${id} retains card`);
      await page.evaluate(()=>window.__game.home.closeSheet());
    }
    await screenshot('buildings');
    await page.locator('#castleTab-buildings').press('Home');
    assert.equal(await page.locator('#castleTab-hall').getAttribute('aria-selected'),'true');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no horizontal overflow');
    if(width===393) {
      // Decoding every new file catches broken art and guarantees the entire selectable roster is available.
      const decoded=await page.evaluate(async ({roster,rulers,tops})=>{
        const names=[...rulers,...rulers.map(id=>`ruler-${id}`),...roster.map(k=>`hero-${k}`),...Object.keys(tops).flatMap(id=>[1,2,3].map(s=>`${id}-${s}`)),...Array.from({length:8},(_,i)=>`duchess-${i}`),'works-1','works-2','works-3'];
        await Promise.all(names.map(async name=>{const im=new Image();im.src=`ui/crown-terrace/${name}.webp`;await im.decode();}));
        return names.length;
      },{roster,rulers,tops});
      assert.equal(decoded,130);
      // Select every recruited identity through the real picker in batches, including all five Mythics.
      await page.evaluate(roster=>{const h=window.__game.home;h.meta.unlocked=roster;h.meta.heroesSeen=[...roster];h.castle.update(h.meta);},roster);
      await page.locator('.crChooseCourt').click();
      await page.locator('#castleCourt [data-slot="0"]').click();
      assert.equal(await page.locator('#castleCourt [data-hero]').count(),roster.length);
      await screenshot('hero-picker');
      await page.locator('#castleCourt [data-hero="nyxara"]').click();
      await page.locator('#castleCourt .omBack').click();
      await page.waitForFunction(()=>window.__game.home.castle.terrace.heroes.has('nyxara'));
      assert.equal(await page.evaluate(()=>window.__game.home.castle.heroKinds[0]),'nyxara');
      console.log('Crown Terrace 393: waiting for offline cache');
      await page.waitForFunction(()=>!!navigator.serviceWorker.controller,null,{timeout:120000});
      await page.waitForFunction(async()=>!!await caches.match('ui/crown-terrace/hero-nyxara.webp'),null,{timeout:120000});
      await page.evaluate(()=>{const h=window.__game.home;localStorage.setItem('legends.meta',JSON.stringify(h.meta));});
      const chosen=await page.evaluate(()=>JSON.parse(localStorage.getItem('legends.settings')).courtHeroes);
      console.log('Crown Terrace 393: cache ready, reloading offline');
      await context.setOffline(true);
      await page.reload({waitUntil:'domcontentloaded',timeout:120000});
      await open();
      console.log('Crown Terrace 393: offline scene ready');
      assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('legends.settings')).courtHeroes),chosen);
      assert.deepEqual(await page.evaluate(()=>window.__game.home.meta.party),party);
      assert.ok(await page.evaluate(()=>!!window.__game.home.meta.duchessTreat));
      await chooseRuler('moon_oracle');
      await page.locator('.crChooseCourt').click();
      await page.locator('#castleCourt [data-slot="0"]').click();
      await page.locator('#castleCourt [data-hero="astrax"]').click();
      await page.locator('#castleCourt .omBack').click();
      await page.waitForFunction(()=>window.__game.home.castle.terrace.heroes.has('astrax'));
      await screenshot('offline');
    }
    assert.deepEqual(errors,[],'no page errors'); assert.deepEqual(missing,[],'no missing court art');
    results.push({width,height,rulers:width===393?8:2,paintedAssets:width===393?130:undefined,selectableHeroes:width===393?roster.length:undefined,animated:width!==412,reduced:width===412,selectors:true,duplicateSwap:true,partyPreserved:true,construction:true,completedGrowth:true,duchessTreat:true,trophies:true,buildingCards:11,keyboard:true,offline:width===393,errors,missing});
    console.log(`Crown Terrace ${width}: passed`);
    await context.close();
  }
  const previous=process.env.SIZE&&existsSync(`${dir}/checks.json`)?JSON.parse(readFileSync(`${dir}/checks.json`,'utf8')).filter(r=>!results.some(n=>n.width===r.width)):[];
  writeFileSync(`${dir}/checks.json`,JSON.stringify([...results,...previous],null,2)+'\n');
} finally {await browser.close();server.close();}
