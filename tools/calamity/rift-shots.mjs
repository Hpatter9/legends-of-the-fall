// Local portrait QA. Simulation fixtures are injected only into the test browser.
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { chromium, executablePath } from './browser.mjs';
const root = new URL('../../out/web/', import.meta.url);
const server = createServer((req, res) => {
  const path = new URL((req.url.split('?')[0].slice(1) || 'index.html'), root);
  if (!existsSync(path)) { res.writeHead(404); res.end(); return; }
  const ext = path.pathname.split('.').pop();
  res.setHeader('Content-Type', ({ html: 'text/html', js: 'text/javascript', css: 'text/css', png: 'image/png', json: 'application/json', woff2: 'font/woff2', opus: 'audio/ogg' })[ext] ?? 'application/octet-stream');
  res.end(readFileSync(path));
});
await new Promise((resolve) => server.listen(8148, resolve));
const bundle = await build({ stdin: { contents: `export { startedMeta } from './src/sim/meta'; export { calamityRun } from './src/sim/modes'; export { growStarter, chooseAltar } from './src/sim/rift'; export { enterNode, choices, finishTower } from './src/sim/tower'; export { frontSpots } from './tools/autoplay'; export { localBoost } from './src/sim/climb'; export { place, fight, playOut } from './src/sim/battle'; export { startStage } from './src/sim/run';`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'iife', globalName: 'RiftQA', loader: { '.png': 'empty', '.webp': 'empty' } });
const browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
mkdirSync('docs/samples/calamity-rift', { recursive: true });
try {
  for (const [width, height] of [[393,852], [360,780], [412,915]]) {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await context.addInitScript({ content: bundle.outputFiles[0].text + `; if (!localStorage.getItem('legends.meta')) { const m = RiftQA.startedMeta(1); m.opened = ['calamity', 'tower', 'castle']; localStorage.setItem('legends.meta', JSON.stringify(m)); } localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false, music: 0, effects: 0 })); localStorage.setItem('lotf-tips-off', '1');` });
    await page.goto('http://localhost:8148/');
    await page.waitForFunction(() => !!window.__game, null, { timeout: 30000 }).catch(async (e) => { console.log(await page.locator('body').innerText(), errors); throw e; });
    await page.addScriptTag({ content: bundle.outputFiles[0].text });
    await page.evaluate(() => {
      const m = RiftQA.startedMeta(1);
      m.opened = ['calamity', 'tower', 'castle'];
      window.__game.meta = m;

      const r = RiftQA.calamityRun(14, m, 'knight');
      window.__game.home.go(() => window.__game.resumeSlot(r));
    });
    await page.screenshot({ path: `docs/samples/calamity-rift/map-${width}.png` });
    // Fight the actual opening through the sim, then inspect the implemented choice UI.
    await page.evaluate(() => {
      const r = window.__game.run;
      const q = RiftQA;
      q.enterNode(r, q.choices(r)[0].id);
      r.tower.cur.fight.stage.foes = { hp: 0.01, atk: 0.01 };
      const b = q.startStage(r);
      const at = q.frontSpots(b)[0];
      q.place(b, r.roster[0].kind, ...at, r.roster[0].id, q.localBoost(r.roster[0]));
      q.fight(b); q.playOut(b); q.finishTower(r, b, true);
      window.__game.towerView.open(r);
    });
    await page.getByRole('button', { name: /^Ember / }).click();
    await page.screenshot({ path: `docs/samples/calamity-rift/altar-${width}.png` });
    await page.getByRole('button', { name: 'Corrupt', exact: true }).click();
    if (await page.evaluate(() => window.__game.run.rift.corruption) !== 1) throw Error('Corrupt choice failed');
    await page.evaluate(() => {
      const r = window.__game.run;
      r.tower.bosses = 1;
      window.__game.towerView.open(r);
    });
    await page.getByRole('button', { name: /^Offering of Fury / }).click();
    await page.getByRole('button', { name: 'Consecrate', exact: true }).click();
    await page.evaluate(() => { const r = window.__game.run; r.tower.bosses = 2; window.__game.towerView.open(r); });
    await page.getByRole('button', { name: /^Stand Together / }).click();
    await page.screenshot({ path: `docs/samples/calamity-rift/commandment-${width}.png` });
    await page.getByRole('button', { name: 'Consecrate', exact: true }).click();
    await page.evaluate(() => { const r = window.__game.run; r.tower.cur = { id: 1, kind: 'campfire' }; window.__game.towerView.open(r); });
    await page.getByRole('button', { name: /Reforge altar/ }).click();
    await page.getByRole('button', { name: /^Echo / }).click();
    await page.getByRole('button', { name: 'Reforge', exact: true }).click();
    if (await page.evaluate(() => window.__game.run.rift.patron) !== 'echo') throw Error('Reforge failed');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    if (overflow || errors.length) throw Error(JSON.stringify({ width, overflow, errors }));
    console.log(`PASS ${width}x${height}: opening, patron, corruption, offering, commandment, reforge; no page errors or horizontal overflow`);
    // Reload the saved slot and check offline after service worker activation.
    await page.waitForFunction(() => navigator.serviceWorker.controller, null, { timeout: 20000 });
    await context.setOffline(true);
    await page.reload();
    await page.waitForFunction(() => !!window.__game);
    const state = await page.evaluate(() => JSON.parse(localStorage.getItem('legends.calamity'))?.rift);
    if (state?.patron !== 'echo' || state.corruption !== 1 || state.commandment !== 'together') throw Error('Offline saved altar did not survive');
    console.log(`PASS ${width}: offline reload preserves altar`);
    await context.close();
  }
} finally { await browser.close(); server.close(); }
