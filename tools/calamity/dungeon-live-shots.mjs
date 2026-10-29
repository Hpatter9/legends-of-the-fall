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
await new Promise((resolve) => server.listen(8156, '127.0.0.1', resolve));
const source = `
import { startedMeta } from './src/sim/meta';
import { calamityRun } from './src/sim/modes';
import { choices, clearNode, enterNode, finishTower, moveTo, mapFor, setGoing } from './src/sim/tower';
import { startStage, saveSlot } from './src/sim/run';
import { CAL_ROWS } from './src/sim/calamity';
import { chooseAltar, pendingAltar, growStarter } from './src/sim/rift';
import { sideSpots, routeBetween, START_ID } from './src/sim/calLand';
import { fight, playOut, place } from './src/sim/battle';
import { localBoost } from './src/sim/climb';
import { frontSpots } from './tools/autoplay';
export { startedMeta, calamityRun, saveSlot, mapFor, fight, playOut, setGoing, CAL_ROWS, growStarter };
export function prepareRoom(run, kind) {
 const t=run.tower, target=t.map.find(n=>n.kind===kind);
 if (!target) throw Error('No '+kind+' room');
 const sides=sideSpots(run.seed,t.act,t.map), all=new Set([-1,...t.map.map(n=>n.id)]);
 const route=routeBetween(t.map,sides,all,t.here??t.at,target.id);
 if (!route) throw Error('No route to '+kind);
 for(const id of route.slice(1,-1)) {
  if(id===START_ID||t.path.includes(id)) {moveTo(run,id);continue;}
  if(!enterNode(run,id)) throw Error('Fixture cannot enter '+id);
  if(t.cur.fight) {
   t.cur.fight.stage.foes={hp:.01,atk:.01};
   const b=startStage(run), spots=frontSpots(b);
   run.roster.forEach((h,i)=>place(b,h.kind,...spots[i],h.id,localBoost(h)));
   fight(b);playOut(b);finishTower(run,b,b.phase==='won');
  } else clearNode(run);
  const altar=pendingAltar(run);
  if(altar) chooseAltar(run,altar==='patron'?'ember':altar==='offering'?'fury':'together');
 }
 return target.id;
}`;
const bundle = await build({ stdin:{contents:source,resolveDir:process.cwd()},bundle:true,write:false,format:'iife',globalName:'DungeonFixture',loader:{'.png':'empty', '.webp': 'empty' } });
let browser;
mkdirSync('docs/samples/calamity-dungeon-live',{recursive:true});
const altarOnly = process.argv.includes('--altar-only');
const navigationOnly = process.argv.includes('--navigation-only');
const expect = (ok, message) => { if(!ok) throw Error(message); };
try {
 browser = await chromium.launch({executablePath,headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:{width:393,height:852},reducedMotion:'reduce'});
 await context.addInitScript({content:bundle.outputFiles[0].text+`;globalThis.DungeonQA=DungeonFixture;if(!localStorage.getItem('legends.meta')){const m=DungeonQA.startedMeta(1);m.opened=['calamity','tower','castle'];localStorage.setItem('legends.meta',JSON.stringify(m));}localStorage.setItem('legends.settings',JSON.stringify({cinematics:false,music:0,effects:0}));`});
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log('PAGE ERROR',e.message)});
 await page.goto('http://localhost:8156/');
 await page.waitForFunction(()=>!!window.__game);
 for(const [width,height] of [[393,852],[360,780],[412,915]]) {
  if (navigationOnly) break;
  await page.setViewportSize({width,height});
  await page.evaluate(()=>{const g=window.__game;document.getElementById('result').hidden=true;const r=DungeonQA.calamityRun(14,g.meta,'knight');g.towerView.close();g.home.go(()=>g.resumeSlot(r));DungeonQA.saveSlot(r)});
  const map=page.locator('#towerMap.dmMode:not([hidden])');await map.waitFor();
  if (altarOnly) {
   await page.evaluate(()=>{const g=window.__game;DungeonQA.growStarter(g.run);g.towerView.open(g.run)});
   await page.getByRole('button',{name:/^Ember /}).click();
   await page.waitForFunction(()=>document.querySelector('.altarScenery img')?.naturalWidth===1024);
   expect(await page.locator('.altarScenery').evaluate(e=>getComputedStyle(e).position==='absolute'&&getComputedStyle(e).zIndex==='-1'),'Sanctuary background layer is not behind the choices');
   await page.screenshot({path:`docs/samples/calamity-dungeon-live/altar-${width}.png`});
   await page.getByRole('button',{name:'Consecrate',exact:true}).click();
   await page.evaluate(()=>{const g=window.__game;g.run.tower.bosses=1;g.towerView.open(g.run)});
   await page.getByRole('button',{name:/^Offering of Fury /}).click();
   await page.screenshot({path:`docs/samples/calamity-dungeon-live/offering-${width}.png`});
   await page.getByRole('button',{name:'Corrupt',exact:true}).click();
   expect(await page.evaluate(()=>window.__game.run.rift.corruption)===1,'Corrupt offering failed');
   await page.evaluate(()=>{const g=window.__game;g.run.tower.bosses=2;g.towerView.open(g.run)});
   await page.getByRole('button',{name:/^Stand Together /}).click();
   await page.screenshot({path:`docs/samples/calamity-dungeon-live/commandment-${width}.png`});
   await page.getByRole('button',{name:'Consecrate',exact:true}).click();
   await page.getByRole('button',{name:/^Altar ·/}).click();
   expect(await page.locator('.riftAltar .altarScene').count()===1,'Altar review missing artwork');
   await page.getByRole('button',{name:'Back',exact:true}).click();
   await page.evaluate(()=>{const g=window.__game;g.run.tower.cur={id:g.run.tower.map.find(n=>n.kind==='campfire').id,kind:'campfire'};g.towerView.open(g.run)});
   await page.getByRole('button',{name:/Reforge altar/}).click();
   await page.getByRole('button',{name:/^Echo /}).click();
   await page.screenshot({path:`docs/samples/calamity-dungeon-live/reforge-${width}.png`});
   await page.getByRole('button',{name:'Reforge',exact:true}).click();
   expect(await page.evaluate(()=>window.__game.run.rift.patron)==='echo','Reforge failed');
   expect(await page.evaluate(()=>window.__game.run.rift.corruption)===1,'Reforge removed corruption');
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Altar overflow');
   console.log(`PASS ${width}: new sanctuary background, patron, offering/corruption, commandment, review and reforge`);
   continue;
  }

  const portal=map.locator('.dmPortal');await portal.scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>document.querySelector('.dmPortalArt')?.complete);
  await page.waitForTimeout(350);
  expect(await portal.count()===1,'Exactly one portal must be present');
  expect(await map.locator('.cmLand').count()===0,'Old floating-island view remains mounted');
  expect(await map.locator('.dmWalker').isVisible(),'Starter is missing from portal');
  await page.screenshot({path:`docs/samples/calamity-dungeon-live/arrival-${width}.png`});
  const layout=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,controlsVisible:document.querySelector('.dmFoot').getBoundingClientRect().bottom<=innerHeight,arrows:[...document.querySelectorAll('.dmArrow')].every(e=>{const b=e.getBoundingClientRect();return b.width>=44&&b.height>=44}),reduced:getComputedStyle(document.querySelector('.dmPortalArt')).animationName}));
  expect(!layout.overflow&&layout.controlsVisible&&layout.arrows,JSON.stringify(layout));
  expect(layout.reduced==='none','Reduced motion portal still animates');
  await page.getByRole('button',{name:'Move north',exact:true}).click();
  await page.waitForFunction(()=>window.__game.run.tower.cur?.kind==='fight'&&window.__game.b.phase==='deploy');
  expect(!await map.isVisible(),'Encounter did not hand off to the real battle');
  const firstId=await page.evaluate(()=>window.__game.run.tower.cur.id);
  // Finish one real prepared battle through the game's result/settlement UI; weak foes keep this a UI test.
  await page.evaluate(()=>{const g=window.__game;for(const u of g.b.units)if(u.side==='foe'){u.hp=u.maxHp=1;u.power=.01;}DungeonQA.fight(g.b);DungeonQA.playOut(g.b);g.endWait=100000;g.refresh()});
  await page.locator('#next').click();
  await page.getByRole('button',{name:/^Ember /}).click();
  await page.screenshot({path:`docs/samples/calamity-dungeon-live/altar-${width}.png`});
  await page.getByRole('button',{name:'Consecrate',exact:true}).click();
  await map.waitFor();
  const cleared=await page.evaluate(()=>window.__game.run.tower.path.length);expect(cleared===1,'First victory settled more than once');
  const gold=await page.evaluate(()=>window.__game.run.gold);
  await portal.click();expect(await map.locator('.rtGo').isEnabled(),'Portal collides with no-selection sentinel');
  await map.locator('.rtGo').click();
  await page.waitForFunction(()=>window.__game.run.tower.here===-1);
  expect(await page.evaluate(()=>window.__game.run.gold)===gold,'Portal return paid a reward');
  expect(await page.evaluate(()=>window.__game.run.tower.path.length)===cleared,'Portal return reset progress');
  await page.screenshot({path:`docs/samples/calamity-dungeon-live/portal-return-${width}.png`});
  await page.keyboard.press('ArrowUp');
  await page.waitForFunction(id=>window.__game.run.tower.here===id,firstId);
  expect(await map.locator('.dmRoom.boss').isDisabled(),'Unreached boss can be entered');
  let target=await page.evaluate(()=>{const g=window.__game;const id=DungeonQA.prepareRoom(g.run,'recruit');g.towerView.open(g.run);return id});
  await map.locator(`[data-id="${target}"].dmRoom`).click();await map.locator('.rtGo').click();
  await map.locator('.rtCard.recruit .rtItem.hero').first().click();await page.getByRole('button',{name:'Move on',exact:true}).click();
  expect(await page.evaluate(()=>window.__game.run.roster.length)===2,'Recruit did not join');
  target=await page.evaluate(()=>{const g=window.__game;const id=DungeonQA.prepareRoom(g.run,'shop');g.towerView.open(g.run);return id});
  await map.locator(`[data-id="${target}"].dmRoom`).click();await map.locator('.rtGo').click();
  expect(await map.locator('.rtCard.shop').isVisible(),'Shop card not reachable');
  // Save a real cleared shop for revisiting, then test the camp and the footer sheets.
  await page.evaluate(()=>{const g=window.__game;g.towerView.leave()});
  target=await page.evaluate(()=>{const g=window.__game;const id=DungeonQA.prepareRoom(g.run,'campfire');g.towerView.open(g.run);return id});
  await map.locator(`[data-id="${target}"].dmRoom`).click();await map.locator('.rtGo').click();
  expect(await map.locator('.rtCard.campfire').isVisible(),'Rest card not reachable');
  await page.evaluate(()=>window.__game.towerView.leave());
  await page.getByRole('button',{name:/^Company ·/}).click();
  expect(await map.locator('.rtCard .rtParty .rtHero').count()===2,'Company sheet lost heroes');
  await page.getByRole('button',{name:'Back',exact:true}).click();
  await page.screenshot({path:`docs/samples/calamity-dungeon-live/explored-${width}.png`});
  console.log(`PASS ${width}x${height}: portal/starter, real directional battle and victory, altar, portal return, cleared revisit, recruit, shop, camp, company, targets/reduced motion; no layout overflow`);
  await page.waitForFunction(()=>!!navigator.serviceWorker.controller,null,{timeout:60000});
  await context.setOffline(true);await page.reload();await page.waitForFunction(()=>!!window.__game);
  await page.evaluate(()=>window.__game.home.go(()=>window.__game.openMode('calamity')));
  await map.waitFor();expect(await map.locator('.dmPortal').count()===1,'Offline portal missing');
  expect(await page.evaluate(()=>window.__game.run.roster.length)===2,'Offline company lost');
  expect(await page.evaluate(()=>window.__game.run.tower.path.length)>1,'Offline cleared route lost');
  await context.setOffline(false);
  console.log(`PASS ${width}: offline reload retained portal, company and route`);
 }
 if (altarOnly) { expect(errors.length===0,errors.join("; ")); await context.close(); } else {
 // Saved mid-walk state resumes at the chosen room without losing the portal or rerolling the encounter.
 await page.evaluate(()=>{const g=window.__game,r=DungeonQA.calamityRun(31,g.meta,'knight');const id=r.tower.map.find(n=>n.row===0).id;DungeonQA.setGoing(r,id);DungeonQA.saveSlot(r)});
 await page.reload();await page.waitForFunction(()=>!!window.__game);
 await page.evaluate(()=>window.__game.home.go(()=>window.__game.openMode('calamity')));
 await page.locator('#towerMap.dmMode:not([hidden])').waitFor();
 const savedTarget=await page.evaluate(()=>window.__game.run.tower.going);
 expect(savedTarget!==undefined,'Mid-walk destination lost on reload');
 await page.locator('#towerMap .rtGo').click();
 await page.waitForFunction(id=>window.__game.run.tower.cur?.id===id&&window.__game.b.phase==='deploy',savedTarget);
 console.log('PASS mid-walk reload hands off to the saved real encounter');
 // Existing six-map saves use the same new renderer and keep their original rules and map count.
 await page.evaluate(()=>{const g=window.__game,r=DungeonQA.calamityRun(45,g.meta,'knight');delete r.rift;r.tower.rows=[...DungeonQA.CAL_ROWS];r.tower.maps=6;r.tower.act=4;r.tower.map=DungeonQA.mapFor(r,4);document.getElementById('result').hidden=true;g.home.go(()=>g.resumeSlot(r))});
 expect(await page.locator('#towerMap .dmPortal').count()===1,'Legacy portal missing');
 expect((await page.locator('.dmEyebrow').first().innerText()).includes('4 / 6'),'Legacy map count changed');
 console.log('PASS existing six-map run retains its map count and arrival portal');
 // Normal motion: hero arrives visibly at the portal, then completes its emergence.
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.evaluate(()=>{const g=window.__game;const r=DungeonQA.calamityRun(23,g.meta,'knight');g.towerView.open(r)});
 expect(await page.locator('.dmWalker.dmArriving').count()===1,'Arrival effect not set');
 const animation=await page.locator('.dmWalker').evaluate(e=>getComputedStyle(e).animationName);
 expect(animation==='dmArrival','Hero does not emerge from portal');
 await page.waitForFunction(()=>getComputedStyle(document.querySelector('.dmWalker')).opacity==='1',null,{timeout:5000});
 expect(await page.locator('.dmWalker').evaluate(e=>getComputedStyle(e).opacity)==='1','Hero did not finish arriving');
 expect(errors.length===0,errors.join('\n'));
 console.log('PASS normal-motion arrival, no page errors');
 // Leaving during a walk must not leave the reused TowerView stuck in its moving state.
 await page.evaluate(()=>{const g=window.__game;const r=DungeonQA.calamityRun(24,g.meta,'knight');g.home.go(()=>g.resumeSlot(r))});
 const interrupted=await page.evaluate(()=>{
  document.querySelector('.dmArrow.up').click();
  const g=window.__game;
  const state={walking:g.towerView.cal.walking,target:g.run.tower.going};
  document.querySelector('.dmClose').click();
  return state;
 });
 expect(interrupted.walking,'Fixture did not interrupt an active walk');
 const walkingTarget=interrupted.target;
 await page.evaluate(()=>window.__game.home.go(()=>window.__game.openMode('calamity')));
 await page.locator('#towerMap.dmMode:not([hidden])').waitFor();
 expect(!await page.evaluate(()=>window.__game.towerView.moving),'Reused map remained stuck after cancelling a walk');
 await page.locator('#towerMap .rtGo').click();
 await page.waitForFunction(id=>window.__game.run.tower.cur?.id===id,walkingTarget);
 expect(errors.length===0,errors.join('\n'));
 console.log('PASS leave mid-walk and resume in the same page');
 // A normal-motion ritual saves once before its flourish, then returns to the map.
 await page.evaluate(()=>{const g=window.__game,r=DungeonQA.calamityRun(25,g.meta,'knight');DungeonQA.growStarter(r);g.home.go(()=>g.resumeSlot(r))});
 await page.getByRole('button',{name:/^Ember /}).click();
 await page.getByRole('button',{name:'Corrupt',exact:true}).click();
 expect(await page.locator('.altarCorrupting .altarRitual').count()===1,'Corruption ritual effect missing');
 expect(await page.locator('.altarCorrupting button:enabled').count()===0,'Ritual allows double submission');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('legends.calamity')).rift.corruption)===1,'Ritual choice was not saved before animation');
 await page.waitForFunction(()=>!document.querySelector('.riftAltar'),null,{timeout:5000});
 expect(await page.evaluate(()=>window.__game.run.rift.corruption)===1,'Ritual applied more than once');
 console.log('PASS normal-motion corruption ritual and immediate save');
 const beforePack=await page.evaluate(()=>window.__game.run.tower.here??window.__game.run.tower.at);
 await page.locator('.dmMenu').getByRole('button',{name:'Pack',exact:true}).click();
 await page.locator('#events:not([hidden]) .pack').waitFor();
 await page.keyboard.press('ArrowUp');
 expect(await page.evaluate(()=>window.__game.run.tower.here??window.__game.run.tower.at)===beforePack,'Map moved behind the open pack');
 expect(!await page.evaluate(()=>!!window.__game.run.tower.cur),'Pack keyboard input started a battle');
 await page.locator('#events').getByRole('button',{name:'Close',exact:true}).click();
 console.log('PASS keyboard navigation is blocked behind the open pack');
 await context.close();
 }
} finally { if(browser)await browser.close();server.close(); }
