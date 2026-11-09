// Approved royal hall: real portrait scenes, live tap targets and offline reload. Run after npm run web.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const { chromium } = createRequire(existsSync('/opt/codex/cua_node/lib/node_modules/playwright') ? '/opt/codex/cua_node/lib/node_modules/' : import.meta.url)('playwright');
const server = createServer((q, r) => {
  const file = `out/web/${q.url.split('?')[0].slice(1) || 'index.html'}`;
  if (!existsSync(file)) { r.writeHead(404); return r.end(); }
  const mime = { html:'text/html', js:'text/javascript', webp:'image/webp', png:'image/png', woff2:'font/woff2', webmanifest:'application/manifest+json' };
  r.writeHead(200, { 'content-type': mime[file.split('.').pop()] || 'application/octet-stream' });
  r.end(readFileSync(file));
}).listen(8723);
const browser = await chromium.launch({ executablePath: existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined, args:['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const dir = 'docs/samples/royal-hall'; mkdirSync(dir, { recursive:true });
const results = [];
try {
  for (const [width, height] of [[393,852], [360,780], [412,915]]) {
    const context = await browser.newContext({ viewport:{width,height}, deviceScaleFactor:2, reducedMotion:width === 412 ? 'reduce' : 'no-preference' });
    const page = await context.newPage();
    console.log(`Royal hall ${width}: loading`);
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => {
      if (localStorage.getItem('hall-check')) return;
      localStorage.setItem('hall-check', '1');
      const party = ['knight','cleric','wizard','archer','samurai'];
      localStorage.setItem('legends.meta', JSON.stringify({ seed:7, crowns:1200, gold:3400, stones:25, unlocked:party, party, pulls:0, dry:0, castle:{treasury:2,barracks:1,armoury:3,mageTower:1,stable:1,library:1,hall:1,chapel:1}, chapel:true, shards:{}, stars:{}, xp:Object.fromEntries(party.map(k=>[k,29760])), bestStage:14, daily:{}, bosses:[], achievements:['first'], armies:{}, armySeen:[], stash:[], opened:['undead','beasts','wildwood','labyrinth','ogres','infernal','yokai','golems','tower','castle','calamity'] }));
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
      await page.locator('.ctHonorCanvas').scrollIntoViewIfNeeded();
    }
    async function tap(x, y) {
      const box = await page.locator('.ctHonorCanvas').boundingBox();
      await page.mouse.click(box.x + x / 800 * box.width, box.y + y / 420 * box.height);
    }
    await page.goto('http://localhost:8723/', {waitUntil:'domcontentloaded'});
    await open();
    await page.waitForTimeout(600);
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
    await page.locator('.crSpot[data-site="treasury"]').scrollIntoViewIfNeeded();
    await page.locator('.crSpot[data-site="treasury"]').click();
    assert.ok(await page.locator('#castleCard').isVisible(), 'courtyard still opens building card');
    await page.screenshot({path:`${dir}/building-${width}.png`});
    await page.evaluate(() => window.__game.home.closeSheet());
    await page.locator('.ctHonorCanvas').scrollIntoViewIfNeeded();
    const fits = await page.evaluate(() => {const r=document.querySelector('.ctHonorCanvas').getBoundingClientRect();return r.left>=0 && r.right<=innerWidth+1 && document.documentElement.scrollWidth<=innerWidth+1;});
    assert.ok(fits, 'hall fits portrait');
    if (width === 393) {
      console.log('Royal hall 393: waiting for offline cache');
      await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, {timeout:90000});
      await page.waitForFunction(async () => !!(await caches.match('ui/castle/throne-hall.webp')), null, {timeout:90000});
      await context.setOffline(true);
      await page.reload({waitUntil:'domcontentloaded'});
      await open();
      assert.ok(await page.evaluate(() => !!JSON.parse(localStorage.getItem('legends.meta')).duchessTreat), 'treat survives offline reload');
      await page.screenshot({path:`${dir}/offline-${width}.png`});
    }
    assert.deepEqual(errors, [], 'no browser errors');
    results.push({width,height,...ready, decree:true, guard:true, duchess:true, treat:true, trophies:true, buildingCard:true, fits:true, offline:width===393, errors});
    console.log(`Royal hall ${width}: passed`);
    await context.close();
  }
  writeFileSync(`${dir}/checks.json`, JSON.stringify(results,null,2)+'\n');
} finally { await browser.close(); server.close(); }
