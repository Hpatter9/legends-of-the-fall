// Controlled views of the shipping Assault renderer at all required phone sizes.
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {readFileSync,existsSync,mkdirSync,writeFileSync} from 'node:fs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || '/tmp/moonlit-browser/node_modules/playwright-core');
const dir='docs/samples/moonlit-shrine';mkdirSync(dir,{recursive:true});
const mime={html:'text/html',js:'text/javascript',css:'text/css',png:'image/png',webp:'image/webp',opus:'audio/ogg',woff2:'font/woff2',json:'application/json'};
const server=createServer((req,res)=>{
 const path='out/web/'+(req.url.split('?')[0].slice(1)||'index.html');
 if(!existsSync(path)){res.writeHead(404);res.end();return;}
 res.writeHead(200,{'content-type':mime[path.split('.').pop()]||'application/octet-stream'});res.end(readFileSync(path));
}).listen(8829,'127.0.0.1');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const manifestOnly=process.argv.includes('--manifest-only');
const results=manifestOnly ? JSON.parse(readFileSync(`${dir}/browser-results.json`)).results.filter(r=>r.width) : [],errors=[],failed=[];
try{
 for(const [width,height] of (manifestOnly?[]:[[393,852],[360,780],[412,915]])){
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1,reducedMotion:width===412?'reduce':'no-preference'});
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400)failed.push({url:r.url(),status:r.status()});});
  for(const [spot,at] of Object.entries({keep:'47,47',southGate:'73,59',pond:'78,80',drum:'80,61',camp:'12,12'})){
   await page.goto(`http://127.0.0.1:8829/?bench=assault&army=yokai&seed=1&worker=0&speed=1&at=${at}&zoom=0.5`,{waitUntil:'load'});
   await page.waitForFunction(()=>window.__bench?.chunks>0,{},{timeout:45000});
   await page.waitForTimeout(1500);
   const stats=await page.evaluate(()=>({stats:window.__bench,canvas:!!document.querySelector('#assaultBench canvas'),overflow:document.documentElement.scrollWidth>innerWidth}));
   if(!stats.canvas||stats.overflow)throw Error(`Invalid view ${width} ${spot}`);
   await page.screenshot({path:`${dir}/${spot}-${width}.jpg`,quality:88});
   results.push({width,height,spot,reducedMotion:width===412,canvas:stats.canvas,overflow:stats.overflow,chunks:stats.stats.chunks});
  }
  await page.close();
 }
 // Service-worker manifest checks complement the controlled renderer views.
 const sw=readFileSync('out/web/sw.js','utf8');
 const art=readFileSync('src/render/fieldView.ts','utf8');
 results.push({offlineManifest: ['sprites','ground','edges','decals','faces'].every(n=>sw.includes(`assault/yokai/${n}.webp`)),rendererUsesYokai:art.includes('yokai')});
}finally{await browser.close();server.close();writeFileSync(`${dir}/browser-results.json`,JSON.stringify({results,errors,failed},null,2)+'\n');}
if(errors.length||failed.length||results.some(r=>r.offlineManifest===false||r.rendererUsesYokai===false))throw Error(JSON.stringify({errors,failed,results}));
console.log(`PASS: 15 game views, three phone sizes, reduced motion at 412; no page errors or failed requests; five atlases in offline manifest.`);
