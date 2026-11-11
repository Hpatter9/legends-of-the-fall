import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
const { chromium } = createRequire(import.meta.url)('playwright');
const types = {html:'text/html',js:'text/javascript',png:'image/png',webp:'image/webp',woff2:'font/woff2',webmanifest:'application/manifest+json'};
const server = createServer((q,r) => {
 const path = `out/web/${q.url.split('?')[0].slice(1) || 'index.html'}`;
 if (!existsSync(path)) {r.writeHead(404); r.end(); return;}
 r.writeHead(200, {'content-type':types[path.split('.').pop()] || 'application/octet-stream'}); r.end(readFileSync(path));
}).listen(8726);
const browser = await chromium.launch({executablePath:'/usr/bin/chromium', args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
mkdirSync('docs/samples/war-room',{recursive:true});
const results=[];
function check(name,ok) { results.push({name,ok}); console.log(ok?'ok':'FAIL',name); }
let context, page;
try {
for (const [width,height] of (process.argv.includes('--final') ? [[412,915]] : [[393,852],[360,780],[412,915]])) {
 if (!context) {
  context=await browser.newContext({viewport:{width,height},hasTouch:true});
  page=await context.newPage();
 }
 await page.setViewportSize({width,height});
 await page.emulateMedia({reducedMotion:width===412?'reduce':'no-preference'});
 const errors=[]; const onError=e=>errors.push(e.message); page.on('pageerror',onError);
 await page.addInitScript(()=>{
  if(sessionStorage.getItem('wr-set'))return;
  sessionStorage.setItem('wr-set','1');localStorage.clear();
  const owned=['knight','samurai','kunoichi','archer','wizard','cleric'];
  localStorage.setItem('legends.meta',JSON.stringify({seed:7,crowns:1200,unlocked:owned,party:owned.slice(0,5),castle:{treasury:1,barracks:1,armoury:0,mageTower:0,stable:0,library:0},shards:{},stars:{},xp:Object.fromEntries(owned.map(k=>[k,50000])),bestStage:14,daily:{},bosses:[],armies:{orcs:{clears:1,best:15,won:15,met:{'0':7}}},armySeen:[],achievements:[],claimed:[],stash:[],opened:['undead'],scenes:['opening']}));
  localStorage.setItem('lotf-tips-off','1');localStorage.setItem('legends.settings',JSON.stringify({cinematics:false,music:0,effects:0,quips:false}));
 });
 console.log('loading',width);
 if (page.url() === 'about:blank') await page.goto('http://localhost:8726/',{waitUntil:'domcontentloaded',timeout:120000});
 await page.waitForFunction(()=>!!window.__game?.home,null,{timeout:120000});
 await page.evaluate(()=>{document.getElementById('tipSkip')?.click();window.__game.home.open();window.__game.home.openArmies('undead');});
 await page.waitForTimeout(900);
 // (ARMIES-SWIPE: the card and its information are apart now; both carry the army)
 const active=page.locator('.asRoot:has(.asInfo[data-army="undead"])');
 await active.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));
 await page.screenshot({path:`docs/samples/war-room/armies-${width}.png`});
 check(`party strength ${width}`,(await active.locator('.wrStrength').innerText()).includes('Party Strength'));
 check(`no horizontal overflow ${width}`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 check(`prepare visible ${width}`,await active.locator('.asFight').evaluate(e=>{const r=e.getBoundingClientRect(),p=e.closest('.asInfo').getBoundingClientRect();return r.bottom<=p.bottom && r.top>=p.top;}));
 await active.locator('.asInfo').evaluate(e=>e.scrollTop=e.scrollHeight);
 check(`details scroll ${width}`,await active.locator('.asInfo').evaluate(e=>e.scrollTop>0));
 await active.locator('.asInfo').evaluate(e=>e.scrollTop=0);
 await active.locator('.asFight').click();
 await page.waitForTimeout(350);
 check(`party opens with estimate ${width}`,await page.locator('#ptChallenge').isVisible());
 const before=await page.locator('#ptCount').innerText();
 // Removing a selected hero recalculates the draft, without saving it.
 await page.evaluate(()=>window.__game.party.toggle(window.__game.meta.party[0]));
 await page.waitForTimeout(100);
 check(`draft strength updates ${width}`,(await page.locator('#ptCount').innerText())!==before);
 await page.screenshot({path:`docs/samples/war-room/party-${width}.png`});
 await page.locator('#ptBack').click();
 await page.waitForTimeout(200);
 check(`no page errors ${width}`,!errors.length);
 if(errors.length)console.log(errors);
 if (width === 412) {
  await page.evaluate(()=>window.__game.home.openArmies('orcs'));
  await page.waitForTimeout(500);
  const orcs = page.locator('.asInfo[data-army="orcs"]');
  await orcs.locator('.asTier').nth(1).click();
  check('tier selection updates estimate', await orcs.locator('.asTier').nth(1).getAttribute('aria-pressed') === 'true');
  await orcs.locator('.asTier').nth(4).click({force:true});
  check('locked tier remains gated', await orcs.locator('.asTier').nth(1).getAttribute('aria-pressed') === 'true');
  await orcs.locator('.wrSuggest').click();
  check('suggested tier remains available', await orcs.locator('.asTier.on').getAttribute('aria-disabled') === 'false');
  await page.evaluate(()=>window.__game.home.openArmies('golems'));
  await page.waitForTimeout(300);
  check('locked army cannot prepare', await page.locator('.asInfo[data-army="golems"] .asFight').isDisabled());
  await page.waitForFunction(()=>!!navigator.serviceWorker.controller,null,{timeout:120000});
  check('room is precached', await page.evaluate(async()=>!!(await caches.match('ui/war-room.png'))));
  await context.setOffline(true);
  check('room fetches offline', await page.evaluate(async()=>{const r=await fetch('ui/war-room.png');return r.ok && (await r.blob()).size>1000;}));
  await page.evaluate(()=>window.__game.home.openArmies('undead'));
  await page.waitForTimeout(300);
  check('offline banners decode', await page.locator('.asCard[data-army="undead"] img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode().then(()=>true))).then(v=>v.every(Boolean))));
  await context.setOffline(false);
 }
 page.off('pageerror',onError);
 if (width === 412) await context.close();
}
} finally {await browser.close();server.close();writeFileSync(`docs/samples/war-room/${process.argv.includes('--final') ? 'final-checks' : 'checks'}.json`,JSON.stringify(results,null,2));}
if(results.some(r=>!r.ok))process.exitCode=1;
