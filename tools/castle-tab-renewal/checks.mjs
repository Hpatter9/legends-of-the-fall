// Approved full Castle tab: real portrait scenes, live tap targets and offline reload. Run after npm run web.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
const { chromium } = createRequire(existsSync('/opt/codex/cua_node/lib/node_modules/playwright') ? '/opt/codex/cua_node/lib/node_modules/' : import.meta.url)('playwright');
const server = createServer((q, r) => {
  const file = `out/web/${q.url.split('?')[0].slice(1) || 'index.html'}`;
  if (!existsSync(file)) { r.writeHead(404); return r.end(); }
  const mime = { html:'text/html', js:'text/javascript', webp:'image/webp', png:'image/png', woff2:'font/woff2', webmanifest:'application/manifest+json' };
  r.writeHead(200, { 'content-type': mime[file.split('.').pop()] || 'application/octet-stream' });
  r.end(readFileSync(file));
}).listen(8723);
const browser = await chromium.launch({ executablePath: existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined, args:['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const dir = 'docs/samples/castle-tab-renewal'; mkdirSync(dir, { recursive:true });
const results = [];
try {
  for (const [width, height] of [[393,852], [360,780], [412,915]].filter(([w]) => !process.env.SIZE || w === Number(process.env.SIZE))) {
    const context = await browser.newContext({ viewport:{width,height}, deviceScaleFactor:2, reducedMotion:width === 412 ? 'reduce' : 'no-preference', ...(width === 393 ? {recordVideo:{dir:'/tmp/castle-tab-videos', size:{width,height}}} : {}) });
    const page = await context.newPage();
    const recordingStarted = Date.now();
    let clipStart = 0;
    console.log(`Royal hall ${width}: loading`);
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => {
      if (localStorage.getItem('hall-check')) return;
      localStorage.setItem('hall-check', '1');
      const party = ['knight','cleric','wizard','archer','samurai'];
      localStorage.setItem('legends.meta', JSON.stringify({ seed:7, crowns:1200, gold:3400, stones:25, unlocked:party, party, pulls:0, dry:0, castle:{treasury:2,barracks:2,armoury:3,mageTower:1,stable:1,library:1,hall:1,chapel:1}, chapel:true, works:{id:'barracks',level:3,doneAt:Date.now()+900000}, shards:{}, stars:{}, xp:Object.fromEntries(party.map(k=>[k,29760])), bestStage:14, daily:{}, bosses:[], achievements:['first'], armies:{}, armySeen:[], stash:[], opened:['undead','beasts','wildwood','labyrinth','ogres','infernal','yokai','golems','tower','castle','calamity'] }));
      localStorage.setItem('lotf-tips-off', '1');
      localStorage.setItem('legends.settings', JSON.stringify({ cinematics:false, speed:1, ruler:innerWidth === 360 ? 'frost_witch' : 'iron_stag' }));
    });
    async function open() {
      await page.waitForFunction(() => !!window.__game?.home, null, { timeout:90000 });
      await page.waitForFunction(() => !!window.__game.home.castle.goatArt?.complete && !!window.__game.home.castle.goat, null, { timeout:60000 });
      await page.evaluate(() => { document.getElementById('tipSkip')?.click(); window.__game.home.show('castle'); });
      await page.waitForFunction(() => {
        const c = window.__game.home.castle;
        return c.running && c.hallArt?.complete && c.goatArt?.complete && c.goat && c.heroKinds.length === 4;
      }, null, { timeout:60000 });
      await page.locator('#castleTab-hall').click();
    }
    async function tap(x, y) {
      const box = await page.locator('.ctHonorCanvas').boundingBox();
      await page.mouse.click(box.x + x / 800 * box.width, box.y + (y + 60) / 540 * box.height);
    }
    await page.goto('http://localhost:8723/', {waitUntil:'domcontentloaded', timeout:90000});
    await open();
    await page.waitForTimeout(600);
    assert.equal(await page.locator('.crYard').count(), 0, 'old courtyard removed');
    assert.ok(await page.locator('.ctBar').isHidden(), 'no duplicate Codex strip');
    assert.equal(await page.locator('.crTab[aria-selected=true]').textContent(), 'Throne Hall');
    const canvasBefore = await page.locator('.ctHonorCanvas').evaluate(c => c.toDataURL());
    const goatBefore = await page.evaluate(() => window.__game.home.castle.goat.x);
    clipStart = (Date.now() - recordingStarted) / 1000;
    await page.waitForTimeout(width === 393 ? 8000 : 1200);
    const canvasAfter = await page.locator('.ctHonorCanvas').evaluate(c => c.toDataURL());
    if (width === 412) assert.equal(canvasBefore, canvasAfter, 'reduced-motion scene is still');
    else assert.notEqual(canvasBefore, canvasAfter, 'hall has visible ambient animation');
    if (width === 393) assert.notEqual(goatBefore, await page.evaluate(() => window.__game.home.castle.goat.x), 'Duchess wanders');
    await page.screenshot({path:`${dir}/hall-${width}.png`});
    console.log(`Royal hall ${width}: scene ready`);
    // The actual sprite is a canvas image, not a separate Duchess DOM element.
    const ready = await page.evaluate(() => { const c=window.__game.home.castle; return {hall:c.hallArt.naturalWidth, goat:c.goatArt.naturalWidth, guards:c.heroKinds.length, reduced:c.reduced}; });
    assert.ok(ready.hall > 0 && ready.goat > 0); assert.equal(ready.guards, 4);
    assert.equal(ready.reduced, width === 412);
    await tap(400, 202);
    assert.ok(await page.evaluate(() => {const c=window.__game.home.castle;return c.kingDecreeUntil > c.now;}), 'ruler decree');
    await page.evaluate(() => {const c=window.__game.home.castle;c.kingDecreeUntil=0;c.heroFlourishUntil.fill(0);});
    await tap(225, 285);
    assert.ok(await page.evaluate(() => {const c=window.__game.home.castle;return c.heroFlourishUntil[2]>c.now && !c.kingDecreeUntil;}), 'outer guard salute');
    // Freeze only the scene clock so the goat cannot walk away between measuring and tapping.
    await page.evaluate(() => window.__game.home.castle.stop());
    const gx = await page.evaluate(() => window.__game.home.castle.goat.x);
    await tap(gx, 350);
    assert.equal(await page.evaluate(() => window.__game.home.castle.goat.mode), 'hop', 'Duchess tap');
    await page.evaluate(() => {const c=window.__game.home.castle;c.goat.mode='nest';c.goat.x=210;});
    await tap(210, 350);
    assert.ok(await page.evaluate(() => !!JSON.parse(localStorage.getItem('legends.meta')).duchessTreat), 'haystack treat persists');
    await page.evaluate(() => window.__game.home.castle.start());
    await page.locator('.crTrophies').scrollIntoViewIfNeeded();
    await page.locator('.crTrophies').click();
    assert.ok(await page.locator('.crPage > .twOverlay').isVisible(), 'trophy wall');
    await page.evaluate(() => window.__game.home.castle.trophyModal.close());
    await page.locator('#castleTab-buildings').click();
    assert.ok(await page.locator('.crHallPanel').isHidden(), 'hall hidden on Buildings');
    assert.equal(await page.locator('.crBuilding').count(), 11, 'all sites in ledger');
    await page.waitForFunction(() => [...document.querySelectorAll('.crBuildingPic')].every(im => im.complete && im.naturalWidth));
    await page.waitForFunction(() => !document.getElementById('quip') || getComputedStyle(document.getElementById('quip')).opacity === '0');
    await page.screenshot({path:`${dir}/buildings-${width}.png`});
    const levelBefore = await page.locator('.crBuilding[data-site="barracks"]').textContent();
    assert.ok(levelBefore.includes('Building'), 'active building row');
    const timerBefore = await page.locator('.crBuildingsPanel .crWorksTime').textContent();
    await page.waitForTimeout(1500);
    assert.notEqual(timerBefore, await page.locator('.crBuildingsPanel .crWorksTime').textContent(), 'construction timer ticks');
    for (const id of ['treasury','barracks','armoury','mageTower','stable','library','chapel','smithy','watchtower','hall','drillYard']) {
      await page.locator(`.crBuilding[data-site="${id}"]`).click();
      assert.ok(await page.locator('#castleCard').isVisible(), `${id} opens standard building card`);
      if (id === 'treasury') await page.screenshot({path:`${dir}/building-${width}.png`});
      await page.evaluate(() => window.__game.home.closeSheet());
    }
    await page.locator('#castleTab-hall').click();
    await page.locator('#castleTab-hall').press('ArrowRight');
    assert.equal(await page.locator('#castleTab-buildings').getAttribute('aria-selected'), 'true', 'keyboard navigation');
    await page.locator('#castleTab-buildings').press('Home');
    assert.equal(await page.locator('#castleTab-hall').getAttribute('aria-selected'), 'true');
    await page.locator('#castleTab-buildings').click();
    await page.locator('.crBuilding[data-site="treasury"]').click();
    assert.ok(await page.locator('#castleCard').isVisible(), 'courtyard still opens building card');
    await page.screenshot({path:`${dir}/building-${width}.png`});
    await page.evaluate(() => window.__game.home.closeSheet());
    await page.locator('#castleTab-hall').click();
    const fits = await page.evaluate(() => {const r=document.querySelector('.ctHonorCanvas').getBoundingClientRect();return r.left>=0 && r.right<=innerWidth+1 && document.documentElement.scrollWidth<=innerWidth+1;});
    assert.ok(fits, 'hall fits portrait');
    if (width === 393) {
      // Finishing a build redraws the ledger, and a later upgrade must not erase Duchess's reward.
      await page.evaluate(() => { const h=window.__game.home; h.meta.works.doneAt=Date.now()-1; h.tickWorks(); });
      await page.locator('#builtPop').click();
      await page.locator('#castleTab-buildings').click();
      assert.ok((await page.locator('.crBuilding[data-site="barracks"]').textContent()).includes('Lv 3 / 7'), 'completed works raise the row');
      assert.ok(await page.locator('.crBuildingsPanel .crWorks progress').isHidden(), 'idle builders have no progress bar');
      await page.evaluate(() => {const h=window.__game.home;h.meta.crowns=0;h.castle.update(h.meta);});
      assert.equal(await page.locator('.crBuilding.ready').count(), 0, 'poor state');
      await page.evaluate(() => {const h=window.__game.home;h.meta.crowns=2000;h.meta.castle.treasury=5;h.castle.update(h.meta);});
      assert.ok((await page.locator('.crBuilding[data-site="treasury"]').textContent()).includes('Complete'), 'maximum level state');
      assert.ok(await page.locator('.crBuilding[data-site="chapel"]').evaluate(e=>e.classList.contains('ready')), 'affordable chapel upgrade');
      await page.screenshot({path:`${dir}/buildings-ready-${width}.png`});
      await page.locator('.crBuilding[data-site="chapel"]').click();
      await page.locator('#castleCard .omPrimary').click();
      assert.equal(await page.evaluate(() => window.__game.home.meta.works?.id), 'chapel', 'built chapel upgrades instead of leaving for Spells');
      assert.equal(await page.evaluate(() => window.__game.home.meta.crowns), 1550, 'upgrade pays exact cost');
      assert.ok(await page.evaluate(() => !!JSON.parse(localStorage.getItem('legends.meta')).duchessTreat), 'upgrade save retains the daily treat');
      await page.evaluate(() => window.__game.home.closeSheet());
      await page.locator('#castleTab-hall').click();
      console.log('Royal hall 393: waiting for offline cache');
      await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, {timeout:90000});
      await page.waitForFunction(async () => !!(await caches.match('ui/castle/throne-hall.webp')), null, {timeout:90000});
      await context.setOffline(true);
      await page.reload({waitUntil:'domcontentloaded', timeout:90000});
      await open();
      assert.ok(await page.evaluate(() => !!JSON.parse(localStorage.getItem('legends.meta')).duchessTreat), 'treat survives offline reload');
      await page.locator('#castleTab-buildings').click();
      await page.waitForFunction(() => [...document.querySelectorAll('.crBuildingPic')].every(im=>im.complete && im.naturalWidth));
      assert.equal(await page.evaluate(() => window.__game.home.meta.works?.id), 'chapel', 'build survives offline reload');
      await page.screenshot({path:`${dir}/offline-${width}.png`});
    }
    assert.deepEqual(errors, [], 'no browser errors');
    results.push({width,height,...ready, animated:width!==412, ledgerSites:11, keyboard:true, timers:true, decree:true, guard:true, duchess:true, treat:true, trophies:true, buildingCard:true, fits:true, offline:width===393, errors});
    console.log(`Royal hall ${width}: passed`);
    const video = page.video();
    await context.close();
    if (video) execFileSync('ffmpeg', ['-y','-loglevel','error','-ss',String(clipStart),'-i',await video.path(),'-t','8','-an','-c:v','libvpx-vp9','-crf','32','-b:v','0',`${dir}/hall-motion.webm`]);
  }
  const previous = process.env.SIZE && existsSync(`${dir}/checks.json`) ? JSON.parse(readFileSync(`${dir}/checks.json`, 'utf8')).filter(r => !results.some(n => n.width === r.width)) : [];
  writeFileSync(`${dir}/checks.json`, JSON.stringify([...results, ...previous].sort((a,b) => [393,360,412].indexOf(a.width) - [393,360,412].indexOf(b.width)),null,2)+'\n');
} finally { await browser.close(); server.close(); }
