// EIDOLONS screenshots (docs/notes/eidolons.md): the War Horn filling and full, the first blow's confirm, and the call's cinematic beat by
// beat in a real fight, on a clock of our own (the Pixi ticker stopped, the page's frame stepped by hand and the CSS animations moved with
// it, as tools/boss-big/shots.mjs does).
//
//   npm run web && PORT=8831 OUT=docs/samples node tools/eidolons/shots.mjs [--size 393x852] [--picks askel,nivra,gorm] [--short] [--reduced] [--horn]
//
// For each Eidolon picked: the Orc Warband's last boss wave, the party at level 40, the horn full with that Eidolon chosen; the fight runs a
// little, the horn is blown, and a picture is taken at each shot (horn, circle, arrive (the low angle), name, close (the close-up and its line), strike (the wide shot and its snap zoom), beat, after, resumed). `--horn` also
// takes the horn filling and full in the HUD, the camp's chip and card (with none bound: "No Eidolon has answered you yet"), and the
// confirm. Writes <OUT>/eidolon-<pick>-<beat>[-<size>][-short][-reduced].png.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');

const args = process.argv.slice(2);
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const PORT = Number(process.env.PORT ?? 8831);
const OUT = process.env.OUT ?? 'out/eidolons';
const SIZE = opt('--size', '393x852');
const [W, H] = SIZE.split('x').map(Number);
const PICKS = opt('--picks', 'askel,nivra,vaelkhar').split(',');
const SHORT = args.includes('--short');
const REDUCED = args.includes('--reduced');
const HORN = args.includes('--horn');
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

async function open(eidolons, confirmed) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, hasTouch: true, reducedMotion: REDUCED ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => { errors++; console.log('PAGE ERROR', e.message); });
  page.on('response', (r) => { if (r.status() === 404) { missing++; console.log('404', r.url()); } });
  await page.addInitScript(([owned, xp, short, eid]) => {
    let z = 0x2545f491;
    Math.random = () => ((z = (Math.imul(z ^ (z >>> 15), 0x2c1b3c6d) + 0x6d2b79f5) | 0) >>> 0) / 4294967296;
    if (sessionStorage.getItem('eh-set')) return;
    sessionStorage.setItem('eh-set', '1');
    localStorage.clear();
    localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 1200, unlocked: owned, party: owned.slice(0, 5), pulls: 0, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp: Object.fromEntries(owned.map((k) => [k, xp])), bestStage: 14, tower: 9, daily: {}, bosses: [], achievements: [], armies: {}, armySeen: [], stash: [], opened: ['undead', 'beasts', 'tower', 'castle'], ...(eid ? { eidolons: eid } : {}) }));
    localStorage.setItem('lotf-tips-off', '1');
    localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false, speed: 1, quips: false, ...(short ? { eidolonFull: false } : {}) }));
  }, [PARTY, xpAt(40), SHORT, eidolons]);
  await page.goto(`http://localhost:${PORT}/`, { timeout: 240000 });
  await page.waitForFunction(() => !!window.__game?.home, null, { timeout: 240000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => document.getElementById('tipSkip')?.click());
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
    window.__until = (ok, max) => {
      for (let t = 0; t < max; t += 16) {
        if (ok()) return true;
        window.__step(16);
      }
      return ok();
    };
  });
  return { ctx, page };
}

async function intoFight(page, party) {
  await page.evaluate(([party]) => {
    const g = window.__game;
    g.app.ticker.start();
    const r = JSON.parse(JSON.stringify(g.run));
    Object.assign(r, { seed: 4242, mode: { kind: 'army', army: 'orcs' }, stage: 15, over: false, cleared: false, gold: 0, event: undefined, roster: party.map((kind, i) => ({ id: 100 + i, kind, grade: 1, paid: 30 })), squad: [], nextId: 200 });
    document.getElementById('home').hidden = true;
    g.startRun(r);
    g.autoArrange(true);
  }, [party]);
  await page.waitForTimeout(800);
}

const shot = (page, name) => page.screenshot({ path: `${OUT}/eidolon-${name}${TAG}.png`, timeout: 180000 });

if (HORN) {
  // (no Eidolon bound, the horn part full: the camp's chip and its card, then the fight's horn filling, and a tap on it)
  const { ctx, page } = await open({ horn: 640 }, false);
  await page.evaluate(() => window.__game.home.refresh());
  await page.waitForTimeout(400);
  await shot(page, 'camp-chip');
  await page.evaluate(() => document.querySelector('.ehCamp').click());
  await page.waitForTimeout(500);
  await shot(page, 'camp-none');
  await page.evaluate(() => document.querySelector('.ehSheet .primary').click());
  await intoFight(page, PARTY);
  await page.evaluate(() => document.getElementById('fight').click());
  await page.evaluate(() => { window.__game.app.ticker.stop(); window.__step(1200); });
  await shot(page, 'horn-filling');
  await page.evaluate(() => { document.querySelector('.ehFight').click(); window.__step(300); });
  await shot(page, 'horn-note');
  await ctx.close();
  // (all six bound, the horn full, the confirm not yet answered)
  const b = await open({ horn: 1000, bound: ['askel', 'nivra', 'aurelan', 'voltara', 'gorm', 'vaelkhar'], chosen: 'askel' }, false);
  await b.page.evaluate(() => window.__game.home.refresh());
  await b.page.waitForTimeout(400);
  await b.page.evaluate(() => document.querySelector('.ehCamp').click());
  await b.page.waitForTimeout(600);
  await shot(b.page, 'camp-bound');
  await b.page.evaluate(() => document.querySelector('.ehSheet .ehBox > button.primary').click());
  await intoFight(b.page, PARTY);
  await b.page.evaluate(() => document.getElementById('fight').click());
  await b.page.evaluate(() => { window.__game.app.ticker.stop(); window.__step(1500); });
  await shot(b.page, 'horn-full');
  await b.page.evaluate(() => { document.querySelector('.ehFight').click(); window.__step(200); });
  await b.page.waitForTimeout(500);
  await shot(b.page, 'confirm');
  await b.ctx.close();
}

const BEATS = SHORT ? [['horn', 120], ['arrive', 380], ['name', 650], ['strike', 1000], ['after', 1650], ['resumed', 2600]] : [['horn', 200], ['circle', 600], ['arrive', 1150], ['name', 1800], ['close', 2450], ['strike', 2900], ['beat', 3400], ['after', 4300], ['resumed', 6200]];
for (const pick of PICKS) {
  try {
    const { ctx, page } = await open({ horn: 1000, bound: [pick], chosen: pick, confirmed: true, ...(SHORT ? { seen: [pick] } : {}) }, true);
    await intoFight(page, PARTY);
    await page.evaluate(() => document.getElementById('fight').click());
    // (a real moment for the figure, loaded as the fight begins, to arrive)
    await page.waitForTimeout(1500);
    await page.evaluate(() => { window.__game.app.ticker.stop(); window.__step(2400); });
    await page.evaluate(() => document.querySelector('.ehFight').click());
    let at = 0;
    for (const [name, t] of BEATS) {
      await page.evaluate((ms) => window.__step(ms), t - at);
      at = t;
      await shot(page, `${pick}-${name}`);
    }
    const left = await page.evaluate(() => ({ phase: window.__game.b.phase, called: window.__game.b.eidolon?.called, foes: window.__game.b.units.filter((u) => u.side === 'foe' && u.alive).map((u) => `${u.def} ${Math.round((u.hp / u.maxHp) * 100)}%`) }));
    console.log('ok', pick, JSON.stringify(left));
    await ctx.close();
  } catch (e) {
    console.log('FAILED', pick, String(e.message).split('\n')[0]);
  }
}
console.log('page errors:', errors, '404s:', missing);
await browser.close();
srv.close();
