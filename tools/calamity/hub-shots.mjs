// The living Rift Sanctuary in the compiled game (CALAMITY-HUB): the idle room, the ring turning, the walk into a rift and its
// flash fading off the battle, and the walk back out with the cards rising, at the three phone sizes; then the same with reduced
// motion. Screenshots and frames go to docs/samples/calhub-* (`hub-strip.py` makes the strips). The room's own clock is held still
// (`window.__hubTime`) and stepped to take the frames; the rest of the page runs as it does.
// Usage: npm run web && node tools/calamity/hub-shots.mjs [port]
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { build } from 'esbuild';
import { chromium, executablePath } from './browser.mjs';
const port = Number(process.argv[2] ?? 8921);
const webRoot = resolve('out/web');
const server = createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const file = resolve(webRoot, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!file.startsWith(webRoot + sep) || !existsSync(file) || !statSync(file).isFile()) { res.writeHead(404); res.end(); return; }
  const ext = file.split('.').pop();
  res.setHeader('Content-Type', ({ html: 'text/html', js: 'text/javascript', css: 'text/css', png: 'image/png', json: 'application/json', webmanifest: 'application/manifest+json', opus: 'audio/ogg' })[ext] ?? 'application/octet-stream');
  res.end(readFileSync(file));
});
await new Promise((ok) => server.listen(port, '127.0.0.1', ok));
const source = `
import { startedMeta } from './src/sim/meta';
import { calamityRun } from './src/sim/modes';
import { choices,clearNode,enterNode } from './src/sim/tower';
import { chooseAltar,pendingAltar } from './src/sim/rift';
import { saveSlot } from './src/sim/run';
import { fight,playOut } from './src/sim/battle';
export { startedMeta,calamityRun,choices,saveSlot,fight,playOut };
/** A run two crossings in, its patron chosen, so a won crossing comes straight back to the room; its left rift is a fight. */
export function oneIn(meta) {
  const run=calamityRun(14,meta,'knight');
  for(let i=0;i<2;i++){enterNode(run,choices(run).find(n=>n.kind==='fight').id);clearNode(run);const altar=pendingAltar(run);if(altar)chooseAltar(run,'ember');}
  // (a battle won in the page is the first that counts for the altar: the patron is chosen now, so no altar waits on the return)
  run.rift.wins=Math.max(1,run.rift.wins);if(pendingAltar(run))chooseAltar(run,'ember');
  if(choices(run)[0].kind!=='fight')throw Error('the left rift is not a fight');
  return run;
}`;
const bundle = await build({ stdin: { contents: source, resolveDir: process.cwd() }, bundle: true, write: false, format: 'iife', globalName: 'HubFixture', loader: { '.png': 'empty', '.webp': 'empty' } });
const expect = (ok, message) => { if (!ok) throw Error(message); };
/** Hold the room's clock still at the page's now, step it on (and let the page draw two frames), or let it go. */
const hold = (page) => page.evaluate(() => { window.__hubTime = performance.now(); });
const step = (page, ms) => page.evaluate((ms) => new Promise((ok) => { window.__hubTime += ms; requestAnimationFrame(() => requestAnimationFrame(ok)); }), ms);
const free = (page) => page.evaluate(() => { delete window.__hubTime; });
const out = 'docs/samples';
mkdirSync(`${out}/calhub-frames`, { recursive: true });
const init = bundle.outputFiles[0].text + `;globalThis.HubQA=HubFixture;if(!localStorage.getItem('legends.meta')){const m=HubQA.startedMeta(1);m.opened=['calamity','tower','castle'];localStorage.setItem('legends.meta',JSON.stringify(m));}localStorage.setItem('legends.tips',JSON.stringify(['home','deploy','fight','mana','skill','ult','summon','crowns','calamity','tower','talents','castle','spellbook','stash','equipment','recycle','retry','autoReplay']));localStorage.setItem('legends.settings',JSON.stringify({cinematics:false,music:0,effects:0}));`;
const report = [];
let browser;
try {
  browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  for (const calm of [false, true]) {
    const context = await browser.newContext({ viewport: { width: 393, height: 852 }, reducedMotion: calm ? 'reduce' : 'no-preference' });
    await context.addInitScript({ content: init });
    const page = await context.newPage(), errors = [];page.setDefaultTimeout(120000);
    page.on('pageerror', (e) => { errors.push(e.message); console.log('PAGE ERROR', e.message); });
    await page.goto(`http://localhost:${port}/`, { timeout: 240000 });
    await page.waitForFunction(() => !!window.__game, null, { timeout: 180000 });
    const sizes = calm ? [[393, 852]] : [[393, 852], [360, 780], [412, 915]];
    for (const [width, height] of sizes) {
      const tag = `${calm ? 'calm-' : ''}${width}`;
      await page.setViewportSize({ width, height });
      await page.evaluate(() => { const g = window.__game; document.getElementById('result').hidden = true; g.towerView.close(); const r = HubQA.oneIn(g.meta); HubQA.saveSlot(r); g.home.go(() => g.resumeSlot(r)); });
      const hub = page.locator('#towerMap.rsMode:not([hidden])');
      await hub.waitFor({ timeout: 120000 });
      await page.waitForFunction(() => document.querySelector('.rsScenery')?.naturalWidth > 0 && document.querySelectorAll('.rsRift').length === 3);
      await page.waitForTimeout(2000);
      // (the room: no page overflow, the rifts inside the scene, the menu on screen; the camera drifts up to 3 px)
      const lay = await page.evaluate(() => {
        const s = document.querySelector('.rsScene').getBoundingClientRect();
        const rifts = [...document.querySelectorAll('.rsRift')].map((r) => r.getBoundingClientRect());
        return { overflow: document.documentElement.scrollWidth > innerWidth, menu: document.querySelector('.rsMenu').getBoundingClientRect().bottom <= innerHeight,
          rifts: rifts.every((r) => r.left >= s.left - 2 && r.right <= s.right + 2 && r.top >= s.top - 2), middle: Math.abs((rifts[1].left + rifts[1].right) / 2 - (s.left + s.right) / 2) < 6,
          stages: document.querySelectorAll('.rsStage').length };
      });
      expect(!lay.overflow && lay.menu && lay.rifts && lay.middle && lay.stages === 1, `${tag} layout ${JSON.stringify(lay)}`);
      await page.screenshot({ path: `${out}/calhub-idle-${tag}.png` });
      // (pick the right-hand rift: the ring turns it to the middle)
      await hold(page);
      await hub.locator('.rsDestination').nth(0).click();
      await step(page, 260);
      if (width === 393 && !calm) await page.screenshot({ path: `${out}/calhub-pan.png` });
      await step(page, 600);
      const centred = await page.evaluate(() => { const s = document.querySelector('.rsScene').getBoundingClientRect(), r = document.querySelectorAll('.rsRift')[0].getBoundingClientRect(); return Math.abs((r.left + r.right) / 2 - (s.left + s.right) / 2); });
      expect(centred < 6, `${tag}: the chosen rift is not in the middle (${centred})`);
      if (width === 393) await page.screenshot({ path: `${out}/calhub-turned-${tag}.png` });
      // (enter: the walk, the flare, the flash, the battle fading in)
      await page.evaluate(() => document.querySelector('.rsEnter').click());
      const frames = [];
      for (let ms = 0; ms <= 3000; ms += 150) {
        if (width === 393) { const f = `${out}/calhub-frames/${calm ? 'calm-' : ''}in-${String(ms).padStart(4, '0')}.png`; await page.screenshot({ path: f }); frames.push(f); }
        await step(page, 150);
      }
      await free(page);
      await page.waitForFunction(() => window.__game.run.tower.cur?.fight && window.__game.b.phase === 'deploy');
      const left = await page.evaluate(() => ({ flash: document.querySelectorAll('.rsFlash').length, hub: !document.getElementById('towerMap').hidden, stages: document.querySelectorAll('.rsStage:not(#towerMap[hidden] *)').length }));
      expect(left.flash === 0 && !left.hub, `${tag}: the hub was not torn down ${JSON.stringify(left)}`);
      if (width === 393) await page.screenshot({ path: `${out}/calhub-battle-${tag}.png` });
      // (win, and come back: the walk out of the rift, the cards rising)
      await page.evaluate(() => { const g = window.__game; for (const u of g.b.units) if (u.side === 'foe') { u.hp = u.maxHp = 1; u.power = 0.01; } HubQA.fight(g.b); HubQA.playOut(g.b); g.endWait = 100000; g.refresh(); });
      await page.waitForFunction(() => { const r = document.getElementById('result'); return !r.hidden && r.classList.contains('passing'); }, null, { timeout: 120000 });
      // (the room's clock is held for the walk-out's frames too)
      await hold(page);
      let t = Date.now();
      await page.evaluate(() => document.getElementById('result').click());
      console.log(`${tag}: back in the room in ${Date.now() - t} ms`);
      expect(await page.evaluate(() => !document.getElementById('towerMap').hidden), `${tag}: no room after the win`);
      const back = await page.evaluate(() => ({ returning: document.querySelector('.riftSanctuary').classList.contains('rsReturning'), stages: document.querySelectorAll('.rsStage').length, flash: document.querySelectorAll('.rsFlash').length, sel: [...document.querySelectorAll('.rsRift')].findIndex((r) => r.classList.contains('selected')) }));
      expect(back.stages === 1 && back.flash === 0, `${tag}: the hub came back unclean ${JSON.stringify(back)}`);
      expect(calm || (back.returning && back.sel === 0), `${tag}: no walk-out from the rift the party went in by ${JSON.stringify(back)}`);
      if (width === 360 && !calm) {
        // (a tap during the walk-out settles the room at once, and does not also pick a rift)
        await step(page, 300);
        const sel = await page.evaluate(() => document.querySelector('.rsDestination.selected')?.dataset.id);
        // (dispatched on the room itself: the short card may still be fading off the page)
        await page.evaluate(() => { const r = document.querySelector('.rsRift'); r.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); r.click(); });
        await step(page, 50);
        const after = await page.evaluate(() => ({ returning: document.querySelector('.riftSanctuary').classList.contains('rsReturning'), sel: document.querySelector('.rsDestination.selected')?.dataset.id }));
        expect(!after.returning && after.sel === sel, `${tag}: a tap did not skip the walk-out ${JSON.stringify(after)}`);
      }
      await step(page, 0);
      for (let ms = 0; ms <= 3000; ms += 150) {
        t = Date.now();
        if (width === 393) {
          await page.screenshot({ path: `${out}/calhub-frames/${calm ? 'calm-' : ''}out-${String(ms).padStart(4, '0')}.png`, timeout: 300000 });
          if (!calm && ms === 600) await page.screenshot({ path: `${out}/calhub-walkout.png`, timeout: 300000 });
          if (!calm && ms === 900) await page.screenshot({ path: `${out}/calhub-cards.png`, timeout: 300000 });
        }
        await step(page, 150);
        if (ms === 0) console.log(`${tag}: a walk-out frame in ${Date.now() - t} ms`);
      }
      await free(page);
      await page.waitForTimeout(800);
      const settled = await page.evaluate(() => ({ returning: document.querySelector('.riftSanctuary').classList.contains('rsReturning'), up: [...document.querySelectorAll('.rsDestination')].every((c) => getComputedStyle(c).opacity === '1') }));
      expect(!settled.returning && settled.up, `${tag}: did not settle ${JSON.stringify(settled)}`);
      await page.screenshot({ path: `${out}/calhub-settled-${tag}.png` });
      report.push(`${tag}: ok`);
    }
    expect(!errors.length, errors.join('\n'));
    await context.close();
  }
  console.log(report.join('\n'));
} finally {
  await browser?.close();
  server.close();
}
