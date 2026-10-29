// After npm run web: PLAYWRIGHT_MODULE=<optional module path> node tools/awaken/painted-checks.mjs
// Controlled awakened saves and battle fixtures; screenshots use the actual game renderers.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = 'out/painted-auras';
mkdirSync(root, { recursive: true });
await build({ entryPoints: ['tools/awaken/painted-lab.ts'], outfile: 'out/aura-review.js', bundle: true, format: 'iife', loader: { '.png': 'dataurl', '.woff2': 'dataurl' } });
const server = createServer((req, res) => {
  const path = `out/web/${req.url.split('?')[0].slice(1) || 'index.html'}`;
  if (!existsSync(path)) { res.writeHead(404); res.end(); return; }
  const type = { html: 'text/html', js: 'text/javascript', css: 'text/css', json: 'application/json', webmanifest: 'application/manifest+json' }[path.split('.').pop()];
  res.setHeader('Content-Type', type || 'application/octet-stream'); res.end(readFileSync(path));
}).listen(8151);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const representatives = ['knight','juggernaut','samurai','ranger','rifleBot','wizard','timeWitch','priestess','werewolf','reaper','kitsune','druid','lancer'];
const heroes = JSON.parse(readFileSync('tools/awaken/aura-places.mjs','utf8').match(/const ALL = (\[[^;]+\]);/)[1].replaceAll("'",'"'));
const all = JSON.parse(readFileSync('tools/awaken/aura-pack.json'));
const results = [];
try {
  for (const [width,height,reduced,saver] of [[393,852,false,false],[360,780,false,false],[412,915,false,false],[393,852,true,false],[393,852,false,true]]) {
    const tag = `${width}x${height}${reduced ? '-reduced' : saver ? '-saver' : ''}`;
    const context = await browser.newContext({ viewport: { width,height }, deviceScaleFactor: 2, reducedMotion: reduced ? 'reduce' : 'no-preference' });
    const page = await context.newPage();
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(({heroes,saver}) => {
      if (localStorage.getItem('aura-review-save')) return;
      localStorage.clear(); localStorage.setItem('aura-review-save', '1');
      localStorage.setItem('legends.meta', JSON.stringify({ seed:7, crowns:2000, unlocked:heroes, party:['knight','wizard','werewolf','ranger','priestess'], pulls:0, dry:0, dryMythic:0, castle:{treasury:1,barracks:1,armoury:0,mageTower:0,stable:0,library:0}, shards:Object.fromEntries(heroes.map(k=>[k,26])), awakened:Object.fromEntries(heroes.map(k=>[k,2])), stars:{}, xp:Object.fromEntries(heroes.map(k=>[k,60000])), bestStage:14,tower:9,daily:{},bosses:[],achievements:[],armies:{},armySeen:[],stash:[],opened:['tower','castle','calamity'], heroesSeen:heroes }));
      localStorage.setItem('lotf-tips-off', '1');
      localStorage.setItem('legends.settings', JSON.stringify({cinematics:false,music:0,effects:0,saver}));
    }, { heroes,saver });
    await page.goto('http://localhost:8151', { waitUntil:'domcontentloaded',timeout:120000 });
    await page.waitForFunction(() => !!window.__game, null, {timeout:120000});
    await page.addScriptTag({ path:'out/aura-review.js' });
    await page.evaluate(() => window.__auraReview.loadAuraImage());
    const audit = await page.evaluate(({reduced,saver}) => {
      const a=window.__auraReview, image=a.auraImage();
      const c=document.createElement('canvas'); c.width=c.height=a.AURA_CELL;
      const g=c.getContext('2d'), samples=[];
      for(const key of a.AURA_KEYS) {
        const [x,y,n]=a.auraStrip(key); let visibleMin=Infinity, edgeMax=0; const hashes=[];
        for(let f=0;f<n;f++) {
          g.clearRect(0,0,c.width,c.height);g.drawImage(image,(x+f)*c.width,y*c.height,c.width,c.height,0,0,c.width,c.height);
          const p=g.getImageData(0,0,c.width,c.height).data;let visible=0,hash=2166136261;
          for(let i=0;i<p.length;i+=4) {
            if(p[i+3]>24)visible++;
            const px=(i/4)%c.width,py=Math.floor(i/4/c.width);
            if(px===0||py===0||px===c.width-1||py===c.height-1)edgeMax=Math.max(edgeMax,p[i+3]);
            hash=Math.imul(hash^p[i],16777619);hash=Math.imul(hash^p[i+3],16777619);
          }
          visibleMin=Math.min(visibleMin,visible);hashes.push(hash);
        }
        samples.push({key,frames:n,visibleMin,edgeMax,uniqueFrames:new Set(hashes).size});
      }
      return {cell:a.AURA_CELL,pixel:a.AURA_PIXEL,samples};
    }, {reduced,saver});
    assert.equal(audit.cell,96);assert.equal(audit.pixel,false);assert.equal(audit.samples.length,Object.keys(all).length);
    for(const sample of audit.samples) { assert.ok(sample.visibleMin>12,`${sample.key}: visible frames`);assert.equal(sample.edgeMax,0,`${sample.key}: transparent edges`);assert.ok(sample.uniqueFrames>1,`${sample.key}: animated`); }
    await page.addStyleTag({content:'#tip,#tipBox,.tip,.duchess,#quip{display:none!important}'});
    await page.evaluate(()=>{document.getElementById('tipSkip')?.click();window.__game.home.show('battle');});
    await page.waitForTimeout(1500);await page.screenshot({path:`${root}/camp-${tag}.png`});
    await page.evaluate(()=>window.__game.home.openRoster());await page.waitForTimeout(600);
    await page.screenshot({path:`${root}/roster-${tag}.png`});
    await page.locator('.hcard[data-kind="wizard"]').click();await page.waitForTimeout(600);
    await page.screenshot({path:`${root}/dossier-${tag}.png`});
    // Place an actual hero on an unobstructed tile, using the live Pixi UnitView.
    await page.evaluate(()=>{window.__game.home.closeSheet?.();window.__game.newBattle();document.getElementById('home').hidden=true;});
    await page.waitForTimeout(1000);
    const wanted = width===393&&!reduced&&!saver ? representatives : ['wizard','werewolf'];
    const battle=[];
    for(const kind of wanted) for(const step of [1,2]) {
      const sample=await page.evaluate(({kind,step})=>{
        const g=window.__game,b=g.b;
        g.auraProto??=JSON.parse(JSON.stringify(b.units[0]));
        g.auraSpot??=(()=>{
          const bd=b.board,tile=(u,v)=>bd.tiles[v*bd.w+u],clear=t=>t&&!t.rock&&!t.wall&&!t.barrel&&!t.bush&&!t.tree&&!t.ground&&!t.perch&&!t.ramp&&!t.bridge;
          for(let v=3;v<bd.d-2;v++)for(let u=2;u<bd.w-2;u++)if(clear(tile(u,v))&&[[1,0],[0,1],[1,1],[-1,1]].every(([x,y])=>clear(tile(u+x,v+y))&&tile(u+x,v+y).h<=tile(u,v).h))return[u,v];
          return[3,8];
        })();
        const unit=JSON.parse(JSON.stringify(g.auraProto));Object.assign(unit,{id:9000,def:kind,side:'hero',u:g.auraSpot[0],v:g.auraSpot[1],grade:3,level:30,facing:1,alive:true,hp:100,maxHp:100,awaken:step});
        b.units=[unit];g.syncSprites(true);const sp=g.sprites.get(unit.id);sp.update(b.board,1234,false);
        g.tx=g.cx=sp.x;g.ty=g.cy=sp.y-18;g.zoom=g.tzoom=2.6;g.place();
        const aura=sp.awakenAura;aura.update(1234,sp.tall/sp.sizeNow,1,matchMedia('(prefers-reduced-motion: reduce)').matches);
        const before=JSON.stringify(b),poses=()=>aura.bits.map(bit=>[bit.sp.x,bit.sp.y,bit.sp.texture.uid]);
        const first=poses();aura.update(1800,sp.tall/sp.sizeNow,1,matchMedia('(prefers-reduced-motion: reduce)').matches);const second=poses();
        return {kind,step,bits:aura.bits.length,linear:aura.bits.every(bit=>bit.sp.texture.source.style.scaleMode==='linear'),calmStable:JSON.stringify(first)===JSON.stringify(second),unchanged:before===JSON.stringify(b),feet:(()=>{const p=sp.root.getGlobalPosition(),r=g.app.canvas.getBoundingClientRect(),scale=r.width/g.app.screen.width;return{x:r.left+p.x*scale,y:r.top+p.y*scale};})()};
      },{kind,step});
      assert.ok(sample.bits>=2);assert.ok(sample.linear);assert.ok(sample.unchanged);if(reduced)assert.ok(sample.calmStable);
      await page.waitForTimeout(180);
      await page.screenshot({path:`${root}/battle-${kind}-${step}-${tag}.png`});
      if(width===393&&!reduced&&!saver)await page.screenshot({path:`${root}/close-${kind}-${step}.png`,clip:{x:Math.max(0,Math.min(width-160,Math.round(sample.feet.x-80))),y:Math.max(0,Math.min(height-200,Math.round(sample.feet.y-170))),width:160,height:200}});
      battle.push(sample);
    }
    let offline=false;
    if(width===393&&!reduced&&!saver) {
      await page.evaluate(async()=>{await navigator.serviceWorker.ready;});
      await page.waitForFunction(()=>!!navigator.serviceWorker.controller,null,{timeout:60000});
      await context.setOffline(true);await page.reload({waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>!!window.__game,null,{timeout:120000});
      await page.addScriptTag({path:'out/aura-review.js'});await page.evaluate(()=>window.__auraReview.loadAuraImage());
      offline=await page.evaluate(()=>window.__auraReview.auraImage().naturalWidth>0);
      assert.ok(offline);await context.setOffline(false);
    }
    assert.deepEqual(errors,[]);results.push({tag,audit,battle,offline,errors});
    await context.close();console.log('passed',tag);
  }
} finally {await browser.close();server.close();}
mkdirSync('docs/samples/painted-auras', { recursive: true });
writeFileSync('docs/samples/painted-auras/checks.json',JSON.stringify(results,null,2));
