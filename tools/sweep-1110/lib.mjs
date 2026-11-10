// SWEEP-1110's shared set-up (docs/notes/sweep-1110.md): serves out/web, opens the game at an upright phone size on a well-off save
// (every army at ten stars, so the Assault is open at each hold), and the checks every scene runs: page errors, 404s, anything that runs
// past the screen's right edge.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');

const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', webp: 'image/webp', jpg: 'image/jpeg', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', ogg: 'audio/ogg', opus: 'audio/ogg', css: 'text/css' };
export function serve(port, root = 'out/web') {
  return createServer((q, r) => {
    const p = `${root}/` + (decodeURIComponent(q.url.split('?')[0]).slice(1) || 'index.html');
    if (!existsSync(p)) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
    r.end(readFileSync(p));
  }).listen(port);
}
export const launch = () => chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
export const SIZES = (process.env.SIZES ?? '393x852,360x780,412x915').split(',').map((s) => s.split('x').map(Number));
export const out = (dir) => (mkdirSync(dir, { recursive: true }), dir);
export const wait = (page, ms) => page.waitForTimeout(ms);

const xpAt = (level) => Math.round(30 * (level - 1) * level * (level > 20 ? 4 : 1));
export const ALL = ['knight', 'cleric', 'wizard', 'archer', 'samurai', 'lightningMage', 'paladin', 'kraken', 'kitsune', 'minotaur', 'warlock', 'barbarian', 'druid', 'ranger'];
export const ARMY_IDS = ['orcs', 'undead', 'beasts', 'wildwood', 'labyrinth', 'ogres', 'infernal', 'yokai', 'golems'];

/** The save: fourteen heroes at level 32, every army cleared with ten stars, crowns and stones to spend. `conquered` lists holds fallen. */
export function saveOf({ conquered = [], level = 32 } = {}) {
  const day = 20261110;
  return {
    seed: 7, crowns: 50000, stones: 500, unlocked: ALL, party: ALL.slice(0, 5), pulls: 0, dry: 0, dryMythic: 0,
    castle: { treasury: 2, barracks: 2, armoury: 1, mageTower: 1, stable: 1, library: 1 },
    shards: {}, stars: {}, xp: Object.fromEntries(ALL.map((k) => [k, xpAt(level)])), bestStage: 14, tower: 9, daily: {}, bosses: [], achievements: [],
    armies: Object.fromEntries(ARMY_IDS.map((id) => [id, { waves: 15, best: 15, won: 15, clears: 1, stars: {}, met: { 0: 7, 1: 7, 2: 7, 3: 1 } }])),
    armySeen: ARMY_IDS, stash: [], opened: [...ARMY_IDS, 'tower', 'castle', 'calamity'],
    assault: { v: 1, troops: {}, conquered: Object.fromEntries(conquered.map((id) => [id, { day, tier: 3, wins: 1 }])), tries: {} },
  };
}

/** A page at w x h on the save, the tips and cinematics off. Collects page errors, console errors and 404s into `log`. */
export async function open(browser, w, h, port, { save = saveOf(), reduced = false, offline = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true, reducedMotion: reduced ? 'reduce' : 'no-preference', serviceWorkers: offline ? 'allow' : 'block' });
  const page = await ctx.newPage();
  const log = { errors: [], missing: [], console: [] };
  page.on('pageerror', (e) => { log.errors.push(e.message); console.log(`  PAGE ERROR ${w}:`, e.message); });
  page.on('console', (m) => { if (m.type() === 'error') log.console.push(m.text()); });
  page.on('response', (r) => { if (r.status() === 404) { log.missing.push(r.url()); console.log('  404', r.url()); } });
  await page.addInitScript((save) => {
    if (sessionStorage.getItem('sw-set')) return;
    sessionStorage.setItem('sw-set', '1');
    localStorage.clear();
    localStorage.setItem('legends.meta', JSON.stringify(save));
    localStorage.setItem('lotf-tips-off', '1');
    localStorage.setItem('legends.settings', JSON.stringify({ cinematics: false, speed: 1 }));
  }, save);
  await page.goto(`http://localhost:${port}/`);
  await page.waitForFunction(() => !!window.__game?.home, null, { timeout: 60000 });
  await wait(page, 1500);
  await settle(page);
  return { ctx, page, log };
}

/** Clear whatever a first visit puts up (tips, cut scenes, reveals). */
export async function settle(page) {
  for (let i = 0; i < 6; i++) {
    const hit = await page.evaluate(() => {
      let n = 0;
      for (const s of ['#tipSkip', '.csSkip', '.rvSkip', '.revealSkip']) for (const e of document.querySelectorAll(s)) if (e.offsetParent) { e.click(); n++; }
      return n;
    });
    if (!hit) break;
    await wait(page, 400);
  }
}

/** Elements that run past the right edge (or the left) of the screen and are not inside a box that scrolls or clips sideways. */
export function overflow(page) {
  return page.evaluate(() => {
    const W = innerWidth;
    const bad = [];
    const clipped = (e) => {
      for (let p = e.parentElement; p && p !== document.body; p = p.parentElement) {
        const s = getComputedStyle(p);
        if (/(auto|scroll|hidden|clip)/.test(s.overflowX)) {
          const r = p.getBoundingClientRect();
          if (r.right <= W + 1 && r.left >= -1) return true;
        }
      }
      return false;
    };
    for (const e of document.querySelectorAll('body *')) {
      if (!e.offsetParent && getComputedStyle(e).position !== 'fixed') continue;
      const s = getComputedStyle(e);
      if (s.visibility === 'hidden' || s.display === 'none' || +s.opacity === 0) continue;
      const r = e.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      if ((r.right > W + 1 || r.left < -1) && !clipped(e)) bad.push(`${e.tagName.toLowerCase()}#${e.id}.${[...e.classList].join('.')} [${Math.round(r.left)}..${Math.round(r.right)}] "${(e.textContent ?? '').trim().slice(0, 30)}"`);
    }
    return { scroll: document.documentElement.scrollWidth > W + 1 ? document.documentElement.scrollWidth : 0, bad: bad.slice(0, 12) };
  });
}

/** The screens open on top of the camp (CLOSE-SCREENS' list). */
export const screens = (page) => page.evaluate(() => window.__screens?.() ?? []);
