// CC0-SOUNDS: plays a real fight in headless Chromium (393x852) and reports what the page's sound did, then mutes it: which cues played
// (`window.__sfxLog`), which of them as a recording (`window.__cueLog`), how many files are decoded (`__audioDebug().cueFiles`), the
// peak and RMS at the page's output with the battle music on, and any error.
//   npm run web && node tools/cc0-sounds/fight.mjs [port] [--synth]   (--synth: the files are refused, so every cue falls back to its synth)
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const port = +(process.argv.find((a) => /^\d+$/.test(a)) ?? 8651);
const synthOnly = process.argv.includes('--synth');
const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', woff2: 'font/woff2', json: 'application/json', opus: 'audio/ogg', ogg: 'audio/ogg' };
const srv = createServer((q, r) => {
  const p = 'out/web/' + (q.url.split('?')[0].slice(1) || 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(port);
const HEROES = ['knight', 'samurai', 'kunoichi', 'archer', 'wizard', 'paladin', 'cleric', 'ranger'];
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1, hasTouch: true, serviceWorkers: synthOnly ? 'block' : 'allow' });
const page = await ctx.newPage();
const errors = [];
if (synthOnly) await page.route('**/sfx/cues/**', (r) => r.abort());
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && !(synthOnly && /sfx\/cues|ERR_FAILED/.test(m.text())) && errors.push(m.text()));
await page.addInitScript(([heroes]) => {
  localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 4000, unlocked: heroes, party: heroes.slice(0, 5), pulls: 0, dry: 0, dryMythic: 0, castle: { treasury: 5, barracks: 5, armoury: 5, mageTower: 4, stable: 5, library: 5 }, shards: {}, stars: {}, xp: {}, bestStage: 30, tower: 0, daily: {}, bosses: [], achievements: [], armies: {}, armySeen: [] }));
  localStorage.setItem('lotf-tips-off', '1');
  window.__sfxLog = [];
  window.__cueLog = [];
  const connect = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (dest, ...rest) {
    if (dest instanceof AudioDestinationNode) {
      const c = dest.context;
      if (!c.__tap) { c.__tap = new AnalyserNode(c, { fftSize: 2048 }); window.__tap = c.__tap; }
      connect.call(this, c.__tap);
    }
    return connect.call(this, dest, ...rest);
  };
}, [HEROES]);
await page.goto(`http://localhost:${port}/`);
await page.waitForFunction(() => window.__game, {}, { timeout: 60000 });
await page.waitForTimeout(1500);
await page.mouse.click(5, 5);
if (!synthOnly) await page.waitForFunction(() => window.__audioDebug?.().cueFiles > 0, {}, { timeout: 20000 }).catch(() => {});
await page.waitForTimeout(1500);
await page.evaluate(() => {
  const g = window.__game; g.run.gold = 9999;
  for (let i = 0; i < 12; i++) document.getElementById('summon')?.click();
  g.run.stage = 6; g.run.squad = [...g.run.roster].sort((a, b) => b.grade - a.grade).slice(0, 5).map((h) => h.id);
  document.getElementById('home').hidden = true; g.newBattle();
});
await page.waitForTimeout(600);
await page.evaluate(() => document.getElementById('auto')?.click());
await page.waitForTimeout(300);
await page.evaluate(() => { window.__sfxLog.length = 0; window.__cueLog.length = 0; document.getElementById('fight').click(); });
const listen = (ms) => page.evaluate((ms) => new Promise((ok) => {
  const a = window.__tap; const d = new Float32Array(a.fftSize); let peak = 0, sum = 0, n = 0;
  const t0 = performance.now();
  const id = setInterval(() => { a.getFloatTimeDomainData(d); for (const x of d) { peak = Math.max(peak, Math.abs(x)); sum += x * x; n++; } if (performance.now() - t0 > ms) { clearInterval(id); ok({ peak, rms: Math.sqrt(sum / n) }); } }, 20);
}), ms);
const db = (x) => (20 * Math.log10(Math.max(1e-6, x))).toFixed(1);
const lvl = await listen(12000);
const r = await page.evaluate(() => ({ cues: window.__sfxLog.length, files: window.__cueLog.slice(), dbg: window.__audioDebug(), names: [...new Set(window.__sfxLog)] }));
const recorded = new Set(r.files.map((f) => f.replace(/-\d+$/, '')));
console.log(`decoded files: ${r.dbg.cueFiles}; limiter: ${r.dbg.limiter}; track: ${r.dbg.track}`);
console.log(`12 s of fight: ${r.cues} cues, ${r.files.length} as recordings (${[...recorded].join(', ')}); synth: ${r.names.filter((n) => !recorded.has(n)).join(', ')}`);
console.log(`takes heard: ${[...new Set(r.files)].sort().join(' ')}`);
console.log(`output: peak ${db(lvl.peak)} dBFS, rms ${db(lvl.rms)} dBFS`);
await page.screenshot({ path: 'out/cc0-sounds/fight.png' });
// (the mute: the master goes to 0 and no recording is started)
await page.evaluate(() => { window.__cueLog.length = 0; document.getElementById('mute').click(); });
const muted = await listen(3000);
console.log(`muted: ${await page.evaluate(() => window.__cueLog.length)} recordings started, output peak ${db(muted.peak)} dBFS`);
await page.evaluate(() => document.getElementById('mute').click());
console.log(`errors: ${errors.length ? errors.join(' | ') : 'none'}`);
await browser.close();
srv.close();
