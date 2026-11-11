// LIVING-FIELDS: every land's battlefield at an upright phone size, on three layouts and seeds each (the plan is tools/living-fields/plan.mjs --shots):
//   node tools/living-fields/shots.mjs <web dir> <out dir> <tag> [--sizes 393x852,360x780] [--lands swamp,forge] [--fight] [--one]
// Writes <out dir>/<tag>-<land>-<layout>[-<w>].png: the whole board, stood back, as the fight is deployed (`--fight`: four seconds in).
// The run is the plain kind (`mode.kind === 'run'`) with its land and seed set, so the board is `makeBoard(boardSeedOf(run, 3), land)`.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const args = process.argv.slice(2);
const flag = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : undefined);
const [root = 'out/web', out = 'docs/samples/living-fields', tag = 'before'] = args.filter((a, i) => !a.startsWith('--') && !(args[i - 1] ?? '').match(/^--(sizes|lands|port|dsf|army|stage|ms)$/));
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
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: +(flag('--dsf') ?? 1), reducedMotion: args.includes('--calm') ? 'reduce' : 'no-preference' });
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
  await page.goto(`http://localhost:${port}/${args.includes('--saver') ? '#saver' : ''}`, { timeout: 180000 });
  await page.waitForFunction(() => !!window.__game?.home, null, { timeout: 60000 });
  await page.waitForTimeout(1200);
  await page.evaluate(() => document.getElementById('tipSkip')?.click());
  await page.addStyleTag({ content: '#tip, .tip, #tipBox, .duchess, .say, [class*=bubble], [class*=Bubble], #quip { display: none !important; }' });
  for (const [land, list] of army ? [[`army-${army}`, [{ seed: 4242, layout: String(stage) }]]] : Object.entries(plan)) {
    if (only && !only.includes(land)) continue;
    // (`--one`: only each land's first shape)
    for (const { seed, layout } of args.includes('--one') ? list.slice(0, 1) : list) {
      await page.evaluate(([area, seed, party, army, stage, noLife, hazards]) => {
        const g = window.__game;
        const r = JSON.parse(JSON.stringify(g.run));
        Object.assign(r, { ...(army ? { mode: { kind: 'army', army }, tier: 0, stage, area: undefined } : { mode: { kind: 'run' }, stage: 3, area }), seed, over: false, cleared: false, gold: 0, event: undefined, roster: party.map((kind, i) => ({ id: 100 + i, kind, grade: 1, paid: 30 })), squad: [], nextId: 200 });
        document.getElementById('home').hidden = true;
        if (noLife) g.life.on = false;
        // (`--hazards`: the land's traps and hazards laid whatever the set's switch says; `--no-hazards`: none)
        if (hazards !== null) g.fieldHazards(hazards);
        g.startRun(r);
      }, [land, seed, PARTY, army, stage, args.includes('--no-life'), args.includes('--hazards') ? true : args.includes('--no-hazards') ? false : null]);
      await page.waitForTimeout(500);
      await page.evaluate(() => window.__game.autoArrange(true));
      await page.waitForTimeout(400);
      if (args.includes('--fight')) {
        // (`--fight`: the fight is begun and played for `--ms` (8000) before the shot; what the traps did is printed)
        await page.evaluate(() => {
          const g = window.__game;
          window.__trapLog = [];
          if (!g.__logged) {
            g.__logged = true;
            const was = g.fx.show.bind(g.fx);
            g.fx.show = (b, events, ...rest) => {
              for (const e of events) if (e.kind === 'fieldTrap' || (e.kind === 'hazard' && e.phase === 'go')) window.__trapLog.push(e.what);
              return was(b, events, ...rest);
            };
          }
          document.getElementById('fight').click();
        });
        // (`--bench`: the frames' times over the fight, and what the life layer's own step cost; `--no-life` plays it with the layer off)
        if (args.includes('--bench')) await page.evaluate(() => {
          const g = window.__game;
          g.life.cost = { ms: 0, frames: 0 };
          window.__frames = [];
          let last = performance.now();
          const tick = (now) => { window.__frames.push(now - last); last = now; if (window.__frames.length < 4000) requestAnimationFrame(tick); };
          requestAnimationFrame(tick);
        });
        await page.waitForTimeout(+(flag('--ms') ?? 8000));
        // (`--root`: every hero is held as a snare holds it, to see the mark on a snared fighter)
        if (args.includes('--root')) {
          await page.evaluate(() => { const b = window.__game.b; for (const x of b.units) if (x.side === 'hero') x.rootUntil = b.t + 60000; });
          await page.waitForTimeout(700);
        }
        if (args.includes('--bench')) console.log(land, layout, JSON.stringify(await page.evaluate(() => {
          const f = window.__frames.slice(5).sort((a, b) => a - b);
          const g = window.__game;
          const mean = f.reduce((a, b) => a + b, 0) / f.length;
          return { frames: f.length, meanMs: +mean.toFixed(2), p95Ms: +f[Math.floor(f.length * 0.95)].toFixed(2), lifeStepMs: +(g.life.cost.ms / Math.max(1, g.life.cost.frames)).toFixed(4), units: g.b.units.filter((x) => x.alive).length };
        })));
        console.log(land, layout, 'phase', await page.evaluate(() => window.__game.b.phase), 'sprung:', (await page.evaluate(() => window.__trapLog)).join(' ') || 'none');
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
