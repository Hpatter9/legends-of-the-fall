// LIVING-FIELDS: every land's battlefield at an upright phone size, on three layouts and seeds each (the plan is tools/living-fields/plan.mjs --shots):
//   node tools/living-fields/shots.mjs <web dir> <out dir> <tag> [--sizes 393x852,360x780] [--lands swamp,forge] [--fight]
// Writes <out dir>/<tag>-<land>-<layout>[-<w>].png: the whole board, stood back, as the fight is deployed (`--fight`: four seconds in).
// The run is the plain kind (`mode.kind === 'run'`) with its land and seed set, so the board is `makeBoard(boardSeedOf(run, 3), land)`.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const args = process.argv.slice(2);
const flag = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : undefined);
const [root = 'out/web', out = 'docs/samples/living-fields', tag = 'before'] = args.filter((a, i) => !a.startsWith('--') && !(args[i - 1] ?? '').match(/^--(sizes|lands|port|dsf|army|stage)$/));
const sizes = (flag('--sizes') ?? '393x852').split(',').map((s) => s.split('x').map(Number));
const only = flag('--lands')?.split(',');
// (`--army orcs [--stage 2]`: an army's wave on its road instead, one shot a size: <tag>-army-<army>-<stage>.png)
const army = flag('--army');
const stage = +(flag('--stage') ?? 2);
const port = +(flag('--port') ?? 8137);
mkdirSync(out, { recursive: true });
const plan = JSON.parse(spawnSync(process.execPath, ['tools/living-fields/plan.mjs', '--shots'], { encoding: 'utf8' }).stdout);
const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', ogg: 'audio/ogg', opus: 'audio/ogg', css: 'text/css', webp: 'image/webp' };
const srv = createServer((q, r) => {
  const p = `${root}/` + (q.url.split('?')[0].slice(1) || 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(port);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let errors = 0;
const PARTY = ['knight', 'archer', 'cleric', 'paladin', 'wizard'];
for (const [w, h] of sizes) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: +(flag('--dsf') ?? 1) });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => { errors++; console.log('PAGE ERROR', e.message); });
  page.on('console', (m) => { if (m.type() === 'error') { errors++; console.log('CONSOLE ERROR', m.text()); } });
  await page.addInitScript(([owned]) => {
    if (sessionStorage.getItem('lf-set')) return;
    sessionStorage.setItem('lf-set', '1');
    localStorage.clear();
    localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 1200, stones: 30, unlocked: owned, party: owned, pulls: 0, dry: 0, dryMythic: 0, chapel: true, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, unlock: {}, stars: {}, xp: {}, bestStage: 30, tower: 9, daily: {}, bosses: [], achievements: [], armies: {}, armySeen: [], stash: [], opened: ['undead', 'beasts'] }));
    localStorage.setItem('lotf-tips-off', '1');
    localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false, speed: 1, saver: location.hash === '#saver' }));
  }, [PARTY]);
  await page.goto(`http://localhost:${port}/`, { timeout: 180000 });
  await page.waitForFunction(() => !!window.__game?.home, null, { timeout: 60000 });
  await page.waitForTimeout(1200);
  await page.evaluate(() => document.getElementById('tipSkip')?.click());
  await page.addStyleTag({ content: '#tip, .tip, #tipBox, .duchess, .say, [class*=bubble], [class*=Bubble], #quip { display: none !important; }' });
  for (const [land, list] of army ? [[`army-${army}`, [{ seed: 4242, layout: String(stage) }]]] : Object.entries(plan)) {
    if (only && !only.includes(land)) continue;
    for (const { seed, layout } of list) {
      await page.evaluate(([area, seed, party, army, stage]) => {
        const g = window.__game;
        const r = JSON.parse(JSON.stringify(g.run));
        Object.assign(r, { ...(army ? { mode: { kind: 'army', army }, tier: 0, stage, area: undefined } : { mode: { kind: 'run' }, stage: 3, area }), seed, over: false, cleared: false, gold: 0, event: undefined, roster: party.map((kind, i) => ({ id: 100 + i, kind, grade: 1, paid: 30 })), squad: [], nextId: 200 });
        document.getElementById('home').hidden = true;
        g.startRun(r);
      }, [land, seed, PARTY, army, stage]);
      await page.waitForTimeout(500);
      await page.evaluate(() => window.__game.autoArrange(true));
      await page.waitForTimeout(400);
      if (args.includes('--fight')) {
        await page.evaluate(() => document.getElementById('auto').click());
        await page.waitForTimeout(4000);
      }
      // (the camera stands back over the whole board)
      await page.evaluate(() => {
        const g = window.__game;
        if (g.intro) g.endIntro();
        g.manualCam = true;
        g.camTouchAt = performance.now() + 1e7;
        const z = g.minZoom();
        g.zoom = g.tzoom = z;
        g.cx = g.tx = (g.bbox.x0 + g.bbox.x1) / 2;
        g.cy = g.ty = (g.bbox.y0 + g.bbox.y1) / 2;
        g.clampCam();
        g.place();
      });
      await page.waitForTimeout(350);
      await page.screenshot({ path: `${out}/${tag}-${land}-${layout}${w === 393 ? '' : `-${w}`}.png`, ...(args.includes('--board') ? { clip: { x: 0, y: Math.round(h * 0.12), width: w, height: Math.round(h * 0.52) } } : {}) });
    }
  }
  await ctx.close();
}
console.log('page errors:', errors);
await browser.close();
srv.close();
