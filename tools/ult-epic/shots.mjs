// ULT-EPIC screenshots (docs/notes/ult-epic.md): an ultimate's whole moment, frame by frame on a clock of our own (the Pixi ticker
// stopped and the page's frame stepped by hand, the CSS animations moved with it), so the pictures are the same each run.
//
//   npm run web && PORT=8691 OUT=docs/samples/ult-epic node tools/ult-epic/shots.mjs [--size 393x852] [--picks samurai,paladin] [--at 150,700,1250]
//
// For each pick: a fight in an army's wave 3 with a party that has it, its ultimate fired by a tap on its row, then a picture at each
// time (ms after the moment began). Writes <OUT>/<pick>-<ms>.png (`strips.py` puts them side by side).
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');

const args = process.argv.slice(2);
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const PORT = Number(process.env.PORT ?? 8691);
const OUT = process.env.OUT ?? 'out/ult-epic';
const [W, H] = opt('--size', '393x852').split('x').map(Number);
const PICKS = opt('--picks', 'samurai,paladin,minotaur,wizard,kraken,lightningMage').split(',');
const AT = opt('--at', '150,700,1250,1450,1800,2400').split(',').map(Number);
const REDUCED = args.includes('--reduced');
const SAVER = args.includes('--saver');
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
const ALL = ['knight', 'cleric', 'wizard', 'archer', 'samurai', 'lightningMage', 'paladin', 'kraken', 'kitsune', 'minotaur', 'warlock', 'barbarian', 'druid', 'ranger'];
// (each pick fights beside four others, as the director's capture did)
const PARTY_OF = (pick) => [pick, ...['knight', 'cleric', 'archer', 'wizard', 'samurai'].filter((k) => k !== pick)].slice(0, 5);
let errors = 0;
let missing = 0;

async function open() {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, hasTouch: true, reducedMotion: REDUCED ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => { errors++; console.log('PAGE ERROR', e.message); });
  page.on('response', (r) => { if (r.status() === 404) { missing++; console.log('404', r.url()); } });
  await page.addInitScript(([owned, xp, saver]) => {
    let z = 0x2545f491;
    Math.random = () => ((z = (Math.imul(z ^ (z >>> 15), 0x2c1b3c6d) + 0x6d2b79f5) | 0) >>> 0) / 4294967296;
    if (sessionStorage.getItem('ue-set')) return;
    sessionStorage.setItem('ue-set', '1');
    localStorage.clear();
    localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 1200, unlocked: owned, party: owned.slice(0, 5), pulls: 0, dry: 0, dryMythic: 0, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp: Object.fromEntries(owned.map((k) => [k, xp])), bestStage: 14, tower: 9, daily: {}, bosses: [], achievements: [], armies: {}, armySeen: [], stash: [], opened: ['undead', 'beasts', 'wildwood', 'labyrinth', 'ogres', 'infernal', 'yokai', 'golems', 'tower', 'castle', 'calamity'] }));
    localStorage.setItem('lotf-tips-off', '1');
    localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false, speed: 1, ...(saver ? { saver: true } : {}) }));
  }, [ALL, xpAt(32), SAVER]);
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForFunction(() => !!window.__game?.home, null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => document.getElementById('tipSkip')?.click());
  await page.addStyleTag({ content: '#tip, .tip, #tipBox, .duchess, .say, [class*=bubble], [class*=Bubble], #quip { display: none !important; }' });
  // (our own clock: the ticker stopped, `__step(ms)` moves the page's frame and every CSS animation on by 16 ms steps)
  await page.evaluate(() => {
    const g = window.__game;
    const seen = new Map();
    window.__step = (ms) => {
      for (let t = 0; t < ms; t += 16) {
        g.frame(16, 16);
        for (const a of document.getAnimations()) {
          const at = (seen.get(a) ?? 0) + 16;
          seen.set(a, at);
          // (a rate of 0 rather than pause(): a paused CSS animation outlives a change of its element's animation, and the old one would stay)
          if (a.playbackRate !== 0) a.playbackRate = 0;
          a.currentTime = at;
        }
      }
      g.app.render();
    };
  });
  return { ctx, page };
}

async function army(page, party) {
  await page.evaluate((party) => {
    const g = window.__game;
    const r = JSON.parse(JSON.stringify(g.run));
    Object.assign(r, { seed: 4242, mode: { kind: 'army', army: 'beasts' }, stage: 3, over: false, cleared: false, gold: 0, event: undefined, roster: party.map((kind, i) => ({ id: 100 + i, kind, grade: 1, paid: 30 })), squad: [], nextId: 200 });
    document.getElementById('home').hidden = true;
    g.startRun(r);
    g.autoArrange(true);
  }, party);
  await page.waitForTimeout(700);
  await page.evaluate(() => document.getElementById('fight').click());
  await page.waitForFunction(() => {
    const u = window.__game.b.units.filter((x) => x.alive);
    return u.some((h) => h.side === 'hero' && u.some((f) => f.side === 'foe' && Math.max(Math.abs(f.u - h.u), Math.abs(f.v - h.v)) <= 2));
  }, null, { timeout: 25000, polling: 200 }).catch(() => {});
  await page.waitForTimeout(1200);
}

const { ctx, page } = await open();
for (const pick of PICKS) {
  try {
    await army(page, PARTY_OF(pick));
    await page.evaluate((pick) => {
      const g = window.__game;
      g.app.ticker.stop();
      const hs = g.b.units.filter((u) => u.side === 'hero' && u.owner === undefined);
      for (const u of hs) u.charge2 = 0;
      const u = hs.find((h) => h.def === pick);
      u.charge2 = 100;
      document.querySelector(`.fhRow[data-unit="${u.id}"]`).dispatchEvent(new MouseEvent('click', { bubbles: true }));
      // (on until the moment begins)
      for (let i = 0; i < 400 && !g.ultm.queue.current; i++) window.__step(16);
    }, pick);
    let t = 0;
    for (const ms of AT) {
      await page.evaluate((d) => window.__step(d), ms - t);
      t = ms;
      await page.screenshot({ path: `${OUT}/${pick}-${ms}.png` });
    }
    await page.evaluate(() => { window.__step(3000); window.__game.app.ticker.start(); });
    console.log('ok', pick);
  } catch (e) {
    console.log('FAILED', pick, String(e.message).split('\n')[0]);
  }
}
await ctx.close();
console.log('page errors:', errors, '404s:', missing);
await browser.close();
srv.close();
