// RELEASE-AUDIT (docs/notes/release-audit-code.md): the built game's robustness, case by case, on a phone-sized page: a corrupt save, an
// old save, storage full, a reload in the middle of a fight, an offline start with the service worker, a lost graphics context, and a
// fight shown again after the tab was hidden. Each case says what it saw and every console error on the way.
//
//   npm run web && node tools/release-audit/robust.mjs [--only offline]
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
const { chromium } = createRequire(existsSync('/opt/node-tools/node_modules/playwright') ? '/opt/node-tools/node_modules/' : import.meta.url)('playwright');

const args = process.argv.slice(2);
const ONLY = args.includes('--only') ? args[args.indexOf('--only') + 1] : '';
const ROOT = process.env.ROOT ?? 'out/web';
const PORT = 8744;
const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', webp: 'image/webp', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/manifest+json', opus: 'audio/ogg', css: 'text/css' };
const srv = createServer((q, r) => {
  const p = `${ROOT}/` + (decodeURIComponent(q.url.split('?')[0]).slice(1) || 'index.html');
  if (!existsSync(p) || statSync(p).isDirectory()) {
    r.writeHead(404);
    return r.end();
  }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(PORT);
const URL = `http://localhost:${PORT}/?seed=5`;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });

async function open({ sw = false, init } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, hasTouch: true, isMobile: true, serviceWorkers: sw ? 'allow' : 'block' });
  const page = await ctx.newPage();
  const log = [];
  page.on('console', (m) => ['error', 'warning'].includes(m.type()) && !/Service Worker registration blocked/.test(m.text()) && log.push(`${m.type()}: ${m.text().slice(0, 240)}`));
  page.on('pageerror', (e) => log.push(`pageerror: ${String(e.message ?? e).slice(0, 300)}`));
  if (init) await page.addInitScript(init);
  return { ctx, page, log };
}
const ready = (page, ms = 300000) => page.waitForFunction(() => !!window.__game?.home, null, { timeout: ms });
const report = (name, ok, what, log) => console.log(`${ok ? 'PASS' : 'FAIL'} ${name}: ${what}${log.length ? `\n   console: ${[...new Set(log)].join('\n            ')}` : ''}`);
const want = (n) => !ONLY || n.includes(ONLY);
// (a save past its first steps, for the cases that need a plain address: a page with ?seed= is a test page and starts its own run)
const FULL = JSON.stringify({ seed: 7, crowns: 500, unlocked: ['knight', 'archer', 'mage', 'cleric', 'rogue'], party: ['knight', 'archer', 'mage', 'cleric', 'rogue'], bestStage: 5, opened: ['undead'] });
const PLAIN = `http://localhost:${PORT}/`;
const SEEDED = (meta) => `if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.clear(); localStorage.setItem('lotf-tips-off', '1'); ${meta === null ? '' : `localStorage.setItem('legends.meta', ${JSON.stringify(meta)});`} }`;

// 1. a corrupt save: half a save, cut off as a phone killed mid-write might leave it (localStorage writes a key whole, but a save
// copied in by hand or by an old build can be anything)
if (want('corrupt')) {
  const { ctx, page, log } = await open({ init: SEEDED('{"seed":7,"crowns":120,"unlocked":["knight"') });
  await page.goto(URL, { timeout: 300000 });
  await ready(page);
  const s = await page.evaluate(() => ({ crowns: window.__game.meta.crowns, saved: localStorage.getItem('legends.meta')?.slice(0, 60), backup: Object.keys(localStorage).filter((k) => /bak|corrupt|old/i.test(k)) }));
  report('corrupt save', true, `the game starts on a fresh save (crowns ${s.crowns}); the unreadable one is ${s.saved?.startsWith('{"seed":7,"crowns":120,"unlocked":["knight"') ? 'still there until the first save' : 'gone (replaced)'}; backups kept: ${JSON.stringify(s.backup)}`, log);
  await ctx.close();
}

// 2. an old save: the fewest fields an early build wrote
if (want('old')) {
  const { ctx, page, log } = await open({ init: SEEDED(JSON.stringify({ seed: 7, crowns: 345, unlocked: ['knight', 'archer', 'mage', 'cleric', 'rogue'] })) });
  await page.goto(URL, { timeout: 300000 });
  await ready(page);
  const s = await page.evaluate(() => ({ crowns: window.__game.meta.crowns, party: window.__game.meta.party }));
  report('old save', s.crowns === 345, `read with its crowns (${s.crowns}) and a party of ${s.party?.length}`, log);
  await ctx.close();
}

// 3. storage full: the page's storage filled to its quota, then a wave played to its end and the home screen opened
if (want('full')) {
  const { ctx, page, log } = await open({ init: SEEDED(null) });
  await page.goto(URL, { timeout: 300000 });
  await ready(page);
  const filled = await page.evaluate(() => {
    const chunk = 'x'.repeat(256 * 1024);
    let n = 0;
    try {
      for (; n < 400; n++) localStorage.setItem(`fill${n}`, chunk);
    } catch {
      /* full */
    }
    // (the last few hundred bytes too)
    let small = 'y'.repeat(4096);
    for (let i = 0; small.length > 8; i++) {
      try {
        localStorage.setItem(`tail${i}`, small);
      } catch {
        small = small.slice(0, small.length / 2);
      }
    }
    return n;
  });
  const out = await page.evaluate(async () => {
    const g = window.__game;
    const wait = (ms) => new Promise((ok) => setTimeout(ok, ms));
    const said = [];
    try {
      g.meta.crowns += 1;
      const { saveMeta } = { saveMeta: (m) => localStorage.setItem('legends.meta', JSON.stringify(m)) };
      saveMeta(g.meta);
      said.push('a direct save went through');
    } catch (e) {
      said.push('a direct save threw ' + e.name);
    }
    // (a run begun and fought to its end through the game's own flow)
    try {
      const r = JSON.parse(JSON.stringify(g.run));
      Object.assign(r, { seed: 99, mode: { kind: 'army', army: 'orcs' }, stage: 1, over: false, cleared: false, gold: 0, roster: g.meta.party.slice(0, 5).map((kind, i) => ({ id: 100 + i, kind, grade: 1, paid: 30 })), squad: [], nextId: 200 });
      g.home.go(() => g.startRun(r));
      g.autoArrange(true);
      await wait(800);
      document.getElementById('fight').click();
      g.speed = 3;
      for (let i = 0; i < 240 && g.b.phase === 'fight'; i++) await wait(500);
      await wait(2500);
      said.push(`the wave ended "${g.b.phase}", result card ${!document.getElementById('result').hidden}`);
    } catch (e) {
      said.push('the run threw ' + e);
    }
    return said;
  });
  report('storage full', !log.some((l) => l.startsWith('pageerror')) && !out.some((x) => x.includes('threw')), `filled ${filled} x 256 KB; ${out.join('; ')}`, log);
  await ctx.close();
}

// 4. a reload in the middle of a fight (the phone killed the app): what comes back
if (want('reload')) {
  const { ctx, page, log } = await open({ init: SEEDED(FULL) });
  await page.goto(PLAIN, { timeout: 300000 });
  await ready(page);
  const before = await page.evaluate(async () => {
    const g = window.__game;
    const wait = (ms) => new Promise((ok) => setTimeout(ok, ms));
    const r = JSON.parse(JSON.stringify(g.run));
    Object.assign(r, { seed: 99, mode: { kind: 'army', army: 'orcs' }, stage: 3, over: false, cleared: false, gold: 0, roster: g.meta.party.slice(0, 5).map((kind, i) => ({ id: 100 + i, kind, grade: 1, paid: 30 })), squad: [], nextId: 200 });
    g.home.go(() => g.startRun(r));
    g.autoArrange(true);
    await wait(800);
    document.getElementById('fight').click();
    await wait(4000);
    return { stage: g.run.stage, phase: g.b.phase, t: g.b.t, saved: !!localStorage.getItem('legends.run') };
  });
  await page.reload({ timeout: 300000 });
  await ready(page);
  await page.waitForTimeout(1500);
  const after = await page.evaluate(() => ({ home: window.__game.homeUp, stage: window.__game.run?.stage, phase: window.__game.b.phase, over: window.__game.run?.over, saved: !!localStorage.getItem('legends.run') }));
  report('reload mid-fight', after.stage === before.stage, `before: stage ${before.stage}, ${before.phase} at ${before.t} ms, run saved ${before.saved}; after: ${after.home ? 'home screen' : after.phase}, run stage ${after.stage}, over ${after.over}, run saved ${after.saved}`, log);
  await ctx.close();
}

// 5. offline: one visit online (the service worker caches every file), then the network gone and the page loaded again
if (want('offline')) {
  const { ctx, page, log } = await open({ sw: true, init: SEEDED(FULL) });
  const t0 = Date.now();
  await page.goto(PLAIN, { timeout: 300000 });
  await ready(page);
  const cached = await page.waitForFunction(
    async () => {
      const r = await navigator.serviceWorker?.getRegistration();
      // (installed and in charge of the page: not still installing, nor a new one waiting)
      if (!r?.active || r.installing || r.waiting || !navigator.serviceWorker.controller) return false;
      const keys = await caches.keys();
      if (!keys.length) return false;
      return (await (await caches.open(keys[0])).keys()).length;
    },
    null,
    { timeout: 600000, polling: 2000 },
  );
  const n = await cached.jsonValue();
  const est = await page.evaluate(async () => (await navigator.storage.estimate()).usage);
  const tCache = Date.now() - t0;
  await ctx.setOffline(true);
  const t1 = Date.now();
  let ok = true;
  try {
    await page.reload({ timeout: 120000 });
    await ready(page, 120000);
  } catch (e) {
    ok = false;
    log.push('offline load failed: ' + e.message.split('\n')[0]);
  }
  const tOff = Date.now() - t1;
  report('offline start', ok, `${n} files cached in ${Math.round(tCache / 1000)} s using ${Math.round(est / 1e6)} MB; offline start ${ok ? `ready in ${Math.round(tOff / 1000)} s` : 'did not start'}`, log);
  await ctx.close();
}

// 6. a lost graphics context mid-fight, given back after a second; then the tab hidden for a while and shown again
if (want('context') || want('hidden')) {
  const { ctx, page, log } = await open({ init: SEEDED(null) });
  await page.goto(URL, { timeout: 300000 });
  await ready(page);
  const out = await page.evaluate(async () => {
    const g = window.__game;
    const wait = (ms) => new Promise((ok) => setTimeout(ok, ms));
    const r = JSON.parse(JSON.stringify(g.run));
    Object.assign(r, { seed: 99, mode: { kind: 'army', army: 'orcs' }, stage: 2, over: false, cleared: false, gold: 0, roster: g.meta.party.slice(0, 5).map((kind, i) => ({ id: 100 + i, kind, grade: 1, paid: 30 })), squad: [], nextId: 200 });
    g.home.go(() => g.startRun(r));
    g.autoArrange(true);
    await wait(800);
    document.getElementById('fight').click();
    await wait(2000);
    const said = [];
    const gl = g.app.renderer.gl;
    const ext = gl.getExtension('WEBGL_lose_context');
    const t0 = g.b.t;
    ext.loseContext();
    await wait(1000);
    ext.restoreContext();
    await wait(3000);
    said.push(`context lost and given back: the fight's clock went ${t0} -> ${g.b.t}, context lost now ${gl.isContextLost()}, phase ${g.b.phase}`);
    // (hidden for five seconds: the page told so, as a phone's sleep tells it)
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
    await wait(5000);
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
    const t1 = g.b.t;
    await wait(3000);
    said.push(`shown again after 5 s hidden: the clock went on ${t1} -> ${g.b.t}, phase ${g.b.phase}; audio ${window.__audioDebug?.()?.state ?? '?'}`);
    return said;
  });
  report('context lost / tab hidden', !log.some((l) => l.startsWith('pageerror')), out.join('; '), log.filter((l) => !/graphics context was (lost|restored)/.test(l)));
  await ctx.close();
}
await browser.close();
srv.close();
