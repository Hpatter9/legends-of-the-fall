// Actual game review, seeded only in this browser context. No production hooks.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
await build({ entryPoints: ['tools/ascended/fixture.ts'], outfile: 'out/ascended-seed.cjs', platform: 'node', bundle: true, format: 'cjs', logLevel: 'silent' });
await build({ entryPoints: ['tools/ascended/fixture.ts'], outfile: 'out/web/ascended-fixture.js', platform: 'browser', bundle: true, format: 'iife', globalName: 'ASCEND_FIXTURE', logLevel: 'silent' });
const seed = require('../../out/ascended-seed.cjs');
const out = 'docs/samples/ascended-heroes/browser';
mkdirSync(out, { recursive: true });
const mime = { html: 'text/html', js: 'text/javascript', css: 'text/css', png: 'image/png', webp: 'image/webp', json: 'application/json', webmanifest: 'application/manifest+json', woff2: 'font/woff2', opus: 'audio/ogg' };
const server = createServer((req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  if (path === '/favicon.ico') { res.writeHead(204); return res.end(); }
  try {
    const file = `out/web${path === '/' ? '/index.html' : path}`;
    res.setHeader('Content-Type', mime[file.split('.').pop()] ?? 'application/octet-stream');
    res.end(readFileSync(file));
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(ok => server.listen(0, '127.0.0.1', ok));
const url = `http://localhost:${server.address().port}`;
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const results = [];
const tipIds = [...readFileSync('src/tips.ts','utf8').matchAll(/^  (\w+): \{ text:/gm)].map(m=>m[1]);
assert.ok(tipIds.length >= 18);

async function battle(page, kinds, grades = [1, 2, 3, 4, 2], awake = true) {
  await page.evaluate(({ kinds, grades, awake }) => {
    const g = window.__game, a = window.ASCEND_FIXTURE;
    g.app.ticker.stop(); document.getElementById('tipSkip')?.click(); g.home.go(()=>{});
    for (const kind of kinds) g.meta.awakened[kind] = awake ? 1 : 0;
    g.meta.party = kinds;
    g.run = a.newRun(7, kinds, g.meta.castle, 0, 999);
    g.run.roster = kinds.map((kind, i) => ({ id: i + 1, kind, grade: grades[i] ?? 1 }));
    g.run.squad = kinds.map((_, i) => i + 1); g.run.nextId = kinds.length + 1;
    g.newBattle(); g.endIntro?.(); g.app.ticker.stop();
    for (const u of g.b.units.filter(u => u.side === 'hero')) {
      const s = g.sprites.get(u.id); s.update(g.b.board, 1000, false);
    }
    g.app.renderer.render({ container: g.app.stage });
  }, { kinds, grades, awake });
  await page.waitForFunction(()=>window.__game.app.stage.renderable && document.getElementById('home').hidden);
  await page.evaluate(()=>{const g=window.__game;g.app.ticker.stop();g.app.renderer.render({container:g.app.stage});});
}

try {
  for (const [width, height] of (process.argv.includes('--quick') ? [[393,852]] : [[393,852], [360,780], [412,915]])) {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, serviceWorkers: 'allow' });
    const meta = seed.startedMeta(7);
    meta.unlocked = [...seed.ALL_HEROES]; meta.party = ['knight','archer','wizard','paladin','cleric'];
    meta.shards = Object.fromEntries(seed.ALL_HEROES.map(k => [k,80]));
    meta.ranked = Object.fromEntries(seed.ALL_HEROES.map(k => [k,4]));
    meta.awakened = Object.fromEntries(seed.ALL_HEROES.map(k => [k,1]));
    meta.heroesSeen = [...seed.ALL_HEROES];
    meta.ores = Object.fromEntries(seed.ORE_TRAITS.map(k => [k,100]));
    await context.addInitScript(({ meta, tipIds }) => {
      if (!localStorage.getItem('ascended-review-seeded')) {
        localStorage.clear(); localStorage.setItem('legends.meta', JSON.stringify(meta));
        localStorage.setItem('legends.settings', JSON.stringify({ music:0, effects:0, cinematics:false, quips:false }));
        localStorage.setItem('legends.tips',JSON.stringify(tipIds)); localStorage.setItem('ascended-review-seeded','1');
      }
    }, { meta, tipIds });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0,300)); });
    await page.goto(`${url}/?seed=7`, { waitUntil:'domcontentloaded', timeout:120000 });
    await page.waitForFunction(() => window.__game, null, { timeout:120000 });
    await page.addScriptTag({ url: `${url}/ascended-fixture.js` });
    console.log(`${width}: ready`);

    // The before/after card uses genuinely different sprites and pays through
    // the existing awakening handler, then the second step keeps the same form.
    await page.evaluate(() => { const g=window.__game; g.meta.awakened.knight=0; g.home.open(); g.home.openSheet('knight'); });
    await page.locator('.rankBadge').click();
    await page.locator('.ruCard').waitFor();
    assert.equal(await page.locator('.ruLooks.two canvas').count(), 2);
    assert.equal(await page.locator('.ruLooks.two canvas').evaluateAll(cs => cs[0].toDataURL() !== cs[1].toDataURL()), true);
    await page.screenshot({ path:`${out}/awakening-${width}.png` });
    await page.locator('.ruBtns .primary').click();
    await page.waitForFunction(() => window.__game.meta.awakened.knight === 1);
    await page.locator('.rankBadge').click(); await page.locator('.ruCard').waitFor();
    assert.equal(await page.locator('.ruLooks.two').count(), 0);
    await page.locator('.ruBtns button').last().click();
    await page.locator('.heroBack').click();

    const portraits = width===393 && !process.argv.includes('--quick') ? seed.ALL_HEROES : ['knight','paladin','wizard','cleric','timeWitch'];
    await page.evaluate(() => { const g=window.__game; g.home.open(); g.home.show('heroes'); });
    await page.waitForFunction(() => [...document.querySelectorAll('.hcard .heroAwakenedArt')].every(i => i.complete && i.naturalWidth));
    await page.screenshot({ path:`${out}/roster-${width}.png` });
    for (const kind of portraits) {
      await page.evaluate(kind => window.__game.home.openSheet(kind), kind);
      await page.waitForFunction(() => { const i=document.querySelector('.heroDetail .hpic img.heroAwakenedArt'); return i?.complete && i.naturalWidth; });
      assert.equal(await page.locator('.heroDetail').evaluate(e => e.scrollWidth <= e.clientWidth+1), true, `${kind}: dossier fits`);
      await page.locator('.heroArtOpen').click();
      await page.waitForFunction(() => { const i=document.querySelector('dialog.heroArtViewer > img'); return i?.complete && i.naturalWidth; });
      assert.ok((await page.locator('dialog.heroArtViewer > img').getAttribute('src')).endsWith(`/heroes/${kind}.webp`) || (await page.locator('dialog.heroArtViewer > img').getAttribute('src'))===`heroes/${kind}.webp`);
      await page.locator('.heroArtForm').click();
      await page.waitForFunction(() => { const i=document.querySelector('dialog.heroArtViewer > img'); return i?.complete && i.naturalWidth; });
      assert.ok((await page.locator('dialog.heroArtViewer > img').getAttribute('src')).includes(`awakened-${kind}.webp`));
      await page.keyboard.press('Escape');
      if (['knight','wizard','paladin'].includes(kind)) await page.screenshot({ path:`${out}/dossier-${kind}-${width}.png` });
      await page.locator('.heroBack').click();
    }

    let frameChecks=0;
    const groups = width===393 && !process.argv.includes('--quick') ? Array.from({length:9},(_,i)=>seed.ALL_HEROES.slice(i*5,i*5+5)) : [['knight','archer','wizard','cleric','paladin']];
    for (const kinds of groups) {
      await battle(page,kinds);
      frameChecks += await page.evaluate(() => {
        const g=window.__game,a=window.ASCEND_FIXTURE;let n=0;
        for (const u of g.b.units.filter(u=>u.side==='hero')) {
          const s=g.sprites.get(u.id), expected=a.battleSheet(u.def,1,u.grade??1);
          if (s.ownSheet!==expected) throw Error(`${u.def}: upgraded sheet`);
          if (!!s.awakenAura !== ((u.grade??1)>1)) throw Error(`${u.def}: tier aura`);
          for(let dir=0;dir<4;dir++) for(let f=0;f<8;f++) {
            u.facing=dir;delete u.swing;delete u.cast;delete u.look;
            const [du,dv]=[[1,0],[0,1],[-1,0],[0,-1]][dir];
            u.step={u:u.u-du,v:u.v-dv,h:a.tileAt(g.b.board,u.u,u.v).h,at:1000-((f+.25)/8)*650,ms:650};
            s.update(g.b.board,1000,true);
            const sheet=[2,3].includes(dir)?a.layout[expected].rear:expected,l=a.layout[sheet],r=s.body.texture.frame;
            if(s.sheet!==sheet||r.x!==f%4*l.w||r.y!==(l.rows.indexOf('walk')+Math.floor(f/4))*l.h)throw Error(`${u.def}: facing ${dir} stride ${f} actual ${s.sheet} rect ${JSON.stringify(r)} expected ${sheet} walk-row ${l.rows.indexOf('walk')} cell ${l.w}x${l.h}`);
            if(Math.sign(s.body.scale.x)!==([0,3].includes(dir)?1:-1))throw Error(`${u.def}: mirror`);
            n++;
          }
          delete u.step;
        }
        return n;
      });
    }
    let classAuraCombinations=0;
    if(width===393 && !process.argv.includes('--quick')) {
      const reps=[...new Map(seed.ALL_HEROES.map(k=>[seed.auraOf(k).trait,k])).values()];
      for(const grade of [2,3]) for(let i=0;i<reps.length;i+=5){
        const kinds=reps.slice(i,i+5);await battle(page,kinds,kinds.map(()=>grade));
        classAuraCombinations+=await page.evaluate(()=>{const g=window.__game;let checked=0;for(const s of g.sprites.values()){if(s.unit.side!=='hero')continue;const aura=s.awakenAura;if(!aura?.bits.length||!aura.bits.some(b=>b.sp.alpha>0))throw Error(`${s.unit.def}: painted aura invisible`);aura.update(1000,s.tall,1,false);const before=aura.bits[0].sp.texture;aura.update(1130,s.tall,1,false);if(aura.bits[0].sp.texture===before)throw Error(`${s.unit.def}: painted aura does not animate`);checked++;}return checked;});
      }
      assert.equal(classAuraCombinations,26);
    }
    await battle(page,['knight','archer','wizard','cleric','paladin']);
    await page.screenshot({ path:`${out}/tiers-awakened-${width}.png` });
    // A promotion constructs a new sprite, upgrading the class aura as well.
    await page.evaluate(() => {const g=window.__game,u=g.b.units.find(u=>u.side==='hero'&&u.def==='knight');g.promoteHero(u.id,2);if(!g.sprites.get(u.id).awakenAura)throw Error('Tier 2 aura missing after promotion');g.promoteHero(u.id,4);if(g.sprites.get(u.id).shownGrade!==4)throw Error('Tier 4 promotion lost');});
    const transformations=await page.evaluate(()=>{const g=window.__game,a=window.ASCEND_FIXTURE,u=g.b.units.find(u=>u.side==='hero'),s=g.sprites.get(u.id),old=u.def,result=[];for(const[kind,look,sheet]of[['werewolf','werewolf_black','awakened_werewolfBrute'],['druid','cls_treant','awakened_treant'],['druid','cls_treant_2','awakened_treant2'],['druid','cls_treant_3','awakened_treant3']]){u.def=kind;u.look=look;u.facing=3;s.update(g.b.board,1000,false);if(s.sheet!==a.layout[sheet].rear)throw Error(`${kind}: transformed gear`);result.push(look);}u.def=old;delete u.look;return result;});
    await battle(page,['knight','archer','wizard','cleric','paladin'],[1,2,3,4,2],false);
    await page.screenshot({ path:`${out}/tiers-base-${width}.png` });
    assert.equal(await page.evaluate(()=>{const g=window.__game,a=window.ASCEND_FIXTURE;return g.b.units.filter(u=>u.side==='hero').every(u=>{const s=g.sprites.get(u.id);return s.ownSheet===a.battleSheet(u.def,0,u.grade??1)&&!!s.awakenAura===((u.grade??1)>1);});}),true,'unawakened forms also wear tier auras');
    await battle(page,['knight','archer','wizard','cleric','paladin']);
    await page.evaluate(()=>{const g=window.__game;g.app.ticker.start();g.begin();});
    await page.waitForTimeout(1500);
    await page.screenshot({ path:`${out}/combat-${width}.png` });
    await page.emulateMedia({reducedMotion:'reduce'});
    assert.equal(await page.evaluate(()=>{const g=window.__game;g.app.ticker.stop();for(const s of g.sprites.values()){if(!s.awakenAura||!s.unit.alive)continue;delete s.unit.step;delete s.unit.cast;delete s.unit.swing;s.update(g.b.board,1000,false);const a=s.awakenAura.bits.map(b=>[b.sp.x,b.sp.y,b.sp.alpha,b.sp.texture]);s.update(g.b.board,5000,false);if(!s.awakenAura.bits.every((b,i)=>b.sp.x===a[i][0]&&b.sp.y===a[i][1]&&b.sp.alpha===a[i][2]&&b.sp.texture===a[i][3]))return false;}return true;}),true,'reduced-motion aura holds still');
    await page.screenshot({ path:`${out}/reduced-${width}.png` });
    await page.evaluate(()=>window.__game.party.open('edit',()=>{}));
    await page.screenshot({ path:`${out}/party-${width}.png` });
    // Last Stand shares UnitSprite but has its own tray and viewport.
    await page.evaluate(async()=>{const g=window.__game;g.party.close?.();await g.stand.open();});
    await page.locator('.stPick .primary').click();
    await page.waitForFunction(()=>window.__game.stand.state && window.__game.stand.sprites.size>0);
    assert.equal(await page.evaluate(()=>{const st=window.__game.stand,a=window.ASCEND_FIXTURE;return [...st.sprites.values()].filter(s=>s.unit.side==='hero').every(s=>s.ownSheet===a.battleSheet(s.unit.def,s.unit.awaken??0,s.unit.grade??1));}),true,'Last Stand equipment');
    await page.screenshot({path:`${out}/stand-${width}.png`});
    await page.evaluate(()=>window.__game.stand.leave());
    let offline=false;
    if(width===393 && !process.argv.includes('--quick')){
      await page.evaluate(()=>localStorage.setItem('legends.meta',JSON.stringify(window.__game.meta)));
      await page.evaluate(()=>navigator.serviceWorker.ready);
      await page.waitForFunction(()=>!!navigator.serviceWorker.controller,null,{timeout:120000});
      await context.setOffline(true);await page.reload({waitUntil:'domcontentloaded',timeout:120000});
      await page.waitForFunction(()=>window.__game,null,{timeout:120000});
      await page.evaluate(()=>{window.__game.home.open();window.__game.home.openSheet('wizard');});
      await page.locator('.heroArtOpen').click();
      await page.waitForFunction(()=>{const i=document.querySelector('dialog.heroArtViewer>img');return i?.complete&&i.naturalWidth;});
      await page.screenshot({path:`${out}/offline-${width}.png`});offline=true;
    }
    assert.deepEqual(errors,[],errors.join('\n'));
    results.push({width,height,portraits:portraits.length,frameChecks,classAuraCombinations,transformations,firstAndSecondAwakening:true,promotion:true,baseAndAwakenedAuras:true,reducedMotion:true,lastStand:true,offline,errors});
    console.log(`${width}: passed`);await context.close();
  }
  if(!process.argv.includes('--quick')) {
    // A genuinely fresh save must not decode the upgraded roster. Its first
    // awakening loads the one pair before drawing the before/after preview.
    const context=await browser.newContext({viewport:{width:393,height:852},serviceWorkers:'block'});
    const meta=seed.startedMeta(19);meta.shards.knight=80;meta.ranked={knight:4};
    meta.ores=Object.fromEntries(seed.ORE_TRAITS.map(k=>[k,100]));delete meta.awakened;
    await context.addInitScript(({meta,tipIds})=>{if(!localStorage.getItem('ascended-fresh-seeded')){localStorage.clear();localStorage.setItem('legends.meta',JSON.stringify(meta));localStorage.setItem('legends.tips',JSON.stringify(tipIds));localStorage.setItem('legends.settings',JSON.stringify({music:0,effects:0,cinematics:false,quips:false}));localStorage.setItem('ascended-fresh-seeded','1');}}, {meta,tipIds});
    const page=await context.newPage(),requests=[],errors=[];
    page.on('request',r=>{if(new URL(r.url()).pathname.startsWith('/awakened/'))requests.push(r.url());});
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`${url}/?seed=19`,{waitUntil:'domcontentloaded',timeout:120000});
    await page.waitForFunction(()=>window.__game,null,{timeout:120000});
    assert.equal(requests.length,0,'fresh save does not load any upgraded animation sheet');
    await page.evaluate(()=>{const g=window.__game;g.home.open();g.home.openSheet('knight');});
    await page.locator('.rankBadge').click();await page.locator('.ruLooks.two').waitFor();
    assert.equal(new Set(requests).size,2,'first preview loads only Knight front and rear');
    assert.equal(await page.locator('.ruLooks.two canvas').evaluateAll(cs=>cs[0].toDataURL()!==cs[1].toDataURL()),true);
    await page.screenshot({path:`${out}/fresh-first-awakening.png`});
    await page.locator('.ruBtns .primary').click();
    await page.waitForFunction(()=>window.__game.meta.awakened?.knight===1);
    await page.reload({waitUntil:'domcontentloaded',timeout:120000});
    await page.waitForFunction(()=>window.__game,null,{timeout:120000});
    assert.equal(await page.evaluate(()=>window.__game.meta.awakened.knight),1,'first awakening survives reload');
    assert.deepEqual(errors,[]);
    results.push({freshSaveLazyLoading:true,requestedUpgradeSheets:2,reloadedAwakening:true,errors});
    console.log('Fresh save and first on-demand awakening: passed');await context.close();
  }
} finally {
  await browser.close();server.close();
  writeFileSync(`${out}/checks.json`,JSON.stringify(results,null,2)+'\n');
}
console.log(JSON.stringify(results,null,2));
