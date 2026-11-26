// EIDOLON-SMOOTH (docs/notes/eidolon-smooth.md): what an Eidolon's call costs on a slow phone. For each of the six, in a real fight on
// the page's own clock (the Orc Warband's boss wave, the War Horn full, that Eidolon bound and chosen), the page's CPU throttled (4
// times by default): the fight runs a few seconds (its own frames are kept, as the measure to hold the call against), the horn is
// blown, and every frame's time and every long task are kept until the call is over and the fight has run on a second.
//
//   npm run web && node tools/eidolon-smooth/measure.mjs [--picks askel,nivra] [--cpu 4] [--runs 1] [--trace] [--profile] [--saver] [--short]
//   ROOT=<another build's folder> measures an older build beside this one. `--trace`: the browser's own timeline (time by kind of work
//   on every thread, the longest single pieces, what was handed to the graphics card). `--profile` (with `node build.mjs --plain`):
//   the functions with the most time in them and under them.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const CPU = Number(opt('--cpu', 4));
const RUNS = Number(opt('--runs', 1));
const PICKS = opt('--picks', 'askel,nivra,gorm,voltara,aurelan,vaelkhar').split(',');
const TRACE = args.includes('--trace'), PROFILE = args.includes('--profile'), SAVER = args.includes('--saver'), SHORT = args.includes('--short');
const PORT = Number(process.env.PORT ?? 9171);
const root = process.env.ROOT ?? 'out/web';
const W = 393, H = 852;
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

const stat = (frames, tasks) => {
  const s = [...frames].sort((a, b) => a - b);
  return { frames: s.length, worst: Math.round(s[s.length - 1] ?? 0), p95: Math.round(s[Math.min(s.length - 1, Math.floor(s.length * 0.95))] ?? 0), mean: Math.round(s.reduce((a, b) => a + b, 0) / Math.max(1, s.length)),
    over33: s.filter((x) => x > 33.4).length, over50: s.filter((x) => x > 50).length, over100: s.filter((x) => x > 100).length, longTasks: tasks.length, tasksOver100: tasks.filter((t) => t >= 100).length, longest: Math.max(0, ...tasks) };
};

async function take(pick) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, hasTouch: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(([owned, xp, eid, saver, short]) => {
    const m = (window.__sm = { frames: [], tasks: [] });
    try { new PerformanceObserver((l) => { for (const e of l.getEntries()) m.tasks.push({ at: e.startTime, ms: e.duration }); }).observe({ entryTypes: ['longtask'] }); } catch { /* none */ }
    // (what the canvas is asked to draw: its draw calls, its masks' stencil clears and the pictures handed to the graphics card, each with its time)
    m.gl = [];
    const P = WebGL2RenderingContext.prototype;
    for (const k of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) { const f = P[k]; P[k] = function (...a) { m.gl.push({ at: performance.now(), k: 'draw' }); return f.apply(this, a); }; }
    { const f = P.stencilFunc; P.stencilFunc = function (...a) { m.gl.push({ at: performance.now(), k: 'stencil' }); return f.apply(this, a); }; }
    { const f = P.bindFramebuffer; P.bindFramebuffer = function (...a) { m.gl.push({ at: performance.now(), k: 'target' }); return f.apply(this, a); }; }
    for (const k of ['texImage2D', 'texSubImage2D']) { const f = P[k]; P[k] = function (...a) { const src = a[a.length - 1]; const t0 = performance.now(); const r = f.apply(this, a); m.gl.push({ at: t0, k: 'upload', ms: performance.now() - t0, what: src && src.width ? `${src.width}x${src.height}` : `${a[3]}x${a[4]}` }); return r; }; }
    let last = 0;
    // (the call's own pieces on the page, at their most: how many, and how many carry a filter)
    m.dom = { most: 0, filtered: 0, kinds: '' };
    setInterval(() => { const all = document.querySelectorAll('.ecLayer *, .ecBoard *'); if (all.length <= m.dom.most) return; const kinds = {}; let filtered = 0;
      for (const x of all) { const k = x.className && typeof x.className === 'string' ? x.className.split(' ').slice(0, 3).join('.') : x.tagName; kinds[k] = (kinds[k] ?? 0) + 1; if (getComputedStyle(x).filter !== 'none') filtered++; }
      m.dom = { most: all.length, filtered, kinds: Object.entries(kinds).sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k, v]) => `${v} ${k}`).join(', ') }; }, 300);
    const tick = (now) => { if (last) m.frames.push({ at: now, ms: now - last }); last = now; requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
    if (sessionStorage.getItem('es-set')) return;
    sessionStorage.setItem('es-set', '1');
    localStorage.clear();
    localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 1200, unlocked: owned, party: owned.slice(0, 5), pulls: 0, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp: Object.fromEntries(owned.map((k) => [k, xp])), bestStage: 14, tower: 9, daily: {}, bosses: [], achievements: [], armies: {}, armySeen: [], stash: [], opened: ['orcs', 'undead', 'beasts'], eidolons: eid }));
    localStorage.setItem('lotf-tips-off', '1');
    localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false, speed: 1, quips: false, ...(short ? { eidolonFull: false } : {}), ...(saver ? { saver: true } : {}) }));
  }, [PARTY, xpAt(40), { horn: 1000, bound: [pick], chosen: pick, confirmed: true, ...(SHORT ? { seen: [pick] } : {}) }, SAVER, SHORT]);
  await page.goto(`http://localhost:${PORT}/`, { timeout: 240000 });
  await page.waitForFunction(() => !!window.__game?.home, null, { timeout: 240000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => document.getElementById('tipSkip')?.click());
  await page.mouse.click(196, 300);
  const gotIt = async () => { for (let i = 0; i < 10; i++) { const had = await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /^Got it/.test(x.textContent ?? '') && x.offsetParent); b?.click(); return !!b; }); if (!had) break; await page.waitForTimeout(450); } };
  await page.evaluate(([party]) => {
    const g = window.__game;
    const r = JSON.parse(JSON.stringify(g.run));
    Object.assign(r, { seed: 4242, mode: { kind: 'army', army: 'orcs' }, stage: 15, over: false, cleared: false, gold: 0, event: undefined, roster: party.map((kind, i) => ({ id: 100 + i, kind, grade: 1, paid: 30 })), squad: [], nextId: 200 });
    g.home.go(() => {}); // (the home page left as the game leaves it: its painted scenes stopped)
    g.startRun(r);
    g.autoArrange(true);
  }, [PARTY]);
  // (three seconds of placing the heroes, as a player takes at the least: what is made ready ahead is made ready here)
  await page.waitForTimeout(900);
  await gotIt();
  await page.waitForTimeout(2100);
  await page.evaluate(() => document.getElementById('fight').click());
  await page.waitForTimeout(600);
  await gotIt();
  // (both sides outlast the measure: the wave must not end under the call)
  await page.evaluate(() => { for (const u of window.__game.b.units) { u.maxHp *= 50; u.hp = u.maxHp; } });
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
  const now = () => page.evaluate(() => performance.now());
  const between = (a, b) => page.evaluate(([a, b]) => ({ frames: window.__sm.frames.filter((f) => f.at > a && f.at <= b).map((f) => f.ms), tasks: window.__sm.tasks.filter((t) => t.at >= a && t.at <= b).map((t) => Math.round(t.ms)),
    gl: (() => { const g = window.__sm.gl.filter((x) => x.at > a && x.at <= b); const n = (k) => g.filter((x) => x.k === k).length; const fr = Math.max(1, window.__sm.frames.filter((f) => f.at > a && f.at <= b).length);
      return { draws: Math.round(n('draw') / fr), stencil: Math.round(n('stencil') / fr), targets: Math.round(n('target') / fr), uploads: g.filter((x) => x.k === 'upload').map((x) => `${x.what}:${Math.round(x.ms)}ms@${Math.round(x.at - a)}`) }; })(),
    gaps: window.__sm.frames.filter((f) => f.at > a && f.at <= b && f.ms > 80).map((f) => `${Math.round(f.ms)}@${Math.round(f.at - f.ms - a)}`), big: window.__sm.tasks.filter((t) => t.at >= a && t.at <= b && t.ms > 80).map((t) => `${Math.round(t.ms)}@${Math.round(t.at - a)}`) }), [a, b]);
  // (the fight alone, four seconds: what the board costs at this throttle without a call)
  await page.waitForTimeout(1500);
  const f0 = await now();
  await page.waitForTimeout(4000);
  const f1 = await now();
  const fight = await between(f0, f1);
  let events = [];
  if (TRACE) {
    cdp.on('Tracing.dataCollected', (d) => events.push(...d.value));
    await cdp.send('Tracing.start', { transferMode: 'ReportEvents', traceConfig: { includedCategories: ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'v8.execute', 'loading', 'cc', 'gpu', 'disabled-by-default-devtools.timeline.invalidationTracking'] } });
  }
  if (PROFILE) { await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 1000 }); await cdp.send('Profiler.start'); }
  const t0 = await now();
  const blown = await page.evaluate(() => { const b = document.querySelector('.ehFight'); b?.click(); return !!b; });
  // (until the call is over: its layer gone from the page; twelve seconds at most; then a second of the fight after it)
  await page.waitForTimeout(1200);
  // (PROBE=<selector>: how solid the first such element of the call is, with the call's stage, every tenth of a second)
  const probe = [];
  for (let i = 0; i < 110; i++) {
    if (!(await page.evaluate(() => !!document.querySelector('.ecLayer, .ecBoard, .ecPass')))) break;
    if (process.env.PROBE) probe.push(await page.evaluate((sel) => { const e = document.querySelector(sel); return `${document.querySelector('.ecLayer')?.dataset.stage}:${e ? Number(getComputedStyle(e).opacity).toFixed(2) : '-'}`; }, process.env.PROBE));
    await page.waitForTimeout(100);
  }
  if (probe.length) console.log('  probe ' + probe.join(' '));
  const over = await now();
  await page.waitForTimeout(1000);
  const t1 = await now();
  const call = await between(t0, t1);
  const out = { pick, blown, dom: await page.evaluate(() => window.__sm.dom), glFight: fight.gl, glCall: call.gl, callMs: Math.round(over - t0), fight: stat(fight.frames, fight.tasks), call: stat(call.frames, call.tasks), gaps: call.gaps, tasks: call.big, errors };
  if (PROFILE) {
    const { profile } = await cdp.send('Profiler.stop');
    const byId = new Map(profile.nodes.map((x) => [x.id, x]));
    const self = new Map(), under = new Map(), parent = new Map();
    for (const x of profile.nodes) for (const c of x.children ?? []) parent.set(c, x.id);
    profile.samples.forEach((id, i) => { const dt = (profile.timeDeltas[i] ?? 0) / 1000; const f = byId.get(id).callFrame; const nm = f.functionName || '(anonymous)'; if (nm === '(idle)') return; const k = `${nm}${f.url ? ` ${f.url.split('/').pop()}:${f.lineNumber + 1}` : ''}`; self.set(k, (self.get(k) ?? 0) + dt);
      const seen = new Set(); for (let at = id; at !== undefined; at = parent.get(at)) { const g = byId.get(at).callFrame; if (g.functionName && g.url && !seen.has(g.functionName)) { seen.add(g.functionName); under.set(g.functionName, (under.get(g.functionName) ?? 0) + dt); } } });
    // (WHO=<a function's name>: who calls it, by the time under each chain of six callers)
    if (process.env.WHO) { const who = new Map(); profile.samples.forEach((id, i) => { const dt = (profile.timeDeltas[i] ?? 0) / 1000; const chain = []; for (let at = id; at !== undefined; at = parent.get(at)) chain.push(byId.get(at).callFrame.functionName || '(anon)'); const j = chain.indexOf(process.env.WHO); if (j < 0) return; const k = chain.slice(j, j + 7).join(' < '); who.set(k, (who.get(k) ?? 0) + dt); });
      out.who = [...who].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `${Math.round(v)} ms ${k}`); }
    out.hot = [...self].sort((a, b) => b[1] - a[1]).slice(0, 16).map(([k, v]) => `${Math.round(v)} ms ${k}`);
    out.under = [...under].sort((a, b) => b[1] - a[1]).slice(0, 30).map(([k, v]) => `${Math.round(v)} ${k}`).join(' | ');
  }
  if (TRACE) {
    const done = new Promise((r) => cdp.once('Tracing.tracingComplete', r));
    await cdp.send('Tracing.end');
    await done;
    const xs = events.filter((e) => e.ph === 'X' && e.dur);
    const tname = new Map(events.filter((e) => e.ph === 'M' && e.name === 'thread_name').map((e) => [`${e.pid}:${e.tid}`, e.args?.name]));
    const sums = new Map();
    for (const e of xs) { const k = `${e.name}@${tname.get(`${e.pid}:${e.tid}`) ?? '?'}`; sums.set(k, (sums.get(k) ?? 0) + e.dur / 1000); }
    out.sums = [...sums].filter(([k]) => !/RunTask|ThreadPool|SequenceManager|Closure|mojo|MessageLoop|TaskGraph|WorkerThread/.test(k)).sort((a, b) => b[1] - a[1]).slice(0, 34).map(([k, v]) => `${Math.round(v)} ${k}`).join(' | ');
    // (the style passes: how many, how long, how many elements each; and what called for them)
    const st = xs.filter((e) => e.name === 'UpdateLayoutTree');
    out.style = `${st.length} passes, ${Math.round(st.reduce((a, e) => a + e.dur, 0) / 1000)} ms, ${Math.round(st.reduce((a, e) => a + (e.args?.elementCount ?? 0), 0) / Math.max(1, st.length))} elements a pass; the longest ` + [...st].sort((a, b) => b.dur - a.dur).slice(0, 8).map((e) => `${Math.round(e.dur / 1000)}ms/${e.args?.elementCount ?? '?'}el`).join(' ');
    const why = new Map();
    for (const e of events) if (/StyleRecalcInvalidationTracking|StyleInvalidatorInvalidationTracking|ScheduleStyleInvalidationTracking/.test(e.name)) { const d = e.args?.data ?? {}; const k = `${e.name.replace('InvalidationTracking', '')}:${d.reason ?? ''}:${d.extraData ?? ''}:${d.invalidationSet ? 'set' : ''}:${d.changedClass ?? d.changedAttribute ?? d.changedId ?? d.changedPseudo ?? ''}:${d.selectorPart ?? ''}:${(d.nodeName ?? '').slice(0, 40)}`; why.set(k, (why.get(k) ?? 0) + 1); }
    out.why = [...why].sort((a, b) => b[1] - a[1]).slice(0, 26).map(([k, v]) => `${v} ${k}`).join(' | ');
    out.longest = xs.filter((e) => e.dur > 60000 && !/RunTask|ThreadPool|SequenceManager|Closure|mojo|Scheduler|MessageLoop|ProxyMain|ProxyImpl|TaskGraph|WorkerThread/.test(e.name)).sort((a, b) => b.dur - a.dur).slice(0, 16).map((e) => `${Math.round(e.dur / 1000)}ms ${e.name}@${tname.get(`${e.pid}:${e.tid}`) ?? '?'} ${JSON.stringify(e.args ?? {}).slice(0, 110)}`).join(' | ');
  }
  await ctx.close();
  return out;
}

for (let r = 0; r < RUNS; r++) for (const pick of PICKS) {
  const t = await take(pick);
  console.log(`${pick}${t.blown ? '' : ' (THE HORN WAS NOT BLOWN)'} call ${t.callMs} ms`);
  console.log('  fight ' + JSON.stringify(t.fight));
  console.log('  call  ' + JSON.stringify(t.call));
  console.log(`  canvas a frame, fight: ${t.glFight.draws} draws, ${t.glFight.stencil} mask steps, ${t.glFight.targets} targets; call: ${t.glCall.draws} draws, ${t.glCall.stencil} mask steps, ${t.glCall.targets} targets`);
  console.log(`  the call's pieces on the page at their most: ${t.dom.most} (${t.dom.filtered} with a filter): ${t.dom.kinds}`);
  console.log(`  pictures handed to the graphics card in the call: ${t.glCall.uploads.join(' ')}`);
  console.log(`  frame gaps over 80 ms (ms@when from the horn): ${t.gaps.join(' ')}`);
  console.log(`  tasks over 80 ms: ${t.tasks.join(' ')}`);
  for (const h of t.hot ?? []) console.log('    ' + h);
  for (const h of t.who ?? []) console.log('    who: ' + h);
  if (t.under) console.log('    under: ' + t.under);
  if (t.sums) console.log('    sums: ' + t.sums);
  if (t.style) console.log('    style: ' + t.style);
  if (t.why) console.log('    why: ' + t.why);
  if (t.longest) console.log('    longest: ' + t.longest);
  if (t.errors.length) console.log('  errors', t.errors);
}
await browser.close();
srv.close();
