// Frame strips of a seated ruler for docs/notes/starter-king.md (the thrones held still): the castle's throne and the Last Stand's dais,
// four crops STEP ms apart (default 350, the old seated cycle's frame length), for a few rulers. LABEL names the strip (before / after).
//   npm run web && PORT=8263 LABEL=after node tools/rulers/seat-strip.mjs     (crops go to out/seat-strip/<label>-*.png)
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
const { chromium } = createRequire(import.meta.url)('playwright');
const types = { html: 'text/html', js: 'text/javascript', css: 'text/css', png: 'image/png', json: 'application/json', woff2: 'font/woff2', opus: 'audio/ogg', webmanifest: 'application/manifest+json' };
const srv = createServer((q, r) => {
  const p = 'out/web/' + (q.url.split('?')[0].slice(1) || 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': types[p.split('.').pop()] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
}).listen(Number(process.env.PORT ?? 8263));
const label = process.env.LABEL ?? 'after';
const rulers = (process.env.RULERS ?? 'iron_stag,sun_viper,the_king').split(',');
mkdirSync('out/seat-strip', { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const heroes = ['knight', 'samurai', 'kunoichi', 'archer', 'wizard', 'paladin', 'druid', 'mercenary'];
for (const ruler of rulers) {
  const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGE ERROR', e.message));
  await page.addInitScript(([ruler, heroes]) => {
    localStorage.setItem('lotf-tips-off', '1');
    localStorage.setItem('legends.settings', JSON.stringify({ ruler, cinematics: false, music: 0, effects: 0 }));
    localStorage.setItem('legends.meta', JSON.stringify({ seed: 7, crowns: 2000, unlocked: heroes, party: heroes.slice(0, 5), pulls: 0, castle: { treasury: 3, barracks: 3, armoury: 3, mageTower: 3, stable: 3, library: 3 }, shards: {}, stars: {}, xp: {}, bestStage: 20, tower: 20, daily: {}, bosses: [], achievements: [], scenes: ['opening'] }));
  }, [ruler, heroes]);
  await page.goto(`http://localhost:${srv.address().port}/`);
  await page.waitForFunction(() => !!window.__game?.home, { timeout: 90000 });
  await page.locator('.hmTab').nth(3).click();
  await page.waitForTimeout(1500);
  // (the throne's spot on the castle's 800 x 420 canvas: x 400, feet at y 258, 210 high)
  const box = await page.evaluate(() => {
    const c = [...document.querySelectorAll('canvas')].find((x) => x.width === 800 && x.height === 420);
    const r = c.getBoundingClientRect();
    const s = r.width / 800;
    return { x: r.left + (400 - 120) * s, y: r.top + (258 - 225) * s, width: 240 * s, height: 240 * s };
  });
  for (let i = 0; i < 4; i++) {
    await page.screenshot({ path: `out/seat-strip/${label}-castle-${ruler}-${i}.png`, clip: box });
    await page.waitForTimeout(Number(process.env.STEP ?? 350));
  }
  await page.evaluate(() => window.__game.home.go(() => void window.__game.stand.open()));
  await page.getByRole('button', { name: 'To the keep', exact: true }).click();
  await page.waitForFunction(() => !!window.__game.stand.hall.king);
  if (await page.locator('#tipSkip').isVisible()) await page.locator('#tipSkip').click();
  await page.waitForTimeout(1500);
  const kb = await page.evaluate(() => {
    const k = window.__game.stand.hall.king;
    const b = k.getBounds();
    const cv = k.parent ? document.querySelector('canvas') : null;
    // (Pixi bounds are in the stage's pixels; the stage fills the page at the device's resolution)
    const res = window.__game.stand.app?.renderer?.resolution ?? 1;
    return { x: b.x / res, y: b.y / res, w: b.width / res, h: b.height / res };
  });
  const pad = 14;
  const clip = { x: Math.max(0, kb.x - pad), y: Math.max(0, kb.y - pad), width: kb.w + pad * 2, height: kb.h + pad * 2 };
  for (let i = 0; i < 4; i++) {
    await page.screenshot({ path: `out/seat-strip/${label}-stand-${ruler}-${i}.png`, clip });
    await page.waitForTimeout(Number(process.env.STEP ?? 350));
  }
  console.log(ruler, 'castle', JSON.stringify(box), 'stand', JSON.stringify(clip));
  await ctx.close();
}
await browser.close();
srv.close();
