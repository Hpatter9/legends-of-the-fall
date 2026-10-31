// The Calamity's battle zones in the compiled game (CAL-ZONES): each zone mid-fight at 393x852, a few at 360x780 and 412x915, and one
// with reduced motion. Screenshots go to docs/samples/calzones-*.png. A portal fight is entered through the sim, its court laid in the
// zone wanted (a seed found for it), and the page starts the battle as it would.
// Usage: npm run web && node tools/calamity/zone-shots.mjs [port]
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { build } from 'esbuild';
import { chromium, executablePath } from './browser.mjs';
const port = Number(process.argv[2] ?? 8951);
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
import { choices, enterNode } from './src/sim/tower';
import { hireHero } from './src/sim/climb';
import { destinationBoard } from './src/sim/sanctuary';
export { startedMeta };
/** A Calamity run of six heroes at a portal fight, its court laid in \`zone\` in \`world\` (the first seed that lays it). */
export function zoneRun(meta, zone, world, act) {
  const run = calamityRun(14, meta, 'knight');
  for (const k of ['archer', 'samurai', 'wizard', 'kunoichi', 'knight']) hireHero(run, k, 0);
  run.rift.patron = 'ember';
  run.rift.wins = 1;
  enterNode(run, choices(run).find((n) => n.kind === 'fight').id);
  let seed = 1;
  while (destinationBoard(seed, world, act).layout !== zone && seed < 5000) seed++;
  const board = destinationBoard(seed, world, act);
  run.tower.cur.world = world;
  run.tower.cur.fight.stage.board = board;
  run.tower.cur.fight.stage.area = board.area;
  return run;
}`;
const bundle = await build({ stdin: { contents: source, resolveDir: process.cwd() }, bundle: true, write: false, format: 'iife', globalName: 'ZoneFixture', loader: { '.png': 'empty', '.webp': 'empty' } });
const init = bundle.outputFiles[0].text + `;globalThis.ZoneQA=ZoneFixture;if(!localStorage.getItem('legends.meta')){const m=ZoneQA.startedMeta(1);m.opened=['calamity','tower','castle'];localStorage.setItem('legends.meta',JSON.stringify(m));}localStorage.setItem('legends.tips',JSON.stringify(['home','deploy','fight','mana','skill','ult','summon','crowns','calamity','tower','talents','castle','spellbook','stash','equipment','recycle','retry','autoReplay']));localStorage.setItem('legends.settings',JSON.stringify({cinematics:false,music:0,effects:0}));`;
const SHOTS = [
  ['nave', 'rootbound', 1, [[393, 852], [360, 780]]],
  ['cavern', 'prism', 2, [[393, 852], [412, 915]]],
  ['crypt', 'hollow', 1, [[393, 852]]],
  ['voidBridge', 'ashen', 3, [[393, 852], [360, 780]]],
  ['ritual', 'hollow', 3, [[393, 852], [412, 915]]],
  ['floodVault', 'rootbound', 2, [[393, 852]]],
  ['nave', 'frost', 1, [[393, 852]]],
  ['voidBridge', 'prism', 3, [[393, 852]]],
];
mkdirSync('docs/samples', { recursive: true });
let browser;
const bad = [];
try {
  browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  for (const calm of [false, true]) {
    const context = await browser.newContext({ viewport: { width: 393, height: 852 }, reducedMotion: calm ? 'reduce' : 'no-preference' });
    await context.addInitScript({ content: init });
    const page = await context.newPage();
    page.setDefaultTimeout(180000);
    page.on('pageerror', (e) => { bad.push(e.message); console.log('PAGE ERROR', e.message); });
    await page.goto(`http://localhost:${port}/`, { timeout: 240000 });
    await page.waitForFunction(() => !!window.__game, null, { timeout: 180000 });
    for (const [zone, world, act, sizes] of calm ? [SHOTS[3]] : SHOTS) {
      for (const [width, height] of calm ? [[393, 852]] : sizes) {
        await page.setViewportSize({ width, height });
        await page.evaluate(([zone, world, act]) => {
          const g = window.__game;
          const r = ZoneQA.zoneRun(g.meta, zone, world, act);
          for (const id of ['result', 'towerMap']) { const e = document.getElementById(id); if (e) e.hidden = true; }
          g.home.go(() => g.resumeSlot(r));
        }, [zone, world, act]);
        await page.waitForFunction(() => window.__game.b?.phase === 'deploy', null, { timeout: 60000 });
        await page.waitForTimeout(1500);
        await page.evaluate(() => { const g = window.__game; for (const u of g.b.units) if (u.side === 'foe') { u.hp = u.maxHp = Math.round(u.maxHp * 4); } g.begin(); });
        // (into the thick of it: the two sides have met)
        await page.waitForFunction(() => window.__game.b.t >= 6000, null, { timeout: 120000 });
        const name = `docs/samples/calzones-${zone}-${world}${calm ? '-calm' : ''}-${width}.png`;
        await page.screenshot({ path: name });
        const info = await page.evaluate(() => ({ phase: window.__game.b.phase, layout: window.__game.b.board.layout, over: document.documentElement.scrollWidth > innerWidth }));
        console.log(name, JSON.stringify(info));
        if (info.layout !== zone || info.over) bad.push(`${name}: ${JSON.stringify(info)}`);
      }
    }
    await context.close();
  }
} finally {
  await browser?.close();
  server.close();
}
if (bad.length) { console.log('PROBLEMS', bad); process.exit(1); }
console.log('PASS');
