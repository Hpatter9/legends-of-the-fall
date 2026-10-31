// ALTAR-CLEAR in the compiled game, as a new player meets it, at the three phone sizes: the room before the first win, the
// first-visit explainer, each altar step (patron, offering, commandment) with consecrate against corrupt, the "Your altar"
// summary, a reforge at a campfire, and the altar's chip in a fight and in a corrupted guardian's fight.
// Usage: npm run web && node tools/altar-clear/shots.mjs [outDir] [port]   (screenshots: docs/samples/altar-clear-*.png)
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { build } from 'esbuild';
import { chromium, executablePath } from '../calamity/browser.mjs';
const outDir = process.argv[2] ?? 'docs/samples';
const port = Number(process.argv[3] ?? 8931);
mkdirSync(outDir, { recursive: true });
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
export { startedMeta,calamityRun,choices,saveSlot,fight,playOut,chooseAltar,pendingAltar,enterNode,clearNode };
/** On through the crossings, the altar answered as told, until \`until(run)\` holds. */
export function onTo(run, until, picks = {}) {
  for (let i = 0; i < 40 && !until(run); i++) {
    const altar = pendingAltar(run);
    if (altar) { chooseAltar(run, picks[altar] ?? (altar==='patron'?'ember':altar==='offering'?'fury':'together'), !!picks.corrupt); continue; }
    run.tower.mapDone = undefined;
    const n = choices(run).find(n=>n.kind==='fight') ?? choices(run)[0];
    enterNode(run, n.id); clearNode(run);
    // (a win in the page counts for the altar; one settled here does not, so it is counted by hand)
    if (n.kind === 'fight' || n.kind === 'elite' || n.kind === 'boss') run.rift.wins++;
  }
  return run;
}`;
const bundle = await build({ stdin: { contents: source, resolveDir: process.cwd() }, bundle: true, write: false, format: 'iife', globalName: 'AltarFixture', loader: { '.png': 'empty', '.webp': 'empty' } });
const seenTips = ['home','deploy','fight','mana','skill','ult','summon','crowns','calamity','tower','talents','castle','spellbook','stash','equipment','recycle','retry','autoReplay'];
const init = bundle.outputFiles[0].text + `;globalThis.QA=AltarFixture;if(!localStorage.getItem('legends.meta')){const m=QA.startedMeta(1);m.opened=['calamity','tower','castle'];localStorage.setItem('legends.meta',JSON.stringify(m));}localStorage.setItem('legends.tips',JSON.stringify(${JSON.stringify(seenTips)}));localStorage.setItem('legends.settings',JSON.stringify({cinematics:false,music:0,effects:0}));`;
const sizes = [[393, 852], [360, 780], [412, 915]].filter(([w]) => !process.argv[4] || process.argv[4].split(',').includes(String(w)));
const fails = [];
let browser;
try {
  browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  for (const [width, height] of sizes) {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
    await context.addInitScript({ content: init });
    const page = await context.newPage();page.setDefaultTimeout(240000);
    const errors = [];
    page.on('pageerror', (e) => { errors.push(e.message); console.log('PAGE ERROR', e.message); });
    await page.goto(`http://localhost:${port}/`, { timeout: 300000 });
    await page.waitForFunction(() => !!window.__game, null, { timeout: 300000 });
    const check = async (name) => {
      const lay = await page.evaluate(() => {
        const card = document.querySelector('.riftAltar');
        const acts = document.querySelector('.riftActions');
        return { overflow: document.documentElement.scrollWidth > innerWidth, actions: !acts || acts.getBoundingClientRect().bottom <= innerHeight + 1, cardWide: !card || card.getBoundingClientRect().right <= innerWidth + 1 };
      });
      if (lay.overflow || !lay.actions || !lay.cardWide) fails.push(`${width} ${name}: ${JSON.stringify(lay)}`);
    };
    const shot = async (name) => { await page.waitForFunction(() => { const t = document.getElementById('towerMap'); return t.hidden || (getComputedStyle(t).opacity === '1' && (!t.classList.contains('rsMode') || document.querySelector('.rsScenery')?.naturalWidth > 0)); }); await page.waitForTimeout(900); await check(name); await page.screenshot({ path: `${outDir}/altar-clear-${name}-${width}.png` }); console.log(width, 'shot', name); };
    const open = (fn) => page.evaluate((fn) => { const g = window.__game; document.getElementById('result').hidden = true; g.towerView.close(); const r = QA.calamityRun(14, g.meta, 'knight'); new Function('r', 'QA', fn)(r, QA); QA.saveSlot(r); g.home.go(() => g.resumeSlot(r)); }, fn);
    const winFight = () => page.evaluate(() => { const g = window.__game; for (const u of g.b.units) if (u.side === 'foe') { u.hp = u.maxHp = 1; u.power = 0.01; } QA.fight(g.b); QA.playOut(g.b); g.endWait = 100000; g.refresh(); });
    const pick = (text) => page.evaluate((text) => [...document.querySelectorAll('.riftAltar .rtChoice')].find((b) => b.textContent.includes(text)).click(), text);
    const press = (text) => page.evaluate((text) => [...document.querySelectorAll('.riftAltar button')].find((b) => b.textContent.trim() === text).click(), text);
    const toBottom = () => page.evaluate(() => { for (const e of [document.querySelector('.riftAltar'), document.querySelector('.dmAltarVeil')]) if (e) e.scrollTop = e.scrollHeight; });
    // (the room may still be settling its arrival: the tap is tried again until the crossing begins)
    const enterRift = async () => {
      for (let i = 0; i < 60; i++) {
        if (await page.evaluate(() => !!window.__game.run.tower.cur)) break;
        await page.evaluate(() => document.querySelector('.rsEnter')?.click());
        await page.waitForTimeout(2000);
      }
      await page.waitForFunction(() => window.__game.b?.phase === 'deploy' && window.__game.run.tower.cur?.fight);
    };
    const cardGone = () => page.waitForFunction(() => !document.querySelector('.riftAltar'));
    // 1. a fresh run: the room, the altar asleep
    await open('');
    await page.locator('#towerMap.rsMode:not([hidden])').waitFor();
    await page.waitForTimeout(2500);
    await shot('room-fresh');
    // 2. the first win: the altar wakes, and the explainer shows by itself the first time
    await enterRift();
    await winFight();
    await page.waitForFunction(() => !document.getElementById('result').hidden);
    await page.evaluate(() => document.getElementById('result').click());
    await page.waitForFunction(() => document.querySelector('.riftAltar .altarHelp'));
    await shot('explainer');
    await page.evaluate(() => document.querySelector('.altarHelp button').click());
    await shot('patron-unpicked');
    await pick('Ember');
    await shot('patron');
    await toBottom();
    await shot('patron-seals');
    await press('Corrupt');
    await cardGone();
    // 3. the room with a patron, and the summary
    await shot('room');
    await page.evaluate(() => document.querySelector('.rsAltar').click());
    await page.waitForFunction(() => document.querySelector('.riftAltar .altarSummary'));
    if (await page.evaluate(() => !!document.querySelector('.altarHelp'))) fails.push(`${width}: the explainer showed twice`);
    await shot('summary');
    await page.evaluate(() => document.querySelector('.riftAltar .altarInfo').click());
    await shot('info');
    await page.evaluate(() => document.querySelector('.altarHelp button').click());
    await press('Back');
    await cardGone();
    // 4. a fight with the patron: the chip, before and during
    await enterRift();
    await shot('battle-deploy');
    await page.evaluate(() => document.getElementById('fight')?.click());
    await page.waitForFunction(() => window.__game.b?.phase === 'fight' && window.__game.b.t >= 2500);
    await page.evaluate(() => document.getElementById('altarHud')?.classList.add('open'));
    await shot('battle');
    // 5. the offering, then the commandment, then a corrupted guardian's fight
    await open(`QA.onTo(r, x => QA.pendingAltar(x) === 'offering', { corrupt: true })`);
    await page.waitForFunction(() => document.querySelector('.riftAltar .rtChoice'));
    await pick('Fury');
    await shot('offering');
    await toBottom();
    await shot('offering-seals');
    await open(`QA.onTo(r, x => QA.pendingAltar(x) === 'commandment', { corrupt: true })`);
    await page.waitForFunction(() => document.querySelector('.riftAltar .rtChoice'));
    await pick('Together');
    await shot('commandment');
    await toBottom();
    await shot('commandment-seals');
    await open(`QA.onTo(r, x => !QA.pendingAltar(x) && x.tower.bosses === 2 && QA.choices(x)[0]?.kind === 'boss', { corrupt: true })`);
    await page.locator('#towerMap.rsMode:not([hidden])').waitFor();
    await shot('room-guardian');
    await enterRift();
    await page.evaluate(() => document.getElementById('fight')?.click());
    await page.waitForFunction(() => window.__game.b?.phase !== 'fight' || window.__game.b.t >= 7200);
    await shot('battle-guardian');
    // 6. a reforge at a campfire
    await open(`QA.onTo(r, x => !QA.pendingAltar(x) && x.rift.patron && QA.choices(x).some(n => n.kind === 'campfire'), { corrupt: true }); QA.enterNode(r, QA.choices(r).find(n => n.kind === 'campfire').id);`);
    await page.waitForFunction(() => [...document.querySelectorAll('#towerMap .rtChoice')].some((b) => b.textContent.includes('Reforge')));
    await page.evaluate(() => [...document.querySelectorAll('#towerMap .rtChoice')].find((b) => b.textContent.includes('Reforge')).click());
    await page.waitForFunction(() => document.querySelector('.riftAltar .rtChoice'));
    await pick('Echo');
    await shot('reforge');
    if (errors.length) fails.push(`${width}: page errors ${errors.join('; ')}`);
    await context.close();
  }
} finally {
  await browser?.close();
  server.close();
}
console.log(fails.length ? `FAIL\n${fails.join('\n')}` : 'PASS: every altar screen at 393x852, 360x780 and 412x915; no overflow, the choice buttons on screen, no page errors');
if (fails.length) process.exitCode = 1;
