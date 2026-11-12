// WAVE-DELAY (docs/notes/wave-delay.md): the page's main thread on a real clock, CPU throttled as a phone's is, with a CPU profile
// taken across each moment the owner named: the start of a wave, the fight, the end of a wave and the next board being built. The
// owner: stops of 2 to 6 s with Auto on, "usually the start of a wave, the end of a wave, and sometimes just on regular skill use".
//
//   node build.mjs --plain --out out/web-plain && ROOT=out/web-plain node tools/wave-delay/profile.mjs [--cpu 6] [--waves 4] [--hand]
//
// For each window it prints: every task over 200 ms (the browser's own long-task timing), the JS heap, and the functions with the most
// time of their own in the profile (the plain build keeps their names). Times are at the throttled speed.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
const { chromium } = createRequire(existsSync('/opt/node-tools/node_modules/playwright') ? '/opt/node-tools/node_modules/' : import.meta.url)('playwright');

const args = process.argv.slice(2);
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const PORT = Number(process.env.PORT ?? 8723);
const OUT = process.env.OUT ?? 'out/wave-delay';
const root = process.env.ROOT ?? 'out/web';
const CPU = Number(opt('--cpu', '6'));
const WAVES = Number(opt('--waves', '4'));
const HAND = args.includes('--hand');
const LONG = 200;
mkdirSync(OUT, { recursive: true });

const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', webp: 'image/webp', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', ogg: 'audio/ogg', opus: 'audio/ogg', css: 'text/css' };
const srv = createServer((q, r) => {
  const p = `${root}/` + (q.url.split('?')[0].slice(1) || 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(PORT);
const PINNED = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch({ ...(existsSync(PINNED) ? { executablePath: PINNED } : {}), args: ['--autoplay-policy=no-user-gesture-required', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-precise-memory-info'] });
const OWNED = ['knight', 'cleric', 'wizard', 'archer', 'samurai', 'paladin', 'kraken', 'lancer', 'reaper', 'druid'];
const xpAt = (level) => Math.round(30 * (level - 1) * level * (level > 20 ? 4 : 1));

const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(String(e.message)));
await page.addInitScript(() => {
  const w = (window.__lt = { tasks: [], marks: [] });
  try {
    new PerformanceObserver((l) => { for (const e of l.getEntries()) w.tasks.push({ at: Math.round(e.startTime), ms: Math.round(e.duration) }); }).observe({ entryTypes: ['longtask'] });
  } catch { /* (no long-task timing) */ }
});
await page.addInitScript(([owned, xp, auto]) => {
  if (sessionStorage.getItem('pf-set')) return;
  sessionStorage.setItem('pf-set', '1');
  localStorage.clear();
  localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 99999, unlocked: owned, party: owned.slice(0, 5), pulls: 0, dry: 0, dryMythic: 0, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, chapel: true, shards: {}, stars: {}, xp: Object.fromEntries(owned.map((k) => [k, xp])), bestStage: 30, tower: 9, daily: {}, bosses: [], achievements: [], armies: {}, armySeen: [], stash: [], opened: ['undead', 'beasts', 'wildwood'], ultAuto: auto, spellAuto: auto, ultSeen: Object.fromEntries(owned.map((k) => [k, 1])) }));
  localStorage.setItem('lotf-tips-off', '1');
  localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false, speed: 2, quips: false }));
}, [OWNED, xpAt(32), !HAND]);
const cdp = await ctx.newCDPSession(page);
const t00 = Date.now();
await page.goto(`http://localhost:${PORT}/`, { timeout: 600000 });
await page.waitForFunction(() => !!window.__game?.home, null, { timeout: 600000 });
console.log(`the page was up ${((Date.now() - t00) / 1000).toFixed(1)} s after it was asked for (no throttle)`);
await page.waitForTimeout(2000);
await page.evaluate(() => document.getElementById('tipSkip')?.click());
await page.mouse.click(4, 4);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
await cdp.send('Profiler.enable');
await cdp.send('Profiler.setSamplingInterval', { interval: 2000 });

const heap = () => page.evaluate(() => Math.round((performance.memory?.usedJSHeapSize ?? 0) / 1e6));
/** The functions with the most time of their own in a profile, and how much of it was not idle. */
function tops(profile, n = 12) {
  const self = new Map();
  const byId = new Map(profile.nodes.map((x) => [x.id, x]));
  const dts = profile.timeDeltas ?? [];
  let busy = 0;
  profile.samples.forEach((id, i) => {
    const node = byId.get(id);
    const f = node.callFrame;
    const dt = (dts[i] ?? 0) / 1000;
    const name = f.functionName || '(anonymous)';
    if (name === '(idle)') return;
    busy += dt;
    const key = `${name}${f.url ? ` ${f.url.split('/').pop()}:${f.lineNumber + 1}` : ''}`;
    self.set(key, (self.get(key) ?? 0) + dt);
  });
  // (who asked for the costly built-ins, and the page's own functions by the time spent in them and under them)
  const parent = new Map();
  for (const x of profile.nodes) for (const c of x.children ?? []) parent.set(c, x.id);
  const nameOf = (id) => byId.get(id).callFrame.functionName || '(anonymous)';
  const HOT = new Set(['drawImage', 'texImage2D', 'texSubImage2D', 'getContext', 'save', 'getBoundingClientRect', 'viewW', 'viewH', 'colLeft', 'querySelectorAll', 'querySelector', 'getImageData', 'putImageData', 'toDataURL', 'decode', 'createImageBitmap', 'fillRect', 'fill', 'stroke', 'offsetWidth', 'offsetHeight', 'clientWidth', 'clientHeight', 'measureText', 'fillText']);
  const callers = new Map();
  const under = new Map();
  profile.samples.forEach((id, i) => {
    const dt = (dts[i] ?? 0) / 1000;
    const leaf = nameOf(id);
    if (leaf === '(idle)') return;
    const chain = [];
    const seen = new Set();
    for (let at = parent.get(id); at !== undefined; at = parent.get(at)) {
      const nm = nameOf(at);
      if (nm === '(root)') break;
      if (chain.length < 4 && nm !== '(anonymous)') chain.push(nm);
      if (!seen.has(nm) && byId.get(at).callFrame.url) { seen.add(nm); under.set(nm, (under.get(nm) ?? 0) + dt); }
    }
    if (HOT.has(leaf)) { const k = `${leaf} < ${chain.join(' < ')}`; callers.set(k, (callers.get(k) ?? 0) + dt); }
  });
  const fmt = (m, n) => [...m].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => `${String(Math.round(v)).padStart(6)} ms  ${k}`);
  return { callers: fmt(callers, 14), under: fmt(under, 22), busy: Math.round(busy), list: [...self].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => `${String(Math.round(v)).padStart(6)} ms  ${k}`) };
}
const rows = [];
/** Profile a window: `act` begins it, `until` says when it is over (asked every 250 ms, `most` ms at most). */
async function windowOf(name, act, until, most) {
  const h0 = await heap();
  const t0 = await page.evaluate(() => performance.now());
  await cdp.send('Profiler.start');
  await act();
  const began = Date.now();
  while (Date.now() - began < most && !(await until())) await page.waitForTimeout(250);
  const { profile } = await cdp.send('Profiler.stop');
  const t1 = await page.evaluate(() => performance.now());
  const tasks = await page.evaluate(([a, b]) => window.__lt.tasks.filter((t) => t.at >= a && t.at <= b), [t0, t1]);
  const long = tasks.filter((t) => t.ms >= LONG).map((t) => t.ms).sort((a, b) => b - a);
  const top = tops(profile);
  const h1 = await heap();
  rows.push({ name, ms: Math.round(t1 - t0), long, busy: top.busy, heap: [h0, h1] });
  console.log(`\n== ${name}: ${Math.round(t1 - t0)} ms; tasks of ${LONG} ms or more: ${long.length ? long.join(', ') + ' ms' : 'none'}; script busy ${top.busy} ms; heap ${h0} -> ${h1} MB`);
  for (const l of top.list) console.log(`   ${l}`);
  console.log('   -- who asked for the costly built-ins:');
  for (const l of top.callers) console.log(`   ${l}`);
  console.log('   -- the page\'s functions, by the time in them and under them:');
  for (const l of top.under) console.log(`   ${l}`);
}

await page.evaluate((party) => {
  const g = window.__game;
  const r = JSON.parse(JSON.stringify(g.run));
  Object.assign(r, { seed: 4242, mode: { kind: 'army', army: 'wildwood' }, stage: 6, over: false, cleared: false, gold: 0, event: undefined, roster: party.map((kind, i) => ({ id: 100 + i, kind, grade: 1, paid: 30 })), squad: [], nextId: 200 });
  document.getElementById('home').hidden = true;
  g.startRun(r);
}, OWNED.slice(0, 5));
await page.waitForTimeout(3000);
const phase = () => page.evaluate(() => window.__game.b.phase);
for (let wave = 1; wave <= WAVES; wave++) {
  await page.evaluate(() => window.__game.autoArrange(true));
  await page.waitForTimeout(1500);
  await windowOf(`wave ${wave}: the start (Fight pressed, the first 5 s)`, () => page.evaluate(() => { document.getElementById('bossCard')?.click(); document.getElementById('fight').click(); window.__game.speed = 2; }), async () => false, 5000);
  await windowOf(`wave ${wave}: the fight`, async () => {}, async () => {
    return page.evaluate((hand) => {
      const g = window.__game;
      const b = g.b;
      document.getElementById('bossCard')?.click();
      if (hand && b.phase === 'fight') for (const u of b.units.filter((x) => x.alive && x.side === 'hero' && x.owner === undefined && (x.charge2 ?? 0) >= 100)) document.querySelector(`.fhRow[data-unit="${u.id}"]`)?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      return b.phase !== 'fight';
    }, HAND);
  }, 240000);
  if ((await phase()) === 'fight') break;
  await page.evaluate(() => { window.__endB = window.__game.b; });
  await windowOf(`wave ${wave}: the end (to the result shown)`, async () => {}, () => page.evaluate(() => !document.getElementById('result').hidden), 20000);
  await windowOf(`wave ${wave}: on to the next wave (the result tapped, the next board built)`, async () => {}, () => page.evaluate(() => {
    const g = window.__game;
    const vis = (el) => !!el && !el.hidden && el.offsetParent !== null;
    if (g.b !== window.__endB && g.b.phase === 'deploy') return true;
    for (const el of document.querySelectorAll('.rvRow button:last-child')) el.click();
    const r = document.getElementById('result');
    if (vis(r)) { r.dispatchEvent(new MouseEvent('click', { bubbles: true })); const next = document.getElementById('next'); if (vis(next) && !g.passing) next.click(); }
    return false;
  }), 60000);
  if ((await page.evaluate(() => window.__game.b === window.__endB))) break;
  await windowOf(`wave ${wave + 1}: the deploy's first 4 s`, async () => {}, async () => false, 4000);
}
writeFileSync(`${OUT}/profile.json`, JSON.stringify(rows, null, 1));
console.log(`\npage errors: ${errs.length}`);
await browser.close();
srv.close();
