// Compare reused textures with the unmodified painter, including negative/fractional landmark coordinates.
import { writeFileSync } from 'node:fs';
import { openBrowser } from './browser.mjs';
const host=await openBrowser(process.argv[2]??'out/web');
try {
 const page=await host.browser.newPage({viewport:{width:393,height:852}});
 await page.goto(host.url+'/?seed=7&scenario=mountain');await page.waitForFunction(()=>window.__game);
 const result=await page.evaluate(()=>{
  const view=window.__game.boardView;window.__game.app.ticker.stop();view.columns.clear();
  // Fix the readback backend for strict comparison; Chromium can otherwise move a canvas
  // from accelerated drawing to software after a read, changing rounding by one channel value.
  const create=document.createElement.bind(document);
  document.createElement=function(tag,...args){const c=create(tag,...args);if(tag==='canvas')c.getContext('2d',{willReadFrequently:true});return c;};
  let checked=0;const failures=[];
  const areas=['highlands','forest','snow','desert','volcano','dungeon','plains','autumn','swamp','graveyard','ruins','temple','crystal','forge','shrine','warcamp','oasis'];
  const pixels=tex=>{const c=tex.source.resource;return c.getContext('2d').getImageData(0,0,c.width,c.height).data;};
  for(const area of areas)for(const boss of [false,true])for(const h of [1,4,9])for(const ground of [undefined,'water','deep','ice','lava','tall','shrine'])for(const [u,v] of [[0,0],[5,0],[-1,-2],[4,-2],[0.5,-1.5]]) {
   const tile={h,ground,deco:17,bridge:ground==='deep'};
   const lease=view.column(tile,u,v,area,boss), fresh=view.paintColumn(tile,u,v,area,boss);
   const a=pixels(lease.value),b=pixels(fresh);
   if(a.length!==b.length||a.some((x,i)=>x!==b[i]))failures.push({area,boss,h,ground,u,v});
   lease.release();fresh.destroy(true);checked++;
  }
  // Also force actual low-ground top variation collisions and bridges on each ground.
  for(let deco=0;deco<32;deco++)for(const bridge of [false,true]){
   const tile={h:0,deco,bridge},lease=view.column(tile,2,3,'forest'),fresh=view.paintColumn(tile,2,3,'forest');
   const a=pixels(lease.value),b=pixels(fresh);if(a.some((x,i)=>x!==b[i]))failures.push({deco,bridge});lease.release();fresh.destroy(true);checked++;
  }
  return {checked,failures,cache:view.columnStats};
 });
 writeFileSync('docs/samples/world-126-pixels.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({...result,failures:result.failures.slice(0,5),failureCount:result.failures.length}));
 if(result.failures.length)throw new Error('pixel mismatch');
} finally {await host.close();}
