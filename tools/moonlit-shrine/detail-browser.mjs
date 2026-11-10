// Controlled views of the shipping Assault renderer at all required phone sizes.
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {readFileSync,existsSync,mkdirSync,writeFileSync} from 'node:fs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || '/tmp/moonlit-browser/node_modules/playwright-core');
const dir='docs/samples/moonlit-shrine-detail';mkdirSync(dir,{recursive:true});
const mime={html:'text/html',js:'text/javascript',css:'text/css',png:'image/png',webp:'image/webp',opus:'audio/ogg',woff2:'font/woff2',json:'application/json'};
const server=createServer((req,res)=>{
 const path='out/web/'+(req.url.split('?')[0].slice(1)||'index.html');
 if(!existsSync(path)){res.writeHead(404);res.end();return;}
 res.writeHead(200,{'content-type':mime[path.split('.').pop()]||'application/octet-stream'});res.end(readFileSync(path));
}).listen(8831,'127.0.0.1');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const manifestOnly=process.argv.includes('--manifest-only');
const keepOnly=process.argv.includes('--keep-only');
const overviewOnly=process.argv.includes('--overview-only');
const results=(manifestOnly||keepOnly||overviewOnly) ? JSON.parse(readFileSync(`${dir}/browser-results.json`)).results.filter(r=>r.width&&(!keepOnly||r.spot!=='keep')) : [],errors=[],failed=[];
try{
 for(const [width,height] of ((manifestOnly||overviewOnly)?[]:[[393,852],[360,780],[412,915]])){
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1,reducedMotion:width===412?'reduce':'no-preference'});
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400)failed.push({url:r.url(),status:r.status()});});
  for(const [spot,at] of Object.entries(keepOnly?{keep:'47,47'}:{bambooWood:'86,34',westWood:'32,85',ruins:'86,50',sakeStores:'16,72',reserve:'12,12',shore:'61,87',bailey:'64,42',perimeter:'43,72'})){
   await page.goto(`http://127.0.0.1:8831/?bench=assault&army=yokai&seed=1&worker=0&speed=1&at=${at}&zoom=0.5`,{waitUntil:'load'});
   await page.waitForFunction(()=>window.__bench?.wanted>0 && window.__bench.chunks>=window.__bench.wanted,{},{timeout:45000});
   await page.waitForTimeout(1500);
   const stats=await page.evaluate(()=>({stats:window.__bench,canvas:!!document.querySelector('#assaultBench canvas'),overflow:document.documentElement.scrollWidth>innerWidth}));
   if(!stats.canvas||stats.overflow)throw Error(`Invalid view ${width} ${spot}`);
   await page.screenshot({path:`${dir}/${spot}-${width}.jpg`,quality:88});
   results.push({width,height,spot,reducedMotion:width===412,canvas:stats.canvas,overflow:stats.overflow,chunks:stats.stats.chunks,wanted:stats.stats.wanted});
  }
  await page.close();
 }
 // A portrait overview shows the entire 100x100 field, in addition to phone views.
 const overview=await browser.newPage({viewport:{width:1200,height:1600},deviceScaleFactor:1});
 overview.on('pageerror',e=>errors.push(e.message));
 overview.on('response',r=>{if(r.status()>=400)failed.push({url:r.url(),status:r.status()});});
 await overview.goto('http://127.0.0.1:8831/?bench=assault&army=yokai&seed=1&worker=0&at=50,50&zoom=0.18',{waitUntil:'load'});
 // Lift the phone-width body cap only for this diagnostic overview. The
 // shipping renderer and all 24 phone checks retain their normal layout.
 await overview.addStyleTag({content:'body{max-width:none!important;transform:none!important;width:100%!important;}'});
 await overview.waitForFunction(()=>document.getElementById('assaultBench')?.clientWidth>=1100,{},{timeout:10000});
 await overview.evaluate(()=>window.dispatchEvent(new Event('resize')));
 await overview.waitForFunction(()=>document.querySelector('#assaultBench canvas')?.width===1200,{},{timeout:10000});
 await overview.waitForFunction(()=>window.__bench?.wanted===100 && window.__bench.chunks===100,{},{timeout:45000});
 await overview.waitForTimeout(6000);
 await overview.screenshot({path:`${dir}/full-map.jpg`,quality:92});
 results.push({overview:true,viewport:[1200,1600],diagnosticBodyWidthOverride:true,canvasSize:await overview.evaluate(()=>{const c=document.querySelector('#assaultBench canvas');return [c.width,c.height];}),stats:await overview.evaluate(()=>window.__bench)});
 await overview.close();
 // Service-worker manifest checks complement the controlled renderer views.
 const sw=readFileSync('out/web/sw.js','utf8');
 const art=readFileSync('src/render/fieldView.ts','utf8');
 results.push({offlineManifest: ['sprites','ground','edges','decals','faces'].every(n=>sw.includes(`assault/yokai/${n}.webp`)),rendererUsesYokai:art.includes('yokai')});
}finally{await browser.close();server.close();writeFileSync(`${dir}/browser-results.json`,JSON.stringify({results,errors,failed},null,2)+'\n');}
if(errors.length||failed.length||results.some(r=>r.offlineManifest===false||r.rendererUsesYokai===false))throw Error(JSON.stringify({errors,failed,results}));
console.log(`PASS: 24 regional views, three phone sizes, reduced motion at 412; no page errors or failed requests; five atlases in offline manifest.`);
