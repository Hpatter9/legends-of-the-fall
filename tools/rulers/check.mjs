import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import assert from 'node:assert/strict';
const types = { html: 'text/html', js: 'text/javascript', css: 'text/css', png: 'image/png', json: 'application/json', woff2: 'font/woff2', opus: 'audio/ogg', webmanifest: 'application/manifest+json' };
const server = createServer((q,r) => {
  const path = 'out/web/' + (q.url.split('?')[0].slice(1) || 'index.html');
  if (!existsSync(path)) { r.writeHead(404); r.end(); return; }
  r.setHeader('Content-Type', types[path.split('.').pop()] || 'application/octet-stream');
  r.end(readFileSync(path));
}).listen(Number(process.env.PORT ?? 8163), '127.0.0.1');
const ids = ['the_king','sun_viper','frost_witch','ash_empress','rose_duchess','moon_oracle','iron_stag','storm_corsair','gilded_necromancer'];
const names = ['The King','Sun Viper','Frost Witch','Ash Empress','Rose Duchess','Moon Oracle','Iron Stag','Storm Corsair','Gilded Necromancer'];
const heroes = ['knight','samurai','kunoichi','archer','wizard','paladin','druid','mercenary'];
const errors = [];
// (Settings shows one Ruler row; its button opens the picker of the nine, which closes on a pick)
const openRulers = async (page) => { if (!(await page.locator('.spOverlay:not([hidden])').count())) await page.locator('.rulerOpen').click(); };
const closeRulers = async (page) => { if (await page.locator('.spOverlay:not([hidden])').count()) await page.locator('.spClose').click(); };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
try {
for (const [width,height] of [[393,852],[360,780],[412,915]]) {
  const context = await browser.newContext({viewport:{width,height},deviceScaleFactor:1, reducedMotion:width === 360 ? 'reduce' : 'no-preference'});
  const page = await context.newPage();
  page.on('pageerror', e=>{ errors.push(e.stack); console.log('PAGE ERROR',e.stack); });
  await page.addInitScript(({heroes})=>{
    if (localStorage.getItem('legends.meta')) return;
    localStorage.setItem('lotf-tips-off','1');
    localStorage.setItem('legends.settings',JSON.stringify({cinematics:false,music:0,effects:0}));
    localStorage.setItem('legends.meta',JSON.stringify({seed:7,crowns:2000,unlocked:heroes,party:heroes.slice(0,5),pulls:0,dry:0,dryMythic:0,castle:{treasury:3,barracks:3,armoury:3,mageTower:3,stable:3,library:3},shards:{},stars:{},xp:{},bestStage:20,tower:20,daily:{},bosses:[],achievements:[],scenes:['opening']}));
  },{heroes});
  await page.goto(`http://localhost:${process.env.PORT ?? 8163}/`);
  await page.waitForFunction(()=>!!window.__game?.home,{timeout:90000});
  await page.locator('#hmGear').click();
  await openRulers(page);
  await page.locator('.rulerChoice').first().waitFor();
  await openRulers(page);
  assert.equal(await page.locator('.rulerChoice').count(),9);
  await openRulers(page);
  assert.equal(await page.locator('.rulerChoice[aria-pressed="true"]').getAttribute('aria-label'),'The King, The Classic');
  for (let i=0;i<9;i++) {
    await openRulers(page);
    await page.locator('.rulerChoice').nth(i).click();
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('legends.settings')).ruler),ids[i]);
    await openRulers(page);
    assert.equal(await page.locator('.rulerChoice[aria-pressed="true"]').count(),1);
    if (i === 0) await page.screenshot({path:`docs/samples/rulers-settings-${width}x${height}.png`});
    await closeRulers(page); await page.locator('#settingsClose').click();
    await page.locator('.hmTab').nth(3).click();
    await page.waitForTimeout(300);
    if(width===393 || i===0) await page.screenshot({path:`docs/samples/ruler-${ids[i]}-${width}x${height}.png`});
    if (width === 393 || i === 0) {
      await page.evaluate(()=>void window.__game.playScene('opening'));
      await page.locator('.csSkip').waitFor();
      await page.waitForTimeout(400);
      await page.evaluate(()=>window.__game.scenes.seek(2,0,3));
      await page.waitForTimeout(500);
      // (the line types out; slow software rendering is given time to reach the ruler's title)
      await page.waitForFunction(()=>/The (king|queen)/.test(document.querySelector('.csText')?.textContent ?? ''),null,{timeout:10000}).catch(()=>{});
      assert.match(await page.locator('.csText').innerText(),i >= 1 && i <= 5 ? /The queen/ : /The king/);
      await page.screenshot({path: `docs/samples/ruler-scene-${ids[i]}-${width}x${height}.png`});
      if (i === 0) {
        await page.evaluate(()=>{const r=window.__game.scenes.run;window.__rulerActs=r.scene.shots[2].acts.slice()});
        for (const [pose,action] of [['strike','strike'],['cast','cast'],['hurt','hurt'],['down','dead']]) {
          await page.evaluate(pose=>window.__game.scenes.run.scene.shots[2].acts.push({who:'king',pose}),pose);
          // (a one-shot holds its last frame from 540 ms; slow software rendering is given time to get there)
          await page.waitForFunction(([action,expected])=>{const f=window.__game.scenes.run.figures.get('king');return f.action===action&&f.body.texture.frame.x/224===expected;},[action,width === 360 ? action === 'dead' ? 3 : action === 'hurt' ? 0 : 2 : 3],{timeout:5000}).catch(()=>{});
          assert.equal(await page.evaluate(()=>window.__game.scenes.run.figures.get('king').action),action);
          const expected = width === 360 ? action === 'dead' ? 3 : action === 'hurt' ? 0 : 2 : 3;
          assert.equal(await page.evaluate(()=>window.__game.scenes.run.figures.get('king').body.texture.frame.x / 224),expected);
        }
        await page.evaluate(()=>{window.__game.scenes.run.scene.shots[2].acts=window.__rulerActs});
      }
      await page.locator('.csSkip').click();
    }
    await page.locator('#hmGear').click();
  }
  await closeRulers(page); await page.locator('#settingsClose').click();
  await page.reload();
  await page.waitForFunction(()=>!!window.__game?.home,{timeout:90000});
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('legends.settings')).ruler),'gilded_necromancer');
  await page.locator('#hmGear').click();
  await openRulers(page);
  assert.equal(await page.locator('.rulerChoice[aria-pressed="true"]').getAttribute('aria-label'),'Gilded Necromancer, The Eccentric');
  await openRulers(page);
  await page.locator('.rulerChoice').first().click();
  await closeRulers(page); await page.locator('#settingsClose').click();
  await page.evaluate(()=>window.__game.home.go(()=>void window.__game.stand.open()));
  await page.getByRole('button',{name:'To the keep',exact:true}).click();
  await page.waitForFunction(()=>!!window.__game.stand.hall.king);
  if (await page.locator('#tipSkip').isVisible()) await page.locator('#tipSkip').click();
  for (let i=0;i<(width===393?9:1);i++) {
    await page.evaluate(()=>document.getElementById('hmGear').click());
    await openRulers(page);
    await page.locator('.rulerChoice').nth(i).click();
    await closeRulers(page); await page.locator('#settingsClose').click();
    await page.waitForTimeout(100);
    assert.equal(await page.locator('.stKing small').innerText(),names[i]);
    await page.screenshot({path: `docs/samples/ruler-stand-${ids[i]}-${width}x${height}.png`});
    for(const action of ['cast','hurt']) {
      await page.evaluate(action=>window.__game.stand.hall.react(action),action);
      await page.waitForFunction(()=>window.__game.stand.hall.emptyThrone.visible,null,{timeout:3000}).catch(()=>{});
      assert.equal(await page.evaluate(()=>window.__game.stand.hall.rulerAction),action);
      assert.equal(await page.evaluate(()=>window.__game.stand.hall.emptyThrone.visible),true);
      if (i === 0 && action === 'cast') await page.screenshot({path: `docs/samples/ruler-stand-${ids[i]}-cast-${width}x${height}.png`});
      await page.waitForFunction(()=>window.__game.stand.hall.rulerAction==='seated',null,{timeout:5000}).catch(()=>{});
      assert.equal(await page.evaluate(()=>window.__game.stand.hall.rulerAction),'seated');
    }
  }
  await page.evaluate(()=>{const s=window.__game.stand;s.s.king.hp=0;s.s.king.alive=false;s.hall.react('dead')});
  await page.waitForFunction(()=>window.__game.stand.hall.emptyThrone.visible,null,{timeout:5000}).catch(()=>{});
  await page.waitForTimeout(900);
  assert.equal(await page.evaluate(()=>window.__game.stand.hall.rulerAction),'dead');
  assert.equal(await page.evaluate(()=>window.__game.stand.hall.emptyThrone.visible),true);
  await page.screenshot({path: `docs/samples/ruler-stand-fallen-${width}x${height}.png`});
  if (width === 393) {
    await page.evaluate(()=>window.__game.stand.leave());
    await page.evaluate(()=>navigator.serviceWorker.ready.then(()=>true));
    await context.setOffline(true);
    await page.reload({waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>!!window.__game?.home,{timeout:90000});
    await page.locator('#hmGear').click();
    await openRulers(page);
    assert.equal(await page.locator('.rulerChoice').count(),9);
    await openRulers(page);
    assert.equal(await page.locator('.rulerChoice[aria-pressed="true"]').getAttribute('aria-label'),'Gilded Necromancer, The Eccentric');
    await page.screenshot({path:'docs/samples/rulers-offline-393x852.png'});
    await context.setOffline(false);
    console.log('PASS offline reload and saved ruler');
  }
  console.log('PASS selector, castle, cinematic and Last Stand actions',width,height);
  await context.close();
}
assert.deepEqual(errors,[]);
console.log('PASS no page errors');
} finally { await browser.close();server.close(); }
