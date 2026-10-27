// Verify the real Army Start path and offline party editor. No injected inventory, run replacement or forced outcomes.
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {readFileSync,existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,extname,dirname} from 'node:path';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=resolve(process.argv[2]||'out/web'),port=Number(process.env.UI_ENTRY_PORT||8215);
const reportPath=process.env.UI_ENTRY_REPORT||'out/ui-002-entry.json';
const server=createServer((req,res)=>{const url=new URL(req.url,'http://localhost');const p=resolve(root,'.'+(url.pathname==='/'?'/index.html':decodeURIComponent(url.pathname)));if(!p.startsWith(root+'/')||!existsSync(p)){res.writeHead(404);res.end();return;}res.setHeader('content-type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.opus':'audio/ogg','.woff2':'font/woff2','.json':'application/json'})[extname(p)]||'application/octet-stream');res.end(readFileSync(p));});
await new Promise((done,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',done);});
let browser;
try{
 browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const ctx=await browser.newContext({viewport:{width:393,height:852},deviceScaleFactor:1});
 try{
  const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{localStorage.setItem('legends.settings',JSON.stringify({music:0,effects:0,cinematics:false,quips:false}));localStorage.setItem('legends.tips',JSON.stringify(['home','deploy','fight','mana','skill','summon','crowns','calamity','tower','talents','castle','spellbook','stash','equipment','recycle','retry','autoReplay']));});
  await page.goto(`http://localhost:${port}/?seed=123`);await page.waitForFunction(()=>window.__game);
  await page.evaluate(()=>document.querySelector('#tipSkip')?.click());
  await page.locator('#homeBtn').click();await page.locator('#hmBattle').click();await page.locator('.asFight').first().click();
  const context=await page.locator('#ptContext').textContent();assert.match(context,/Orc Warband.*Normal/);
  assert.equal(await page.locator('#ptGo').textContent(),'Start run');assert.equal(await page.locator('#ptGo').isEnabled(),true);
  const chosen=await page.evaluate(()=>[...window.__game.meta.party]);
  await page.locator('#ptGo').click();await page.waitForFunction(()=>document.querySelector('#party').hidden&&window.__game.run.mode?.kind==='army');
  const entry=await page.evaluate(()=>({mode:window.__game.run.mode,stage:window.__game.run.stage,phase:window.__game.b.phase,w:window.__game.b.board.w,d:window.__game.b.board.d,party:[...window.__game.meta.party]}));
  assert.equal(entry.stage,1);assert.equal(entry.phase,'deploy');assert.deepEqual([entry.w,entry.d],[8,11]);assert.deepEqual(entry.party,chosen);
  await page.evaluate(async()=>{await navigator.serviceWorker.ready;});await page.waitForFunction(()=>navigator.serviceWorker.controller!==null,null,{timeout:60000});
  await ctx.setOffline(true);await page.reload();await page.waitForFunction(()=>window.__game,null,{timeout:90000});
  assert.deepEqual(await page.evaluate(()=>window.__game.meta.party),chosen);
  await page.locator('#homeBtn').click();await page.locator('#hmParty').click();
  await page.locator('#party').waitFor({state:'visible'});assert.equal(await page.locator('#ptGo').textContent(),'Done');
  const offline=await page.evaluate(()=>{const p=document.querySelector('#party'),go=document.querySelector('#ptGo').getBoundingClientRect();return {controlled:!!navigator.serviceWorker.controller,columns:getComputedStyle(document.querySelector('#ptGrid')).gridTemplateColumns.split(' ').length,overflow:p.scrollWidth>p.clientWidth+1,footerVisible:go.bottom<=innerHeight,count:document.querySelector('#ptCount').textContent};});
  assert.equal(offline.controlled,true);assert.equal(offline.columns,3);assert.equal(offline.overflow,false);assert.equal(offline.footerVisible,true);assert.deepEqual(errors,[]);
  const result={viewport:{width:393,height:852},actualArmyEntry:true,context,entry,offlineEditor:true,offline,pageErrors:errors};
  mkdirSync(dirname(reportPath),{recursive:true});writeFileSync(reportPath,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
 }finally{await ctx.close();}
}finally{await browser?.close();await new Promise(done=>server.close(done));}
