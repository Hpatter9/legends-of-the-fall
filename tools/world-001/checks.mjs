// Build first. Late-wave screenshots use explicit presentation fixtures; first-wave combat uses real buttons.
import { createRequire } from 'node:module';
import {createServer} from 'node:http';
import {readFileSync,existsSync} from 'node:fs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const root=process.argv[2] ?? 'out/web';
const port=Number(process.env.WORLD_CHECK_PORT ?? 8177);
const types={html:'text/html',js:'text/javascript',png:'image/png',css:'text/css',woff2:'font/woff2',opus:'audio/ogg'};
const srv=createServer((q,r)=>{const p=root+(q.url.split('?')[0]==='/'?'/index.html':q.url.split('?')[0]);if(!existsSync(p)){r.writeHead(404);r.end();return;}r.setHeader('content-type',types[p.split('.').pop()]||'application/octet-stream');r.end(readFileSync(p));}).listen(port,'127.0.0.1');
await new Promise((resolve,reject)=>{srv.once('listening',resolve);srv.once('error',reject)});
let browser;
const reports=[];
try {
browser=await chromium.launch({...(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH} : {}),args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
for(const [width,height] of (process.argv.includes('--smoke') ? [[393,852]] : [[360,780],[393,852],[412,915]])) for(const theme of ['mountain','temple','necropolis']) {
 const ctx=await browser.newContext({viewport:{width,height}});const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://localhost:${port}/?seed=7&scenario=${theme}`);await page.waitForFunction(()=>window.__game);await page.waitForTimeout(800);await page.evaluate(()=>document.querySelector('#tipSkip')?.click());
 await page.locator('#summon').click();await page.locator('#summon').click();await page.locator('#auto').click();await page.waitForTimeout(500);
 await page.screenshot({path:`docs/samples/world-001-${theme}-deploy-${width}.png`});
 const deployed=await page.evaluate(()=>window.__game.b.units.filter(u=>u.side==='hero').length);
 if(deployed<2) throw new Error('heroes were not deployed');
 await page.locator('#fight').click();await page.waitForTimeout(2200);
 await page.waitForFunction(()=>window.__game.b.t>=1000);
 const fighting=await page.evaluate(()=>({phase:window.__game.b.phase,t:window.__game.b.t,heroes:window.__game.b.units.filter(u=>u.side==='hero').length}));
 await page.screenshot({path:`docs/samples/world-001-${theme}-fight-${width}.png`});
 // Reproducible late-wave presentation fixture: not a claim that all preceding fights were played.
 await page.evaluate(()=>{let g=window.__game;g.run.stage=13;g.newBattle();g.endIntro();g.autoArrange();});await page.waitForTimeout(500);
 const concealed=await page.evaluate(()=>!window.__game.b.board.landmark);
 if(!concealed) throw new Error('destination visible too early');
 await page.evaluate(()=>{let g=window.__game;g.run.stage=14;g.startWalk(13);});
 await page.waitForTimeout(700);await page.screenshot({path:`docs/samples/world-001-${theme}-drop-${width}.png`});
 // Finish the presentation walk, just as the existing Next control does, then start the revealed wave.
 await page.evaluate(()=>{let g=window.__game;g.chain.finish();g.newBattle();g.endIntro();});await page.waitForFunction(()=>{
 const g=window.__game, landmark=g.boardView.built?.landmark;
 if(!g.destinationReveal?.armed || !landmark) return false;
 const b=landmark.getBounds(), top=document.querySelector('#top').getBoundingClientRect().bottom, bottom=document.querySelector('#panel').getBoundingClientRect().top;
 return b.minX>=-2 && b.maxX<=innerWidth+2 && b.minY>=top-2 && b.maxY<=bottom+2;
 },{},{timeout:20000});
 const revealBounds=await page.evaluate(()=>{const b=window.__game.boardView.built.landmark.getBounds();return {x0:b.minX,x1:b.maxX,y0:b.minY,y1:b.maxY}});
 await page.screenshot({path:`docs/samples/world-001-${theme}-reveal-${width}.png`});
 const reveal=await page.evaluate(()=>({active:!!window.__game.destinationReveal,site:window.__game.b.board.landmarkAt,boxes:window.__game.bbox}));
 await page.waitForFunction(()=>!window.__game.destinationReveal,{},{timeout:15000});
 const returned=await page.evaluate(()=>!window.__game.destinationReveal);
 const cold=await page.evaluate(()=>({pending:window.__game.boardView.toBake.length,baked:window.__game.boardView.baked.size,bytes:[...window.__game.boardView.baked.values()].reduce((a,b)=>a+b.tex.source.pixelWidth*b.tex.source.pixelHeight*4,0)}));
 await page.waitForFunction(()=>window.__game.boardView.toBake.length===0);
 const times=await page.evaluate(()=>new Promise(done=>{const d=[];let last=performance.now();const t0=last;const step=t=>{d.push(t-last);last=t;t-t0<1000?requestAnimationFrame(step):done(d)};requestAnimationFrame(step)}));times.sort((a,b)=>a-b);
 if(errors.length || !returned) throw new Error(JSON.stringify({errors,returned}));
 reports.push({width,height,theme,seed:7,deployed,fighting,concealed,reveal,revealBounds,returned,cold,pageErrors:errors,frameMs:{mean:times.reduce((a,b)=>a+b,0)/times.length,p95:times[Math.floor(times.length*.95)],worst:times.at(-1)}});
 console.log(width,theme,JSON.stringify(reports.at(-1)));await ctx.close();
}
console.log('REPORT',JSON.stringify(reports));
} finally {
 await browser?.close();
 await new Promise(done=>srv.close(done));
 (await import('node:fs')).writeFileSync('docs/samples/world-001-checks.json',JSON.stringify(reports,null,2)+'\n');
}
