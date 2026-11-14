// PLAY-SIZE (docs/notes/play-size.md): the same game built two ways, side by side: the pictures inside game.js as data URLs (before)
// and as files beside it (after). For each build:
//   - the start, at a phone-like throttle (`--cpu`, 4 by default) at 393x852: the time until the loading screen gives way to the camp
//     (the first frame of the game itself), the JS heap and the page's renderer process's memory (RSS) once it has settled;
//   - the screens (every home tab, the spellbook, the War Room, a deploy, a fight a few seconds in, with reduced motion) photographed and
//     compared pixel by pixel with the other build's; every picture on them loaded (no broken <img>, no failed request);
//   - offline: one online visit, the service worker's cache checked against its FILES, then the network cut and the page loaded
//     again, and the same screens toured with nothing failing.
//
//   npm run web && cp -r out/web <before>      (on the commit before)
//   node tools/play-size/compare.mjs --before <dir> --after out/web [--runs 3] [--cpu 4] [--shots out/play-size]
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync, writeFileSync, readdirSync } from 'node:fs';
const { chromium } = createRequire(existsSync('/opt/node-tools/node_modules/playwright') ? '/opt/node-tools/node_modules/' : import.meta.url)('playwright');

const args = process.argv.slice(2);
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const BUILDS = { before: opt('--before', ''), after: opt('--after', 'out/web') };
const RUNS = Number(opt('--runs', '3')); // (0: the screens and offline only)
const CPU = Number(opt('--cpu', '4'));
const SHOTS = opt('--shots', 'out/play-size');
if (!BUILDS.before) {
  console.error('node tools/play-size/compare.mjs --before <dir> --after out/web');
  process.exit(2);
}
mkdirSync(SHOTS, { recursive: true });

const TYPES = { html: 'text/html', js: 'text/javascript', png: 'image/png', webp: 'image/webp', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', opus: 'audio/ogg', map: 'application/json' };
const serve = (root) =>
  new Promise((ok) => {
    const srv = createServer((q, r) => {
      const p = `${root}/` + (decodeURIComponent(q.url.split('?')[0]).slice(1) || 'index.html');
      if (!existsSync(p)) {
        r.writeHead(404);
        return r.end();
      }
      r.writeHead(200, { 'content-type': TYPES[p.split('.').pop()] ?? 'application/octet-stream', 'cache-control': 'no-cache' });
      r.end(readFileSync(p));
    }).listen(0, () => ok(srv));
  });
const launch = () => chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required', '--js-flags=--expose-gc'] });

// (the audit's save: every hero, a built castle, the tips off)
const HEROES = ['knight', 'samurai', 'kunoichi', 'archer', 'wizard', 'peasant', 'ninjaMonk', 'wanderer', 'lightningMage', 'kitsune', 'karasu', 'yamabushi', 'werewolf', 'minotaur', 'satyr', 'gorgon', 'samuraiCommander', 'paladin', 'cleric', 'druid', 'barbarian', 'ranger', 'warlock', 'illusionist', 'gunslinger', 'shambler', 'rifleBot', 'mercenary', 'mummy', 'buccaneer', 'wolfBard', 'beastmaster', 'kraken', 'lancer', 'reaper', 'timeWitch', 'arcBlade', 'dreadPirate', 'siegeBot', 'priestess', 'dragoon', 'juggernaut', 'sage', 'demonSwordsman', 'tyrant'];
const save = (heroes) => {
  try {
    if (!localStorage.getItem('legends.meta'))
      localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 4000, unlocked: heroes, party: heroes.slice(0, 5), pulls: 0, dry: 0, dryMythic: 0, castle: { treasury: 5, barracks: 5, armoury: 5, mageTower: 4, stable: 5, library: 5 }, shards: {}, stars: {}, xp: {}, bestStage: 30, tower: 0, daily: {}, bosses: [], achievements: [], armies: {}, armySeen: [], opened: ['undead', 'beasts'] }));
    localStorage.setItem('lotf-tips-off', '1');
  } catch {}
  // (when the loading screen goes: the first frame of the game itself)
  new MutationObserver((_, mo) => {
    if (document.readyState !== 'loading' && !document.getElementById('loading') && window.__game) {
      window.__readyAt = performance.now();
      mo.disconnect();
    }
  }).observe(document, { childList: true, subtree: true });
};

// (the resident memory of every renderer process on the machine, from /proc: only one browser runs while it is read)
const rendererRss = () => {
  let kb = 0;
  for (const d of readdirSync('/proc').filter((d) => /^\d+$/.test(d))) {
    try {
      if (!readFileSync(`/proc/${d}/cmdline`, 'utf8').includes('--type=renderer')) continue;
      kb += Number(/VmRSS:\s+(\d+)/.exec(readFileSync(`/proc/${d}/status`, 'utf8'))?.[1] ?? 0);
    } catch {}
  }
  return kb * 1024;
};

const mb = (n) => (n / 1e6).toFixed(0);
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

async function startOnce(base) {
  const browser = await launch();
  const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1, hasTouch: true, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  await page.addInitScript(save, HEROES);
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Performance.enable');
  if (CPU > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
  await page.goto(base, { timeout: 300000 });
  await page.waitForFunction(() => window.__readyAt, null, { timeout: 300000, polling: 100 });
  const ready = await page.evaluate(() => window.__readyAt);
  await page.waitForTimeout(5000);
  await page.evaluate(() => window.gc?.());
  const m = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((x) => [x.name, x.value]));
  const rss = rendererRss();
  await browser.close();
  return { ready, heap: m.JSHeapUsedSize, heapTotal: m.JSHeapTotalSize, rss };
}

// (every screen of the tour, with what failed on it)
async function tour(page, label, shots) {
  const bad = async () =>
    page.evaluate(() =>
      [...document.images].filter((i) => i.getAttribute('src') && i.complete && !i.naturalWidth && i.getClientRects().length).map((i) => i.getAttribute('src').slice(0, 80)),
    );
  const broken = [];
  const snap = async (name) => {
    await page.waitForTimeout(2500);
    broken.push(...(await bad()).map((s) => `${name}: ${s}`));
    if (shots) await page.screenshot({ path: `${SHOTS}/${label}-${name}.png` });
  };
  for (const [i, n] of ['recruit', 'heroes', 'battle', 'castle'].entries()) {
    await page.locator('.hmTab').nth(i).click();
    await snap(n);
  }
  await page.locator('.hmTab').nth(4).click();
  await snap('spells');
  if (await page.locator('#sbClose').isVisible()) await page.locator('#sbClose').click();
  await page.evaluate(() => window.__game.home.openArmies());
  await snap('armies');
  await page.evaluate(() => {
    const g = window.__game;
    document.getElementById('home').hidden = true;
    g.run.squad = g.run.roster.slice(0, 5).map((h) => h.id);
    // (the same run's seed in both builds, so the deploy is the same board)
    g.run.seed = 4242;
    g.newBattle();
  });
  await snap('deploy');
  await page.evaluate(() => document.getElementById('fight')?.click());
  await snap('fight');
  return broken;
}

async function screens(name, base) {
  const browser = await launch();
  const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1, hasTouch: true, reducedMotion: 'reduce', serviceWorkers: 'block' });
  const page = await ctx.newPage();
  const errors = [];
  const failed = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('requestfailed', (r) => failed.push(`${r.url()} ${r.failure()?.errorText}`));
  page.on('response', (r) => r.status() >= 400 && failed.push(`${r.url()} ${r.status()}`));
  await page.addInitScript(save, HEROES);
  // (the same moment in both: Math.random seeded alike, so the page's own looks (stars, motes) are drawn the same)
  await page.addInitScript(() => {
    let s = 12345;
    Math.random = () => ((s = (Math.imul(s ^ (s >>> 15), 0x2c1b3c6d) + 0x6d2b79f5) | 0) >>> 0) / 4294967296;
  });
  await page.goto(base, { timeout: 300000 });
  await page.waitForFunction(() => window.__readyAt, null, { timeout: 300000 });
  const broken = await tour(page, name, true);
  await browser.close();
  return { errors, failed, broken };
}

async function offline(base) {
  const browser = await launch();
  const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1, hasTouch: true });
  const page = await ctx.newPage();
  await page.addInitScript(save, HEROES);
  const failed = [];
  const errors = [];
  await page.goto(base, { timeout: 300000 });
  await page.waitForFunction(() => window.__readyAt, null, { timeout: 300000 });
  // (the worker's install caches every file in FILES at once, or fails as a whole)
  const cached = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    for (let i = 0; i < 600 && !reg.active; i++) await new Promise((ok) => setTimeout(ok, 500));
    const src = await (await fetch('sw.js')).text();
    const files = Function(`return ${/const FILES = (\[[\s\S]*?\]);/.exec(src)[1]}`)();
    const keys = await caches.keys();
    const c = await caches.open(keys.find((k) => k.startsWith('legends-')));
    const have = new Set((await c.keys()).map((r) => new URL(r.url).pathname));
    const missing = files.filter((f) => !have.has(new URL(f, location.href).pathname));
    return { files: files.length, missing };
  });
  await ctx.setOffline(true);
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('requestfailed', (r) => failed.push(`${new URL(r.url()).pathname} ${r.failure()?.errorText}`));
  page.on('response', (r) => r.status() >= 400 && failed.push(`${new URL(r.url()).pathname} ${r.status()}`));
  await page.reload({ timeout: 300000 });
  await page.waitForFunction(() => window.__readyAt, null, { timeout: 300000 });
  const broken = await tour(page, 'offline', false);
  await browser.close();
  return { ...cached, failed, errors, broken };
}

// (two screenshots compared in the browser: the share of pixels that differ by more than a little in any channel)
async function diff(a, b) {
  const browser = await launch();
  const page = await browser.newPage();
  const r = await page.evaluate(
    async ([a, b]) => {
      const load = (s) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = s; });
      const [ia, ib] = await Promise.all([load(a), load(b)]);
      const px = (i) => { const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; const g = c.getContext('2d'); g.drawImage(i, 0, 0); return g.getImageData(0, 0, i.width, i.height).data; };
      const [da, db] = [px(ia), px(ib)];
      let n = 0;
      for (let k = 0; k < da.length; k += 4) if (Math.abs(da[k] - db[k]) > 24 || Math.abs(da[k + 1] - db[k + 1]) > 24 || Math.abs(da[k + 2] - db[k + 2]) > 24) n++;
      return n / (da.length / 4);
    },
    [a, b].map((f) => `data:image/png;base64,${readFileSync(f).toString('base64')}`),
  );
  await browser.close();
  return r;
}

const servers = {};
for (const [k, dir] of Object.entries(BUILDS)) servers[k] = `http://localhost:${(await serve(dir)).address().port}/`;
const report = { game: {}, start: {}, screens: {}, offline: {} };
for (const [k, dir] of Object.entries(BUILDS)) report.game[k] = readFileSync(`${dir}/game.js`).length;
for (const k of Object.keys(BUILDS)) {
  const runs = [];
  for (let i = 0; i < RUNS; i++) runs.push(await startOnce(servers[k]));
  report.start[k] = runs;
  console.log(`${k}: game.js ${mb(report.game[k])} MB; to the camp ${runs.map((r) => (r.ready / 1000).toFixed(1)).join(', ')} s; heap ${runs.map((r) => mb(r.heap)).join(', ')} MB; renderer RSS ${runs.map((r) => mb(r.rss)).join(', ')} MB`);
}
for (const k of Object.keys(BUILDS)) {
  report.screens[k] = await screens(k, servers[k]);
  const s = report.screens[k];
  console.log(`${k} screens: ${s.errors.length} page errors, ${s.failed.length} failed requests, ${s.broken.length} broken pictures`, [...s.errors, ...s.failed, ...s.broken].slice(0, 8));
}
const diffs = {};
for (const n of ['recruit', 'heroes', 'battle', 'castle', 'spells', 'armies', 'deploy', 'fight']) diffs[n] = await diff(`${SHOTS}/before-${n}.png`, `${SHOTS}/after-${n}.png`);
report.diffs = diffs;
console.log('pixels that differ, before against after:', Object.entries(diffs).map(([n, v]) => `${n} ${(v * 100).toFixed(2)}%`).join(', '));
report.offline = await offline(servers.after);
const o = report.offline;
console.log(`offline (after): ${o.files} files in FILES, ${o.missing.length} not cached; reloaded offline: ${o.errors.length} page errors, ${o.failed.length} failed requests, ${o.broken.length} broken pictures`, [...o.missing, ...o.errors, ...o.failed, ...o.broken].slice(0, 8));
const med = (k, f) => median(report.start[k].map((r) => r[f]));
if (RUNS) console.log(`median: to the camp ${(med('before', 'ready') / 1000).toFixed(1)} s -> ${(med('after', 'ready') / 1000).toFixed(1)} s; heap ${mb(med('before', 'heap'))} -> ${mb(med('after', 'heap'))} MB; renderer RSS ${mb(med('before', 'rss'))} -> ${mb(med('after', 'rss'))} MB`);
writeFileSync(`${SHOTS}/report.json`, JSON.stringify(report, null, 1));
process.exit(0);
