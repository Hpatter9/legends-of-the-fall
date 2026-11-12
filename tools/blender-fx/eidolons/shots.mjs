// EIDOLON-BLENDER screenshots (docs/notes/eidolon-blender.md), from tools/eidolon-call-2/shots.mjs: today's fire Eidolon frame by frame in
// a real fight on a clock of our own, the same fight's board with no call (the plate the Blender frames are laid over), and where the
// board's tiles lie on the screen (plate.json), so the Blender camera can be lined up with the game's.
//
//   npm run web && PORT=9071 OUT=<dir> node tools/blender-fx/eidolons/shots.mjs
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');

const args = process.argv.slice(2);
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const PORT = Number(process.env.PORT ?? 9061);
const OUT = process.env.OUT ?? 'out/eidolon-blender';
const SAVER = args.includes('--saver');
const SIZE = opt('--size', '393x852');
const [W, H] = SIZE.split('x').map(Number);
const PICKS = opt('--picks', 'askel').split(',');
// (the wave: 15 is the Orc Warband's last boss, who outlives a call; a plain wave such as 3 ends on the strike)
const STAGE = Number(opt('--stage', '15'));
const SHORT = args.includes('--short');
const REDUCED = args.includes('--reduced');
const HORN = args.includes('--horn');
const TAG = `${SIZE === '393x852' ? '' : `-${W}`}${SHORT ? '-short' : ''}${REDUCED ? '-reduced' : ''}${SAVER ? '-saver' : ''}`;
mkdirSync(OUT, { recursive: true });

const root = 'out/web';
const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', webp: 'image/webp', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', ogg: 'audio/ogg', opus: 'audio/ogg', css: 'text/css' };
const srv = createServer((q, r) => {
  const p = `${root}/` + (q.url.split('?')[0].slice(1) || 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(PORT);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const xpAt = (level) => Math.round(30 * (level - 1) * level * (level > 20 ? 4 : 1));
const PARTY = ['knight', 'paladin', 'archer', 'wizard', 'cleric'];
let errors = 0;
let missing = 0;

async function open(eidolons, confirmed) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, hasTouch: true, reducedMotion: REDUCED ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => { errors++; console.log('PAGE ERROR', e.message); });
  page.on('response', (r) => { if (r.status() === 404) { missing++; console.log('404', r.url()); } });
  await page.addInitScript(([owned, xp, short, eid, saver]) => {
    let z = 0x2545f491;
    Math.random = () => ((z = (Math.imul(z ^ (z >>> 15), 0x2c1b3c6d) + 0x6d2b79f5) | 0) >>> 0) / 4294967296;
    if (sessionStorage.getItem('eh-set')) return;
    sessionStorage.setItem('eh-set', '1');
    localStorage.clear();
    localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 1200, unlocked: owned, party: owned.slice(0, 5), pulls: 0, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp: Object.fromEntries(owned.map((k) => [k, xp])), bestStage: 14, tower: 9, daily: {}, bosses: [], achievements: [], armies: {}, armySeen: [], stash: [], opened: ['undead', 'beasts', 'tower', 'castle'], ...(eid ? { eidolons: eid } : {}) }));
    localStorage.setItem('lotf-tips-off', '1');
    localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false, speed: 1, quips: false, ...(short ? { eidolonFull: false } : {}), ...(saver ? { saver: true } : {}) }));
  }, [PARTY, xpAt(40), SHORT, eidolons, SAVER]);
  await page.goto(`http://localhost:${PORT}/`, { timeout: 240000 });
  await page.waitForFunction(() => !!window.__game?.home, null, { timeout: 240000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => document.getElementById('tipSkip')?.click());
  await page.evaluate(() => {
    const g = window.__game;
    const seen = new Map();
    window.__step = (ms) => {
      for (let t = 0; t < ms; t += 16) {
        g.frame(16, 16);
        // (every animation seen so far is stepped, not only those the page lists now: a paused one still in its delay is not listed, and
        // would never start; one the page has cancelled (idle) is left alone)
        for (const a of new Set([...seen.keys(), ...document.getAnimations()])) {
          if (!a.effect?.target?.isConnected || a.playState === "idle") continue;
          const at = (seen.get(a) ?? 0) + 16;
          seen.set(a, at);
          if (a.playbackRate !== 0) a.playbackRate = 0;
          a.currentTime = at;
        }
      }
      g.app.render();
    };
    window.__until = (ok, max) => {
      for (let t = 0; t < max; t += 16) {
        if (ok()) return true;
        window.__step(16);
      }
      return ok();
    };
  });
  return { ctx, page };
}

async function intoFight(page, party) {
  await page.evaluate(([party, stage]) => {
    const g = window.__game;
    g.app.ticker.start();
    const r = JSON.parse(JSON.stringify(g.run));
    Object.assign(r, { seed: 4242, mode: { kind: 'army', army: 'orcs' }, stage: stage, over: false, cleared: false, gold: 0, event: undefined, roster: party.map((kind, i) => ({ id: 100 + i, kind, grade: 1, paid: 30 })), squad: [], nextId: 200 });
    document.getElementById('home').hidden = true;
    g.startRun(r);
    g.autoArrange(true);
  }, [party, STAGE]);
  await page.waitForTimeout(800);
}

const shot = (page, name) => page.screenshot({ path: `${OUT}/today-${name}${TAG}.png`, timeout: 180000 });

// (a frame every 150 ms across the whole call, and a little of the fight running again)
const FRAMES = [];
const STEP = Number(process.env.STEP ?? 150);
for (let t = 0; t <= Number(process.env.END ?? 7200); t += STEP) FRAMES.push([String(t).padStart(4, '0'), Math.max(t, 16)]);
for (const pick of PICKS) {
  try {
    const { ctx, page } = await open({ horn: 1000, bound: [pick], chosen: pick, confirmed: true, ...(SHORT ? { seen: [pick] } : {}) }, true);
    await intoFight(page, PARTY);
    await page.evaluate(() => document.getElementById('fight').click());
    await page.waitForTimeout(1500);
    await page.evaluate(() => { window.__game.app.ticker.stop(); window.__step(2400); });
    // (the plate: the fight as it stands when the horn is blown, and where its tiles and fighters are on the screen)
    await page.waitForTimeout(120);
    await page.screenshot({ path: `${OUT}/plate.png`, timeout: 180000 });
    const plate = await page.evaluate(() => {
      const g = window.__game;
      const pt = (x, y) => { const p = g.boardView.root.toGlobal({ x, y }); return [Math.round(p.x * 10) / 10, Math.round(p.y * 10) / 10]; };
      const cv = g.app.canvas.getBoundingClientRect();
      const k = cv.width / g.app.renderer.width * (g.app.renderer.resolution || 1);
      return {
        canvas: [cv.left, cv.top, cv.width, cv.height], k, w: g.b.board.w, d: g.b.board.d,
        // (world pixels (0,0), (32,16) and (-32,16): tile (0,0)'s centre and one tile along each axis, at height 0)
        world: [g.world.x, g.world.y, g.world.scale.x], root: [g.boardView.root.x, g.boardView.root.y, g.boardView.root.scale.x], rot: g.boardView.rot ?? null, keys: Object.keys(g.boardView).slice(0, 40),
        o: pt(0, 0), u: pt(32, 16), v: pt(-32, 16),
        tiles: g.b.board.tiles.map((t) => t.h),
        units: g.b.units.filter((u) => u.alive).map((u) => ({ side: u.side, def: u.def, u: u.u, v: u.v })),
      };
    });
    writeFileSync(`${OUT}/plate.json`, JSON.stringify(plate));
    console.log('plate', JSON.stringify({ ...plate, tiles: undefined }));
    if (process.env.PLATE_ONLY) { await ctx.close(); continue; }
    await page.evaluate(() => document.querySelector('.ehFight').click());
    let at = 0;
    for (const [name, t] of FRAMES) {
      await page.evaluate((ms) => window.__step(ms), t - at);
      at = t;
      await page.waitForTimeout(120);
      await shot(page, `${pick}-${name}`);
      if (process.env.TRACE) console.log('t', name, await page.evaluate(() => JSON.stringify({ phase: window.__game.b.phase, foes: window.__game.b.units.filter((u) => u.side === 'foe' && u.alive).length, stage: document.querySelector('.ecLayer')?.dataset.stage, hidden: document.querySelector('.ecLayer')?.hidden, card: [...document.querySelectorAll('#waveCard, .waveCard, #result, .result')].filter((e) => !e.hidden && e.getBoundingClientRect().height > 0).length })));
      // (what of the cinematic's own layer shows: the elements by class, solid enough to see)
      if (process.env.DEBUG) console.log(name, await page.evaluate(() => { const n = {}; for (const e of document.querySelectorAll('.ecBoard > *')) { const cs = getComputedStyle(e); if (cs.visibility !== 'hidden' && Number(cs.opacity) > 0.05 && e.getBoundingClientRect().width > 0) { const k = e.className.split(' ').filter((c) => c !== 'ecSp' && c !== 'once' && c !== 'loop' && c !== 'mid').join('.') || e.className; n[k] = (n[k] ?? 0) + 1; } } const br = document.querySelector('.ecBreath'); return JSON.stringify({ n, breath: br && { w: br.style.width, h: br.style.height, t: br.style.transform, v: br.style.visibility } }); }));
    }
    const left = await page.evaluate(() => ({ phase: window.__game.b.phase, called: window.__game.b.eidolon?.called, foes: window.__game.b.units.filter((u) => u.side === 'foe' && u.alive).map((u) => `${u.def} ${Math.round((u.hp / u.maxHp) * 100)}%`), overflow: document.documentElement.scrollWidth > innerWidth }));
    console.log('ok', pick, JSON.stringify(left));
    await ctx.close();
  } catch (e) {
    console.log('FAILED', pick, String(e.message).split('\n')[0]);
  }
}
console.log('page errors:', errors, '404s:', missing);
await browser.close();
srv.close();
