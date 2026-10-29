// Live UI checks against the compiled game. The server exposes only out/web on loopback.
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { chromium, executablePath } from './browser.mjs';
const webRoot = resolve('out/web');
const server = createServer((req, res) => {
  if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const file = resolve(webRoot, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!file.startsWith(webRoot + sep) || !existsSync(file) || !statSync(file).isFile()) { res.writeHead(404); res.end(); return; }
  const ext = file.split('.').pop();
  res.setHeader('Content-Type', ({html:'text/html',js:'text/javascript',css:'text/css',png:'image/png',json:'application/json',webmanifest:'application/manifest+json',woff2:'font/woff2',opus:'audio/ogg'})[ext] ?? 'application/octet-stream');
  if (req.method === 'HEAD') res.end(); else res.end(readFileSync(file));
});
await new Promise((resolve) => server.listen(8157, '127.0.0.1', resolve));
const source=`
import { startedMeta } from './src/sim/meta';
import { calamityRun } from './src/sim/modes';
import { choices,clearNode,enterNode,mapFor } from './src/sim/tower';
import { chooseAltar,pendingAltar } from './src/sim/rift';
import { destinationWorld,WORLD_IDS,destinationBoard } from './src/sim/sanctuary';
import { saveSlot } from './src/sim/run';
import { hireHero } from './src/sim/climb';
import { ALL_HEROES } from './src/sim/units';
import { fight,playOut } from './src/sim/battle';
export { hireHero,ALL_HEROES,startedMeta,calamityRun,choices,clearNode,enterNode,mapFor,chooseAltar,pendingAltar,destinationWorld,WORLD_IDS,destinationBoard,saveSlot,fight,playOut };
export function prepare(run,kind) {
 while(!choices(run).some(n=>n.kind===kind)) {
  const altar=pendingAltar(run);if(altar)chooseAltar(run,altar==='patron'?'ember':altar==='offering'?'fury':'together');
  run.tower.mapDone=undefined;const n=choices(run)[0];if(!n)throw Error('No target '+kind);enterNode(run,n.id);clearNode(run);
 }
 return choices(run).find(n=>n.kind===kind).id;
}`;
const bundle=await build({stdin:{contents:source,resolveDir:process.cwd()},bundle:true,write:false,format:'iife',globalName:'RiftFixture',loader:{'.png':'empty', '.webp': 'empty' }});
const sceneryOnly=process.argv.includes('--scenery-only');
const expect=(ok,message)=>{if(!ok)throw Error(message)};
// (WAVE-RECAP-2: a won Calamity fight shows the short see-through card, which goes on by itself or on a tap; there is no Next button to press)
const passCard=async(page,file)=>{await page.waitForFunction(()=>{const r=document.getElementById('result');return !r.hidden&&r.classList.contains('passing')});if(file)await page.screenshot({path:file});const title=await page.evaluate(()=>document.getElementById('banner')?.textContent??'');await page.evaluate(()=>document.getElementById('result').click());await page.waitForFunction(()=>document.getElementById('result').hidden);return title;};
// (the run's screens fade in: a screenshot waits for them to be whole)
const settled=async(page)=>page.waitForFunction(()=>{const t=document.getElementById('towerMap');return t.hidden||getComputedStyle(t).opacity==='1'});
const shot=async(page,opts)=>{await settled(page);await page.screenshot(opts);};
const winFight=async(page)=>page.evaluate(()=>{const g=window.__game;for(const u of g.b.units)if(u.side==='foe'){u.hp=u.maxHp=1;u.power=.01;}RiftQA.fight(g.b);RiftQA.playOut(g.b);g.endWait=100000;g.refresh()});
let browser;mkdirSync('docs/samples/rift-sanctuary',{recursive:true});
try {
 browser=await chromium.launch({executablePath,headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:{width:393,height:852},reducedMotion:'reduce'});
 await context.addInitScript({content:bundle.outputFiles[0].text+`;globalThis.RiftQA=RiftFixture;if(!localStorage.getItem('legends.meta')){const m=RiftQA.startedMeta(1);m.opened=['calamity','tower','castle'];localStorage.setItem('legends.meta',JSON.stringify(m));}localStorage.setItem('legends.tips',JSON.stringify(['home','deploy','fight','mana','skill','ult','summon','crowns','calamity','tower','talents','castle','spellbook','stash','equipment','recycle','retry','autoReplay']));localStorage.setItem('legends.settings',JSON.stringify({cinematics:false,music:0,effects:0}));`});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.message)});
 await page.goto('http://localhost:8157/');await page.waitForFunction(()=>!!window.__game);
 for(const [width,height] of [[393,852],[360,780],[412,915]]) {
  if(sceneryOnly)break;
  await page.setViewportSize({width,height});
  await page.evaluate(()=>{const g=window.__game;document.getElementById('result').hidden=true;const r=RiftQA.calamityRun(14,g.meta,'knight');g.towerView.close();g.home.go(()=>g.resumeSlot(r));RiftQA.saveSlot(r)});
  const hub=page.locator('#towerMap.rsMode:not([hidden])');await hub.waitFor();
  await page.waitForFunction(()=>document.querySelector('.rsScenery')?.naturalWidth>0);
  expect(await hub.locator('.rsDestination').count()===3,'Three destinations missing');
  expect(await hub.locator('.rsHero canvas').count()===1,'Starter missing');
  await shot(page,{path:`docs/samples/rift-sanctuary/sanctuary-${width}.png`});
  const layout=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,enter:document.querySelector('.rsMenu').getBoundingClientRect().bottom<=innerHeight,card:[...document.querySelectorAll('.rsDestination')].every(e=>e.getBoundingClientRect().width>=44),scene:document.querySelector('.rsScene').getBoundingClientRect().height}));expect(!layout.overflow&&layout.enter&&layout.card&&layout.scene>=170,JSON.stringify(layout));
  const first=await page.evaluate(()=>window.__game.run.tower.path.length);
  await hub.locator('.rsDestination').nth(1).click();expect(await page.evaluate(()=>window.__game.run.tower.path.length)===first,'Preview committed encounter');
  await shot(page,{path:`docs/samples/rift-sanctuary/preview-${width}.png`});
  await hub.locator('.rsEnter').click();
  await page.waitForFunction(()=>window.__game.run.tower.cur?.fight&&window.__game.b.phase==='deploy');
  expect(await page.locator('#sky .riftBattleBackdrop').count()===1,'Destination battle backdrop missing');
  expect(await page.evaluate(()=>window.__game.b.board.pieces.some(p=>p.kind==='riftPortal')),'Battle arrival portal missing');
  await shot(page,{path:`docs/samples/rift-sanctuary/battle-${width}.png`});
  await page.evaluate(()=>{const g=window.__game;for(const u of g.b.units)if(u.side==='foe'){u.hp=u.maxHp=1;u.power=.01;}RiftQA.fight(g.b);RiftQA.playOut(g.b);g.endWait=100000;g.refresh()});
  await passCard(page,`docs/samples/rift-sanctuary/short-card-${width}.png`);await page.getByRole('button',{name:/^Ember /}).click();await page.getByRole('button',{name:'Consecrate',exact:true}).click();await hub.waitFor();
  expect(await page.evaluate(()=>window.__game.run.tower.row)===1,'Victory did not advance one crossing');
  expect(await hub.locator('.rsFragment').count()===1,'Completed world fragment missing');
  const recruitId=await page.evaluate(()=>RiftQA.choices(window.__game.run).find(n=>n.kind==='recruit').id);
  await hub.locator(`.rsDestination[data-id="${recruitId}"]`).click();await hub.locator('.rsEnter').click();
  expect(await hub.locator('.rsLocation .rtCard.recruit').isVisible(),'Scenic recruit location missing');
  await shot(page,{path:`docs/samples/rift-sanctuary/recruit-${width}.png`});
  await hub.locator('.rtCard.recruit .rtItem.hero').first().click();await page.getByRole('button',{name:'Move on',exact:true}).click();
  expect(await hub.locator('.rsHero canvas').count()===2,'Recruited hero absent from sanctuary');
  const gold=await page.evaluate(()=>{window.__game.run.gold=100;window.__game.towerView.open(window.__game.run);return window.__game.run.gold});
  await hub.locator('.rsShift').click();expect(await page.evaluate(()=>window.__game.run.gold)===gold-20,'Reshape cost incorrect');expect(await hub.locator('.rsShift').isDisabled(),'Reshape repeat allowed');
  await hub.locator('.rsMenu').getByRole('button',{name:'Company',exact:true}).click();expect(await hub.locator('.rtParty .rtHero').count()===2,'Company lost heroes');await page.getByRole('button',{name:'Back',exact:true}).click();
  await shot(page,{path:`docs/samples/rift-sanctuary/company-${width}.png`});
  await page.waitForFunction(()=>!!navigator.serviceWorker.controller,null,{timeout:60000});await context.setOffline(true);await page.reload();await page.waitForFunction(()=>!!window.__game);await page.evaluate(()=>window.__game.home.go(()=>window.__game.openMode('calamity')));await hub.waitFor();
  expect(await hub.locator('.rsHero canvas').count()===2,'Offline company lost');expect(await page.evaluate(()=>window.__game.run.rift.expedition.shifts)===1,'Offline reshaping lost');expect(await hub.locator('.rsShift').isDisabled(),'Offline reshape repeated');await context.setOffline(false);
  console.log(`PASS ${width}x${height}: previews, real battle/return, altar, recruit scenery and party, fragments, reshape, company, offline reload, layout`);
 }
 // Inspect every actual destination court at all required portrait sizes. These are renderer fixtures, not campaign wins.
 for(const [width,height] of [[393,852],[360,780],[412,915]]){
  await page.setViewportSize({width,height});
  for(const world of ['ashen','rootbound','caravan','prism','hollow','frost']){
   await page.evaluate(world=>{const g=window.__game;g.towerView.close();document.getElementById('result').hidden=true;const r=RiftQA.calamityRun(14,g.meta,'knight');RiftQA.enterNode(r,RiftQA.choices(r)[0].id);r.tower.cur.world=world;r.tower.cur.fight.stage.board=RiftQA.destinationBoard(14,world);r.tower.cur.fight.stage.area=r.tower.cur.fight.stage.board.area;g.home.go(()=>g.resumeSlot(r))},world);
   await page.waitForFunction(w=>window.__game.b.board.riftWorld===w,world);
   await shot(page,{path:`docs/samples/rift-sanctuary/arena-${world}-${width}.png`});
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Arena page overflow');
  }
  console.log(`PASS ${width}: six destination battle courts`);
 }

 if(!sceneryOnly) {
 // Noncombat worlds retain their actual shop and camp actions in the new scenic presentation.
 for(const kind of ['shop','campfire']){
  const id=await page.evaluate(kind=>{const g=window.__game;g.towerView.close();const r=RiftQA.calamityRun(14,g.meta,'knight');r.gold=500;const id=RiftQA.prepare(r,kind);g.home.go(()=>g.resumeSlot(r));return id},kind);
  await page.locator(`.rsDestination[data-id="${id}"]`).click();await page.locator('.rsEnter').click();
  expect(await page.locator(`.rsLocation .rtCard.${kind}`).isVisible(),'Scenic '+kind+' missing');
  if(kind==='shop') await page.getByRole('button',{name:'Leave the shop',exact:true}).click();
  else {await page.getByRole('button',{name:/^Rest heal/}).click();await page.getByRole('button',{name:'Break camp',exact:true}).click();}
  expect(await page.locator('.rsEnter').isVisible(),'Did not return from '+kind);
 }
 console.log('PASS scenic shop and camp actions return to sanctuary');
 // A guardian victory must unlock the next region and offering without losing the recap.
 await page.evaluate(()=>{const g=window.__game;g.towerView.close();document.getElementById('result').hidden=true;const r=RiftQA.calamityRun(14,g.meta,'knight');r.rift.wins=1;RiftQA.chooseAltar(r,'ember');RiftQA.prepare(r,'boss');g.home.go(()=>g.resumeSlot(r))});
 expect(await page.locator('.rsDestination').count()===1,'Guardian has alternatives');expect(await page.locator('.rsShift').isDisabled(),'Guardian can be reshaped');await page.locator('.rsEnter').click();
 await page.waitForFunction(()=>window.__game.b.phase==='deploy'&&window.__game.run.tower.cur?.kind==='boss');
 expect(await page.evaluate(()=>!!window.__game.b.board.arenaMid),'Guardian lacks defined arena centre');
 await page.evaluate(()=>{const g=window.__game;for(const u of g.b.units)if(u.side==='foe'){u.hp=u.maxHp=1;u.power=.01;}RiftQA.fight(g.b);RiftQA.playOut(g.b);g.endWait=100000;g.refresh()});
 await passCard(page);await page.getByRole('button',{name:/^Offering of Fury /}).click();await page.getByRole('button',{name:'Consecrate',exact:true}).click();
 // (the region recap carries the region's share of the run recap: WAVE-RECAP-2's detail)
 expect(await page.locator('.rtCard .rcDetail').count()===1,'Region recap has no per-hero detail');
 await shot(page,{path:'docs/samples/rift-sanctuary/region-recap-412.png'});
 await page.getByRole('button',{name:'On to region 2',exact:true}).click();
 expect(await page.evaluate(()=>window.__game.run.tower.act)===2,'Guardian did not open region 2');expect(await page.locator('.rsDestination').count()===3,'Next region has no destinations');
 console.log('PASS guardian battle, offering, recap and next region');
 // The full company remains readable; starter stays visually central.
 await page.evaluate(()=>{const g=window.__game;for(const kind of RiftQA.ALL_HEROES.slice(1,10))if(g.run.roster.length<10)RiftQA.hireHero(g.run,kind,0);g.towerView.open(g.run)});
 expect(await page.locator('.rsHero').count()===10,'Full company is not displayed');await shot(page,{path:'docs/samples/rift-sanctuary/full-company-412.png'});
 // Portal crossing commits and saves before the flourish, and a reload resumes that exact encounter.
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.evaluate(()=>{const g=window.__game;g.towerView.close();const r=RiftQA.calamityRun(41,g.meta,'knight');g.home.go(()=>g.resumeSlot(r));document.querySelector('.rsEnter').click()});
 expect(await page.locator('.rsDeparting .rsCrossing').count()===1,'Portal crossing flourish missing');
 const committed=await page.evaluate(()=>JSON.parse(localStorage.getItem('legends.calamity')).tower.cur.world);expect(!!committed,'Crossing not saved before animation');
 await page.reload();await page.waitForFunction(()=>!!window.__game);await page.evaluate(()=>window.__game.home.go(()=>window.__game.openMode('calamity')));await page.waitForFunction(w=>window.__game.b.board.riftWorld===w,committed);
 console.log('PASS normal portal crossing and reload before animation completes');
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.evaluate(()=>{const g=window.__game;document.getElementById('result').hidden=true;const r=RiftQA.calamityRun(14,g.meta,'knight');delete r.rift.expedition;r.tower.map=RiftQA.mapFor(r,1);g.home.go(()=>g.resumeSlot(r))});
 expect(await page.locator('.dmPortal').count()===1,'Existing graph save was converted');expect(await page.locator('.rsDestination').count()===0,'Existing graph save got new rules');
 console.log('PASS existing Calamity graph save compatibility');
 // The last guardian at every size: its court, its short card is skipped (the run is over), and the end summary with the whole calamity's detail.
 await page.emulateMedia({reducedMotion:'reduce'});
 for(const [width,height] of [[393,852],[360,780],[412,915]]){
  await page.setViewportSize({width,height});
  await page.evaluate(()=>{const g=window.__game;g.towerView.close();document.getElementById('result').hidden=true;const r=RiftQA.calamityRun(14,g.meta,'knight');
   for(;;){const id=RiftQA.prepare(r,'boss');if(r.tower.act===3)break;RiftQA.enterNode(r,id);RiftQA.clearNode(r);}
   const altar=RiftQA.pendingAltar(r);if(altar)RiftQA.chooseAltar(r,altar==='patron'?'ember':altar==='offering'?'fury':'together');r.tower.mapDone=undefined;g.home.go(()=>g.resumeSlot(r))});
  expect(await page.locator('.rsDestination').count()===1,'Last guardian has alternatives');
  await shot(page,{path:`docs/samples/rift-sanctuary/guardian-preview-${width}.png`});
  await page.locator('.rsEnter').click();
  await page.waitForFunction(()=>window.__game.b.phase==='deploy'&&window.__game.run.tower.cur?.kind==='boss'&&window.__game.run.tower.act===3);
  await shot(page,{path:`docs/samples/rift-sanctuary/guardian-${width}.png`});
  await winFight(page);
  await page.waitForFunction(()=>!document.getElementById('result').hidden);
  expect(await page.evaluate(()=>window.__game.run.cleared&&!document.getElementById('result').classList.contains('passing')),'The last guardian should end the run with no short card');
  await page.locator('#next').click();
  await page.locator('.rtCard.victory').waitFor();
  expect(await page.locator('.rtCard.victory .rcDetail').count()===1,'End summary has no per-hero detail');
  await shot(page,{path:`docs/samples/rift-sanctuary/end-summary-${width}.png`});
  const over=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);expect(!over,'End summary overflows');
  console.log(`PASS ${width}: last guardian and the end summary with detail`);
 }
 // A lost crossing: the short last card, then the summary told in regions and crossings, with the fight-by-fight detail.
 await page.setViewportSize({width:393,height:852});
 await page.evaluate(()=>{const g=window.__game;g.towerView.close();document.getElementById('result').hidden=true;const r=RiftQA.calamityRun(15,g.meta,'knight');g.home.go(()=>g.resumeSlot(r))});
 await page.locator('.rsEnter').click();await page.waitForFunction(()=>window.__game.b.phase==='deploy');
 await page.evaluate(()=>{const g=window.__game;for(const u of g.b.units){if(u.side==='hero'){u.hp=u.maxHp=1;u.power=.01;}else u.power=50;}RiftQA.fight(g.b);RiftQA.playOut(g.b);g.endWait=100000;g.refresh()});
 await page.waitForFunction(()=>!document.getElementById('result').hidden&&window.__game.run.over);
 await shot(page,{path:'docs/samples/rift-sanctuary/lost-card-393.png'});
 await page.locator('#next').click();await page.locator('.rtCard.summary').waitFor();
 expect(await page.locator('.rtCard.summary .rcDetail').count()===1,'Loss summary has no detail');
 expect(/region 1/.test(await page.locator('.rtCard.summary').innerText()),'Loss summary not told in regions');
 await shot(page,{path:'docs/samples/rift-sanctuary/lost-summary-393.png'});
 console.log('PASS lost crossing: short last card and summary in regions');
 }
 expect(errors.length===0,errors.join('\n'));await context.close();
} finally {if(browser)await browser.close();server.close();}
