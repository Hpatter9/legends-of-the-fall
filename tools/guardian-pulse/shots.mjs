// GUARDIAN-PULSE in the compiled game: a corrupted guardian's fight with the guardian moved behind an escort in the list; its
// Calamity pulse must still come from the guardian, its chip show while it stands and go when it falls. Upright phone (393x852 by default).
// Usage: npm run web && node tools/guardian-pulse/shots.mjs [outDir] [port] [widths]   (screenshots: docs/samples/guardian-pulse-*.png)
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { build } from 'esbuild';
import { chromium, executablePath } from '../calamity/browser.mjs';
const outDir = process.argv[2] ?? 'docs/samples';
const port = Number(process.argv[3] ?? 8971);
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
import { riftGuardian,tickRift } from './src/sim/riftBattle';
export { riftGuardian,tickRift,startedMeta,calamityRun,choices,saveSlot,fight,playOut,chooseAltar,pendingAltar,enterNode,clearNode };
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
const sizes = [[393, 852], [360, 780], [412, 915]].filter(([w]) => (process.argv[4] ?? '393').split(',').includes(String(w)));
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
    const shot = async (name) => { await page.waitForFunction(() => { const t = document.getElementById('towerMap'); return t.hidden || (getComputedStyle(t).opacity === '1' && (!t.classList.contains('rsMode') || document.querySelector('.rsScenery')?.naturalWidth > 0)); }); await page.waitForTimeout(900); await check(name); await page.screenshot({ path: `${outDir}/guardian-pulse-${name}-${width}.png` }); console.log(width, 'shot', name); };
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
    // a corrupted guardian's fight, with the guardian moved to the back of the list behind an escort
    await open(`QA.onTo(r, x => !QA.pendingAltar(x) && x.tower.bosses === 2 && QA.choices(x)[0]?.kind === 'boss', { corrupt: true })`);
    await page.locator('#towerMap.rsMode:not([hidden])').waitFor();
    await enterRift();
    await page.evaluate(() => document.getElementById('fight')?.click());
    await page.waitForFunction(() => window.__game.b?.phase === 'fight');
    const probe = await page.evaluate(() => {
      const b = window.__game.b, g = QA.riftGuardian(b);
      const i = b.units.indexOf(g); b.units.splice(i, 1); b.units.push(g);
      const t = b.t; const warn = []; b.t = 8000 * 50 - 1000; QA.tickRift(b, warn); b.t = t;
      const call = warn.find((e) => e.kind === 'skill' && e.name === 'Calamity pulse');
      return { guardian: g.def, id: g.id, first: b.units.find((x) => x.side === 'foe').def, by: call?.by };
    });
    console.log(width, 'probe', JSON.stringify(probe));
    if (probe.by !== probe.id) fails.push(`${width}: the pulse came from ${probe.by}, not the guardian ${probe.id}`);
    await page.waitForFunction(() => window.__game.b?.phase !== 'fight' || window.__game.b.t >= 7200);
    const chipUp = await page.evaluate(() => { const c = document.querySelector('.ahBoss'); return !!c && !c.hidden && c.textContent; });
    if (!chipUp) fails.push(`${width}: no guardian chip while it stands`);
    await shot('battle-guardian');
    // the guardian falls: its chip goes, the escort fights on without a pulse
    await page.evaluate(() => { const g = QA.riftGuardian(window.__game.b); g.hp = 0; g.alive = false; });
    await page.waitForTimeout(1200);
    const chipGone = await page.evaluate(() => { const c = document.querySelector('.ahBoss'); return !c || c.hidden; });
    if (!chipGone) fails.push(`${width}: the guardian chip stayed after it fell`);
    await shot('battle-guardian-fallen');
    if (errors.length) fails.push(`${width}: page errors ${errors.join('; ')}`);
    await context.close();
  }
} finally {
  await browser?.close();
  server.close();
}
console.log(fails.length ? `FAIL\n${fails.join('\n')}` : 'PASS: the guardian fight; the pulse is the guardian\'s, its chip shows, and goes when it falls; no page errors');
if (fails.length) process.exitCode = 1;
