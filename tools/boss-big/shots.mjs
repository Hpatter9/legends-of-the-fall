// BOSS-BIG screenshots (docs/notes/boss-big-attacks.md): a boss's signature attack in a real fight, on a clock of our own (the Pixi ticker
// stopped and the page's frame stepped by hand, the CSS animations moved with it, as tools/ult-epic/shots.mjs does).
//
//   npm run web && PORT=8771 OUT=docs/samples node tools/boss-big/shots.mjs [--size 393x852] [--picks orcs,undead] [--short] [--reduced]
//
// For each army picked: its last boss wave, the party at level 40; the fight runs until the boss's first signature begins, then a picture
// of the cut-in (`cut`), of the marks filling in once the fight runs again (`warn`), and of the blow just after it lands (`impact`). Writes
// <OUT>/boss-big-<army>-<shot>[-<size>].png.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');

const args = process.argv.slice(2);
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const PORT = Number(process.env.PORT ?? 8771);
const OUT = process.env.OUT ?? 'out/boss-big';
const SIZE = opt('--size', '393x852');
const [W, H] = SIZE.split('x').map(Number);
const PICKS = opt('--picks', 'orcs,undead,beasts,infernal,golems').split(',');
const SHORT = args.includes('--short');
const REDUCED = args.includes('--reduced');
const TAG = `${SIZE === '393x852' ? '' : `-${W}`}${SHORT ? '-short' : ''}${REDUCED ? '-reduced' : ''}`;
mkdirSync(OUT, { recursive: true });

const root = 'out/web';
const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', webp: 'image/webp', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', ogg: 'audio/ogg', opus: 'audio/ogg', css: 'text/css' };
const srv = createServer((q, r) => {
  const p = `${root}/` + (q.url.split('?')[0].slice(1) || 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(PORT);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const xpAt = (level) => Math.round(30 * (level - 1) * level * (level > 20 ? 4 : 1));
const PARTY = ['knight', 'paladin', 'archer', 'wizard', 'cleric'];
let errors = 0;
let missing = 0;

const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, hasTouch: true, reducedMotion: REDUCED ? 'reduce' : 'no-preference' });
const page = await ctx.newPage();
page.on('pageerror', (e) => { errors++; console.log('PAGE ERROR', e.message); });
page.on('response', (r) => { if (r.status() === 404) { missing++; console.log('404', r.url()); } });
await page.addInitScript(([owned, xp, short]) => {
  let z = 0x2545f491;
  Math.random = () => ((z = (Math.imul(z ^ (z >>> 15), 0x2c1b3c6d) + 0x6d2b79f5) | 0) >>> 0) / 4294967296;
  if (sessionStorage.getItem('bb-set')) return;
  sessionStorage.setItem('bb-set', '1');
  localStorage.clear();
  localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 1200, unlocked: owned, party: owned.slice(0, 5), pulls: 0, dry: 0, dryMythic: 0, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp: Object.fromEntries(owned.map((k) => [k, xp])), bestStage: 14, tower: 9, daily: {}, bosses: [], achievements: [], armies: {}, armySeen: [], stash: [], opened: ['undead', 'beasts', 'wildwood', 'labyrinth', 'ogres', 'infernal', 'yokai', 'golems', 'tower', 'castle', 'calamity'] }));
  localStorage.setItem('lotf-tips-off', '1');
  localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false, speed: 1, ...(short ? { ultFull: false } : {}) }));
}, [PARTY, xpAt(40), SHORT]);
await page.goto(`http://localhost:${PORT}/`, { timeout: 240000 });
await page.waitForFunction(() => !!window.__game?.home, null, { timeout: 240000 });
await page.waitForTimeout(1500);
await page.evaluate(() => document.getElementById('tipSkip')?.click());
await page.addStyleTag({ content: '#tip, .tip, #tipBox, .duchess, .say, [class*=bubble], [class*=Bubble], #quip, #bossCard { display: none !important; }' });
await page.evaluate(() => {
  const g = window.__game;
  const seen = new Map();
  window.__step = (ms) => {
    for (let t = 0; t < ms; t += 16) {
      g.frame(16, 16);
      for (const a of document.getAnimations()) {
        const at = (seen.get(a) ?? 0) + 16;
        seen.set(a, at);
        if (a.playbackRate !== 0) a.playbackRate = 0;
        a.currentTime = at;
      }
    }
    g.app.render();
  };
  // (steps until `ok()` holds, at most `max` ms)
  window.__until = (ok, max) => {
    for (let t = 0; t < max; t += 16) {
      if (ok()) return true;
      window.__step(16);
    }
    return ok();
  };
});

for (const pick of PICKS) {
  try {
    await page.evaluate(([army, party]) => {
      const g = window.__game;
      g.app.ticker.start();
      const r = JSON.parse(JSON.stringify(g.run));
      Object.assign(r, { seed: 4242, mode: { kind: 'army', army }, stage: 15, over: false, cleared: false, gold: 0, event: undefined, roster: party.map((kind, i) => ({ id: 100 + i, kind, grade: 1, paid: 30 })), squad: [], nextId: 200 });
      document.getElementById('home').hidden = true;
      g.startRun(r);
      g.autoArrange(true);
    }, [pick, PARTY]);
    await page.waitForTimeout(800);
    await page.evaluate(() => document.getElementById('fight').click());
    await page.waitForTimeout(300);
    // (on our clock: until the boss's first windup brings the cut-in)
    const got = await page.evaluate(() => {
      const g = window.__game;
      g.app.ticker.stop();
      return window.__until(() => !!g.b.warnings?.length || g.b.phase !== 'fight', 40000) && !!g.b.warnings?.length;
    });
    if (!got) throw new Error('no signature before the fight ended');
    await page.evaluate(() => window.__step(380));
    await page.screenshot({ path: `${OUT}/boss-big-${pick}-cut${TAG}.png`, timeout: 180000 });
    // (the cut-in over, the marks filling in)
    await page.evaluate(() => window.__step(1900));
    await page.screenshot({ path: `${OUT}/boss-big-${pick}-warn${TAG}.png`, timeout: 180000 });
    await page.evaluate(() => {
      const g = window.__game;
      window.__until(() => !g.b.warnings?.length, 4000);
      window.__step(90);
    });
    await page.screenshot({ path: `${OUT}/boss-big-${pick}-impact${TAG}.png`, timeout: 180000 });
    await page.evaluate(() => window.__step(600));
    await page.screenshot({ path: `${OUT}/boss-big-${pick}-after${TAG}.png`, timeout: 180000 });
    console.log('ok', pick);
  } catch (e) {
    console.log('FAILED', pick, String(e.message).split('\n')[0]);
  }
}
await ctx.close();
console.log('page errors:', errors, '404s:', missing);
await browser.close();
srv.close();
