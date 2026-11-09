// BATTLE-POLISH screenshots (docs/notes/battle-polish.md): the bench before a fight, the fight's HUD (the Auto buttons) and the Summoning
// screen's collection, at the three upright phone sizes.
//
//   npm run web && ROOT=out/web OUT=docs/samples/battle-polish TAG=after node tools/battle-polish/shots.mjs [--sizes 393x852,360x780,412x915] [--only bench,hud,summon]
//
// Writes <OUT>/<scene>-<TAG>-<w>.png. ROOT may be another build (the "before" shots were taken from a build of main).
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const args = process.argv.slice(2);
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const PORT = Number(process.env.PORT ?? 8693);
const ROOT = process.env.ROOT ?? 'out/web';
const OUT = process.env.OUT ?? 'out/battle-polish';
const TAG = process.env.TAG ?? 'after';
const SIZES = opt('--sizes', '393x852,360x780,412x915').split(',').map((s) => s.split('x').map(Number));
const ONLY = opt('--only', 'bench,hud,summon').split(',');
mkdirSync(OUT, { recursive: true });

const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', webp: 'image/webp', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', ogg: 'audio/ogg', opus: 'audio/ogg', css: 'text/css' };
const srv = createServer((q, r) => {
  const p = `${ROOT}/` + (q.url.split('?')[0].slice(1) || 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(PORT);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const xpAt = (level) => Math.round(30 * (level - 1) * level * (level > 20 ? 4 : 1));
const ALL = ['knight', 'cleric', 'wizard', 'archer', 'samurai', 'lightningMage', 'paladin', 'kraken', 'kitsune', 'minotaur', 'warlock', 'barbarian', 'druid', 'ranger'];
let errors = 0;

async function open(w, h) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => { errors++; console.log('PAGE ERROR', e.message); });
  await page.addInitScript(([owned, xp]) => {
    let z = 0x2545f491;
    Math.random = () => ((z = (Math.imul(z ^ (z >>> 15), 0x2c1b3c6d) + 0x6d2b79f5) | 0) >>> 0) / 4294967296;
    if (sessionStorage.getItem('bp-set')) return;
    sessionStorage.setItem('bp-set', '1');
    localStorage.clear();
    // (shards begun on a few heroes not yet joined, for the Summoning screen's row of the nearest)
    const shards = { kunoichi: 7, ninjaMonk: 4, gorgon: 2, mercenary: 9, beastmaster: 1, wolfBard: 5, seraph: 3 };
    localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 1200, stones: 30, unlocked: owned, party: owned.slice(0, 5), pulls: 0, dry: 0, dryMythic: 0, chapel: true, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards, unlock: shards, stars: {}, xp: Object.fromEntries(owned.map((k) => [k, xp])), bestStage: 14, tower: 9, daily: {}, bosses: [], achievements: [], armies: {}, armySeen: [], stash: [], opened: ['undead', 'beasts', 'wildwood', 'labyrinth', 'ogres', 'infernal', 'yokai', 'golems', 'tower', 'castle', 'calamity'] }));
    localStorage.setItem('lotf-tips-off', '1');
    localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false, speed: 1 }));
  }, [ALL, xpAt(32)]);
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForFunction(() => !!window.__game?.home, null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => document.getElementById('tipSkip')?.click());
  await page.addStyleTag({ content: '#tip, .tip, #tipBox, .duchess, .say, [class*=bubble], [class*=Bubble], #quip { display: none !important; }' });
  return { ctx, page };
}

async function army(page) {
  await page.evaluate(() => {
    const g = window.__game;
    const r = JSON.parse(JSON.stringify(g.run));
    Object.assign(r, { seed: 4242, mode: { kind: 'army', army: 'beasts' }, stage: 3, over: false, cleared: false, gold: 0, event: undefined, roster: ['knight', 'cleric', 'archer', 'wizard', 'samurai'].map((kind, i) => ({ id: 100 + i, kind, grade: 1, paid: 30 })), squad: [], nextId: 200 });
    document.getElementById('home').hidden = true;
    g.startRun(r);
  });
  await page.waitForTimeout(1500);
}

for (const [w, h] of SIZES) {
  if (ONLY.includes('summon')) {
    const { ctx, page } = await open(w, h);
    await page.evaluate(() => window.__game.gacha.open());
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${OUT}/summon-${TAG}-${w}.png` });
    await page.evaluate(() => { const d = document.getElementById('collectionPanel'); d.open = true; });
    await page.waitForTimeout(400);
    await page.evaluate(() => document.getElementById('collectionPanel').scrollIntoView());
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/summon-open-${TAG}-${w}.png` });
    await ctx.close();
  }
  if (ONLY.includes('bench') || ONLY.includes('hud')) {
    const { ctx, page } = await open(w, h);
    await army(page);
    if (ONLY.includes('bench')) await page.screenshot({ path: `${OUT}/bench-${TAG}-${w}.png` });
    if (ONLY.includes('hud')) {
      await page.evaluate(() => window.__game.autoArrange(true));
      await page.waitForTimeout(500);
      await page.evaluate(() => document.getElementById('fight').click());
      await page.waitForTimeout(4000);
      await page.screenshot({ path: `${OUT}/hud-${TAG}-${w}.png` });
      // (after: both Auto buttons turned on, to see them lit)
      if (TAG === 'after') {
        await page.evaluate(() => document.querySelectorAll('#hudSpells .fhAuto').forEach((b) => b.click()));
        await page.waitForTimeout(600);
        await page.screenshot({ path: `${OUT}/hud-on-${TAG}-${w}.png`, clip: { x: 0, y: 90, width: w, height: 110 } });
      }
    }
    await ctx.close();
  }
  console.log('ok', w);
}
console.log('page errors:', errors);
await browser.close();
srv.close();
