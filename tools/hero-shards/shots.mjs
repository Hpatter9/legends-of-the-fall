// Screenshots for docs/notes/hero-shards.md: a 10-pull result with bars, a hero joining, the Heroes tab with locked heroes and
// progress, and a content hero's locked card, at 393x852 and 360x780.
//   npm run web && node tools/hero-shards/shots.mjs      (PORT; pictures go to docs/samples/hero-shards-*.png)
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
const { chromium } = createRequire('/opt/node-tools/node_modules/')('playwright');
const root = 'out/web';
const types = { html: 'text/html', js: 'text/javascript', png: 'image/png', woff2: 'font/woff2', json: 'application/json', webmanifest: 'application/json', ogg: 'audio/ogg' };
const srv = createServer((q, r) => {
  const p = `${root}/` + (q.url.split('?')[0].slice(1) || 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(Number(process.env.PORT ?? 8132));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
mkdirSync('docs/samples', { recursive: true });
const url = `http://localhost:${srv.address().port}/`;
const open = async (size, meta) => {
  const [width, height] = size.split('x').map(Number);
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, hasTouch: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
  await page.addInitScript(([m]) => { localStorage.setItem('legends.meta', JSON.stringify(m)); localStorage.setItem('legends.tips', JSON.stringify(['home', 'deploy', 'fight', 'mana', 'skill', 'summon', 'crowns', 'calamity', 'tower', 'talents', 'castle', 'spellbook', 'stash', 'equipment', 'recycle', 'retry', 'autoReplay'])); }, [meta]);
  await page.goto(url);
  return { ctx, page };
};
const castle = { treasury: 0, barracks: 0, armoury: 0, mageTower: 0, stable: 0, library: 0 };
// a save a few days in: eight heroes, some bars begun, the Beast Packs cleared (so the Werewolf has joined) and a tower climb under way
const owned = ['knight', 'samurai', 'kunoichi', 'archer', 'wizard', 'paladin', 'kitsune', 'werewolf'];
const meta = {
  seed: 7, crowns: 6000, unlocked: owned, party: owned.slice(0, 5), pulls: 40, unlockDry: 1,
  unlock: { cleric: 4, gorgon: 3, druid: 1, ranger: 2, satyr: 1 },
  castle, shards: { knight: 2, kitsune: 1 }, stars: {}, xp: { knight: 220 }, bestStage: 8, tower: 14, daily: {}, bosses: [], achievements: [],
  armies: { orcs: { waves: 15, best: 15, won: 15, clears: 1, stars: {} }, undead: { waves: 15, best: 15, won: 15, clears: 1, stars: {} }, beasts: { waves: 15, best: 15, won: 15, clears: 1, stars: {} } },
};
const sizes = ['393x852', '360x780'];

for (const size of sizes) {
  // 1. a 10-pull result with bars (the real pull, so the numbers are the game's)
  {
    const { ctx, page } = await open(size, meta);
    await page.waitForTimeout(1500);
    await page.evaluate(() => { const g = window.__game; g.gacha.open(); });
    await page.waitForTimeout(400);
    await page.evaluate(() => document.getElementById('pull10').click());
    await page.waitForTimeout(6000);
    await page.screenshot({ path: `docs/samples/hero-shards-pull10-${size}.png` });
    await ctx.close();
  }
  // 2. a hero joining: a bar one shard from full, a single pull of it is made, the card glows
  {
    const m = { ...meta, unlock: { ...meta.unlock, cleric: 3 }, crowns: 2000 };
    const { ctx, page } = await open(size, m);
    await page.waitForTimeout(1500);
    await page.evaluate(() => {
      const g = window.__game;
      g.gacha.open();
      const got = [{ kind: 'cleric', isNew: true, shards: 0, unlock: 1, have: 4, need: 4 }];
      g.gacha.reveal(got);
    });
    await page.waitForTimeout(2200);
    await page.screenshot({ path: `docs/samples/hero-shards-joins-${size}.png` });
    await ctx.close();
  }
  // 3. the Heroes tab, and 4. a content hero's locked card (the Tyrant: tower floor 40)
  {
    const { ctx, page } = await open(size, meta);
    await page.waitForTimeout(1500);
    await page.locator('.hmTab').nth(1).click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `docs/samples/hero-shards-tavern-${size}.png` });
    await page.locator('.tvRoster').click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: `docs/samples/hero-shards-heroes-${size}.png` });
    await page.evaluate(() => window.__game.home.openSheet('tyrant'));
    await page.waitForTimeout(800);
    await page.screenshot({ path: `docs/samples/hero-shards-content-${size}.png` });
    await ctx.close();
  }
}
await browser.close();
srv.close();
