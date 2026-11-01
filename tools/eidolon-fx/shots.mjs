// EIDOLON-FX screenshots (docs/notes/eidolon-fx.md): the strike of each Eidolon frame by frame, densely from the build-up through the
// impact to the aftermath, in a real fight on a clock of our own (tools/eidolon-call-2/shots.mjs with other frames). Writes
// <OUT>/eidolon-fx-<pick>-<frame>[-<size>][-short][-reduced][-saver].png; tools/eidolon-fx/strip.py joins them.
//
//   npm run web && PORT=9062 OUT=out/eidolon-fx node tools/eidolon-fx/shots.mjs [--size 393x852] [--picks askel,nivra] [--short] [--reduced] [--saver]
//
// EIDOLON-CALL-2 screenshots (docs/notes/eidolon-call-2.md), from tools/eidolons/shots.mjs: the call's pass and its attack frame by frame
// in a real fight, on a clock of our own. Writes <OUT>/eidolon-call2-<pick>-<frame>[-<size>][-short][-reduced].png; tools/eidolon-call-2/strip.py
// joins them into strips.
//
//   npm run web && PORT=9061 OUT=docs/samples node tools/eidolon-call-2/shots.mjs [--size 393x852] [--picks askel,nivra] [--short] [--reduced] [--saver]
//
// (the old header follows)
// EIDOLONS screenshots (docs/notes/eidolons.md): the War Horn filling and full, the first blow's confirm, and the call's cinematic beat by
// beat in a real fight, on a clock of our own (the Pixi ticker stopped, the page's frame stepped by hand and the CSS animations moved with
// it, as tools/boss-big/shots.mjs does).
//
//   npm run web && PORT=8831 OUT=docs/samples node tools/eidolons/shots.mjs [--size 393x852] [--picks askel,nivra,gorm] [--short] [--reduced] [--horn]
//
// For each Eidolon picked: the Orc Warband's last boss wave, the party at level 40, the horn full with that Eidolon chosen; the fight runs a
// little, the horn is blown, and a picture is taken at each shot (horn, circle, arrive (the low angle), name, close (the close-up and its line), strike (the wide shot and its snap zoom), beat, after, resumed). `--horn` also
// takes the horn filling and full in the HUD, the camp's chip and card (with none bound: "No Eidolon has answered you yet"), and the
// confirm. Writes <OUT>/eidolon-<pick>-<beat>[-<size>][-short][-reduced].png.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');

const args = process.argv.slice(2);
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const PORT = Number(process.env.PORT ?? 9062);
const OUT = process.env.OUT ?? 'out/eidolon-fx';
const SAVER = args.includes('--saver');
const SIZE = opt('--size', '393x852');
const [W, H] = SIZE.split('x').map(Number);
const PICKS = opt('--picks', 'askel,nivra,aurelan,voltara,gorm,vaelkhar').split(',');
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
  await page.evaluate(([party]) => {
    const g = window.__game;
    g.app.ticker.start();
    const r = JSON.parse(JSON.stringify(g.run));
    Object.assign(r, { seed: 4242, mode: { kind: 'army', army: 'orcs' }, stage: 15, over: false, cleared: false, gold: 0, event: undefined, roster: party.map((kind, i) => ({ id: 100 + i, kind, grade: 1, paid: 30 })), squad: [], nextId: 200 });
    document.getElementById('home').hidden = true;
    g.startRun(r);
    g.autoArrange(true);
  }, [party]);
  await page.waitForTimeout(800);
}

const shot = (page, name) => page.screenshot({ path: `${OUT}/eidolon-fx-${name}${TAG}.png`, timeout: 180000 });

// (the frames, real ms from the tap: the sprite on, the build-up twice, the blow (in the hit-stop), the impact's bursts, the aftershocks, the
// aftermath; the hit-stop holds the cinematic's clock about a quarter of a second, so the later ones are that much behind its own times)
export const FRAMES = SHORT
  ? [['sprite', 1000], ['build1', 1200], ['build2', 1400], ['hit', 1470], ['impact1', 1620], ['impact2', 1700], ['impact3', 1800], ['shock', 1950], ['after1', 2150], ['after2', 2400]]
  : [['sprite', 2100], ['build1', 2400], ['build2', 2650], ['hit', 2740], ['impact1', 2990], ['impact2', 3080], ['impact3', 3200], ['shock', 3420], ['after1', 3750], ['after2', 4150]];
for (const pick of PICKS) {
  try {
    const { ctx, page } = await open({ horn: 1000, bound: [pick], chosen: pick, confirmed: true, ...(SHORT ? { seen: [pick] } : {}) }, true);
    await intoFight(page, PARTY);
    await page.evaluate(() => document.getElementById('fight').click());
    await page.waitForTimeout(1500);
    await page.evaluate(() => { window.__game.app.ticker.stop(); window.__step(2400); });
    await page.evaluate(() => document.querySelector('.ehFight').click());
    let at = 0;
    for (const [name, t] of FRAMES) {
      await page.evaluate((ms) => window.__step(ms), t - at);
      at = t;
      await page.waitForTimeout(120);
      await shot(page, `${pick}-${name}`);
      // (what of the cinematic's own layer shows: the elements by class, solid enough to see)
      if (process.env.DEBUG) console.log(name, await page.evaluate(() => { const pp = window.__game.eid?.p; if (pp) console.log;  const n = {}; for (const e of document.querySelectorAll('.ecBoard > *')) { const cs = getComputedStyle(e); if (cs.visibility !== 'hidden' && Number(cs.opacity) > 0.05 && e.getBoundingClientRect().width > 0) { const k = e.className.split(' ').filter((c) => c !== 'ecSp' && c !== 'once' && c !== 'loop' && c !== 'mid').join('.') || e.className; n[k] = (n[k] ?? 0) + 1; } } const br = document.querySelector('.ecBreath'); return JSON.stringify({ aim: pp?.monAim, stand: pp?.monStand, from: pp?.monFrom, n, breath: br && { w: br.style.width, h: br.style.height, t: br.style.transform, v: br.style.visibility } }); }));
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
