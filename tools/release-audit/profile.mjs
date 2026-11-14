// RELEASE-AUDIT (docs/notes/release-audit-code.md): what the built game does in the background, screen by screen, on a throttled
// phone-sized page: the main thread's busy share, the frames, the animation-frame loops and timers that ran (by the place in the code
// that asked for them), the listeners, observers, audio contexts and workers alive, the heap and the graphics card's pictures; then ten
// waves of one run for growth, and every console error and failed load on the way.
//
//   npm run web && node tools/release-audit/profile.mjs [--cpu 4] [--root out/web] [--waves 10] [--secs 8] [--json out/audit.json]
//
// `node build.mjs --plain --out out/plain` and `--root out/plain` name the places by their module (the minified build has one long line).
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
const { chromium } = createRequire(existsSync('/opt/node-tools/node_modules/playwright') ? '/opt/node-tools/node_modules/' : import.meta.url)('playwright');

const args = process.argv.slice(2);
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const CPU = Number(opt('--cpu', '4'));
const ROOT = opt('--root', 'out/web');
const WAVES = Number(opt('--waves', '10'));
const SECS = Number(opt('--secs', '8'));
const ONLY = opt('--only', '');
const PROF = opt('--prof', '');
const PORT = Number(process.env.PORT ?? 8733);

// (a line of the plain build to its module, by esbuild's "// src/x.ts" marks)
const modOf = (() => {
  const marks = [];
  readFileSync(`${ROOT}/game.js`, 'utf8').split('\n').forEach((l, i) => {
    const m = l.match(/^\s*\/\/ ((?:src|node_modules)\/\S+)$/);
    if (m) marks.push([i + 1, m[1]]);
  });
  return (line) => {
    if (!marks.length || line === '?') return `game.js:${line}`;
    let lo = 0;
    for (const [at, mod] of marks) if (at <= Number(line)) lo = mod;
    return `${lo}:${line}`;
  };
})();

const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', webp: 'image/webp', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', opus: 'audio/ogg', css: 'text/css' };
const missing = [];
const srv = createServer((q, r) => {
  const p = `${ROOT}/` + (decodeURIComponent(q.url.split('?')[0]).slice(1) || 'index.html');
  if (!existsSync(p)) {
    missing.push(q.url);
    r.writeHead(404);
    return r.end();
  }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(PORT);

const units = readFileSync('src/sim/units.ts', 'utf8');
const list = (name) => [...(units.match(new RegExp(`export const ${name}[^=]*= \\[([^\\]]*)\\]`))?.[1] ?? '').matchAll(/'([A-Za-z]+)'/g)].map((m) => m[1]);
const HEROES = [...new Set([...list('HEROES'), ...list('ALL_HEROES')])];
const xpAt = (level) => Math.round(30 * (level - 1) * level * (level > 20 ? 4 : 1));

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-precise-memory-info', '--js-flags=--expose-gc'] });
const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
const page = await ctx.newPage();
const consoleLog = [];
page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning' || m.type() === 'startGroupCollapsed') && consoleLog.push({ type: m.type(), text: m.text().slice(0, 400), at: stage }));
page.on('pageerror', (e) => consoleLog.push({ type: 'pageerror', text: String(e.stack ?? e).slice(0, 600), at: stage }));
page.on('requestfailed', (r) => consoleLog.push({ type: 'requestfailed', text: r.url() + ' ' + r.failure()?.errorText, at: stage }));
let stage = 'load';
await page.addInitScript({ path: 'tools/release-audit/inpage.js' });
await page.addInitScript(([owned, xp]) => {
  if (sessionStorage.getItem('audit-set')) return;
  sessionStorage.setItem('audit-set', '1');
  localStorage.clear();
  localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 99999, unlocked: owned, party: owned.slice(0, 5), pulls: 0, dry: 0, dryMythic: 0, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, chapel: true, shards: {}, stars: {}, xp: Object.fromEntries(owned.map((k) => [k, xp])), bestStage: 30, tower: 9, daily: {}, bosses: [], achievements: [], armies: {}, armySeen: [], stash: [], opened: ['undead', 'beasts', 'wildwood', 'labyrinth', 'ogres', 'infernal', 'yokai', 'golems', 'castle'], ultAuto: true, spellAuto: true, ultSeen: Object.fromEntries(owned.map((k) => [k, 1])) }));
  localStorage.setItem('lotf-tips-off', '1');
  localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false, speed: 3, quips: false }));
}, [HEROES, xpAt(34)]);
const t0 = Date.now();
await page.goto(`http://localhost:${PORT}/`, { timeout: 300000 });
await page.waitForFunction(() => !!window.__game?.home, null, { timeout: 300000 });
const loadMs = Date.now() - t0;
await page.evaluate(() => document.getElementById('tipSkip')?.click());
await page.mouse.click(4, 4);
const cdp = await ctx.newCDPSession(page);
await cdp.send('Performance.enable');
if (CPU > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
await page.waitForTimeout(3000);

const metrics = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
const pageState = () =>
  page.evaluate(() => {
    const A = window.__audit;
    const g = window.__game;
    const r = g?.app?.renderer;
    return {
      hidden: document.hidden,
      heap: Math.round((performance.memory?.usedJSHeapSize ?? 0) / 1e6),
      textures: r?.texture?.managedTextures?.filter(Boolean).length ?? null,
      gpuMB: Math.round(((r?.texture?.managedTextures ?? []).filter(Boolean).reduce((s, t) => s + (t.pixelWidth ?? 0) * (t.pixelHeight ?? 0) * 4, 0)) / 1e6),
      intervals: [...A.intervals.values()].map((v) => v.at + '/' + v.ms),
      listeners: Object.fromEntries(Object.entries(A.listeners).filter(([, n]) => n > 0)),
      globalSites: { ...A.globalSites },
      observers: A.observers.live,
      audio: A.audio.map((c) => c.state),
      workers: A.workers,
      dom: document.getElementsByTagName('*').length,
      canvases: document.getElementsByTagName('canvas').length,
      ticker: g?.app?.ticker?.started,
      stageRenderable: g?.app?.stage?.renderable,
    };
  });

const results = [];
async function measure(name, secs = SECS) {
  if (ONLY && !name.includes(ONLY) && name !== 'home') return;
  stage = name;
  await page.evaluate(() => (window.__audit.reset(), window.__audit.startProbe()));
  const prof = PROF && name.includes(PROF);
  if (prof) await cdp.send('Profiler.enable'), await cdp.send('Profiler.start');
  const m0 = await metrics();
  const w0 = Date.now();
  await page.waitForTimeout(secs * 1000);
  const m1 = await metrics();
  if (prof) {
    const { profile } = await cdp.send('Profiler.stop');
    const self = {};
    const dt = profile.timeDeltas;
    const byId = new Map(profile.nodes.map((n) => [n.id, n]));
    profile.samples.forEach((id, i) => {
      const n = byId.get(id);
      const f = n.callFrame;
      const k = (f.functionName || '(anon)') + ' ' + (f.url.endsWith('game.js') ? modOf(String(f.lineNumber + 1)) : f.url.split('/').pop() || f.functionName);
      self[k] = (self[k] ?? 0) + (dt[i] ?? 0) / 1000;
    });
    const tot = Object.values(self).reduce((a, b) => a + b, 0);
    console.log(`   profile ${name}: top self time of ${Math.round(tot)} ms`);
    for (const [k, v] of Object.entries(self).sort((a, b) => b[1] - a[1]).slice(0, 25)) console.log(`     ${(100 * v / tot).toFixed(1).padStart(5)}% ${k}`);
    // (`--callers getBoundingClientRect`: who calls a function, up to three frames)
    const want = opt('--callers', '');
    if (want) {
      const parent = new Map();
      for (const n of profile.nodes) for (const c of n.children ?? []) parent.set(c, n.id);
      const by = {};
      const name = (n) => (n.callFrame.functionName || '(anon)') + ' ' + (n.callFrame.url.endsWith('game.js') ? modOf(String(n.callFrame.lineNumber + 1)) : '');
      profile.samples.forEach((id, i) => {
        const n = byId.get(id);
        if (!want.split(',').includes(n.callFrame.functionName)) return;
        let p = byId.get(parent.get(id));
        const chain = [];
        for (let d = 0; d < 3 && p; d++, p = byId.get(parent.get(p.id))) chain.push(name(p));
        const k = n.callFrame.functionName + ' < ' + chain.join(' < ');
        by[k] = (by[k] ?? 0) + (dt[i] ?? 0) / 1000;
      });
      for (const [k, v] of Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 12)) console.log(`     ${Math.round(v)} ms ${k}`);
    }
  }
  const wall = (Date.now() - w0) / 1000;
  const snap = await page.evaluate(() => ({ ...window.__audit.snap(), probe: window.__audit.stopProbe() }));
  const st = await pageState();
  const per = (o) => Object.entries(o).map(([k, n]) => [k.startsWith('iv:') ? 'interval ' + modOf(k.slice(3)) : modOf(k), +(n / wall).toFixed(1)]).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const row = {
    name,
    cpu: +((100 * (m1.TaskDuration - m0.TaskDuration)) / wall).toFixed(1),
    script: +((100 * (m1.ScriptDuration - m0.ScriptDuration)) / wall).toFixed(1),
    style: +((100 * (m1.RecalcStyleDuration - m0.RecalcStyleDuration + m1.LayoutDuration - m0.LayoutDuration)) / wall).toFixed(1),
    fps: +(snap.probe.frames / wall).toFixed(1),
    frameMean: +snap.probe.mean.toFixed(1),
    frameP95: +snap.probe.p95.toFixed(1),
    rafPerS: +(Object.values(snap.rafs).reduce((s, n) => s + n, 0) / wall).toFixed(1),
    timersPerS: +(Object.values(snap.timers).reduce((s, n) => s + n, 0) / wall).toFixed(1),
    rafs: per(snap.rafs),
    timers: per(snap.timers),
    ...st,
  };
  results.push(row);
  console.log(`${name.padEnd(22)} cpu ${String(row.cpu).padStart(5)}%  script ${String(row.script).padStart(5)}%  style ${String(row.style).padStart(4)}%  fps ${String(row.fps).padStart(5)}  p95 ${String(row.frameP95).padStart(6)}ms  raf/s ${row.rafPerS} timers/s ${row.timersPerS}  heap ${row.heap}MB tex ${row.textures} (${row.gpuMB}MB) dom ${row.dom} hidden ${row.hidden} ticker ${row.ticker}`);
  if (args.includes('--sites')) console.log('   rafs', JSON.stringify(row.rafs), '\n   timers', JSON.stringify(row.timers));
  return row;
}
// (headless Chromium never hides a page: the page is told it is hidden and its frames are held, as a phone's are)
const hide = async () => page.evaluate(() => window.__audit.setHidden(true));
const show = async () => page.evaluate(() => window.__audit.setHidden(false));

// --- the screens ---
await measure('home');
let other = await hide();
await measure('home, tab hidden');
await show(other);
await page.waitForTimeout(1000);
for (const tab of ['recruit', 'heroes', 'castle', 'spells']) {
  await page.evaluate((t) => window.__game.home.show(t), tab);
  await page.waitForTimeout(1500);
  await measure(`tab ${tab}`);
}
await page.evaluate(() => window.__game.home.show('battle'));
await page.waitForTimeout(800);
await page.evaluate(() => document.getElementById('hmGear').click());
await page.waitForTimeout(1200);
await measure('settings over home');
await page.evaluate(() => document.getElementById('settingsClose')?.click());
await page.waitForTimeout(800);
await page.evaluate(() => window.__game.home.openArmies());
await page.waitForTimeout(1500);
await measure('armies page over home');
await page.evaluate(() => document.getElementById('hmSubBack')?.click());
await page.waitForTimeout(800);

// (every menu the home screen opens, each opened and shut, and the page resized through the three phone sizes: what the console says)
stage = 'menu sweep';
const sweep = await page.evaluate(async () => {
  const g = window.__game;
  const h = g.home;
  const wait = (ms) => new Promise((ok) => setTimeout(ok, ms));
  const done = [];
  const tryIt = async (name, f) => {
    try {
      await f();
      await wait(700);
      done.push(name);
    } catch (e) {
      done.push(name + ' THREW ' + e);
    }
    // (shut whatever is up: the sub-page, the sheet, Settings, a standard menu's Close, the home screen's own way back)
    document.getElementById('hmSubBack')?.click();
    document.getElementById('settingsClose')?.click();
    for (const b of document.querySelectorAll('.omClose, .ornateClose, [data-close], .menuFoot button')) if (b.offsetParent) b.click();
    h.open();
    await wait(300);
  };
  await tryIt('achievements', () => h.openAchievements());
  await tryIt('codex', () => h.openCodex());
  await tryIt('armies', () => h.openArmies());
  await tryIt('quests', () => h.openQuests());
  await tryIt('roster', () => h.openRoster());
  await tryIt('hero sheet', () => h.openSheet(g.meta.unlocked[0]));
  await tryIt('council', () => h.openCouncil());
  await tryIt('houses', () => h.openHouses());
  await tryIt('gallery', () => h.openGallery());
  for (const page of ['sound', 'display', 'gameplay', 'ruler', 'data', 'diag', 'updates', 'about'])
    await tryIt('settings ' + page, async () => {
      document.getElementById('hmGear').click();
      await wait(200);
      const b = [...document.querySelectorAll('#settingsBody button')].find((x) => x.textContent.toLowerCase().includes(page === 'gameplay' ? 'gameplay' : page === 'diag' ? 'diagnostics' : page === 'updates' ? 'updates' : page));
      b?.click();
      await wait(300);
    });
  return done;
});
console.log('menu sweep:', sweep.join(', '));
for (const [w, hgt] of [[360, 780], [412, 915], [393, 852]]) {
  await page.setViewportSize({ width: w, height: hgt });
  await page.waitForTimeout(800);
}
if (args.includes('--quick')) {
  const errs = await page.evaluate(() => window.__audit.errors);
  for (const [k, t] of errs) console.log('  page', k, String(t).slice(0, 300));
  for (const c of consoleLog) console.log('  console', c.at, c.type, c.text.slice(0, 200).replace(/\n/g, ' / '));
  console.log('404s', JSON.stringify([...new Set(missing)]), 'load ms', loadMs);
  await browser.close();
  srv.close();
  process.exit(0);
}
// (a run: the soak's own way in)
const startRun = (o) =>
  page.evaluate((o) => {
    const g = window.__game;
    const r = JSON.parse(JSON.stringify(g.run));
    Object.assign(r, { seed: o.seed, mode: { kind: 'army', army: o.army }, stage: o.stage, over: false, cleared: false, gold: 0, event: undefined, tower: undefined, rift: undefined, duel: undefined, roster: o.party.map((kind, i) => ({ id: 100 + i, kind, grade: 1, paid: 30 })), squad: [], nextId: 200 });
    // (the home screen's own way out, as its Battle button takes: its scenes stop)
    g.home.go(() => g.startRun(r));
    g.autoArrange(true);
  }, o);
await startRun({ seed: 4242, army: 'orcs', stage: 1, party: HEROES.slice(0, 5) });
await page.waitForTimeout(2500);
await measure('deploy');
await page.evaluate(() => (document.getElementById('bossCard')?.click(), document.getElementById('fight').click(), (window.__game.speed = 1)));
await page.waitForTimeout(2000);
await measure('fight x1');
let mutsOut = null;
if (args.includes('--mut')) {
  // (what the page's DOM does in a fight: mutations a second by element and kind)
  const muts = await page.evaluate(
    () =>
      new Promise((ok) => {
        const by = {};
        const name = (n) => (n.nodeType === 1 ? n.tagName.toLowerCase() + (n.id ? '#' + n.id : '') + (n.classList?.length ? '.' + [...n.classList].slice(0, 2).join('.') : '') : (n.parentElement ? name(n.parentElement) + '>text' : 'text'));
        const mo = new MutationObserver((list) => {
          for (const r of list) {
            // (a write of the value already there: "same")
            const same = r.type === 'attributes' ? r.oldValue === r.target.getAttribute(r.attributeName) : r.type === 'characterData' ? r.oldValue === r.target.data : r.type === 'childList' && r.addedNodes.length === 1 && r.removedNodes.length === 1 && r.addedNodes[0].nodeType === 3 && r.addedNodes[0].data === r.removedNodes[0].data;
            const k = `${same ? 'SAME ' : ''}${r.type}${r.attributeName ? ':' + r.attributeName : ''} ${name(r.target)}`;
            by[k] = (by[k] ?? 0) + 1;
          }
        });
        mo.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true, attributeOldValue: true, characterDataOldValue: true });
        setTimeout(() => (mo.disconnect(), ok(Object.entries(by).sort((a, b) => b[1] - a[1]))), 5000);
      }),
  );
  const all = muts.reduce((t, [, n]) => t + n, 0);
  const same = muts.filter(([k]) => k.startsWith('SAME ')).reduce((t, [, n]) => t + n, 0);
  mutsOut = { all, same, top: muts.slice(0, 20) };
  console.log(`   DOM mutations in 5 s of fight: ${all}, of them ${same} writing the value already there`);
  for (const [k, n] of muts.slice(0, 20)) console.log(`     ${String(n).padStart(6)} ${k}`);
}
other = await hide();
await measure('fight, tab hidden');
await show(other);
await page.waitForTimeout(800);
// (the page's own pause, if the fight shows one)
const paused = await page.evaluate(() => {
  const b = document.querySelector('#pauseBtn, #fhPause, .fhPause, [data-act="pause"]');
  if (b) b.click();
  return b?.id || b?.className || null;
});
if (paused) {
  await page.waitForTimeout(800);
  await measure('fight paused');
  await page.evaluate(() => document.querySelector('#pauseBtn, #fhPause, .fhPause, [data-act="pause"]')?.click());
}

// --- ten waves of one run ---
const vis = `(el) => !!el && !el.hidden && el.offsetParent !== null`;
const waveRows = [];
let resultMeasured = false;
for (let w = 0; w < WAVES; w++) {
  stage = `wave ${w + 1}`;
  await page.evaluate(() => (window.__game.speed = 3));
  // (to the fight's end: a stepped check every half second, up to three minutes)
  let end = null;
  for (let i = 0; i < 360; i++) {
    end = await page.evaluate(() => {
      const g = window.__game;
      for (const el of document.querySelectorAll('.rvRow button:last-child')) el.click();
      document.getElementById('bossCard')?.click();
      const r = document.getElementById('result');
      return { phase: g.b.phase, result: !!r && !r.hidden, home: !!g.homeUp, over: !!g.run.over };
    });
    if (end.result || end.home || (end.phase !== 'fight' && end.phase !== 'deploy')) break;
    if (end.phase === 'deploy' && w === WAVES) break;
    if (end.phase === 'deploy') await page.evaluate(() => document.getElementById('fight')?.click());
    await page.waitForTimeout(500);
  }
  if (end.result && !resultMeasured) {
    resultMeasured = true;
    await page.waitForTimeout(1500);
    await measure('result card');
  }
  await page.evaluate(() => (window.gc?.(), 0));
  const st = await pageState();
  waveRows.push({ wave: w + 1, phase: end.phase, heap: st.heap, textures: st.textures, gpuMB: st.gpuMB, dom: st.dom, canvases: st.canvases, listeners: Object.values(st.listeners).reduce((s, n) => s + n, 0), observers: st.observers, intervals: st.intervals.length, audio: st.audio.length });
  console.log('wave', JSON.stringify(waveRows.at(-1)));
  if (end.home || end.over) break;
  // (on to the next wave: the result tapped, its way on pressed, any card closed)
  for (let i = 0; i < 60; i++) {
    const at = await page.evaluate(() => {
      const g = window.__game;
      const v = (el) => !!el && !el.hidden && el.offsetParent !== null;
      for (const el of document.querySelectorAll('.rvRow button:last-child')) el.click();
      const r = document.getElementById('result');
      if (v(r)) {
        r.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        const n = document.getElementById('next');
        if (v(n) && !g.passing) n.click();
      }
      return { phase: g.b.phase, home: !!g.homeUp, result: v(r), screens: window.__screens?.() ?? [] };
    });
    if (at.phase === 'deploy' && !at.result && !at.screens.length) break;
    if (at.home) break;
    for (const s of at.screens) await page.evaluate(() => document.querySelector('.ornate .close, .omClose, [data-close]')?.click());
    await page.waitForTimeout(500);
  }
  if (w < WAVES - 1) await page.evaluate(() => document.getElementById('fight')?.click());
}
// (back home after the run, the board under it: does the fight's work stop?)
await page.evaluate(() => document.getElementById('homeBtn')?.click());
await page.waitForTimeout(1500);
await page.evaluate(() => {
  const h = document.getElementById('home');
  if (h.hidden) window.__game.home.open?.();
});
await page.waitForTimeout(2000);
await measure('home after run');
other = await hide();
await measure('home after run, hidden');
await show(other);

// (menus opened and shut twenty times: does anything grow?)
const before = await pageState();
for (let i = 0; i < 20; i++) {
  await page.evaluate(() => document.getElementById('hmGear').click());
  await page.waitForTimeout(150);
  await page.evaluate(() => document.getElementById('settingsClose')?.click());
  for (const tab of ['recruit', 'heroes', 'castle', 'spells', 'battle']) {
    await page.evaluate((t) => window.__game.home.show(t), tab);
    await page.waitForTimeout(120);
  }
}
await page.evaluate(() => (window.gc?.(), 0));
await page.waitForTimeout(1000);
const after = await pageState();
const sum = (o) => Object.values(o).reduce((s, n) => s + n, 0);
const menus = { heap: [before.heap, after.heap], textures: [before.textures, after.textures], dom: [before.dom, after.dom], listeners: [sum(before.listeners), sum(after.listeners)], observers: [before.observers, after.observers], intervals: [before.intervals.length, after.intervals.length] };
console.log('menus x20', JSON.stringify(menus));
const grow = Object.entries(after.globalSites).map(([k, n]) => [k.split('@')[0] + ' @ ' + modOf(k.split('@')[1]), n - (before.globalSites[k] ?? 0)]).filter(([, d]) => d > 0);
console.log('listener growth (adds by site)', JSON.stringify(grow));
console.log('live listeners on window/document/body by type, before/after', JSON.stringify(before.listeners), JSON.stringify(after.listeners));

const errs = await page.evaluate(() => window.__audit.errors);
const errsAt = consoleLog.filter((c) => c.type === 'pageerror').map((c) => c.at);
const out = { cpu: CPU, root: ROOT, loadMs, mutations: mutsOut, results, waveRows, menus, listenerGrowth: grow, console: consoleLog, pageErrors: errs, missing: [...new Set(missing)] };
for (const [k, t] of errs) console.log('  page', k, String(t).slice(0, 300));
console.log('load ms', loadMs, '| console', consoleLog.length, '| 404s', JSON.stringify(out.missing));
const seen = {};
for (const c of consoleLog) seen[c.type + ' ' + c.text.slice(0, 160)] = (seen[c.type + ' ' + c.text.slice(0, 160)] ?? 0) + 1;
for (const [k, n] of Object.entries(seen)) console.log(`  x${n} ${k}`);
if (opt('--json', '')) writeFileSync(opt('--json', ''), JSON.stringify(out, null, 1));
await browser.close();
srv.close();
