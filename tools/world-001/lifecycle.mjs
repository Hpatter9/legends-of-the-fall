// Renderer lifecycle fixtures complement the real UI progression in entry.mjs and portrait reveal checks.
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import assert from 'node:assert/strict';
import { openBrowser } from './browser.mjs';
const host=await openBrowser(process.argv[2]??'out/web');
const sizes=process.env.WORLD_WIDTHS?.split(',').map(Number);
const reportPath='docs/samples/world-126-lifecycle.json';
const reports=sizes&&existsSync(reportPath)?JSON.parse(readFileSync(reportPath,'utf8')).filter(r=>!sizes.includes(r.width)):[];
try {
 for(const [width,height] of [[360,780],[393,852],[412,915]].filter(([w])=>!sizes||sizes.includes(w))) {
  const context=await host.browser.newContext({viewport:{width,height}});const page=await context.newPage();page.setDefaultNavigationTimeout(90000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(host.url+'/?seed=7&scenario=mountain');await page.waitForFunction(()=>window.__game,{}, {timeout:90000});
  await page.evaluate(()=>{document.querySelector('#tipSkip')?.click();window.__game.endIntro();});
  await page.locator('#summon').click();await page.locator('#summon').click();await page.locator('#auto').click();
  await page.locator('#speed').click();await page.locator('#speed').click();await page.locator('#fight').click();
  await page.waitForFunction(()=>window.__game.chain.active||window.__game.b.phase==='lost',{}, {timeout:120000});
  console.log('REAL_WAVE',width);
  const progression=await page.evaluate(()=>({stage:window.__game.run.stage,phase:window.__game.b.phase,t:window.__game.b.t,walking:window.__game.chain.active}));
  assert.equal(progression.stage,2);assert.equal(progression.walking,true);
  await page.screenshot({path:`docs/samples/world-126-progression-${width}.png`});
  await page.locator('#next').click({timeout:60000});
  await page.waitForFunction(()=>window.__game.b.phase==='deploy');
  const ownership=await page.evaluate(()=>{
   const g=window.__game,v=g.boardView;const assert=(condition,message)=>{if(!condition)throw new Error(message);};
   const valid=()=>{for(const built of [v.built,v.old])for(const lease of built?.tex??[])assert(!lease.value.destroyed&&!lease.value.source.destroyed,'destroyed live column');};
   const original=g.b.board,refs=v.columnStats.leases;
   const baked=v.bakeField(original);valid();assert(v.columnStats.leases===refs,'bakeField leaked leases');baked.destroy({texture:true,textureSource:true});
   const generate=v.renderer.generateTexture;
   v.renderer.generateTexture=()=>{throw new Error('fixture bake failure');};
   try{v.bakeField(original);}catch(e){assert(e.message==='fixture bake failure','unexpected failure');}finally{v.renderer.generateTexture=generate;}
   assert(v.columnStats.leases===refs,'failed bakeField leaked leases');valid();
   for(let i=0;i<24;i++){
    g.run.stage=13;g.newBattle();g.endIntro();valid();assert(!g.b.board.landmark,'early destination reveal');
    g.run.stage=14;g.startWalk(13);valid();assert(v.board.landmark,'late destination missing');
    assert(v.old&&v.built,'missing demoted or active board');g.chain.step(400);
    const partial=v.built.tiles.map(t=>[t.y,t.alpha]);assert(new Set(partial.map(x=>x.join(','))).size>1,'individual drop poses missing');
    g.chain.finish();valid();g.newBattle();g.endIntro();valid();
    // Change scenario without changing other run fields, exercising cache isolation on the real rebuild path.
    g.run.mode.scenario=['mountain','temple','necropolis'][i%3];g.run.stage=1;g.newBattle();g.endIntro();valid();
    assert(v.columnStats.retained<=256&&v.columnStats.retainedBytes<=4*1024*1024,'unbounded retained columns');
   }
   const stats=v.columnStats;
   assert(stats.leases===v.built.tex.length,'retired/temporary leases leaked');
   g.run.mode.scenario='mountain';g.run.stage=14;g.newBattle();g.endIntro();
   localStorage.setItem('legends.run',JSON.stringify(g.run));
   return {iterations:24,cache:stats,failedBakeCleanup:true,individualDrops:true};
  });
  console.log('OWNERSHIP',width,JSON.stringify(ownership));
  // No seed query: load the genuine saved run through the production loader.
  await page.goto(host.url+'/');await page.waitForFunction(()=>window.__game,{}, {timeout:90000});
  const resume=await page.evaluate(()=>({stage:window.__game.run.stage,scenario:window.__game.run.mode.scenario,w:window.__game.b.board.w}));
  assert.deepEqual(resume,{stage:14,scenario:'mountain',w:12});
  await page.evaluate(()=>{window.__game.home.go(()=>{});window.__game.endIntro();});
  await page.waitForFunction(()=>!window.__game.destinationReveal,{}, {timeout:30000});
  const beforePan=await page.evaluate(()=>[window.__game.cx,window.__game.cy]);
  await page.mouse.move(12,170);await page.mouse.down();await page.mouse.move(125,300,{steps:8});await page.mouse.up();
  const afterPan=await page.evaluate(()=>[window.__game.cx,window.__game.cy]);assert.notDeepEqual(afterPan,beforePan);
  const panBack=await page.evaluate(()=>{const v=window.__game.boardView;const scene=v.scenesWanted.find(s=>!v.baked.has(s.board));if(!scene)throw new Error('no lazy section available');const x=(scene.ou-scene.ov)*32,y=(scene.ou+scene.ov)*16;v.cull({x0:x-800,x1:x+800,y0:y-800,y1:y+800});for(let i=0;i<20&&!v.baked.has(scene.board);i++)v.pump();return {baked:v.baked.has(scene.board),live:!!v.sceneryOf.get(scene.board)?.texture.source};});
  assert.ok(panBack.baked&&panBack.live);await page.evaluate(()=>window.__game.focus());
  await page.screenshot({path:`docs/samples/world-126-resume-${width}.png`});
  await page.waitForFunction(()=>navigator.serviceWorker.controller,{}, {timeout:30000});
  await context.setOffline(true);await page.reload();await page.waitForFunction(()=>window.__game,{}, {timeout:90000});
  const offline=await page.evaluate(()=>({stage:window.__game.run.stage,w:window.__game.b.board.w}));assert.equal(offline.stage,14);assert.equal(offline.w,12);
  assert.deepEqual(errors,[]);
  reports.push({width,height,progression,ownership,resume,manualPan:{beforePan,afterPan},panBack,offline,errors});console.log(JSON.stringify(reports.at(-1)));await context.close();
 }
} finally {writeFileSync(reportPath,JSON.stringify(reports.toSorted((a,b)=>a.width-b.width),null,2)+'\n');await host.close();}
