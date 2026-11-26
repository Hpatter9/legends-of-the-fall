// HEROES-STILL: scrolling the Heroes tab's screens on a CPU slowed four times. After `npm run web`: node tools/heroes-still/scroll.mjs [label]
// For each screen (the tavern's list, the roster, a hero page's Overview, the Hall of Heroes): the wheel scrolls it down and back for six
// seconds, and the page's frames are timed (the median, the 95th percentile, the worst, and the frames over 50 ms) with the long tasks
// (over 50 ms) the browser reports; and, as the browser counts them over the same six seconds, the main thread's busy time, its style and
// layout time, and from a trace the paint and raster work (how many and how long: an animated background is repainted every frame, which a
// frame timer on the main thread does not see). Writes nothing; prints one line a screen.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const PORT = Number(process.env.PORT ?? 9062);
const root = process.env.ROOT ?? 'out/web';
const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', webp: 'image/webp', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', ogg: 'audio/ogg', opus: 'audio/ogg', css: 'text/css' };
const srv = createServer((q, r) => {
  const p = `${root}/` + (q.url.split('?')[0].slice(1) || 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(PORT);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
export const OWNED = ['knight', 'cleric', 'wizard', 'archer', 'samurai', 'kunoichi', 'paladin', 'ranger', 'druid', 'barbarian', 'warlock', 'lightningMage', 'werewolf', 'beastmaster', 'minotaur', 'kitsune', 'kraken', 'gunslinger', 'monk', 'bard'];
const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1, hasTouch: true });
const page = await ctx.newPage();
page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
await page.addInitScript((owned) => {
  if (sessionStorage.getItem('hs-set')) return;
  sessionStorage.setItem('hs-set', '1');
  localStorage.clear();
  localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 1200, unlocked: owned, party: owned.slice(0, 5), pulls: 0, dry: 0, dryMythic: 0, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp: Object.fromEntries(owned.map((k) => [k, 120000])), bestStage: 14, tower: 9, daily: {}, bosses: [], achievements: [], armies: {}, armySeen: [], stash: [], ranked: {}, featuresTold: ['autoMerge', 'autoRunes', 'autoPlace'], tutorials: ['pause','autoMerge','traitPerks','spellSlots','daily','eidolons','castle','autoRunes','nemesis','chapel','talents','secondSkill','duels','warHorn','ultimates','autoPlace','tavern','summoning','council','hunts','spare','tiers','hall','armyWeakness','weeklyTrial','shop'], opened: ['undead', 'beasts', 'wildwood', 'labyrinth', 'ogres', 'infernal', 'yokai', 'golems', 'tower', 'castle', 'calamity'] }));
  localStorage.setItem('lotf-tips-off', '1');
  localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false, speed: 1 }));
}, OWNED);
await page.goto(`http://localhost:${PORT}/`);
await page.waitForFunction(() => !!window.__game?.home, null, { timeout: 240000 });
await page.waitForTimeout(1500);
await page.evaluate(() => document.getElementById('tipSkip')?.click());

const label = process.argv[2] ?? 'now';
// (`--still-frames`: the standard menu's frame animations stopped too, to weigh them; this branch leaves them, as every menu has them)
// (`--no-grey`: the Hall's unowned heroes without their grey filter; `--hide-under`: the home page under a sheet hidden; experiments only)
if (process.argv.includes('--no-grey')) await page.addStyleTag({ content: '.hallHero.shut { filter: none !important; }' });
if (process.argv.includes('--hide-under')) await page.addStyleTag({ content: 'body:has(#hmSheet:not([hidden])) .ptTavern, body:has(.omVeil) .ptTavern { visibility: hidden !important; }' });
// (`--hide-roster`: the roster under the Hall's sheet hidden while the Hall is open; an experiment)
if (process.argv.includes('--hide-roster')) await page.addStyleTag({ content: 'body:has(#hallOfHeroes) #hmSheet { visibility: hidden !important; }' });
if (process.argv.includes('--pause-under')) await page.addStyleTag({ content: 'body:has(#hallOfHeroes) #hmSheet * { animation-play-state: paused !important; }' });
if (process.argv.includes('--still-frames')) await page.addStyleTag({ content: '.om, .omHead, .omRule, .om *, .omHead *, .omRule * { animation: none !important; }' });
const cdp = await ctx.newCDPSession(page);
/** Scroll whatever is under the middle of the screen, down then back, for `ms`, and time the frames. */
async function measure(name, at = [196, 520]) {
  await page.mouse.move(at[0], at[1]);
  await page.waitForTimeout(800);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await cdp.send('Performance.enable');
  const m0 = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((x) => [x.name, x.value]));
  const events = [];
  cdp.on('Tracing.dataCollected', (d) => events.push(...d.value));
  const done = new Promise((r) => cdp.once('Tracing.tracingComplete', r));
  await cdp.send('Tracing.start', { categories: 'devtools.timeline,disabled-by-default-devtools.timeline,cc,viz', transferMode: 'ReportEvents' });
  await page.evaluate(() => {
    window.__hs = { frames: [], long: [] };
    const po = new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__hs.long.push(e.duration); });
    po.observe({ type: 'longtask', buffered: false });
    window.__hs.po = po;
    let prev = performance.now();
    const f = (now) => { window.__hs.frames.push(now - prev); prev = now; if (!window.__hs.stop) requestAnimationFrame(f); };
    requestAnimationFrame(f);
  });
  const t0 = Date.now();
  let dir = 1;
  while (Date.now() - t0 < 6000) {
    await page.mouse.wheel(0, 90 * dir);
    await page.waitForTimeout(40);
    if ((Date.now() - t0) % 3000 < 45) dir = -dir;
  }
  const r = await page.evaluate(() => {
    window.__hs.stop = true;
    window.__hs.po.disconnect();
    const f = window.__hs.frames.slice(2).sort((a, b) => a - b);
    const q = (p) => f[Math.min(f.length - 1, Math.floor(p * f.length))];
    return { frames: f.length, median: +q(0.5).toFixed(1), p95: +q(0.95).toFixed(1), worst: +f[f.length - 1].toFixed(1), over50: f.filter((x) => x > 50).length, longTasks: window.__hs.long.length, longMs: Math.round(window.__hs.long.reduce((a, b) => a + b, 0)) };
  });
  const m1 = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((x) => [x.name, x.value]));
  await cdp.send('Tracing.end');
  await done;
  cdp.removeAllListeners('Tracing.dataCollected');
  const sum = (names) => {
    const es = events.filter((e) => names.includes(e.name) && e.ph === 'X');
    return [es.length, Math.round(es.reduce((a, e) => a + (e.dur ?? 0), 0) / 1000)];
  };
  const [paints, paintMs] = sum(['Paint', 'PaintImage']);
  const [rasters, rasterMs] = sum(['RasterTask', 'TileManager::AssignGpuMemory']);
  r.busyMs = Math.round((m1.TaskDuration - m0.TaskDuration) * 1000);
  r.styleLayoutMs = Math.round((m1.RecalcStyleDuration - m0.RecalcStyleDuration + m1.LayoutDuration - m0.LayoutDuration) * 1000);
  r.paints = paints;
  r.paintMs = paintMs;
  r.rasters = rasters;
  r.rasterMs = rasterMs;
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
  console.log(`${label} · ${name}: ${JSON.stringify(r)}`);
}
await page.evaluate(() => window.__game.home.show('heroes'));
await page.waitForTimeout(1500);
await measure('tavern', [196, 700]);
await page.evaluate(() => window.__game.home.openRoster());
await page.waitForTimeout(1500);
await measure('roster');
await page.evaluate(() => window.__game.home.openSheet('knight', true, 'overview'));
await page.waitForTimeout(1500);
await measure('hero page');
await page.evaluate(() => window.__game.home.openRoster());
await page.waitForTimeout(800);
await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => /Hall/.test(b.textContent) && b.offsetParent)?.click());
await page.waitForTimeout(1500);
await measure('hall');
await browser.close();
srv.close();
