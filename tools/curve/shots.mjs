// Screenshots for docs/notes/army-curve.md: the armies screen (the recommended levels) and the war table, at 393x852, 360x780 and 412x915.
//   npm run web && node tools/curve/shots.mjs      (pictures go to docs/samples/army-curve-*.png)
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const root = 'out/web';
const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', ogg: 'audio/ogg', css: 'text/css' };
const srv = createServer((q, r) => {
  const p = `${root}/` + (q.url.split('?')[0].slice(1) || 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(8133);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
mkdirSync('docs/samples', { recursive: true });
for (const size of ['393x852', '360x780', '412x915']) {
  const [width, height] = size.split('x').map(Number);
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
  const owned = ['knight', 'samurai', 'kunoichi', 'archer', 'wizard', 'paladin', 'kitsune', 'werewolf'];
  const full = { waves: 15, best: 15, won: 15, clears: 1, stars: {} };
  const meta = {
    seed: 7, crowns: 6000, unlocked: owned, party: owned.slice(0, 5), pulls: 40, unlockDry: 1, unlock: {},
    castle: { treasury: 0, barracks: 0, armoury: 0, mageTower: 0, stable: 0, library: 0 }, shards: {}, stars: {}, xp: {}, bestStage: 8, tower: 0, daily: {}, bosses: [], achievements: [],
    armies: { orcs: full, undead: full, beasts: full, wildwood: full, labyrinth: full }, opened: ['undead', 'beasts', 'wildwood', 'labyrinth', 'ogres', 'infernal', 'yokai', 'golems'],
  };
  await page.addInitScript(([m]) => { localStorage.setItem('legends.meta', JSON.stringify(m)); localStorage.setItem('legends.tips', JSON.stringify(['home', 'deploy', 'fight', 'mana', 'skill', 'summon', 'crowns', 'calamity', 'tower', 'talents', 'castle', 'spellbook', 'stash', 'equipment', 'recycle', 'retry', 'autoReplay'])); }, [meta]);
  await page.goto('http://localhost:8133/');
  await page.waitForTimeout(2500);
  await page.evaluate(() => window.__game.home.open());
  await page.waitForTimeout(600);
  await page.screenshot({ path: `docs/samples/army-curve-warTable-${size}.png` });
  await page.evaluate(() => window.__game.home.openArmies());
  await page.waitForTimeout(500);
  await page.screenshot({ path: `docs/samples/army-curve-armies-${size}.png` });
  console.log(size, await page.evaluate(() => [...document.querySelectorAll('.asMeta')].map((e) => e.textContent).filter((t) => t.startsWith('Recommended')).join(' | ')));
  await ctx.close();
}
await browser.close();
srv.close();
