// Reproducible party-editor checks. Playwright is a separate developer tool; fixture data never changes a player save.
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {readFileSync,existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=resolve(process.argv[2]||'out/web'),port=Number(process.env.UI_CHECK_PORT||8205);
const samples=process.env.UI_SAMPLES||'docs/samples';mkdirSync(samples,{recursive:true});
const server=createServer((req,res)=>{const url=new URL(req.url,'http://localhost');const p=resolve(root,'.'+(url.pathname==='/'?'/index.html':decodeURIComponent(url.pathname)));if(!p.startsWith(root+'/')||!existsSync(p)){res.writeHead(404);res.end();return;}res.setHeader('content-type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.opus':'audio/ogg','.woff2':'font/woff2','.json':'application/json'})[extname(p)]||'application/octet-stream');res.end(readFileSync(p));});
await new Promise(done=>server.listen(port,'127.0.0.1',done));let browser;const results=[];
try{
 browser=await chromium.launch({...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 for(const [width,height] of process.argv.includes('--smoke')?[[393,852]]:[[360,780],[393,852],[412,915]]){
  const ctx=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
  try{
   const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(()=>{localStorage.setItem('legends.settings',JSON.stringify({music:0,effects:0,cinematics:false,quips:false}));localStorage.setItem('legends.tips',JSON.stringify(['home','deploy','fight','mana','skill','summon','crowns','calamity','tower','talents','castle','spellbook','stash','equipment','recycle','retry','autoReplay']));});
   await page.goto(`http://localhost:${port}/?seed=123`);await page.waitForFunction(()=>window.__game);await page.waitForTimeout(350);await page.evaluate(()=>document.querySelector('#tipSkip')?.click());
   await page.evaluate(()=>{const g=window.__game;g.meta.unlocked=['knight','archer','cleric','samurai','lightningMage','juggernaut','werewolf','gunslinger'];g.meta.party=g.meta.unlocked.slice(0,5);g.party.open('start',()=>{},'Orc Warband · Normal');});
   await page.waitForTimeout(300);
   assert.equal(await page.locator('#ptCount').textContent(),'5 / 5');assert.equal(await page.locator('#ptGrid .ptCard.picked').count(),5);
   const bounds=await page.evaluate(()=>{const p=document.querySelector('#party'),grid=document.querySelector('#ptGrid').getBoundingClientRect(),go=document.querySelector('#ptGo').getBoundingClientRect();return {overflow:p.scrollWidth>p.clientWidth+1,gridHeight:grid.height,footerBottom:go.bottom,columns:getComputedStyle(document.querySelector('#ptGrid')).gridTemplateColumns.split(' ').length};});
   assert.equal(bounds.overflow,false);assert.equal(bounds.columns,3);assert.ok(bounds.gridHeight>=180,`Useful roster height: ${bounds.gridHeight}`);assert.ok(bounds.footerBottom<=height);
   await page.screenshot({path:`${samples}/ui-002-party-${width}x${height}.png`});
   if(process.argv.includes('--visual-only')){results.push({width,height,bounds,pageErrors:errors});continue;}
   const search=page.getByRole('searchbox',{name:'Search heroes'});await page.locator('#ptGrid').evaluate(e=>e.scrollTop=500);await search.fill('light');assert.equal(await page.locator('#ptGrid').evaluate(e=>e.scrollTop),0);await search.press('End');await search.type('ning');
   assert.equal(await search.inputValue(),'lightning');assert.equal(await search.evaluate(e=>document.activeElement===e),true);assert.equal(await page.locator('#ptGrid .ptCard').count(),1);
   await search.fill('nobody123');assert.equal(await page.locator('.ptEmpty').textContent(),'No heroes foundTry another name or role filter.');await search.fill('');
   await page.getByRole('button',{name:'Support',exact:true}).click();const roles=await page.locator('#ptGrid .ptCard').evaluateAll(es=>es.map(e=>e.dataset.role));assert.ok(roles.length&&roles.every(r=>r==='support'));await page.getByRole('button',{name:'All',exact:true}).click();
   await page.locator('.ptCard[data-kind="juggernaut"] .ptSelect').click();assert.match(await page.locator('#ptHint').textContent(),/party is full/);assert.equal(await page.locator('#ptCount').textContent(),'5 / 5');
   await page.getByRole('button',{name:'Remove Knight from party',exact:true}).first().click();assert.equal(await page.locator('#ptCount').textContent(),'4 / 5');assert.equal(await page.locator('#ptGo').isDisabled(),true);
   await page.locator('.ptCard[data-kind="juggernaut"] .ptSelect').click();assert.equal(await page.locator('#ptGo').isEnabled(),true);
   const before=await page.evaluate(()=>JSON.stringify(window.__game.meta.party));await page.locator('#ptBack').click();assert.equal(await page.evaluate(()=>JSON.stringify(window.__game.meta.party)),before);
   await page.evaluate(()=>window.__game.party.open('edit',()=>{}));await page.locator('#ptSuggest').click();assert.equal(await page.locator('#ptCount').textContent(),'5 / 5');assert.equal(await page.locator('#ptGo').textContent(),'Done');
   const trait=page.locator('#ptTraits button').first();await trait.click();assert.equal(await trait.getAttribute('aria-pressed'),'true');assert.ok(await page.locator('#ptGrid .faded').count()>0);await page.locator('#ptTraits button[aria-pressed="true"]').click();
   await page.locator('#ptTraits button').first().click();while(await page.locator('#ptSlots button').count())await page.locator('#ptSlots button').first().click();assert.equal(await page.locator('#ptGrid .faded').count(),0);assert.equal(await page.locator('#ptTraits button').count(),0);await page.locator('#ptSuggest').click();
   await page.getByRole('button',{name:'Details for Knight',exact:true}).click();assert.equal(await page.locator('#ptSheet').isVisible(),true);await page.keyboard.press('Escape');assert.equal(await page.locator('#ptSheet').isHidden(),true);
   const locked=page.locator('.ptCard.locked .ptSelect').first();assert.ok(await locked.count());await locked.click();assert.equal(await page.locator('#ptSheet').isVisible(),true);await page.keyboard.press('Escape');
   const selectedBeforeHold=await page.locator('#ptCount').textContent();const hold=page.locator('.ptCard[data-kind="knight"] .ptSelect');await hold.scrollIntoViewIfNeeded();const box=await hold.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.waitForTimeout(550);await page.mouse.up();assert.equal(await page.locator('#ptSheet').isVisible(),true);await page.keyboard.press('Escape');assert.equal(await page.locator('#ptCount').textContent(),selectedBeforeHold);await page.locator('#ptSlots button').first().click();assert.equal(await page.locator('#ptCount').textContent(),'4 / 5');await page.locator('#ptSuggest').click();
   await page.locator('#ptGo').click();assert.equal(await page.locator('#party').isHidden(),true);const saved=await page.evaluate(()=>[...window.__game.meta.party]);await page.reload();await page.waitForFunction(()=>window.__game);assert.deepEqual(await page.evaluate(()=>window.__game.meta.party),saved);
   // A new player's smaller company follows the real slot rule instead of fabricating five heroes.
   await page.evaluate(()=>{const g=window.__game;g.meta.unlocked=['knight','archer','cleric'];g.meta.party=[...g.meta.unlocked];g.party.open('edit',()=>{});});assert.equal(await page.locator('#ptCount').textContent(),'3 / 3');assert.equal(await page.locator('#ptSlots .ptSlot').count(),3);await page.locator('#ptBack').click();
   assert.deepEqual(errors,[]);results.push({width,height,bounds,searchAndCaret:true,roles:true,selectionLimits:true,cancelAndSave:true,traitsAndDetails:true,longPress:true,smallParty:true,pageErrors:errors});
  }finally{await ctx.close();}
 }
}finally{if(browser)await browser.close();await new Promise(done=>server.close(done));writeFileSync(`${samples}/ui-002-checks.json`,JSON.stringify(results,null,2)+'\n');}
console.log(JSON.stringify(results,null,2));
