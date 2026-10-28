// A real first-wave playthrough using UI controls only. No run replacement or forced battle result.
import { createRequire } from 'node:module';
import {createServer} from 'node:http';
import {readFileSync,existsSync} from 'node:fs';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const root=process.argv[2] ?? 'out/web';
const types={html:'text/html',js:'text/javascript',png:'image/png',css:'text/css',woff2:'font/woff2',opus:'audio/ogg'};
const srv=createServer((q,r)=>{const p=root+(q.url.split('?')[0]==='/'?'/index.html':q.url.split('?')[0]);if(!existsSync(p)){r.writeHead(404);r.end();return;}r.setHeader('content-type',types[p.split('.').pop()]||'application/octet-stream');r.end(readFileSync(p));}).listen(8180);
await new Promise((resolve,reject)=>{srv.once('listening',resolve);srv.once('error',reject)});
let browser;
try {
browser=await chromium.launch({...(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH} : {}),args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const ctx=await browser.newContext({viewport:{width:393,height:852}});const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://localhost:8180/?seed=7&scenario=mountain');await page.waitForFunction(()=>window.__game);await page.evaluate(()=>document.querySelector('#tipSkip')?.click());
await page.locator('#homeBtn').click();await page.locator('#hmBattle').click();await page.locator('.asFight').first().click();await page.locator('#ptGo').click();
await page.waitForFunction(()=>document.querySelector('#party').hidden && window.__game.b.board.w===12);
const entry=await page.evaluate(()=>({seed:window.__game.run.seed,mode:window.__game.run.mode,w:window.__game.b.board.w,d:window.__game.b.board.d}));
if(entry.seed!==7 || entry.mode.scenario!=='mountain' || entry.w!==12 || entry.d!==16) throw new Error('normal Army Start lost prototype');
console.log('NORMAL_ENTRY',entry);
await page.locator('#summon').click();await page.locator('#summon').click();await page.locator('#auto').click();await page.locator('#speed').click();await page.locator('#speed').click();await page.locator('#fight').click();
await page.waitForFunction(()=>window.__game.chain.active || window.__game.b.phase==='lost',{},{timeout:60000});
console.log('NATURAL_WAVE',await page.evaluate(()=>({phase:window.__game.b.phase,t:window.__game.b.t,stage:window.__game.run.stage,walking:window.__game.chain.active,errors:[]})));
await page.screenshot({path:'docs/samples/world-001-natural-progression-393.png'});
if(errors.length) throw new Error(JSON.stringify(errors));
console.log('PAGE_ERRORS',errors);await ctx.close();
} finally {await browser?.close();srv.close();}
