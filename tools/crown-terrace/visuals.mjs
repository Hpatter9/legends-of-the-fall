// Final portrait evidence and a recording of the live canvas; uses a valid fully built castle fixture.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
const {chromium}=createRequire(existsSync('/opt/codex/cua_node/lib/node_modules/playwright') ? '/opt/codex/cua_node/lib/node_modules/' : import.meta.url)('playwright');
const dir='docs/samples/crown-terrace';
const server=createServer((q,r)=>{
  const path=`out/web/${q.url.split('?')[0].slice(1)||'index.html'}`;
  if(!existsSync(path)){r.writeHead(404);r.end();return;}
  r.setHeader('content-type',path.endsWith('.js')?'text/javascript':path.endsWith('.html')?'text/html':path.endsWith('.webp')?'image/webp':'application/octet-stream');
  r.end(readFileSync(path));
}).listen(8738);
const browser=await chromium.launch({executablePath:existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try {
  const context=await browser.newContext({viewport:{width:393,height:852},deviceScaleFactor:2});
  const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
    const party=['knight','samurai','archer','wizard','cleric'];
    localStorage.setItem('legends.meta',JSON.stringify({seed:7,crowns:1200,stones:25,unlocked:party,party,castle:{treasury:5,barracks:7,armoury:7,mageTower:4,stable:5,library:5,chapel:3,smithy:3,watchtower:3,hall:4,drillYard:2},chapel:true,shards:{},stars:{},xp:{},bestStage:14,daily:{},bosses:[],armies:{},opened:['castle']}));
    localStorage.setItem('lotf-tips-off','1');
    localStorage.setItem('legends.settings',JSON.stringify({cinematics:false,ruler:'iron_stag',courtHeroes:['knight','samurai','archer','wizard']}));
  });
  await page.goto('http://localhost:8738/',{waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForFunction(()=>!!window.__game?.home,null,{timeout:120000});
  await page.evaluate(()=>{window.__game.home.open();window.__game.home.show('castle');});
  await page.waitForFunction(()=>{const c=window.__game.home.castle;return c.terrace.buildings.size===37&&c.heroKinds.every(k=>c.terrace.heroes.has(k))&&c.terrace.rulers.has('iron_stag')&&c.terrace.duchess.filter(Boolean).length===8;},null,{timeout:120000});
  await page.waitForTimeout(1000);
  const clip=await page.locator('.ctHonorCanvas').evaluate(async canvas=>{
    const stream=canvas.captureStream(20);
    const recorder=new MediaRecorder(stream,{mimeType:'video/webm;codecs=vp9',videoBitsPerSecond:1600000});
    const chunks=[];
    recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
    const stopped=new Promise(resolve=>recorder.onstop=resolve);
    recorder.start();
    await new Promise(resolve=>setTimeout(resolve,6000));
    recorder.stop();await stopped;stream.getTracks().forEach(t=>t.stop());
    return [...new Uint8Array(await new Blob(chunks,{type:'video/webm'}).arrayBuffer())];
  });
  writeFileSync(`${dir}/terrace-motion.webm`,Buffer.from(clip));
  for(const [width,height] of [[393,852],[360,780],[412,915]]) {
    await page.setViewportSize({width,height});
    await page.emulateMedia({reducedMotion:width===412?'reduce':'no-preference'});
    await page.waitForTimeout(400);
    await page.evaluate(()=>{const c=window.__game.home.castle;c.stop();c.bursts=[];c.particles=[];c.paintGreatHall();document.querySelector('.crScroll').scrollTop=0;});
    assert.equal(await page.locator('.crSub').textContent(),'Castle rank 48 of 48');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await page.screenshot({path:`${dir}/completed-${width}.jpg`,type:'jpeg',quality:88});
    await page.locator('.ctHonorCanvas').screenshot({path:`${dir}/completed-scene-${width}.jpg`,type:'jpeg',quality:88});
    console.log(`Final terrace visual ${width}: passed`);
  }
  assert.deepEqual(errors,[]);
  writeFileSync(`${dir}/visuals.json`,JSON.stringify({sizes:[[393,852],[360,780],[412,915]],castleRank:48,companions:4,recordingSeconds:Number(execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',`${dir}/terrace-motion.webm`],{encoding:'utf8'}).trim()),errors},null,2)+'\n');
} finally {await browser.close();server.close();}
