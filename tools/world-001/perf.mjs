// Identical software-rendered browser, fresh context per cold sample. Run variants sequentially on a quiet host.
import { writeFileSync } from 'node:fs';
import { openBrowser } from './browser.mjs';
const [root = 'out/web', output = 'docs/samples/world-126-perf.json', repeats = '5'] = process.argv.slice(2);
let host = await openBrowser(root);
const report = { root, viewport:{width:393,height:852}, seed:7, wave:14, renderer:'Chromium ANGLE SwiftShader', browserVersion:host.browser.version(), samples:[] };
try {
 for (let i = 0; i < Number(repeats); i++) {
  if (i) { await host.close(); host = await openBrowser(root); }
  const context = await host.browser.newContext({viewport:report.viewport,serviceWorkers:'block'});
  const page = await context.newPage(); page.setDefaultNavigationTimeout(90000);const errors=[]; page.on('pageerror', e => errors.push(e.message));
  await page.goto(host.url+'/?seed=7&scenario=mountain');
  await page.waitForFunction(()=>window.__game, {}, {timeout:90000});
  await page.evaluate(()=>{document.querySelector('#tipSkip')?.click();window.__game.endIntro();});
  await page.waitForTimeout(2000);
  const sample = await page.evaluate(async () => {
   const g=window.__game, v=g.boardView, attribution={}, counts={};
   const wrap=(object,name)=>{const original=object[name];if(typeof original!=='function')return;object[name]=function(...args){const t=performance.now();try{return original.apply(this,args);}finally{attribution[name]=(attribution[name]??0)+performance.now()-t;counts[name]=(counts[name]??0)+1;}};};
   for(const method of ['paintColumn','column','section','build','bake','bakeField','freeBuilt','dropOld','retire'])wrap(v,method);
   wrap(v.renderer,'generateTexture');wrap(v.renderer,'render');
   for(const name of ['_initSource','onSourceUpdate','onSourceUnload'])if(v.renderer.texture)wrap(v.renderer.texture,name);
   const originalCreate=document.createElement.bind(document);let canvases=0,canvasPixels=0;const sources=[];
   document.createElement=function(tag,...args){const result=originalCreate(tag,...args);if(tag==='canvas'){canvases++;sources.push(result);}return result;};
   const frames=[];let last=performance.now();
   const frame=()=>{const now=performance.now();frames.push(now-last);last=now;};
   let finishCold;const coldDone=new Promise(ok=>finishCold=ok);
   const coldStart=performance.now();
   const tick=()=>{frame();if(frames.length>=12 && performance.now()-coldStart>=3000)finishCold();else requestAnimationFrame(tick);};requestAnimationFrame(tick);
   const start=performance.now();g.run.stage=14;g.newBattle();g.endIntro();const setupMs=performance.now()-start;
   await coldDone;
   canvasPixels=sources.reduce((sum,c)=>sum+c.width*c.height,0);
   const cold=[...frames];
   await new Promise(ok=>{const settled=()=>{if(!g.destinationReveal&&v.toBake.length===0)ok();else requestAnimationFrame(settled);};settled();});
   await new Promise(ok=>setTimeout(ok,2000));
   const warm=await new Promise(ok=>{const values=[];let previous=performance.now();const until=previous+6000;const tick=()=>{const t=performance.now();values.push(t-previous);previous=t;(t<until||values.length<120)?requestAnimationFrame(tick):ok(values);};requestAnimationFrame(tick);});
   const textures=new Set((v.built?.tex??[]).map(x=>x.value??x));
   return {setupMs,canvases,canvasBytes:canvasPixels*4,activeTextureSources:textures.size,activeTextureBytes:[...textures].reduce((sum,t)=>sum+t.source.pixelWidth*t.source.pixelHeight*4,0),cache:v.columnStats??null,attribution,counts,cold,warm,bakedBytes:[...v.baked.values()].reduce((sum,b)=>sum+b.tex.source.pixelWidth*b.tex.source.pixelHeight*4,0)};
  });
  sample.errors=errors;report.samples.push(sample);if(errors.length)throw new Error(JSON.stringify(errors));
  console.log(i,JSON.stringify({setupMs:sample.setupMs,coldWorst:Math.max(...sample.cold),canvases:sample.canvases,cache:sample.cache}));
  await context.close();
 }
 const distribution=values=>{const sorted=values.toSorted((a,b)=>a-b);return {min:sorted[0],median:sorted[Math.floor(sorted.length/2)],p95:sorted[Math.min(sorted.length-1,Math.floor(sorted.length*.95))],max:sorted.at(-1)};};
 report.warmCondition='destination reveal finished; scenery queue empty; two seconds settling';
 report.summary={coldWorst:distribution(report.samples.map(s=>Math.max(...s.cold))),warmFrames:distribution(report.samples.flatMap(s=>s.warm)),setup:distribution(report.samples.map(s=>s.setupMs))};
 console.log(JSON.stringify(report.summary));
} finally { writeFileSync(output,JSON.stringify(report,null,2)+'\n');await host.close(); }
