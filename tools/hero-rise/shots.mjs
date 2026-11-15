// HERO-RISE photographs (docs/notes/hero-rise.md). After `npm run web`:
//   node tools/hero-rise/shots.mjs
// At 393x852, 360x780 and 412x915 (`SIZES=393` for one): Auto merge in a deploy (three pairs merge: plates over the heroes on the board and
// the cards on the bench); a wave won with heroes on the edge of a level (one about to reach the level that opens its third skill); the
// tavern's Upgrades list after "Upgrade all" and after "Auto all talents"; a hero page's Rank up. Each picture is taken with the plates'
// animation stopped at 0.7 s (in, and fully shown). Writes docs/samples/hero-rise-<scene>-<w>.png.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import * as esbuild from 'esbuild';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const PORT = Number(process.env.PORT ?? 9041);
const root = process.env.ROOT ?? 'out/web';
const SIZES = (process.env.SIZES ?? '393,360,412').split(',').map((w) => ({ 393: [393, 852], 360: [360, 780], 412: [412, 915] })[w]);
const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', webp: 'image/webp', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', ogg: 'audio/ogg', opus: 'audio/ogg', css: 'text/css' };
const srv = createServer((q, r) => {
  const p = `${root}/` + (q.url.split('?')[0].slice(1) || 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(PORT);
// (the levels' own XP table, so a hero can be set one point short of a level)
mkdirSync('out/shots', { recursive: true });
await esbuild.build({ entryPoints: ['src/sim/levels.ts'], bundle: true, platform: 'node', format: 'esm', outfile: 'out/shots/rise-levels.mjs', logLevel: 'error', loader: { '.png': 'empty', '.webp': 'empty' } });
const { xpFor } = await import('../../out/shots/rise-levels.mjs');
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
mkdirSync('docs/samples', { recursive: true });
const PARTY = ['knight', 'cleric', 'wizard', 'archer', 'samurai'];
const OWNED = [...PARTY, 'paladin', 'ranger', 'kunoichi'];
let errors = 0;
const cleared = { waves: 15, best: 15, won: 1, clears: 1, stars: {} };

async function open(w, h, extra = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true });
  const page = await ctx.newPage();
  page.setDefaultNavigationTimeout(180000);
  page.setDefaultTimeout(120000);
  page.on('pageerror', (e) => { errors++; console.log('PAGE ERROR', e.message); });
  await page.addInitScript(([owned, party, xp, extra, cleared]) => {
    let z = 0x2545f491;
    Math.random = () => ((z = (Math.imul(z ^ (z >>> 15), 0x2c1b3c6d) + 0x6d2b79f5) | 0) >>> 0) / 4294967296;
    if (sessionStorage.getItem('rise-set')) return;
    sessionStorage.setItem('rise-set', '1');
    localStorage.clear();
    localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 1200, unlocked: owned, party, pulls: 0, dry: 0, dryMythic: 0, castle: { treasury: 1, barracks: 1, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp: Object.fromEntries(owned.map((k) => [k, xp])), bestStage: 14, tower: 9, daily: {}, bosses: [], achievements: [], armies: { orcs: cleared, undead: cleared, beasts: cleared }, armySeen: [], stash: [], ranked: {}, featuresTold: ['autoMerge', 'autoRunes', 'autoPlace'], opened: ['undead', 'beasts', 'wildwood', 'labyrinth', 'ogres', 'infernal', 'yokai', 'golems', 'tower', 'castle', 'calamity'], ...extra }));
    localStorage.setItem('lotf-tips-off', '1');
    localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false, speed: 1 }));
  }, [OWNED, PARTY, xpFor(32) + 5, extra, cleared]);
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForFunction(() => !!window.__game?.home, null, { timeout: 240000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => document.getElementById('tipSkip')?.click());
  await page.addStyleTag({ content: '#tip, .tip, #tipBox, .duchess, .say, [class*=bubble], [class*=Bubble], #quip, .ftToast, #featureToast { display: none !important; }' });
  return { ctx, page };
}
async function run(page, roster) {
  await page.evaluate((roster) => {
    const g = window.__game;
    const r = JSON.parse(JSON.stringify(g.run));
    Object.assign(r, { seed: 4242, mode: { kind: 'army', army: 'beasts' }, stage: 3, over: false, cleared: false, gold: 0, event: undefined, roster: roster.map((kind, i) => ({ id: 100 + i, kind, grade: 1, paid: 30 })), squad: [], nextId: 200 });
    document.getElementById('home').hidden = true;
    g.startRun(r);
    g.autoArrange(true);
  }, roster);
  await page.waitForTimeout(800);
}
/** Hold every plate at `ms` into its show (in, and fully shown), for the slow software capture. */
const freeze = (page, ms = 700) => page.evaluate((ms) => { for (const a of document.getAnimations()) if (a.effect?.target?.closest?.('.rsLayer')) { a.currentTime = ms; a.pause(); } }, ms);
const plates = (page) => page.evaluate(() => {
  // (only the plates on show: a plate queued for a later round is still waiting, unseen)
  const ps = [...document.querySelectorAll('.rsPlate')].filter((p) => Number(getComputedStyle(p).opacity) > 0.5).map((p) => ({ text: p.innerText.replace(/\n/g, ' | '), r: p.getBoundingClientRect() }));
  const queued = document.querySelectorAll('.rsPlate').length - ps.length;
  let overlaps = 0;
  for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
    const a = ps[i].r, b = ps[j].r;
    if (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom) overlaps++;
  }
  return { n: ps.length, queued, overlaps, offscreen: ps.filter((p) => p.r.left < 0 || p.r.right > innerWidth || p.r.top < 0).length, texts: ps.map((p) => p.text), pageW: document.documentElement.scrollWidth };
});
const shot = async (page, name, w) => {
  const path = `docs/samples/hero-rise-${name}-${w}.png`;
  await page.screenshot({ path });
  console.log('  wrote', path);
};

for (const [w, h] of SIZES) {
  // (Auto merge in a deploy: three pairs, one of each on the board and its twin on the bench)
  {
    const { ctx, page } = await open(w, h);
    try {
      await run(page, ['knight', 'cleric', 'wizard', 'archer', 'samurai', 'knight', 'cleric', 'wizard']);
      await page.evaluate(() => document.getElementById('mergeAll').click());
      await page.waitForSelector('.rsPlate', { timeout: 20000 });
      await page.waitForTimeout(300);
      await freeze(page);
      console.log(w, 'merge', JSON.stringify(await plates(page)));
      await shot(page, 'merge', w);
    } catch (e) { errors++; console.log('FAILED merge', w, e.message); }
    await ctx.close();
  }
  // (a wave won: each hero one XP short of its next level, the Wizard of the level that opens her third skill)
  {
    const { ctx, page } = await open(w, h, { xp: { knight: xpFor(33) - 1, cleric: xpFor(33) - 1, wizard: xpFor(20) - 1, archer: xpFor(33) - 1, samurai: xpFor(33) - 1, paladin: 0, ranger: 0, kunoichi: 0 } });
    try {
      await run(page, PARTY);
      await page.evaluate(() => document.getElementById('fight').click());
      await page.waitForTimeout(2500);
      // (the foes struck down at once: the sim ends the wave on its next step, and the page settles it as any win)
      await page.evaluate(() => { for (const u of window.__game.b.units) if (u.side === 'foe') { u.hp = 0; u.alive = false; u.diedAt = window.__game.b.t; } });
      await page.waitForSelector('.rsPlate', { timeout: 20000 });
      await page.waitForTimeout(350);
      await freeze(page);
      console.log(w, 'wave', JSON.stringify(await plates(page)));
      await shot(page, 'wave', w);
    } catch (e) { errors++; console.log('FAILED wave', w, e.message); }
    await ctx.close();
  }
  // (the tavern's Upgrades list: four heroes with a rank ready, and talent points to spend; Upgrade all, then Auto all talents)
  {
    const { ctx, page } = await open(w, h, { shards: { knight: 40, cleric: 40, wizard: 40, archer: 40 } });
    try {
      await page.evaluate(() => window.__game.home.tavern.upgrades.onUpgrades());
      await page.waitForSelector('.ulAll');
      await page.evaluate(() => document.querySelector('.ulAll').click());
      await page.evaluate(() => document.querySelector('.ulAsk .primary').click());
      await page.waitForSelector('.rsPlate', { timeout: 20000 });
      await page.waitForTimeout(300);
      await freeze(page);
      console.log(w, 'upgrade all', JSON.stringify(await plates(page)));
      await shot(page, 'upgrade-all', w);
      await page.evaluate(() => document.querySelector('.rsLayer')?.replaceChildren());
      await page.evaluate(() => document.querySelector('.ulAuto').click());
      await page.evaluate(() => document.querySelector('.ulAsk .primary').click());
      await page.waitForSelector('.rsPlate', { timeout: 20000 });
      await page.waitForTimeout(300);
      await freeze(page);
      console.log(w, 'auto talents', JSON.stringify(await plates(page)));
      await shot(page, 'talents', w);
    } catch (e) { errors++; console.log('FAILED tavern', w, e.message); }
    await ctx.close();
  }
  // (a hero page's Rank up card, taken)
  {
    const { ctx, page } = await open(w, h, { shards: { samurai: 40 } });
    try {
      await page.evaluate(() => window.__game.home.openSheet('samurai'));
      await page.waitForSelector('.rankBadge', { timeout: 15000 });
      await page.evaluate(() => document.querySelector('.rankBadge').click());
      await page.waitForFunction(() => [...document.querySelectorAll('.omPrimary')].some((b) => b.offsetParent && /Rank up/.test(b.textContent)), null, { timeout: 15000 });
      await page.evaluate(() => [...document.querySelectorAll('.omPrimary')].find((b) => b.offsetParent && /Rank up/.test(b.textContent)).click());
      await page.waitForSelector('.rsPlate', { timeout: 20000 });
      await page.waitForTimeout(300);
      await freeze(page);
      console.log(w, 'rank', JSON.stringify(await plates(page)));
      await shot(page, 'rank', w);
    } catch (e) { errors++; console.log('FAILED rank', w, e.message); }
    await ctx.close();
  }
}
await browser.close();
srv.close();
console.log(errors ? `${errors} errors` : 'no page errors');
process.exit(errors ? 1 : 0);
