// Warm the real service worker, reload without a network, then open the shipped recap view.
import {createServer} from 'node:http';
import {readFileSync,existsSync,writeFileSync} from 'node:fs';
import {launch,HEROES} from './command-lib.mjs';
import assert from 'node:assert/strict';
const types={html:'text/html',js:'text/javascript',png:'image/png',woff2:'font/woff2',json:'application/json',webmanifest:'application/manifest+json',opus:'audio/ogg'};
const server=createServer((req,res)=>{
  const name=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html';
  const path=`out/web/${name}`;
  if(!existsSync(path)){res.writeHead(404);res.end();return;}
  res.writeHead(200,{'content-type':types[path.split('.').pop()]??'application/octet-stream'});res.end(readFileSync(path));
});
await new Promise(resolve=>server.listen(8140,'127.0.0.1',resolve));
const browser=await launch();const errors=[];
try{
 const ctx=await browser.newContext({viewport:{width:393,height:852}});const page=await ctx.newPage();
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(heroes=>{
   if(!localStorage.getItem('legends.meta'))localStorage.setItem('legends.meta',JSON.stringify({seed:7,crowns:1200,unlocked:heroes,party:heroes.slice(0,5),xp:{},bestStage:14,tower:9,castle:{},opened:['castle','tower'],stash:[]}));
   localStorage.setItem('legends.settings',JSON.stringify({cinematics:false}));localStorage.setItem('lotf-tips-off','1');
 },HEROES);
 await page.goto('http://localhost:8140/');
 await page.waitForFunction(()=>!!window.__game,null,{timeout:60000});
 await page.waitForFunction(async()=>{const r=await navigator.serviceWorker.getRegistration();return r?.active?.state==='activated';},null,{timeout:60000});
 await page.waitForFunction(()=>!!navigator.serviceWorker.controller,null,{timeout:60000});
 const warm=await page.evaluate(async()=>{const c=await caches.open((await caches.keys()).find(k=>k.startsWith('legends-')));return {files:(await c.keys()).length,crest:!!await c.match(new URL('ui/battle-crest.png',location.href).href)};});
 assert.ok(warm.crest && warm.files>50);
 await ctx.setOffline(true);await page.reload();
 await page.waitForFunction(()=>!!window.__game,null,{timeout:60000});
 await page.evaluate(()=>{const g=window.__game;g.run.recap={fights:1,cleared:1,ms:12000,earned:36,spent:0,crowns:15,chests:0,heroes:{knight:{dealt:432,taken:120,healed:0,kills:3,grade:1}},xp:{knight:10},levels:{}};g.run.cleared=true;g.showRunRecap();});
 await page.locator('.rcTitle').waitFor();await page.screenshot({path:'docs/samples/battle-reports-offline-393.png'});
 const crest=await page.evaluate(async()=>{const r=await fetch('ui/battle-crest.png');return r.ok;});
 assert.ok(crest);assert.deepEqual(errors,[]);
 writeFileSync('docs/samples/battle-reports-offline.json',JSON.stringify({warm,offlineReload:true,recapVisible:true,crestAvailable:crest,errors},null,2)+'\n');
 console.log(JSON.stringify({warm,offlineReload:true,recapVisible:true,crestAvailable:crest,errors}));
}finally{await browser.close();server.close();}
