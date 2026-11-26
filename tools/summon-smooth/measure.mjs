// SUMMON-SMOOTH (docs/notes/summon-smooth.md): what the summoning's show costs on a slow phone. The page's CPU is throttled (4 times by
// default, close to a mid-range Android), the sanctum opened, and two draws made in the real page: a ten-stone draw with "Reveal all"
// pressed and its new heroes' reveals played through, and a single stone that brings a hero in. Through each, every frame's time (the gap
// between two animation frames) and every long task (the browser's own timing) are kept, in two windows: the cards (from the draw to
// the last card turned) and the reveals (from there until the screen is free).
//
//   npm run web && node tools/summon-smooth/measure.mjs [--cpu 4] [--starfall] [--profile] [--runs 3]
//   ROOT=<another build's folder> to measure an older build beside this one. `--profile` (with `node build.mjs --plain`) names the
//   functions with the most time of their own in each take.
//
// It prints, for each window: frames, the worst, the 95th percentile, how many were over 33 ms, the long tasks (50 ms and over) with how
// many were over 100 ms, and for the ten-draw how long "Reveal all" took to turn every card.
import { serve, HEROES, saveScript } from '../audit/lib.mjs';
import { createRequire } from 'node:module';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const args = process.argv.slice(2);
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const CPU = Number(opt('--cpu', 4));
const RUNS = Number(opt('--runs', 1));
const STARFALL = args.includes('--starfall');
const PROFILE = args.includes('--profile');
// (--trace: the browser's own timeline through the ten-draw: main-thread time by kind of work (layout, style, paint, image decode,
// script) and the longest single events with what they were)
const TRACE = args.includes('--trace');
const port = Number(process.env.PORT ?? 8271);
const srv = serve(process.env.ROOT ?? 'out/web', port);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const W = 393, H = 852;
const OWNED = HEROES.slice(0, 8);
const unlock = { kitsune: 200, werewolf: 200, gorgon: 200, lancer: 200, mercenary: 200, samuraiCommander: 200, karasu: 2, yamabushi: 3, minotaur: 1 };

const stat = (name, frames, tasks) => {
  const s = [...frames].sort((a, b) => a - b);
  const p95 = s.length ? s[Math.min(s.length - 1, Math.floor(s.length * 0.95))] : 0;
  return { window: name, frames: s.length, worst: Math.round(s[s.length - 1] ?? 0), p95: Math.round(p95), over33: s.filter((x) => x > 33.4).length, over50: s.filter((x) => x > 50).length,
    longTasks: tasks.length, over100: tasks.filter((t) => t >= 100).length, longest: Math.max(0, ...tasks) };
};

async function take(run) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, hasTouch: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(saveScript(), [OWNED, { stones: 120, heroesSeen: OWNED, unlock, shards: { knight: 3, samurai: 1 } }]);
  if (STARFALL) await page.addInitScript(() => {
    localStorage.setItem('legends.purchases', JSON.stringify({ entitlements: ['starfall_summons'] }));
    localStorage.setItem('legends.settings', JSON.stringify({ ...JSON.parse(localStorage.getItem('legends.settings') ?? '{}'), starfall: true }));
  });
  await page.addInitScript(() => {
    const m = (window.__sm = { frames: [], tasks: [], on: false });
    try { new PerformanceObserver((l) => { for (const e of l.getEntries()) m.tasks.push({ at: e.startTime, ms: e.duration }); }).observe({ entryTypes: ['longtask'] }); } catch { /* none */ }
    let last = 0;
    const tick = (now) => { if (last) m.frames.push({ at: now, ms: now - last }); last = now; requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  });
  await page.goto(`http://localhost:${port}/`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => [...document.querySelectorAll('.hmTab')].some((b) => b.offsetWidth), {}, { timeout: 90000 });
  await page.waitForTimeout(800);
  await page.evaluate(() => document.getElementById('tipSkip')?.click());
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
  await page.evaluate(() => { for (const b of document.querySelectorAll('.hmTab')) if (b.textContent.includes('Recruit')) b.click(); });
  await page.waitForFunction(() => window.__summonFx?.stats.ready, {}, { timeout: 90000 }).catch(() => {});
  // (STYLE=<css>: a rule laid over the page's own, to try what a change of look would save before making it)
  if (process.env.STYLE) await page.addStyleTag({ content: process.env.STYLE });
  // (a first tap, as a player has made long before a draw: the sound starts on it, which is not the summoning's cost)
  await page.mouse.click(196, 300);
  await page.waitForTimeout(1500);
  // (a tutorial's card holds the page until "Got it" is pressed)
  for (let i = 0; i < 10; i++) {
    const had = await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /^Got it/.test(x.textContent ?? '') && x.offsetParent); b?.click(); return !!b; });
    if (!had) break;
    await page.waitForTimeout(600);
  }
  await page.waitForTimeout(1500);
  const worn = await page.evaluate(() => !!document.querySelector('.tarotCard.back.starfall') || undefined);
  if (PROFILE) { await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 1000 }); }

  const now = () => page.evaluate(() => performance.now());
  const settled = () => page.evaluate(() => { const t = document.getElementById('resultSummary').textContent; return !document.querySelector('.tarotReveal') && !!t && !/…$|turned|wait/.test(t); });
  const allUp = () => page.evaluate(() => { const c = [...document.querySelectorAll('#reveal .tarotResult:not(.joined)')]; return (c.length > 0 && c.every((x) => x.classList.contains('up'))) || !!document.querySelector('.tarotReveal'); });
  const between = (a, b) => page.evaluate(([a, b]) => ({ frames: window.__sm.frames.filter((f) => f.at > a && f.at <= b).map((f) => f.ms), tasks: window.__sm.tasks.filter((t) => t.at >= a && t.at <= b).map((t) => Math.round(t.ms)) }), [a, b]);

  async function draw(name, start, revealAll) {
    if (PROFILE) await cdp.send('Profiler.start');
    const t0 = await now();
    await start();
    let pressed = 0, turned = 0;
    if (revealAll) {
      // ("Reveal all" as soon as it is offered)
      for (let i = 0; i < 100 && !pressed; i++) {
        pressed = await page.evaluate(() => { const b = document.getElementById('revealAll'); const t = performance.now(); if (b && !b.hidden && document.querySelector('#reveal .tarotResult')) { b.click(); return t; } return 0; });
        if (!pressed) await page.waitForTimeout(30);
      }
    }
    for (let i = 0; i < 400 && !(await allUp()); i++) await page.waitForTimeout(50);
    turned = await now();
    const began = Date.now();
    let held = 0;
    while (Date.now() - began < 90000 && !(await settled())) {
      // (a hero held in full view is tapped on after a second and a half, as a player reading it would)
      const stage = await page.evaluate(() => document.querySelector('.tarotReveal')?.dataset.stage);
      if (stage === '4') { held ||= Date.now(); if (Date.now() - held > 1500) { held = 0; await page.mouse.click(W / 2, H / 2); } } else held = 0;
      await page.waitForTimeout(120);
    }
    await page.waitForTimeout(500);
    const t1 = await now();
    const cards = await between(t0, turned + 700);
    const reveals = await between(turned + 700, t1);
    const when = await page.evaluate(([a, b]) => ({ gaps: window.__sm.frames.filter((f) => f.at > a && f.at <= b && f.ms > 100).map((f) => `${Math.round(f.ms)}@${Math.round(f.at - f.ms - a)}`), tasks: window.__sm.tasks.filter((t) => t.at >= a && t.at <= b && t.ms > 90).map((t) => `${Math.round(t.ms)}@${Math.round(t.at - a)}`) }), [t0, t1]);
    console.log(`  ${name}: frame gaps over 100 ms (ms@when from the draw): ${when.gaps.join(' ')}; tasks over 90: ${when.tasks.join(' ')}; cards all turned at ${Math.round(turned - t0)}`);
    const out = { take: name, revealAllMs: pressed ? Math.round(turned - pressed) : undefined, cards: stat('cards', cards.frames, cards.tasks), reveals: stat('reveals', reveals.frames, reveals.tasks), tasks: [...cards.tasks, ...reveals.tasks].sort((a, b) => b - a).slice(0, 8) };
    if (PROFILE) {
      const { profile } = await cdp.send('Profiler.stop');
      const byId = new Map(profile.nodes.map((x) => [x.id, x]));
      const self = new Map();
      profile.samples.forEach((id, i) => { const f = byId.get(id).callFrame; const nm = f.functionName || '(anonymous)'; if (nm === '(idle)') return; const k = `${nm}${f.url ? ` ${f.url.split('/').pop()}:${f.lineNumber + 1}` : ''}`; self.set(k, (self.get(k) ?? 0) + (profile.timeDeltas[i] ?? 0) / 1000); });
      out.hot = [...self].sort((a, b) => b[1] - a[1]).slice(0, 14).map(([k, v]) => `${Math.round(v)} ms ${k}`);
      // (and the page's own functions by the time in them and under them)
      const parent = new Map();
      for (const x of profile.nodes) for (const c of x.children ?? []) parent.set(c, x.id);
      const under = new Map();
      profile.samples.forEach((id, i) => { const dt = (profile.timeDeltas[i] ?? 0) / 1000; if ((byId.get(id).callFrame.functionName || '') === '(idle)') return; const seen = new Set(); for (let at = id; at !== undefined; at = parent.get(at)) { const f = byId.get(at).callFrame; const nm = f.functionName; if (nm && f.url && !seen.has(nm)) { seen.add(nm); under.set(nm, (under.get(nm) ?? 0) + dt); } } });
      out.hot.push('-- under:', ...[...under].sort((a, b) => b[1] - a[1]).slice(0, 26).map(([k, v]) => `${Math.round(v)} ms ${k}`));
    }
    return out;
  }

  let events = [];
  if (TRACE) {
    cdp.on('Tracing.dataCollected', (d) => events.push(...d.value));
    await cdp.send('Tracing.start', { transferMode: 'ReportEvents', traceConfig: { includedCategories: ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'v8.execute', 'loading', 'cc', 'gpu', 'disabled-by-default-devtools.timeline.invalidationTracking'] } });
  }
  const ten = await draw('ten', () => page.locator('.hlBar button').last().click(), true);
  if (TRACE) {
    const done = new Promise((r) => cdp.once('Tracing.tracingComplete', r));
    await cdp.send('Tracing.end');
    await done;
    const xs = events.filter((e) => e.ph === 'X' && e.dur);
    // (the renderer's main thread: the one that ran the most FunctionCall time)
    const byTid = new Map();
    for (const e of xs) if (e.name === 'FunctionCall' || e.name === 'UpdateLayoutTree' || e.name === 'Layout') byTid.set(`${e.pid}:${e.tid}`, (byTid.get(`${e.pid}:${e.tid}`) ?? 0) + e.dur);
    const main = [...byTid].sort((a, b) => b[1] - a[1])[0]?.[0];
    const mine = xs.filter((e) => `${e.pid}:${e.tid}` === main);
    const NAMES = ['Layout', 'UpdateLayoutTree', 'RecalculateStyles', 'Paint', 'PrePaint', 'Layerize', 'Commit', 'UpdateLayerTree', 'Decode Image', 'ImageDecodeTask', 'Draw LazyPixelRef', 'FunctionCall', 'EvaluateScript', 'TimerFire', 'FireAnimationFrame', 'EventDispatch', 'MinorGC', 'MajorGC', 'ParseHTML', 'ParseAuthorStyleSheet', 'HitTest', 'ScheduleStyleRecalculation', 'RasterTask', 'GPUTask', 'CompositeLayers', 'IntersectionObserverController::computeIntersections', 'v8.compile', 'XHRLoad', 'ResourceReceivedData'];
    const tot = new Map();
    for (const e of xs) if (NAMES.includes(e.name) && (`${e.pid}:${e.tid}` === main || ['RasterTask', 'GPUTask', 'ImageDecodeTask', 'Decode Image'].includes(e.name))) tot.set(e.name, (tot.get(e.name) ?? 0) + e.dur / 1000);
    ten.trace = [...tot].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${Math.round(v)} ms ${k}`);
    ten.trace.push('decodes: ' + xs.filter((e) => e.name === 'Decode Image' || e.name === 'Draw LazyPixelRef' || e.name === 'ImageDecodeTask').sort((a, b) => b.dur - a.dur).slice(0, 8).map((e) => `${Math.round(e.dur / 1000)}ms ${JSON.stringify(e.args).slice(0, 90)}`).join(' | '));
    // (the gaps between frames over 300 ms, and what the main thread was at through each)
    const fr = await page.evaluate(() => window.__sm.frames.filter((f) => f.ms > 300).map((f) => [f.at - f.ms, f.at]));
    const t0us = Math.min(...mine.map((e) => e.ts)); const nav = await page.evaluate(() => performance.timeOrigin);
    ten.gaps = fr.map(([a, b]) => `${Math.round(b - a)} ms gap at ${Math.round(a)}`);
    // (the longest single pieces of work on any thread, with the thread's name: what a frame waits on off the main thread)
    const tname = new Map(events.filter((e) => e.ph === 'M' && e.name === 'thread_name').map((e) => [`${e.pid}:${e.tid}`, e.args?.name]));
    ten.trace.push('all threads: ' + xs.filter((e) => e.dur > 150000 && !/RunTask|ThreadPool|SequenceManager|Closure|mojo|Scheduler|MessageLoop|ProxyMain|ProxyImpl|TaskGraph|WorkerThread/.test(e.name)).sort((a, b) => b.dur - a.dur).slice(0, 14).map((e) => `${Math.round(e.dur / 1000)}ms ${e.name}@${tname.get(`${e.pid}:${e.tid}`) ?? '?'} ${JSON.stringify(e.args ?? {}).slice(0, 70)}`).join(' | '));
    const sums = new Map();
    for (const e of xs) { const k = `${e.name}@${tname.get(`${e.pid}:${e.tid}`) ?? '?'}`; sums.set(k, (sums.get(k) ?? 0) + e.dur / 1000); }
    ten.trace.push('sums: ' + [...sums].sort((a, b) => b[1] - a[1]).slice(0, 40).map(([k, v]) => `${Math.round(v)} ${k}`).join(' | '));
    // (what was restyled, and why: the longest style passes with how many elements each touched, and the commonest reasons)
    ten.trace.push('style: ' + xs.filter((e) => e.name === 'UpdateLayoutTree').sort((a, b) => b.dur - a.dur).slice(0, 8).map((e) => `${Math.round(e.dur / 1000)}ms/${e.args?.elementCount ?? '?'}el`).join(' '));
    const why = new Map();
    for (const e of events) if (/StyleRecalcInvalidationTracking|StyleInvalidatorInvalidationTracking|ScheduleStyleInvalidationTracking/.test(e.name)) { const d = e.args?.data ?? {}; const k = `${e.name.replace('InvalidationTracking', '')}:${d.reason ?? ''}:${d.extraData ?? ''}:${d.invalidationSet ? 'set' : ''}:${d.changedClass ?? d.changedAttribute ?? d.changedId ?? d.changedPseudo ?? ''}:${d.selectorPart ?? ''}:${(d.nodeName ?? '').slice(0, 40)}`; why.set(k, (why.get(k) ?? 0) + 1); }
    ten.trace.push('why: ' + [...why].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, v]) => `${v}x ${k}`).join(' | '));
    ten.longest = mine.filter((e) => e.name !== 'RunTask' && e.name !== 'ThreadControllerImpl::RunTask' && !/^(ThreadPool|TaskGraph|SequenceManager|Receive mojo|Closure)/.test(e.name)).sort((a, b) => b.dur - a.dur).slice(0, 22).map((e) => `${Math.round(e.dur / 1000)} ms ${e.name} ${JSON.stringify(e.args?.data ?? e.args?.beginData ?? {}).slice(0, 150)}`);
  }
  await page.evaluate(() => document.getElementById('gachaClose').click());
  await page.waitForTimeout(1200);
  await page.evaluate(() => { window.__forceLucky = true; });
  const one = await draw('single', () => page.locator('.hlBar button').first().click(), false);
  await ctx.close();
  return { run, cpu: CPU, starfall: STARFALL, worn, ten, one, errors };
}

for (let r = 0; r < RUNS; r++) { const t = await take(r); for (const d of [t.ten, t.one]) { console.log(`${t.starfall ? 'starfall' : 'classic'} ${d.take}${d.revealAllMs !== undefined ? ` revealAll ${d.revealAllMs} ms` : ''}`); for (const w of [d.cards, d.reveals]) console.log('  ' + JSON.stringify(w)); console.log('  longest tasks: ' + d.tasks.join(', ')); for (const h of d.hot ?? []) console.log('    ' + h); for (const h of d.trace ?? []) console.log('    T ' + h); for (const h of d.longest ?? []) console.log('    L ' + h); for (const h of d.gaps ?? []) console.log('    G ' + h); } if (t.errors.length) console.log('errors', t.errors); }
await browser.close();
srv.close();
