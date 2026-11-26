// HEROES-STILL: what moves on the Heroes tab's screens. After `npm run web`: node tools/heroes-still/probe.mjs
// For each screen (the tavern, the roster, a hero page's four tabs, the Hall of Heroes): every running animation (its CSS name and what it
// runs on), every canvas and its size, and how many frames the page asks for a second while the screen sits still.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const PORT = Number(process.env.PORT ?? 9061);
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
const look = (name) => page.evaluate(async (name) => {
  const anims = document.getAnimations().filter((a) => a.playState === 'running').map((a) => {
    const t = a.effect?.target;
    const vis = t && t.getClientRects().length && getComputedStyle(t).visibility !== 'hidden';
    return `${a.animationName ?? a.constructor.name} on ${t?.tagName?.toLowerCase()}.${String(t?.className ?? '').split(' ').slice(0, 2).join('.')}${vis ? '' : ' (not shown)'}`;
  });
  const count = {};
  for (const a of anims) count[a] = (count[a] ?? 0) + 1;
  const canvases = [...document.querySelectorAll('canvas')].filter((c) => c.getClientRects().length && c.width * c.height > 4096).map((c) => `${c.className || c.parentElement?.className}: ${c.width}x${c.height}`);
  // (frames the page's own loops ask for in a second: requestAnimationFrame counted)
  let n = 0;
  const who = {};
  const raf = window.requestAnimationFrame;
  window.requestAnimationFrame = (f) => { n++; const k = f.name || String(f).slice(0, 60); who[k] = (who[k] ?? 0) + 1; return raf(f); };
  await new Promise((r) => setTimeout(r, 1000));
  window.requestAnimationFrame = raf;
  return { name, animations: count, canvases, rafPerSecond: n, loops: who };
}, name);
const report = async (name) => console.log(JSON.stringify(await look(name), null, 1));
await page.evaluate(() => window.__game.home.show('heroes'));
await page.waitForTimeout(1500);
await report('tavern');
await page.evaluate(() => window.__game.home.openRoster());
await page.waitForTimeout(1500);
await report('roster');
for (const tab of ['overview', 'progression', 'equipment', 'skills']) {
  await page.evaluate((tab) => window.__game.home.openSheet('knight', true, tab), tab);
  await page.waitForTimeout(1500);
  await report(`hero page: ${tab}`);
}
await page.evaluate(() => window.__game.home.openRoster());
await page.waitForTimeout(800);
await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => /Hall/.test(b.textContent) && b.offsetParent)?.click());
await page.waitForTimeout(1500);
await report('hall');
await browser.close();
srv.close();
